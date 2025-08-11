// Shared namespace & config
window.Game = window.Game || {};
Game.w = Game.Config && Game.Config.world ? Game.Config.world.width : 900;
Game.h = Game.Config && Game.Config.world ? Game.Config.world.height : 650;

// NEW: Enemy kill tracking system
Game.kills = {
  shrimp: 0,
  crab: 0,
  dolphin: 0,
  whale: 0,
  total: 0
};

// Store final score for game over screen
Game.finalScore = 0;
Game.finalWave = 0;

/*============================ UTIL ============================*/
Game.rand = function(num){ return Math.floor(Math.random() * num); };
Game.getRandomInt = function(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; };

/*============================ LOAD ============================*/
Game.Load = function(){};
Game.Load.prototype = {
  preload: function(){
    this.game.stage.backgroundColor = Game.Config ? Game.Config.world.backgroundColor : '#34495e';
    var label = this.game.add.text(Game.w / 2, Game.h / 2, 'loading...', {
      font: '30px Arial', fill: '#fff'
    });
    label.anchor.setTo(0.5);

    // --- SFX
    this.game.load.audio('hit', 'assets/hit.wav');

    // --- Background
    this.game.load.image('floor', 'assets/floorGame.png');

    // --- Player frames
    var P = 'assets/player/';
    this.game.load.image('down_idle',    P + 'down_idle.png');
    this.game.load.image('down_walk_1',  P + 'down_walk_1.png');
    this.game.load.image('down_walk_2',  P + 'down_walk_2.png');

    this.game.load.image('up_idle',      P + 'up_idle.png');
    this.game.load.image('up_walk_1',    P + 'up_walk_1.png');
    this.game.load.image('up_walk_2',    P + 'up_walk_2.png');

    this.game.load.image('left_idle',    P + 'left_idle.png');
    this.game.load.image('left_walk_1',  P + 'left_walk_1.png');
    this.game.load.image('left_walk_2',  P + 'left_walk_2.png');

    this.game.load.image('right_idle',   P + 'right_idle.png');
    this.game.load.image('right_walk_1', P + 'right_walk_1.png');
    this.game.load.image('right_walk_2', P + 'right_walk_2.png');

    // --- Enemy types
    this.game.load.image('enemy',  'assets/enemy1.png');
    this.game.load.image('shrimp', 'assets/shrimp.png');
    this.game.load.image('crab',   'assets/crab.png');
    this.game.load.image('dolphin','assets/dolphin.png');
    this.game.load.image('whale',  'assets/whale.png');
    
    this.game.load.image('bullet', 'assets/bullet.png');
  },
  create: function(){
    this.game.state.start('Play');
  }
};

