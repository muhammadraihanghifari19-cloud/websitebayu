import Phaser from 'phaser';
import { loadState, saveState } from '../data/storage.js';

/**
 * GameState
 * ---------
 * Single source of truth for persistent progress. Wraps the saved state and
 * exposes guarded mutations (coins, stock, upgrades, recipes, collection,
 * reputation, stats). Auto-persists on change and emits events so UI can react.
 *
 * It extends Phaser.Events.EventEmitter, emitting:
 *   'coins'      (coins)
 *   'reputation' (reputation)
 *   'stock'      (ingredientId, amount)
 *   'upgrade'    (upgradeId)
 *   'recipe'     (recipeId)
 *   'collection' (type, id)
 *   'change'     ()                // generic "something saved"
 *
 * Challenge mode uses a sandbox: enterChallenge()/exitChallenge() so timed
 * runs never corrupt the main (Harian) save.
 */
export default class GameState extends Phaser.Events.EventEmitter {
  constructor() {
    super();
    this.data = loadState();
    this._sandbox = null; // when set, we are in Challenge mode
    this._saveQueued = false;
  }

  // The live object we read/write (sandbox during challenge).
  get s() {
    return this._sandbox || this.data;
  }

  get inChallenge() {
    return !!this._sandbox;
  }

  // --- Persistence --------------------------------------------------------
  persist() {
    if (this._sandbox) return; // never persist challenge sandbox
    // debounce slightly to avoid thrashing localStorage
    if (this._saveQueued) return;
    this._saveQueued = true;
    setTimeout(() => {
      this._saveQueued = false;
      saveState(this.data);
      this.emit('change');
    }, 0);
  }

  // --- Coins --------------------------------------------------------------
  get coins() { return this.s.coins; }

  addCoins(n) {
    this.s.coins = Math.max(0, Math.floor(this.s.coins + n));
    this.emit('coins', this.s.coins);
    this.persist();
    return this.s.coins;
  }

  canAfford(n) { return this.s.coins >= n; }

  /** Spend coins only if affordable. Returns true on success. */
  spend(n) {
    if (n < 0) return false;
    if (this.s.coins < n) return false;
    this.s.coins -= n;
    this.emit('coins', this.s.coins);
    this.persist();
    return true;
  }

  // --- Reputation (0..100) ------------------------------------------------
  get reputation() { return this.s.reputation; }

  addReputation(n) {
    this.s.reputation = Phaser.Math.Clamp(Math.round(this.s.reputation + n), 0, 100);
    this.emit('reputation', this.s.reputation);
    this.persist();
    return this.s.reputation;
  }

  // --- Stock / ingredients ------------------------------------------------
  getStock(id) { return this.s.stock[id] ?? 0; }

  hasIngredients(map) {
    for (const id of Object.keys(map || {})) {
      if ((this.s.stock[id] ?? 0) < map[id]) return false;
    }
    return true;
  }

  consume(map) {
    if (!this.hasIngredients(map)) return false;
    for (const id of Object.keys(map)) {
      this.s.stock[id] = (this.s.stock[id] ?? 0) - map[id];
      this.emit('stock', id, this.s.stock[id]);
    }
    this.persist();
    return true;
  }

  addStock(id, amount) {
    this.s.stock[id] = (this.s.stock[id] ?? 0) + amount;
    this.emit('stock', id, this.s.stock[id]);
    this.persist();
    return this.s.stock[id];
  }

  // --- Upgrades (one-time) ------------------------------------------------
  hasUpgrade(id) { return !!this.s.upgrades[id]; }

  buyUpgrade(id, price) {
    if (this.s.upgrades[id]) return false;      // already owned
    if (this.s.coins < price) return false;     // can't afford
    this.s.coins -= price;
    this.s.upgrades[id] = true;
    this.emit('coins', this.s.coins);
    this.emit('upgrade', id);
    this.persist();
    return true;
  }

  // --- Decorations (one-time, visual + attractiveness) --------------------
  hasDecoration(id) { return !!this.s.decorations[id]; }

  buyDecoration(id, price) {
    if (this.s.decorations[id]) return false;
    if (this.s.coins < price) return false;
    this.s.coins -= price;
    this.s.decorations[id] = true;
    this.emit('coins', this.s.coins);
    this.emit('upgrade', id);
    this.persist();
    return true;
  }

  // --- Recipes ------------------------------------------------------------
  hasRecipe(id) { return !!this.s.recipes[id]; }

  unlockRecipe(id) {
    if (this.s.recipes[id]) return false;
    this.s.recipes[id] = true;
    this.s.collection.recipes[id] = true;
    this.emit('recipe', id);
    this.emit('collection', 'recipes', id);
    this.persist();
    return true;
  }

  /** Buy a recipe from the shop (one-time coin cost). */
  buyRecipe(id, price) {
    if (this.s.recipes[id]) return false;
    if (this.s.coins < price) return false;
    this.s.coins -= price;
    this.emit('coins', this.s.coins);
    this.unlockRecipe(id);
    return true;
  }

  // --- Collection ---------------------------------------------------------
  collect(type, id) {
    if (!this.s.collection[type]) this.s.collection[type] = {};
    if (this.s.collection[type][id]) return false;
    this.s.collection[type][id] = true;
    this.emit('collection', type, id);
    this.persist();
    return true;
  }

  hasCollected(type, id) {
    return !!(this.s.collection[type] && this.s.collection[type][id]);
  }

  // --- Stats (feed missions + secret unlocks) -----------------------------
  recordServe(menuId, archetypeId, perfect) {
    const st = this.s.stats;
    st.served += 1;
    if (perfect) st.perfectServes += 1;
    st.byMenu[menuId] = (st.byMenu[menuId] || 0) + 1;
    if (archetypeId) {
      st.byCustomer[archetypeId] = (st.byCustomer[archetypeId] || 0) + 1;
      this.collect('customers', archetypeId);
    }
    this.persist();
  }

  // --- Challenge sandbox --------------------------------------------------
  /** Enter challenge mode with a temporary coin/stock sandbox. */
  enterChallenge(seed = {}) {
    // Deep clone current data so challenge can mutate freely.
    this._sandbox = JSON.parse(JSON.stringify(this.data));
    if (Number.isFinite(seed.coins)) this._sandbox.coins = seed.coins;
    // generous stock so the challenge is about speed, not shopping
    for (const k of Object.keys(this._sandbox.stock)) this._sandbox.stock[k] = 999;
  }

  /** Leave challenge; main save is untouched. Optionally grant a reward. */
  exitChallenge(rewardCoins = 0) {
    this._sandbox = null;
    if (rewardCoins > 0) this.addCoins(rewardCoins);
  }

  // --- Missions passthrough (managed by MissionSystem) --------------------
  get missions() { return this.s.missions; }
  setMissions(m) { this.s.missions = m; this.persist(); }

  // --- Settings -----------------------------------------------------------
  get settings() { return this.s.settings; }
  setSetting(key, value) {
    this.s.settings[key] = value;
    this.persist();
  }
}
