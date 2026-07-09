import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXTURES } from '../config.js';
import AudioManager from '../systems/AudioManager.js';
import { ACTION_VERBS } from '../data/actionVerbs.js';
import { showAchievementToasts, getAchievement } from '../systems/Achievements.js';

// ActionScene: "Do what I say!" — il gioco dei VERBI D'AZIONE (Total Physical
// Response). Kukkai pronuncia un verbo, il bambino tocca il pulsante giusto e
// Captain esegue davvero il movimento (corre, salta, gira...). Imparare col
// corpo aiuta i piccoli a fissare le parole molto meglio della sola memoria.
const ROUNDS = 6;

export default class ActionScene extends Phaser.Scene {
  constructor() {
    super('ActionScene');
  }

  init(data) {
    this.returnNext = (data && data.next) || 1;
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.audio = new AudioManager(this);
    this.sfx = this.registry.get('sfx');
    const music = this.registry.get('music');
    if (music) music.stop(); // silenzio: si ascoltano i comandi di Kukkai

    // Sfondo allegro: cielo + prato.
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.add.rectangle(W / 2, H - 150, W, 60, 0x6fbf73).setDepth(0);

    // Titolo (inglese + thai).
    this.add
      .text(W / 2, 26, 'Do what I say!  🏃', { fontFamily: 'sans-serif', fontSize: '26px', color: '#2f6fed', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 52, 'ทำตามที่ครูบอก!', { fontFamily: 'sans-serif', fontSize: '15px', color: '#333333' })
      .setOrigin(0.5);

    // Kukkai fa da maestra.
    this.add.image(52, 70, TEXTURES.kukkaiPortrait).setScale(0.55);

    // Stelline (una per comando).
    this.starIcons = [];
    for (let i = 0; i < ROUNDS; i++) {
      this.starIcons.push(
        this.add.text(W / 2 - (ROUNDS - 1) * 18 + i * 36, 78, '☆', { fontSize: '22px', color: '#ffd166' }).setOrigin(0.5)
      );
    }

    // Captain sul palco: è lui che ESEGUE il movimento.
    this.capBase = { x: W / 2, y: 190 };
    this.captain = this.add.image(this.capBase.x, this.capBase.y, TEXTURES.captain).setScale(2);

    // Pulsanti dei verbi: 2 file da 4 (icona + parola).
    this.buttons = [];
    const cols = 4;
    const bw = 178;
    const bh = 62;
    ACTION_VERBS.forEach((verb, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = W / 2 + (c - (cols - 1) / 2) * 190;
      const y = 320 + r * 76;
      const btn = this.add.container(x, y);
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.97);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
      bg.lineStyle(4, 0xffd166, 1);
      bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
      const icon = this.add.text(-bw / 2 + 30, 0, verb.icon, { fontSize: '30px' }).setOrigin(0.5);
      const word = this.add.text(6, 0, verb.english, { fontFamily: 'sans-serif', fontSize: '22px', color: '#2f6fed', fontStyle: 'bold' }).setOrigin(0.5);
      btn.add([bg, icon, word]);
      btn.setSize(bw, bh);
      btn.setInteractive(new Phaser.Geom.Rectangle(-bw / 2, -bh / 2, bw, bh), Phaser.Geom.Rectangle.Contains);
      btn.input.cursor = 'pointer';
      btn.on('pointerdown', () => this.onAnswer(verb, btn));
      this.buttons.push(btn);
    });

    // Prompt centrale ("Listen!" / il verbo appena eseguito).
    this.prompt = this.add
      .text(W / 2, 120, '', { fontFamily: 'sans-serif', fontSize: '20px', color: '#e23b3b', fontStyle: 'bold' })
      .setOrigin(0.5);

    this.round = 0;
    this.score = 0;
    this.busy = false;
    this.targets = Phaser.Utils.Array.Shuffle(ACTION_VERBS.slice()).slice(0, ROUNDS);

    // Intro parlata, poi il primo comando.
    this.audio.speak('Listen, and do what I say!');
    this.time.delayedCall(1300, () => this.nextRound());
  }

  nextRound() {
    if (this.round >= ROUNDS) {
      this.endGame();
      return;
    }
    this.failed = false;
    this.busy = false;
    this.target = this.targets[this.round];
    this.prompt.setText('Listen...  🔊');
    // Kukkai pronuncia il verbo (MP3 vero se c'è, altrimenti voce sintetica).
    this.time.delayedCall(250, () => this.audio.speak(this.target.english));
  }

