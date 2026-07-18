import Phaser from 'phaser';
import { t } from '../systems/i18n.js';
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

    // Pergamena: fondo caldo + doppia cornice dorata. La cornice sta nella
    // FASCIA CENTRALE 800px: la foto condivisa è ritagliata lì, e così il
    // diploma esce sempre intero con i suoi bordi (sui telefoni larghi il
    // margine extra fuori cornice fa da passe-partout).
    this.cameras.main.setBackgroundColor(0xf6ecd4);
    const FX = Math.max(0, Math.round((W - 800) / 2)); // inizio fascia 800px
    const FW = Math.min(800, W);
    const frame = this.add.graphics();
    frame.lineStyle(6, 0xc9a13b, 1);
    frame.strokeRoundedRect(FX + 14, 14, FW - 28, H - 28, 14);
    frame.lineStyle(2, 0xc9a13b, 1);
    frame.strokeRoundedRect(FX + 26, 26, FW - 52, H - 52, 10);
    // Angoli decorativi.
    [[FX + 26, 26], [FX + FW - 26, 26], [FX + 26, H - 26], [FX + FW - 26, H - 26]].forEach(([x, y]) => {
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

    // Kukkai (felice!) e Captain ai lati — medaglioni gemelli sul diploma.
    // Ancorati alla fascia centrale: devono restare dentro la foto condivisa.
    this.add.image(W / 2 - 314, 150, TEXTURES.kukkaiPortrait).setScale(0.45);
    const hasCapPhoto = this.textures.exists('captain_photo');
    this.add
      .image(W / 2 + 314, 150, hasCapPhoto ? 'captain_photo' : TEXTURES.captain)
      .setScale(hasCapPhoto ? 0.45 : 1.5);

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
    // Il NOME sul diploma: quello del bambino (se impostato), con la matita
    // accanto per scriverlo/cambiarlo. È il cuore della condivisione: i
    // genitori condividono il diploma COL NOME del proprio figlio.
    const savedName = (this.progress && this.progress.getPlayerName()) || '';
    this.nameText = this.add
      .text(W / 2, 168, (savedName || 'CAPTAIN').toUpperCase(), {
        fontFamily: 'Georgia, serif',
        fontSize: '44px',
        color: '#2f6fed',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScale(0.2);
    this.tweens.add({ targets: this.nameText, scale: 1, duration: 600, ease: 'Back.easeOut' });
    this.editBtn = this.add
      .text(W / 2 + this.nameText.width / 2 + 26, 168, '✏️', { fontSize: '22px' })
      .setOrigin(0.5)
      .setPadding(14)
      .setInteractive({ useHandCursor: true });
    this.editBtn.on('pointerdown', () => this.editName());
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
    this.createBottomButtons();

    // Footer col LINK del gioco: invisibile a schermo, compare SOLO nella foto
    // condivisa (al posto dei pulsanti). Ogni diploma condiviso porta il link.
    this.shareFooter = this.add
      .text(W / 2, H - 38, '🎮  100% FREE • No ads  •  alexgandi.github.io/captain-kukkai', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#8a5a17',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  // La matita: scrivi (o cambia) il nome del bambino sul diploma.
  editName() {
    const current = this.progress ? this.progress.getPlayerName() : '';
    const typed = window.prompt('Your name?  ชื่อของหนู?', current || '');
    if (typed === null) return; // annullato
    if (this.progress) this.progress.setPlayerName(typed);
    const shown = (this.progress && this.progress.getPlayerName()) || 'CAPTAIN';
    this.nameText.setText(shown.toUpperCase());
    this.editBtn.setX(this.scale.width / 2 + this.nameText.width / 2 + 26); // matita accanto al nuovo nome
    this.tweens.add({ targets: this.nameText, scale: 1.15, duration: 140, yoyo: true });
    const sfx = this.registry.get('sfx');
    if (sfx) sfx.win();
  }

  // CONDIVIDI: scatta una "foto" del diploma (senza pulsanti, con il link) e
  // apre il foglio di condivisione del telefono; se non c'è, scarica il PNG.
  shareDiploma() {
    if (this.sharing) return;
    this.sharing = true;
    // Nascondo i pulsanti e mostro il footer col link, poi scatto.
    this.bottomButtons.forEach((b) => b.setVisible(false));
    this.shareFooter.setVisible(true);
    this.time.delayedCall(80, () => {
      this.game.renderer.snapshot((image) => {
        // Ripristino subito la schermata.
        this.bottomButtons.forEach((b) => b.setVisible(true));
        this.shareFooter.setVisible(false);
        this.sharing = false;

        // RITAGLIO al 16:9 centrale (800x450): sui telefoni il canvas è più
        // largo, e un PNG panoramico verrebbe tagliato male da LINE/Facebook.
        const cropW = Math.min(800, image.width);
        const cropX = Math.max(0, Math.round((image.width - cropW) / 2));
        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, cropX, 0, cropW, image.height, 0, 0, cropW, image.height);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], 'captain-diploma.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Captain & Teacher Kukkai',
                text: 'My English diploma! 🎓 Play free: https://alexgandi.github.io/captain-kukkai/',
              });
            } catch (e) {
              // condivisione annullata dall'utente: nessun problema
            }
          } else {
            // Fallback desktop: scarica l'immagine.
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = 'captain-diploma.png';
            a.click();
          }
        }, 'image/png');
      });
    });
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

  // Due pulsanti in basso: CONDIVIDI il diploma (il gancio virale) e Play again.
  createBottomButtons() {
    const mk = (x, w, color, labelText, onClick) => {
      const btn = this.add.container(x, GAME_HEIGHT - 38).setDepth(10);
      const bg = this.add.graphics();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-w / 2, -22, w, 44, 12);
      const label = this.add
        .text(0, 0, labelText, { fontFamily: 'sans-serif', fontSize: '19px', color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5);
      btn.add([bg, label]);
      btn.setSize(w, 44);
      btn.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -22, w, 44), Phaser.Geom.Rectangle.Contains);
      btn.input.cursor = 'pointer';
      btn.on('pointerdown', onClick);
      return btn;
    };
    this.bottomButtons = [
      mk(GAME_WIDTH / 2 - 125, 230, 0x3fa34d, t(this, 'share'), () => this.shareDiploma()),
      mk(GAME_WIDTH / 2 + 125, 230, 0x2f6fed, t(this, 'playAgainCert'), () => this.playAgain()),
    ];
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
