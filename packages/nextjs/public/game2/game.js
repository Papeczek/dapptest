// ==========================
// StateManager.js contents
// ==========================
window.Game = window.Game || {};
Game.w = 1280;
Game.h = 720;
Game.ethKilled = 0;

Game.rand = function(num){ return Math.floor(Math.random() * num); };
Game.getRandomInt = function(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; };

Game.Load = function(){};
Game.Load.prototype = {
  preload: function(){
    this.game.stage.backgroundColor = '#34495e';
    var label = this.game.add.text(Game.w / 2, Game.h / 2, 'loading...', { font: '30px Arial', fill: '#fff' });
    label.anchor.setTo(0.5);

    this.game.load.spritesheet('player', 'assets/player.png', 20, 24);
    this.game.load.audio('hit', 'assets/hit.wav');
    this.game.load.image('enemy', 'assets/enemy1.png');
    this.game.load.image('bullet', 'assets/bullet.png');
  },
  create: function(){
    this.game.state.start('Play');
  }
};

Game.Over = function(){};
Game.Over.prototype = {
  create: function(){
    var msg = 'game over\n\nETH KILLED: ' + Game.ethKilled + '\n\npress the UP arrow key\nto restart';
    var label = this.game.add.text(Game.w / 2, Game.h / 2, msg, { font: '30px Arial', fill: '#fff', align: 'center' });
    label.anchor.setTo(0.5);

    this.cursor = this.game.input.keyboard.createCursorKeys();
    this.canRestartAt = this.game.time.now + 800;
    this.game.add.audio('hit').play('', 0, 0.1);
  },
  update: function(){
    if (this.game.time.now > this.canRestartAt && this.cursor.up.isDown) {
      this.game.state.start('Play');
    }
  }
};

Game.Play = function(){};
Game.Play.prototype = {
  create: function(){
    this.cursor   = this.game.input.keyboard.createCursorKeys();
    this.keyDash  = this.game.input.keyboard.addKey(Phaser.Keyboard.Z);
    this.keyShoot = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    this.enemies = this.game.add.group();
    this.enemies.enableBody = true;
    this.enemies.physicsBodyType = Phaser.Physics.ARCADE;

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

    this.player = new Game.Player(this.game, Game.w / 2, Game.h / 2, { bullets: this.bullets });

    this.labelEthKilled = this.game.add.text(15, 10, 'ETH KILLED: 0', { font: '20px Arial', fill: '#fff' });
    this.labelKeys = this.game.add.text(Math.floor(Game.w / 2) + 1, Game.h - 50, 'arrows=move, Z=dash, SPACE=shoot', { font: '20px Arial', fill: '#fff' });
    this.labelKeys.anchor.setTo(0.5, 1);

    Game.ethKilled = 0;
    this.firstKeyShown = false;

    for (var i = 0; i < 5; i++) this.spawnEnemy();
  },
  update: function(){
    var moved = this.player.drive(this.cursor, this.keyDash, this.game);
    this.player.handleCombat(this.keyShoot, null, this.game);

    if ((moved || this.keyShoot.isDown) && !this.firstKeyShown) {
      this.firstKeyShown = true;
      this.game.add.tween(this.labelKeys).to({ alpha: 0 }, 800, Phaser.Easing.Linear.None).start();
    }

    this.game.physics.arcade.overlap(this.bullets, this.enemies, this.onBulletHitsEnemy, null, this);
  },
  spawnEnemy: function(){
    var x = this.game.rnd.between(40, Game.w - 40);
    var y = this.game.rnd.between(40, Game.h - 40);
    var e = new Game.Enemy(this.game, x, y);
    this.enemies.add(e);
    e.target = this.player;
  },
  onBulletHitsEnemy: function(bullet, enemy){
    bullet.kill();
    var knock = new Phaser.Point(enemy.x - bullet.x, enemy.y - bullet.y);
    knock.normalize().multiply(260, 260);
    if (enemy.takeDamage(1, knock)) this.onEnemyKilled();
  },
  onEnemyKilled: function(){
    Game.ethKilled++;
    this.labelEthKilled.text = 'ETH KILLED: ' + Game.ethKilled;
  }
};

