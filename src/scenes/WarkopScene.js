import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, PX } from '../config.js';
import Character from '../objects/Character.js';
import DialogueBox from '../objects/DialogueBox.js';
import HUD from '../objects/HUD.js';
import UpgradePanel from '../objects/UpgradePanel.js';
import PixelArt from '../engine/PixelArt.js';
import { randomOrder, randomLook, buildOrderDialogue, buildPaymentDialogue, UPGRADES } from '../data/orders.js';
import { loadProgress, saveProgress } from '../data/storage.js';

/**
 * WarkopScene
 * The main playable area, now rendered in a cozy pixel-art style. The
 * environment (wall, floor, window, menu, sign, lights) and props (cashier,
 * stove, tables, chairs, plants) are built from pixel-map textures via the
 * PixelArt engine, so everything shares one cohesive look.
 *
 * The conversation flow is unchanged: a customer walks in, a tap/click driven
 * dialogue plays, then the customer walks to a table.
 */
export default class WarkopScene extends Phaser.Scene {
  constructor() {
    super('WarkopScene');
  }

  create() {
    this.buildTextures();

    this.buildEnvironment();
    this.buildProps();
    this.buildCharacters();

    this.dialogue = new DialogueBox(this);
    this.hud = new HUD(this);
    this.showTitleBanner();

    // --- Load saved progress (coins + purchased upgrades) ---
    const saved = loadProgress();

    // --- Game state for the service loop ---
    this.coins = saved ? saved.coins : 0;
    this.hud.setCoins(this.coins);

    // --- Upgrades ---
    this.purchased = saved ? saved.purchased : {}; // id -> true once bought
    this.upgradePanel = new UpgradePanel(this, UPGRADES.stove).setContext({
      getCoins: () => this.coins,
      isPurchased: (item) => !!this.purchased[item.id],
      onBuy: (item) => this.buyUpgrade(item)
    });

    // Reflect already-purchased upgrades in the world immediately.
    if (this.purchased.stove) this.applyStoveUpgrade(true);
    this.phase = 'idle';         // idle | arriving | ordering | preparing | serving | paying | leaving
    this.currentOrder = null;    // the active order object
    this.customer = null;        // the current customer Character

    // Advance dialogue on any pointer tap/click anywhere on screen.
    this.input.on('pointerdown', () => {
      if (this.dialogue.isActive) {
        this.dialogue.advance();
      }
    });

    // Start the first service cycle.
    this.hud.setStatus('Menunggu pelanggan...', '🙂');
    this.time.delayedCall(1200, () => this.startCycle());
  }

