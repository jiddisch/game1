import BootScene from './scenes/BootScene.js';
import Level1 from './scenes/Level1.js';
import Level2 from './scenes/Level2.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE
  },
  scene: [BootScene, Level1, Level2]
};

const game = new Phaser.Game(config);

game.events.on('ready', () => {
  game.registry.set('coins', 50);
  game.registry.set('level', 1);
});