import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXTURES } from '../config.js';

// TeacherScene: l'ANGOLO DELLE MAESTRE 🍎 (playbook ClassDojo: si costruisce
// per la singola insegnante, che poi lo consiglia alle colleghe). Raggiungibile
// dal report genitori (dietro il cancello matematico): spiega cosa insegna il
// gioco, come usarlo in classe, e ha il pulsante per CONDIVIDERLO — il gesto
// che trasforma una maestra contenta in dieci famiglie nuove.
const SHARE_TEXT =
  'Captain & Teacher Kukkai — free English game for Thai kids! 🇹🇭🐘\n' +
  'เกมฝึกภาษาอังกฤษฟรีสำหรับเด็กไทย — ฟรี 100% ไม่มีโฆษณา\n' +
  '100% free, no ads. Play: https://alexgandi.github.io/captain-kukkai/';

export default class TeacherScene extends Phaser.Scene {
  constructor() {
    super('TeacherScene');
  }

  create() {
    const W = GAME_WIDTH;
    this.sfx = this.registry.get('sfx');
    this.cameras.main.setBackgroundColor(0x27343f);

    this.add.text(W / 2, 26, '🍎 For Teachers · สำหรับคุณครู', { fontFamily: 'sans-serif', fontSize: '24px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5);

    // Kukkai, la maestra del gioco, fa gli onori di casa.
    this.add.image(64, 96, TEXTURES.kukkaiPortrait).setScale(0.375);

    // Cosa insegna + come usarlo in classe (inglese + thai, righe brevi).
    const lines = [
      ['📚', 'Core: 94+ English words in 8 themed levels', 'คำศัพท์ 94+ คำ ใน 8 ด่าน (สัตว์ อาหาร สี ตัวเลข ฯลฯ)'],
      ['🗣️', 'Real native audio for every word', 'ทุกคำมีเสียงเจ้าของภาษา'],
      ['⚡', 'Quick Quiz from the map = 5-minute warm-up', 'แบบทดสอบเร็วจากแผนที่ = วอร์มอัพ 5 นาที'],
      ['🏃', '"Do what I say!" = whole-class TPR game', 'เกมทำตามคำสั่ง = เล่นทั้งห้องได้'],
      ['📊', 'Progress report behind the grown-ups gate', 'ดูรายงานพัฒนาการได้ในหน้าผู้ปกครอง'],
      ['💚', '100% free, no ads — works offline too', 'ฟรี 100% ไม่มีโฆษณา เล่นออฟไลน์ได้'],
    ];
    lines.forEach(([icon, en, th], i) => {
      const y = 92 + i * 52;
      this.add.text(126, y, icon, { fontSize: '22px' }).setOrigin(0.5);
      this.add.text(150, y - 12, en, { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' });
      this.add.text(150, y + 8, th, { fontFamily: 'sans-serif', fontSize: '13px', color: '#9fc0d6' });
    });

    // CONDIVIDI con genitori e colleghe: foglio di condivisione del telefono,
    // altrimenti copia negli appunti.
    const shareBtn = this.add.container(W / 2 - 125, GAME_HEIGHT - 30);
    const sbg = this.add.graphics();
    sbg.fillStyle(0x3fa34d, 1);
    sbg.fillRoundedRect(-115, -20, 230, 40, 11);
    this.shareLabel = this.add
      .text(0, 0, 'Share  📤  แชร์', { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    shareBtn.add([sbg, this.shareLabel]);
    shareBtn.setSize(230, 40);
    shareBtn.setInteractive(new Phaser.Geom.Rectangle(-115, -20, 230, 40), Phaser.Geom.Rectangle.Contains);
    shareBtn.input.cursor = 'pointer';
    shareBtn.on('pointerdown', () => this.shareGame());

    // Indietro (al menu: il cancello matematico non va rifatto ogni volta).
    const backBtn = this.add.container(W / 2 + 125, GAME_HEIGHT - 30);
    const bbg = this.add.graphics();
    bbg.fillStyle(0x2f6fed, 1);
    bbg.fillRoundedRect(-115, -20, 230, 40, 11);
    const blabel = this.add.text(0, 0, '⬅ Menu', { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    backBtn.add([bbg, blabel]);
    backBtn.setSize(230, 40);
    backBtn.setInteractive(new Phaser.Geom.Rectangle(-115, -20, 230, 40), Phaser.Geom.Rectangle.Contains);
    backBtn.input.cursor = 'pointer';
    backBtn.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      this.scene.start('MenuScene');
    });
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  async shareGame() {
    if (this.sfx) this.sfx.click();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Captain & Teacher Kukkai', text: SHARE_TEXT });
        return;
      }
    } catch (e) {
      // condivisione annullata: nessun problema
      return;
    }
    // Fallback desktop: copia negli appunti + conferma visiva.
    try {
      await navigator.clipboard.writeText(SHARE_TEXT);
      this.shareLabel.setText('Copied! ✓');
      this.time.delayedCall(1500, () => this.shareLabel.setText('Share  📤  แชร์'));
    } catch (e) {
      // niente clipboard: pazienza
    }
  }
}