/*============================ PLAY ============================*/
Game.Play = function(){};
Game.Play.prototype = {
  create: function(){
    // --- Add floor background
    this.floor = this.game.add.tileSprite(0, 0, Game.w, Game.h, 'floor');
    
    // --- Input: WASD + arrows
    this.keys = this.game.input.keyboard.addKeys({
      up: Phaser.Keyboard.W,
      down: Phaser.Keyboard.S,
      left: Phaser.Keyboard.A,
      right: Phaser.Keyboard.D
    });
    this.cursor = this.game.input.keyboard.createCursorKeys();

    this.keyDash  = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    // --- Enemies
    this.enemies = this.game.add.group();
    this.enemies.enableBody = true;
    this.enemies.physicsBodyType = Phaser.Physics.ARCADE;

    // --- BULLETS (pooled) ---
    this.bullets = this.game.add.group();
    this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.bullets.createMultiple(40, 'bullet');

    this.bullets.setAll('anchor.x', 0.5);
    this.bullets.setAll('anchor.y', 0.5);
    this.bullets.setAll('outOfBoundsKill', true);
    this.bullets.setAll('checkWorldBounds', true);
    this.bullets.setAll('body.allowGravity', false);
    this.bullets.setAll('exists', false);
    this.bullets.setAll('visible', false);

    // --- Player
    this.player = new Game.Player(this.game, Game.w / 2, Game.h / 2, {
      bullets: this.bullets,
      bulletScale: Game.Config ? Game.Config.player.bulletScale : 0.25,
      maxHealth: Game.Config ? Game.Config.player.maxHealth : 10
    });

    // --- UI
    // Kill counter display (top left)
    this.labelKills = this.game.add.text(15, 10, this.getKillsText(), { 
      font: '16px Arial', fill: '#fff', lineSpacing: 2
    });
    
    // Score display (top right)
    this.labelScore = this.game.add.text(Game.w - 15, 10, 'SCORE: 0', {
      font: '20px Arial', fill: '#fff'
    });
    this.labelScore.anchor.setTo(1, 0);
    
    // Health display (right side, under score)
    this.labelHealth = this.game.add.text(Game.w - 15, 40, 'HEALTH: ' + this.player.health, { 
      font: '20px Arial', fill: '#00ff00' 
    });
    this.labelHealth.anchor.setTo(1, 0);
    
    // Wave display in center
    this.labelWave = this.game.add.text(Game.w / 2, 60, 'WAVE: Waiting...', {
      font: '24px Arial', fill: '#ffff00'
    });
    this.labelWave.anchor.setTo(0.5, 0.5);
    
    this.labelKeys = this.game.add.text(Math.floor(Game.w / 2) + 1, Game.h - 50,
      'WASD/arrows=move, SPACE=dash, CLICK=shoot', {
      font: '20px Arial', fill: '#fff'
    });
    this.labelKeys.anchor.setTo(0.5, 1);

    // Game state for wave system
    this.currentWave = 0;
    this.waveScore = 0;
    this.killScore = 0;
    this.totalScore = 0;
    this.startingBlock = 0; // Track the first block we see

    // Reset kill counters
    Game.kills = {
      shrimp: 0,
      crab: 0,
      dolphin: 0,
      whale: 0,
      total: 0
    };
    
    this.firstKeyShown = false;
  },

  handleNewWave: function(blockNumber) {
    // Set starting block on first wave
    if (this.startingBlock === 0) {
      this.startingBlock = blockNumber;
      this.currentWave = 1;
    } else {
      // Calculate wave number based on difference from starting block
      this.currentWave = (blockNumber - this.startingBlock) + 1;
    }
    
    this.waveScore += 100; // Add wave points
    this.labelWave.text = 'WAVE: ' + this.currentWave;
    this.labelScore.text = 'SCORE: ' + (this.waveScore + this.killScore);
    
    // Wave transition effect - subtle flash
    this.labelWave.tint = 0x00ff00;
    this.game.time.events.add(200, function() {
      this.labelWave.tint = 0xffff00;
    }, this);
    
    console.log('🌊 Wave', this.currentWave, '(block', blockNumber + ')');
  },

  update: function(){
    // Merge WASD + arrow keys
    var mergedKeys = {
      up:    { isDown: this.keys.up.isDown    || this.cursor.up.isDown },
      down:  { isDown: this.keys.down.isDown  || this.cursor.down.isDown },
      left:  { isDown: this.keys.left.isDown  || this.cursor.left.isDown },
      right: { isDown: this.keys.right.isDown || this.cursor.right.isDown }
    };

    var moved = this.player.drive(mergedKeys, this.keyDash, this.game);
    this.player.handleCombat(this.game.input.activePointer, null, this.game);

    if ((moved || this.game.input.activePointer.isDown) && !this.firstKeyShown) {
      this.firstKeyShown = true;
      this.game.add.tween(this.labelKeys).to({ alpha: 0 }, 800, Phaser.Easing.Linear.None).start();
    }

    // Collision detection
    this.game.physics.arcade.overlap(this.bullets, this.enemies, this.onBulletHitsEnemy, null, this);
    this.game.physics.arcade.overlap(this.player, this.enemies, this.onPlayerHitsEnemy, null, this);

    // Update health display and check game over
    this.updateHealthDisplay();
    if (this.player.health <= 0 && this.player.alive) {
      console.log('Player died with health:', this.player.health);
      // Store final score and wave before transitioning to game over
      Game.finalScore = this.waveScore + this.killScore;
      Game.finalWave = this.currentWave;
      console.log('💀 GAME OVER - Final Score:', Game.finalScore, '(Wave:', this.waveScore, '+ Kill:', this.killScore, ')');
      console.log('🌊 Waves (blocks) survived:', Game.finalWave);
      this.game.state.start('Over');
    }
  },

  handleSwapEvent: function(swapData) {
    var enemyType = this.getEnemyTypeFromUSDC(swapData.usdcAmount);
    var x = this.game.rnd.between(50, Game.w - 50);
    var y = this.game.rnd.between(50, Game.h - 50);
    
    // Keep spawning away from player
    var attempts = 0;
    while (Phaser.Math.distance(x, y, this.player.x, this.player.y) < 120 && attempts < 10) {
      x = this.game.rnd.between(50, Game.w - 50);
      y = this.game.rnd.between(50, Game.h - 50);
      attempts++;
    }
    
    var enemy = new Game.Enemy(this.game, x, y, enemyType);
    this.enemies.add(enemy);
    enemy.target = this.player;
    
    console.log('Spawned', enemyType, 'for $' + swapData.usdcAmount.toFixed(2));
  },

  // FIXED: Now uses config thresholds instead of hardcoded values!
  getEnemyTypeFromUSDC: function(usdcAmount) {
    // Get thresholds from config, with fallbacks
    var thresholds = Game.Config && Game.Config.swapSpawning && Game.Config.swapSpawning.thresholds 
      ? Game.Config.swapSpawning.thresholds 
      : { shrimp: 0, crab: 100, dolphin: 500, whale: 1500 }; // fallback defaults

    console.log('💰 Using thresholds:', thresholds, 'for amount:', usdcAmount);

    if (usdcAmount >= thresholds.whale) return 'whale';
    if (usdcAmount >= thresholds.dolphin) return 'dolphin';
    if (usdcAmount >= thresholds.crab) return 'crab';
    return 'shrimp';
  },

  onBulletHitsEnemy: function(bullet, enemy){
    bullet.kill();
    var knock = new Phaser.Point(enemy.x - bullet.x, enemy.y - bullet.y);
    knock.normalize().multiply(260, 260);
    if (enemy.takeDamage(1, knock)) {
      this.onEnemyKilled(enemy);
    }
  },

  onPlayerHitsEnemy: function(player, enemy){
    var damage = enemy.handlePlayerCollision(player);
    if (damage > 0) {
      console.log('Player taking', damage, 'damage. Health before:', this.player.health);
      var damageTaken = this.player.takeDamage(damage);
      console.log('Damage taken:', damageTaken, 'Health after:', this.player.health);
      
      if (damageTaken) {
        // Knockback player away from enemy
        var knockVec = new Phaser.Point(player.x - enemy.x, player.y - enemy.y);
        knockVec.normalize().multiply(150, 150);
        this.player.applyKnockback(knockVec);
      }
    }
  },

  // Helper function to format kills display text
  getKillsText: function() {
    return 'KILLS:\n' +
           '🦐 Shrimp: ' + Game.kills.shrimp + '\n' +
           '🦀 Crab: ' + Game.kills.crab + '\n' +
           '🐬 Dolphin: ' + Game.kills.dolphin + '\n' +
           '🐋 Whale: ' + Game.kills.whale + '\n' +
           '💀 Total: ' + Game.kills.total;
  },

  onEnemyKilled: function(enemy){
    // Update kill counters
    var enemyType = enemy.enemyType || 'shrimp';
    if (Game.kills[enemyType] !== undefined) {
      Game.kills[enemyType]++;
    }
    Game.kills.total++;
    
    // Get score value from config based on enemy type
    var scoreValue = 10; // fallback
    if (Game.Config && Game.Config.enemies && enemy.enemyType) {
      var enemyConfig = Game.Config.enemies[enemy.enemyType];
      if (enemyConfig && enemyConfig.scoreValue) {
        scoreValue = enemyConfig.scoreValue;
      }
    }
    
    this.killScore += scoreValue;
    
    // Update UI
    this.labelKills.text = this.getKillsText();
    this.labelScore.text = 'SCORE: ' + (this.waveScore + this.killScore);
    
    console.log(`💀 Killed ${enemy.enemyType} (+${scoreValue} points) | Total: ${Game.kills.total}`);
  },

  updateHealthDisplay: function(){
    this.labelHealth.text = 'HEALTH: ' + this.player.health;
    
    // Change health color based on current health
    var healthPercent = this.player.health / this.player.maxHealth;
    if (healthPercent > 0.6) {
      this.labelHealth.fill = '#00ff00'; // Green
    } else if (healthPercent > 0.3) {
      this.labelHealth.fill = '#ffff00'; // Yellow
    } else {
      this.labelHealth.fill = '#ff0000'; // Red
    }
  },

  render: function(){
    // Debug rendering (controlled by config)
    if (Game.Config && Game.Config.debug && Game.Config.debug.showCollisionBodies) {
      this.enemies.forEachAlive(function(e){ this.game.debug.body(e); }, this);
      this.bullets.forEachAlive(function(b){ this.game.debug.body(b); }, this);
    }
  }
};

