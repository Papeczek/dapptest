// Game Configuration - Centralized tweakable parameters
window.Game = window.Game || {};

console.log('🎛️ GameConfig.js loading...');

Game.Config = {
  // === GAME WORLD ===
  world: {
    width: 1500,      // Keep current viewport size
    height: 900,     
    backgroundColor: '#34495e'
  },

  // === PLAYER CONFIG ===
  player: {
    // Visual
    scale: 0.3,
    
    // Movement
    speed: 320,
    
    // Dash
    dashSpeed: 920,
    dashDuration: 220,          // ms
    dashCooldown: 500,          // ms
    dashInvulnerability: true,  // dash provides invulnerability
    
    // Health
    maxHealth: 13,
    invulnerabilityDuration: 400, // ms after taking damage
    
    // Animation
    walkAnimationRate: 120,     // ms between walk frames
    
    // Combat
    bulletSpeed: 900,
    shootCooldown: 250,         // ms
    bulletScale: 0.3,
    bulletLifespan: 1200,        // ms
    
    // Effects
    hurtTintDuration: 250,      // ms
    hurtTintColor: 0xff6666,
    healTintColor: 0x66ff66,
    dashTintColor: 0xddddff,
    dashTintDuration: 210,      // ms
    
    // Knockback
    knockbackMultiplier: 150
  },

  // === ENEMY TYPES CONFIG ===
  enemies: {
    shrimp: {
      texture: 'shrimp',
      hp: 3,
      speed: 80,
      damage: 2,
      scale: 0.075,
      maxVelocity: 260,
      damageInterval: 500,      // ms between damage applications
      hurtTintColor: 0xff9999,
      scoreValue: 25
    },
    
    crab: {
      texture: 'crab',
      hp: 6,
      speed: 45,
      damage: 3,
      scale: 0.1,
      maxVelocity: 200,
      damageInterval: 500,
      hurtTintColor: 0xff6666,
      scoreValue: 50
    },
    
    dolphin: {
      texture: 'dolphin',
      hp: 12,
      speed: 35,
      damage: 4,
      scale: 0.14,
      maxVelocity: 140,
      damageInterval: 500,
      hurtTintColor: 0x6666ff,
      scoreValue: 125
    },
    
    whale: {
      texture: 'whale',
      hp: 25,
      speed: 30,
      damage: 7,
      scale: 0.31,
      maxVelocity: 110,
      damageInterval: 500,
      hurtTintColor: 0x9999ff,
      scoreValue: 350
    }
  },

  // === GAMEPLAY ===
  gameplay: {
    maxEnemiesAlive: 3,         // spawn more when below this
    enemySpawnDistance: 250,    // minimum distance from player when spawning
    bulletKnockbackForce: 220,  // knockback applied to enemies when shot
    
    // Health UI colors
    healthColors: {
      high: '#00ff00',    // > 60%
      medium: '#ffff00',  // 30-60%
      low: '#ff0000'      // < 30%
    },
    
    // Thresholds for health color changes
    healthThresholds: {
      high: 0.6,     // 60%
      medium: 0.3    // 30%
    }
  },

  // === SWAP-BASED SPAWNING ===
  swapSpawning: {
    // USDC amount thresholds for enemy types
    thresholds: {
      shrimp: 0,      // $0-1000
      crab: 1000,      // $100-5000  
      dolphin: 2500,   // $5000-10000
      whale: 10000     // $1500+
    },
    
    // Score multipliers for different enemy types
    scoreMultipliers: {
      shrimp: 10,
      crab: 50,
      dolphin: 100,
      whale: 250
    },
    
    // Points per wave (block) survived
    wavePoints: 100,
    
    // Enemy spawn delay (ms) - time before they start moving
    spawnDelay: 1400
  },

  // === AUDIO ===
  audio: {
    hitVolume: 0.1,
    masterVolume: 1.0
  },

  // === UI ===
  ui: {
    fontSize: '20px',
    fontFamily: 'Arial',
    fontColor: '#fff',
    
    // UI positions
    ethKilledPosition: { x: 15, y: 10 },
    healthPosition: { x: 15, y: 35 },
    instructionsPosition: { x: 'center', y: 50 }, // from bottom
    
    // Game over screen
    gameOver: {
      fontSize: '30px',
      restartDelay: 800 // ms before allowing restart
    },
    
    // Instructions fade
    instructionsFadeDelay: 800, // ms
    instructionsFadeDuration: 800 // ms
  },

  // === DEBUG ===
  debug: {
    showCollisionBodies: false,  // show green collision rectangles
    logDamage: true,           // console.log damage events
    logEnemySpawns: true       // console.log when enemies spawn
  },

  // === SPAWN PATTERNS ===
  spawning: {
    // Default spawn weights (probability of each enemy type)
    defaultWeights: {
      shrimp: 0.4,   // 40%
      crab: 0.3,     // 30% 
      dolphin: 0.2,  // 20%
      whale: 0.1     // 10%
    },
    
    // Spawn zones (areas where enemies can spawn)
    spawnZones: [
      { x: 40, y: 40, width: 820, height: 570 } // adjusted for our 900x650 size
    ]
  }
};

// === HELPER FUNCTIONS ===
Game.Config.getEnemyConfig = function(enemyType) {
  return this.enemies[enemyType] || null;
};

Game.Config.getAvailableEnemyTypes = function() {
  return Object.keys(this.enemies);
};

Game.Config.getRandomEnemyType = function() {
  var types = this.getAvailableEnemyTypes();
  return types[Math.floor(Math.random() * types.length)];
};

Game.Config.getWeightedRandomEnemyType = function() {
  var weights = this.spawning.defaultWeights;
  var totalWeight = 0;
  var types = [];
  
  // Build weighted array
  for (var type in weights) {
    totalWeight += weights[type];
    types.push({ type: type, weight: totalWeight });
  }
  
  // Pick random based on weights
  var random = Math.random() * totalWeight;
  for (var i = 0; i < types.length; i++) {
    if (random <= types[i].weight) {
      return types[i].type;
    }
  }
  
  return this.getRandomEnemyType(); // fallback
};

console.log('✅ GameConfig.js loaded successfully!');
console.log('📊 Player scale:', Game.Config.player.scale, 'Speed:', Game.Config.player.speed, 'Dash speed:', Game.Config.player.dashSpeed);
console.log('🦐 Enemy scales - Shrimp:', Game.Config.enemies.shrimp.scale, 'Crab:', Game.Config.enemies.crab.scale, 'Dolphin:', Game.Config.enemies.dolphin.scale, 'Whale:', Game.Config.enemies.whale.scale);