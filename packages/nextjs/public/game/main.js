(function(){
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }

  function initGame() {
    // Make sure we have a container
    const container = document.getElementById('game-container');
    if (!container) {
      console.error('Game container not found! Make sure you have <div id="game-container"></div>');
      return;
    }

    // Clean up any existing canvas
    const existingCanvas = container.querySelector('canvas');
    if (existingCanvas) {
      existingCanvas.remove();
    }

    // Check if Game namespace exists
    if (!window.Game) {
      console.error('Game namespace not found! Make sure GameConfig.js loaded first.');
      return;
    }

    // Get dimensions from config
    var gameWidth = (window.Game.Config && window.Game.Config.world) ? window.Game.Config.world.width : 900;
    var gameHeight = (window.Game.Config && window.Game.Config.world) ? window.Game.Config.world.height : 650;

    // Initialize game with container
    var game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, 'game-container');
    
    // Add states
    game.state.add('Load', Game.Load);
    game.state.add('Play', Game.Play);
    game.state.add('Over', Game.Over);
    
    // Start the game
    game.state.start('Load');
    
    // Store reference for cleanup (important for Next.js hot reloading)
    window.__phaserGame = game;
    window.game = game; // fallback reference
    
    console.log('🎮 Phaser game initialized');
  }
})();