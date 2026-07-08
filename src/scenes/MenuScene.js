import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXTURES } from '../config.js';
import VocabularyManager from '../systems/VocabularyManager.js';
import AudioManager from '../systems/AudioManager.js';

// MenuScene: la schermata titolo. Primo schermo del gioco.
// Il pulsante Play è anche il primo GESTO dell'utente: sblocca l'audio del
// browser, così l'intro parte già con la voce e gli effetti sonori funzionano.
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.sfx = this.registry.get('sfx');

    // Sfondo: cielo + prato + qualche collina (aria da giungla).
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.add.rectangle(W / 2, H - 24, W, 48, COLORS.ground);
    for (let x = 40; x <= W; x += 200) {
      this.add.ellipse(x, H - 48, 200, 110, 0x6fbf73);
    }

    // Titolo (inglese) su due righe, colorato e con contorno.
    this.add
      .text(W / 2, 96, 'CAPTAIN', {
        fontFamily: 'sans-serif',
        fontSize: '58px',
        color: '#2f6fed',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 7,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 150, '& Teacher Kukkai', {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        color: '#e23b3b',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    // Sottotitolo (inglese + thai).
    this.add
      .text(W / 2, 192, 'Learn English • Free the teacher!', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#333333',
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 216, 'เรียนภาษาอังกฤษ แล้วช่วยครู!', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#555555',
      })
      .setOrigin(0.5);

    // Captain e Kukkai sul prato (in basso, sotto il pulsante).
    this.add.image(W / 2 - 150, H - 70, TEXTURES.captain).setScale(1.5);
    this.add.image(W / 2 + 150, H - 74, TEXTURES.kukkaiPortrait).setScale(1.05);

    // Pulsantino Word Book (in alto a destra): rivedi le parole imparate.
    const bookBtn = this.add
      .text(W - 16, 14, '📖', { fontSize: '30px' })
      .setOrigin(1, 0)
      .setDepth(20)
      .setPadding(10) // area di tocco più grande (dita sul telefono)
      .setInteractive({ useHandCursor: true });
    bookBtn.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      this.scene.start('WordBookScene', { returnTo: 'MenuScene', resume: false });
    });

    // Pulsante Play.
    this.createPlayButton();

    // PAROLA DEL GIORNO: ogni giorno una parola diversa, toccala per sentirla.
    // Piccolo rituale quotidiano di inglese, ancora prima di giocare.
    const vocab = new VocabularyManager();
    const dayIndex = Math.floor(Date.now() / 86400000) % vocab.all.length;
    const wotd = vocab.all[dayIndex];
    this.audio = new AudioManager(this);
    const wotdBox = this.add.container(14, 14).setDepth(20);
    const wbg = this.add.graphics();
    wbg.fillStyle(0xffffff, 0.92);
    wbg.fillRoundedRect(0, 0, 200, 58, 12);
    wbg.lineStyle(3, 0xffd166, 1);
    wbg.strokeRoundedRect(0, 0, 200, 58, 12);
    const wtitle = this.add.text(12, 8, 'Word of the day  🔊', { fontFamily: 'sans-serif', fontSize: '12px', color: '#8a5a17', fontStyle: 'bold' });
    const wword = this.add.text(12, 26, `${wotd.icon}  ${wotd.english}`, { fontFamily: 'sans-serif', fontSize: '20px', color: '#2f6fed', fontStyle: 'bold' });
    wotdBox.add([wbg, wtitle, wword]);
    wotdBox.setSize(200, 58);
    wotdBox.setInteractive(new Phaser.Geom.Rectangle(0, 0, 200, 58), Phaser.Geom.Rectangle.Contains);
    wotdBox.input.cursor = 'pointer';
    wotdBox.on('pointerdown', () => {
      this.audio.speak(wotd.english);
      this.tweens.add({ targets: wotdBox, scale: 1.06, duration: 100, yoyo: true });
    });

    // Dedica: questo gioco è nato per un bambino vero. 💙
    this.add
      .text(W / 2, H - 10, 'Made with ❤️ for Captain', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        stroke: '#1a1a2e',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(20)
      .setAlpha(0.95);
  }

  createPlayButton() {
    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 175).setDepth(10);
    const bg = this.add.graphics();
    bg.fillStyle(0x3fa34d, 1);
    bg.fillRoundedRect(-110, -30, 220, 60, 14);
    bg.lineStyle(4, 0xffffff, 1);
    bg.strokeRoundedRect(-110, -30, 220, 60, 14);
    const label = this.add
      .text(0, 0, '▶  Play', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    btn.add([bg, label]);
    // Pulsazione leggera per invitare a premere.
    this.tweens.add({ targets: btn, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    btn.setSize(220, 60);
    btn.setInteractive(new Phaser.Geom.Rectangle(-110, -30, 220, 60), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';

    let started = false;
    const play = () => {
      if (started) return;
      started = true;
      // SBLOCCO AUDIO (iPhone/iPad): gli AudioContext vanno creati/ripresi
      // DENTRO un gesto dell'utente, altrimenti iOS li lascia muti.
      // Questo click sul Play è il gesto giusto: sblocco effetti E musica qui.
      if (this.sfx && this.sfx.ensureCtx) this.sfx.ensureCtx();
      const music = this.registry.get('music');
      if (music && music.ensureCtx) music.ensureCtx();
      if (this.sound && this.sound.unlock) this.sound.unlock(); // anche l'audio di Phaser (MP3 voce)
      if (this.sfx) this.sfx.click();
      this.scene.start('IntroScene');
    };
    btn.on('pointerdown', play);
    this.input.keyboard.once('keydown-SPACE', play);
    this.input.keyboard.once('keydown-ENTER', play);
  }
}
