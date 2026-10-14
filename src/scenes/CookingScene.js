import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UI, UITEXT } from '../config.js';
import { roundedPanel, label, button } from '../ui/UIKit.js';
import { qualityFromScore } from '../data/recipes.js';

/**
 * CookingScene
 * ------------
 * A modal mini-game overlay that walks the player through a recipe's steps.
 * It is launched with scene.launch('CookingScene', { recipe, speedMult,
 * toleranceBonus, onDone }) and calls onDone({ score, quality }) at the end.
 *
 * Step handlers are generic and data-driven so new recipes need no new code:
 *   select  -> tap the correct option (wrong lowers score)
 *   measure -> use -/+ to reach a target quantity, confirm
 *   timing  -> tap to stop a sweeping marker inside the good zone
 *   tap     -> tap rapidly N times before the timer runs out
 *   wait    -> hold the button; release near the target fill
 *
 * Works with mouse and touch (all interactions are pointer-based + big targets).
 */
export default class CookingScene extends Phaser.Scene {
  constructor() {
    super('CookingScene');
  }

  init(data) {
    this.recipe = data.recipe;
    this.speedMult = data.speedMult || 1;        // <1 = faster/easier timers
    this.toleranceBonus = data.toleranceBonus || 0;
    this.onDone = data.onDone || (() => {});
    this.reduceEffects = !!data.reduceEffects;
    this.stepIndex = 0;
    this.scores = [];
  }

  create() {
    // Dim backdrop that blocks the world beneath.
    const dim = this.add.graphics();
    dim.fillStyle(0x120b06, 0.78);
    dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT).setInteractive();

    // Header card
    roundedPanel(this, 140, 24, GAME_WIDTH - 280, 86, { radius: 20 });
    label(this, GAME_WIDTH / 2, 52, `${this.recipe.icon} Membuat ${this.recipe.name}`, {
      size: 30, bold: true, color: UITEXT.accent, origin: [0.5, 0.5]
    });
    this.stepText = label(this, GAME_WIDTH / 2, 86, '', {
      size: 19, color: UITEXT.dim, origin: [0.5, 0.5]
    });

    // Progress pips for steps
    this.pips = [];
    const total = this.recipe.steps.length;
    const pw = 26, gap = 10;
    const startX = GAME_WIDTH / 2 - ((pw + gap) * total - gap) / 2;
    for (let i = 0; i < total; i++) {
      const p = this.add.graphics();
      p.fillStyle(0xffffff, 0.25);
      p.fillRoundedRect(startX + i * (pw + gap), 118, pw, 8, 4);
      this.pips.push({ g: p, x: startX + i * (pw + gap) });
    }

    // Stage container where each step builds its widgets.
    this.stage = this.add.container(0, 0);

