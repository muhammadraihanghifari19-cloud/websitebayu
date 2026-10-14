/**
 * Shop catalog — multi-category warkop development.
 * Categories: peralatan (equipment), furnitur, dekorasi, menu (recipes).
 *
 * Each item: id, name, desc, price, icon, and an `effect` describing what it
 * changes in gameplay/visuals. The scene reads `effect` to apply real changes.
 *
 * IMPORTANT: the legacy "stove" id is preserved so an already-purchased Kompor
 * Premium stays owned after migration.
 */
export const SHOP = {
  peralatan: [
    {
      id: 'stove', // legacy id — do NOT rename
      name: 'Kompor Premium',
      desc: 'Kompor stainless api biru. Memasak terasa lebih mantap.',
      price: 20,
      icon: '🔥',
      effect: { type: 'stoveSkin', speedMult: 0.85 } // 15% faster cook timers
    },
    {
      id: 'ketel',
      name: 'Ketel Cepat',
      desc: 'Ketel listrik, air panas lebih cepat siap.',
      price: 35,
      icon: '🫖',
      effect: { type: 'cookSpeed', speedMult: 0.85 }
    },
    {
      id: 'penggorengan',
      name: 'Penggorengan Anti Lengket',
      desc: 'Gorengan lebih gampang, toleransi waktu lebih longgar.',
      price: 45,
      icon: '🍳',
      effect: { type: 'friedEasier', toleranceBonus: 0.06 }
    }
  ],

  furnitur: [
    {
      id: 'meja_tambahan',
      name: 'Meja Tambahan',
      desc: 'Menambah kapasitas tempat duduk pelanggan.',
      price: 30,
      icon: '🪑',
      effect: { type: 'capacity', seats: 1 }
    },
    {
      id: 'kursi_empuk',
      name: 'Kursi Empuk',
      desc: 'Pelanggan lebih betah — kesabaran sedikit bertambah.',
      price: 40,
      icon: '💺',
      effect: { type: 'patienceBonus', seconds: 6 }
    }
  ],

  dekorasi: [
    {
      id: 'lampu_hangat',
      name: 'Lampu Hangat',
      desc: 'Cahaya tungsten hangat. Warkop makin cozy (+daya tarik).',
      price: 25,
      icon: '💡',
      effect: { type: 'ambient', attract: 3, tint: 0xffd79a }
    },
    {
      id: 'poster',
      name: 'Poster Dinding',
      desc: 'Poster retro di dinding. Menambah daya tarik.',
      price: 18,
      icon: '🖼️',
      effect: { type: 'wallDecor', attract: 2 }
    },
    {
      id: 'jam_dinding',
      name: 'Jam Dinding',
      desc: 'Jam klasik. Pelanggan merasa warkop terurus (+daya tarik).',
      price: 15,
      icon: '🕐',
      effect: { type: 'wallDecor', attract: 2 }
    },
    {
      id: 'cat_dinding',
      name: 'Cat Dinding Baru',
      desc: 'Dinding dicat ulang lebih segar. Suasana lebih cerah.',
      price: 50,
      icon: '🎨',
      effect: { type: 'repaint', attract: 5 }
    }
  ],

  menu: [
    {
      id: 'es_kopi_susu',
      name: 'Resep: Es Kopi Susu',
      desc: 'Buka menu Es Kopi Susu (bisa juga didapat gratis dari langganan).',
      price: 40,
      icon: '🧋',
      effect: { type: 'recipe', recipeId: 'es_kopi_susu' },
      requiresReputation: 25
    },
    {
      id: 'teh_jahe',
      name: 'Resep: Teh Jahe',
      desc: 'Buka menu Teh Jahe yang menghangatkan.',
      price: 30,
      icon: '🫚',
      effect: { type: 'recipe', recipeId: 'teh_jahe' },
      requiresReputation: 15
    }
  ]
};

export const SHOP_CATEGORIES = [
  { id: 'peralatan', name: 'Peralatan', icon: '🔧' },
  { id: 'furnitur', name: 'Furnitur', icon: '🪑' },
  { id: 'dekorasi', name: 'Dekorasi', icon: '🎨' },
  { id: 'menu', name: 'Menu Baru', icon: '📜' }
];

/** Find a shop item by id across all categories. */
export function findShopItem(id) {
  for (const cat of Object.keys(SHOP)) {
    const found = SHOP[cat].find((it) => it.id === id);
    if (found) return { ...found, category: cat };
  }
  return null;
}

/** Items that are one-time purchases (everything except... all are one-time). */
export function isMenuItem(item) {
  return item && item.effect && item.effect.type === 'recipe';
}
