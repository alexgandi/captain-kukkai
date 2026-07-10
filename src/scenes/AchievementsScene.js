import Phaser from 'phaser';
import { t } from '../systems/i18n.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { ACHIEVEMENTS } from '../systems/Achievements.js';

// AchievementsScene: il MEDAGLIERE. Mostra tutte le medaglie: quelle sbloccate
// a colori (con titolo e descrizione), quelle ancora da conquistare in grigio
// con il lucchetto. Un posto dove il bambino vede quanto è arrivato lontano.
export default class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('AchievementsScene');
  }

  init(data) {
    this.returnTo = (data && data.returnTo) || 'MenuScene';
  }

  create() {
    const W = GAME_WIDTH;
    const p = this.registry.get('progress');
    this.sfx = this.registry.get('sfx');
    this.cameras.main.setBackgroundColor(0x241a3a);

    const unlocked = p ? p.getAchievements().length : 0;
    this.add.text(W / 2, 26, '🏅 Medals', { fontFamily: 'sans-serif', fontSize: '26px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(W / 2, 54, `${unlocked} / ${ACHIEVEMENTS.length}   •   เหรียญรางวัล`, { fontFamily: 'sans-serif', fontSize: '14px', color: '#c9b8e8' }).setOrigin(0.5);

    // Griglia 5 x 3 (13 medaglie, inclusa quella SEGRETA).
    const cols = 5;
    const cw = 156;
    const x0 = W / 2 - ((cols - 1) / 2) * cw;
    ACHIEVEMENTS.forEach((a, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = x0 + col * cw;
      const y = 104 + row * 92;
      const got = p && p.hasAchievement(a.id);

      const card = this.add.container(x, y);
      const bg = this.add.graphics();
      bg.fillStyle(got ? 0x3a2b5c : 0x2a2140, 1);
      bg.fillRoundedRect(-74, -42, 148, 84, 11);
      bg.lineStyle(3, got ? 0xffd166 : a.secret && !got ? 0x6a5a2e : 0x453a5e, 1);
      bg.strokeRoundedRect(-74, -42, 148, 84, 11);
      const icon = this.add.text(0, -19, got ? a.icon : a.secret ? '✨' : '🔒', { fontSize: '24px' }).setOrigin(0.5).setAlpha(got ? 1 : 0.6);
      const title = this.add.text(0, 7, got ? a.title : '???', { fontFamily: 'sans-serif', fontSize: '13px', color: got ? '#ffffff' : '#8a7fa8', fontStyle: 'bold' }).setOrigin(0.5);
      const desc = this.add.text(0, 26, a.desc, { fontFamily: 'sans-serif', fontSize: '10px', color: got ? '#c9b8e8' : '#6d6288', align: 'center', wordWrap: { width: 138 } }).setOrigin(0.5);
      card.add([bg, icon, title, desc]);
      if (got) this.tweens.add({ targets: icon, scale: 1.12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 90 });
    });

    this.createBackButton();
  }

  createBackButton() {
    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 26);
    const bg = this.add.graphics();
    bg.fillStyle(0x3fa34d, 1);
    bg.fillRoundedRect(-90, -20, 180, 40, 11);
    const label = this.add.text(0, 0, t(this, 'back'), { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.add([bg, label]);
    btn.setSize(180, 40);
    btn.setInteractive(new Phaser.Geom.Rectangle(-90, -20, 180, 40), Phaser.Geom.Rectangle.Contains);
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
