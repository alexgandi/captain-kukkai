import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXTURES } from '../config.js';
import VocabularyManager from '../systems/VocabularyManager.js';
import AudioManager from '../systems/AudioManager.js';
import { t, getLang, setLang } from '../systems/i18n.js';

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
    // Se c'è la FOTO vera di Captain uso il suo medaglione, come per Kukkai.
    const hasCapPhoto = this.textures.exists('captain_photo');
    this.add
      .image(W / 2 - 150, H - 74, hasCapPhoto ? 'captain_photo' : TEXTURES.captain)
      .setScale(hasCapPhoto ? 0.9 : 1.5);
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

    // Pulsantino Medagliere (accanto al Word Book): vedi le medaglie sbloccate.
    const medalBtn = this.add
      .text(W - 62, 14, '🏅', { fontSize: '30px' })
      .setOrigin(1, 0)
      .setDepth(20)
      .setPadding(10)
      .setInteractive({ useHandCursor: true });
    medalBtn.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      this.scene.start('AchievementsScene', { returnTo: 'MenuScene' });
    });

    // Pulsantino Guardaroba: scegli il costume di Captain.
    const wardrobeBtn = this.add
      .text(W - 108, 14, '👕', { fontSize: '30px' })
      .setOrigin(1, 0)
      .setDepth(20)
      .setPadding(10)
      .setInteractive({ useHandCursor: true });
    wardrobeBtn.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      this.scene.start('WardrobeScene', { returnTo: 'MenuScene' });
    });

    // Pulsantino Album degli sticker.
    const albumBtn = this.add
      .text(W - 154, 14, '📔', { fontSize: '30px' })
      .setOrigin(1, 0)
      .setDepth(20)
      .setPadding(10)
      .setInteractive({ useHandCursor: true });
    albumBtn.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      this.scene.start('AlbumScene', { returnTo: 'MenuScene' });
    });

    // Pulsantino "For grown-ups" (in basso a destra, piccolo e defilato): apre la
    // scheda dei progressi per i genitori, protetta da un cancello matematico.
    const parentBtn = this.add
      .text(W - 12, H - 12, t(this, 'forGrownups'), { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff', stroke: '#1a1a2e', strokeThickness: 3 })
      .setOrigin(1, 1)
      .setDepth(20)
      .setPadding(8)
      .setAlpha(0.9)
      .setInteractive({ useHandCursor: true });
    parentBtn.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      this.scene.start('ParentScene');
    });

    // Pulsante Play.
    this.createPlayButton();

    // BADGE "100% Free • No Ads" sotto il Play: il posizionamento è un
    // VANTAGGIO COMPETITIVO dichiarato (lezione Khan Academy Kids — i genitori
    // diffidano delle app per bambini piene di acquisti e pubblicità).
    this.add
      .text(W / 2, H - 137, t(this, 'freeBadge'), {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#1d7a34',
        fontStyle: 'bold',
        backgroundColor: '#ffffff',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setAlpha(0.95)
      .setDepth(10);

    // SIGLA cantata: parte al PRIMO tocco sul menu (i browser sbloccano l'audio
    // solo dentro un gesto). Una volta per sessione, volume gentile.
    // DIFENSIVO per iOS: se l'audio è ancora "locked" si aspetta l'evento di
    // sblocco di Phaser invece di suonare a vuoto; e qualsiasi errore qui non
    // deve MAI rompere lo sblocco dell'audio del resto del gioco.
    this.input.once('pointerdown', () => {
      try {
        if (this.cache.audio.exists('title_jingle') && !this.registry.get('jingleHeard')) {
          this.registry.set('jingleHeard', true);
          const startJingle = () => {
            if (!this.scene.isActive()) return; // nel frattempo siamo già nell'intro
            this.titleJingle = this.sound.add('title_jingle', { volume: 0.5 });
            this.titleJingle.play();
          };
          if (this.sound.locked) this.sound.once(Phaser.Sound.Events.UNLOCKED, startJingle);
          else startJingle();
        }
      } catch (e) {
        // La sigla è un extra: se fallisce, pazienza.
      }
    });

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
    const wtitle = this.add.text(12, 8, t(this, 'wordOfDay'), { fontFamily: 'sans-serif', fontSize: '12px', color: '#8a5a17', fontStyle: 'bold' });
    const wword = this.add.text(12, 26, `${wotd.icon}  ${wotd.english}`, { fontFamily: 'sans-serif', fontSize: '20px', color: '#2f6fed', fontStyle: 'bold' });
    wotdBox.add([wbg, wtitle, wword]);
    wotdBox.setSize(200, 58);
    wotdBox.setInteractive(new Phaser.Geom.Rectangle(0, 0, 200, 58), Phaser.Geom.Rectangle.Contains);
    wotdBox.input.cursor = 'pointer';
    wotdBox.on('pointerdown', () => {
      this.audio.speak(wotd.english);
      this.tweens.add({ targets: wotdBox, scale: 1.06, duration: 100, yoyo: true });
    });

    // STREAK 🔥: giorni consecutivi di gioco. Si aggiorna a ogni apertura e
    // ai traguardi (3/7/14/30) festeggia — il rituale quotidiano che crea l'abitudine.
    const progress = this.registry.get('progress');
    if (progress) {
      const { count, grew } = progress.touchStreak();
      const pill = this.add.container(14, 80).setDepth(20);
      const pbg = this.add.graphics();
      pbg.fillStyle(0xfff3e0, 0.94);
      pbg.fillRoundedRect(0, 0, 128, 34, 10);
      pbg.lineStyle(2.5, 0xff9f1c, 1);
      pbg.strokeRoundedRect(0, 0, 128, 34, 10);
      const ptxt = this.add.text(12, 8, t(this, 'days', count), {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#c2410c',
        fontStyle: 'bold',
      });
      pill.add([pbg, ptxt]);
      if (grew) {
        pill.setScale(0.2);
        this.tweens.add({ targets: pill, scale: 1, duration: 380, ease: 'Back.easeOut', delay: 250 });
      }
      // Traguardo raggiunto OGGI: banner festoso al centro.
      if (grew && [3, 7, 14, 30].includes(count)) {
        const banner = this.add
          .text(W / 2, 248, `${count} days in a row! 🔥 เก่งมาก!`, {
            fontFamily: 'sans-serif',
            fontSize: '24px',
            color: '#ff9f1c',
            fontStyle: 'bold',
            stroke: '#1a1a2e',
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setDepth(30)
          .setScale(0.2);
        this.tweens.add({ targets: banner, scale: 1, duration: 400, ease: 'Back.easeOut', delay: 600 });
        this.tweens.add({ targets: banner, alpha: 0, delay: 3400, duration: 500, onComplete: () => banner.destroy() });
      }
    }

    // TOGGLE LINGUA della cornice (EN/ไทย), in basso a sinistra: per genitori e
    // maestre thai. Cambia SOLO menu e pulsanti; l'inglese didattico resta.
    const lang = getLang(this.registry);
    const langBtn = this.add
      .text(12, H - 12, lang === 'th' ? '🌐 ไทย · EN' : '🌐 EN · ไทย', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#1a1a2e',
        strokeThickness: 3,
      })
      .setOrigin(0, 1)
      .setDepth(20)
      .setPadding(8)
      .setInteractive({ useHandCursor: true });
    langBtn.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      setLang(this.registry, lang === 'th' ? 'en' : 'th');
      this.scene.restart(); // il menu si ridisegna nella nuova lingua
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
      .text(0, 0, t(this, 'play'), {
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
      if (this.titleJingle) this.titleJingle.stop(); // nell'intro parla Kukkai: sigla via
      if (this.sfx) this.sfx.click();
      this.scene.start('IntroScene');
    };
    btn.on('pointerdown', play);
    this.input.keyboard.once('keydown-SPACE', play);
    this.input.keyboard.once('keydown-ENTER', play);
  }
}
