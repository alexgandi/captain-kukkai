import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXTURES, SAFE } from '../config.js';
import { t } from '../systems/i18n.js';
import { makeButton } from '../systems/UiKit.js';

// MapScene: la MAPPA DEL VIAGGIO. Tra un livello e l'altro mostra il percorso di
// Captain verso Kukkai: 8 tappe (giungla -> ... -> castello -> spazio), le stelle
// guadagnate, Captain sulla tappa corrente e — finché non la salvi — l'astronave
// dello Yaksha che tiene Kukkai alla fine del sentiero. Dà il senso di AVVICINARSI.
const STOPS = [
  { level: 1, icon: '🌴', x: 80, y: 300, color: 0x3fa34d },
  { level: 2, icon: '❄️', x: 175, y: 210, color: 0x9ed7f2 },
  { level: 3, icon: '🌋', x: 280, y: 290, color: 0xc0392b },
  { level: 4, icon: '🌙', x: 385, y: 200, color: 0x44446a },
  { level: 5, icon: '🏙️', x: 480, y: 285, color: 0x7d8494 },
  { level: 6, icon: '🌳', x: 575, y: 205, color: 0x2f7a3a },
  { level: 7, icon: '🏰', x: 665, y: 280, color: 0x5a5560 },
  { level: 8, icon: '🚀', x: 730, y: 150, color: 0x2b2540 },
];

export default class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  init(data) {
    this.nextLevel = (data && data.next) || 1;
    this.starting = false; // il flag anti doppio-avvio riparte pulito ogni volta
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.progress = this.registry.get('progress');
    this.sfx = this.registry.get('sfx');
    // Sulla mappa suona la SIGLA del gioco (ElevenLabs); fallback: tema quieto.
    const music = this.registry.get('music');
    if (music) music.stop();
    if (this.cache.audio.exists('theme_song')) {
      this.themeSound = this.sound.add('theme_song', { loop: true, volume: 0.35 });
      this.themeSound.play();
      // destroy(), non solo stop(): ogni visita alla mappa ne crea uno nuovo
      // e i suoni fermati-ma-vivi si accumulano nel sound manager.
      this.events.once('shutdown', () => this.themeSound && this.themeSound.destroy());
    } else if (music) {
      music.play('night');
    }

