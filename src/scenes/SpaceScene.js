import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SAFE } from '../config.js';
import VocabularyManager from '../systems/VocabularyManager.js';
import AudioManager from '../systems/AudioManager.js';
import VocabularyCard from '../ui/VocabularyCard.js';
import HeartsDisplay from '../ui/HeartsDisplay.js';
import TouchControls from '../ui/TouchControls.js';
import { KUKKAI_LEVEL_START } from '../data/dialogues.js';
import { playFx } from '../systems/playFx.js';

// SpaceScene = il livello finale (L8), un'altra "modalità": Captain NON corre più,
// è dentro una NAVICELLA e vola libero. Niente gravità, niente salto. Spara LASER,
// schiva le COMETE (traiettoria diagonale) e affronta gli ALIENI con le loro navicelle.
// Riusa i sistemi educativi del gioco (vocabolario, carta, voce, cuori).
const SPACE_LEVEL = 8;
const SHIP_SPEED = 250; // velocità di volo (px/s)
const LASER_SPEED = 640;
const MAX_LIVES = 3;

export default class SpaceScene extends Phaser.Scene {
  constructor() {
    super('SpaceScene');
  }

  create() {
    this.vocab = new VocabularyManager();
    this.audio = new AudioManager(this);
    this.card = new VocabularyCard(this);
    this.progress = this.registry.get('progress');
    this.sfx = this.registry.get('sfx');
    this.music = this.registry.get('music');
    if (this.music) this.music.play('space');

    this.levelNumber = SPACE_LEVEL;
    this.restarting = false;
    this.completing = false;
    // Dopo un'esplosione la scena riparte: ricordo che c'è stata una morte (stelle).
    this.hadDeath = !!(this.scene.settings.data && this.scene.settings.data.hadDeath);

    // NIENTE GRAVITÀ nello spazio (il gioco base ne ha: la spengo per questa scena).
    this.physics.world.gravity.y = 0;

    const words = this.vocab.getWordsForLevel(SPACE_LEVEL);
    // Il mondo si estende in orizzontale: si vola a destra verso il varco finale.
    const spacing = 380;
    this.worldWidth = 360 + words.length * spacing + 300;
    this.physics.world.setBounds(0, 0, this.worldWidth, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.worldWidth, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor(0x0b0a1f); // spazio profondo

    this.addStarfield();

    // --- NAVICELLA DI CAPTAIN ---
    this.ship = this.physics.add.sprite(120, GAME_HEIGHT / 2, 'ship');
    this.ship.setCollideWorldBounds(true);
    this.ship.setDepth(10);
    this.shipInvuln = false;

    // La camera segue la nave SOLO in orizzontale (la Y resta libera sullo schermo).
    this.cameras.main.startFollow(this.ship, true, 0.12, 0);
    this.cameras.main.setDeadzone(180, GAME_HEIGHT);

    // --- GRUPPI FISICI: laser di Captain, laser alieni, comete, alieni ---
    this.lasers = this.physics.add.group();
    this.alienShots = this.physics.add.group();
    this.comets = this.physics.add.group();
    this.aliens = this.physics.add.group();

    this.buildAliens(words, spacing);

    // --- POWER-UP: orb luminosi -> TRIPLO LASER per 6 secondi ---
    this.tripleUntil = 0;
    this.buildPowerups();

    // --- 3 MANGHI DORATI fluttuanti (come nei livelli platform) ---
    this.buildMangoes();

    // Collisioni.
    this.physics.add.overlap(this.lasers, this.aliens, (laser, alien) => this.laserHitsAlien(laser, alien), null, this);
    this.physics.add.overlap(this.ship, this.aliens, (ship, alien) => this.damageShip(alien.x), null, this);
    this.physics.add.overlap(this.ship, this.alienShots, (ship, shot) => { shot.destroy(); this.damageShip(shot.x); }, null, this);
    this.physics.add.overlap(this.ship, this.comets, (ship, comet) => this.damageShip(comet.x), null, this);

    // --- BOSS FINALE: il demone-alieno che tiene prigioniera Kukkai. Appare quando
    // hai imparato TUTTE le parole (sconfitti tutti gli alieni). Vedi startBossFight().
    this.bossStarted = false;
    this.bossActive = false;

    // --- COMANDI ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', fire: 'K' });
    this.input.keyboard.on('keydown-K', () => this.fireLaser());
    this.laserCd = 0;
    this.cometTimer = 900;

    // Controlli touch (tablet): pad direzioni + pulsante fuoco.
    this.touchControls = new TouchControls(this, 'space');

    // Pulsante PAUSA (o tasto P).
    const pauseBtn = this.add
      .text(GAME_WIDTH - SAFE.right - 16, 20, '⏸️', { fontSize: '26px' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(2000)
      .setPadding(10) // area di tocco più grande (dita sul telefono)
      .setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this.openPause());
    this.input.keyboard.on('keydown-P', () => this.openPause());

    // --- HUD ---
    this.lives = MAX_LIVES;
    this.hearts = new HeartsDisplay(this, MAX_LIVES);

    let controls = 'Arrow keys / WASD: fly   ·   [K] Laser   ·   Avoid comets!';
    this.add
      .text(GAME_WIDTH / 2, 20, controls, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#0b0a1f',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
    this.add
      .text(GAME_WIDTH / 2, 42, 'บังคับยาน · [K] ยิงเลเซอร์ · หลบดาวหาง!', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#7fe0ff',
        stroke: '#0b0a1f',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);

    this.showBanner('SPACE! Fly free & shoot LASERS', 'อวกาศ! บินอิสระและยิงเลเซอร์');

    // Kukkai annuncia il tema (solo alla prima partenza, non dopo una morte).
    if (!this.hadDeath) {
      this.time.delayedCall(500, () => this.audio.speak(KUKKAI_LEVEL_START[8]));
    }
  }

  // Campo stellare + qualche grande pianeta, con parallasse (profondità).
  addStarfield() {
    // Stelle piccole su due strati.
    [{ sf: 0.2, n: 90, r: 1.2, a: 0.7 }, { sf: 0.45, n: 60, r: 1.8, a: 0.9 }].forEach((layer, li) => {
      for (let i = 0; i < layer.n; i++) {
        const x = ((i * 197 + li * 71) % this.worldWidth);
        const y = (i * 89 + li * 43) % GAME_HEIGHT;
        const star = this.add.circle(x, y, layer.r, 0xffffff, layer.a).setScrollFactor(layer.sf).setDepth(-20);
        if (i % 5 === 0) this.tweens.add({ targets: star, alpha: 0.2, duration: 800 + (i % 6) * 180, yoyo: true, repeat: -1 });
      }
    });
    // Pianeti/sole/luna sparsi (decorativi, parallasse lenta).
    const bodies = [
      { x: 500, y: 110, r: 44, c: 0xf2a94e, ring: false }, // sole/pianeta arancio
      { x: 1500, y: 330, r: 60, c: 0x4a78c8, ring: true }, // pianeta con anello
      { x: 2600, y: 90, r: 34, c: 0xd8d8e0, ring: false }, // luna
      { x: 3600, y: 300, r: 52, c: 0x8e44c8, ring: false }, // pianeta viola
      { x: 4600, y: 120, r: 40, c: 0x4be08a, ring: true },
    ];
    bodies.forEach((b) => {
      const p = this.add.circle(b.x, b.y, b.r, b.c).setScrollFactor(0.3).setDepth(-18);
      p.setAlpha(0.9);
      if (b.ring) {
        const ring = this.add.ellipse(b.x, b.y, b.r * 3, b.r * 0.8, 0xffffff, 0).setScrollFactor(0.3).setDepth(-17);
        ring.setStrokeStyle(4, 0xf2d14e, 0.7);
      }
    });
  }

  // Crea gli alieni (uno per parola) lungo il mondo, ad altezze alternate.
  buildAliens(words, spacing) {
    this.alienList = [];
    words.forEach((w, i) => {
      const x = 460 + i * spacing;
      const y = 110 + (i % 4) * 80; // altezze varie
      const alien = this.aliens.create(x, y, 'alien_ship');
      alien.body.setAllowGravity(false);
      alien.setDepth(9);
      alien.wordEnglish = w.english;
      alien.health = 2; // due colpi di laser
      alien.baseY = y;
      alien.shootTimer = 900 + Math.random() * 1600;
      // Ondeggiamento su e giù (solo estetico).
      this.tweens.add({ targets: alien, y: y - 22, duration: 1200 + (i % 5) * 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // Bollicina-icona della parola sopra la navicella (anticipazione).
      const bubble = this.add.container(x, y - 36).setDepth(9);
      const bg = this.add.circle(0, 0, 13, 0xffffff, 0.88).setStrokeStyle(2, 0x37e0ff, 1);
      const icon = this.add
        .text(0, 0, w.icon || '⭐', { fontSize: '14px', color: '#333333' })
        .setOrigin(0.5);
      bubble.add([bg, icon]);
      alien.iconBubble = bubble;
      this.alienList.push(alien);
    });
  }

  // ORB del TRIPLO LASER: 3 lungo il mondo. Raccolto = ventaglio di 3 laser per 6s.
  buildPowerups() {
    [0.25, 0.55, 0.8].forEach((frac, i) => {
      const x = Math.round(this.worldWidth * frac);
      const y = 120 + (i % 2) * 180;
      const glow = this.add.circle(x, y, 20, 0x37e0ff, 0.25).setDepth(6);
      const orb = this.add.star(x, y, 6, 8, 15, 0x7fe9ff).setDepth(7);
      this.tweens.add({ targets: [orb, glow], scale: 1.25, duration: 550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.physics.add.existing(orb, true);
      this.physics.add.overlap(this.ship, orb, () => {
        if (!orb.active) return;
        orb.destroy();
        glow.destroy();
        this.tripleUntil = this.time.now + 6000;
        if (this.sfx) this.sfx.magic();
        // Avviso lampo.
        const t = this.add
          .text(GAME_WIDTH / 2, 130, '⚡ TRIPLE LASER! ⚡', {
            fontFamily: 'sans-serif',
            fontSize: '26px',
            color: '#7fe9ff',
            fontStyle: 'bold',
            stroke: '#0b0a1f',
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(3000);
        this.tweens.add({ targets: t, alpha: 0, y: 100, delay: 1300, duration: 400, onComplete: () => t.destroy() });
      });
    });
  }

  // 3 MANGHI DORATI fluttuanti nello spazio (in punti fuori rotta: da esploratore).
  buildMangoes() {
    this.mangoesCollected = 0;
    this.mangoHud = this.add
      .text(120, 22, '🥭 0/3', { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffd166', fontStyle: 'bold', stroke: '#0b0a1f', strokeThickness: 3 })
      .setScrollFactor(0)
      .setDepth(2000);

    [
      { frac: 0.3, y: 70 },
      { frac: 0.6, y: 380 },
      { frac: 0.85, y: 60 },
    ].forEach((pos) => {
      const x = Math.round(this.worldWidth * pos.frac);
      const halo = this.add.circle(x, pos.y, 16, 0xffd166, 0.28).setDepth(5);
      const mango = this.add.text(x, pos.y, '🥭', { fontSize: '24px' }).setOrigin(0.5).setDepth(6);
      this.physics.add.existing(mango, true);
      this.tweens.add({ targets: [mango, halo], y: pos.y - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.physics.add.overlap(this.ship, mango, () => {
        if (!mango.active) return;
        this.mangoesCollected += 1;
        this.mangoHud.setText(`🥭 ${this.mangoesCollected}/3`);
        if (this.sfx) this.sfx.click();
        mango.destroy();
        halo.destroy();
      });
    });
  }

  // Apre il menu di PAUSA (overlay): riprendi o torna alla mappa.
  openPause() {
    if (this.completing || this.restarting) return;
    if (this.sfx) this.sfx.click();
    this.scene.pause();
    this.scene.launch('PauseScene', { returnTo: 'SpaceScene', level: 8 });
  }

  fireLaser() {
    if (this.completing || this.restarting) return;
    if (this.time.now < this.laserCd) return;
    this.laserCd = this.time.now + 260;
    // Col power-up attivo si spara un VENTAGLIO di 3; altrimenti un laser solo.
    const triple = this.time.now < this.tripleUntil;
    const vys = triple ? [-90, 0, 90] : [0];
    vys.forEach((vy) => {
      const laser = this.lasers.create(this.ship.x + 30, this.ship.y, 'laser_player');
      laser.body.setAllowGravity(false);
      laser.setVelocity(LASER_SPEED, vy);
      laser.setDepth(8);
      laser.bornX = this.ship.x;
    });
    playFx(this, 'sfx_laserfx', 0.4, () => this.sfx && this.sfx.magic()); // pew! vero
  }

  // Un alieno spara un laser MIRATO verso Captain.
  alienShoot(alien) {
    const angle = Math.atan2(this.ship.y - alien.y, this.ship.x - alien.x);
    const shot = this.alienShots.create(alien.x - 26, alien.y, 'laser_alien');
    shot.body.setAllowGravity(false);
    shot.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
    shot.setRotation(angle);
    shot.setDepth(8);
    if (this.sfx) this.sfx.tink();
  }

  // Fa cadere una COMETA con traiettoria DIAGONALE (dall'alto-destra al basso-sinistra),
  // così è più difficile da schivare delle cadute verticali dei livelli precedenti.
  spawnComet() {
    const camRight = this.cameras.main.scrollX + GAME_WIDTH;
    const x = camRight + 40; // entra dal bordo destro
    const y = 20 + Math.random() * 120; // parte in alto
    const comet = this.comets.create(x, y, 'comet');
    comet.body.setAllowGravity(false);
    comet.setDepth(7);
    comet.setVelocity(-230, 150); // diagonale verso il basso-sinistra
    comet.setRotation(Math.PI); // la scia guarda indietro (in alto-destra)
    // Scia luminosa che pulsa.
    this.tweens.add({ targets: comet, alpha: 0.7, duration: 160, yoyo: true, repeat: -1 });
  }

  // Laser di Captain contro un alieno: due colpi -> sconfitta + parola imparata.
  laserHitsAlien(laser, alien) {
    if (!alien.active || alien.defeated) return;
    laser.destroy();
    alien.health -= 1;
    if (alien.health > 0) {
      alien.setTintFill(0xffffff);
      this.time.delayedCall(80, () => alien.active && alien.clearTint());
      if (this.sfx) this.sfx.tink();
      return;
    }
    this.defeatAlien(alien);
  }

  defeatAlien(alien) {
    if (alien.defeated) return;
    alien.defeated = true;
    const word = this.vocab.getWordByEnglish(alien.wordEnglish);
    const { x, y } = alien;
    this.tweens.killTweensOf(alien);
    if (alien.iconBubble) alien.iconBubble.destroy();
    alien.destroy();
    if (this.sfx) this.sfx.defeat();
    this.explode(x, y);

    if (word) {
      this.vocab.collect(word.english);
      if (this.progress) this.progress.addWord(word.english);
      this.card.show(word);
      this.audio.speak(word.english);
      if (this.vocab.isLevelComplete(SPACE_LEVEL) && !this.bossStarted) this.startBossFight();
    }
  }

  explode(x, y) {
    for (let i = 0; i < 9; i++) {
      const s = this.add.star(x, y, 5, 4, 9, i % 2 ? 0x4be08a : 0xffe14d).setDepth(9);
      const ang = ((Math.PI * 2) / 9) * i;
      this.tweens.add({
        targets: s,
        x: x + Math.cos(ang) * 55,
        y: y + Math.sin(ang) * 55,
        alpha: 0,
        scale: 0,
        duration: 460,
        ease: 'Cubic.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  // --- SCONTRO COL BOSS: compare quando hai imparato TUTTE le parole ---
  // Il demone-alieno entra da destra tenendo prigioniera Kukkai (in un raggio traente).
  // La camera si BLOCCA (arena fissa) e Captain resta confinato allo schermo.
  startBossFight() {
    if (this.bossStarted) return;
    this.bossStarted = true;

    // Blocco la camera dove siamo: arena fissa.
    this.cameras.main.stopFollow();
    this.arenaLeft = this.cameras.main.scrollX;
    this.arenaRight = this.arenaLeft + GAME_WIDTH;

    // Il boss entra volando da destra fino alla sua posizione di combattimento.
    const bx = this.arenaRight + 100;
    const by = GAME_HEIGHT / 2;
    this.boss = this.physics.add.sprite(bx, by, 'boss_ship');
    this.boss.body.setAllowGravity(false);
    this.boss.setDepth(9);
    this.bossMaxHealth = 16;
    this.bossHealth = this.bossMaxHealth;
    this.boss.homeX = this.arenaRight - 120;
    this.boss.baseY = by;
    this.bossMoveT = 0;
    this.bossAttackTimer = 1600;
    this.bossEnraged = false; // FASE 2: sotto metà vita si INFURIA
    this.bossShotToggle = false;

    // Kukkai prigioniera (spaventata) in un raggio traente sotto al boss.
    this.kukkaiBeam = this.add.circle(bx, by + 66, 22, 0x37e0ff, 0.25).setDepth(8);
    this.kukkaiCaptive = this.add.image(bx, by + 66, 'kukkai_scared').setScale(0.21).setDepth(9);

    // Il boss entra in scena.
    this.tweens.add({ targets: [this.boss, this.kukkaiBeam, this.kukkaiCaptive], x: `-=${bx - this.boss.homeX}`, duration: 1200, ease: 'Sine.easeOut',
      onComplete: () => { this.bossActive = true; } });

    // Barra della vita del boss (in alto, fissa).
    this.bossHpBg = this.add.rectangle(GAME_WIDTH / 2, 74, 360, 16, 0x201a2e).setScrollFactor(0).setDepth(2100).setStrokeStyle(2, 0xf2c14e);
    this.bossHpFill = this.add.rectangle(GAME_WIDTH / 2 - 178, 74, 356, 12, 0xb0392e).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2101);
    this.bossHpLabel = this.add.text(GAME_WIDTH / 2, 74, 'YAKSHA — free Kukkai!', { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffe14d', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(2102);

    // I laser di Captain colpiscono il boss. NB: con overlap(gruppo, sprite) Phaser
    // può passare gli argomenti in ordine (boss, laser) invece di (laser, boss) —
    // quindi ricavo il laser come "quello che NON è il boss" (robusto all'ordine).
    this.physics.add.overlap(
      this.lasers,
      this.boss,
      (a, b) => this.hitBoss(a === this.boss ? b : a),
      null,
      this
    );

    // La musica cambia: tema del BOSS, incalzante. E LUI ti sfida (voce vera!).
    if (this.music) this.music.play('boss');
    this.time.delayedCall(700, () => playFx(this, 'yaksha_boss', 0.75));

    this.showBanner('BOSS! Free Kukkai — blast him!', 'บอส! ช่วยครูกุ๊กไก่ — ยิงมัน!');
  }

  // Un laser di Captain colpisce il boss.
  hitBoss(laser) {
    if (!this.bossActive || this.completing) return;
    laser.destroy();
    this.bossHealth = Math.max(0, this.bossHealth - 1);
    this.boss.setTintFill(0xffffff);
    this.time.delayedCall(70, () => this.boss && this.boss.active && this.boss.clearTint());
    if (this.sfx) this.sfx.tink();
    // Aggiorno la barra della vita.
    this.bossHpFill.width = 356 * (this.bossHealth / this.bossMaxHealth);
    // FASE 2: sotto metà vita lo Yaksha si INFURIA.
    if (!this.bossEnraged && this.bossHealth > 0 && this.bossHealth <= this.bossMaxHealth / 2) {
      this.enrageBoss();
    }
    if (this.bossHealth <= 0) this.bossDefeated();
  }

  // Il boss si infuria: più veloce, più cattivo, spara anche a SPIRALE.
  enrageBoss() {
    this.bossEnraged = true;
    this.boss.setTint(0xff9977); // arrossato di rabbia
    this.cameras.main.shake(350, 0.012);
    playFx(this, 'yaksha_laugh', 0.6);
    this.bossAttackTimer = 900; // attacca subito
    this.showBanner('The Yaksha is FURIOUS!', 'ยักษ์โกรธแล้ว! ระวัง!');
  }

  // Il boss spara: VENTAGLIO di 3 verso Captain; da infuriato, alterna il
  // ventaglio (più veloce) a una SPIRALE di 8 colpi in tutte le direzioni.
  bossShoot() {
    const spiral = this.bossEnraged && (this.bossShotToggle = !this.bossShotToggle);
    if (spiral) {
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8;
        const shot = this.alienShots.create(this.boss.x - 20, this.boss.y, 'laser_alien');
        shot.body.setAllowGravity(false);
        shot.setVelocity(Math.cos(ang) * 260, Math.sin(ang) * 260);
        shot.setRotation(ang);
        shot.setDepth(8);
      }
    } else {
      const base = Math.atan2(this.ship.y - this.boss.y, this.ship.x - this.boss.x);
      const speed = this.bossEnraged ? 360 : 320;
      [-0.28, 0, 0.28].forEach((off) => {
        const shot = this.alienShots.create(this.boss.x - 50, this.boss.y, 'laser_alien');
        shot.body.setAllowGravity(false);
        shot.setVelocity(Math.cos(base + off) * speed, Math.sin(base + off) * speed);
        shot.setRotation(base + off);
        shot.setDepth(8);
      });
    }
    if (this.sfx) this.sfx.magic();
  }

  bossDefeated() {
    if (this.completing) return;
    this.completing = true;
    this.bossActive = false;
    if (this.progress) this.progress.markLevelDone(SPACE_LEVEL);
    if (this.sfx) this.sfx.win();
    if (this.music) this.music.play('celebration'); // vittoria!
    playFx(this, 'yaksha_defeat', 0.75); // il cattivo si dispera!

    // STELLE: 1 = boss battuto, +1 = mai esploso, +1 = cuori pieni.
    this.earnedStars = 1 + (this.hadDeath ? 0 : 1) + (this.lives === MAX_LIVES ? 1 : 0);
    if (this.progress) this.progress.setStars(SPACE_LEVEL, this.earnedStars);
    if (this.progress) this.progress.setMangoes(SPACE_LEVEL, this.mangoesCollected || 0);

    // Grande esplosione del boss + Kukkai liberata (sale libera).
    this.explode(this.boss.x, this.boss.y);
    this.explode(this.boss.x - 20, this.boss.y + 20);
    this.boss.destroy();
    this.kukkaiBeam.destroy();
    this.kukkaiCaptive.setTexture('kukkai_portrait'); // libera: torna a SORRIDERE!
    this.tweens.add({ targets: this.kukkaiCaptive, y: this.kukkaiCaptive.y - 40, scale: 0.6, duration: 700, ease: 'Back.easeOut' });
    [this.bossHpBg, this.bossHpFill, this.bossHpLabel].forEach((o) => o.destroy());
    this.cameras.main.flash(500, 255, 240, 160);

    this.showBanner('Kukkai is free! You did it!', 'ครูกุ๊กไก่เป็นอิสระแล้ว! เก่งมาก!');
    // Verso il finale.
    this.time.delayedCall(1600, () => this.scene.start('LevelCompleteScene', { level: SPACE_LEVEL, stars: this.earnedStars }));
  }

  // Danno alla nave (comete / alieni / laser alieni). Contraccolpo + invulnerabilità.
  damageShip(fromX) {
    if (this.shipInvuln || this.completing || this.restarting) return;
    this.shipInvuln = true;
    this.lives = Math.max(0, this.lives - 1);
    this.hearts.set(this.lives);
    if (this.sfx) this.sfx.hurt();

    // Contraccolpo lontano dalla sorgente.
    const dir = this.ship.x < fromX ? -1 : 1;
    this.ship.setVelocity(dir * 160, 0);

    // Lampeggìo di invulnerabilità.
    this.tweens.add({ targets: this.ship, alpha: 0.3, duration: 120, yoyo: true, repeat: 5, onComplete: () => (this.ship.alpha = 1) });
    this.time.delayedCall(1300, () => (this.shipInvuln = false));

    if (this.lives <= 0) this.shipDestroyed();
  }

  // Vite finite: si ricomincia il livello da capo (come nel resto del gioco).
  shipDestroyed() {
    if (this.restarting) return;
    this.restarting = true;
    this.explode(this.ship.x, this.ship.y);
    this.ship.setVisible(false);
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Try again!  ลองอีกครั้ง!', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);
    this.time.delayedCall(1100, () => this.scene.restart({ hadDeath: true }));
  }

  // Banner annuncio (come nei livelli platform), inglese + thai.
  showBanner(enText, thText) {
    const banner = this.add.container(GAME_WIDTH / 2, 200).setScrollFactor(0).setDepth(4000);
    const w = 500;
    const h = 92;
    const bg = this.add.graphics();
    bg.fillStyle(0x101033, 0.92);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(4, 0x37e0ff, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    const en = this.add.text(0, -14, enText, { fontFamily: 'sans-serif', fontSize: '26px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const th = this.add.text(0, 22, thText, { fontFamily: 'sans-serif', fontSize: '20px', color: '#7fe0ff' }).setOrigin(0.5);
    banner.add([bg, en, th]);
    banner.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut' });
    this.tweens.add({ targets: banner, alpha: 0, y: 170, delay: 3200, duration: 500, onComplete: () => banner.destroy() });
  }

  update(time, delta) {
    if (this.restarting || this.completing) return;

    // --- Volo libero della navicella (8 direzioni, velocità costante) ---
    const c = this.cursors;
    const k = this.keys;
    const t = this.touchState || {};
    let vx = 0;
    let vy = 0;
    if (c.left.isDown || k.left.isDown || t.left) vx -= SHIP_SPEED;
    if (c.right.isDown || k.right.isDown || t.right) vx += SHIP_SPEED;
    if (c.up.isDown || k.up.isDown || t.up) vy -= SHIP_SPEED;
    if (c.down.isDown || k.down.isDown || t.down) vy += SHIP_SPEED;
    // Se non sto prendendo danno (che dà contraccolpo), applico i comandi.
    if (!this.shipInvuln || (vx !== 0 || vy !== 0)) this.ship.setVelocity(vx, vy);

    // Durante lo scontro col boss la camera è ferma: confino Captain all'arena.
    if (this.bossStarted) {
      this.ship.x = Phaser.Math.Clamp(this.ship.x, this.arenaLeft + 24, this.arenaRight - 24);
    }

    // Sparo continuo tenendo premuto K o il pulsante touch (il cooldown regola il ritmo).
    if (k.fire.isDown || t.fire) this.fireLaser();

    // --- Alieni: sparano verso Captain a intervalli ---
    this.aliens.getChildren().forEach((alien) => {
      if (!alien.active || alien.defeated) return;
      // La bollicina-icona segue l'ondeggiamento della navicella.
      if (alien.iconBubble) alien.iconBubble.setPosition(alien.x, alien.y - 36);
      alien.shootTimer -= delta;
      if (alien.shootTimer <= 0) {
        alien.shootTimer = 1800 + Math.random() * 1600;
        if (Math.abs(alien.x - this.ship.x) < 560) this.alienShoot(alien);
      }
    });

    // --- BOSS: ondeggia su e giù e spara. Da INFURIATO è più rapido e ampio ---
    if (this.bossActive && this.boss && this.boss.active) {
      this.bossMoveT += delta;
      const amp = this.bossEnraged ? 130 : 90;
      const freq = this.bossEnraged ? 500 : 700;
      this.boss.y = this.boss.baseY + Math.sin(this.bossMoveT / freq) * amp;
      this.kukkaiBeam.y = this.boss.y + 66;
      this.kukkaiCaptive.y = this.boss.y + 66;
      this.bossAttackTimer -= delta;
      if (this.bossAttackTimer <= 0) {
        this.bossAttackTimer = this.bossEnraged ? 1100 + Math.random() * 500 : 1700 + Math.random() * 900;
        this.bossShoot();
      }
    }

    // --- Comete: spawn a intervalli (non durante il boss), ripulite fuori scena ---
    if (!this.bossStarted) {
      this.cometTimer -= delta;
      if (this.cometTimer <= 0) {
        this.cometTimer = 1200 + Math.random() * 900;
        this.spawnComet();
      }
    }
    this.cleanup(this.comets, (o) => o.y > GAME_HEIGHT + 60 || o.x < this.cameras.main.scrollX - 80);
    this.cleanup(this.lasers, (o) => o.x > o.bornX + GAME_WIDTH + 40);
    this.cleanup(this.alienShots, (o) => o.x < -40 || o.x > this.worldWidth + 40 || o.y < -40 || o.y > GAME_HEIGHT + 40);
  }

  // Distrugge gli oggetti di un gruppo che soddisfano una condizione (fuori scena).
  cleanup(group, isDone) {
    group.getChildren().forEach((o) => {
      if (o.active && isDone(o)) o.destroy();
    });
  }
}
