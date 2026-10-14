/**
 * Versioned local save/load for Warkop Warbis using localStorage.
 * No backend/database. A single JSON blob under one key, with a schema version
 * and a simple migration chain so older saves keep working.
 *
 * IMPORTANT: v1 saves (shape { v:1, coins, purchased }) must keep the player's
 * coins and purchased Kompor Premium. migrateToLatest() handles that.
 *
 * The structure is intentionally flat and serializable so it can later be
 * mirrored to Supabase with minimal changes.
 */
const KEY = 'warkop_warbis_save_v1'; // keep the SAME key so old saves are found
const LATEST_VERSION = 2;

function available() {
  try {
    const t = '__wk_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return true;
  } catch (e) {
    return false;
  }
}

/** The default, fresh v2 state. */
export function defaultState() {
  return {
    v: LATEST_VERSION,
    coins: 0,
    reputation: 10, // 0..100-ish, starts modest
    // Upgrades: id -> true. Keeps legacy "stove" id intact.
    upgrades: {},
    // Decorations currently applied: id -> true
    decorations: {},
    // Ingredient stock. Numbers are "servings worth".
    stock: {
      kopi: 10,
      susu: 8,
      gula: 15,
      teh: 10,
      air: 999, // water is effectively unlimited but tracked for recipes
      mie: 6,
      telur: 6,
      minyak: 10,
      tepung: 8
    },
    // Recipes the player has unlocked (base menu always unlocked).
    recipes: {
      kopi_hitam: true,
      kopi_susu: true,
      teh_manis: true,
      indomie: true,
      gorengan: true
    },
    // Collection album: things the player has permanently discovered.
    collection: {
      recipes: {},   // secret recipe id -> true
      items: {},     // collectible/display item id -> true
      customers: {}  // archetype id -> served at least once
    },
    // Counters that feed missions / secret unlocks.
    stats: {
      served: 0,
      perfectServes: 0,
      byMenu: {},        // menuId -> count
      byCustomer: {},    // archetypeId -> count served
      daysPlayed: 0
    },
    // Daily missions state: { date, list:[{id,progress,done,claimed}] }
    missions: null,
    settings: {
      reduceEffects: false
    },
    // Loose feature flags for future use.
    flags: {}
  };
}

/** Deep-ish merge of saved partial onto defaults (defaults win for missing). */
function mergeState(base, incoming) {
  const out = { ...base };
  for (const k of Object.keys(incoming || {})) {
    const v = incoming[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = mergeState(base[k], v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Migrate any older save shape up to the latest version.
 * v1: { v:1, coins:number, purchased:{ [id]:true } }
 *   -> coins carried over; purchased mapped into upgrades (incl. "stove").
 */
function migrateToLatest(data) {
  let d = data;

  // Treat missing version as v1 (that was the only prior shape).
  const version = Number.isFinite(d.v) ? d.v : 1;

  if (version <= 1) {
    const base = defaultState();
    base.coins = Number.isFinite(d.coins) && d.coins >= 0 ? Math.floor(d.coins) : 0;
    // Carry legacy purchases into the new upgrades map (preserves Kompor Premium).
    if (d.purchased && typeof d.purchased === 'object') {
      for (const id of Object.keys(d.purchased)) {
        if (d.purchased[id]) base.upgrades[id] = true;
      }
    }
    d = base;
  }

  // Ensure shape is complete even if a partial v2 was stored.
  d = mergeState(defaultState(), d);
  d.v = LATEST_VERSION;
  return d;
}

/** Load + migrate saved progress, or a fresh default state if none/invalid. */
export function loadState() {
  if (!available()) return defaultState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return defaultState();
    return migrateToLatest(data);
  } catch (e) {
    return defaultState();
  }
}

/** Persist the full game state. Returns true on success. */
export function saveState(state) {
  if (!available()) return false;
  try {
    const safe = mergeState(defaultState(), state || {});
    safe.v = LATEST_VERSION;
    window.localStorage.setItem(KEY, JSON.stringify(safe));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearState() {
  if (!available()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Backward-compatible helpers (older code imported these names). Kept so the
// migration never risks breaking an existing import during the refactor.
// ---------------------------------------------------------------------------
export function loadProgress() {
  const s = loadState();
  return { coins: s.coins, purchased: s.upgrades };
}
export function saveProgress({ coins, purchased }) {
  const s = loadState();
  s.coins = coins;
  s.upgrades = { ...s.upgrades, ...(purchased || {}) };
  return saveState(s);
}
export function clearProgress() {
  clearState();
}
