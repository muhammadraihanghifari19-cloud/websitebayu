/**
 * Recipe catalog — the heart of the cooking mini-game.
 *
 * Each recipe:
 *   id, name, icon, price (coins), ingredients (map id->amount consumed),
 *   secret (bool), steps[] (the interactive mini-game).
 *
 * Step types (handled generically by CookingScene):
 *   - select:  choose the correct option from a set
 *       { type:'select', prompt, options:[{id,label,icon,correct}], }
 *   - measure: drag/adjust a value to hit a target band
 *       { type:'measure', prompt, target, tolerance, unit, max }
 *   - timing:  stop a sweeping marker inside the good zone
 *       { type:'timing', prompt, zoneStart, zoneEnd, speed }  (0..1 scale)
 *   - tap:     tap/click N times quickly (e.g. stir / knead)
 *       { type:'tap', prompt, count, time }
 *   - wait:    hold/boil for a duration, stop near target (like timing but ramp)
 *       { type:'wait', prompt, target, tolerance }
 *
 * Each step returns a score 0..1; the recipe's average score drives quality.
 * This structure is deliberately data-driven so unlocking a new menu is just
 * adding an entry here + a stock/economy price.
 */

export const RECIPES = {
  kopi_hitam: {
    id: 'kopi_hitam',
    name: 'Kopi Hitam',
    icon: '☕',
    price: 5,
    ingredients: { kopi: 1, gula: 1, air: 1 },
    steps: [
      {
        type: 'select', prompt: 'Pilih wadah yang tepat',
        options: [
          { id: 'gelas', label: 'Gelas', icon: '🥛', correct: true },
          { id: 'mangkok', label: 'Mangkok', icon: '🥣', correct: false },
          { id: 'piring', label: 'Piring', icon: '🍽️', correct: false }
        ]
      },
      {
        type: 'select', prompt: 'Pilih bahan utama',
        options: [
          { id: 'kopi', label: 'Kopi', icon: '🫘', correct: true },
          { id: 'teh', label: 'Teh', icon: '🍃', correct: false },
          { id: 'susu', label: 'Susu', icon: '🥛', correct: false }
        ]
      },
      { type: 'measure', prompt: 'Takar gula (2 sendok)', target: 2, tolerance: 1, unit: 'sdm', max: 6 },
      { type: 'timing', prompt: 'Tuang air panas secukupnya', zoneStart: 0.55, zoneEnd: 0.8, speed: 0.9 },
      { type: 'tap', prompt: 'Aduk sampai larut!', count: 6, time: 3500 }
    ]
  },

  kopi_susu: {
    id: 'kopi_susu',
    name: 'Kopi Susu',
    icon: '🥛',
    price: 7,
    ingredients: { kopi: 1, susu: 1, gula: 1, air: 1 },
    steps: [
      {
        type: 'select', prompt: 'Pilih wadah yang tepat',
        options: [
          { id: 'gelas', label: 'Gelas', icon: '🥛', correct: true },
          { id: 'mangkok', label: 'Mangkok', icon: '🥣', correct: false },
          { id: 'botol', label: 'Botol', icon: '🍾', correct: false }
        ]
      },
      {
        type: 'select', prompt: 'Pilih bahan utama',
        options: [
          { id: 'kopi', label: 'Kopi', icon: '🫘', correct: true },
          { id: 'teh', label: 'Teh', icon: '🍃', correct: false },
          { id: 'coklat', label: 'Coklat', icon: '🍫', correct: false }
        ]
      },
      {
        type: 'select', prompt: 'Tambahkan apa?',
        options: [
          { id: 'susu', label: 'Susu', icon: '🥛', correct: true },
          { id: 'air', label: 'Air saja', icon: '💧', correct: false },
          { id: 'santan', label: 'Santan', icon: '🥥', correct: false }
        ]
      },
      { type: 'measure', prompt: 'Takar gula (2 sendok)', target: 2, tolerance: 1, unit: 'sdm', max: 6 },
      { type: 'timing', prompt: 'Tuang air panas', zoneStart: 0.5, zoneEnd: 0.78, speed: 1.0 },
      { type: 'tap', prompt: 'Aduk hingga tercampur!', count: 7, time: 3500 }
    ]
  },

  teh_manis: {
    id: 'teh_manis',
    name: 'Teh Manis',
    icon: '🍵',
    price: 4,
    ingredients: { teh: 1, gula: 1, air: 1 },
    steps: [
      {
        type: 'select', prompt: 'Pilih wadah',
        options: [
          { id: 'gelas', label: 'Gelas', icon: '🥛', correct: true },
          { id: 'mangkok', label: 'Mangkok', icon: '🥣', correct: false },
          { id: 'cangkir', label: 'Cangkir', icon: '☕', correct: true } // cangkir juga oke
        ]
      },
      {
        type: 'select', prompt: 'Pilih bahan utama',
        options: [
          { id: 'teh', label: 'Teh', icon: '🍃', correct: true },
          { id: 'kopi', label: 'Kopi', icon: '🫘', correct: false },
          { id: 'jahe', label: 'Jahe', icon: '🫚', correct: false }
        ]
      },
      { type: 'timing', prompt: 'Tuang air', zoneStart: 0.5, zoneEnd: 0.82, speed: 0.9 },
      { type: 'measure', prompt: 'Takar gula (3 sendok, manis!)', target: 3, tolerance: 1, unit: 'sdm', max: 6 }
    ]
  },

  indomie: {
    id: 'indomie',
    name: 'Indomie',
    icon: '🍜',
    price: 10,
    ingredients: { mie: 1, air: 1, telur: 1 },
    steps: [
      { type: 'timing', prompt: 'Didihkan air', zoneStart: 0.6, zoneEnd: 0.9, speed: 1.0 },
      {
        type: 'select', prompt: 'Masukkan mie',
        options: [
          { id: 'mie', label: 'Mie', icon: '🍜', correct: true },
          { id: 'nasi', label: 'Nasi', icon: '🍚', correct: false },
          { id: 'roti', label: 'Roti', icon: '🍞', correct: false }
        ]
      },
      { type: 'wait', prompt: 'Rebus mie — jangan kelamaan!', target: 0.6, tolerance: 0.18 },
      {
        type: 'select', prompt: 'Tambahkan bumbu',
        options: [
          { id: 'bumbu', label: 'Bumbu', icon: '🧂', correct: true },
          { id: 'gula', label: 'Gula', icon: '🍬', correct: false },
          { id: 'kecap', label: 'Kecap', icon: '🍶', correct: true } // kecap boleh
        ]
      },
      {
        type: 'select', prompt: 'Topping telur?',
        options: [
          { id: 'telur', label: 'Telur', icon: '🥚', correct: true },
          { id: 'none', label: 'Tanpa', icon: '🚫', correct: false }
        ]
      },
      { type: 'tap', prompt: 'Aduk rata & sajikan!', count: 5, time: 3000 }
    ]
  },

  gorengan: {
    id: 'gorengan',
    name: 'Gorengan',
    icon: '🍤',
    price: 6,
    ingredients: { tepung: 1, minyak: 1 },
    steps: [
      { type: 'tap', prompt: 'Uleni adonan!', count: 8, time: 3500 },
      { type: 'timing', prompt: 'Panaskan minyak (jangan gosong)', zoneStart: 0.6, zoneEnd: 0.85, speed: 1.1 },
      { type: 'wait', prompt: 'Goreng — angkat saat keemasan!', target: 0.55, tolerance: 0.15 },
      { type: 'timing', prompt: 'Tiriskan minyaknya', zoneStart: 0.45, zoneEnd: 0.8, speed: 0.95 }
    ]
  },

  // --- Secret recipes (unlocked via repeated interaction with customers) ---
  es_kopi_susu: {
    id: 'es_kopi_susu',
    name: 'Es Kopi Susu',
    icon: '🧋',
    price: 12,
    secret: true,
    unlockHint: 'Layani Tukang Ojek beberapa kali...',
    ingredients: { kopi: 1, susu: 1, gula: 1, air: 1 },
    steps: [
      {
        type: 'select', prompt: 'Pilih gelas besar',
        options: [
          { id: 'gelas', label: 'Gelas Besar', icon: '🥤', correct: true },
          { id: 'cangkir', label: 'Cangkir', icon: '☕', correct: false }
        ]
      },
      {
        type: 'select', prompt: 'Tambah es batu',
        options: [
          { id: 'es', label: 'Es Batu', icon: '🧊', correct: true },
          { id: 'air', label: 'Air biasa', icon: '💧', correct: false }
        ]
      },
      { type: 'measure', prompt: 'Takar gula aren (2)', target: 2, tolerance: 1, unit: 'sdm', max: 6 },
      { type: 'tap', prompt: 'Kocok hingga berbusa!', count: 8, time: 3500 }
    ]
  },

  teh_jahe: {
    id: 'teh_jahe',
    name: 'Teh Jahe',
    icon: '🫚',
    price: 9,
    secret: true,
    unlockHint: 'Dengarkan cerita Bapak Santai...',
    ingredients: { teh: 1, gula: 1, air: 1 },
    steps: [
      {
        type: 'select', prompt: 'Pilih bahan rempah',
        options: [
          { id: 'jahe', label: 'Jahe', icon: '🫚', correct: true },
          { id: 'kayu', label: 'Kayu Manis', icon: '🪵', correct: false }
        ]
      },
      { type: 'timing', prompt: 'Rebus jahe', zoneStart: 0.55, zoneEnd: 0.85, speed: 0.95 },
      { type: 'measure', prompt: 'Takar gula (2)', target: 2, tolerance: 1, unit: 'sdm', max: 6 }
    ]
  }
};

export const BASE_RECIPE_IDS = ['kopi_hitam', 'kopi_susu', 'teh_manis', 'indomie', 'gorengan'];
export const SECRET_RECIPE_IDS = ['es_kopi_susu', 'teh_jahe'];

export function getRecipe(id) {
  return RECIPES[id];
}

/** Quality label + multiplier from an average step score (0..1). */
export function qualityFromScore(score) {
  if (score >= 0.85) return { label: 'Sempurna', stars: 3, tipMult: 1.5, repDelta: 3, perfect: true };
  if (score >= 0.6) return { label: 'Enak', stars: 2, tipMult: 1.0, repDelta: 1, perfect: false };
  if (score >= 0.35) return { label: 'Lumayan', stars: 1, tipMult: 0.4, repDelta: 0, perfect: false };
  return { label: 'Gagal', stars: 0, tipMult: 0, repDelta: -3, perfect: false };
}
