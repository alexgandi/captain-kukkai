import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXTURES } from '../config.js';

// CertificateScene: il DIPLOMA di Captain! Dopo il finale, una pergamena
// celebra il traguardo: quante parole ha imparato, i timbri degli 8 livelli
// con le stelle, i manghi trovati. Lo screenshot da mandare ai nonni. 🎓
const STAMPS = [
  { level: 1, icon: '🌴' },
  { level: 2, icon: '❄️' },
  { level: 3, icon: '🌋' },
  { level: 4, icon: '🌙' },
  { level: 5, icon: '🏙️' },
  { level: 6, icon: '🌳' },
  { level: 7, icon: '🏰' },
  { level: 8, icon: '🚀' },
];

export default class CertificateScene extends Phaser.Scene {
  constructor() {
    super('CertificateScene');
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.progress = this.registry.get('progress');
    const music = this.registry.get('music');
    if (music) music.play('celebration');

    // Pergamena: fondo caldo + doppia cornice dorata.
    this.cameras.main.setBackgroundColor(0xf6ecd4);
    const frame = this.add.graphics();
    frame.lineStyle(6, 0xc9a13b, 1);
    frame.strokeRoundedRect(14, 14, W - 28, H - 28, 14);
    frame.lineStyle(2, 0xc9a13b, 1);
    frame.strokeRoundedRect(26, 26, W - 52, H - 52, 10);
    // Angoli decorativi.
    [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]].forEach(([x, y]) => {
      this.add.circle(x, y, 7, 0xc9a13b);
      this.add.circle(x, y, 3, 0xf6ecd4);
    });

    // Titolo.
    this.add
      .text(W / 2, 52, '🎓  Certificate of English  🎓', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#8a5a17',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 82, 'ประกาศนียบัตรภาษาอังกฤษ', { fontFamily: 'sans-serif', fontSize: '15px', color: '#8a5a17' })
      .setOrigin(0.5);

    // Kukkai (felice!) e Captain ai lati.
    this.add.image(86, 150, TEXTURES.kukkaiPortrait).setScale(0.9);
    this.add.image(W - 86, 152, TEXTURES.captain).setScale(1.5);

    // Il cuore del diploma.
    const words = this.progress ? this.progress.getCollectedWords().length : 0;
    this.add
      .text(W / 2, 128, 'Teacher Kukkai proudly certifies that', {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        color: '#5a4326',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
    const name = this.add
      .text(W / 2, 168, 'CAPTAIN', {
        fontFamily: 'Georgia, serif',
        fontSize: '44px',
        color: '#2f6fed',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScale(0.2);
    this.tweens.add({ targets: name, scale: 1, duration: 600, ease: 'Back.easeOut' });
    this.add
      .text(W / 2, 208, `learned  ${words}  English words!`, {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#5a4326',
      })
      .setOrigin(0.5);
    // La data: il diploma diventa un ricordo vero da conservare.
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    this.add
      .text(W / 2, 236, `Completed on ${dateStr}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#8a5a17',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    // I TIMBRI degli 8 livelli, con le stelline sotto (pop uno alla volta).
    const startX = W / 2 - 3.5 * 84;
    STAMPS.forEach((s, i) => {
      const x = startX + i * 84;
      const y = 278;
      const badge = this.add.container(x, y).setScale(0.01);
      const ring = this.add.circle(0, 0, 26, 0xffffff).setStrokeStyle(3, 0xc9a13b);
      const icon = this.add.text(0, 0, s.icon, { fontSize: '24px' }).setOrigin(0.5);
      badge.add([ring, icon]);
      const stars = this.progress ? this.progress.getStars(s.level) : 0;
      const starTxt = this.add
        .text(x, y + 36, '⭐'.repeat(stars) || '·', { fontSize: '9px' })
        .setOrigin(0.5)
        .setAlpha(0);
      this.tweens.add({ targets: badge, scale: 1, delay: 400 + i * 140, duration: 260, ease: 'Back.easeOut' });
      this.tweens.add({ targets: starTxt, alpha: 1, delay: 500 + i * 140, duration: 200 });
    });

    // Totali + firma.
    const totalStars = STAMPS.reduce((sum, s) => sum + (this.progress ? this.progress.getStars(s.level) : 0), 0);
    const totalMangoes = STAMPS.reduce((sum, s) => sum + (this.progress ? this.progress.getMangoes(s.level) : 0), 0);
    this.add
      .text(W / 2, 336, `⭐ ${totalStars}/24    ·    🥭 ${totalMangoes}/24`, {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#8a5a17',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 366, '— Teacher Kukkai  🌸', {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        color: '#5a4326',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    this.startConfetti();
    this.createPlayAgainButton();
  }

  // Coriandoli discreti (non devono coprire il testo del diploma).
  startConfetti() {
    const colors = [0xff5566, 0xffd166, 0x3fa34d, 0x2f6fed, 0xff7eb6];
    this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        const x = 30 + Math.random() * (GAME_WIDTH - 60);
        const star = this.add.star(x, -10, 5, 3, 7, colors[Math.floor(Math.random() * colors.length)]).setDepth(5).setAlpha(0.8);
        this.tweens.add({
          targets: star,
          y: GAME_HEIGHT + 20,
          angle: 300,
          duration: 3200 + Math.random() * 1800,
          onComplete: () => star.destroy(),
        });
      },
    });
  }

  createPlayAgainButton() {
    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 38).setDepth(10);
    const bg = this.add.graphics();
    bg.fillStyle(0x2f6fed, 1);
    bg.fillRoundedRect(-130, -22, 260, 44, 12);
    const label = this.add
      .text(0, 0, 'Play again  ↺   (Space)', { fontFamily: 'sans-serif', fontSize: '19px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    btn.add([bg, label]);
    btn.setSize(260, 44);
    btn.setInteractive(new Phaser.Geom.Rectangle(-130, -22, 260, 44), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    btn.on('pointerdown', () => this.playAgain());
    this.input.keyboard.once('keydown-SPACE', () => this.playAgain());
    this.input.keyboard.once('keydown-ENTER', () => this.playAgain());
  }

  playAgain() {
    const sfx = this.registry.get('sfx');
    if (sfx) sfx.click();
    const progress = this.registry.get('progress');
    if (progress) progress.reset();
    this.scene.start('IntroScene');
  }
}
