import Phaser from 'phaser';

/**
 * PixelArt engine
 * ----------------
 * A tiny helper that turns a human-readable "pixel map" into a crisp Phaser
 * texture, so we can author real pixel-art sprites in code (one character in a
 * row = one pixel) instead of stacking vector circles/rectangles.
 *
 * A pixel map is an array of equal-length strings. Each character maps to a
 * color via a palette dictionary. A space (' ') or '.' means transparent.
 *
 * Example:
 *   const palette = { k: '#241812', s: '#e8b08a' };
 *   const rows = [
 *     ' kkk ',
 *     'ksssk',
 *     ' kkk '
 *   ];
 *   PixelArt.make(scene, 'face', rows, palette, 6); // scale 6 -> 30x18 px
 *
 * Textures are cached by key so repeated calls are cheap.
 */
const PixelArt = {
  /**
   * Build (or reuse) a texture from a pixel map.
   * @returns {string} the texture key
   */
  make(scene, key, rows, palette, pixelSize = 1) {
    if (scene.textures.exists(key)) return key;

    const h = rows.length;
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0);

    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === ' ' || ch === '.' || ch === undefined) continue;
        const col = palette[ch];
        if (!col) continue;

        const { color, alpha } = normalizeColor(col);
        g.fillStyle(color, alpha);
        g.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    g.generateTexture(key, w * pixelSize, h * pixelSize);
    g.destroy();
    return key;
  },

  /**
   * Convenience: build the texture (if needed) and return an Image game object
   * placed at (x, y) with its origin centered on the bottom (feet) by default.
   */
  sprite(scene, key, rows, palette, pixelSize, x, y, originX = 0.5, originY = 1) {
    this.make(scene, key, rows, palette, pixelSize);
    return scene.add.image(x, y, key).setOrigin(originX, originY);
  }
};

/** Accepts '#rrggbb', '#rrggbbaa', or a 0xRRGGBB number. */
function normalizeColor(col) {
  if (typeof col === 'number') return { color: col, alpha: 1 };
  let s = col.replace('#', '');
  let alpha = 1;
  if (s.length === 8) {
    alpha = parseInt(s.slice(6, 8), 16) / 255;
    s = s.slice(0, 6);
  }
  return { color: parseInt(s, 16), alpha };
}

export default PixelArt;
