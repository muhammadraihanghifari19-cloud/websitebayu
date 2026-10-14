import { COLORS } from '../config.js';

/**
 * Simple order catalog for the service loop.
 * Each order has an id, display name, emoji icon (lightweight, no new assets),
 * price in coins, and a short "prep" verb used in status text.
 *
 * Keep this list small on purpose — the goal is a readable, playable loop.
 */
export const MENU_ITEMS = [
  { id: 'kopi_hitam', name: 'Kopi Hitam', icon: '☕', price: 5, prep: 'Menyeduh kopi hitam' },
  { id: 'kopi_susu', name: 'Kopi Susu', icon: '🥛', price: 7, prep: 'Menyeduh kopi susu' },
  { id: 'teh_manis', name: 'Teh Manis', icon: '🍵', price: 4, prep: 'Menyeduh teh manis' },
  { id: 'indomie', name: 'Indomie', icon: '🍜', price: 10, prep: 'Memasak Indomie' },
  { id: 'gorengan', name: 'Gorengan', icon: '🍤', price: 6, prep: 'Menggoreng gorengan' }
];

/** Pick a random menu item. */
export function randomOrder() {
  return MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)];
}

/**
 * A few customer "looks" so each guest feels different. These map to the
 * Character palette keys already supported by Character.js.
 */
export const CUSTOMER_LOOKS = [
  { skinKey: 'a', shirtKey: 'blue', hairKey: 'black' },
  { skinKey: 'c', shirtKey: 'red', hairKey: 'brown' },
  { skinKey: 'b', shirtKey: 'orange', hairKey: 'black' },
  { skinKey: 'a', shirtKey: 'yellow', hairKey: 'brown' },
  { skinKey: 'c', shirtKey: 'green', hairKey: 'black' }
];

export function randomLook() {
  return CUSTOMER_LOOKS[Math.floor(Math.random() * CUSTOMER_LOOKS.length)];
}

/**
 * Build the greeting conversation for a given order. Returns an array of
 * DialogueBox line objects. `emp` and `cust` are the Character instances so we
 * can trigger their talk bounce.
 */
export function buildOrderDialogue(order, emp, cust) {
  const greetings = [
    `Wah, lagi pengin ${order.name.toLowerCase()} nih. Pesan satu ya, Mas.`,
    `Mas, saya pesan ${order.name.toLowerCase()} satu dong.`,
    `Boleh pesan ${order.name.toLowerCase()}? Lagi laper nih.`
  ];
  const pick = greetings[Math.floor(Math.random() * greetings.length)];

  return [
    {
      speaker: 'Karyawan',
      color: COLORS.green,
      text: 'Selamat datang di Warkop Warbis! Mau pesan apa?',
      onShow: () => emp.talkBounce()
    },
    {
      speaker: 'Pelanggan',
      color: COLORS.blue,
      text: pick,
      onShow: () => cust.talkBounce()
    },
    {
      speaker: 'Karyawan',
      color: COLORS.green,
      text: `Siap! ${order.icon} ${order.name} satu. Ditunggu ya, langsung saya siapkan.`,
      onShow: () => emp.talkBounce()
    }
  ];
}

/** The thank-you / payment line shown after serving. */
export function buildPaymentDialogue(order, emp, cust) {
  return [
    {
      speaker: 'Pelanggan',
      color: COLORS.blue,
      text: `Mantap, ${order.name.toLowerCase()}nya enak! Ini uangnya ${order.price} koin ya. Terima kasih!`,
      onShow: () => cust.talkBounce()
    },
    {
      speaker: 'Karyawan',
      color: COLORS.green,
      text: 'Terima kasih, ditunggu kedatangannya lagi! 😊',
      onShow: () => emp.talkBounce()
    }
  ];
}

/**
 * Upgrades catalog. For this stage there is exactly one: a better stove.
 * Keep this data-only so the scene owns how each effect is applied.
 */
export const UPGRADES = {
  stove: {
    id: 'stove',
    name: 'Kompor Premium',
    desc: 'Kompor stainless dengan api biru. Dapur jadi lebih keren!',
    price: 20
  }
};
