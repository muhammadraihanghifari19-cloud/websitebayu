import Phaser from 'phaser';
import { rollDailyMissions, getMissionDef, COLLECTIBLES } from '../data/missions.js';

/**
 * MissionSystem
 * -------------
 * Owns the active daily missions. Rolls a fresh set per in-game day, tracks
 * progress from gameplay events (served, perfect, menu/customer specific), and
 * grants real rewards (coins / recipe / collectible) on claim.
 *
 * Emits:
 *   'update'   ()                when any mission progresses
 *   'complete' (missionDef)      when a mission becomes claimable
 *   'reward'   ({coins,item,recipe}) when a reward is granted
 */
export default class MissionSystem extends Phaser.Events.EventEmitter {
  constructor(gameState) {
    super();
    this.gs = gameState;
    this.ensureToday();
  }

  /** Day key: in-game day number is enough; use real date too for determinism. */
  dayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  ensureToday() {
    const existing = this.gs.missions;
    const today = this.dayKey();
    if (!existing || existing.date !== today) {
      this.gs.setMissions({ date: today, list: rollDailyMissions(today, 3) });
    }
  }

  get list() {
    return (this.gs.missions && this.gs.missions.list) || [];
  }

  /** Called by the scene after a successful serve with context. */
  onServe({ menuId, archetypeId, perfect }) {
    let changed = false;
    for (const m of this.list) {
      if (m.done) continue;
      const def = getMissionDef(m.id);
      if (!def) continue;
      let inc = 0;
      switch (def.metric) {
        case 'served': inc = 1; break;
        case 'perfect': inc = perfect ? 1 : 0; break;
        case 'coffeeSold': inc = (menuId === 'kopi_hitam' || menuId === 'kopi_susu') ? 1 : 0; break;
        case 'gorenganSold': inc = menuId === 'gorengan' ? 1 : 0; break;
        case 'servedSiswa': inc = archetypeId === 'siswa' ? 1 : 0; break;
        default: inc = 0;
      }
      if (inc > 0) {
        m.progress = Math.min(def.target, m.progress + inc);
        if (m.progress >= def.target) m.done = true;
        changed = true;
      }
    }
    if (changed) {
      this.gs.setMissions(this.gs.missions);
      this.emit('update');
    }
  }

  /** Claim a completed mission reward. Returns the reward or null. */
  claim(missionId) {
    const m = this.list.find((x) => x.id === missionId);
    if (!m || !m.done || m.claimed) return null;
    const def = getMissionDef(missionId);
    if (!def) return null;

    const reward = def.reward || {};
    if (reward.coins) this.gs.addCoins(reward.coins);
    if (reward.recipe) this.gs.unlockRecipe(reward.recipe);
    if (reward.item) this.gs.collect('items', reward.item);

    m.claimed = true;
    this.gs.setMissions(this.gs.missions);
    this.emit('reward', reward);
    this.emit('update');
    return reward;
  }

  /** Convenience: readable progress text for UI. */
  describe(m) {
    const def = getMissionDef(m.id);
    if (!def) return { name: '???', progress: 0, target: 1, done: false, claimed: false, reward: '' };
    const rewardBits = [];
    if (def.reward.coins) rewardBits.push(`${def.reward.coins} 🪙`);
    if (def.reward.recipe) rewardBits.push('resep baru');
    if (def.reward.item && COLLECTIBLES[def.reward.item]) rewardBits.push(COLLECTIBLES[def.reward.item].icon + ' koleksi');
    return {
      name: def.name,
      progress: m.progress,
      target: def.target,
      done: m.done,
      claimed: m.claimed,
      reward: rewardBits.join(' + ')
    };
  }
}
