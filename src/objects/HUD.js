import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '../config.js';

/**
 * HUD
 * ---
 * On-screen game UI for the service loop:
 *   - Coin counter (top-left)
 *   - Order status panel (top-center) showing the current customer's order
 *     and what the player should do next
 *   - A single context action button (bottom-center-ish) whose label changes
 *     per phase: "Siapkan Pesanan" -> "Sajikan" etc.
 *
 * The button has its own interactive hit area and stops event propagation,
 * so it never collides with the scene's global tap-to-advance dialogue input.
 */
export default class HUD extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(950); // above world, below DialogueBox (1000)

    this.buildCoinCounter(scene);
    this.buildStatusPanel(scene);
    this.buildActionButton(scene);
  }

  // --- Coin counter ---------------------------------------------------------
  buildCoinCounter(scene) {
    const x = 24;
    const y = 20;
    const w = 190;
    const h = 54;

    const g = scene.add.graphics();
    g.fillStyle(COLORS.black, 0.78);
    g.fillRoundedRect(x, y, w, h, 14);
    g.lineStyle(3, COLORS.yellow, 0.95);
    g.strokeRoundedRect(x, y, w, h, 14);
    this.add(g);

    // Coin icon (simple layered circle so it reads as a coin, not a dot).
    const coin = scene.add.circle(x + 32, y + h / 2, 15, COLORS.yellow);
    const coinInner = scene.add.circle(x + 32, y + h / 2, 10, COLORS.orange);
    const coinMark = scene.add.text(x + 32, y + h / 2, 'Rp', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#241812'
    }).setOrigin(0.5);
    this.add(coin);
    this.add(coinInner);
    this.add(coinMark);

    this.coinText = scene.add.text(x + 58, y + h / 2, '0', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f2c14e'
    }).setOrigin(0, 0.5);
    this.add(this.coinText);
  }

  setCoins(value) {
    this.coinText.setText(String(value));
    // little pop animation on change
    this.scene.tweens.add({
      targets: this.coinText,
      scale: 1.25,
      duration: 120,
      yoyo: true,
      ease: 'Quad.out'
    });
  }

  /** Floating "+N" coin feedback near the coin counter. */
  floatCoinGain(amount) {
    const t = this.scene.add.text(150, 48, `+${amount}`, {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#8ef08a'
    }).setOrigin(0.5).setDepth(960);
    this.scene.tweens.add({
      targets: t,
      y: 10,
      alpha: 0,
      duration: 1100,
      ease: 'Sine.out',
      onComplete: () => t.destroy()
    });
  }

  // --- Order status panel ---------------------------------------------------
  buildStatusPanel(scene) {
    const w = 440;
    const h = 60;
    const x = GAME_WIDTH / 2 - w / 2;
    const y = 20;

    const g = scene.add.graphics();
    g.fillStyle(COLORS.black, 0.7);
    g.fillRoundedRect(x, y, w, h, 14);
    g.lineStyle(3, COLORS.cream, 0.8);
    g.strokeRoundedRect(x, y, w, h, 14);
    this.add(g);
    this.statusBounds = { x, y, w, h };

    this.statusIcon = scene.add.text(x + 20, y + h / 2, '', {
      fontFamily: 'Segoe UI Emoji, Trebuchet MS, sans-serif',
      fontSize: '28px'
    }).setOrigin(0, 0.5);
    this.add(this.statusIcon);

    this.statusText = scene.add.text(x + 58, y + h / 2, 'Menunggu pelanggan...', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '20px',
      color: '#fdf6e8'
    }).setOrigin(0, 0.5);
    this.add(this.statusText);
  }

  setStatus(text, icon = '') {
    this.statusIcon.setText(icon);
    this.statusText.setText(text);
  }

  // --- Context action button ------------------------------------------------
  buildActionButton(scene) {
    const w = 300;
    const h = 70;
    const x = GAME_WIDTH / 2;
    const y = 470; // sits in the open midground, clear of the dialogue box

    this.btn = scene.add.container(x, y);
    this.add(this.btn);

    this.btnBg = scene.add.graphics();
    this.btn.add(this.btnBg);

    this.btnLabel = scene.add.text(0, 0, '', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#241812'
    }).setOrigin(0.5);
    this.btn.add(this.btnLabel);

    this.btnW = w;
    this.btnH = h;
    this.drawButton(COLORS.yellow);

    // Interactive hit zone owned by the button; swallows the pointer so the
    // scene-level dialogue advance never fires from a button press.
    this.btnZone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    this.add(this.btnZone);

    this.btnZone.on('pointerover', () => this.drawButton(COLORS.orange));
    this.btnZone.on('pointerout', () => this.drawButton(COLORS.yellow));
    this.btnZone.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      this.scene.tweens.add({ targets: this.btn, scale: 0.94, duration: 80, yoyo: true });
      if (this.onClick) this.onClick();
    });

    this.hideButton();
  }

  drawButton(color) {
    const w = this.btnW;
    const h = this.btnH;
    this.btnBg.clear();
    this.btnBg.fillStyle(COLORS.black, 0.25);
    this.btnBg.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 16);
    this.btnBg.fillStyle(color, 1);
    this.btnBg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    this.btnBg.lineStyle(4, COLORS.white, 0.9);
    this.btnBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  }

  /** Show the button with a label + click handler. */
  showButton(label, onClick) {
    this.btnLabel.setText(label);
    this.onClick = onClick;
    this.btn.setVisible(true);
    this.btnZone.setVisible(true);
    this.btnZone.setInteractive({ useHandCursor: true });
    this.drawButton(COLORS.yellow);
    // gentle attention pulse
    if (this.btnPulse) this.btnPulse.stop();
    this.btn.setScale(1);
    this.btnPulse = this.scene.tweens.add({
      targets: this.btn,
      scale: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  hideButton() {
    this.onClick = null;
    if (this.btnPulse) { this.btnPulse.stop(); this.btnPulse = null; }
    this.btn.setScale(1);
    this.btn.setVisible(false);
    if (this.btnZone) {
      this.btnZone.disableInteractive();
      this.btnZone.setVisible(false);
    }
  }
}
