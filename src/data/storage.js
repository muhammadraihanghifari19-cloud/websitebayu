/**
 * Simple local save/load for game progress using the browser's localStorage.
 * No backend or database — just a single JSON blob under one key.
 *
 * Saved shape:
 *   { v: 1, coins: number, purchased: { [upgradeId]: true } }
 *
 * Everything is defensive: if storage is unavailable (private mode, disabled)
 * or the data is corrupt, we fail quietly and fall back to a fresh game.
 */
const KEY = 'warkop_warbis_save_v1';
const VERSION = 1;

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

/** Load saved progress, or null if none/invalid. */
export function loadProgress() {
  if (!available()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;

    // Validate + sanitize.
    const coins = Number.isFinite(data.coins) && data.coins >= 0 ? Math.floor(data.coins) : 0;
    const purchased = {};
    if (data.purchased && typeof data.purchased === 'object') {
      for (const k of Object.keys(data.purchased)) {
        if (data.purchased[k]) purchased[k] = true;
      }
    }
    return { coins, purchased };
  } catch (e) {
    return null;
  }
}

/** Persist progress. Returns true on success. */
export function saveProgress({ coins, purchased }) {
  if (!available()) return false;
  try {
    const data = {
      v: VERSION,
      coins: Number.isFinite(coins) ? Math.floor(coins) : 0,
      purchased: purchased && typeof purchased === 'object' ? purchased : {}
    };
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

/** Clear saved progress (useful for a future "reset" button / debugging). */
export function clearProgress() {
  if (!available()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
}
