import Phaser from 'phaser';
import { t } from '../systems/i18n.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { STICKERS } from '../data/stickers.js';
import AudioManager from '../systems/AudioManager.js';

// AlbumScene: l'ALBUM DEGLI STICKER a tema Thailandia. Uno sticker nuovo per
// ogni livello completato (+1 col quiz perfetto): si riempie rigiocando.
// Tocca uno sticker vinto per sentirne il nome in inglese (anche l'album insegna!).
export default class AlbumScene extends Phaser.Scene {
  constructor() {
    super('AlbumScene');
  }

  init(data) {
    this.returnTo = (data && data.returnTo) || 'MenuScene';
  }

  create() {
    const W = GAME_WIDTH;
    const p = this.registry.get('progress');
    this.sfx = this.registry.get('sfx');
    this.audio = new AudioManager(this);
    this.cameras.main.setBackgroundColor(0x1f3a30); // verde giungla scuro

    const owned = new Set(p ? p.getStickers() : []);
    this.add.text(W / 2, 24, '📔 Sticker Album', { fontFamily: 'sans-serif', fontSize: '26px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5);
    this.add
      .text(W / 2, 52, `${owned.size} / ${STICKERS.length}   •   สมุดสติกเกอร์`, { fontFamily: 'sans-serif', fontSize: '14px', color: '#bfe0cf' })
      .setOrigin(0.5);

    // Griglia 6 x 4 di figurine.
    const cols = 6;
    const cw = 122;
    const ch = 82;
    const x0 = W / 2 - ((cols - 1) / 2) * cw;
    STICKERS.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = x0 + col * cw;
      const y = 108 + row * (ch + 6);
      const got = owned.has(s.id);

      const card = this.add.container(x, y);
      const bg = this.add.graphics();
      bg.fillStyle(got ? 0xfff8e7 : 0x2a4a3e, 1);
      bg.fillRoundedRect(-55, -37, 110, 74, 10);
      bg.lineStyle(2.5, got ? 0xffd166 : 0x3a5c4e, 1);
      bg.strokeRoundedRect(-55, -37, 110, 74, 10);
      const icon = this.add.text(0, -10, got ? s.icon : '❓', { fontSize: '26px' }).setOrigin(0.5).setAlpha(got ? 1 : 0.45);
      const name = this.add
        .text(0, 22, got ? s.en : '· · ·', { fontFamily: 'sans-serif', fontSize: '11px', color: got ? '#8a5a17' : '#557a6a', fontStyle: 'bold' })
        .setOrigin(0.5);
      card.add([bg, icon, name]);

      if (got) {
        // Tocca la figurina: pronuncia il nome inglese + saltello.
        card.setSize(110, 74);
        card.setInteractive(new Phaser.Geom.Rectangle(-55, -37, 110, 74), Phaser.Geom.Rectangle.Contains);
        card.input.cursor = 'pointer';
        card.on('pointerdown', () => {
          this.audio.speak(s.en);
          this.tweens.add({ targets: card, scale: 1.1, duration: 110, yoyo: true });
        });
      }
    });

    // Pulsante indietro.
    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 22);
    const bg = this.add.graphics();
    bg.fillStyle(0x3fa34d, 1);
    bg.fillRoundedRect(-90, -18, 180, 36, 10);
    const label = this.add.text(0, 0, t(this, 'back'), { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.add([bg, label]);
    btn.setSize(180, 36);
    btn.setInteractive(new Phaser.Geom.Rectangle(-90, -18, 180, 36), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    const back = () => {
      if (this.sfx) this.sfx.click();
      this.scene.start(this.returnTo);
    };
    btn.on('pointerdown', back);
    this.input.keyboard.once('keydown-ESC', back);
    this.input.keyboard.once('keydown-SPACE', back);
  }
}
