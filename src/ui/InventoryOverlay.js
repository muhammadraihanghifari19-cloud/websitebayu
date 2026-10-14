import Overlay from './Overlay.js';
import { label, button, roundedPanel } from './UIKit.js';
import { UI, UITEXT } from '../config.js';
import { INGREDIENT_LIST } from '../data/ingredients.js';

/**
 * InventoryOverlay — shows ingredient stock and lets the player restock using
 * coins. Low stock is highlighted. ctx.gs = GameState; ctx.onRestock(ing).
 */
export default class InventoryOverlay extends Overlay {
  constructor(scene, ctx) {
    super(scene, { title: '📦 Inventaris Bahan', w: 880, h: 580 });
    this.ctx = ctx;
  }

  buildBody() {
    const { x, y, w } = this.frame;
    this.headerText = label(this.scene, x + 24, y + 88, this.headerStr(), { size: 18, color: UITEXT.light });
    this.body.add(this.headerText);
    this.grid = this.scene.add.container(0, 0);
    this.body.add(this.grid);
    this.render();
  }

  headerStr() { return `Koin: ${this.ctx.gs.coins} 🪙   (stok rendah ditandai merah)`; }

  render() {
    this.grid.removeAll(true);
    this.headerText.setText(this.headerStr());
    const { x, y, w } = this.frame;
    const cols = 2;
    const cellW = (w - 72) / cols;
    const cellH = 76;
    const startY = y + 120;

    INGREDIENT_LIST.filter((i) => i.id !== 'air').forEach((ing, idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const cx = x + 24 + col * (cellW + 24);
      const cy = startY + row * (cellH + 12);
      const stock = this.ctx.gs.getStock(ing.id);
      const low = stock <= 2;

      const cardG = roundedPanel(this.scene, cx, cy, cellW, cellH, {
        radius: 12, fill: UI.panelSoft, stroke: low ? UI.bad : UI.stroke, strokeW: low ? 3 : 2
      });
      this.grid.add(cardG);

      this.grid.add(label(this.scene, cx + 20, cy + cellH / 2, ing.icon, { size: 32, origin: [0, 0.5] }));
      this.grid.add(label(this.scene, cx + 64, cy + 22, ing.name, { size: 18, bold: true, color: UITEXT.light }));
      this.grid.add(label(this.scene, cx + 64, cy + 48, `Stok: ${stock}`, {
        size: 15, color: low ? UITEXT.bad : UITEXT.dim
      }));

      const affordable = this.ctx.gs.coins >= ing.price;
      const b = button(this.scene, cx + cellW - 92, cy + cellH / 2, `+${ing.restock} (${ing.price}🪙)`, () => {
        const ok = this.ctx.onRestock(ing);
        if (ok) this.render();
      }, { w: 150, h: 46, size: 14, color: affordable ? UI.good : UI.badDark, textColor: affordable ? UITEXT.ink : UITEXT.light });
      b.setEnabled(affordable);
      this.grid.add(b.container); this.grid.add(b.zone);
    });
  }
}
