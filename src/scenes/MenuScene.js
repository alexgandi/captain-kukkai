import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXTURES, SAFE } from '../config.js';
import VocabularyManager from '../systems/VocabularyManager.js';
import AudioManager from '../systems/AudioManager.js';
import { t, getLang, setLang } from '../systems/i18n.js';
import { drawGradientSky, drawClouds, addGrassFringe, addButterflies, addVignette } from '../systems/ParallaxBackground.js';
import { makeButton, burstStars, buzz } from '../systems/UiKit.js';
import { pickNewSticker } from '../data/stickers.js';

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

    // Sfondo VIVO: cielo a gradiente, sole, nuvole che scivolano, colline su due
    // piani, erba che ondeggia e farfalle — il menu è la vetrina del gioco.
    drawGradientSky(this, 'jungle');
    this.add.circle(W - 250, 70, 46, 0xfff2bf, 0.5).setDepth(-20);
    this.add.circle(W - 250, 70, 28, 0xfff8dc, 0.75).setDepth(-20);
    drawClouds(this, W, { sf: 0, depth: -18, alpha: 0.85 });
    // Colline lontane: una cresta bassa all'orizzonte, appena visibile dietro il prato.
    for (let x = -60; x <= W + 60; x += 220) {
      this.add.ellipse(x + 90, H - 78, 260, 80, 0x9fc6a8, 0.55).setDepth(-16);
    }
    this.add.rectangle(W / 2, H - 24, W, 48, COLORS.ground);
    for (let x = 40; x <= W + 160; x += 200) {
      this.add.ellipse(x, H - 48, 200, 110, 0x6fbf73);
    }
    addGrassFringe(this, W, H - 42, [0x2f8f46, 0x3fa34d]);
    addButterflies(this, W, H - 60);
    addVignette(this, { strength: 0.11 }); // luce da palcoscenico, appena accennata
    // Mango passeggia sul prato avanti e indietro: il menu respira.
    if (this.textures.exists('elephant_pet')) {
      const hd = this.textures.exists('art_elephant_hd');
      const pet = this.add.image(W / 2 - 40, H - 66, hd ? 'art_elephant_hd' : 'elephant_pet').setDepth(5).setScale(hd ? 0.225 : 0.9);
      this.tweens.add({ targets: pet, y: pet.y - 3, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({
        targets: pet,
        x: W / 2 + 40,
        duration: 5200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onYoyo: () => pet.setFlipX(true),
        onRepeat: () => pet.setFlipX(false),
      });
    }

    // Titolo (inglese) su due righe, colorato, con contorno, ombra morbida e un
    // ingresso a molla + fluttuazione continua: il "benvenuto" di un gioco vero.
    const title1 = this.add
      .text(W / 2, 96, 'CAPTAIN', {
        fontFamily: 'sans-serif',
        fontSize: '58px',
        color: '#2f6fed',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setShadow(0, 4, 'rgba(20,30,60,0.3)', 6);
    const title2 = this.add
      .text(W / 2, 150, '& Teacher Kukkai', {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        color: '#e23b3b',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setShadow(0, 3, 'rgba(20,30,60,0.3)', 5);
    title1.setScale(0.3).setAlpha(0);
    title2.setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: title1, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: title2, scale: 1, alpha: 1, duration: 450, delay: 130, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [title1, title2], y: '-=5', duration: 1900, yoyo: true, repeat: -1, delay: 700, ease: 'Sine.easeInOut' });
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

    // Captain e Kukkai sul prato (in basso, sotto il pulsante), con un dondolio
    // leggero e sfalsato: niente è mai perfettamente immobile in un gioco vivo.
    // Se c'è la FOTO vera di Captain uso il suo medaglione, come per Kukkai.
    const hasCapPhoto = this.textures.exists('captain_photo');
    const capImg = this.add
      .image(W / 2 - 150, H - 74, hasCapPhoto ? 'captain_photo' : TEXTURES.captain)
      .setScale(hasCapPhoto ? 0.45 : 1.5);
    const kukImg = this.add.image(W / 2 + 150, H - 74, TEXTURES.kukkaiPortrait).setScale(0.525);
    this.tweens.add({ targets: capImg, y: capImg.y - 6, angle: 2, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: kukImg, y: kukImg.y - 6, angle: -2, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 });

    // Pulsantino Word Book (in alto a destra): rivedi le parole imparate.
    // Tutta la fila di icone si scosta di SAFE.right sui telefoni col notch.
    const bookBtn = this.add
      .text(W - SAFE.right - 16, 14, '📖', { fontSize: '30px' })
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
      .text(W - SAFE.right - 62, 14, '🏅', { fontSize: '30px' })
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
      .text(W - SAFE.right - 108, 14, '👕', { fontSize: '30px' })
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
      .text(W - SAFE.right - 154, 14, '📔', { fontSize: '30px' })
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
      .text(W - SAFE.right - 12, H - 12, t(this, 'forGrownups'), { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff', stroke: '#1a1a2e', strokeThickness: 3 })
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
    const wotdBox = this.add.container(SAFE.left + 14, 14).setDepth(20);
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
      const pill = this.add.container(SAFE.left + 14, 80).setDepth(20);
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
      // REGALO GIORNALIERO 🎁: alla prima apertura del giorno piove dall'alto
      // una card con uno sticker nuovo per l'album. La fiammella dello streak
      // così PROMETTE qualcosa ogni giorno — il rituale che crea l'abitudine.
      if (grew) this.time.delayedCall(1000, () => this.showDailyGift());

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
      .text(SAFE.left + 12, H - 12, lang === 'th' ? '🌐 ไทย · EN' : '🌐 EN · ไทย', {
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

  // Card-regalo del giorno: uno sticker nuovo piove dall'alto, sparkle e via.
  // Se l'album è completo non c'è nulla da pescare: nessuna card (pazienza).
  showDailyGift() {
    const progress = this.registry.get('progress');
    if (!progress) return;
    const sticker = pickNewSticker(progress.getStickers());
    if (!sticker || !progress.addSticker(sticker.id)) return;

    const W = GAME_WIDTH;
    const card = this.add.container(W / 2, -100).setDepth(500);
    const bg = this.add.graphics();
    bg.fillStyle(0xfff8e7, 0.98);
    bg.fillRoundedRect(-115, -60, 230, 120, 16);
    bg.lineStyle(4, 0xff9f1c, 1);
    bg.strokeRoundedRect(-115, -60, 230, 120, 16);
    const head = this.add
      .text(0, -40, '🎁 Daily gift!  ของขวัญวันนี้!', { fontFamily: 'sans-serif', fontSize: '14px', color: '#c2410c', fontStyle: 'bold' })
      .setOrigin(0.5);
    const icon = this.add.text(0, -2, sticker.icon, { fontSize: '38px' }).setOrigin(0.5);
    const name = this.add
      .text(0, 38, `${sticker.en} · ${sticker.th}`, { fontFamily: 'sans-serif', fontSize: '14px', color: '#2f6fed', fontStyle: 'bold' })
      .setOrigin(0.5);
    card.add([bg, head, icon, name]);
    if (this.sfx) this.sfx.win();
    buzz(30);
    this.tweens.add({ targets: card, y: 150, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: icon, scale: 1.25, delay: 450, duration: 200, yoyo: true });
    this.time.delayedCall(500, () => burstStars(this, W / 2, 150, { count: 12, scrollFactor: 0 }));
    this.tweens.add({ targets: card, y: -120, delay: 2800, duration: 350, ease: 'Back.easeIn', onComplete: () => card.destroy() });
  }

  createPlayButton() {
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
      this.scene.start('IntroScene');
    };
    // Pulsante "caramella" del kit UI: ombra, riflesso, animazione di pressione.
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 175, 230, 62, {
      label: t(this, 'play'),
      icon: '▶',
      color: 0x3fa34d,
      fontSize: 28,
      pulse: true,
      onClick: play,
    });
    this.input.keyboard.once('keydown-SPACE', play);
    this.input.keyboard.once('keydown-ENTER', play);
  }
}
