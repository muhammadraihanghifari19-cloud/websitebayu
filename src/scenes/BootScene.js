import Phaser from 'phaser';

/**
 * BootScene
 * Everything in this game is drawn procedurally with the Phaser Graphics API,
 * so there are no image assets to load yet. This scene exists as a clean place
 * to add real asset loading later (sprites, audio, fonts) and simply hands off
 * to the main WarkopScene.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.scene.start('WarkopScene');
  }
}
