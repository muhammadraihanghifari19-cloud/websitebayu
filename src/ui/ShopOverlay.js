import Overlay from './Overlay.js';
import { label, button, roundedPanel } from './UIKit.js';
import { UI, UITEXT } from '../config.js';
import { SHOP, SHOP_CATEGORIES } from '../data/shop.js';

/**
 * ShopOverlay — multi-category warkop development store.
 * Reads live state from GameState via the provided context:
 *   ctx.gs           -> GameState
 *   ctx.isOwned(item)-> bool (upgrade/decoration/recipe already owned)
 *   ctx.onBuy(item)  -> attempts purchase, returns true/false
 */
export default class ShopOverlay extends Overlay {
  constructor(scene, ctx) {
    super(scene, { title: '🏪 Kembangkan Warkop', w: 880, h: 580 });
    this.ctx = ctx;
    this.activeCat = 'peralatan';
  }

  buildBody() {
    const { x, y, w } = this.frame;

    // Coin + reputation readout
    this.add(label(this.scene, x + 24, y + 90, '', { size: 18, color: UITEXT.dim }));
    this.header = this.body.list ? null : null;
    this.headerText = label(this.scene, x + 24, y + 88, this.headerStr(), { size: 18, color: UITEXT.light });
    this.body.add(this.headerText);

    // Category tabs
    const tabY = y + 128;
    this.tabBtns = [];
    SHOP_CATEGORIES.forEach((cat, i) => {
      const bx = x + 120 + i * 180;
      const b = button(this.scene, bx, tabY, cat.name, () => { this.activeCat = cat.id; this.refresh(); }, {
        w: 160, h: 46, size: 17, icon: cat.icon,
        color: cat.id === this.activeCat ? UI.accent : UI.panelSoft,
        textColor: cat.id === this.activeCat ? UITEXT.ink : UITEXT.light
      });
      this.body.add(b.container); this.body.add(b.zone);
      this.tabBtns.push({ cat, b });
    });

    this.listContainer = this.scene.add.container(0, 0);
    this.body.add(this.listContainer);
    this.renderList();
  }

  headerStr() {
    return `Koin: ${this.ctx.gs.coins} 🪙     Reputasi: ${this.ctx.gs.reputation}/100 ⭐`;
  }

  refresh() {
    this.headerText.setText(this.headerStr());
    this.tabBtns.forEach(({ cat, b }) => {
      const active = cat.id === this.activeCat;
      b.setColors(active ? UI.accent : UI.panelSoft, active ? UITEXT.ink : UITEXT.light);
    });
    this.renderList();
  }

  renderList() {
    this.listContainer.removeAll(true);
    const items = SHOP[this.activeCat] || [];
    const { x, y, w } = this.frame;
    const startY = y + 180;
    const rowH = 84;

    items.forEach((item, i) => {
      const ry = startY + i * (rowH + 10);
      const card = roundedPanel(this.scene, x + 24, ry, w - 48, rowH, { radius: 14, fill: UI.panelSoft, strokeW: 2 });
      this.listContainer.add(card);

      this.listContainer.add(label(this.scene, x + 48, ry + 26, item.icon, { size: 34, origin: [0, 0.5] }));
      this.listContainer.add(label(this.scene, x + 96, ry + 24, item.name, { size: 20, bold: true, color: UITEXT.light }));
      this.listContainer.add(label(this.scene, x + 96, ry + 54, item.desc, { size: 15, color: UITEXT.dim, wrap: w - 360 }));

      const owned = this.ctx.isOwned(item);
      const repOk = !item.requiresReputation || this.ctx.gs.reputation >= item.requiresReputation;
      const affordable = this.ctx.gs.coins >= item.price;

      let labelTxt, color, enabled;
      if (owned) { labelTxt = 'Dimiliki ✓'; color = UI.goodDark; enabled = false; }
      else if (!repOk) { labelTxt = `Reputasi ${item.requiresReputation}`; color = UI.badDark; enabled = false; }
      else if (!affordable) { labelTxt = `${item.price} 🪙`; color = UI.badDark; enabled = false; }
      else { labelTxt = `Beli ${item.price} 🪙`; color = UI.good; enabled = true; }

      const buyBtn = button(this.scene, x + w - 130, ry + rowH / 2, labelTxt, () => {
        const ok = this.ctx.onBuy(item);
        if (ok) {
          this.flash(`${item.name} dibeli!`, UITEXT.good);
          this.refresh();
        } else {
          this.flash('Tidak bisa membeli', UITEXT.bad);
        }
      }, { w: 180, h: 50, size: 16, color, textColor: owned || !enabled ? UITEXT.light : UITEXT.ink });
      buyBtn.setEnabled(enabled);
      this.listContainer.add(buyBtn.container); this.listContainer.add(buyBtn.zone);
    });
  }

  flash(msg, color) {
    const { x, y, w, h } = this.frame;
    const t = label(this.scene, x + w / 2, y + h - 28, msg, { size: 18, bold: true, color, origin: [0.5, 0.5] });
    this.body.add(t);
    this.scene.tweens.add({ targets: t, alpha: 0, y: t.y - 16, duration: 1200, onComplete: () => t.destroy() });
  }
}
