import Phaser from 'phaser';
import { t } from '../systems/i18n.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

// PauseScene: overlay di PAUSA sopra il gioco (GameScene o SpaceScene).
// La scena sotto viene messa in pausa; qui si può riprendere o tornare alla mappa.
// NB: la musica usa un setInterval suo (non si ferma con scene.pause), quindi
// la fermiamo noi e la facciamo ripartire al resume con lo stesso tema.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data) {
    this.returnTo = (data && data.returnTo) || 'GameScene';
    this.levelNumber = (data && data.level) || 1;
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.sfx = this.registry.get('sfx');

    // Fermo la musica, ricordando il tema per riprenderlo.
    this.music = this.registry.get('music');
    this.savedTheme = this.music ? this.music.themeKey : null;
    if (this.music) this.music.stop();

    // Velo scuro + pannello.
    this.add.rectangle(W / 2, H / 2, W, H, 0x101020, 0.75);
    const panel = this.add.graphics();
    panel.fillStyle(0x1c1030, 0.96);
    panel.fillRoundedRect(W / 2 - 170, H / 2 - 110, 340, 220, 20);
    panel.lineStyle(4, 0xffd166, 1);
    panel.strokeRoundedRect(W / 2 - 170, H / 2 - 110, 340, 220, 20);

    this.add
      .text(W / 2, H / 2 - 70, '⏸  Paused', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, H / 2 - 40, 'หยุดพัก', { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);

    this.makeButton(W / 2, H / 2 + 8, 'Resume  ▶', 0x2f6fed, () => this.resumeGame());
    this.makeButton(W / 2, H / 2 + 64, t(this, 'mapBtn'), 0x5a5560, () => this.toMap());

    // Tasti: P o ESC riprendono subito.
    this.input.keyboard.on('keydown-P', () => this.resumeGame());
    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
  }

  makeButton(x, y, label, color, onClick) {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-120, -21, 240, 42, 12);
    const txt = this.add
      .text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '19px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    btn.add([bg, txt]);
    btn.setSize(240, 42);
    btn.setInteractive(new Phaser.Geom.Rectangle(-120, -21, 240, 42), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    btn.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      onClick();
    });
    return btn;
  }

  resumeGame() {
    if (this.music && this.savedTheme) this.music.play(this.savedTheme);
    this.scene.resume(this.returnTo);
    this.scene.stop();
  }

  toMap() {
    // Si abbandona il livello (ricomincerà da capo): si torna alla mappa.
    this.scene.stop(this.returnTo);
    this.scene.start('MapScene', { next: this.levelNumber });
  }
}
