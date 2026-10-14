// Central design resolution. The canvas scales to FIT inside any screen
// (laptop or phone) while keeping this logical coordinate space, so all
// positioning math below stays simple and consistent.
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Numeric colors (0xRRGGBB) used by non-pixel UI like the DialogueBox, banners,
// particles, and tints. Kept stable so existing systems keep working.
export const COLORS = {
  // Environment
  wallTop: 0x6b4a2f,
  wallBottom: 0x8a6240,
  floorFront: 0x5c3b22,
  floorBack: 0x74492a,
  woodDark: 0x5a3b23,
  woodMid: 0x7a512e,
  woodLight: 0x9c6b3c,
  // Accents
  cream: 0xf3d9a8,
  coffee: 0x4a2c17,
  coffeeFoam: 0xd9b382,
  green: 0x4a7c3a,
  greenDark: 0x335627,
  red: 0xc0453b,
  blue: 0x3f6fb0,
  orange: 0xe08a3c,
  yellow: 0xf2c14e,
  white: 0xfdf6e8,
  black: 0x241812,
  skin1: 0xe8b08a,
  skin2: 0xc98b5e,
  skin3: 0xf2c9a0
};

/**
 * UI palette — brighter, higher-contrast colors for overlays/HUD so the
 * interface reads clearly against the warm brown world. Hex numbers.
 */
export const UI = {
  panel: 0x241812,       // dark warm panel bg
  panelSoft: 0x3a2616,   // raised card
  stroke: 0xf3d9a8,      // cream border
  accent: 0xf2b23a,      // primary action (amber)
  accentDark: 0xd98f1f,
  good: 0x4fcf6a,        // success / affordable
  goodDark: 0x2f9e49,
  bad: 0xe25a4e,         // error / can't afford
  badDark: 0xb23a30,
  info: 0x4f9fe0,        // info / neutral action
  infoDark: 0x2f6fb0,
  textLight: 0xfdf6e8,
  textDim: 0xcdb89a,
  textInk: 0x241812,
  star: 0xffd94f
};

/** Hex-string versions for Phaser text color props. */
export const UITEXT = {
  light: '#fdf6e8',
  dim: '#cdb89a',
  ink: '#241812',
  accent: '#f2b23a',
  good: '#8ef08a',
  bad: '#ff8a7e',
  star: '#ffd94f'
};

/**
 * Cozy pixel-art palette (hex strings for the PixelArt engine).
 * A deliberately limited, warm set of hues with 2-3 shades each (dark / base /
 * light) so every sprite shares the same lighting and reads as one cohesive
 * art style. '8-char hex (#rrggbbaa) supported for soft shadows/glass.
 */
export const PX = {
  // Outlines & shadow
  ink: '#2b1d14', // near-black warm outline
  shadow: '#00000033',
  shadowSoft: '#0000001f',

  // Wood (walls, counters, tables, chairs)
  wood1: '#4a2f1b', // darkest
  wood2: '#6b4423',
  wood3: '#8a5a2d',
  wood4: '#a9743c', // lightest highlight
  woodGrain: '#3c2616',

  // Wall plaster
  wall1: '#8a6a4a',
  wall2: '#9c7a56',
  wall3: '#b08a63',

  // Floor tiles
  floor1: '#6b4a30',
  floor2: '#7d5636',
  floor3: '#8f633f',
  grout: '#4a3120',

  // Metal (stove, machine)
  metal1: '#3a3a44',
  metal2: '#55555f',
  metal3: '#7a7a86',
  metal4: '#9fa0ad',

  // Ceramic / cream
  cream1: '#d8b98a',
  cream2: '#efd7ab',
  cream3: '#fbeccb',
  white: '#fdf6e8',

  // Coffee
  coffee1: '#3a2110',
  coffee2: '#5a3418',
  coffee3: '#7a4a24',
  foam: '#d9b382',

  // Greens (plants, aprons, sign)
  green1: '#2f4f26',
  green2: '#436b31',
  green3: '#5c8a3f',
  green4: '#7faa52',

  // Accents
  red1: '#8f2f28',
  red2: '#c0453b',
  red3: '#e06a5f',
  blue1: '#2a4c82',
  blue2: '#3f6fb0',
  blue3: '#6a97d1',
  orange1: '#b85f22',
  orange2: '#e08a3c',
  orange3: '#f2b060',
  yellow1: '#d9a02e',
  yellow2: '#f2c14e',
  yellow3: '#ffe08a',
  flame1: '#ff6a2a',
  flame2: '#ffa83c',
  flame3: '#ffe15a',

  // Skin tones
  skinA1: '#c98b5e',
  skinA2: '#e8b08a',
  skinA3: '#f6cda6',
  skinB1: '#a66a3e',
  skinB2: '#c98b5e',
  skinB3: '#e3ab7e',
  skinC1: '#d99a66',
  skinC2: '#f2c9a0',
  skinC3: '#ffe3c4',

  // Hair
  hair1: '#1c140e',
  hair2: '#2e2016',
  hairBrown1: '#3a2414',
  hairBrown2: '#5a3a1e',

  // Glass / sky in window
  sky1: '#8fc7e8',
  sky2: '#b6ddf2',
  glass: '#aad4f0cc'
};
