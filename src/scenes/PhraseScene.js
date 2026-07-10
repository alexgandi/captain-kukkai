import Phaser from 'phaser';
import { t } from '../systems/i18n.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXTURES } from '../config.js';
import AudioManager from '../systems/AudioManager.js';
import { PHRASES, PHRASE_DISTRACTORS } from '../data/phrases.js';
import { showAchievementToasts, getAchievement } from '../systems/Achievements.js';

// PhraseScene: "Build the words you hear!" — le MINI-FRASI. Kukkai pronuncia
// una frasetta di due parole (es. "red apple"), il bambino la RICOSTRUISCE
// toccando le due parole nell'ordine giusto tra alcune tessere. Il ponte tra
// le parole singole imparate e le prime, vere frasi in inglese.
const ROUNDS = 6;

export default class PhraseScene extends Phaser.Scene {
  constructor() {
    super('PhraseScene');
  }

  init(data) {
    this.returnNext = (data && data.next) || 1;
  }

  create() {
    const W = GAME_WIDTH;
    this.audio = new AudioManager(this);
    this.sfx = this.registry.get('sfx');
    const music = this.registry.get('music');
    if (music) music.stop();

    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.add.rectangle(W / 2, GAME_HEIGHT - 20, W, 40, 0x6fbf73);

    this.add
      .text(W / 2, 26, 'Build the words you hear!  🧩', { fontFamily: 'sans-serif', fontSize: '24px', color: '#2f6fed', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 })
      .setOrigin(0.5);
    this.add.text(W / 2, 52, 'ต่อคำที่ได้ยิน!', { fontFamily: 'sans-serif', fontSize: '15px', color: '#333333' }).setOrigin(0.5);
    this.add.image(52, 70, TEXTURES.kukkaiPortrait).setScale(0.55);

    this.starIcons = [];
    for (let i = 0; i < ROUNDS; i++) {
      this.starIcons.push(
        this.add.text(W / 2 - (ROUNDS - 1) * 18 + i * 36, 80, '☆', { fontSize: '22px', color: '#ffd166' }).setOrigin(0.5)
      );
    }

    this.round = 0;
    this.score = 0;
    this.targets = Phaser.Utils.Array.Shuffle(PHRASES.slice()).slice(0, ROUNDS);

    this.audio.speak('Build the words you hear!');
    this.time.delayedCall(1400, () => this.nextRound());
  }

  nextRound() {
    if (this.panel) this.panel.destroy();
    if (this.round >= ROUNDS) {
      this.endGame();
      return;
    }
    this.failed = false;
    this.locked = false;
    const target = this.targets[this.round];
    this.target = target;
    const order = [target.w1.en, target.w2.en]; // ordine corretto
    this.pos = 0;

    const panel = this.add.container(GAME_WIDTH / 2, 250);
    this.panel = panel;

    // 🔊 riascolta la frase.
    const speaker = this.add.text(0, -150, '🔊  Listen', { fontFamily: 'sans-serif', fontSize: '18px', color: '#2f6fed', fontStyle: 'bold' }).setOrigin(0.5);
    speaker.setInteractive({ useHandCursor: true });
    speaker.on('pointerdown', () => this.audio.speak(target.text));
    panel.add(speaker);

    // Indizio: l'immagine della frase.
    panel.add(this.add.text(0, -104, target.show, { fontSize: '46px' }).setOrigin(0.5));

    // Due caselle (una per parola) da riempire in ordine.
    this.slots = [];
    [-90, 90].forEach((sx, i) => {
      const g = this.add.graphics();
      g.lineStyle(3, 0xffd166, 1);
      g.strokeRoundedRect(sx - 80, -40, 160, 46, 10);
      panel.add(g);
      const t = this.add.text(sx, -17, '', { fontFamily: 'sans-serif', fontSize: '22px', color: '#2f6fed', fontStyle: 'bold' }).setOrigin(0.5);
      panel.add(t);
      this.slots.push(t);
    });
    // Il segno "+" tra le due caselle.
    panel.add(this.add.text(0, -17, '+', { fontFamily: 'sans-serif', fontSize: '24px', color: '#88909c' }).setOrigin(0.5));

    // Tessere-parola: le due giuste + due distrattori, mescolate.
    const distractors = Phaser.Utils.Array.Shuffle(PHRASE_DISTRACTORS.slice()).slice(0, 2);
    const tiles = Phaser.Utils.Array.Shuffle([...order, ...distractors]);
    const tw = 150;
    const startX = -((tiles.length - 1) / 2) * (tw + 12);
    tiles.forEach((word, i) => {
      const x = startX + i * (tw + 12);
      const tile = this.add.container(x, 60);
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.97);
      bg.fillRoundedRect(-tw / 2, -26, tw, 52, 11);
      bg.lineStyle(3, 0x2f6fed, 1);
      bg.strokeRoundedRect(-tw / 2, -26, tw, 52, 11);
      const txt = this.add.text(0, 0, word, { fontFamily: 'sans-serif', fontSize: '20px', color: '#2f6fed', fontStyle: 'bold' }).setOrigin(0.5);
      tile.add([bg, txt]);
      tile.setSize(tw, 52);
      tile.setInteractive(new Phaser.Geom.Rectangle(-tw / 2, -26, tw, 52), Phaser.Geom.Rectangle.Contains);
      tile.input.cursor = 'pointer';
      tile.on('pointerdown', () => this.onTile(tile, word, order));
      panel.add(tile);
    });

