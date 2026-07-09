import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXTURES } from '../config.js';
import VocabularyManager from '../systems/VocabularyManager.js';
import AudioManager from '../systems/AudioManager.js';
import QuizEngine from '../systems/QuizEngine.js';

// QuizScene: RIPASSO LAMPO dalla mappa — un giro di domande sulle parole di UN
// livello, senza rigiocarlo. Usa lo stesso MOTORE del quiz di fine livello
// (ascolto, lettura, abbinamento thai, intruso, conta, spelling), con difficoltà
// che cresce col livello. Perfetto per qualche minuto di inglese.
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

    const vocab = new VocabularyManager();
    this.words = vocab.getWordsForLevel(this.levelNumber);
    this.quiz = new QuizEngine(this, {
      words: this.words,
      allWords: vocab.all,
      level: this.levelNumber,
      audio: this.audio,
      yBase: 260,
      starY: 96,
      onComplete: (score, total) => this.endQuiz(score, total),
    });
    this.quiz.start();
  }

  endQuiz(score, total) {
    if (this.sfx) this.sfx.win();
    const msg =
      score >= total ? 'PERFECT! You are amazing!' : score >= Math.ceil(total / 2) ? 'Great job!' : 'Good practice! Try again soon!';
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
