import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import BootScene from './scenes/BootScene.js';
import WarkopScene from './scenes/WarkopScene.js';
import CookingScene from './scenes/CookingScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a110a',
  pixelArt: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  render: {
    antialias: true
  },
  scene: [BootScene, WarkopScene, CookingScene]
};

const game = new Phaser.Game(config);

// Expose the game instance for debugging / automated testing in the browser.
if (typeof window !== 'undefined') {
  window.__WARKOP_GAME__ = game;
}

// Hide the HTML boot splash once the game is ready to render.
game.events.once('ready', () => {
  const splash = document.getElementById('boot-splash');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 500);
  }
});

export default game;