    this.time.delayedCall(250, () => this.audio.speak(target.text));
  }

  onTile(tile, word, order) {
    if (this.locked || !tile.input || !tile.input.enabled) return;
    if (word === order[this.pos]) {
      // Parola giusta al posto giusto: si posa nella casella.
      if (this.sfx) this.sfx.click();
      this.slots[this.pos].setText(word);
      this.tweens.add({ targets: this.slots[this.pos], scale: 1.3, duration: 120, yoyo: true });
      tile.disableInteractive();
      this.tweens.add({ targets: tile, alpha: 0.25, duration: 150 });
      this.pos += 1;
      if (this.pos >= order.length) {
        this.locked = true;
        this.solved();
      }
    } else {
      // Ordine sbagliato: scossa gentile, si può riprovare.
      if (this.sfx) this.sfx.tink();
      this.failed = true;
      this.tweens.add({ targets: tile, x: tile.x + 8, duration: 50, yoyo: true, repeat: 3 });
      const oops = this.add.text(0, 128, 'Try again!  ลองอีกครั้ง!', { fontFamily: 'sans-serif', fontSize: '17px', color: '#e23b3b' }).setOrigin(0.5);
      this.panel.add(oops);
      this.tweens.add({ targets: oops, alpha: 0, delay: 650, duration: 300, onComplete: () => oops.destroy() });
    }
  }

  solved() {
    if (this.sfx) this.sfx.win();
    this.audio.speak(this.target.text); // risente la frase completa
    if (!this.failed) {
      this.score += 1;
      this.starIcons[this.round].setText('⭐');
      this.tweens.add({ targets: this.starIcons[this.round], scale: 1.5, duration: 160, yoyo: true });
    }
    this.round += 1;
    this.time.delayedCall(1100, () => this.nextRound());
  }

  endGame() {
    if (this.sfx) this.sfx.win();
    this.audio.speak('Wonderful! You made it!');
    // MEDAGLIA "Phrase Builder": si sblocca completando le mini-frasi.
    const progress = this.registry.get('progress');
    if (progress && progress.unlockAchievement('builder')) {
      this.time.delayedCall(600, () => showAchievementToasts(this, [getAchievement('builder')]));
    }
    this.add
      .text(GAME_WIDTH / 2, 150, this.score >= ROUNDS ? 'PERFECT! ⭐' : 'Great words!', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffd166',
        fontStyle: 'bold',
        stroke: '#1a1a2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 44);
    const bg = this.add.graphics();
    bg.fillStyle(0x2f6fed, 1);
    bg.fillRoundedRect(-110, -22, 220, 44, 12);
    const label = this.add.text(0, 0, t(this, 'mapBtn'), { fontFamily: 'sans-serif', fontSize: '19px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.add([bg, label]);
    btn.setSize(220, 44);
    btn.setInteractive(new Phaser.Geom.Rectangle(-110, -22, 220, 44), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    const back = () => {
      if (this.sfx) this.sfx.click();
      this.scene.start('MapScene', { next: this.returnNext });
    };
    btn.on('pointerdown', back);
    this.input.keyboard.once('keydown-SPACE', back);
    this.input.keyboard.once('keydown-ENTER', back);
  }
}