  onAnswer(verb, btn) {
    if (this.busy) return;
    if (verb.english === this.target.english) {
      // GIUSTO: Captain esegue il movimento, stellina se al primo colpo.
      this.busy = true;
      if (this.sfx) this.sfx.win();
      this.prompt.setText(`${verb.icon}  ${verb.english.toUpperCase()}!`);
      this.tweens.add({ targets: btn, scale: 1.12, duration: 120, yoyo: true });
      if (!this.failed) {
        this.starIcons[this.round].setText('⭐');
        this.tweens.add({ targets: this.starIcons[this.round], scale: 1.5, duration: 160, yoyo: true });
        this.score += 1;
      }
      this.performAction(verb.anim, () => {
        this.round += 1;
        this.time.delayedCall(350, () => this.nextRound());
      });
    } else {
      // SBAGLIATO: scossa gentile, si riascolta il comando e si riprova.
      if (this.sfx) this.sfx.tink();
      this.failed = true;
      this.tweens.add({ targets: btn, x: btn.x + 8, duration: 50, yoyo: true, repeat: 3 });
      this.time.delayedCall(300, () => this.audio.speak(this.target.english));
    }
  }

  // Captain ESEGUE il verbo: una piccola animazione diversa per ognuno.
  performAction(anim, done) {
    const cap = this.captain;
    const bx = this.capBase.x;
    const by = this.capBase.y;
    const finish = () => {
      cap.setPosition(bx, by);
      cap.setAngle(0);
      cap.setScale(2);
      cap.clearTint();
      cap.setAlpha(1);
      done();
    };
    switch (anim) {
      case 'run':
        if (this.anims.exists('captain_walk')) cap.play('captain_walk');
        this.tweens.add({ targets: cap, x: bx + 90, duration: 300, yoyo: true, repeat: 1, onComplete: () => { cap.stop && cap.stop(); finish(); } });
        break;
      case 'jump':
        this.tweens.add({ targets: cap, y: by - 80, duration: 260, yoyo: true, repeat: 1, ease: 'Sine.easeOut', onComplete: finish });
        break;
      case 'stop':
        cap.setTint(0xff5566);
        this.tweens.add({ targets: cap, scale: 2.2, duration: 120, yoyo: true, repeat: 2, onComplete: finish });
        break;
      case 'clap':
        this.tweens.add({ targets: cap, scaleX: 2.5, duration: 90, yoyo: true, repeat: 3, onComplete: finish });
        break;
      case 'spin':
        this.tweens.add({ targets: cap, angle: 360, duration: 600, onComplete: finish });
        break;
      case 'fly':
        this.tweens.add({ targets: cap, y: by - 110, duration: 500, yoyo: true, ease: 'Sine.easeInOut', onComplete: finish });
        break;
      case 'swim':
        this.tweens.add({ targets: cap, angle: 18, x: bx + 60, duration: 240, yoyo: true, repeat: 1, onComplete: finish });
        break;
      case 'wave':
        this.tweens.add({ targets: cap, angle: 18, duration: 130, yoyo: true, repeat: 3, onComplete: finish });
        break;
      default:
        this.time.delayedCall(400, finish);
    }
  }

  endGame() {
    if (this.sfx) this.sfx.win();
    this.audio.speak('Amazing! You did it!');
    this.prompt.setText('');
    // MEDAGLIA "Mover": si sblocca giocando ai verbi d'azione.
    const progress = this.registry.get('progress');
    if (progress && progress.unlockAchievement('mover')) {
      this.time.delayedCall(600, () => showAchievementToasts(this, [getAchievement('mover')]));
    }
    this.add
      .text(GAME_WIDTH / 2, 150, this.score >= ROUNDS ? 'PERFECT! ⭐' : 'Great moves!', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffd166',
        fontStyle: 'bold',
        stroke: '#1a1a2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 40);
    const bg = this.add.graphics();
    bg.fillStyle(0x2f6fed, 1);
    bg.fillRoundedRect(-110, -22, 220, 44, 12);
    const label = this.add.text(0, 0, 'Map  🗺️  (Space)', { fontFamily: 'sans-serif', fontSize: '19px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
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
