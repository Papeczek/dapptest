(function(){
  Game.Enemy = function(game, x, y, enemyType){
    // Use config if available, fallback to simple types
    var config;
    if (Game.Config && Game.Config.getEnemyConfig) {
      config = Game.Config.getEnemyConfig(enemyType);
      if (!config) {
        console.warn('Invalid enemy type:', enemyType, 'defaulting to shrimp');
        enemyType = 'shrimp';
        config = Game.Config.getEnemyConfig(enemyType);
      }
    } else {
      // Fallback enemy types if config not loaded
      var fallbackTypes = {
        shrimp: { texture: 'shrimp', hp: 1, speed: 60, damage: 1, scale: 0.15, maxVelocity: 180, damageInterval: 500, hurtTintColor: 0xff9999 },
        crab: { texture: 'crab', hp: 3, speed: 35, damage: 2, scale: 0.2, maxVelocity: 140, damageInterval: 500, hurtTintColor: 0xff6666 },
        dolphin: { texture: 'dolphin', hp: 5, speed: 80, damage: 3, scale: 0.25, maxVelocity: 220, damageInterval: 500, hurtTintColor: 0x6666ff },
        whale: { texture: 'whale', hp: 10, speed: 20, damage: 5, scale: 0.4, maxVelocity: 100, damageInterval: 500, hurtTintColor: 0x9999ff }
      };
      config = fallbackTypes[enemyType] || fallbackTypes.shrimp;
    }

    Phaser.Sprite.call(this, game, x, y, config.texture);
    game.add.existing(this);
    game.physics.arcade.enable(this);
    this.anchor.set(0.5);
    this.body.collideWorldBounds = true;

    // Apply scaling
    this.scale.setTo(config.scale);
    
    // Set collision body to original frame size - Phaser Arcade will apply scale automatically
    var fw = this.texture.frame.width;
    var fh = this.texture.frame.height;
    this.body.setSize(fw, fh, 0, 0);

    // Enemy properties from config
    this.enemyType = enemyType;
    this.speed = config.speed;
    this.healthPoints = config.hp;
    this.maxHealth = config.hp;
    this.damage = config.damage;
    this.maxVelocity = config.maxVelocity;
    
    this.target = null;
    this._hurtTintUntil = 0;
    this._lastDamageTime = 0;
    this.damageInterval = config.damageInterval;

    // NEW: Spawn delay system (1.5 seconds)
    this.spawnDelay = Game.Config && Game.Config.swapSpawning && Game.Config.swapSpawning.spawnDelay 
      ? Game.Config.swapSpawning.spawnDelay 
      : 1500; // 1.5 seconds default
    
    this._spawnedAt = game.time.now;
    this._canMoveAt = this._spawnedAt + this.spawnDelay;
    this._canDamageAt = this._spawnedAt + this.spawnDelay;
    
    // Visual indicator during spawn delay
    this.alpha = 0.6; // Make slightly transparent
    this.tint = 0xffdd88; // Slight golden tint
    
    console.log(`🐣 ${enemyType} spawned! Will activate in ${this.spawnDelay}ms`);
  };

  Game.Enemy.prototype = Object.create(Phaser.Sprite.prototype);
  Game.Enemy.prototype.constructor = Game.Enemy;

  Game.Enemy.prototype.update = function(){
    if (!this.alive) return;

    var now = this.game.time.now;

    // Check if spawn delay has expired
    if (now >= this._canMoveAt && this.alpha !== 1.0) {
      // Activate enemy - remove spawn delay effects
      this.alpha = 1.0;
      this.tint = 0xffffff;
      console.log(`⚡ ${this.enemyType} activated!`);
    }

    // Only move if spawn delay has expired
    if (now >= this._canMoveAt && this.target) {
      var dx = this.target.x - this.x;
      var dy = this.target.y - this.y;
      var len = Math.sqrt(dx*dx + dy*dy) || 1;
      
      // Apply acceleration towards target
      this.body.velocity.x += (dx / len) * this.speed;
      this.body.velocity.y += (dy / len) * this.speed;

      // Cap velocity based on enemy type
      this.body.velocity.x = Phaser.Math.clamp(this.body.velocity.x, -this.maxVelocity, this.maxVelocity);
      this.body.velocity.y = Phaser.Math.clamp(this.body.velocity.y, -this.maxVelocity, this.maxVelocity);
    } else {
      // During spawn delay, don't move
      this.body.velocity.set(0, 0);
    }

    // Clear hurt tint
    if (this.game.time.now > this._hurtTintUntil && this.tint !== 0xffffff && now >= this._canMoveAt) {
      this.tint = 0xffffff;
    }
  };

  /**
   * Apply damage and knockback. Returns true if killed.
   */
  Game.Enemy.prototype.takeDamage = function(dmg, knockVec){
    if (!this.alive) return false;
    this.healthPoints -= (dmg || 1);

    // Flash effect - different colors for different enemy types
    var hurtColor = this.getHurtColor();
    this.tint = hurtColor;
    this._hurtTintUntil = this.game.time.now + 120;

    // Only apply knockback if spawn delay has expired
    if (knockVec && this.game.time.now >= this._canMoveAt) {
      this.body.velocity.x += knockVec.x;
      this.body.velocity.y += knockVec.y;
    }

    if (this.healthPoints <= 0) {
      this.kill();
      return true;
    }
    return false;
  };

  /**
   * Get hurt tint color based on enemy type
   */
  Game.Enemy.prototype.getHurtColor = function(){
    var types = {
      'shrimp': 0xff9999,
      'crab': 0xff6666,
      'dolphin': 0x6666ff,
      'whale': 0x9999ff
    };
    return types[this.enemyType] || 0xff6666;
  };

  /**
   * Handle collision with player - deals damage if enough time has passed
   */
  Game.Enemy.prototype.handlePlayerCollision = function(player){
    var now = this.game.time.now;
    
    // No damage during spawn delay
    if (now < this._canDamageAt) {
      return 0;
    }

    if (now - this._lastDamageTime >= this.damageInterval) {
      this._lastDamageTime = now;
      return this.damage; // Return damage amount to apply to player
    }
    return 0; // No damage this frame
  };

  /**
   * Check if enemy can currently move/attack
   */
  Game.Enemy.prototype.isActive = function(){
    return this.game.time.now >= this._canMoveAt;
  };

  /**
   * Static method to create enemy by type name
   */
  Game.Enemy.createByType = function(game, x, y, enemyType){
    return new Game.Enemy(game, x, y, enemyType);
  };

  /**
   * Static method to get available enemy types
   */
  Game.Enemy.getAvailableTypes = function(){
    return ['shrimp', 'crab', 'dolphin', 'whale'];
  };
})();