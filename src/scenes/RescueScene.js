import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXTURES } from '../config.js';

// RescueScene: il FINALE. Tutti i livelli finiti -> Captain libera Teacher Kukkai.
// Lieto fine festoso con coriandoli, Kukkai e Captain insieme, e "Play again".
export default class RescueScene extends Phaser.Scene {
  constructor() {
    super('RescueScene');
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    // Musica di festa per il lieto fine.
    const music = this.registry.get('music');
    if (music) music.play('celebration');

    // Sfondo luminoso + prato: aria di festa.
    this.cameras.main.setBackgroundColor(0x9be0ff);
    this.add.rectangle(W / 2, H - 30, W, 60, 0x6fbf73);

    // Un sole/alone dietro Kukkai per dare risalto.
    this.add.circle(W / 2 + 60, H / 2 - 10, 90, 0xfff3b0, 0.7);

    // Kukkai (libera e felice) + Captain accanto a lei.
    this.add.image(W / 2 + 60, H / 2 - 10, TEXTURES.kukkaiPortrait).setScale(1.7);
    this.add.image(W / 2 - 90, H / 2 + 40, TEXTURES.captain).setScale(1.7);

    // Messaggio del lieto fine (inglese + thai, mai italiano).
    this.add
      .text(W / 2, 60, 'You freed Teacher Kukkai! 🎉', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#1a1a2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 100, 'เก่งมาก! คุณคือฮีโร่!', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffe14d',
        stroke: '#1a1a2e',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, H / 2 + 130, 'You learned all the words!', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#1a1a2e',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.startConfetti();
    this.createPlayAgainButton();
  }

  // Coriandoli: stelline colorate che cadono di continuo dall'alto.
  startConfetti() {
    const colors = [0xff5566, 0xffd166, 0x3fa34d, 0x2f6fed, 0xff7eb6, 0x8a5cf6];
    this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        const x = 20 + Math.random() * (GAME_WIDTH - 40);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const star = this.add.star(x, -12, 5, 4, 9, color).setDepth(5);
        this.tweens.add({
          targets: star,
          y: GAME_HEIGHT + 20,
          angle: 360,
          duration: 2400 + Math.random() * 1600,
          onComplete: () => star.destroy(),
        });
      },
    });
  }

  createPlayAgainButton() {
    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 40).setDepth(10);
    const bg = this.add.graphics();
    bg.fillStyle(0x2f6fed, 1);
    bg.fillRoundedRect(-130, -24, 260, 48, 12);
    const label = this.add
      .text(0, 0, 'Play again  ↺   (Space)', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    btn.add([bg, label]);

    btn.setSize(260, 48);
    btn.setInteractive(new Phaser.Geom.Rectangle(-130, -24, 260, 48), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    btn.on('pointerdown', () => this.playAgain());
    this.input.keyboard.once('keydown-SPACE', () => this.playAgain());
    this.input.keyboard.once('keydown-ENTER', () => this.playAgain());
  }

  playAgain() {
    const sfx = this.registry.get('sfx');
    if (sfx) sfx.click();
    // Azzero il progresso e riparto dall'inizio (intro di Kukkai).
    const progress = this.registry.get('progress');
    if (progress) progress.reset();
    this.scene.start('IntroScene');
  }
}
