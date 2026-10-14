import Overlay from './Overlay.js';
import { label, button } from './UIKit.js';
import { UI, UITEXT } from '../config.js';

/**
 * SettingsOverlay — minimal settings. For now: a "reduce visual effects" toggle
 * that cuts particles/steam/sparkles for lower-end devices or small screens.
 * ctx.gs = GameState; ctx.onToggleEffects(bool).
 */
export default class SettingsOverlay extends Overlay {
  constructor(scene, ctx) {
    super(scene, { title: '⚙️ Pengaturan', w: 620, h: 400 });
    this.ctx = ctx;
  }

  buildBody() {
    const { x, y, w } = this.frame;
    this.body.add(label(this.scene, x + 40, y + 120, 'Kurangi efek visual', { size: 20, color: UITEXT.light }));
    this.body.add(label(this.scene, x + 40, y + 150, 'Matikan partikel/uap/kilau agar lebih ringan di HP.', {
      size: 14, color: UITEXT.dim, wrap: w - 80
    }));

    this.toggleBtn = button(this.scene, x + w - 130, y + 136, '', () => {
      const next = !this.ctx.gs.settings.reduceEffects;
      this.ctx.gs.setSetting('reduceEffects', next);
      if (this.ctx.onToggleEffects) this.ctx.onToggleEffects(next);
      this.updateToggle();
    }, { w: 160, h: 54, size: 18 });
    this.body.add(this.toggleBtn.container); this.body.add(this.toggleBtn.zone);
    this.updateToggle();

    // Progress note (reassure the player their save is safe)
    this.body.add(label(this.scene, x + 40, y + 230, 'Progres tersimpan otomatis di perangkat ini.', {
      size: 14, color: UITEXT.dim
    }));
    this.body.add(label(this.scene, x + 40, y + 256, `Koin: ${this.ctx.gs.coins} • Reputasi: ${this.ctx.gs.reputation} • Hari: ${this.ctx.dayInfo ? this.ctx.dayInfo() : '-'}`, {
      size: 14, color: UITEXT.accent
    }));
  }

  updateToggle() {
    const on = this.ctx.gs.settings.reduceEffects;
    this.toggleBtn.setLabel(on ? 'AKTIF' : 'NONAKTIF');
    this.toggleBtn.setColors(on ? UI.good : UI.panelSoft, on ? UITEXT.ink : UITEXT.light);
  }
}
