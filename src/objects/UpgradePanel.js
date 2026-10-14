import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

/**
 * UpgradePanel
 * ------------
 * A small shop UI for buying warkop upgrades. For this stage it offers a
 * single item (a better stove). It shows the price and a Buy button that only
 * succeeds when the player can afford it.
 *
 * Wiring (done by the scene):
 *   panel.setContext({ getCoins, canAfford, onBuy });
 *   - getCoins(): current coin count (number)
 *   - onBuy(item): called when a valid purchase is confirmed; should deduct
 *     coins and apply the effect. Return true on success.
 *
 * All buttons use their own interactive zones with stopPropagation so they
 * never trigger the scene's global tap-to-advance dialogue input.
 */
export default class UpgradePanel extends Phaser.GameObjects.Container {
  constructor(scene, item) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(970); // above HUD (950), below DialogueBox (1000)

    this.item = item;
    this.ctx = null;

    this.buildOpenButton(scene);
    this.buildPanel(scene);
    this.closePanel(); // start closed
  }

  setContext(ctx) {
    this.ctx = ctx;
    return this;
  }

  // --- "Upgrade" open button (top-right corner) -----------------------------
  buildOpenButton(scene) {
    const w = 150;
    const h = 46;
    const x = GAME_WIDTH - w / 2 - 20;
    const y = 360; // below the menu board, clear of other HUD

    this.openBtn = scene.add.container(x, y);
    this.add(this.openBtn);

    this.openBg = scene.add.graphics();
    this.openBtn.add(this.openBg);
    this.drawPill(this.openBg, w, h, COLORS.green);

    const label = scene.add.text(0, 0, '🔧 Upgrade', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fdf6e8'
    }).setOrigin(0.5);
    this.openBtn.add(label);

    const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    this.add(zone);
    zone.on('pointerover', () => this.drawPill(this.openBg, w, h, COLORS.greenDark));
    zone.on('pointerout', () => this.drawPill(this.openBg, w, h, COLORS.green));
    zone.on('pointerdown', (p, lx, ly, e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      this.openPanel();
    });
    this.openZone = zone;
  }

  // --- The upgrade shop panel ----------------------------------------------
  buildPanel(scene) {
    const w = 520;
    const h = 320;
    const x = GAME_WIDTH / 2 - w / 2;
    const y = GAME_HEIGHT / 2 - h / 2 - 30;
    this.panelBounds = { x, y, w, h };

    this.panel = scene.add.container(0, 0);
    this.add(this.panel);

    // dim backdrop that also blocks clicks to the world behind
    this.backdrop = scene.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
      .setInteractive();
    this.backdrop.on('pointerdown', (p, lx, ly, e) => { if (e && e.stopPropagation) e.stopPropagation(); });
    this.panel.add(this.backdrop);
    const dim = scene.add.graphics();
    dim.fillStyle(0x000000, 0.45);
    dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.panel.add(dim);

    const g = scene.add.graphics();
    g.fillStyle(COLORS.black, 0.95);
    g.fillRoundedRect(x, y, w, h, 20);
    g.lineStyle(4, COLORS.cream, 0.95);
    g.strokeRoundedRect(x, y, w, h, 20);
    this.panel.add(g);

    // Title
    this.panel.add(scene.add.text(x + w / 2, y + 36, 'KEMBANGKAN WARKOP', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#f2c14e'
    }).setOrigin(0.5));

    // Item card
    const cardX = x + 30;
    const cardY = y + 70;
    const cardW = w - 60;
    const cardH = 150;
    const card = scene.add.graphics();
    card.fillStyle(0x3a2616, 0.9);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 14);
    card.lineStyle(2, COLORS.cream, 0.4);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 14);
    this.panel.add(card);

    // Item icon (upgraded stove preview via emoji to avoid layout coupling)
    this.panel.add(scene.add.text(cardX + 20, cardY + cardH / 2, '🔥', {
      fontFamily: 'Segoe UI Emoji, sans-serif',
      fontSize: '56px'
    }).setOrigin(0, 0.5));

    this.panel.add(scene.add.text(cardX + 110, cardY + 28, this.item.name, {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '23px',
      fontStyle: 'bold',
      color: '#fdf6e8'
    }));
    this.panel.add(scene.add.text(cardX + 110, cardY + 62, this.item.desc, {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '17px',
      color: '#d8c3a0',
      wordWrap: { width: cardW - 130 }
    }));
    this.panel.add(scene.add.text(cardX + 110, cardY + cardH - 34, `Harga: ${this.item.price} 🪙`, {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#f2c14e'
    }));

    // Feedback line (e.g. "Koin belum cukup")
    this.feedback = scene.add.text(x + w / 2, y + h - 86, '', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '18px',
      color: '#e06a5f'
    }).setOrigin(0.5);
    this.panel.add(this.feedback);

    // Buy button
    this.buyBtn = scene.add.container(x + w / 2 - 90, y + h - 46);
    this.panel.add(this.buyBtn);
    this.buyBg = scene.add.graphics();
    this.buyBtn.add(this.buyBg);
    this.buyLabel = scene.add.text(0, 0, 'Beli', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#241812'
    }).setOrigin(0.5);
    this.buyBtn.add(this.buyLabel);
    this.buyW = 150; this.buyH = 56;

    this.buyZone = scene.add.zone(x + w / 2 - 90, y + h - 46, this.buyW, this.buyH)
      .setInteractive({ useHandCursor: true });
    this.panel.add(this.buyZone);
    this.buyZone.on('pointerdown', (p, lx, ly, e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      this.attemptBuy();
    });

    // Close button
    this.closeBtn = scene.add.container(x + w / 2 + 90, y + h - 46);
    this.panel.add(this.closeBtn);
    const closeBg = scene.add.graphics();
    this.drawPill(closeBg, 150, 56, COLORS.red, true);
    this.closeBtn.add(closeBg);
    this.closeBtn.add(scene.add.text(0, 0, 'Tutup', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fdf6e8'
    }).setOrigin(0.5));
    const closeZone = scene.add.zone(x + w / 2 + 90, y + h - 46, 150, 56)
      .setInteractive({ useHandCursor: true });
    this.panel.add(closeZone);
    closeZone.on('pointerdown', (p, lx, ly, e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      this.closePanel();
    });
  }

  drawPill(g, w, h, color, centered = true) {
    const ox = centered ? -w / 2 : 0;
    const oy = centered ? -h / 2 : 0;
    g.clear();
    g.fillStyle(COLORS.black, 0.25);
    g.fillRoundedRect(ox + 3, oy + 4, w, h, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(ox, oy, w, h, 14);
    g.lineStyle(3, COLORS.white, 0.85);
    g.strokeRoundedRect(ox, oy, w, h, 14);
  }

  refreshBuyButton() {
    const purchased = this.ctx && this.ctx.isPurchased && this.ctx.isPurchased(this.item);
    const affordable = this.ctx && this.ctx.getCoins() >= this.item.price;

    if (purchased) {
      this.buyLabel.setText('Terpasang ✓');
      this.drawPill(this.buyBg, this.buyW, this.buyH, COLORS.greenDark);
      this.buyZone.disableInteractive();
      this.feedback.setText('');
      return;
    }

    this.buyZone.setInteractive({ useHandCursor: true });
    this.buyLabel.setText('Beli');
    this.drawPill(this.buyBg, this.buyW, this.buyH, affordable ? COLORS.yellow : 0x7a6a4a);
    this.feedback.setText(affordable ? '' : 'Koin belum cukup untuk membeli ini.');
  }

  attemptBuy() {
    if (!this.ctx) return;
    if (this.ctx.isPurchased && this.ctx.isPurchased(this.item)) return;

    if (this.ctx.getCoins() < this.item.price) {
      // Not enough coins: reject with feedback + shake.
      this.feedback.setText('Koin belum cukup untuk membeli ini.');
      this.scene.tweens.add({
        targets: this.panel,
        x: '+=8',
        duration: 60,
        yoyo: true,
        repeat: 3,
        onComplete: () => { this.panel.x = 0; }
      });
      return;
    }

    const ok = this.ctx.onBuy(this.item);
    if (ok) {
      this.feedback.setText('');
      this.buyLabel.setText('Berhasil! ✓');
      this.refreshBuyButton();
      // close shortly after so the player sees the result
      this.scene.time.delayedCall(700, () => this.closePanel());
    }
  }

  openPanel() {
    this.refreshBuyButton();
    this.panel.setVisible(true);
    this.panel.setActive(true);
    this.enablePanelZones(true);
    this.openZone.disableInteractive();
    this.openBtn.setVisible(false);
    this.panel.setScale(0.9);
    this.panel.setAlpha(0);
    this.scene.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 180, ease: 'Back.out' });
  }

  closePanel() {
    this.panel.setVisible(false);
    this.panel.setActive(false);
    this.enablePanelZones(false);
    this.openZone.setInteractive({ useHandCursor: true });
    this.openBtn.setVisible(true);
  }

  enablePanelZones(on) {
    [this.backdrop, this.buyZone].forEach((z) => {
      if (!z) return;
      if (on) z.setInteractive(); else z.disableInteractive();
    });
    // close zone lives inside panel; toggle by panel visibility already,
    // but ensure it is interactive only when open
    if (this.panel) {
      this.panel.list.forEach((c) => {
        if (c && c.input && c !== this.buyZone && c !== this.backdrop) {
          c.input.enabled = on;
        }
      });
    }
  }
}