  // ===========================================================================
  // Texture authoring — all pixel maps are registered once here.
  // ===========================================================================
  buildTextures() {
    // --- Wood plank tile for walls (16x16, seamless horizontal planks) ---
    PixelArt.make(this, 'wood_plank', [
      'gggggggggggggggg',
      'WWWWWWWWWWWWWWWW',
      'WwwwwwwwwwwwwwwW',
      'WwwwwwwwwwwwwwwW',
      'WwwwwwwwwwwwwwwW',
      'WWWWWWWWWWWWWWWW',
      'gggggggggggggggg',
      'WWWWWWWWWWWWWWWW',
      'WwwwwwwwwwwwwwwW',
      'WwwwwwwwwwwwwwwW',
      'WwwwwwwwwwwwwwwW',
      'WWWWWWWWWWWWWWWW',
      'gggggggggggggggg',
      'WWWWWWWWWWWWWWWW',
      'WwwwwwwwwwwwwwwW',
      'WwwwwwwwwwwwwwwW'
    ], { w: PX.wood3, W: PX.wood2, g: PX.woodGrain }, 1);

    // --- Floor tile (16x16) with grout lines + subtle speckle ---
    PixelArt.make(this, 'floor_tile', [
      'gggggggggggggggg',
      'gFFFFFFFFFFFFFFg',
      'gFFFFFFFFFFFFFFg',
      'gFFFFhFFFFFFFFFg',
      'gFFFFFFFFFFFhFFg',
      'gFFFFFFFFFFFFFFg',
      'gFFhFFFFFFFFFFFg',
      'gFFFFFFFFFFFFFFg',
      'gggggggggggggggg',
      'gFFFFFFFFhFFFFFg',
      'gFFFFFFFFFFFFFFg',
      'gFhFFFFFFFFFFFFg',
      'gFFFFFFFFFFFhFFg',
      'gFFFFFFFhFFFFFFg',
      'gFFFFFFFFFFFFFFg',
      'gggggggggggggggg'
    ], { F: PX.floor2, h: PX.floor3, g: PX.grout }, 1);

    // --- Cashier counter (front face) ---
    PixelArt.make(this, 'counter', buildCounter(), COUNTER_PAL, 5);

    // --- Cash register ---
    PixelArt.make(this, 'register', REGISTER, REGISTER_PAL, 4);

    // --- Espresso / coffee machine ---
    PixelArt.make(this, 'coffee_machine', MACHINE, MACHINE_PAL, 4);

    // --- Stove (level 1 basic, level 2 upgraded) ---
    PixelArt.make(this, 'stove', STOVE, STOVE_PAL, 5);
    PixelArt.make(this, 'stove2', STOVE2, STOVE2_PAL, 5);

    // --- Pot (sits on stove) ---
    PixelArt.make(this, 'pot', POT, POT_PAL, 4);

    // --- Table ---
    PixelArt.make(this, 'table', TABLE, TABLE_PAL, 5);

    // --- Chair/stool ---
    PixelArt.make(this, 'chair', CHAIR, CHAIR_PAL, 5);

    // --- Coffee cup (table decor) ---
    PixelArt.make(this, 'cup', CUP, CUP_PAL, 4);

    // --- Potted plant ---
    PixelArt.make(this, 'plant', PLANT, PLANT_PAL, 5);

    // --- Window ---
    PixelArt.make(this, 'window', WINDOW, WINDOW_PAL, 6);

    // --- Framed menu board ---
    PixelArt.make(this, 'menu_board', MENU_BOARD, MENU_PAL, 6);

    // --- Hanging sign plate ---
    PixelArt.make(this, 'sign', SIGN, SIGN_PAL, 6);

    // --- Light bulb ---
    PixelArt.make(this, 'bulb', BULB, BULB_PAL, 3);

    // --- Wall shelf with jars ---
    PixelArt.make(this, 'shelf', SHELF, SHELF_PAL, 5);
  }

  // ===========================================================================
  // Environment
  // ===========================================================================
  buildEnvironment() {
    const floorY = 430;

    // Wall: tiled wood planks across the top region.
    this.tileRegion('wood_plank', 0, 0, GAME_WIDTH, floorY, 48);

    // Warm vignette/ambient light over the wall for a cozy glow.
    const glow = this.add.graphics();
    glow.fillStyle(0xffcf8a, 0.10);
    glow.fillRect(0, 0, GAME_WIDTH, floorY);
    glow.fillStyle(0x000000, 0.12);
    glow.fillRect(0, floorY - 24, GAME_WIDTH, 24);

    // Floor: tiled below.
    this.tileRegion('floor_tile', 0, floorY, GAME_WIDTH, GAME_HEIGHT - floorY, 48);

    // Baseboard shadow where wall meets floor.
    const base = this.add.graphics();
    base.fillStyle(0x000000, 0.18);
    base.fillRect(0, floorY, GAME_WIDTH, 6);

    // Window + sill plant.
    this.add.image(150, 60, 'window').setOrigin(0, 0).setDepth(1);

    // Wall shelf with jars. Moved left so it sits between the window and the
    // shop sign, clearing the (now wider) sign plate.
    this.add.image(300, 110, 'shelf').setOrigin(0, 0).setDepth(1);

    // Menu board. Enlarged plate so the whole menu fits inside it.
    this.drawMenuBoard();

    // Hanging string lights + sign.
    this.drawStringLights();
    this.drawShopSign();
  }

  /** Tile a registered texture across a rectangular region using a TileSprite. */
  tileRegion(key, x, y, w, h, displaySize) {
    const ts = this.add.tileSprite(x, y, w, h, key).setOrigin(0, 0).setDepth(0);
    if (displaySize) {
      const src = this.textures.get(key).getSourceImage();
      ts.tileScaleX = displaySize / src.width;
      ts.tileScaleY = displaySize / src.height;
    }
    return ts;
  }

