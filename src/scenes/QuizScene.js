import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXTURES } from '../config.js';
import VocabularyManager from '../systems/VocabularyManager.js';
import AudioManager from '../systems/AudioManager.js';

// QuizScene: RIPASSO LAMPO dalla mappa — 5 domande sulle parole di UN livello,
// senza rigiocarlo. Mescola ascolto (senti -> tocca l'icona) e lettura
// (vedi l'icona -> tocca la parola scritta). Perfetto per 5 minuti di inglese.
const ROUNDS = 5;

export default class QuizScene extends Phaser.Scene {
  constructor() {
    super('QuizScene');
  }

  init(data) {
    this.levelNumber = (data && data.level) || 1;
    this.returnNext = (data && data.next) || 1;
  }

  create() {
    const W = GAME_WIDTH;
    this.audio = new AudioManager(this);
    this.sfx = this.registry.get('sfx');
    const music = this.registry.get('music');
    if (music) music.stop(); // silenzio: si ascoltano le parole

    this.cameras.main.setBackgroundColor(0x2a3f55);
    this.add
      .text(W / 2, 36, `⚡ Quick Quiz — Level ${this.levelNumber} ⚡`, {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 64, 'แบบทดสอบเร็ว!', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff' })
      .setOrigin(0.5);

    // Kukkai felice che fa da esaminatrice gentile.
    this.add.image(64, 120, TEXTURES.kukkaiPortrait).setScale(0.7);

    // Punteggio a stelline.
    this.starIcons = [];
    for (let i = 0; i < ROUNDS; i++) {
      this.starIcons.push(
        this.add.text(W / 2 - 76 + i * 38, 96, '☆', { fontSize: '24px', color: '#ffd166' }).setOrigin(0.5)
      );
    }

    const vocab = new VocabularyManager();
    this.words = vocab.getWordsForLevel(this.levelNumber);
    this.round = 0;
    this.score = 0;
    this.failedThisRound = false;
    this.targets = Phaser.Utils.Array.Shuffle(this.words.slice()).slice(0, ROUNDS);
    this.nextRound();
  }

  nextRound() {
    if (this.panel) this.panel.destroy();
    if (this.round >= ROUNDS) {
      this.endQuiz();
      return;
    }
    this.failedThisRound = false;
    const target = this.targets[this.round];
    const reading = this.round % 2 === 1; // si alternano ascolto e lettura

    const others = Phaser.Utils.Array.Shuffle(this.words.filter((w) => w.english !== target.english)).slice(0, 2);
    const options = Phaser.Utils.Array.Shuffle([target, ...others]);

    this.panel = this.add.container(GAME_WIDTH / 2, 260);

    const qText = reading ? 'Which word is this?' : `Which one is "${target.english}"?`;
    const q = this.add
      .text(-14, -110, qText, { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    const speaker = this.add.text(q.width / 2 + 12, -110, '🔊', { fontSize: '24px' }).setOrigin(0.5);
    speaker.setInteractive({ useHandCursor: true });
    speaker.on('pointerdown', () => this.audio.speak(target.english));
    this.panel.add([q, speaker]);
    if (reading) {
      this.panel.add(this.add.text(0, -64, target.icon || '⭐', { fontSize: '40px' }).setOrigin(0.5));
    }

    options.forEach((word, i) => {
      const x = (i - 1) * 150;
      const tile = this.add.container(x, 16);
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.97);
      bg.fillRoundedRect(-60, -55, 120, 110, 14);
      bg.lineStyle(4, 0xffd166, 1);
      bg.strokeRoundedRect(-60, -55, 120, 110, 14);
      let face;
      if (reading) {
        face = this.add
          .text(0, 0, word.english, {
            fontFamily: 'sans-serif',
            fontSize: word.english.length > 8 ? '15px' : '20px',
            color: '#2f6fed',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 108 },
          })
          .setOrigin(0.5);
      } else {
        face = this.add.text(0, 0, word.icon || '⭐', { fontSize: '46px' }).setOrigin(0.5);
      }
      tile.add([bg, face]);
      tile.setSize(120, 110);
      tile.setInteractive(new Phaser.Geom.Rectangle(-60, -55, 120, 110), Phaser.Geom.Rectangle.Contains);
      tile.input.cursor = 'pointer';
      tile.on('pointerdown', () => this.onAnswer(tile, bg, word, target));
      this.panel.add(tile);
    });

    if (!reading) this.audio.speak(target.english);
  }

  onAnswer(tile, bg, word, target) {
    if (word.english === target.english) {
      if (this.sfx) this.sfx.win();
      bg.lineStyle(5, 0x3fa34d, 1);
      bg.strokeRoundedRect(-60, -55, 120, 110, 14);
      this.tweens.add({ targets: tile, scale: 1.15, duration: 130, yoyo: true });
      if (!this.failedThisRound) {
        this.score += 1;
        this.starIcons[this.round].setText('⭐');
        this.tweens.add({ targets: this.starIcons[this.round], scale: 1.5, duration: 160, yoyo: true });
      }
      this.round += 1;
      this.time.delayedCall(600, () => this.nextRound());
    } else {
      if (this.sfx) this.sfx.tink();
      this.failedThisRound = true;
      this.tweens.add({ targets: tile, x: tile.x + 8, duration: 50, yoyo: true, repeat: 3 });
    }
  }

  endQuiz() {
    if (this.sfx) this.sfx.win();
    const msg =
      this.score >= ROUNDS ? 'PERFECT! You are amazing!' : this.score >= 3 ? 'Great job!' : 'Good practice! Try again soon!';
    this.add
      .text(GAME_WIDTH / 2, 250, msg, {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffd166',
        fontStyle: 'bold',
        stroke: '#1a1a2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 60);
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
