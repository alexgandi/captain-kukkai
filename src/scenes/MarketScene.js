import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXTURES } from '../config.js';
import VocabularyManager from '../systems/VocabularyManager.js';
import AudioManager from '../systems/AudioManager.js';

// MarketScene: il MERCATO DI KUKKAI — minigioco bonus (sbloccato con 24/24 manghi).
// Piovono tessere-parola dal cielo del mercato; la voce di Kukkai chiama una
// parola ("elephant!") e devi TOCCARE quella giusta al volo. 60 secondi, punteggio.
// È ascolto ATTIVO puro: senti → cerca → prendi.
const GAME_SECONDS = 60;

export default class MarketScene extends Phaser.Scene {
  constructor() {
    super('MarketScene');
  }

  init(data) {
    this.returnNext = (data && data.next) || 1; // per tornare alla mappa com'era
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.audio = new AudioManager(this);
    this.sfx = this.registry.get('sfx');
    const music = this.registry.get('music');
    if (music) music.play('city'); // aria vivace da mercato

    // --- Scenografia: mercato thai caldo, tendone a strisce ---
    this.cameras.main.setBackgroundColor(0xffe3b3);
    this.add.rectangle(W / 2, H - 24, W, 48, 0x9c6b3f); // bancone di legno
    // Tendone a strisce rosso/bianco.
    for (let x = 0; x < W; x += 80) {
      this.add.triangle(x + 40, 34, 0, 0, 80, 0, 40, 26, x % 160 === 0 ? 0xb0392e : 0xfff3e0).setDepth(5);
    }
    this.add.rectangle(W / 2, 12, W, 24, 0xb0392e).setDepth(5);
    this.add
      .text(W / 2, 12, "🥭 Kukkai's Market! · ตลาดครูกุ๊กไก่", {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(6);

    // Kukkai (felice) in un angolo, che "chiama" le parole.
    this.add.image(64, H - 90, TEXTURES.kukkaiPortrait).setScale(0.85).setDepth(6);

    // --- HUD: punteggio + tempo ---
    this.score = 0;
    this.timeLeft = GAME_SECONDS;
    this.scoreText = this.add
      .text(16, 44, '⭐ 0', { fontFamily: 'sans-serif', fontSize: '22px', color: '#8a5a17', fontStyle: 'bold' })
      .setDepth(6);
    this.timeText = this.add
      .text(W - 16, 44, `⏱ ${GAME_SECONDS}`, { fontFamily: 'sans-serif', fontSize: '22px', color: '#8a5a17', fontStyle: 'bold' })
      .setOrigin(1, 0)
      .setDepth(6);

    // La scritta con la parola chiamata (accanto a Kukkai) + 🔊 per risentirla.
    this.callText = this.add
      .text(120, H - 104, '', { fontFamily: 'sans-serif', fontSize: '22px', color: '#b0392e', fontStyle: 'bold' })
      .setDepth(6);
    const speaker = this.add.text(120, H - 74, '🔊', { fontSize: '22px' }).setDepth(6).setInteractive({ useHandCursor: true });
    speaker.on('pointerdown', () => this.target && this.audio.speak(this.target.english));

    // --- Parole: quelle IMPARATE (a mercato sbloccato = tutte e 94) ---
    const vocab = new VocabularyManager();
    const progress = this.registry.get('progress');
    const learned = progress ? new Set(progress.getCollectedWords()) : new Set();
    this.words = vocab.all.filter((w) => learned.has(w.english));
    if (this.words.length < 3) this.words = vocab.all.slice(); // rete di sicurezza

    this.fallers = [];
    this.gameOver = false;
    this.nextRound();

    // Timer dei 60 secondi.
    this.time.addEvent({
      delay: 1000,
      repeat: GAME_SECONDS - 1,
      callback: () => {
        this.timeLeft -= 1;
        this.timeText.setText(`⏱ ${this.timeLeft}`);
        if (this.timeLeft <= 0) this.endGame();
      },
    });
  }

  // Un round: 3 parole a caso, una è il BERSAGLIO (Kukkai la pronuncia).
  nextRound() {
    if (this.gameOver) return;
    this.clearFallers();
    const options = Phaser.Utils.Array.Shuffle(this.words.slice()).slice(0, 3);
    this.target = options[Math.floor(Math.random() * options.length)];
    this.callText.setText(`"${this.target.english}"!`);
    this.audio.speak(this.target.english);

    // Le 3 tessere cadono da posizioni sparse, a velocità leggermente diverse.
    const lanes = Phaser.Utils.Array.Shuffle([200, 400, 600]);
    options.forEach((word, i) => {
      const x = lanes[i] + (Math.random() * 60 - 30);
      const tile = this.add.container(x, -50).setDepth(4);
      const bg = this.add.circle(0, 0, 34, 0xffffff, 0.97);
      bg.setStrokeStyle(3, 0xffd166);
      const icon = this.add.text(0, 0, word.icon || '⭐', { fontSize: '30px' }).setOrigin(0.5);
      tile.add([bg, icon]);
      tile.setSize(76, 76);
      tile.setInteractive(new Phaser.Geom.Circle(0, 0, 42), Phaser.Geom.Circle.Contains);
      tile.on('pointerdown', () => this.onTap(tile, word));
      // Caduta con leggera oscillazione.
      this.tweens.add({ targets: tile, y: GAME_HEIGHT + 60, duration: 5200 + Math.random() * 1200, onComplete: () => this.onTileFell(tile) });
      this.tweens.add({ targets: tile, x: x + 26, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.fallers.push(tile);
    });
  }

  onTap(tile, word) {
    if (this.gameOver || !tile.active) return;
    if (word.english === this.target.english) {
      // PRESA! Punto, scintille, round nuovo.
      this.score += 1;
      this.scoreText.setText(`⭐ ${this.score}`);
      if (this.sfx) this.sfx.win();
      for (let i = 0; i < 6; i++) {
        const s = this.add.star(tile.x, tile.y, 5, 3, 8, 0xffd166).setDepth(6);
        const ang = ((Math.PI * 2) / 6) * i;
        this.tweens.add({ targets: s, x: tile.x + Math.cos(ang) * 40, y: tile.y + Math.sin(ang) * 34, alpha: 0, scale: 0, duration: 380, onComplete: () => s.destroy() });
      }
      this.nextRound();
    } else {
      // Sbagliata: scossa gentile, si può ritentare.
      if (this.sfx) this.sfx.tink();
      this.tweens.add({ targets: tile, angle: 12, duration: 60, yoyo: true, repeat: 2 });
    }
  }

  // Una tessera tocca terra: se non ne restano, nuovo round (stessa energia, zero punizioni).
  onTileFell(tile) {
    tile.destroy();
    this.fallers = this.fallers.filter((t) => t.active);
    if (!this.gameOver && this.fallers.length === 0) this.nextRound();
  }

  clearFallers() {
    this.fallers.forEach((t) => t.active && t.destroy());
    this.fallers = [];
  }

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.clearFallers();
    if (this.sfx) this.sfx.win();

    // Pannello finale: punteggio + torna alla mappa.
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1030, 0.72).setDepth(10);
    const panel = this.add.graphics().setDepth(11);
    panel.fillStyle(0xfff3e0, 0.98);
    panel.fillRoundedRect(W / 2 - 190, H / 2 - 100, 380, 200, 18);
    panel.lineStyle(4, 0xffd166, 1);
    panel.strokeRoundedRect(W / 2 - 190, H / 2 - 100, 380, 200, 18);
    this.add
      .text(W / 2, H / 2 - 56, "Time's up! 🥭", { fontFamily: 'sans-serif', fontSize: '28px', color: '#8a5a17', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(12);
    this.add
      .text(W / 2, H / 2 - 12, `You caught ${this.score} words!`, { fontFamily: 'sans-serif', fontSize: '22px', color: '#5a4326' })
      .setOrigin(0.5)
      .setDepth(12);

    const btn = this.add.container(W / 2, H / 2 + 54).setDepth(12);
    const bg = this.add.graphics();
    bg.fillStyle(0x2f6fed, 1);
    bg.fillRoundedRect(-110, -22, 220, 44, 12);
    const label = this.add.text(0, 0, 'Map  🗺️  (Space)', { fontFamily: 'sans-serif', fontSize: '19px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.add([bg, label]);
    btn.setSize(220, 44);
    btn.setInteractive(new Phaser.Geom.Rectangle(-110, -22, 220, 44), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    const back = () => this.scene.start('MapScene', { next: this.returnNext });
    btn.on('pointerdown', back);
    this.input.keyboard.once('keydown-SPACE', back);
    this.input.keyboard.once('keydown-ENTER', back);
  }
}