    this.runStep();
  }

  setPips() {
    this.pips.forEach((p, i) => {
      p.g.clear();
      const done = i < this.stepIndex;
      const cur = i === this.stepIndex;
      p.g.fillStyle(done ? UI.good : (cur ? UI.accent : 0xffffff), done || cur ? 1 : 0.25);
      p.g.fillRoundedRect(p.x, 118, 26, 8, 4);
    });
  }

  clearStage() {
    this.stage.removeAll(true);
    if (this.stepTimer) { this.stepTimer.remove(false); this.stepTimer = null; }
    if (this.sweepTween) { this.sweepTween.stop(); this.sweepTween = null; }
  }

  runStep() {
    this.clearStage();
    this.setPips();

    if (this.stepIndex >= this.recipe.steps.length) {
      this.finish();
      return;
    }
    const step = this.recipe.steps[this.stepIndex];
    this.stepText.setText(`Langkah ${this.stepIndex + 1}/${this.recipe.steps.length}: ${step.prompt}`);

    switch (step.type) {
      case 'select': this.buildSelect(step); break;
      case 'measure': this.buildMeasure(step); break;
      case 'timing': this.buildTiming(step); break;
      case 'tap': this.buildTap(step); break;
      case 'wait': this.buildWait(step); break;
      default: this.completeStep(0.5);
    }
  }

  completeStep(score) {
    this.scores.push(Phaser.Math.Clamp(score, 0, 1));
    // brief feedback flash
    this.flashResult(score);
    this.stepIndex += 1;
    this.time.delayedCall(this.reduceEffects ? 150 : 420, () => this.runStep());
  }

  flashResult(score) {
    const good = score >= 0.6;
    const txt = score >= 0.85 ? 'Sempurna!' : good ? 'Bagus!' : score >= 0.35 ? 'Hmm...' : 'Gagal!';
    const col = score >= 0.85 ? UITEXT.good : good ? UITEXT.light : UITEXT.bad;
    const f = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 180, txt, {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '34px', fontStyle: 'bold', color: col
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: f, y: f.y - 30, alpha: 0, duration: this.reduceEffects ? 300 : 700, onComplete: () => f.destroy() });
  }

  // --- SELECT ---------------------------------------------------------------
  buildSelect(step) {
    const opts = step.options;
    const n = opts.length;
    const cardW = 180, gap = 30;
    const totalW = n * cardW + (n - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + cardW / 2;
    const y = GAME_HEIGHT / 2 + 20;

    opts.forEach((opt, i) => {
      const x = startX + i * (cardW + gap);
      const card = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(UI.panelSoft, 1);
      g.fillRoundedRect(-cardW / 2, -110, cardW, 220, 18);
      g.lineStyle(3, UI.stroke, 0.5);
      g.strokeRoundedRect(-cardW / 2, -110, cardW, 220, 18);
      card.add(g);
      card.add(this.add.text(0, -40, opt.icon, { fontFamily: 'Segoe UI Emoji', fontSize: '72px' }).setOrigin(0.5));
      card.add(this.add.text(0, 60, opt.label, {
        fontFamily: 'Trebuchet MS, sans-serif', fontSize: '22px', fontStyle: 'bold', color: UITEXT.light
      }).setOrigin(0.5));
      this.stage.add(card);

      const zone = this.add.zone(x, y, cardW, 220).setInteractive({ useHandCursor: true });
      this.stage.add(zone);
      zone.on('pointerover', () => { g.clear(); g.fillStyle(UI.accentDark, 1); g.fillRoundedRect(-cardW / 2, -110, cardW, 220, 18); g.lineStyle(3, UI.accent, 1); g.strokeRoundedRect(-cardW / 2, -110, cardW, 220, 18); });
      zone.on('pointerout', () => { g.clear(); g.fillStyle(UI.panelSoft, 1); g.fillRoundedRect(-cardW / 2, -110, cardW, 220, 18); g.lineStyle(3, UI.stroke, 0.5); g.strokeRoundedRect(-cardW / 2, -110, cardW, 220, 18); });
      zone.on('pointerdown', (p, lx, ly, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        this.completeStep(opt.correct ? 1 : 0);
      });
    });
  }

  // --- MEASURE --------------------------------------------------------------
  buildMeasure(step) {
    let value = 0;
    const y = GAME_HEIGHT / 2 + 10;

    const valueText = this.add.text(GAME_WIDTH / 2, y - 60, '0', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '64px', fontStyle: 'bold', color: UITEXT.accent
    }).setOrigin(0.5);
    this.stage.add(valueText);
    const unit = this.add.text(GAME_WIDTH / 2, y + 2, step.unit || '', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '22px', color: UITEXT.dim
    }).setOrigin(0.5);
    this.stage.add(unit);

    // visual spoon pile
    const pile = this.add.text(GAME_WIDTH / 2, y + 56, '', { fontFamily: 'Segoe UI Emoji', fontSize: '30px' }).setOrigin(0.5);
    this.stage.add(pile);
    const refresh = () => { valueText.setText(String(value)); pile.setText('🥄'.repeat(value)); };

    const minus = button(this, GAME_WIDTH / 2 - 150, y - 40, '−', () => { value = Math.max(0, value - 1); refresh(); }, { w: 80, h: 80, size: 36, color: UI.info });
    const plus = button(this, GAME_WIDTH / 2 + 150, y - 40, '+', () => { value = Math.min(step.max || 6, value + 1); refresh(); }, { w: 80, h: 80, size: 36, color: UI.info });
    this.stage.add(minus.container); this.stage.add(minus.zone);
    this.stage.add(plus.container); this.stage.add(plus.zone);

    const confirm = button(this, GAME_WIDTH / 2, y + 150, 'Konfirmasi', () => {
      const diff = Math.abs(value - step.target);
      const tol = step.tolerance + 0; // tolerance in units
      // score: 1 if exact, scaling down to 0 at (tol+1) away
      const score = Phaser.Math.Clamp(1 - diff / (tol + 1), 0, 1);
      this.completeStep(score);
    }, { w: 220, h: 60, color: UI.good, textColor: UITEXT.ink });
    this.stage.add(confirm.container); this.stage.add(confirm.zone);

    refresh();
  }

  // --- TIMING ---------------------------------------------------------------
  buildTiming(step) {
    const barW = 620, barH = 40;
    const x = GAME_WIDTH / 2 - barW / 2;
    const y = GAME_HEIGHT / 2 + 20;

    const g = this.add.graphics();
    this.stage.add(g);
    // track
    g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, barW, barH, 10);
    // good zone (widened by toleranceBonus)
    const zs = Phaser.Math.Clamp(step.zoneStart - this.toleranceBonus, 0, 1);
    const ze = Phaser.Math.Clamp(step.zoneEnd + this.toleranceBonus, 0, 1);
    g.fillStyle(UI.good, 0.85);
    g.fillRoundedRect(x + zs * barW, y, (ze - zs) * barW, barH, 8);
    const center = (zs + ze) / 2;

    const marker = this.add.rectangle(x, y + barH / 2, 8, barH + 18, 0xffffff).setDepth(5);
    this.stage.add(marker);

    this.add.text(GAME_WIDTH / 2, y - 44, '👆 Ketuk saat penanda di zona hijau', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px', color: UITEXT.dim
    }).setOrigin(0.5).setDepth(5);
    // keep ref in stage for cleanup
    this.stage.add(this.add.existing(marker));

    let dir = 1;
    const speed = (step.speed || 1) / this.speedMult; // higher speedMult(>1 slower). We invert: faster stove -> smaller timers
    const effSpeed = (step.speed || 1) * this.speedMult; // speedMult<1 -> slower sweep (easier)
    this.sweepTween = this.tweens.addCounter({
      from: 0, to: 1, duration: 1100 / Math.max(0.3, (step.speed || 1)) ,
      yoyo: true, repeat: -1,
      onUpdate: (tw) => {
        const v = tw.getValue();
        marker.x = x + v * barW;
        marker._v = v;
      }
    });

    const stopZone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT).setInteractive({ useHandCursor: true });
    this.stage.add(stopZone);
    stopZone.on('pointerdown', (p, lx, ly, e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      const v = marker._v ?? 0;
      let score;
      if (v >= zs && v <= ze) {
        // closer to center = better
        const half = (ze - zs) / 2 || 0.01;
        score = 1 - Math.abs(v - center) / half * 0.3; // 0.7..1 inside zone
      } else {
        const dist = v < zs ? zs - v : v - ze;
        score = Phaser.Math.Clamp(0.5 - dist * 2, 0, 0.5);
      }
      if (this.sweepTween) this.sweepTween.stop();
      this.completeStep(score);
    });
  }

  // --- TAP ------------------------------------------------------------------
  buildTap(step) {
    let count = 0;
    const need = step.count;
    const y = GAME_HEIGHT / 2 + 10;
    const time = (step.time || 3000) * (this.reduceEffects ? 1 : 1);

    const counter = this.add.text(GAME_WIDTH / 2, y - 70, `0 / ${need}`, {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '44px', fontStyle: 'bold', color: UITEXT.accent
    }).setOrigin(0.5);
    this.stage.add(counter);

    const btn = button(this, GAME_WIDTH / 2, y + 20, 'KETUK!', () => {
      count += 1;
      counter.setText(`${Math.min(count, need)} / ${need}`);
      if (!this.reduceEffects) this.tweens.add({ targets: counter, scale: 1.2, duration: 60, yoyo: true });
      if (count >= need) {
        if (this.stepTimer) this.stepTimer.remove(false);
        const timeLeft = this.stepTimer ? 1 : 1;
        this.completeStep(1);
      }
    }, { w: 260, h: 110, size: 34, color: UI.accent, textColor: UITEXT.ink });
    this.stage.add(btn.container); this.stage.add(btn.zone);

    // time bar
    const barW = 460;
    const bx = GAME_WIDTH / 2 - barW / 2, by = y + 120;
    const barBg = this.add.graphics(); barBg.fillStyle(0x000000, 0.5); barBg.fillRoundedRect(bx, by, barW, 16, 8);
    this.stage.add(barBg);
    const barFill = this.add.graphics();
    this.stage.add(barFill);

    const started = this.time.now;
    this.stepTimer = this.time.addEvent({
      delay: time,
      callback: () => {
        // ran out of time -> partial score for progress made
        this.completeStep(Phaser.Math.Clamp(count / need, 0, 0.9) * 0.6);
      }
    });
    // update bar via a repeating event
    this.tapBarEvent = this.time.addEvent({
      delay: 30, loop: true, callback: () => {
        const t = Phaser.Math.Clamp((this.time.now - started) / time, 0, 1);
        barFill.clear();
        barFill.fillStyle(t > 0.75 ? UI.bad : UI.good, 1);
        barFill.fillRoundedRect(bx, by, barW * (1 - t), 16, 8);
        if (t >= 1 && this.tapBarEvent) { this.tapBarEvent.remove(false); this.tapBarEvent = null; }
      }
    });
  }

  // --- WAIT (hold-and-release) ---------------------------------------------
  buildWait(step) {
    const y = GAME_HEIGHT / 2 + 10;
    const ringR = 90;
    const ring = this.add.graphics();
    this.stage.add(ring);

    const info = this.add.text(GAME_WIDTH / 2, y - 150, '⬇️ Tahan tombol, lepas saat pas', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px', color: UITEXT.dim
    }).setOrigin(0.5);
    this.stage.add(info);

    // target band drawn on an arc gauge
    const targetA = step.target;    // 0..1
    const tol = step.tolerance + this.toleranceBonus;

    let fill = 0;
    let holding = false;
    let done = false;
    const rampPerSec = 0.42; // fills in ~2.4s

    const drawGauge = () => {
      ring.clear();
      // base ring
      ring.lineStyle(18, 0x000000, 0.5);
      ring.strokeCircle(GAME_WIDTH / 2, y, ringR);
      // good band
      const a0 = -Math.PI / 2 + (targetA - tol) * Math.PI * 2;
      const a1 = -Math.PI / 2 + (targetA + tol) * Math.PI * 2;
      ring.lineStyle(18, UI.good, 0.9);
      ring.beginPath();
      ring.arc(GAME_WIDTH / 2, y, ringR, a0, a1, false);
      ring.strokePath();
      // fill marker
      const am = -Math.PI / 2 + fill * Math.PI * 2;
      ring.lineStyle(6, 0xffffff, 1);
      ring.beginPath();
      ring.arc(GAME_WIDTH / 2, y, ringR, -Math.PI / 2, am, false);
      ring.strokePath();
      ring.fillStyle(0xffffff, 1);
      ring.fillCircle(GAME_WIDTH / 2 + Math.cos(am) * ringR, y + Math.sin(am) * ringR, 9);
    };
    drawGauge();

    const pct = this.add.text(GAME_WIDTH / 2, y, '', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '26px', fontStyle: 'bold', color: UITEXT.light
    }).setOrigin(0.5);
    this.stage.add(pct);

    const evaluate = () => {
      if (done) return; done = true;
      const diff = Math.abs(fill - targetA);
      const score = Phaser.Math.Clamp(1 - diff / (tol + 0.12), 0, 1);
      this.completeStep(score);
    };

    const holdBtn = button(this, GAME_WIDTH / 2, y + 160, 'TAHAN', () => {}, { w: 240, h: 70, color: UI.info, textColor: UITEXT.ink });
    this.stage.add(holdBtn.container); this.stage.add(holdBtn.zone);
    holdBtn.zone.on('pointerdown', () => { holding = true; });
    holdBtn.zone.on('pointerup', () => { if (holding) evaluate(); });
    holdBtn.zone.on('pointerout', () => { if (holding) evaluate(); });

    this.waitEvent = this.time.addEvent({
      delay: 30, loop: true, callback: () => {
        if (done) return;
        if (holding) fill = Math.min(1, fill + rampPerSec * 0.03);
        pct.setText(`${Math.round(fill * 100)}%`);
        drawGauge();
        if (fill >= 1) evaluate(); // overcooked -> auto evaluate (likely low score)
      }
    });
  }

  // --- Finish ---------------------------------------------------------------
  finish() {
    const avg = this.scores.length ? this.scores.reduce((a, b) => a + b, 0) / this.scores.length : 0;
    const quality = qualityFromScore(avg);

    // Result card
    roundedPanel(this, GAME_WIDTH / 2 - 240, GAME_HEIGHT / 2 - 150, 480, 300, { radius: 22 });
    label(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 108, `${this.recipe.icon} ${this.recipe.name}`, {
      size: 26, bold: true, color: UITEXT.light, origin: [0.5, 0.5]
    });
    // stars
    const starStr = '⭐'.repeat(quality.stars) + '☆'.repeat(3 - quality.stars);
    label(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 54, starStr, { size: 44, origin: [0.5, 0.5] });
    label(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 6, quality.label, {
      size: 30, bold: true, origin: [0.5, 0.5],
      color: quality.stars >= 2 ? UITEXT.good : quality.stars === 1 ? UITEXT.light : UITEXT.bad
    });
    label(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 48, `Skor racikan: ${Math.round(avg * 100)}%`, {
      size: 18, color: UITEXT.dim, origin: [0.5, 0.5]
    });

    const cont = button(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 108, 'Sajikan', () => {
      this.scene.stop();
      this.onDone({ score: avg, quality });
    }, { w: 240, h: 60, color: UI.good, textColor: UITEXT.ink });
    this.stage.add(cont.container); this.stage.add(cont.zone);
  }
}