    // Sfondo: sera stellata sopra la carta della mappa (via il colore piatto).
    const skyG = this.add.graphics().setDepth(-12);
    skyG.fillGradientStyle(0x17293f, 0x17293f, 0x2e4a63, 0x2e4a63, 1);
    skyG.fillRect(0, 0, W, H);
    // Stelle che brillano piano + una luna gentile.
    for (let i = 0; i < 26; i++) {
      const s = this.add.circle((i * 173) % W, 14 + ((i * 67) % 150), i % 3 ? 1.3 : 2, 0xfff6d8, 0.8).setDepth(-11);
      this.tweens.add({ targets: s, alpha: 0.25, duration: 900 + (i % 5) * 400, yoyo: true, repeat: -1, delay: i * 130 });
    }
    const moon = this.add.circle(W - 90, 52, 20, 0xfff3c4, 0.95).setDepth(-11);
    this.add.circle(W - 97, 46, 16, 0x2e4a63, 1).setDepth(-10); // falce (morso scuro)
    this.tweens.add({ targets: moon, y: 56, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.rectangle(W / 2, H - 60, W, 140, 0x1d3140).setDepth(-10);

    // Le coordinate delle tappe sono disegnate per 800px: sugli schermi più
    // larghi (fullscreen telefono) CENTRO tutto il sentiero.
    const dx = Math.round((W - 800) / 2);
    this.stops = STOPS.map((s) => ({ ...s, x: s.x + dx }));

    // Titolo (inglese + thai).
    this.add
      .text(W / 2, 30, "🗺️ Captain's Journey", {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 58, 'การเดินทางของกัปตัน', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff' })
      .setOrigin(0.5);

    // Sentiero puntinato tra le tappe.
    const g = this.add.graphics().setDepth(-5);
    g.fillStyle(0xf2d9a0, 0.8);
    for (let i = 0; i < this.stops.length - 1; i++) {
      const a = this.stops[i];
      const b = this.stops[i + 1];
      const segs = 9;
      for (let s = 1; s < segs; s++) {
        const t = s / segs;
        g.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 3);
      }
    }

    // Le 8 tappe.
    this.stops.forEach((stop) => this.createStop(stop));

    // Kukkai prigioniera alla fine del sentiero (finché non finisci il gioco).
    const last = this.stops[this.stops.length - 1];
    if (!this.progress || !this.progress.isLevelDone(8)) {
      const ship = this.add.image(last.x + 26, last.y - 78, 'boss_ship').setScale(0.5).setDepth(5);
      this.tweens.add({ targets: ship, y: last.y - 86, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const kukkai = this.add.image(last.x + 12, last.y - 46, 'kukkai_scared').setScale(0.15).setDepth(5);
      this.tweens.add({ targets: kukkai, y: last.y - 52, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.text(last.x + 20, last.y - 112, 'Help!', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffe14d' }).setOrigin(0.5);
    }

    // La BANCARELLA del Mercato di Kukkai: si sblocca con TUTTI i 24 manghi.
    this.createMarketStall();

    // Pulsanti dei mini-giochi (verbi d'azione + mini-frasi): sempre disponibili,
    // in basso a sinistra, lontani dalle tappe e dal pulsante Start.
    this.createMiniGameButton(SAFE.left + 74, '🏃', t(this, 'action'), 0x3fa34d, 'ActionScene');
    this.createMiniGameButton(SAFE.left + 196, '🧩', t(this, 'phrases'), 0x8e44c8, 'PhraseScene');

    // Pulsante "Start!".
    this.createStartButton();
  }

  // Pillola di scorciatoia per un mini-gioco (pausa attiva sempre giocabile).
  createMiniGameButton(x, icon, text, color, sceneKey) {
    const btn = this.add.container(x, GAME_HEIGHT - 30).setDepth(6);
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-56, -22, 112, 44, 12);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeRoundedRect(-56, -22, 112, 44, 12);
    const ic = this.add.text(-36, 0, icon, { fontSize: '22px' }).setOrigin(0.5);
    const label = this.add.text(12, 0, text, { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.add([g, ic, label]);
    this.tweens.add({ targets: btn, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    btn.setSize(112, 44);
    btn.setInteractive(new Phaser.Geom.Rectangle(-56, -22, 112, 44), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    btn.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      this.scene.start(sceneKey, { next: this.nextLevel });
    });
  }

  // Bancarella del Mercato: si APRE da 8 manghi trovati in totale, e una
  // partita COSTA 3 manghi dal portafoglio. Così ogni mango nascosto ha uno
  // scopo immediato e rigiocare i livelli per raccoglierli diventa un loop
  // (prima serviva un impossibile 24/24 e la bancarella restava un miraggio).
  createMarketStall() {
    const total = this.progress ? this.progress.getMangoTotal() : 0;
    const wallet = this.progress ? this.progress.getMangoWallet() : 0;
    const unlocked = total >= 8;

    const stall = this.add.container(SAFE.left + 74, 130).setDepth(6);
    const g = this.add.graphics();
    // Tendina a strisce + bancone.
    g.fillStyle(unlocked ? 0xb0392e : 0x5a6570, 1);
    g.fillRect(-38, -26, 76, 12);
    g.fillStyle(unlocked ? 0xfff3e0 : 0x8a93a0, 1);
    for (let x = -38; x < 38; x += 19) g.fillTriangle(x, -14, x + 19, -14, x + 9.5, -4);
    g.fillStyle(unlocked ? 0x9c6b3f : 0x4a5560, 1);
    g.fillRect(-30, 2, 60, 16);
    const icon = this.add.text(0, 8, unlocked ? '🥭' : '🔒', { fontSize: '18px' }).setOrigin(0.5);
    const label = this.add
      .text(0, 34, unlocked ? `${t(this, 'market')} · 🥭 ${wallet}` : `🥭 ${total}/8`, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: unlocked ? '#ffd166' : '#aab6c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    stall.add([g, icon, label]);

    if (unlocked) {
      this.tweens.add({ targets: stall, scale: 1.08, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      stall.setSize(90, 70);
      stall.setInteractive(new Phaser.Geom.Rectangle(-45, -35, 90, 70), Phaser.Geom.Rectangle.Contains);
      stall.input.cursor = 'pointer';
      stall.on('pointerdown', () => {
        // Un giro al mercato costa 3 manghi: se non bastano, la bancarella
        // scuote la testa e mostra quanti ne servono (mai punitiva, solo chiara).
        if (this.progress && this.progress.getMangoWallet() >= 3 && this.progress.spendMangoes(3)) {
          if (this.sfx) this.sfx.click();
          this.scene.start('MarketScene', { next: this.nextLevel });
        } else {
          if (this.sfx) this.sfx.tink();
          this.tweens.add({ targets: stall, angle: 6, duration: 70, yoyo: true, repeat: 3, onComplete: () => stall.setAngle(0) });
          if (!this.needMangoesMsg || !this.needMangoesMsg.active) {
            this.needMangoesMsg = this.add
              .text(stall.x, 190, 'Find 3 🥭 in the levels!', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffe14d', stroke: '#1a1a2e', strokeThickness: 4 })
              .setOrigin(0.5)
              .setDepth(7);
            this.tweens.add({ targets: this.needMangoesMsg, alpha: 0, delay: 1800, duration: 400, onComplete: () => this.needMangoesMsg.destroy() });
          }
        }
      });
    }
  }

  createStop(stop) {
    const done = this.progress && this.progress.isLevelDone(stop.level);
    const current = stop.level === this.nextLevel;
    const locked = !done && !current;

    // Cerchio della tappa (colore dell'ambiente; grigio se bloccata).
    const circle = this.add.circle(stop.x, stop.y, 26, locked ? 0x3a4756 : stop.color, 1).setDepth(1);
    circle.setStrokeStyle(3, done ? 0x3fa34d : current ? 0xffd166 : 0x22303c, 1);
    const icon = this.add
      .text(stop.x, stop.y, locked ? '🔒' : stop.icon, { fontSize: '22px' })
      .setOrigin(0.5)
      .setDepth(2);
    if (locked) icon.setAlpha(0.7);

    // Numero del livello sotto.
    this.add
      .text(stop.x, stop.y + 38, `${stop.level}`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: current ? '#ffd166' : '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(2);

    // Stelline guadagnate + manghi dorati trovati (per i livelli completati).
    if (done && this.progress) {
      const stars = this.progress.getStars(stop.level);
      const txt = '⭐'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
      this.add.text(stop.x, stop.y + 56, txt, { fontSize: '11px' }).setOrigin(0.5).setDepth(2);
      const m = this.progress.getMangoes(stop.level);
      this.add
        .text(stop.x, stop.y + 72, `🥭 ${m}/3`, { fontFamily: 'sans-serif', fontSize: '10px', color: m >= 3 ? '#ffd166' : '#c9d4dd' })
        .setOrigin(0.5)
        .setDepth(2);
    }

    // Tappa CORRENTE: anello pulsante + Captain in piedi sopra + tap per partire.
    if (current) {
      const ring = this.add.circle(stop.x, stop.y, 33).setStrokeStyle(3, 0xffd166, 0.9).setDepth(1);
      this.tweens.add({ targets: ring, scale: 1.18, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
      const captain = this.add.image(stop.x, stop.y - 44, TEXTURES.captain).setScale(0.85).setDepth(3);
      this.tweens.add({ targets: captain, y: stop.y - 50, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      circle.setInteractive({ useHandCursor: true });
      circle.on('pointerdown', () => this.startLevel());
    } else if (done) {
      // Tappa COMPLETATA: toccala per RIGIOCARLA o fare il QUIZ lampo.
      circle.setInteractive({ useHandCursor: true });
      circle.on('pointerdown', () => this.openStopMenu(stop));
    }
  }

  // Popup su una tappa completata: "Play again" (rigioca) o "Quiz" (ripasso lampo).
  openStopMenu(stop) {
    if (this.stopMenu) this.stopMenu.destroy();
    if (this.sfx) this.sfx.click();
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const menu = (this.stopMenu = this.add.container(0, 0).setDepth(30));

    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x101020, 0.6);
    veil.setInteractive(); // blocca i tap sotto; tap sul velo = chiudi
    veil.on('pointerdown', () => menu.destroy());

    const panel = this.add.graphics();
    panel.fillStyle(0x1c1030, 0.97);
    panel.fillRoundedRect(W / 2 - 150, H / 2 - 92, 300, 184, 18);
    panel.lineStyle(4, 0xffd166, 1);
    panel.strokeRoundedRect(W / 2 - 150, H / 2 - 92, 300, 184, 18);
    const title = this.add
      .text(W / 2, H / 2 - 62, `${stop.icon}  Level ${stop.level}`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    menu.add([veil, panel, title]);

    const mkBtn = (y, label, color, onClick) => {
      const btn = this.add.container(W / 2, y);
      const bg = this.add.graphics();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-115, -20, 230, 40, 11);
      const txt = this.add.text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      btn.add([bg, txt]);
      btn.setSize(230, 40);
      btn.setInteractive(new Phaser.Geom.Rectangle(-115, -20, 230, 40), Phaser.Geom.Rectangle.Contains);
      btn.input.cursor = 'pointer';
      btn.on('pointerdown', () => {
        if (this.sfx) this.sfx.click();
        onClick();
      });
      menu.add(btn);
    };
    mkBtn(GAME_HEIGHT / 2 - 14, t(this, 'playAgain'), 0x2f6fed, () => {
      if (stop.level === 8) this.scene.start('SpaceScene');
      else this.scene.start('GameScene', { level: stop.level });
    });
    mkBtn(GAME_HEIGHT / 2 + 38, t(this, 'quickQuiz'), 0x8e44c8, () => {
      this.scene.start('QuizScene', { level: stop.level, next: this.nextLevel });
    });
  }

  createStartButton() {
    const label = this.nextLevel === 8 ? t(this, 'blastOff') : t(this, 'startLevel', this.nextLevel);
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 32, 290, 46, {
      label,
      color: 0x2f6fed,
      fontSize: 19,
      pulse: true,
      depth: 10,
      onClick: () => this.startLevel(),
    });
    this.input.keyboard.once('keydown-SPACE', () => this.startLevel());
    this.input.keyboard.once('keydown-ENTER', () => this.startLevel());
  }

  startLevel() {
    if (this.starting) return; // niente doppi avvii
    // Col popup "rigioca/quiz" aperto, SPAZIO/INVIO non devono far partire il
    // livello sotto (il velo blocca solo i tocchi, non la tastiera).
    if (this.stopMenu && this.stopMenu.active) return;
    this.starting = true;
    if (this.sfx) this.sfx.click();
    if (this.nextLevel === 8) this.scene.start('SpaceScene');
    else this.scene.start('GameScene', { level: this.nextLevel });
  }
}
