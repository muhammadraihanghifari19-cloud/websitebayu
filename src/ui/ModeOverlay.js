import Overlay from './Overlay.js';
import { label, button, roundedPanel } from './UIKit.js';
import { UI, UITEXT } from '../config.js';

/**
 * ModeOverlay — choose a game mode.
 *   Harian: endless, relaxed management (main save).
 *   Tantangan: timed target run in a sandbox (never touches main save).
 * ctx.onSelect(modeId).
 */
export default class ModeOverlay extends Overlay {
  constructor(scene, ctx) {
    super(scene, { title: '🎮 Pilih Mode', w: 760, h: 460 });
    this.ctx = ctx;
  }

  buildBody() {
    const { x, y, w } = this.frame;

    const makeCard = (cx, title, icon, desc, color, modeId) => {
      const cw = 320, ch = 250, top = y + 100;
      const card = roundedPanel(this.scene, cx, top, cw, ch, { radius: 18, fill: UI.panelSoft, strokeW: 2 });
      this.body.add(card);
      this.body.add(label(this.scene, cx + cw / 2, top + 50, icon, { size: 56, origin: [0.5, 0.5] }));
      this.body.add(label(this.scene, cx + cw / 2, top + 110, title, { size: 24, bold: true, color: UITEXT.light, origin: [0.5, 0.5] }));
      this.body.add(label(this.scene, cx + cw / 2, top + 150, desc, { size: 15, color: UITEXT.dim, origin: [0.5, 0.5], wrap: cw - 40, align: 'center' }));
      const b = button(this.scene, cx + cw / 2, top + ch - 36, 'Mainkan', () => { this.close(); this.ctx.onSelect(modeId); }, {
        w: 180, h: 50, color, textColor: UITEXT.ink
      });
      this.body.add(b.container); this.body.add(b.zone);
    };

    makeCard(x + 40, 'Mode Harian', '🏠', 'Kelola warkop dengan santai. Pelanggan, stok, upgrade, misi — tanpa batas waktu.', UI.good, 'harian');
    makeCard(x + w - 360, 'Mode Tantangan', '⏱️', 'Layani sebanyak mungkin dalam 90 detik! Tidak memengaruhi progres utama.', UI.accent, 'tantangan');
  }
}
