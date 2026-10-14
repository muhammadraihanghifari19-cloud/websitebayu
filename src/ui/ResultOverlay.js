import Overlay from './Overlay.js';
import { label, button } from './UIKit.js';
import { UI, UITEXT } from '../config.js';

/**
 * ResultOverlay — challenge result screen showing target, achieved, pass/fail
 * and reward. ctx.onContinue().
 */
export default class ResultOverlay extends Overlay {
  constructor(scene, ctx) {
    super(scene, { title: '⏱️ Hasil Tantangan', w: 640, h: 460 });
    this.ctx = ctx;
  }

  buildBody(result) {
    // result: { target, served, success, reward }
    const { x, y, w } = this.frame;
    const r = result || { target: 0, served: 0, success: false, reward: 0 };

    const big = r.success ? '🎉 BERHASIL!' : '😅 Belum Berhasil';
    this.body.add(label(this.scene, x + w / 2, y + 130, big, {
      size: 36, bold: true, origin: [0.5, 0.5], color: r.success ? UITEXT.good : UITEXT.bad
    }));
    this.body.add(label(this.scene, x + w / 2, y + 190, `Target: layani ${r.target} pelanggan`, {
      size: 20, color: UITEXT.light, origin: [0.5, 0.5]
    }));
    this.body.add(label(this.scene, x + w / 2, y + 224, `Tercapai: ${r.served} pelanggan`, {
      size: 20, color: UITEXT.light, origin: [0.5, 0.5]
    }));
    if (r.success && r.reward > 0) {
      this.body.add(label(this.scene, x + w / 2, y + 268, `Hadiah: +${r.reward} 🪙 (masuk ke progres utama)`, {
        size: 18, color: UITEXT.accent, origin: [0.5, 0.5]
      }));
    } else if (!r.success) {
      this.body.add(label(this.scene, x + w / 2, y + 268, 'Progres utama tetap aman — coba lagi kapan saja!', {
        size: 16, color: UITEXT.dim, origin: [0.5, 0.5]
      }));
    }

    const b = button(this.scene, x + w / 2, y + 340, 'Kembali ke Warkop', () => {
      this.close(); this.ctx.onContinue();
    }, { w: 260, h: 56, color: UI.good, textColor: UITEXT.ink });
    this.body.add(b.container); this.body.add(b.zone);
  }
}
