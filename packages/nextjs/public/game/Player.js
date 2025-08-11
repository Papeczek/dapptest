(function(){
  // Player using per-direction images (idle + 2×walk) and mouse-facing
  Game.Player = function(game, x, y, opts){
    Phaser.Sprite.call(this, game, x, y, 'down_idle');
    game.add.existing(this);
    game.physics.arcade.enable(this);
    this.anchor.set(0.5);
    this.body.collideWorldBounds = true;

    // --- SCALE (from config)
    var PLAYER_SCALE = Game.Config.player.scale;
    
    // Apply scaling
    this.scale.setTo(PLAYER_SCALE);
    this._baseScaleX = PLAYER_SCALE;
    this._baseScaleY = PLAYER_SCALE;
    
    // Set collision body to original frame size - Phaser Arcade will apply scale automatically
    var fw = this.texture.frame.width;
    var fh = this.texture.frame.height;
    this.body.setSize(fw, fh, 0, 0);

    // --- MOVEMENT (from config) ---
    this.speed = Game.Config.player.speed;

    // --- DASH (from config) ---
    this.dashSpeed = Game.Config.player.dashSpeed;
    this.dashDuration = Game.Config.player.dashDuration;
    this.dashCooldown = Game.Config.player.dashCooldown;
    this._dashUntil = 0;
    this._dashNextAt = 0;
    this._dashVec = new Phaser.Point(1, 0);

    // --- ANIMATION STATE (from config) ---
    this.facing = 'down';                 // 'up' | 'right' | 'down' | 'left'
    this._lastMove = new Phaser.Point(0, 1);
    this.walkFrame = 0;                   // 0..1 (two walking frames)
    this.walkRate = Game.Config.player.walkAnimationRate;
    this._walkNextAt = 0;

    // --- SHOOTING (from config) ---
    opts = opts || {};
    this._bullets = opts.bullets || null;
    this._bulletScale = opts.bulletScale || Game.Config.player.bulletScale;
    this.bulletSpeed = Game.Config.player.bulletSpeed;
    this.shootCooldown = Game.Config.player.shootCooldown;
    this._shootNextAt = 0;

    // --- HEALTH SYSTEM (from config) ---
    this.maxHealth = opts.maxHealth || Game.Config.player.maxHealth;
    this.health = this.maxHealth;
    this._hurtTintUntil = 0;
    this._invulnerableUntil = 0;
    this.invulnerabilityDuration = Game.Config.player.invulnerabilityDuration;
  };

  Game.Player.prototype = Object.create(Phaser.Sprite.prototype);
  Game.Player.prototype.constructor = Game.Player;

  // Keep scale/collider stable and matching across texture swaps
  Game.Player.prototype._setTex = function(key){
    if (this.key !== key) {
      this.loadTexture(key);
      // Reapply consistent scaling
      this.scale.set(this._baseScaleX, this._baseScaleY);
      // Set collider to original frame size - Phaser will apply scale automatically
      var fw = this.texture.frame.width;
      var fh = this.texture.frame.height;
      this.body.setSize(fw, fh, 0, 0);
    }
  };

  // Build frame key from current state
  Game.Player.prototype._frameKey = function(moving){
    if (!moving) return this.facing + '_idle';
    return this.facing + '_walk_' + (this.walkFrame + 1);
  };

  Game.Player.prototype.update = function(){
    var now = this.game.time.now;
    
    // Clear hurt tint
    if (now > this._hurtTintUntil && this.tint !== 0xffffff) {
      this.tint = 0xffffff;
    }
    
    // Handle invulnerability flashing
    if (now < this._invulnerableUntil) {
      var flashRate = 100; // Flash every 100ms
      var shouldShow = Math.floor(now / flashRate) % 2 === 0;
      this.alpha = shouldShow ? 1.0 : 0.5;
    } else if (this.alpha !== 1.0) {
      this.alpha = 1.0;
    }
  };

  // Movement + dash + mouse-facing (no sprite rotation)
  Game.Player.prototype.drive = function(keys, keyDash, game){
    var now = game.time.now;
    var mx = 0, my = 0;

    // WASD/Arrows (merged object with .isDown booleans)
    if (keys.left.isDown)  mx = -1;
    if (keys.right.isDown) mx = 1;
    if (keys.up.isDown)    my = -1;
    if (keys.down.isDown)  my = 1;
    if (mx !== 0 && my !== 0) { var k = Math.SQRT1_2; mx *= k; my *= k; }

    var moving = (mx !== 0 || my !== 0);
    if (moving) this._lastMove.set(mx, my);

    // Dash
    if (keyDash && keyDash.justDown && now >= this._dashNextAt) {
      var dx = moving ? mx : this._lastMove.x || 1;
      var dy = moving ? my : this._lastMove.y || 0;
      var len = Math.sqrt(dx*dx + dy*dy) || 1;
      this._dashVec.set(dx/len, dy/len);
      this._dashUntil = now + this.dashDuration;
      this._dashNextAt = this._dashUntil + this.dashCooldown;

      // Dash makes player temporarily invulnerable (if enabled in config)
      if (Game.Config.player.dashInvulnerability) {
        this._invulnerableUntil = Math.max(this._invulnerableUntil, now + this.dashDuration);
      }
      
      this.tint = Game.Config.player.dashTintColor;
      game.time.events.add(Game.Config.player.dashTintDuration, function(){ 
        if (this.game.time.now >= this._dashUntil) {
          this.tint = 0xffffff; 
        }
      }, this);
    }

    // Apply velocity
    if (now < this._dashUntil) {
      this.body.velocity.x = this._dashVec.x * this.dashSpeed;
      this.body.velocity.y = this._dashVec.y * this.dashSpeed;
    } else {
      this.body.velocity.set(0);
      this.body.velocity.x = mx * this.speed;
      this.body.velocity.y = my * this.speed;
    }

    // Mouse-facing (choose one of 4 directions based on pointer vector)
    var ptr = game.input.activePointer;
    var dxp = ptr.worldX - this.x;
    var dyp = ptr.worldY - this.y;
    if (Math.abs(dxp) > Math.abs(dyp)) {
      this.facing = (dxp >= 0) ? 'right' : 'left';
    } else {
      this.facing = (dyp >= 0) ? 'down' : 'up';
    }

    // Walk animation toggle
    if (moving) {
      if (now >= this._walkNextAt) {
        this._walkNextAt = now + this.walkRate;
        this.walkFrame ^= 1;
      }
    } else {
      this.walkFrame = 0;
    }

    // Apply correct frame (no rotation on the player)
    this._setTex(this._frameKey(moving));

    return moving;
  };

  // Shooting with mouse click; bullet rotates to travel direction
  Game.Player.prototype.handleCombat = function(mousePointer, _unused, game){
    var now = game.time.now;
    if (this._bullets && mousePointer && mousePointer.isDown && now >= this._shootNextAt) {
      this._shootNextAt = now + this.shootCooldown;

      // Direction = vector to mouse
      var dir = new Phaser.Point(mousePointer.worldX - this.x, mousePointer.worldY - this.y);
      if (dir.getMagnitude() === 0) dir.set(1, 0);
      dir.normalize();

      var b = this._bullets.getFirstExists(false);
      if (b) {
        b.reset(this.x, this.y);
        b.visible = true;
        b.body.allowGravity = false;

        // Visual scale
        b.scale.setTo(this._bulletScale);

        // Collider = original frame size (Arcade applies scale → matches visual)
        var fw = b.texture.frame.width, fh = b.texture.frame.height;
        b.body.setSize(fw, fh, 0, 0);

        // Rotate bullet sprite to face travel direction
        b.rotation = Math.atan2(dir.y, dir.x);

        // Fire bullet with config values
        b.body.velocity.x = dir.x * this.bulletSpeed;
        b.body.velocity.y = dir.y * this.bulletSpeed;
        b.lifespan = Game.Config.player.bulletLifespan;
      }
    }
  };

  /**
   * Take damage and apply invulnerability frames
   */
  Game.Player.prototype.takeDamage = function(damage){
    var now = this.game.time.now;
    
    // No damage if invulnerable
    if (now < this._invulnerableUntil) {
      return false;
    }
    
    this.health -= damage;
    if (this.health < 0) this.health = 0;
    
    // Set invulnerability and hurt effects (using config colors)
    this._invulnerableUntil = now + this.invulnerabilityDuration;
    this.tint = Game.Config.player.hurtTintColor;
    this._hurtTintUntil = now + Game.Config.player.hurtTintDuration;
    
    // Screen shake effect (optional) - use world.camera in older Phaser versions
    if (this.game.camera.shake) {
      this.game.camera.shake(0.01, 100);
    } else if (this.game.world.camera && this.game.world.camera.shake) {
      this.game.world.camera.shake(0.01, 100);
    }
    
    return true; // Damage was applied
  };

  /**
   * Apply knockback force to player
   */
  Game.Player.prototype.applyKnockback = function(knockVec){
    // Don't apply knockback during dash
    if (this.game.time.now < this._dashUntil) return;
    
    this.body.velocity.x += knockVec.x;
    this.body.velocity.y += knockVec.y;
  };

  /**
   * Heal the player (using config colors)
   */
  Game.Player.prototype.heal = function(amount){
    this.health = Math.min(this.maxHealth, this.health + amount);
    
    // Healing effect
    this.tint = Game.Config.player.healTintColor;
    this._hurtTintUntil = this.game.time.now + Game.Config.player.hurtTintDuration;
  };

  /**
   * Check if player is invulnerable
   */
  Game.Player.prototype.isInvulnerable = function(){
    return this.game.time.now < this._invulnerableUntil;
  };
})();