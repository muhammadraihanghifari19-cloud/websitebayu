/**
 * Customer archetypes. Each has a personality that affects:
 *   - patience (seconds before they get impatient while waiting to be served)
 *   - prefers  (recipe ids they tend to order)
 *   - tipBase  (base tip in coins on a good serve)
 *   - look     (Character palette keys)
 *   - lines    (dialogue variations — natural, casual Indonesian)
 *   - times    (which times of day they can appear: pagi/siang/sore/malam)
 *   - special  (true = time-gated special guest)
 *   - secretRecipe (serving them repeatedly can unlock this recipe)
 *
 * Dialogue is built-in for now (Gemini integration comes later).
 */
export const ARCHETYPES = {
  siswa: {
    id: 'siswa',
    name: 'Siswa Buru-buru',
    emoji: '🎒',
    patience: 16,
    tipBase: 1,
    prefers: ['teh_manis', 'gorengan', 'kopi_hitam'],
    look: { skinKey: 'a', shirtKey: 'blue', hairKey: 'black' },
    times: ['pagi', 'sore'],
    greet: [
      'Mas, buru-buru nih mau ke sekolah! Teh manis satu cepet ya!',
      'Cepet ya Mas, udah telat nih. Pesen gorengan dong.',
      'Mas, yang cepet aja, bentar lagi bel masuk!'
    ],
    happy: [
      'Wah cepet! Makasih Mas, aku lanjut ya!',
      'Mantap, pas banget. Dadah Mas!'
    ],
    angry: [
      'Yah kelamaan, nanti aku telat beneran...',
      'Udah ah, keburu telat. Lain kali ya Mas.'
    ],
    story: [
      'Hari ini ada ulangan Matematika, doain ya Mas!',
      'Semalem begadang ngerjain tugas, ngantuk banget.'
    ]
  },

  bapak: {
    id: 'bapak',
    name: 'Bapak Santai',
    emoji: '🧓',
    patience: 40,
    tipBase: 3,
    prefers: ['kopi_hitam', 'kopi_susu', 'teh_manis'],
    look: { skinKey: 'b', shirtKey: 'green', hairKey: 'black' },
    times: ['pagi', 'siang', 'malam'],
    greet: [
      'Kopi hitam satu ya, Mas. Yang pahit, biar melek.',
      'Seperti biasa Mas, kopi hitam. Santai aja nggak buru-buru.',
      'Kopi dulu Mas, sambil baca koran.'
    ],
    happy: [
      'Nah, ini baru kopi. Mantap betul Mas.',
      'Pas di lidah. Besok ngopi sini lagi ah.'
    ],
    angry: [
      'Aduh Mas, kopinya kurang pas nih.',
      'Hmm, lain kali lebih diperhatikan ya Mas.'
    ],
    story: [
      'Dulu warung depan rame, sekarang sepi. Zaman berubah ya.',
      'Anak saya udah kerja di kota sekarang, jarang pulang.',
      'Jahe hangat itu paling enak kalau lagi masuk angin, Mas.'
    ],
    secretRecipe: 'teh_jahe'
  },

  ojek: {
    id: 'ojek',
    name: 'Tukang Ojek',
    emoji: '🏍️',
    patience: 24,
    tipBase: 2,
    prefers: ['kopi_susu', 'kopi_hitam', 'indomie'],
    look: { skinKey: 'c', shirtKey: 'red', hairKey: 'brown' },
    times: ['siang', 'sore', 'malam'],
    greet: [
      'Istirahat dulu Mas, kopi susu satu. Capek narik seharian.',
      'Kopi susu ya Mas, buat ganjel sebelum narik lagi.',
      'Mas, yang anget-anget. Kopi susu deh.'
    ],
    happy: [
      'Nikmat Mas, tenaga balik lagi nih!',
      'Sip, lanjut narik dulu. Makasih Mas!'
    ],
    angry: [
      'Yah Mas, orderan nunggu nih kelamaan.',
      'Buru-buru Mas, penumpang udah nungguin.'
    ],
    story: [
      'Tadi ada penumpang baik, dikasih tip gede. Rezeki!',
      'Bensin naik lagi Mas, makin susah cari untung.',
      'Enaknya pas ujan gini kopi susu dingin, Mas. Es kopi susu top!'
    ],
    secretRecipe: 'es_kopi_susu'
  },

  tetangga: {
    id: 'tetangga',
    name: 'Tetangga Cerewet',
    emoji: '🧕',
    patience: 50,
    tipBase: 2,
    prefers: ['teh_manis', 'kopi_susu', 'gorengan'],
    look: { skinKey: 'a', shirtKey: 'yellow', hairKey: 'brown' },
    times: ['pagi', 'siang', 'sore'],
    greet: [
      'Eh Mas! Teh manis ya. Eh denger-denger warung sebelah tutup lho.',
      'Mas, gorengan masih anget? Sekalian teh manisnya ya.',
      'Assalamualaikum Mas, pesen teh manis. Rame terus nih warungnya.'
    ],
    happy: [
      'Enak Mas! Nanti aku ceritain ke yang lain ya, biar rame.',
      'Mantap, langganan deh aku. Dadah Mas!'
    ],
    angry: [
      'Aduh Mas lama amat, keburu sore nih ngobrolnya.',
      'Yah, kurang sip Mas. Tapi nggak apa-apa deh.'
    ],
    story: [
      'Si Bu RT mau ngadain arisan minggu depan di sini aja kali ya.',
      'Anak Bu Siti udah mau nikah lho, cepet ya waktu.',
      'Katanya mau ada pasar malam, rame nih kampung kita.'
    ]
  },

  anak: {
    id: 'anak',
    name: 'Anak Sekolah',
    emoji: '🧒',
    patience: 20,
    tipBase: 1,
    prefers: ['gorengan', 'teh_manis'],
    look: { skinKey: 'c', shirtKey: 'orange', hairKey: 'black' },
    times: ['siang', 'sore'],
    greet: [
      'Bang, jajan gorengan dong! Yang anget ya.',
      'Bang, teh manis sama gorengan. Uang jajan nih!',
      'Beli gorengan bang, laper abis main bola.'
    ],
    happy: [
      'Hehe enak bang! Besok jajan sini lagi!',
      'Makasih bang! Mantul!'
    ],
    angry: [
      'Yah bang lama, temen udah pada pulang.',
      'Kok gini sih bang... yauda deh.'
    ],
    story: [
      'Tadi di sekolah main bola, tim aku menang bang!',
      'Besok libur, mau main seharian hehe.'
    ]
  },

  // --- Time-gated special guests ---
  polisi: {
    id: 'polisi',
    name: 'Pak Polisi',
    emoji: '👮',
    patience: 30,
    tipBase: 6,
    prefers: ['kopi_hitam', 'kopi_susu'],
    look: { skinKey: 'b', shirtKey: 'blue', hairKey: 'black' },
    times: ['pagi'],
    special: true,
    greet: [
      'Selamat pagi! Kopi hitam satu ya, sebelum apel pagi.',
      'Pagi Mas, kopi hitam. Dinas pagi butuh energi nih.'
    ],
    happy: [
      'Mantap, kopinya bikin semangat. Terima kasih, Mas!',
      'Enak. Warung aman, saya patroli dulu ya.'
    ],
    angry: [
      'Wah lama ya Mas, saya ada apel sebentar lagi.',
      'Lain kali lebih sigap ya Mas.'
    ],
    story: [
      'Jaga kamtibmas itu penting, Mas. Warung rukun kampung aman.',
      'Pagi-pagi gini jalanan masih sepi, enak patrolinya.'
    ]
  },

  rombongan: {
    id: 'rombongan',
    name: 'Rombongan Teman',
    emoji: '👥',
    patience: 45,
    tipBase: 5,
    prefers: ['kopi_susu', 'indomie', 'gorengan'],
    look: { skinKey: 'c', shirtKey: 'green', hairKey: 'brown' },
    times: ['sore', 'malam'],
    special: true,
    greet: [
      'Mas, kita nongkrong di sini ya! Kopi susu sama Indomie-nya mantap!',
      'Rame-rame nih Mas, pesen kopi susu dulu buat ngobrol.'
    ],
    happy: [
      'Wih enak Mas! Betah nih nongkrong di sini.',
      'Top Mas! Nanti kita ajak temen-temen lagi.'
    ],
    angry: [
      'Yah Mas lama, keburu bubar nih.',
      'Agak lama ya Mas, tapi tempatnya asik sih.'
    ],
    story: [
      'Lagi reunian nih Mas, udah lama nggak kumpul.',
      'Enak ya ngopi sambil ngobrol pas malam gini.'
    ]
  }
};

export const ARCHETYPE_LIST = Object.values(ARCHETYPES);
export const NORMAL_ARCHETYPES = ARCHETYPE_LIST.filter((a) => !a.special);
export const SPECIAL_ARCHETYPES = ARCHETYPE_LIST.filter((a) => a.special);

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Choose an archetype appropriate for the current time of day. Specials have a
 * small chance to appear in their time window; otherwise a normal regular.
 */
export function pickArchetypeForTime(timeId, { allowSpecial = true } = {}) {
  const specials = SPECIAL_ARCHETYPES.filter((a) => a.times.includes(timeId));
  if (allowSpecial && specials.length && Math.random() < 0.22) {
    return pick(specials);
  }
  const normals = NORMAL_ARCHETYPES.filter((a) => a.times.includes(timeId));
  return pick(normals.length ? normals : NORMAL_ARCHETYPES);
}