/*============================ OVER ============================*/
Game.Over = function(){};
Game.Over.prototype = {
  create: function(){
    // Show game over stats
    var msg = 'GAME OVER\n\n' + this.getGameOverStats() + '\n\nCreating your Victory NFT...';
    var label = this.game.add.text(Game.w / 2, Game.h / 2, msg, {
      font: '24px Arial', fill: '#fff', align: 'center', lineSpacing: 4
    });
    label.anchor.setTo(0.5);

    // NEW: Trigger NFT minting process
    this.mintGameNFT();

    // Allow restart with both arrows + WASD
    this.cursor = this.game.input.keyboard.createCursorKeys();
    this.keys = this.game.input.keyboard.addKeys({
      up: Phaser.Keyboard.W
    });

    this.canRestartAt = this.game.time.now + 800;
    this.game.add.audio('hit').play('', 0, 0.1);
  },

  // NEW: Mint NFT with game stats
  mintGameNFT: function() {
    // Prepare game stats for NFT
    const gameStats = {
      finalScore: Game.finalScore,
      finalWave: Game.finalWave,
      kills: {
        total: Game.kills.total,
        shrimp: Game.kills.shrimp,
        crab: Game.kills.crab,
        dolphin: Game.kills.dolphin,
        whale: Game.kills.whale
      }
    };

    console.log('🎮 Game over! Preparing NFT mint with stats:', gameStats);

    // Call global NFT minting function (defined in page.tsx)
    if (window.mintGameOverNFT) {
      window.mintGameOverNFT(gameStats);
    } else {
      console.error('❌ NFT minting function not available - make sure page.tsx is loaded');
    }
  },

  // Helper function to format game over stats (keep existing)
  getGameOverStats: function() {
    return 'FINAL SCORE: ' + Game.finalScore + '\n' +
           'WAVES (BLOCKS) SURVIVED: ' + Game.finalWave + '\n\n' +
           'FINAL KILLS:\n' +
           '🦐 Shrimp: ' + Game.kills.shrimp + '\n' +
           '🦀 Crab: ' + Game.kills.crab + '\n' +
           '🐬 Dolphin: ' + Game.kills.dolphin + '\n' +
           '🐋 Whale: ' + Game.kills.whale + '\n' +
           '💀 Total: ' + Game.kills.total;
  },

  // Keep existing update function with NFT minter integration
  update: function(){
    if (this.game.time.now > this.canRestartAt &&
        (this.cursor.up.isDown || this.keys.up.isDown)) {
      
      // NEW: Hide NFT minter before restarting
      if (window.hideNFTMinter) {
        window.hideNFTMinter();
      }
      
      this.game.state.start('Play');
    }
  }
};