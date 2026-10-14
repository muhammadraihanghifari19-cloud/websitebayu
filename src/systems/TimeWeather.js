import Phaser from 'phaser';

/**
 * TimeWeather
 * -----------
 * Simulated in-game clock cycling pagi -> siang -> sore -> malam, plus a simple
 * weather state (cerah/mendung/hujan) and a weekend flag. Purely simulated — no
 * real-world data. Durations are short so the player feels change quickly.
 *
 * Emits:
 *   'phase'   (phaseId)   when the time of day changes
 *   'weather' (weatherId) when weather changes
 *   'tick'    (progress 0..1 within current phase)
 */
export const PHASES = [
  { id: 'pagi',  name: 'Pagi',  icon: '🌅', tint: 0xffe3b0, spawnMult: 1.25 },
  { id: 'siang', name: 'Siang', icon: '☀️', tint: 0xffffff, spawnMult: 0.9 },
  { id: 'sore',  name: 'Sore',  icon: '🌇', tint: 0xffcf9a, spawnMult: 1.2 },
  { id: 'malam', name: 'Malam', icon: '🌙', tint: 0x9fb0e0, spawnMult: 1.0 }
];

export const WEATHERS = [
  { id: 'cerah',   name: 'Cerah',   icon: '☀️', spawnMult: 1.1,  biasHot: true },
  { id: 'mendung', name: 'Mendung', icon: '☁️', spawnMult: 1.0,  biasHot: false },
  { id: 'hujan',   name: 'Hujan',   icon: '🌧️', spawnMult: 0.8,  biasHot: false, biasWarm: true }
];

const PHASE_SECONDS = 45; // each time-of-day lasts ~45s — quick but comfortable

export default class TimeWeather extends Phaser.Events.EventEmitter {
  constructor(scene) {
    super();
    this.scene = scene;
    this.phaseIndex = 0;
    this.weatherIndex = 0;
    this.elapsed = 0;
    this.dayCount = 1;
    this.weekend = false;
    this.running = false;
  }

  start() {
    this.running = true;
    this.rollWeather();
    this.emit('phase', this.phase.id);
    this.emit('weather', this.weather.id);
  }

  stop() { this.running = false; }

  get phase() { return PHASES[this.phaseIndex]; }
  get weather() { return WEATHERS[this.weatherIndex]; }

  /** Called from scene update with delta ms. */
  update(deltaMs) {
    if (!this.running) return;
    this.elapsed += deltaMs / 1000;
    const prog = Phaser.Math.Clamp(this.elapsed / PHASE_SECONDS, 0, 1);
    this.emit('tick', prog);
    if (this.elapsed >= PHASE_SECONDS) {
      this.elapsed = 0;
      this.advancePhase();
    }
  }

  advancePhase() {
    this.phaseIndex = (this.phaseIndex + 1) % PHASES.length;
    if (this.phaseIndex === 0) {
      // new day
      this.dayCount += 1;
      this.weekend = this.dayCount % 7 === 6 || this.dayCount % 7 === 0;
    }
    // weather may change at each phase boundary
    if (Math.random() < 0.5) this.rollWeather();
    this.emit('phase', this.phase.id);
  }

  rollWeather() {
    const prev = this.weatherIndex;
    this.weatherIndex = Math.floor(Math.random() * WEATHERS.length);
    if (this.weatherIndex !== prev) this.emit('weather', this.weather.id);
  }

  /** Combined spawn rate multiplier from time + weather + weekend. */
  get spawnMultiplier() {
    let m = this.phase.spawnMult * this.weather.spawnMult;
    if (this.weekend) m *= 1.2;
    return m;
  }

  /**
   * Bias a chosen recipe id based on weather (hot drinks when raining, cold
   * when sunny). Returns possibly-adjusted recipe id. `isUnlocked` filters.
   */
  biasOrder(recipeId, isUnlocked) {
    if (this.weather.biasWarm && Math.random() < 0.5) {
      // rainy -> warm drinks
      const warm = ['teh_jahe', 'kopi_hitam', 'teh_manis', 'indomie'].filter(isUnlocked);
      if (warm.length) return warm[Math.floor(Math.random() * warm.length)];
    }
    if (this.weather.biasHot && this.phase.id !== 'malam' && Math.random() < 0.35) {
      const cold = ['es_kopi_susu'].filter(isUnlocked);
      if (cold.length) return cold[0];
    }
    return recipeId;
  }
}
