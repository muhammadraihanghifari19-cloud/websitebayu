import { UI, UITEXT } from '../config.js';

/**
 * UIKit — small helpers to build consistent panels and buttons across all
 * overlays. Keeps styling in one place for a cohesive, readable interface.
 *
 * All helpers return plain Phaser objects you add into your own container.
 */
const FONT = 'Trebuchet MS, Segoe UI, sans-serif';

export function roundedPanel(scene, x, y, w, h, {
  fill = UI.panel, alpha = 0.96, stroke = UI.stroke, radius = 18, strokeW = 4
} = {}) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, radius);
  if (strokeW > 0) {
    g.lineStyle(strokeW, stroke, 0.9);
    g.strokeRoundedRect(x, y, w, h, radius);
  }
  return g;
}

export function label(scene, x, y, text, {
  size = 20, color = UITEXT.light, bold = false, origin = [0, 0.5], wrap = 0, align = 'left'
} = {}) {
  const style = { fontFamily: FONT, fontSize: `${size}px`, color, align };
  if (bold) style.fontStyle = 'bold';
  if (wrap) style.wordWrap = { width: wrap };
  const t = scene.add.text(x, y, text, style).setOrigin(origin[0], origin[1]);
  return t;
}

/**
 * A clickable button built as a container with its own interactive zone.
 * The zone stops pointer propagation so it never leaks to scene-level input.
 *
 * returns { container, setLabel, setEnabled, setColors, zone }
 */
export function button(scene, x, y, text, onClick, {
  w = 200, h = 56, color = UI.accent, textColor = UITEXT.ink, size = 20, icon = ''
} = {}) {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const lbl = scene.add.text(0, 0, icon ? `${icon} ${text}` : text, {
    fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color: textColor
  }).setOrigin(0.5);
  c.add(bg); c.add(lbl);

  let enabled = true;
  let baseColor = color;

  const draw = (col) => {
    bg.clear();
    bg.fillStyle(0x000000, 0.28);
    bg.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 14);
    bg.fillStyle(col, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(3, UI.textLight, enabled ? 0.85 : 0.3);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  draw(baseColor);

  const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => { if (enabled) draw(shade(baseColor, -0.12)); });
  zone.on('pointerout', () => draw(enabled ? baseColor : desat(baseColor)));
  zone.on('pointerdown', (p, lx, ly, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!enabled) return;
    scene.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true });
    onClick && onClick();
  });

  return {
    container: c,
    zone,
    setLabel(t, newIcon) {
      lbl.setText((newIcon ?? icon) ? `${newIcon ?? icon} ${t}` : t);
    },
    setColors(col, txtCol) {
      baseColor = col;
      if (txtCol) lbl.setColor(txtCol);
      draw(enabled ? baseColor : desat(baseColor));
    },
    setEnabled(on) {
      enabled = on;
      if (on) zone.setInteractive({ useHandCursor: true });
      else zone.disableInteractive();
      draw(on ? baseColor : desat(baseColor));
      lbl.setAlpha(on ? 1 : 0.6);
    },
    destroy() { c.destroy(); zone.destroy(); }
  };
}

/** Darken/lighten a hex color number by ratio (-1..1). */
export function shade(hex, ratio) {
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * ratio)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

function desat(hex) {
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  const avg = (r + g + b) / 3;
  const mix = (v) => Math.round(v * 0.4 + avg * 0.6);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}
