/**
 * Ingredient catalog. Each has an id, display name, emoji icon, the restock
 * amount per purchase, and the coin price to restock.
 */
export const INGREDIENTS = {
  kopi:   { id: 'kopi',   name: 'Kopi',    icon: '🫘', restock: 10, price: 8 },
  susu:   { id: 'susu',   name: 'Susu',    icon: '🥛', restock: 8,  price: 7 },
  gula:   { id: 'gula',   name: 'Gula',    icon: '🧂', restock: 15, price: 5 },
  teh:    { id: 'teh',    name: 'Teh',     icon: '🍃', restock: 10, price: 6 },
  mie:    { id: 'mie',    name: 'Mie',     icon: '🍜', restock: 6,  price: 10 },
  telur:  { id: 'telur',  name: 'Telur',   icon: '🥚', restock: 6,  price: 9 },
  minyak: { id: 'minyak', name: 'Minyak',  icon: '🛢️', restock: 10, price: 8 },
  tepung: { id: 'tepung', name: 'Tepung',  icon: '🌾', restock: 8,  price: 7 },
  air:    { id: 'air',    name: 'Air',     icon: '💧', restock: 50, price: 1 }
};

export const INGREDIENT_LIST = Object.values(INGREDIENTS);
