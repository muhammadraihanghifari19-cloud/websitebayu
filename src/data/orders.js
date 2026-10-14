import { COLORS } from '../config.js';
import { RECIPES, BASE_RECIPE_IDS } from './recipes.js';
import { ARCHETYPES, pick } from './customers.js';

/**
 * Order/dialogue helpers. The recipe catalog now lives in recipes.js and the
 * upgrade catalog in shop.js; this module keeps the dialogue builders that the
 * scene uses, now archetype-aware (built-in Indonesian lines for each guest).
 *
 * MENU_ITEMS is kept as a lightweight view over RECIPES for any older code or
 * UI that lists the basic menu.
 */
export const MENU_ITEMS = BASE_RECIPE_IDS.map((id) => ({
  id,
  name: RECIPES[id].name,
  icon: RECIPES[id].icon,
  price: RECIPES[id].price
}));

/** Pick an order id from a customer's preferences, limited to unlocked recipes. */
export function pickOrderFor(archetype, isUnlocked) {
  const prefs = (archetype.prefers || BASE_RECIPE_IDS).filter((id) => isUnlocked(id));
  const pool = prefs.length ? prefs : BASE_RECIPE_IDS.filter((id) => isUnlocked(id));
  return pick(pool);
}

/** Greeting dialogue using the archetype's own voice + the chosen order. */
export function buildGreeting(archetype, recipe, emp, cust) {
  // Greet lines use a {pesanan} placeholder so the spoken order ALWAYS matches
  // the recipe that will actually be cooked (fixes order/dish mismatch).
  let greet = pick(archetype.greet);
  const orderName = recipe.name.toLowerCase();
  if (greet.includes('{pesanan}')) {
    greet = greet.replaceAll('{pesanan}', orderName);
  } else {
    // Safety net for any legacy line without a placeholder.
    greet = `${greet} (${recipe.name} satu ya, Mas.)`;
  }
  const lines = [
    {
      speaker: 'Karyawan',
      color: COLORS.green,
      text: 'Selamat datang di Warkop Warbis! Mau pesan apa?',
      onShow: () => emp.talkBounce()
    },
    {
      speaker: archetype.name,
      color: COLORS.blue,
      text: greet,
      onShow: () => cust.talkBounce()
    }
  ];
  // Sometimes the customer shares a little story (environmental storytelling).
  if (archetype.story && Math.random() < 0.5) {
    lines.push({
      speaker: archetype.name,
      color: COLORS.blue,
      text: pick(archetype.story),
      onShow: () => cust.talkBounce()
    });
  }
  lines.push({
    speaker: 'Karyawan',
    color: COLORS.green,
    text: `Siap! ${recipe.icon} ${recipe.name} segera dibuat ya.`,
    onShow: () => emp.talkBounce()
  });
  return lines;
}

/** Reaction dialogue after serving, based on satisfaction outcome. */
export function buildReaction(archetype, recipe, outcome, emp, cust) {
  // outcome: { happy:boolean, tip:number, quality:{label} }
  const line = outcome.happy ? pick(archetype.happy) : pick(archetype.angry);
  const lines = [
    {
      speaker: archetype.name,
      color: COLORS.blue,
      text: line,
      onShow: () => cust.talkBounce()
    }
  ];
  if (outcome.happy) {
    lines.push({
      speaker: 'Karyawan',
      color: COLORS.green,
      text: outcome.tip > 0
        ? `Terima kasih! (+${outcome.payment} koin, termasuk tip ${outcome.tip}) 😊`
        : 'Terima kasih, ditunggu lagi ya! 😊',
      onShow: () => emp.talkBounce()
    });
  } else {
    lines.push({
      speaker: 'Karyawan',
      color: COLORS.green,
      text: 'Maaf ya, lain kali kami perbaiki. 🙏',
      onShow: () => emp.talkBounce()
    });
  }
  return lines;
}

export { ARCHETYPES };