  /**
   * Draw the menu board as a plate sized to fit its text, with the title and
   * items laid out inside the inner (chalkboard) area with proper padding.
   */
  drawMenuBoard() {
    const items = ['Kopi Hitam', 'Kopi Susu', 'Teh Manis', 'Indomie', 'Gorengan'];

    // Target on-screen plate size, chosen to comfortably contain the text.
    const plateW = 230;
    const plateH = 250;
    const x = GAME_WIDTH - plateW - 60; // right side, with a wall margin
    const y = 70;

    // Scale the existing 16x11 menu_board texture up to the target size,
    // keeping its pixel-art frame. The map's inner "chalkboard" area is the
    // 12x7 region inset by 2px on each side -> map it back to screen space.
    const src = this.textures.get('menu_board').getSourceImage();
    const board = this.add.image(x, y, 'menu_board').setOrigin(0, 0).setDepth(1);
    board.setScale(plateW / src.width, plateH / src.height);

    // Inner chalkboard rectangle in screen space (frame is ~2 map px thick).
    const insetX = (2 / src.width) * plateW;
    const insetY = (2 / src.height) * plateH;
    const innerX = x + insetX;
    const innerY = y + insetY;
    const innerW = plateW - insetX * 2;

    // Title centered within the inner board.
    this.add.text(innerX + innerW / 2, innerY + 24, 'MENU', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f2c14e'
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Divider under the title.
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(2, 0xf2c14e, 0.5);
    g.lineBetween(innerX + 16, innerY + 46, innerX + innerW - 16, innerY + 46);

    // Items, left-aligned with padding, evenly spaced inside the board.
    items.forEach((it, i) => {
      this.add.text(innerX + 20, innerY + 62 + i * 32, it, {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: '19px',
        color: '#fdf6e8'
      }).setOrigin(0, 0).setDepth(2);
    });
  }

  drawStringLights() {
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(3, 0x2b1d14, 1);
    const count = 12;
    const pts = [];
    for (let i = 0; i <= count; i++) {
      const px = (GAME_WIDTH / count) * i;
      const py = 20 + Math.sin((i / count) * Math.PI) * 8 + (i % 2) * 8;
      pts.push({ x: px, y: py });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    pts.forEach((p) => g.lineTo(p.x, p.y));
    g.strokePath();

    pts.forEach((p, i) => {
      if (i === 0 || i === pts.length - 1) return;
      const bulb = this.add.image(p.x, p.y + 10, 'bulb').setDepth(2);
      bulb.setTint([0xf2c14e, 0xe08a3c, 0xc0453b, 0x5c8a3f][i % 4]);
      // soft glow
      const glow = this.add.circle(p.x, p.y + 12, 14, 0xffdf8a, 0.18).setDepth(1);
      this.tweens.add({
        targets: glow,
        alpha: 0.32,
        duration: 1200 + i * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    });
  }

  drawShopSign() {
    const cx = GAME_WIDTH / 2;
    const cy = 92;

    // Build the title first so we can size the plate to fit it.
    const title = this.add.text(cx, cy, '☕ WARKOP WARBIS', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#f3d9a8'
    }).setOrigin(0.5).setDepth(4);

    // Scale the 26x9 sign texture into a banner wide enough for the title,
    // with horizontal padding, keeping the pixel-art frame.
    const src = this.textures.get('sign').getSourceImage();
    const plateW = Math.max(300, title.width + 70);
    const plateH = 60;
    const sign = this.add.image(cx, cy, 'sign').setDepth(3);
    sign.setScale(plateW / src.width, plateH / src.height);

    // Keep the title drawn above the plate.
    title.setDepth(4);

    const half = plateW / 2;

    // hanging chains anchored to the plate corners
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(3, 0x2b1d14, 1);
    g.lineBetween(cx - half + 24, 20, cx - half + 24, cy - plateH / 2);
    g.lineBetween(cx + half - 24, 20, cx + half - 24, cy - plateH / 2);

    // subtle sway (plate + title together)
    this.tweens.add({
      targets: [sign, title],
      angle: 1.5,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  // ===========================================================================
  // Props
  // ===========================================================================
  buildProps() {
    // Cashier station (left-center). Employee stands just behind the counter.
    const cx = 270;
    const cy = 486;
    this.add.image(cx, cy, 'counter').setOrigin(0.5, 0).setDepth(6);
    this.add.image(cx - 70, cy - 6, 'register').setOrigin(0.5, 1).setDepth(7);
    this.add.image(cx + 78, cy - 4, 'coffee_machine').setOrigin(0.5, 1).setDepth(7);
    this.makeSteam(cx + 78, cy - 56, 0.7);
    this.add.text(cx, cy + 118, 'KASIR', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f3d9a8'
    }).setOrigin(0.5).setDepth(8);
    // Employee stands behind the counter; store the position for the flow.
    this.cashierPos = { x: cx, y: cy - 2 };

    // Stove / kitchen station (right). Kept as a reference so the upgrade can
    // swap its texture at runtime.
    const sx = GAME_WIDTH - 250;
    const sy = 470;
    this.stoveLevel = 1;
    this.stoveSprite = this.add.image(sx, sy, 'stove').setOrigin(0.5, 0).setDepth(5);
    this.add.image(sx - 34, sy + 2, 'pot').setOrigin(0.5, 1).setDepth(6);
    this.drawFlames(sx + 36, sy + 8);
    this.makeSteam(sx - 34, sy - 40, 0.9);
    this.add.text(sx, sy + 120, 'DAPUR', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fdf6e8'
    }).setOrigin(0.5).setDepth(8);

    // Dining sets (chair behind, table front with cups).
    this.drawDiningSet(640, 560);
    this.drawDiningSet(980, 600);
    this.drawDiningSet(470, 636);

    // Potted plants in the corners.
    this.add.image(70, 572, 'plant').setOrigin(0.5, 1).setDepth(6);
    this.add.image(GAME_WIDTH - 64, 612, 'plant').setOrigin(0.5, 1).setDepth(9);
  }

  drawDiningSet(x, y) {
    // Depth increases toward the front so closer objects overlap correctly.
    const d = Math.floor(y / 10);
    // chairs behind the table
    this.add.image(x - 72, y - 10, 'chair').setOrigin(0.5, 1).setDepth(d - 1);
    this.add.image(x + 72, y - 10, 'chair').setOrigin(0.5, 1).setDepth(d - 1);
    // table
    this.add.image(x, y, 'table').setOrigin(0.5, 1).setDepth(d);
    // cups on top
    this.add.image(x - 26, y - 58, 'cup').setOrigin(0.5, 1).setDepth(d + 1);
    this.add.image(x + 30, y - 54, 'cup').setOrigin(0.5, 1).setDepth(d + 1);
  }

  drawFlames(x, y) {
    const colors = [0xff6a2a, 0xffa83c, 0xffe15a];
    for (let i = 0; i < 3; i++) {
      const f = this.add.triangle(
        x + (i - 1) * 10, y, 0, 14, 7, 0, 14, 14, colors[i % colors.length]
      ).setDepth(7);
      this.tweens.add({
        targets: f,
        scaleY: 1.5,
        duration: 220 + i * 60,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    }
  }

  makeSteam(x, y, scale = 1) {
    for (let i = 0; i < 3; i++) {
      const puff = this.add.circle(x + (i - 1) * 7, y, 5 * scale, 0xffffff, 0.5).setDepth(20);
      this.tweens.add({
        targets: puff,
        y: y - 46,
        alpha: 0,
        scale: 1.9 * scale,
        duration: 1800,
        delay: i * 420,
        repeat: -1,
        ease: 'Sine.out'
      });
    }
  }

  // ===========================================================================
  // Characters
  // ===========================================================================
  buildCharacters() {
    // Employee behind the cashier counter.
    this.employee = new Character(this, {
      x: this.cashierPos.x,
      y: this.cashierPos.y,
      skinKey: 'b',
      shirtKey: 'green',
      hairKey: 'black',
      apronKey: 'cream',
      scale: 1.1,
      facing: 1
    });
    this.employee.setDepth(5); // behind the counter front face (depth 6)

    // A seated background customer so the place always feels a bit busy.
    const seated = new Character(this, {
      x: 640,
      y: 548,
      skinKey: 'c',
      shirtKey: 'red',
      hairKey: 'brown',
      scale: 0.85,
      facing: -1
    });
    seated.setDepth(Math.floor(548 / 10) + 2);
  }

  // ===========================================================================
  // Service loop (state machine)
  //   startCycle -> customerArrives -> conversation(order)
  //     -> phasePrepare (button) -> phaseServe (button)
  //     -> payment -> customerLeaves -> startCycle
  // ===========================================================================

  /** Spawn a fresh customer off-screen on the right with a random look. */
  spawnCustomer() {
    const look = randomLook();
    const cust = new Character(this, {
      x: GAME_WIDTH + 80,
      y: 600,
      scale: 1.0,
      facing: -1,
      ...look
    });
    cust.setDepth(60);
    return cust;
  }

  startCycle() {
    this.phase = 'arriving';
    this.currentOrder = randomOrder();
    this.customer = this.spawnCustomer();
    this.hud.setStatus('Pelanggan datang...', '🚶');
    this.customerArrives();
  }

  customerArrives() {
    this.tweens.add({
      targets: this.customer,
      x: this.cashierPos.x + 190,
      duration: 1800,
      ease: 'Sine.inOut',
      onComplete: () => this.startConversation()
    });
  }

  startConversation() {
    this.phase = 'ordering';
    const lines = buildOrderDialogue(this.currentOrder, this.employee, this.customer);
    this.dialogue.start(lines, () => this.phasePrepare());
  }

  /** Phase 1: player presses a button to prepare the order. */
  phasePrepare() {
    this.phase = 'preparing';
    const o = this.currentOrder;
    this.hud.setStatus(`Pesanan: ${o.name}  —  siapkan pesanan`, o.icon);
    this.hud.showButton('🍳 Siapkan Pesanan', () => this.doPrepare());
  }

  doPrepare() {
    const o = this.currentOrder;
    this.hud.hideButton();
    this.hud.setStatus(`${o.prep}...`, '⏳');
    // Steam/flame already animate near the kitchen; show a short "cooking" wait.
    this.employee.talkBounce();
    this.time.delayedCall(1500, () => this.phaseServe());
  }

  /** Phase 2: order is ready; player presses to serve it to the customer. */
  phaseServe() {
    this.phase = 'serving';
    const o = this.currentOrder;
    this.hud.setStatus(`${o.name} siap! Sajikan ke pelanggan.`, '✅');
    this.hud.showButton('🧋 Sajikan', () => this.doServe());
  }

  doServe() {
    this.hud.hideButton();
    this.phase = 'paying';

    // A little serving dish flies from the counter to the customer.
    const o = this.currentOrder;
    const dish = this.add.text(this.cashierPos.x, this.cashierPos.y - 40, o.icon, {
      fontFamily: 'Segoe UI Emoji, sans-serif',
      fontSize: '34px'
    }).setOrigin(0.5).setDepth(70);

    this.tweens.add({
      targets: dish,
      x: this.customer.x,
      y: this.customer.y - 70,
      duration: 700,
      ease: 'Sine.inOut',
      onComplete: () => {
        dish.destroy();
        this.customer.talkBounce();
        this.payment();
      }
    });
  }

  payment() {
    this.hud.setStatus('Pelanggan membayar...', '💰');
    const lines = buildPaymentDialogue(this.currentOrder, this.employee, this.customer);
    this.dialogue.start(lines, () => this.collectPayment());
  }

  collectPayment() {
    const o = this.currentOrder;
    this.coins += o.price;
    this.hud.setCoins(this.coins);
    this.hud.floatCoinGain(o.price);
    this.hud.setStatus(`+${o.price} koin! Terima kasih 😊`, '🪙');
    this.persist(); // save coins after each sale
    this.customerLeaves();
  }

  /** Save current progress (coins + purchased upgrades) to localStorage. */
  persist() {
    saveProgress({ coins: this.coins, purchased: this.purchased });
  }

  customerLeaves() {
    this.phase = 'leaving';
    const cust = this.customer;
    cust.setFacing(1);
    this.tweens.add({
      targets: cust,
      x: GAME_WIDTH + 120,
      duration: 1700,
      ease: 'Sine.in',
      onComplete: () => {
        cust.destroy();
        if (this.customer === cust) this.customer = null;
        // Short beat, then the next customer arrives — the loop continues.
        this.phase = 'idle';
        this.hud.setStatus('Menunggu pelanggan...', '🙂');
        this.time.delayedCall(1100, () => this.startCycle());
      }
    });
  }

  // ===========================================================================
  // Upgrades
  // ===========================================================================

  /**
   * Attempt to buy an upgrade. Returns true on success. Guards affordability
   * and double-purchase here too (the panel also guards, but the scene is the
   * source of truth for coins).
   */
  buyUpgrade(item) {
    if (this.purchased[item.id]) return false;
    if (this.coins < item.price) return false;

    this.coins -= item.price;
    this.hud.setCoins(this.coins);
    this.purchased[item.id] = true;

    if (item.id === 'stove') this.applyStoveUpgrade();

    this.persist(); // save coins + purchased upgrade
    this.hud.setStatus(`${item.name} terpasang! 🔧`, '✨');
    return true;
  }

  /**
   * Swap the stove to its upgraded look. When `silent` is true (e.g. applying
   * a loaded save on startup), skip the flash/sparkle effects.
   */
  applyStoveUpgrade(silent = false) {
    if (this.stoveLevel >= 2) return;
    this.stoveLevel = 2;
    this.stoveSprite.setTexture('stove2');
    if (silent) return;

    // brief flash to sell the change
    const b = this.stoveSprite.getBounds();
    const flash = this.add.rectangle(b.centerX, b.centerY, b.width + 10, b.height + 10, 0xffffff, 0.6)
      .setDepth(30);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

    for (let i = 0; i < 8; i++) {
      const spark = this.add.text(b.centerX + Phaser.Math.Between(-60, 60), b.centerY + Phaser.Math.Between(-40, 40), '✨', {
        fontFamily: 'Segoe UI Emoji, sans-serif', fontSize: '20px'
      }).setDepth(31);
      this.tweens.add({
        targets: spark,
        y: spark.y - 40,
        alpha: 0,
        duration: 700 + i * 40,
        onComplete: () => spark.destroy()
      });
    }
  }

  showTitleBanner() {
    const sub = this.add.text(GAME_WIDTH / 2, 132, 'Simulasi Warung Kopi', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '22px',
      color: '#f3d9a8'
    }).setOrigin(0.5).setDepth(900).setAlpha(0);

    this.tweens.add({ targets: sub, alpha: 1, duration: 500, yoyo: true, hold: 1600, onComplete: () => sub.destroy() });
  }
}

// =============================================================================
// Pixel maps + palettes for props. Authored at small sizes and scaled up by
// the PixelArt engine for a chunky, cohesive pixel-art look.
// =============================================================================

// --- Cashier counter front (built programmatically for width) ---
function buildCounter() {
  const w = 46;
  const rows = [];
  rows.push('t'.repeat(w)); // top trim
  rows.push('T' + 'c'.repeat(w - 2) + 'T');
  for (let i = 0; i < 18; i++) {
    if (i === 4 || i === 13) {
      rows.push('T' + 'd'.repeat(w - 2) + 'T'); // panel seam
    } else {
      rows.push('T' + 'b'.repeat(w - 2) + 'T');
    }
  }
  rows.push('o'.repeat(w)); // base shadow
  return rows;
}
const COUNTER_PAL = {
  t: PX.wood4, // light top trim
  c: PX.cream2, // counter top surface
  T: PX.wood1, // dark edges
  b: PX.wood2, // body
  d: PX.wood1, // seams
  o: PX.ink
};

const REGISTER = [
  '..oooooooo..',
  '.oWWWWWWWWo.',
  'oWggggggggWo',
  'oWgsssssggWo',
  'oWgsssssggWo',
  'oWggggggggWo',
  'oWWWWWWWWWWo',
  'oWbbWbbWbbWo',
  'oWbbWbbWbbWo',
  'oWWWWWWWWWWo',
  '.oKKKKKKKKo.',
  '..oooooooo..'
];
const REGISTER_PAL = {
  o: PX.ink,
  W: PX.cream1,
  g: PX.metal1,
  s: '#5ad17a', // screen
  b: PX.metal3, // buttons
  K: PX.wood2
};

const MACHINE = [
  '.oooooooo.',
  'oRRRRRRRRo',
  'oRrrrrrrRo',
  'oRrWWWWrRo',
  'oRrWmmWrRo',
  'oRrWWWWrRo',
  'oRRRRRRRRo',
  'oRRkkkkRRo',
  'oRRkKKkRRo',
  'oRRRRRRRRo',
  'oMM.oo.MMo',
  'oMMo..oMMo',
  '.oo....oo.'
];
const MACHINE_PAL = {
  o: PX.ink,
  R: PX.red1,
  r: PX.red2,
  W: PX.metal4,
  m: PX.ink,
  k: PX.metal2,
  K: PX.metal3,
  M: PX.metal2
};

const STOVE = [
  'oooooooooooooooooooo',
  'oMMMMMMMMMMMMMMMMMMo',
  'oMddddddddddddddddMo',
  'oMdOOOOdddddddOOOOMo',
  'oMdObbOdddddddObbOMo',
  'oMdObbOdddddddObbOMo',
  'oMdOOOOdddddddOOOOMo',
  'oMddddddddddddddddMo',
  'oNNNNNNNNNNNNNNNNNNo',
  'oNkkkkkkkNNkkkkkkkNo',
  'oNkKKKKKkNNkKKKKKkNo',
  'oNkKhhhKkNNkKhhhKkNo',
  'oNkKKKKKkNNkKKKKKkNo',
  'oNkkkkkkkNNkkkkkkkNo',
  'oNNNNNNNNNNNNNNNNNNo',
  'oNNNNNNNNNNNNNNNNNNo',
  'oooooooooooooooooooo'
];
const STOVE_PAL = {
  o: PX.ink,
  M: PX.metal1, // top
  d: PX.metal2, // top inset
  O: '#1a1a1f', // burner ring
  b: PX.metal3, // burner inner
  N: PX.metal2, // body
  k: PX.metal1, // door frames
  K: PX.metal2, // door
  h: '#1a1a1f' // door window
};

// Upgraded stove: brighter chrome top, brass trim, blue-flame burners, and a
// glowing control panel. Same 20x17 grid so it slots into the exact spot.
const STOVE2 = [
  'oooooooooooooooooooo',
  'oCCCCCCCCCCCCCCCCCCo',
  'oCttttttttttttttttCo',
  'oCtRRRttttttttRRRtCo',
  'oCtRbRttttttttRbRtCo',
  'oCtRBRttttttttRBRtCo',
  'oCtRRRttttttttRRRtCo',
  'oCttttttttttttttttCo',
  'oGGGGGGGGGGGGGGGGGGo',
  'oGbBBBBBGGGGBBBBBbGo',
  'oGbBrrBGGGGGGBrrBbGo',
  'oGbBrHBGGGGGGBrHBbGo',
  'oGbBrrBGGGGGGBrrBbGo',
  'oGbBBBBBGGGGBBBBBbGo',
  'oGGGGGGGGGGGGGGGGGGo',
  'oGyGGGGGyGGGGyGGGyGo',
  'oooooooooooooooooooo'
];
const STOVE2_PAL = {
  o: PX.ink,
  C: '#c9ccd6', // chrome top
  t: '#e7e9f0', // chrome top highlight
  R: '#8a5a2d', // brass burner ring
  b: '#1a1a1f', // burner inner dark
  B: '#3f6fb0', // blue flame glow (base)
  G: '#9fa0ad', // steel body
  r: '#2a2a30', // oven door frame
  H: '#6a97d1', // glowing oven window
  y: '#f2c14e' // brass control knobs
};

const POT = [
  '.ooooooo.',
  'oKsssssKo',
  'oKKKKKKKo',
  'oGGGGGGGo',
  'oGgggggGo',
  'oGgggggGo',
  'oGGGGGGGo',
  '.oGGGGGo.',
  '..ooooo..'
];
const POT_PAL = {
  o: PX.ink,
  K: PX.metal4,
  s: PX.metal3,
  G: PX.metal2,
  g: PX.metal1
};

const TABLE = [
  'oooooooooooooooooooo',
  'oTTTTTTTTTTTTTTTTTTo',
  'oWccccccccccccccccWo',
  'oWWWWWWWWWWWWWWWWWWo',
  'oTTTTTTTTTTTTTTTTTTo',
  'ooooooooTTTToooooooo',
  '.......oTTTTo.......',
  '.......oTTTTo.......',
  '.......oTTTTo.......',
  '.......oTTTTo.......',
  '.......oTTTTo.......',
  '.......oTTTTo.......',
  '......oTTTTTTo......',
  '.....oTTTTTTTTo.....',
  '.....oTTTTTTTTo.....',
  '....oooooooooooo....'
];
const TABLE_PAL = {
  o: PX.ink,
  T: PX.wood1,
  W: PX.wood2,
  c: PX.wood3
};

const CHAIR = [
  'ooooooooo',
  'oRRRRRRRo',
  'oRrrrrrRo',
  'oRrrrrrRo',
  'oRRRRRRRo',
  'ooooooooo',
  '.oWWWWWo.',
  '.oWcccWo.',
  '.oWWWWWo.',
  '.ooooooo.',
  '.oTo.oTo.',
  '.oTo.oTo.',
  '.oTo.oTo.',
  '.ooo.ooo.'
];
const CHAIR_PAL = {
  o: PX.ink,
  R: PX.red1, // backrest frame
  r: PX.red2, // backrest pad
  W: PX.wood1, // seat frame
  c: PX.wood3, // seat
  T: PX.wood1 // legs
};

const CUP = [
  '.ooooo..',
  'oWWWWWoo',
  'oWfffWoW',
  'oWcccWoW',
  'oWcccWoo',
  'oWWWWWo.',
  '.oWWWo..',
  '..ooo...'
];
const CUP_PAL = {
  o: PX.ink,
  W: PX.white,
  f: PX.foam,
  c: PX.coffee2
};

const PLANT = [
  '....ggg....',
  '..gggGgggg.',
  '.ggGgggGgg.',
  'gggGgggGggg',
  '.gGgggGggg.',
  '..ggGggg...',
  '...gGgg....',
  '....oOo....',
  '...oPPPo...',
  '..oPPPPPo..',
  '..oPpppPo..',
  '..oPpppPo..',
  '...oPPPo...',
  '....ooo....'
];
const PLANT_PAL = {
  o: PX.ink,
  g: PX.green3,
  G: PX.green2,
  O: PX.green1,
  P: PX.orange1, // pot
  p: PX.orange2
};

const WINDOW = [
  'oooooooooooooooooo',
  'oWWWWWWWWWWWWWWWWo',
  'oWsssssSssssssSWWo',
  'oWsSSSSSSSSSSSSSWo',
  'oWsSbbbbSbbbbbSSWo',
  'oWsSbbbbSbbbbbSSWo',
  'oWssssssSsssssSWWo',
  'oWSSSSSSSSSSSSSSWo',
  'oWsbbbbbSbbbbbSWWo',
  'oWsbbbbbSbbbbbSWWo',
  'oWssssssSsssssSWWo',
  'oWWWWWWWWWWWWWWWWo',
  'oDDDDDDDDDDDDDDDDo',
  'oooooooooooooooooo'
];
const WINDOW_PAL = {
  o: PX.ink,
  W: PX.wood2, // frame
  D: PX.wood1, // sill
  s: PX.sky2, // glass light
  S: PX.sky1, // glass darker
  b: '#cfeaf7' // glass highlight panes
};

const MENU_BOARD = [
  'oooooooooooooooo',
  'oWWWWWWWWWWWWWWo',
  'oWbbbbbbbbbbbbWo',
  'oWbbbbbbbbbbbbWo',
  'oWbbbbbbbbbbbbWo',
  'oWbbbbbbbbbbbbWo',
  'oWbbbbbbbbbbbbWo',
  'oWbbbbbbbbbbbbWo',
  'oWbbbbbbbbbbbbWo',
  'oWWWWWWWWWWWWWWo',
  'oooooooooooooooo'
];
const MENU_PAL = {
  o: PX.ink,
  W: PX.wood2, // frame
  b: '#20160f' // chalkboard
};

const SIGN = [
  'oooooooooooooooooooooooooo',
  'oGGGGGGGGGGGGGGGGGGGGGGGGo',
  'oGyyyyyyyyyyyyyyyyyyyyyyGo',
  'oGyGGGGGGGGGGGGGGGGGGGGyGo',
  'oGyGGGGGGGGGGGGGGGGGGGGyGo',
  'oGyGGGGGGGGGGGGGGGGGGGGyGo',
  'oGyyyyyyyyyyyyyyyyyyyyyyGo',
  'oGGGGGGGGGGGGGGGGGGGGGGGGo',
  'oooooooooooooooooooooooooo'
];
const SIGN_PAL = {
  o: PX.ink,
  G: PX.green1,
  y: PX.yellow2
};

const BULB = [
  '.ooo.',
  'oBBBo',
  'oBhBo',
  'oBBBo',
  '.oBo.',
  '..o..'
];
const BULB_PAL = {
  o: PX.ink,
  B: PX.yellow2,
  h: PX.yellow3
};

const SHELF = [
  'oooooooooooooooooooooo',
  'oWWWWWWWWWWWWWWWWWWWWo',
  'obbjjbbbkkbbbrrbbbggbo',
  'obbjjbbbkkbbbrrbbbggbo',
  'obbJJbbbKKbbbRRbbbGGbo',
  'oWWWWWWWWWWWWWWWWWWWWo',
  'oooooooooooooooooooooo'
];
const SHELF_PAL = {
  o: PX.ink,
  W: PX.wood2,
  b: PX.wood1, // behind jars (shelf shadow)
  j: PX.red3, k: PX.green4, r: PX.orange3, g: PX.blue3,
  J: PX.red2, K: PX.green3, R: PX.orange2, G: PX.blue2
};
