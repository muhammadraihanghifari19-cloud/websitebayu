import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UI, UITEXT } from '../config.js';
import { roundedPanel, label, button } from './UIKit.js';

/**
 * Overlay — base class for full-screen modal panels (shop, inventory, missions,
 * collection, settings). Handles the dim backdrop, a titled frame, a close
 * button, and open/close animations. Subclasses implement buildBody().
 *
 * Lives inside the main scene (not a separate Phaser scene) at high depth, so
 * the world keeps rendering behind it. Backdrop + widgets stop pointer
 * propagation so the scene's dialogue input never fires underneath.
 */
export default class Overlay extends Phaser.GameObjects.Container {
  constructor(scene, { title = '', w = 820, h = 560, onClose = null } = {}) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(1200);
    this.onCloseCb = onClose;

    this.frame = { w, h, x: GAME_WIDTH / 2 - w / 2, y: GAME_HEIGHT / 2 - h / 2 };

    // Backdrop blocks world input.
    this.backdrop = scene.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT).setInteractive();
    this.backdrop.on('pointerdown', (p, lx, ly, e) => { if (e && e.stopPropagation) e.stopPropagation(); });
    this.add(this.backdrop);
    const dim = scene.add.graphics();
    dim.fillStyle(0x120b06, 0.6);
    dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add(dim);

    // Frame
    this.panelG = roundedPanel(scene, this.frame.x, this.frame.y, w, h, { radius: 24 });
    this.add(this.panelG);

    // Title bar
    const titleBar = roundedPanel(scene, this.frame.x, this.frame.y, w, 64, { radius: 24, fill: UI.panelSoft, strokeW: 0 });
    this.add(titleBar);
    this.add(label(scene, GAME_WIDTH / 2, this.frame.y + 32, title, {
      size: 26, bold: true, color: UITEXT.accent, origin: [0.5, 0.5]
    }));

    // Close button
    this.closeBtn = button(scene, this.frame.x + w - 42, this.frame.y + 32, '✕', () => this.close(), {
      w: 48, h: 48, size: 22, color: UI.bad, textColor: UITEXT.light
    });
    this.add(this.closeBtn.container); this.add(this.closeBtn.zone);

    // Body container
    this.body = scene.add.container(0, 0);
    this.add(this.body);

    this.setVisible(false);
  }

  open(...args) {
    this.body.removeAll(true);
    this.buildBody(...args);
    this.setVisible(true);
    this.setScale(0.94);
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, scale: 1, alpha: 1, duration: 160, ease: 'Back.out' });
  }

  close() {
    this.scene.tweens.add({
      targets: this, scale: 0.94, alpha: 0, duration: 130,
      onComplete: () => { this.setVisible(false); this.body.removeAll(true); if (this.onCloseCb) this.onCloseCb(); }
    });
  }

  get isOpen() { return this.visible; }

  // Subclasses override this.
  buildBody() {}
}
