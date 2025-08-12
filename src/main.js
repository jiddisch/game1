// src/main.js
import BootScene from './scenes/BootScene.js';
import Level1 from './scenes/Level1.js';
import Level2 from './scenes/Level2.js';
import Level3 from './scenes/Level3.js';
import Level4 from './scenes/Level4.js';
import Level5 from './scenes/Level5.js';
import Level6 from './scenes/Level6.js';
import Level7 from './scenes/Level7.js';
import Level8 from './scenes/Level8.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scale: { mode: Phaser.Scale.RESIZE },
  scene: [BootScene, Level1, Level2, Level3, Level4, Level5, Level6, Level7, Level8]
};

const game = new Phaser.Game(config);

game.events.on('ready', () => {
  game.registry.set('coins', 50);
  game.registry.set('level', 1);
  game.registry.set('lives', 3);
});