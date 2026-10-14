import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

/**
 * DialogueBox
 * A bottom-of-screen conversation panel with a speaker name tag, a typewriter
 * text effect, and a blinking "tap to continue" indicator.
 *
 * Usage:
 *   const dlg = new DialogueBox(scene);
 *   dlg.start(lines, onComplete);
 *   // lines = [{ speaker, text, color, onShow }, ...]
 *
 * A tap/click anywhere:
 *   - if text is still typing  -> instantly reveal the full line
 *   - if the line is complete  -> advance to the next line (or finish)
 */
export default class DialogueBox extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(1000);

    const marginX = 40;
    const boxH = 190;
    const boxW = GAME_WIDTH - marginX * 2;
    const boxX = marginX;
    const boxY = GAME_HEIGHT - boxH - 30;

    this.boxBounds = { x: boxX, y: boxY, w: boxW, h: boxH };

    // --- Panel background ---
    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.black, 0.82);
    panel.fillRoundedRect(boxX, boxY, boxW, boxH, 22);
    panel.lineStyle(4, COLORS.cream, 0.9);
    panel.strokeRoundedRect(boxX, boxY, boxW, boxH, 22);
    // Inner subtle border
    panel.lineStyle(2, COLORS.cream, 0.25);
    panel.strokeRoundedRect(boxX + 8, boxY + 8, boxW - 16, boxH - 16, 16);
    this.add(panel);

    // --- Speaker name tag ---
    this.nameTag = scene.add.graphics();
    this.add(this.nameTag);

    this.nameText = scene.add
      .text(boxX + 42, boxY - 2, '', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#241812'
      })
      .setOrigin(0, 0.5);
    this.add(this.nameText);

    // --- Body text (word-wrapped) ---
    this.bodyText = scene.add.text(boxX + 42, boxY + 46, '', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '27px',
      color: '#fdf6e8',
      lineSpacing: 8,
      wordWrap: { width: boxW - 84 }
    });
    this.add(this.bodyText);

    // --- "Tap to continue" indicator ---
    this.hint = scene.add
      .text(boxX + boxW - 32, boxY + boxH - 24, '▶ ketuk untuk lanjut', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: '18px',
        color: '#f3d9a8'
      })
      .setOrigin(1, 1);
    this.add(this.hint);

    scene.tweens.add({
      targets: this.hint,
      alpha: 0.25,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });

    // Entrance offset; hidden until start() is called.
    this.setVisible(false);
    this.baseY = 0;
    this.hiddenOffset = boxH + 60;

    this.lines = [];
    this.index = -1;
    this.typing = false;
    this.typeEvent = null;
    this.onComplete = null;
  }

  /** Begin a conversation. `lines` is an array of line objects. */
  start(lines, onComplete) {
    this.lines = lines || [];
    this.index = -1;
    this.onComplete = onComplete || null;

    this.setVisible(true);
    this.y = this.hiddenOffset;
    this.scene.tweens.add({
      targets: this,
      y: 0,
      duration: 300,
      ease: 'Back.out'
    });

    this.next();
  }

  /** Advance: finish typing if mid-line, otherwise show the next line. */
  advance() {
    if (!this.visible) return;
    if (this.typing) {
      this.finishTyping();
    } else {
      this.next();
    }
  }

  next() {
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.finish();
      return;
    }

    const line = this.lines[this.index];

    // Update name tag + its colored background pill.
    const speaker = line.speaker || '';
    const tagColor = line.color != null ? line.color : COLORS.cream;
    this.nameText.setText(speaker);

    const padX = 20;
    const tagW = this.nameText.width + padX * 2;
    const tagH = 40;
    const tagX = this.boxBounds.x + 22;
    const tagY = this.boxBounds.y - 22;

    this.nameTag.clear();
    this.nameTag.fillStyle(tagColor, 1);
    this.nameTag.fillRoundedRect(tagX, tagY, tagW, tagH, 12);
    this.nameTag.lineStyle(3, COLORS.white, 0.9);
    this.nameTag.strokeRoundedRect(tagX, tagY, tagW, tagH, 12);
    this.nameText.setX(tagX + padX);
    this.nameText.setY(tagY + tagH / 2);

    // Optional per-line callback (e.g. make a character bounce / move).
    if (typeof line.onShow === 'function') {
      line.onShow(this.index);
    }

    this.typeText(line.text || '');
  }

  typeText(fullText) {
    this.fullText = fullText;
    this.bodyText.setText('');
    this.typing = true;
    this.hint.setVisible(false);

    let i = 0;
    if (this.typeEvent) this.typeEvent.remove(false);
    this.typeEvent = this.scene.time.addEvent({
      delay: 22,
      repeat: fullText.length - 1,
      callback: () => {
        i += 1;
        this.bodyText.setText(fullText.slice(0, i));
        if (i >= fullText.length) {
          this.typing = false;
          this.hint.setVisible(true);
        }
      }
    });

    if (fullText.length === 0) {
      this.typing = false;
      this.hint.setVisible(true);
    }
  }

  finishTyping() {
    if (this.typeEvent) this.typeEvent.remove(false);
    this.bodyText.setText(this.fullText);
    this.typing = false;
    this.hint.setVisible(true);
  }

  finish() {
    this.scene.tweens.add({
      targets: this,
      y: this.hiddenOffset,
      duration: 250,
      ease: 'Back.in',
      onComplete: () => {
        this.setVisible(false);
        if (typeof this.onComplete === 'function') this.onComplete();
      }
    });
  }

  get isActive() {
    return this.visible;
  }
}