// ==========================
// Player.js contents
// ==========================
(function(){
  Game.Player = function(game, x, y, opts){
    Phaser.Sprite.call(this, game, x, y, 'player');
    game.add.existing(this);
    game.physics.arcade.enable(this);
    this.body.collideWorldBounds = true;
    this.anchor.set(0.5);

    this.animations.add('bottom', [0, 1], 10, true);
    this.animations.add('top',    [4, 5], 10, true);
    this.animations.add('right',  [2, 3], 10, true);
    this.animations.add('left',   [6, 7], 10, true);

    this.speed = 300;
    this.dashSpeed = 820;
    this.dashDuration = 120;
    this.dashCooldown = 400;
    this._dashUntil = 0;
    this._dashNextAt = 0;
    this._dashVec = new Phaser.Point(1, 0);
    this._lastMove = new Phaser.Point(1, 0);

    opts = opts || {};
    this._bullets = opts.bullets || null;
    this.bulletSpeed = 700;
    this.shootCooldown = 180;
    this._shootNextAt = 0;
  };
  Game.Player.prototype = Object.create(Phaser.Sprite.prototype);
  Game.Player.prototype.constructor = Game.Player;

  Game.Player.prototype.drive = function(cursors, keyDash, game){
    var now = game.time.now;
    var mx = 0, my = 0;
    if (cursors.left.isDown)  mx = -1;
    if (cursors.right.isDown) mx = 1;
    if (cursors.up.isDown)    my = -1;
    if (cursors.down.isDown)  my = 1;
    if (mx !== 0 && my !== 0) { var k = Math.SQRT1_2; mx *= k; my *= k; }

    if (mx !== 0 || my !== 0) { this._lastMove.set(mx, my); }

    if (keyDash && keyDash.justDown && now >= this._dashNextAt) {
      var dx = (mx || my) ? mx : this._lastMove.x;
      var dy = (mx || my) ? my : this._lastMove.y;
      var len = Math.sqrt(dx*dx + dy*dy) || 1;
      this._dashVec.set(dx/len, dy/len);
      this._dashUntil = now + this.dashDuration;
      this._dashNextAt = this._dashUntil + this.dashCooldown;

      this.tint = 0xddddff;
      game.time.events.add(100, function(){ this.tint = 0xffffff; }, this);
    }

    if (now < this._dashUntil) {
      this.body.velocity.x = this._dashVec.x * this.dashSpeed;
      this.body.velocity.y = this._dashVec.y * this.dashSpeed;
    } else {
      this.body.velocity.set(0);
      this.body.velocity.x = mx * this.speed;
      this.body.velocity.y = my * this.speed;
    }

    var ax = (now < this._dashUntil) ? this._dashVec.x : mx;
    var ay = (now < this._dashUntil) ? this._dashVec.y : my;
    if (ay < 0)      this.animations.play('top');
    else if (ay > 0) this.animations.play('bottom');
    else if (ax < 0) this.animations.play('left');
    else if (ax > 0) this.animations.play('right');
    else             this.animations.stop();

    return (mx !== 0 || my !== 0);
  };

  Game.Player.prototype.handleCombat = function(keyShoot, _unused, game){
    var now = game.time.now;
    if (this._bullets && keyShoot && keyShoot.justDown && now >= this._shootNextAt) {
      this._shootNextAt = now + this.shootCooldown;
      var dir = (this.body.velocity.x || this.body.velocity.y)
        ? new Phaser.Point(this.body.velocity.x, this.body.velocity.y)
        : this._lastMove.clone();
      if (dir.getMagnitude() === 0) dir.set(1, 0);
      dir.normalize();

      var b = this._bullets.getFirstExists(false);
      if (b) {
        b.reset(this.x, this.y);
        b.visible = true;
        b.body.allowGravity = false;
        b.body.velocity.x = dir.x * this.bulletSpeed;
        b.body.velocity.y = dir.y * this.bulletSpeed;
        b.lifespan = 700;
      }
    }
  };
})();

// ==========================
// Enemy.js contents
// ==========================
(function(){
  Game.Enemy = function(game, x, y){
    Phaser.Sprite.call(this, game, x, y, 'enemy');
    game.add.existing(this);
    game.physics.arcade.enable(this);
    this.anchor.set(0.5);
    this.body.collideWorldBounds = true;
    this.speed = 40;
    this.healthPoints = 3;
    this.target = null;
    this._hurtTintUntil = 0;
  };
  Game.Enemy.prototype = Object.create(Phaser.Sprite.prototype);
  Game.Enemy.prototype.constructor = Game.Enemy;

  Game.Enemy.prototype.update = function(){
    if (!this.alive) return;
    if (this.target) {
      var dx = this.target.x - this.x;
      var dy = this.target.y - this.y;
      var len = Math.sqrt(dx*dx + dy*dy) || 1;
      this.body.velocity.x += (dx / len) * this.speed;
      this.body.velocity.y += (dy / len) * this.speed;
      this.body.velocity.x = Phaser.Math.clamp(this.body.velocity.x, -160, 160);
      this.body.velocity.y = Phaser.Math.clamp(this.body.velocity.y, -160, 160);
    }
    if (this.game.time.now > this._hurtTintUntil && this.tint !== 0xffffff) {
      this.tint = 0xffffff;
    }
  };

  Game.Enemy.prototype.takeDamage = function(dmg, knockVec){
    if (!this.alive) return false;
    this.healthPoints -= (dmg || 1);
    this.tint = 0xff6666;
    this._hurtTintUntil = this.game.time.now + 120;
    if (knockVec) {
      this.body.velocity.x += knockVec.x;
      this.body.velocity.y += knockVec.y;
    }
    if (this.healthPoints <= 0) {
      this.kill();
      return true;
    }
    return false;
  };
})();

// ==========================
// main.js contents
// ==========================
(function () {
  var game = new Phaser.Game(Game.w, Game.h, Phaser.AUTO, 'game-container');
  game.state.add('Load', Game.Load);
  game.state.add('Play', Game.Play);
  game.state.add('Over', Game.Over);
  game.state.start('Load');

  // ADD THIS:
  window.__phaserGame = game;
  window.game = game; // optional, for older code
})();
