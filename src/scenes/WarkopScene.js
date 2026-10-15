import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, PX } from '../config.js';
import Character from '../objects/Character.js';
import DialogueBox from '../objects/DialogueBox.js';
import HUD from '../objects/HUD.js';
import PixelArt from '../engine/PixelArt.js';

import GameState from '../systems/GameState.js';
import TimeWeather from '../systems/TimeWeather.js';
import MissionSystem from '../systems/MissionSystem.js';
import NpcChatter from '../systems/NpcChatter.js';

import { getRecipe, qualityFromScore } from '../data/recipes.js';
import { ARCHETYPES, pickArchetypeForTime, pick } from '../data/customers.js';
import { pickOrderFor, buildGreeting, buildReaction } from '../data/orders.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { findShopItem } from '../data/shop.js';

import { label, button } from '../ui/UIKit.js';
import ShopOverlay from '../ui/ShopOverlay.js';
import InventoryOverlay from '../ui/InventoryOverlay.js';
import MissionOverlay from '../ui/MissionOverlay.js';
import CollectionOverlay from '../ui/CollectionOverlay.js';
import SettingsOverlay from '../ui/SettingsOverlay.js';
import ModeOverlay from '../ui/ModeOverlay.js';
import ResultOverlay from '../ui/ResultOverlay.js';
import { UITEXT } from '../config.js';

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
    // --- Core systems (single source of truth) ---
    this.gs = new GameState();                 // persistent progress (v2 + migrated v1)
    this.timeWeather = new TimeWeather(this);  // simulated clock + weather
    this.missions = new MissionSystem(this.gs);
    this.npcChatter = new NpcChatter();        // optional Gemini chatter (rate-limited)

    // --- World ---
    this.buildTextures();
    this.buildEnvironment();
    this.buildProps();
    this.buildCharacters();

    // Apply already-owned upgrades/decorations from the save immediately.
    this.applyOwnedUpgrades();

    // --- UI ---
    this.dialogue = new DialogueBox(this);
    this.hud = new HUD(this);
    this.hud.setCoins(this.gs.coins);
    this.buildTopBars();     // time/weather + reputation readouts
    this.buildToolbar();     // shop/inventory/missions/collection/mode/settings buttons
    this.buildOverlays();

    // Keep HUD coins in sync with state changes anywhere.
    this.gs.on('coins', (c) => this.hud.setCoins(c));
    this.gs.on('reputation', () => this.refreshTopBars());

    // --- Service loop state ---
    this.phase = 'idle';
    this.currentOrder = null;   // recipe object
    this.currentRecipeId = null;
    this.currentArchetype = null;
    this.customer = null;
    this.cooked = null;         // { score, quality } from the mini-game
    this.spawnDelayBase = 1400;

    this.mode = 'harian';       // 'harian' | 'tantangan'
    this.challenge = null;      // { endsAt, served, target } when in challenge

    // Advance built-in dialogue on tap/click (unchanged behaviour).
    this.input.on('pointerdown', () => {
      if (this.dialogue.isActive) this.dialogue.advance();
    });

    // Start the simulated time and the first service cycle.
    this.timeWeather.start();
    this.timeWeather.on('phase', (p) => this.onPhaseChange(p));
    this.timeWeather.on('weather', (w) => this.onWeatherChange(w));
    this.refreshTopBars();
    this.applyPhaseTint(this.timeWeather.phase.id);

    this.hud.setStatus('Menunggu pelanggan...', '🙂');
    this.time.delayedCall(1200, () => this.startCycle());
  }

  update(time, delta) {
    if (this.timeWeather) this.timeWeather.update(delta);
    this.updatePatience(delta);
    this.updateChallenge();
    this.syncToolbarWithDialogue();
  }

  /** Hide the toolbar while the dialogue box or an overlay is on screen. */
  syncToolbarWithDialogue() {
    if (!this.toolbarBtns) return;
    const anyOverlayOpen = [this.shopOverlay, this.inventoryOverlay, this.missionOverlay,
      this.collectionOverlay, this.settingsOverlay, this.modeOverlay, this.resultOverlay]
      .some((o) => o && o.isOpen);
    const dialogueUp = this.dialogue && this.dialogue.isActive;
    const cookingUp = this.scene.isActive('CookingScene');
    const shouldHide = dialogueUp || cookingUp || anyOverlayOpen;
    if (shouldHide === this._toolbarHidden) return;
    this._toolbarHidden = shouldHide;
    this.setToolbarVisible(!shouldHide);
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

  // ===========================================================================
  // Top bars: time/weather (center) + reputation (right)
  // ===========================================================================
  buildTopBars() {
    // Time + weather chip on its own pill at top-left, under the coin counter,
    // so it never collides with the center sign.
    const chipBg = this.add.graphics().setDepth(954);
    chipBg.fillStyle(0x241812, 0.78);
    chipBg.fillRoundedRect(24, 84, 360, 40, 12);
    chipBg.lineStyle(2, 0xf3d9a8, 0.6);
    chipBg.strokeRoundedRect(24, 84, 360, 40, 12);
    this.timeChip = label(this, 40, 104, '', { size: 16, color: UITEXT.light, origin: [0, 0.5] });
    this.timeChip.setDepth(955);

    // Reputation chip (top-right, with its own pill)
    const repBg = this.add.graphics().setDepth(954);
    repBg.fillStyle(0x241812, 0.78);
    repBg.fillRoundedRect(GAME_WIDTH - 220, 20, 196, 40, 12);
    repBg.lineStyle(2, 0xf2c14e, 0.7);
    repBg.strokeRoundedRect(GAME_WIDTH - 220, 20, 196, 40, 12);
    this.repChip = label(this, GAME_WIDTH - 36, 40, '', { size: 17, bold: true, color: UITEXT.star, origin: [1, 0.5] });
    this.repChip.setDepth(955);
  }

  refreshTopBars() {
    if (!this.timeChip) return;
    const t = this.timeWeather.phase;
    const w = this.timeWeather.weather;
    const wk = this.timeWeather.weekend ? ' • Akhir Pekan' : '';
    this.timeChip.setText(`${t.icon} ${t.name}  ${w.icon} ${w.name}  • Hari ${this.timeWeather.dayCount}${wk}`);
    this.repChip.setText(`⭐ Reputasi ${this.gs.reputation}`);
  }

  dayInfo() { return `${this.timeWeather.phase.name} (Hari ${this.timeWeather.dayCount})`; }

  // ===========================================================================
  // Toolbar of overlay-opening buttons (bottom-left column of chips)
  // ===========================================================================
  buildToolbar() {
    const defs = [
      { icon: '🏪', label: 'Toko', open: () => this.shopOverlay.open() },
      { icon: '📦', label: 'Stok', open: () => this.inventoryOverlay.open() },
      { icon: '🎯', label: 'Misi', open: () => this.missionOverlay.open() },
      { icon: '📔', label: 'Album', open: () => this.collectionOverlay.open() },
      { icon: '🎮', label: 'Mode', open: () => this.modeOverlay.open() },
      { icon: '⚙️', label: 'Set', open: () => this.settingsOverlay.open() }
    ];
    // Vertical column on the right edge, below the menu board, clear of both
    // the center sign and the bottom dialogue box.
    const x = GAME_WIDTH - 78;
    const startY = 360;
    this.toolbarBtns = [];
    defs.forEach((d, i) => {
      const b = button(this, x, startY + i * 52, d.label, d.open, {
        w: 130, h: 44, size: 15, icon: d.icon, color: 0x3a2616, textColor: UITEXT.light
      });
      b.container.setDepth(955); b.zone.setDepth(956);
      this.toolbarBtns.push(b);
    });
  }

  setToolbarVisible(on) {
    this.toolbarBtns.forEach((b) => { b.container.setVisible(on); b.zone.setVisible(on); if (on) b.setEnabled(true); else b.zone.disableInteractive(); });
  }

  buildOverlays() {
    this.shopOverlay = new ShopOverlay(this, {
      gs: this.gs,
      isOwned: (item) => this.isItemOwned(item),
      onBuy: (item) => this.buyShopItem(item)
    });
    this.inventoryOverlay = new InventoryOverlay(this, {
      gs: this.gs,
      onRestock: (ing) => this.restock(ing)
    });
    this.missionOverlay = new MissionOverlay(this, {
      missions: this.missions,
      onClaim: () => this.refreshTopBars()
    });
    this.collectionOverlay = new CollectionOverlay(this, { gs: this.gs });
    this.settingsOverlay = new SettingsOverlay(this, {
      gs: this.gs,
      dayInfo: () => this.dayInfo(),
      onToggleEffects: (on) => this.onToggleEffects(on)
    });
    this.modeOverlay = new ModeOverlay(this, { onSelect: (m) => this.startMode(m) });
    this.resultOverlay = new ResultOverlay(this, { onContinue: () => this.endChallenge() });
  }

  // ===========================================================================
  // Economy: shop + inventory
  // ===========================================================================
  isItemOwned(item) {
    if (item.effect && item.effect.type === 'recipe') return this.gs.hasRecipe(item.effect.recipeId);
    return this.gs.hasUpgrade(item.id) || this.gs.hasDecoration(item.id);
  }

  /** Buy any shop item with full guards; apply its real effect. Returns bool. */
  buyShopItem(item) {
    if (this.isItemOwned(item)) return false;
    if (item.requiresReputation && this.gs.reputation < item.requiresReputation) return false;

    const eff = item.effect || {};
    let ok = false;
    if (eff.type === 'recipe') {
      ok = this.gs.buyRecipe(eff.recipeId, item.price);
    } else if (item.category === 'dekorasi' || eff.type === 'ambient' || eff.type === 'wallDecor' || eff.type === 'repaint') {
      ok = this.gs.buyDecoration(item.id, item.price);
    } else {
      ok = this.gs.buyUpgrade(item.id, item.price);
    }
    if (ok) {
      this.applyEffect(item);
      this.refreshTopBars();
    }
    return ok;
  }

  restock(ing) {
    if (!this.gs.canAfford(ing.price)) return false;
    if (!this.gs.spend(ing.price)) return false;
    this.gs.addStock(ing.id, ing.restock);
    return true;
  }

  // ===========================================================================
  // Applying upgrade effects to the world (real, visible changes)
  // ===========================================================================
  applyOwnedUpgrades() {
    // Equipment / cook speed
    this.cookSpeedMult = 1;
    this.toleranceBonus = 0;
    this.extraPatience = 0;
    this.attractiveness = 0;
    this.stoveLevel = 1;

    // Legacy "stove" preserved via migration -> upgraded chrome stove.
    if (this.gs.hasUpgrade('stove')) this.setStoveUpgraded(true);
    if (this.gs.hasUpgrade('ketel')) this.cookSpeedMult *= 0.85;
    if (this.gs.hasUpgrade('penggorengan')) this.toleranceBonus += 0.06;
    if (this.gs.hasUpgrade('kursi_empuk')) this.extraPatience += 6;

    // Decorations -> attractiveness + visuals
    if (this.gs.hasDecoration('lampu_hangat')) { this.attractiveness += 3; this.addWarmGlow(); }
    if (this.gs.hasDecoration('poster')) { this.attractiveness += 2; this.addWallDecor('🖼️', 560); }
    if (this.gs.hasDecoration('jam_dinding')) { this.attractiveness += 2; this.addWallDecor('🕐', 720); }
    if (this.gs.hasDecoration('cat_dinding')) { this.attractiveness += 5; this.repaintWall(); }
  }

  applyEffect(item) {
    const eff = item.effect || {};
    switch (eff.type) {
      case 'stoveSkin': this.setStoveUpgraded(false); break;
      case 'cookSpeed': this.cookSpeedMult *= (eff.speedMult || 1); break;
      case 'friedEasier': this.toleranceBonus += (eff.toleranceBonus || 0); break;
      case 'patienceBonus': this.extraPatience += (eff.seconds || 0); break;
      case 'ambient': this.attractiveness += (eff.attract || 0); this.addWarmGlow(); break;
      case 'wallDecor': this.attractiveness += (eff.attract || 0); this.addWallDecor(item.icon, item.id === 'jam_dinding' ? 720 : 560); break;
      case 'repaint': this.attractiveness += (eff.attract || 0); this.repaintWall(); break;
      case 'capacity': this.addSeat(); break;
      case 'recipe': /* unlocked in state; nothing visual */ break;
      default: break;
    }
    if (item.name) this.hud.setStatus(`${item.name} dipasang! ✨`, '🔧');
  }

  setStoveUpgraded(silent) {
    if (this.stoveLevel >= 2 || !this.stoveSprite) return;
    this.stoveLevel = 2;
    this.cookSpeedMult *= 0.85; // kompor premium also cooks faster
    this.stoveSprite.setTexture('stove2');
    if (silent || this.gs.settings.reduceEffects) return;
    const b = this.stoveSprite.getBounds();
    const flash = this.add.rectangle(b.centerX, b.centerY, b.width + 10, b.height + 10, 0xffffff, 0.6).setDepth(30);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
    for (let i = 0; i < 8; i++) {
      const spark = this.add.text(b.centerX + Phaser.Math.Between(-60, 60), b.centerY + Phaser.Math.Between(-40, 40), '✨', {
        fontFamily: 'Segoe UI Emoji, sans-serif', fontSize: '20px'
      }).setDepth(31);
      this.tweens.add({ targets: spark, y: spark.y - 40, alpha: 0, duration: 700 + i * 40, onComplete: () => spark.destroy() });
    }
  }

  addWarmGlow() {
    if (this._warmGlow) return;
    this._warmGlow = this.add.graphics().setDepth(2);
    this._warmGlow.fillStyle(0xffcf8a, 0.12);
    this._warmGlow.fillRect(0, 0, GAME_WIDTH, 430);
  }

  addWallDecor(emoji, x) {
    this.add.text(x, 200, emoji, { fontFamily: 'Segoe UI Emoji', fontSize: '46px' }).setOrigin(0.5).setDepth(2);
  }

  repaintWall() {
    if (this._repaint) return;
    this._repaint = this.add.graphics().setDepth(1);
    this._repaint.fillStyle(0x8a6a4a, 0.22);
    this._repaint.fillRect(0, 0, GAME_WIDTH, 430);
  }

  addSeat() {
    // Visual: an extra chair near the dining area; also raises capacity flag.
    this.extraSeats = (this.extraSeats || 0) + 1;
    const x = 760 + this.extraSeats * 60;
    if (this.textures.exists('chair')) {
      this.add.image(x, 640, 'chair').setOrigin(0.5, 1).setDepth(Math.floor(640 / 10) - 1);
    }
  }

  onToggleEffects(on) {
    // Reducing effects: stop ambient tweens if present (steam/sparkle are
    // one-shot; this mainly affects future spawns and the cooking scene).
    this.reduceEffects = on;
  }

  // ===========================================================================
  // Time + weather reactions
  // ===========================================================================
  onPhaseChange(phaseId) {
    this.refreshTopBars();
    this.applyPhaseTint(phaseId);
  }

  onWeatherChange() {
    this.refreshTopBars();
  }

  applyPhaseTint(phaseId) {
    const phase = this.timeWeather.phase;
    if (!this._phaseOverlay) {
      this._phaseOverlay = this.add.graphics().setDepth(900);
    }
    this._phaseOverlay.clear();
    // Night/dusk get a cool overlay; morning a warm one; siang none.
    const map = {
      pagi: { color: 0xffe3b0, alpha: 0.08 },
      siang: { color: 0xffffff, alpha: 0.0 },
      sore: { color: 0xff9a5a, alpha: 0.10 },
      malam: { color: 0x24306a, alpha: 0.22 }
    };
    const m = map[phaseId] || map.siang;
    if (m.alpha > 0) {
      this._phaseOverlay.fillStyle(m.color, m.alpha);
      this._phaseOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  }

  // ===========================================================================
  // Service loop (now: arrive -> order dialogue -> COOK mini-game -> serve ->
  // reaction + pay/tip + reputation -> leave -> next). Patience runs while the
  // customer waits during ordering/cooking.
  // ===========================================================================
  spawnCustomer(archetype) {
    const cust = new Character(this, {
      x: GAME_WIDTH + 80, y: 600, scale: 1.0, facing: -1, ...archetype.look
    });
    cust.setDepth(60);
    return cust;
  }

  startCycle() {
    if (this.phase !== 'idle') return;
    this.phase = 'arriving';

    // Choose a time-appropriate archetype and an order they'd want.
    this.currentArchetype = pickArchetypeForTime(this.timeWeather.phase.id);
    const isUnlocked = (id) => this.gs.hasRecipe(id);
    let orderId = pickOrderFor(this.currentArchetype, isUnlocked);
    orderId = this.timeWeather.biasOrder(orderId, isUnlocked);
    this.currentRecipeId = orderId;
    this.currentOrder = getRecipe(orderId);

    this.customer = this.spawnCustomer(this.currentArchetype);
    this.patienceMax = this.currentArchetype.patience + this.extraPatience + Math.round(this.attractiveness * 0.5);
    this.patience = this.patienceMax;
    this.patienceActive = false;

    // Kick off an OPTIONAL AI chatter request now (non-blocking), so it may be
    // ready by the time the greeting dialogue starts. Rate-limited internally;
    // on any failure/cooldown this stays null and we use the local dialogue.
    this.pendingChatter = null;
    if (this.npcChatter.canRequest()) {
      const forCustomer = this.currentArchetype.id;
      const forOrder = this.currentRecipeId;
      this.npcChatter.fetchLine(forCustomer, forOrder).then((line) => {
        // Only keep it if it's still the same customer/order waiting to order.
        if (line && this.currentArchetype && this.currentArchetype.id === forCustomer
            && this.currentRecipeId === forOrder) {
          this.pendingChatter = line;
        }
      });
    }

    this.hud.setStatus(`${this.currentArchetype.emoji} ${this.currentArchetype.name} datang...`, '🚶');
    this.tweens.add({
      targets: this.customer,
      x: this.cashierPos.x + 190,
      duration: 1700,
      ease: 'Sine.inOut',
      onComplete: () => this.startConversation()
    });
  }

  startConversation() {
    this.phase = 'ordering';
    this.patienceActive = true; // patience ticks while they wait

    // The order + the existing (fixed) greeting are unchanged. If an AI chatter
    // line arrived in time, we ADD it as one extra customer line for flavor —
    // it never replaces the order line or changes any game logic.
    const lines = buildGreeting(this.currentArchetype, this.currentOrder, this.employee, this.customer);
    if (this.pendingChatter) {
      const cust = this.customer;
      const extra = {
        speaker: this.currentArchetype.name,
        color: COLORS.blue,
        text: this.pendingChatter,
        onShow: () => cust && cust.talkBounce()
      };
      // Insert after the first customer line (index 1) so it reads naturally,
      // keeping the confirming order line last.
      const insertAt = Math.min(2, lines.length);
      lines.splice(insertAt, 0, extra);
    }
    this.pendingChatter = null;

    this.dialogue.start(lines, () => this.phaseCook());
  }

  phaseCook() {
    this.phase = 'cooking';
    const recipe = this.currentOrder;

    // Check ingredients first — if out of stock, player must restock.
    if (!this.gs.hasIngredients(recipe.ingredients)) {
      this.hud.setStatus('Bahan habis! Buka 📦 Stok untuk membeli.', '⚠️');
      this.hud.showButton('📦 Buka Stok', () => { this.hud.hideButton(); this.inventoryOverlay.open(); this.offerCookWhenReady(); });
      return;
    }
    this.launchCooking();
  }

  offerCookWhenReady() {
    // After the player closes inventory, let them try cooking again.
    const check = () => {
      if (this.gs.hasIngredients(this.currentOrder.ingredients)) {
        this.hud.setStatus('Bahan siap! Mulai memasak.', '✅');
        this.hud.showButton('🍳 Mulai Masak', () => { this.hud.hideButton(); this.launchCooking(); });
      } else {
        this.hud.showButton('📦 Buka Stok', () => { this.hud.hideButton(); this.inventoryOverlay.open(); this.time.delayedCall(300, check); });
      }
    };
    this.time.delayedCall(300, check);
  }

  launchCooking() {
    const recipe = this.currentOrder;
    // Consume ingredients now (committed to the dish).
    this.gs.consume(recipe.ingredients);
    this.patienceActive = true; // still waiting while you cook

    this.hud.setStatus(`${this.currentArchetype.name} menunggu — masak ${recipe.name}!`, recipe.icon);
    this.setToolbarVisible(false);

    this.scene.launch('CookingScene', {
      recipe,
      speedMult: this.cookSpeedMult,
      toleranceBonus: this.toleranceBonus,
      reduceEffects: !!this.gs.settings.reduceEffects,
      onDone: (result) => {
        this.cooked = result;
        this.setToolbarVisible(true);
        this.phaseServe();
      }
    });
  }

  phaseServe() {
    this.phase = 'serving';
    this.hud.setStatus('Sajikan pesanannya!', '🧋');
    this.hud.showButton('🧋 Sajikan', () => this.doServe());
  }

  doServe() {
    this.hud.hideButton();
    this.phase = 'paying';
    this.patienceActive = false;

    const dish = this.add.text(this.cashierPos.x, this.cashierPos.y - 40, this.currentOrder.icon, {
      fontFamily: 'Segoe UI Emoji, sans-serif', fontSize: '34px'
    }).setOrigin(0.5).setDepth(70);
    this.tweens.add({
      targets: dish, x: this.customer.x, y: this.customer.y - 70, duration: 650, ease: 'Sine.inOut',
      onComplete: () => { dish.destroy(); this.customer.talkBounce(); this.resolveServe(); }
    });
  }

  /** Combine cook quality + patience into an outcome; pay, tip, reputation. */
  resolveServe() {
    const recipe = this.currentOrder;
    const quality = this.cooked ? this.cooked.quality : qualityFromScore(0.5);

    // Patience factor: if they waited well, happier; if nearly out, less tip.
    const patienceFrac = Phaser.Math.Clamp(this.patience / this.patienceMax, 0, 1);
    const happy = quality.stars >= 2 && patienceFrac > 0.15;

    // Payment = base price (only if not a failure) + tip.
    let payment = quality.stars >= 1 ? recipe.price : Math.ceil(recipe.price * 0.3);
    let tip = 0;
    if (happy) {
      tip = Math.round(this.currentArchetype.tipBase * quality.tipMult * (0.6 + patienceFrac));
    }
    payment += tip;

    // Reputation: quality delta + patience bonus/penalty + attractiveness.
    let repDelta = quality.repDelta + (patienceFrac > 0.5 ? 1 : patienceFrac < 0.15 ? -2 : 0);
    this.gs.addReputation(repDelta);

    // Pay out.
    this.gs.addCoins(payment);
    this.hud.floatCoinGain(payment);

    // Stats + missions + collection + secret unlocks.
    this.gs.recordServe(this.currentRecipeId, this.currentArchetype.id, quality.perfect);
    this.missions.onServe({ menuId: this.currentRecipeId, archetypeId: this.currentArchetype.id, perfect: quality.perfect });
    this.maybeUnlockSecret();
    this.checkReputationCollectible();

    // Reaction dialogue.
    const outcome = { happy, tip, payment, quality };
    const lines = buildReaction(this.currentArchetype, recipe, outcome, this.employee, this.customer);
    this.hud.setStatus(happy ? `Pelanggan puas! +${payment} 🪙 (tip ${tip})` : `Hmm, kurang puas. +${payment} 🪙`, happy ? '😊' : '😕');
    this.dialogue.start(lines, () => this.customerLeaves(happy));

    if (this.inChallengeMode()) this.challenge.served += 1;
  }

  /** Serving a customer's favorite repeatedly can unlock their secret recipe. */
  maybeUnlockSecret() {
    const a = this.currentArchetype;
    if (!a.secretRecipe) return;
    if (this.gs.hasRecipe(a.secretRecipe)) return;
    const count = this.gs.s.stats.byCustomer[a.id] || 0;
    if (count >= 3) {
      this.gs.unlockRecipe(a.secretRecipe);
      const r = getRecipe(a.secretRecipe);
      this.toast(`Resep rahasia terbuka: ${r.icon} ${r.name}!`, UITEXT.good);
    }
  }

  checkReputationCollectible() {
    if (this.gs.reputation >= 100 && !this.gs.hasCollected('items', 'bintang_warkop')) {
      this.gs.collect('items', 'bintang_warkop');
      this.toast('Koleksi: ⭐ Bintang Warkop!', UITEXT.star);
    }
  }

  customerLeaves(happy) {
    this.phase = 'leaving';
    const cust = this.customer;
    cust.setFacing(1);
    if (!this.gs.settings.reduceEffects) {
      this.add.text(cust.x, cust.y - 120, happy ? '❤️' : '💢', { fontFamily: 'Segoe UI Emoji', fontSize: '28px' })
        .setOrigin(0.5).setDepth(70);
    }
    this.tweens.add({
      targets: cust, x: GAME_WIDTH + 120, duration: 1500, ease: 'Sine.in',
      onComplete: () => {
        cust.destroy();
        if (this.customer === cust) this.customer = null;
        this.phase = 'idle';
        this.cooked = null;
        if (this.inChallengeMode()) {
          this.hud.setStatus(`Tantangan: ${this.challenge.served}/${this.challenge.target}`, '⏱️');
          this.time.delayedCall(500, () => this.startCycle());
        } else {
          this.hud.setStatus('Menunggu pelanggan...', '🙂');
          const delay = Math.max(500, this.spawnDelayBase / this.timeWeather.spawnMultiplier);
          this.time.delayedCall(delay, () => this.startCycle());
        }
      }
    });
  }

  /** Customer gives up and leaves if patience runs out before being served. */
  giveUpAndLeave() {
    if (this.phase === 'leaving' || this.phase === 'idle') return;
    // close cooking if running
    if (this.scene.isActive('CookingScene')) { this.scene.stop('CookingScene'); this.setToolbarVisible(true); }
    this.hud.hideButton();
    this.gs.addReputation(-3);
    this.hud.setStatus('Pelanggan pergi karena menunggu terlalu lama 😣', '💢');
    this.phase = 'leaving';
    const cust = this.customer;
    if (!cust) { this.phase = 'idle'; this.time.delayedCall(800, () => this.startCycle()); return; }
    cust.setFacing(1);
    this.tweens.add({
      targets: cust, x: GAME_WIDTH + 120, duration: 1200, ease: 'Sine.in',
      onComplete: () => {
        cust.destroy();
        if (this.customer === cust) this.customer = null;
        this.phase = 'idle';
        if (this.inChallengeMode()) this.time.delayedCall(400, () => this.startCycle());
        else this.time.delayedCall(900, () => this.startCycle());
      }
    });
  }

  updatePatience(delta) {
    if (!this.patienceActive || this.phase === 'leaving') return;
    // Patience doesn't drain while the cooking modal is open (fair to player).
    if (this.scene.isActive('CookingScene')) return;
    this.patience -= delta / 1000;
    if (this.patience <= 0) {
      this.patience = 0;
      this.patienceActive = false;
      this.giveUpAndLeave();
      return;
    }
    this.updatePatienceBar();
  }

  updatePatienceBar() {
    if (!this.customer) return;
    if (!this._patienceG) this._patienceG = this.add.graphics().setDepth(80);
    const g = this._patienceG;
    g.clear();
    const frac = Phaser.Math.Clamp(this.patience / this.patienceMax, 0, 1);
    const w = 70, h = 9;
    const x = this.customer.x - w / 2;
    const y = this.customer.y - 150;
    g.fillStyle(0x000000, 0.6); g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 4);
    const col = frac > 0.5 ? 0x4fcf6a : frac > 0.2 ? 0xf2c14e : 0xe25a4e;
    g.fillStyle(col, 1); g.fillRoundedRect(x, y, w * frac, h, 4);
  }

  // ===========================================================================
  // Game modes
  // ===========================================================================
  inChallengeMode() { return this.mode === 'tantangan' && !!this.challenge; }

  startMode(modeId) {
    // Reset any in-flight customer/cooking.
    if (this.scene.isActive('CookingScene')) this.scene.stop('CookingScene');
    this.setToolbarVisible(true);
    this.hud.hideButton();
    if (this.customer) { this.customer.destroy(); this.customer = null; }

    if (modeId === 'tantangan') {
      this.mode = 'tantangan';
      this.gs.enterChallenge({ coins: this.gs.coins }); // sandbox: generous stock, no persist
      this.challenge = { target: 6, served: 0, endsAt: this.time.now + 90000, rewarded: 25 };
      this.hud.setStatus('Tantangan dimulai! 90 detik.', '⏱️');
      this.phase = 'idle';
      this.time.delayedCall(700, () => this.startCycle());
    } else {
      this.mode = 'harian';
      this.phase = 'idle';
      this.hud.setStatus('Mode Harian. Selamat berjualan!', '🏠');
      this.time.delayedCall(700, () => this.startCycle());
    }
  }

  updateChallenge() {
    if (!this.inChallengeMode()) return;
    const left = Math.max(0, this.challenge.endsAt - this.time.now);
    if (this._challengeLabel) {
      this._challengeLabel.setText(`⏱️ ${(left / 1000).toFixed(0)}s   🧑 ${this.challenge.served}/${this.challenge.target}`);
    } else {
      this._challengeLabel = label(this, GAME_WIDTH / 2, 120, '', { size: 18, bold: true, color: UITEXT.accent, origin: [0.5, 0.5] }).setDepth(956);
    }
    if (left <= 0) this.finishChallenge();
  }

  finishChallenge() {
    if (!this.challenge) return;
    const success = this.challenge.served >= this.challenge.target;
    const reward = success ? this.challenge.rewarded : 0;
    const summary = { target: this.challenge.target, served: this.challenge.served, success, reward };
    // stop everything cleanly
    if (this.scene.isActive('CookingScene')) this.scene.stop('CookingScene');
    this.setToolbarVisible(true);
    if (this.customer) { this.customer.destroy(); this.customer = null; }
    if (this._challengeLabel) { this._challengeLabel.destroy(); this._challengeLabel = null; }
    this.phase = 'idle';
    this._pendingReward = reward;
    this.resultOverlay.open(summary);
  }

  endChallenge() {
    // Leave sandbox; grant reward to the REAL save (challenge never persisted).
    this.gs.exitChallenge(this._pendingReward || 0);
    this._pendingReward = 0;
    this.challenge = null;
    this.mode = 'harian';
    this.hud.setCoins(this.gs.coins);
    this.refreshTopBars();
    this.hud.setStatus('Kembali ke Mode Harian.', '🏠');
    this.phase = 'idle';
    this.time.delayedCall(700, () => this.startCycle());
  }

  // ===========================================================================
  toast(msg, color) {
    const t = label(this, GAME_WIDTH / 2, 170, msg, { size: 20, bold: true, color: color || UITEXT.light, origin: [0.5, 0.5] });
    t.setDepth(980).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 160, duration: 300, yoyo: true, hold: 1800, onComplete: () => t.destroy() });
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
