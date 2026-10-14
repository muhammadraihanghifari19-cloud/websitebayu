/**
 * Daily missions. A small pool; each day we pick a few. Progress is tracked in
 * GameState.stats and reconciled by MissionSystem. Rewards are real: coins,
 * recipe unlocks, or collectible items.
 */
export const MISSION_POOL = [
  {
    id: 'serve5',
    name: 'Layani 5 pelanggan',
    target: 5,
    metric: 'served',
    reward: { coins: 15 }
  },
  {
    id: 'serve10',
    name: 'Layani 10 pelanggan',
    target: 10,
    metric: 'served',
    reward: { coins: 30, item: 'medali_sibuk' }
  },
  {
    id: 'sell3kopi',
    name: 'Jual 3 kopi (hitam/susu)',
    target: 3,
    metric: 'coffeeSold',
    reward: { coins: 18 }
  },
  {
    id: 'perfect3',
    name: 'Buat 3 pesanan Sempurna',
    target: 3,
    metric: 'perfect',
    reward: { coins: 20, item: 'piala_barista' }
  },
  {
    id: 'serve_siswa',
    name: 'Layani 3 Siswa Buru-buru',
    target: 3,
    metric: 'servedSiswa',
    reward: { coins: 16 }
  },
  {
    id: 'gorengan3',
    name: 'Goreng 3 Gorengan',
    target: 3,
    metric: 'gorenganSold',
    reward: { coins: 14, item: 'spatula_emas' }
  }
];

/** Collectible items that missions can grant (display in album). */
export const COLLECTIBLES = {
  medali_sibuk: { id: 'medali_sibuk', name: 'Medali Hari Sibuk', icon: '🎖️', desc: 'Melayani 10 pelanggan dalam sehari.' },
  piala_barista: { id: 'piala_barista', name: 'Piala Barista', icon: '🏆', desc: 'Tiga racikan sempurna.' },
  spatula_emas: { id: 'spatula_emas', name: 'Spatula Emas', icon: '🥄', desc: 'Ahli gorengan sejati.' },
  bintang_warkop: { id: 'bintang_warkop', name: 'Bintang Warkop', icon: '⭐', desc: 'Reputasi warkop mencapai puncak.' }
};

/** Pick N distinct missions for a given day (seeded by date string). */
export function rollDailyMissions(dateStr, count = 3) {
  // simple deterministic shuffle from date so a day keeps the same set
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
  const pool = [...MISSION_POOL];
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const idx = seed % pool.length;
    const m = pool.splice(idx, 1)[0];
    out.push({ id: m.id, progress: 0, done: false, claimed: false });
  }
  return out;
}

export function getMissionDef(id) {
  return MISSION_POOL.find((m) => m.id === id);
}
