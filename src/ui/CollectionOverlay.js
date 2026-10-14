import Overlay from './Overlay.js';
import { label, roundedPanel } from './UIKit.js';
import { UI, UITEXT } from '../config.js';
import { RECIPES, SECRET_RECIPE_IDS } from '../data/recipes.js';
import { COLLECTIBLES } from '../data/missions.js';
import { ARCHETYPE_LIST } from '../data/customers.js';

/**
 * CollectionOverlay — the player's album. Shows unlocked recipes (incl. secret
 * ones with hints when still locked), collectibles earned from missions, and
 * which customer archetypes have been served. Collections have real meaning:
 * unlocked recipes expand what can be cooked/ordered; collectibles track
 * mastery; serving all archetypes contributes to progress.
 */
export default class CollectionOverlay extends Overlay {
  constructor(scene, ctx) {
    super(scene, { title: '📔 Album Koleksi', w: 880, h: 600 });
    this.ctx = ctx;
  }

  buildBody() {
    const { x, y, w } = this.frame;
    const gs = this.ctx.gs;

    // Section: Recipes
    this.body.add(label(this.scene, x + 32, y + 92, '🍳 Resep', { size: 20, bold: true, color: UITEXT.accent }));
    const allRecipeIds = Object.keys(RECIPES);
    let col = 0, row = 0;
    const cellW = 150, cellH = 92, gap = 14;
    const gridX = x + 32, gridY = y + 120;
    allRecipeIds.forEach((id) => {
      const r = RECIPES[id];
      const unlocked = gs.hasRecipe(id);
      const cx = gridX + col * (cellW + gap);
      const cy = gridY + row * (cellH + gap);
      const cardG = roundedPanel(this.scene, cx, cy, cellW, cellH, {
        radius: 12, fill: UI.panelSoft, stroke: unlocked ? UI.accent : UI.panel, strokeW: 2
      });
      this.body.add(cardG);
      this.body.add(label(this.scene, cx + cellW / 2, cy + 30, unlocked ? r.icon : '❓', { size: 32, origin: [0.5, 0.5] }));
      this.body.add(label(this.scene, cx + cellW / 2, cy + 68, unlocked ? r.name : (r.secret ? 'Rahasia' : '???'), {
        size: 13, color: unlocked ? UITEXT.light : UITEXT.dim, origin: [0.5, 0.5], align: 'center'
      }));
      col += 1; if (col >= 5) { col = 0; row += 1; }
    });

    const afterRecipesY = gridY + (row + 1) * (cellH + gap) + 10;

    // Secret recipe hints (if still locked)
    const lockedSecrets = SECRET_RECIPE_IDS.filter((id) => !gs.hasRecipe(id));
    let hintY = afterRecipesY;
    if (lockedSecrets.length) {
      lockedSecrets.forEach((id) => {
        this.body.add(label(this.scene, x + 32, hintY, `🔒 ${RECIPES[id].name}: ${RECIPES[id].unlockHint}`, {
          size: 14, color: UITEXT.dim
        }));
        hintY += 24;
      });
    }

    // Section: Collectibles
    const collY = hintY + 16;
    this.body.add(label(this.scene, x + 32, collY, '🏆 Koleksi', { size: 20, bold: true, color: UITEXT.accent }));
    const items = Object.values(COLLECTIBLES);
    items.forEach((it, i) => {
      const owned = gs.hasCollected('items', it.id);
      const ix = x + 32 + i * 150;
      this.body.add(label(this.scene, ix, collY + 40, owned ? it.icon : '▫️', { size: 30, origin: [0, 0.5] }));
      this.body.add(label(this.scene, ix + 40, collY + 40, owned ? it.name : '???', {
        size: 13, color: owned ? UITEXT.light : UITEXT.dim, wrap: 110
      }));
    });

    // Section: Customers met
    const custY = collY + 92;
    this.body.add(label(this.scene, x + 32, custY, '🧑 Pelanggan Dikenal', { size: 20, bold: true, color: UITEXT.accent }));
    ARCHETYPE_LIST.forEach((a, i) => {
      const met = gs.hasCollected('customers', a.id);
      const ix = x + 32 + (i % 7) * 118;
      const iy = custY + 36 + Math.floor(i / 7) * 54;
      this.body.add(label(this.scene, ix, iy, met ? a.emoji : '❔', { size: 26, origin: [0, 0.5] }));
      this.body.add(label(this.scene, ix + 34, iy, met ? a.name.split(' ')[0] : '???', {
        size: 12, color: met ? UITEXT.light : UITEXT.dim, origin: [0, 0.5]
      }));
    });
  }
}
