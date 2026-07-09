import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXTURES } from '../config.js';
import { COSTUMES, getCostume } from '../data/costumes.js';

// WardrobeScene: il GUARDAROBA di Captain. Il bambino sceglie il cappellino da
// indossare nel gioco tra quelli sbloccati (stelle, manghi, livelli, parole).
// In alto un'anteprima di Captain col costume scelto; sotto, la griglia.
export default class WardrobeScene extends Phaser.Scene {
  constructor() {
    super('WardrobeScene');
  }

  init(data) {
    this.returnTo = (data && data.returnTo) || 'MenuScene';
  }

  create() {
    const W = GAME_WIDTH;
    this.progress = this.registry.get('progress');
    this.sfx = this.registry.get('sfx');
    this.cameras.main.setBackgroundColor(0x223a4f);

    this.add.text(W / 2, 24, '👕 Wardrobe', { fontFamily: 'sans-serif', fontSize: '26px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(W / 2, 50, 'ตู้เสื้อผ้าของกัปตัน', { fontFamily: 'sans-serif', fontSize: '13px', color: '#bcd0df' }).setOrigin(0.5);

    // Anteprima di Captain col costume scelto.
    const hasCapPhoto = this.textures.exists('captain_photo');
    this.preview = this.add.image(W / 2, 110, hasCapPhoto ? 'captain_photo' : TEXTURES.captain).setScale(hasCapPhoto ? 1.0 : 1.8);
    this.previewHat = this.add.text(W / 2, 66, '', { fontSize: '30px' }).setOrigin(0.5);
    this.selected = this.progress ? this.progress.getCostume() : 'none';
    this.refreshPreview();

    // Griglia 4 x 2.
    const cols = 4;
    const cw = 176;
    const x0 = W / 2 - ((cols - 1) / 2) * cw;
    this.cards = [];
    COSTUMES.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = x0 + col * cw;
      const y = 210 + row * 96;
      const unlocked = this.progress ? c.cond(this.progress) : c.id === 'none';

      const card = this.add.container(x, y);
      const bg = this.add.graphics();
      const draw = (sel) => {
        bg.clear();
        bg.fillStyle(unlocked ? (sel ? 0x2f6fed : 0x2a4258) : 0x223140, 1);
        bg.fillRoundedRect(-82, -42, 164, 84, 12);
        bg.lineStyle(3, sel ? 0xffd166 : unlocked ? 0x4a6b83 : 0x33465a, 1);
        bg.strokeRoundedRect(-82, -42, 164, 84, 12);
      };
      draw(this.selected === c.id);
      const emoji = this.add.text(0, -18, unlocked ? (c.emoji || '🧑‍🌾') : '🔒', { fontSize: '24px' }).setOrigin(0.5);
      const name = this.add.text(0, 8, unlocked ? c.name : '???', { fontFamily: 'sans-serif', fontSize: '15px', color: unlocked ? '#ffffff' : '#7f93a6', fontStyle: 'bold' }).setOrigin(0.5);
      const hint = this.add.text(0, 27, unlocked ? '' : c.hint, { fontFamily: 'sans-serif', fontSize: '11px', color: '#8fb0c6' }).setOrigin(0.5);
      card.add([bg, emoji, name, hint]);
      card.setSize(164, 84);
      if (unlocked) {
        card.setInteractive(new Phaser.Geom.Rectangle(-82, -42, 164, 84), Phaser.Geom.Rectangle.Contains);
        card.input.cursor = 'pointer';
        card.on('pointerdown', () => {
          if (this.sfx) this.sfx.click();
          this.selected = c.id;
          if (this.progress) this.progress.setCostume(c.id);
          this.refreshPreview();
          this.cards.forEach((cc) => cc.redraw(cc.id === c.id));
          this.tweens.add({ targets: card, scale: 1.06, duration: 120, yoyo: true });
        });
      }
      this.cards.push({ id: c.id, redraw: (sel) => draw(sel) });
    });

    this.createBackButton();
  }

  refreshPreview() {
    const c = getCostume(this.selected);
    this.previewHat.setText(c.emoji || '');
    this.tweens.add({ targets: this.preview, scaleX: this.preview.scaleX * 1.05, duration: 120, yoyo: true });
  }

  createBackButton() {
    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 24);
    const bg = this.add.graphics();
    bg.fillStyle(0x3fa34d, 1);
    bg.fillRoundedRect(-90, -19, 180, 38, 11);
    const label = this.add.text(0, 0, '⬅ Back', { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.add([bg, label]);
    btn.setSize(180, 38);
    btn.setInteractive(new Phaser.Geom.Rectangle(-90, -19, 180, 38), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    const back = () => {
      if (this.sfx) this.sfx.click();
      this.scene.start(this.returnTo);
    };
    btn.on('pointerdown', back);
    this.input.keyboard.once('keydown-ESC', back);
  }
}
