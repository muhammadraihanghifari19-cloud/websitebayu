import Phaser from 'phaser';
import { PX } from '../config.js';
import PixelArt from '../engine/PixelArt.js';

/**
 * Character
 * ---------
 * A detailed cozy pixel-art person rendered from a shared pixel-map template.
 * The template uses palette "slots" (letters) that get swapped per-character
 * for skin, shirt, hair and an optional apron, so everyone shares the same
 * proportions and lighting for a consistent art style.
 *
 * Public API is unchanged from the original vector version:
 *   new Character(scene, { x, y, skin, shirt, hair, apron, scale, facing })
 *   .setFacing(dir)   -> flips horizontally
 *   .talkBounce()     -> squash/stretch when speaking
 *
 * `skin`, `shirt`, `hair`, `apron` accept either the old numeric COLORS values
 * or a palette variant key below. We map them to 3-shade ramps internally.
 */

// 3-shade ramps keyed by a friendly name. Each entry: [dark, base, light].
const SKIN_RAMPS = {
  a: [PX.skinA1, PX.skinA2, PX.skinA3],
  b: [PX.skinB1, PX.skinB2, PX.skinB3],
  c: [PX.skinC1, PX.skinC2, PX.skinC3]
};
const HAIR_RAMPS = {
  black: [PX.hair1, PX.hair2],
  brown: [PX.hairBrown1, PX.hairBrown2]
};
const SHIRT_RAMPS = {
  green: [PX.green1, PX.green2, PX.green3],
  blue: [PX.blue1, PX.blue2, PX.blue3],
  red: [PX.red1, PX.red2, PX.red3],
  orange: [PX.orange1, PX.orange2, PX.orange3],
  yellow: [PX.yellow1, PX.yellow2, PX.yellow3]
};
const APRON_RAMPS = {
  cream: [PX.cream1, PX.cream2, PX.cream3],
  red: [PX.red1, PX.red2, PX.red3],
  green: [PX.green1, PX.green2, PX.green3]
};

// Pixel map template. Every row is EXACTLY 22 columns wide.
// Legend:
//   . transparent   o ink outline
//   H hair dark     h hair light
//   S skin dark     s skin base    k skin light
//   e eye pupil     w eye white     m mouth
//   T shirt dark    t shirt base   l shirt light
//   A apron dark    a apron base   b apron light   p apron pocket seam
//   P pants dark    n pants base
//   X shoe
const BODY = [
  '.......oooooo.........', // 0  hair top
  '.....ooHHHHHHoo.......', // 1
  '....oHHHHHHHHhHHo.....', // 2
  '....oHHHHHHHHhHHo.....', // 3
  '....oHhhHHHHHHHHo.....', // 4
  '....oSssssssssSHo.....', // 5  forehead
  '....oSskssssskSSo.....', // 6
  '....oSsssssssssSo.....', // 7
  '....oSweSssweSSSo.....', // 8  eyes
  '....oSsssssssssSo.....', // 9
  '....oSskmmmmkssSo.....', // 10 mouth
  '....oSsssmmsssSSo.....', // 11
  '.....oSssssssSo.......', // 12 chin
  '......ooSssSoo........', // 13 neck
  '.....ooTTTTTTooo......', // 14 collar
  '....oTTtttttttTTo.....', // 15
  '...oTTttttttttttTTo...', // 16 shoulders
  '..oSTttttllltttttTSo..', // 17 arms (S skin edge)
  '..oksTtttlllltttTsko..', // 18 upper arms + hands hint
  '..okSTtttllltttttSko..', // 19
  '..okSTtttttttttttSko..', // 20 hands (k)
  '...oTtttttttttttttTo..', // 21
  '...oTtttttttttttttTo..', // 22
  '...oTtttttttttttttTo..', // 23
  '...oTtttttttttttttTo..', // 24 waist
  '...oPPPPPPPPPPPPPPPo..', // 25 belt/pants top
  '...oPnnnnnPPnnnnnnPo..', // 26 legs
  '...oPnnnnnooonnnnnPo..', // 27 leg gap begins
  '...oPnnnnoooonnnnPo...', // 28
  '...oPnnno....onnnPo...', // 29
  '...oPnnno....onnnPo...', // 30
  '...oXXXXo....oXXXXo...', // 31 shoes
  '...oXXXXo....oXXXXo...', // 32
  '....oooo......oooo....'  // 33 shoe soles
];

// Apron overlay rows (keyed by BODY row index). Characters here replace the
// shirt pixels (t/T/l) in that row; '.' leaves the underlying body untouched.
// Only the employee receives this overlay.
const APRON = [
  { y: 15, s: '......aaaaaaaaaa......' },
  { y: 16, s: '....baaaaaaaaaaaab....' },
  { y: 17, s: '....baaaaaaaaaaaaab...' },
  { y: 18, s: '.....baaaaaaaaaaab....' },
  { y: 19, s: '.....baaaapppaaaab....' },
  { y: 20, s: '.....baaaapppaaaab....' },
  { y: 21, s: '.....baaaaaaaaaaab....' },
  { y: 22, s: '.....baaaaaaaaaaab....' },
  { y: 23, s: '.....baaaaaaaaaaab....' },
  { y: 24, s: '......baaaaaaaaab.....' }
];

