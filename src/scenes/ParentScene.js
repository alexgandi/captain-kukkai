import Phaser from 'phaser';
import { t } from '../systems/i18n.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import VocabularyManager from '../systems/VocabularyManager.js';

// ParentScene: la SCHEDA PER I GENITORI. Dietro un piccolo "cancello matematico"
// (una moltiplicazione: i più piccoli non la sanno ancora) mostra ai grandi i
// progressi di Captain: quante parole ha imparato, quali sono ancora da ripassare
// (dai suoi errori nel quiz), stelle e manghi per ogni livello.
const LEVEL_ICONS = { 1: '🌴', 2: '🍚', 3: '🎨', 4: '🔢', 5: '🚗', 6: '🌳', 7: '🏰', 8: '🚀' };

export default class ParentScene extends Phaser.Scene {
  constructor() {
    super('ParentScene');
  }

  create() {
    this.progress = this.registry.get('progress');
    this.sfx = this.registry.get('sfx');
    this.vocab = new VocabularyManager();
    this.cameras.main.setBackgroundColor(0x1e2a38);
    this.showGate();
  }

  clearContent() {
    if (this.content) this.content.destroy();
    this.content = this.add.container(0, 0);
  }

  // --- Cancello: risolvi la moltiplicazione per entrare ---
  showGate() {
    this.clearContent();
    const W = GAME_WIDTH;
    const a = Phaser.Math.Between(6, 9);
    const b = Phaser.Math.Between(6, 9);
    const answer = a * b;

    this.content.add(
      this.add.text(W / 2, 70, 'For grown-ups  👨‍👩‍👧', { fontFamily: 'sans-serif', fontSize: '26px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5)
    );
    this.content.add(
      this.add.text(W / 2, 120, 'สำหรับผู้ปกครอง', { fontFamily: 'sans-serif', fontSize: '15px', color: '#aebfd0' }).setOrigin(0.5)
    );
    this.content.add(
      this.add.text(W / 2, 175, `Solve to continue:   ${a} × ${b} = ?`, { fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5)
    );

    // Quattro opzioni: la giusta + 3 distrattori vicini.
    const opts = new Set([answer]);
    while (opts.size < 4) opts.add(Phaser.Math.Clamp(answer + Phaser.Math.Between(-12, 12), 20, 99));
    const options = Phaser.Utils.Array.Shuffle([...opts]);
    options.forEach((val, i) => {
      const x = W / 2 + (i - 1.5) * 140;
      const btn = this.add.container(x, 250);
      const bg = this.add.graphics();
      bg.fillStyle(0x2f6fed, 1);
      bg.fillRoundedRect(-56, -30, 112, 60, 12);
      const txt = this.add.text(0, 0, `${val}`, { fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      btn.add([bg, txt]);
      btn.setSize(112, 60);
      btn.setInteractive(new Phaser.Geom.Rectangle(-56, -30, 112, 60), Phaser.Geom.Rectangle.Contains);
      btn.input.cursor = 'pointer';
      btn.on('pointerdown', () => {
        if (val === answer) {
          if (this.sfx) this.sfx.win();
          this.showReport();
        } else {
          if (this.sfx) this.sfx.tink();
          this.tweens.add({ targets: btn, x: btn.x + 8, duration: 50, yoyo: true, repeat: 3 });
        }
      });
      this.content.add(btn);
    });

    this.addBackButton();
  }

  // --- Scheda dei progressi ---
  showReport() {
    this.clearContent();
    const W = GAME_WIDTH;
    const p = this.progress;
    const total = this.vocab.all.length;
    const learned = p ? p.getCollectedWords().length : 0;
    const levels = [1, 2, 3, 4, 5, 6, 7, 8];
    const totalStars = levels.reduce((s, l) => s + (p ? p.getStars(l) : 0), 0);
    const totalMangoes = levels.reduce((s, l) => s + (p ? p.getMangoes(l) : 0), 0);

    this.content.add(this.add.text(W / 2, 28, "📊 Captain's Progress", { fontFamily: 'sans-serif', fontSize: '24px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5));

    // Parole imparate (grande) + stelle/manghi totali.
    this.content.add(this.add.text(W / 2, 66, `Words learned:  ${learned} / ${total}`, { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    this.content.add(this.add.text(W / 2, 94, `⭐ ${totalStars}/24      🥭 ${totalMangoes}/24`, { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd166' }).setOrigin(0.5));

    // Riga dei livelli: icona + stelle + manghi per ciascuno.
    levels.forEach((l, i) => {
      const x = W / 2 + (i - 3.5) * 92;
      const done = p && p.isLevelDone(l);
      const card = this.add.container(x, 150);
      const bg = this.add.graphics();
      bg.fillStyle(done ? 0x2a3f55 : 0x243141, 1);
      bg.fillRoundedRect(-40, -34, 80, 68, 10);
      const icon = this.add.text(0, -16, LEVEL_ICONS[l], { fontSize: '20px' }).setOrigin(0.5).setAlpha(done ? 1 : 0.4);
      const st = p ? p.getStars(l) : 0;
      const stars = this.add.text(0, 6, '⭐'.repeat(st) || '–', { fontSize: '10px' }).setOrigin(0.5);
      const mg = p ? p.getMangoes(l) : 0;
      const mango = this.add.text(0, 22, `🥭${mg}`, { fontFamily: 'sans-serif', fontSize: '11px', color: '#c9d4dd' }).setOrigin(0.5);
      card.add([bg, icon, stars, mango]);
      this.content.add(card);
    });

    // Parole da RIPASSARE (dagli errori nel quiz): le più sbagliate per prime.
    const reviewKeys = p ? p.getReviewWords() : [];
    const reviewWords = reviewKeys.map((en) => this.vocab.getWordByEnglish(en)).filter(Boolean).slice(0, 8);
    this.content.add(this.add.text(W / 2, 210, reviewWords.length ? '📌 Words to review:' : '🌟 No words to review — great job!', { fontFamily: 'sans-serif', fontSize: '18px', color: reviewWords.length ? '#ff9f68' : '#8fe388', fontStyle: 'bold' }).setOrigin(0.5));
    if (reviewWords.length) {
      const sub = this.add.text(W / 2, 232, 'these come back more often in the quiz', { fontFamily: 'sans-serif', fontSize: '12px', color: '#aebfd0', fontStyle: 'italic' }).setOrigin(0.5);
      this.content.add(sub);
      reviewWords.forEach((w, i) => {
        const perRow = 4;
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = W / 2 + (col - (perRow - 1) / 2) * 150;
        const y = 268 + row * 46;
        const chip = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(0x33475d, 1);
        bg.fillRoundedRect(-70, -18, 140, 36, 9);
        const label = this.add.text(0, 0, `${w.icon}  ${w.english}`, { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
        chip.add([bg, label]);
        this.content.add(chip);
      });
    }

    this.addBackButton();
  }

  addBackButton() {
    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 28);
    const bg = this.add.graphics();
    bg.fillStyle(0x3fa34d, 1);
    bg.fillRoundedRect(-90, -20, 180, 40, 11);
    const label = this.add.text(0, 0, t(this, 'backToMenu'), { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.add([bg, label]);
    btn.setSize(180, 40);
    btn.setInteractive(new Phaser.Geom.Rectangle(-90, -20, 180, 40), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    const back = () => {
      if (this.sfx) this.sfx.click();
      this.scene.start('MenuScene');
    };
    btn.on('pointerdown', back);
    this.input.keyboard.once('keydown-ESC', back);
    this.content.add(btn);
  }
}
