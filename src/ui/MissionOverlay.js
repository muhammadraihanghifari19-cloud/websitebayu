import Phaser from 'phaser';
import Overlay from './Overlay.js';
import { label, button, roundedPanel } from './UIKit.js';
import { UI, UITEXT } from '../config.js';

/**
 * MissionOverlay — shows today's daily missions with progress bars and a Claim
 * button for completed ones. ctx.missions = MissionSystem.
 */
export default class MissionOverlay extends Overlay {
  constructor(scene, ctx) {
    super(scene, { title: '🎯 Misi Harian', w: 760, h: 520 });
    this.ctx = ctx;
  }

  buildBody() {
    this.list = this.scene.add.container(0, 0);
    this.body.add(this.list);
    this.render();
  }

  render() {
    this.list.removeAll(true);
    const { x, y, w } = this.frame;
    const missions = this.ctx.missions.list.map((m) => this.ctx.missions.describe(m));
    const startY = y + 96;
    const rowH = 108;

    missions.forEach((m, i) => {
      const ry = startY + i * (rowH + 12);
      const card = roundedPanel(this.scene, x + 24, ry, w - 48, rowH, { radius: 14, fill: UI.panelSoft, strokeW: 2 });
      this.list.add(card);

      this.list.add(label(this.scene, x + 48, ry + 26, m.name, { size: 19, bold: true, color: UITEXT.light }));
      this.list.add(label(this.scene, x + 48, ry + 52, `Hadiah: ${m.reward}`, { size: 15, color: UITEXT.accent }));

      // progress bar
      const barW = w - 320, bx = x + 48, by = ry + 74;
      const barBg = this.scene.add.graphics();
      barBg.fillStyle(0x000000, 0.5); barBg.fillRoundedRect(bx, by, barW, 16, 8);
      this.list.add(barBg);
      const frac = Phaser.Math.Clamp(m.progress / m.target, 0, 1);
      const barFill = this.scene.add.graphics();
      barFill.fillStyle(m.done ? UI.good : UI.accent, 1);
      barFill.fillRoundedRect(bx, by, barW * frac, 16, 8);
      this.list.add(barFill);
      this.list.add(label(this.scene, bx + barW + 10, by + 8, `${m.progress}/${m.target}`, { size: 15, color: UITEXT.dim }));

      // claim / status button
      let txt, color, enabled;
      if (m.claimed) { txt = 'Diklaim ✓'; color = UI.goodDark; enabled = false; }
      else if (m.done) { txt = 'Klaim!'; color = UI.good; enabled = true; }
      else { txt = 'Berjalan'; color = UI.panelSoft; enabled = false; }

      const b = button(this.scene, x + w - 110, ry + rowH / 2, txt, () => {
        const r = this.ctx.missions.claim(m.id);
        if (r) { this.flash('Hadiah diterima!', UITEXT.good); this.render(); if (this.ctx.onClaim) this.ctx.onClaim(r); }
      }, { w: 150, h: 50, size: 16, color, textColor: enabled ? UITEXT.ink : UITEXT.light });
      b.setEnabled(enabled);
      this.list.add(b.container); this.list.add(b.zone);
    });

    if (!missions.length) {
      this.list.add(label(this.scene, x + w / 2, y + 200, 'Tidak ada misi hari ini.', { size: 18, color: UITEXT.dim, origin: [0.5, 0.5] }));
    }
  }

  flash(msg, color) {
    const { x, y, w, h } = this.frame;
    const t = label(this.scene, x + w / 2, y + h - 24, msg, { size: 18, bold: true, color, origin: [0.5, 0.5] });
    this.body.add(t);
    this.scene.tweens.add({ targets: t, alpha: 0, y: t.y - 16, duration: 1200, onComplete: () => t.destroy() });
  }
}