const PIXEL = 4; // on-screen size of each sprite pixel

export default class Character extends Phaser.GameObjects.Container {
  constructor(scene, options = {}) {
    super(scene, options.x || 0, options.y || 0);

    const {
      skinKey = 'a',
      shirtKey = 'blue',
      hairKey = 'black',
      apronKey = null,
      scale = 1,
      facing = 1
    } = Character.resolveKeys(options);

    this.facingDir = facing;

    const palette = Character.buildPalette(skinKey, shirtKey, hairKey, apronKey);
    const rows = Character.composeRows(apronKey);

    const texKey = `char_${skinKey}_${shirtKey}_${hairKey}_${apronKey || 'none'}`;
    PixelArt.make(scene, texKey, rows, palette, PIXEL);

    // Soft contact shadow on the floor for grounding.
    const shadow = scene.add.ellipse(0, 6, 56, 16, 0x000000, 0.22);
    this.add(shadow);

    const sprite = scene.add.image(0, 0, texKey).setOrigin(0.5, 1);
    this.add(sprite);
    this.sprite = sprite;

    this.setScale(scale);
    this.setFacing(facing);
    scene.add.existing(this);

    // Gentle idle bob so the scene feels alive.
    this.idleTween = scene.tweens.add({
      targets: this,
      y: this.y - 4,
      duration: Phaser.Math.Between(1100, 1500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  /**
   * Map legacy numeric options (COLORS.*) OR friendly keys to palette keys.
   * Accepts either options.skin (number/string) or options.skinKey, etc.
   */
  static resolveKeys(o) {
    const skinKey = o.skinKey || numToKey(o.skin, SKIN_TO_KEY, 'a');
    const shirtKey = o.shirtKey || numToKey(o.shirt, SHIRT_TO_KEY, 'blue');
    const hairKey = o.hairKey || numToKey(o.hair, HAIR_TO_KEY, 'black');
    let apronKey = o.apronKey;
    if (apronKey === undefined) {
      apronKey = o.apron != null ? numToKey(o.apron, APRON_TO_KEY, 'cream') : null;
    }
    return {
      skinKey,
      shirtKey,
      hairKey,
      apronKey,
      scale: o.scale != null ? o.scale : 1,
      facing: o.facing != null ? o.facing : 1
    };
  }

  static buildPalette(skinKey, shirtKey, hairKey, apronKey) {
    const [S, s, k] = SKIN_RAMPS[skinKey] || SKIN_RAMPS.a;
    const [H, h] = HAIR_RAMPS[hairKey] || HAIR_RAMPS.black;
    const [T, t, l] = SHIRT_RAMPS[shirtKey] || SHIRT_RAMPS.blue;
    const apron = APRON_RAMPS[apronKey] || APRON_RAMPS.cream;
    const [A, a, b] = apron;

    return {
      o: PX.ink,
      H, h,
      S, s, k,
      e: PX.ink, // pupils / eye outline
      w: PX.white, // eye whites
      m: PX.coffee1, // mouth
      T, t, l,
      A, a, b,
      p: PX.ink, // apron pocket seam
      P: '#2a1a10', // pants dark
      n: '#3a2518', // pants base
      X: PX.ink // shoes
    };
  }

  static composeRows(apronKey) {
    if (!apronKey) return BODY;
    // Overlay apron rows onto a copy of BODY.
    const rows = BODY.slice();
    APRON.forEach(({ y, s }) => {
      if (y < 0 || y >= rows.length) return;
      const base = rows[y].split('');
      for (let x = 0; x < s.length; x++) {
        const c = s[x];
        if (c !== '.' && base[x] !== undefined && base[x] !== 'o') {
          base[x] = c;
        }
      }
      rows[y] = base.join('');
    });
    return rows;
  }

  setFacing(dir) {
    this.facingDir = dir;
    this.scaleX = Math.abs(this.scaleX) * (dir >= 0 ? 1 : -1);
    return this;
  }

  /** Small squash-and-stretch bounce, used when a character "speaks". */
  talkBounce() {
    this.scene.tweens.add({
      targets: this,
      scaleY: Math.abs(this.scaleY) * 1.08,
      duration: 120,
      yoyo: true,
      ease: 'Quad.out'
    });
  }
}

// --- Legacy numeric COLORS -> friendly key maps (keeps old call sites working) ---
const SKIN_TO_KEY = { 0xe8b08a: 'a', 0xc98b5e: 'b', 0xf2c9a0: 'c' };
const SHIRT_TO_KEY = {
  0x4a7c3a: 'green',
  0x3f6fb0: 'blue',
  0xc0453b: 'red',
  0xe08a3c: 'orange',
  0xf2c14e: 'yellow'
};
const HAIR_TO_KEY = { 0x241812: 'black', 0x5a3b23: 'brown' };
const APRON_TO_KEY = { 0xf3d9a8: 'cream', 0xc0453b: 'red', 0x4a7c3a: 'green' };

function numToKey(val, table, fallback) {
  if (val == null) return fallback;
  if (typeof val === 'string') return val; // already a key
  return table[val] || fallback;
}
