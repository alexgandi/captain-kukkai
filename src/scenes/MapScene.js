import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXTURES } from '../config.js';

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
    const music = this.registry.get('music');
    if (music) music.play('night'); // tema quieto da "pagina di atlante"

    // Sfondo: carta da mappa serale.
    this.cameras.main.setBackgroundColor(0x274156);
    this.add.rectangle(W / 2, H - 60, W, 140, 0x1d3140).setDepth(-10);

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
    for (let i = 0; i < STOPS.length - 1; i++) {
      const a = STOPS[i];
      const b = STOPS[i + 1];
      const segs = 9;
      for (let s = 1; s < segs; s++) {
        const t = s / segs;
        g.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 3);
      }
    }

    // Le 8 tappe.
    STOPS.forEach((stop) => this.createStop(stop));

    // Kukkai prigioniera alla fine del sentiero (finché non finisci il gioco).
    const last = STOPS[STOPS.length - 1];
    if (!this.progress || !this.progress.isLevelDone(8)) {
      const ship = this.add.image(last.x + 26, last.y - 78, 'boss_ship').setScale(0.5).setDepth(5);
      this.tweens.add({ targets: ship, y: last.y - 86, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const kukkai = this.add.image(last.x + 12, last.y - 46, 'kukkai_scared').setScale(0.3).setDepth(5);
      this.tweens.add({ targets: kukkai, y: last.y - 52, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.text(last.x + 20, last.y - 112, 'Help!', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffe14d' }).setOrigin(0.5);
    }

    // Pulsante "Start!".
    this.createStartButton();
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
    }
  }

  createStartButton() {
    const label = this.nextLevel === 8 ? 'Blast off!  🚀   (Space)' : `Start level ${this.nextLevel}  ▶   (Space)`;
    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 32).setDepth(10);
    const bg = this.add.graphics();
    bg.fillStyle(0x2f6fed, 1);
    bg.fillRoundedRect(-140, -22, 280, 44, 12);
    const txt = this.add
      .text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '19px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    btn.add([bg, txt]);
    btn.setSize(280, 44);
    btn.setInteractive(new Phaser.Geom.Rectangle(-140, -22, 280, 44), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    btn.on('pointerdown', () => this.startLevel());
    this.input.keyboard.once('keydown-SPACE', () => this.startLevel());
    this.input.keyboard.once('keydown-ENTER', () => this.startLevel());
  }

  startLevel() {
    if (this.starting) return; // niente doppi avvii
    this.starting = true;
    if (this.sfx) this.sfx.click();
    if (this.nextLevel === 8) this.scene.start('SpaceScene');
    else this.scene.start('GameScene', { level: this.nextLevel });
  }
}
