import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import AudioManager from '../systems/AudioManager.js';

// PosterScene: il POSTER DELLA PAROLA — il primo pezzo di UGC del gioco
// (lezione Sprunki: si condivide ciò che si CREA). Il bambino sceglie la sua
// parola preferita nel Word Book, qui la "firma" col suo nome e SCEGLIE lo
// sfondo toccandolo (4 temi). Poi la condivide: ogni poster porta il link.
const POSTER_THEMES = [
  { sky: 0x87ceeb, deco: 0xffffff, frame: 0xffd166, ink: '#1a3b5c' }, // cielo
  { sky: 0xffd1dc, deco: 0xffffff, frame: 0xe23b3b, ink: '#7a2340' }, // rosa
  { sky: 0xb8f2c9, deco: 0xffffff, frame: 0x3fa34d, ink: '#1d5c2e' }, // menta
  { sky: 0x2a2a5a, deco: 0xffe14d, frame: 0xffd166, ink: '#ffffff' }, // notte
];

export default class PosterScene extends Phaser.Scene {
  constructor() {
    super('PosterScene');
  }

  init(data) {
    this.word = data && data.word;
  }

  create() {
    this.audio = new AudioManager(this);
    this.sfx = this.registry.get('sfx');
    this.progress = this.registry.get('progress');
    this.themeIndex = 0;

    this.drawPoster();
    this.createButtons();
    this.audio.speak(this.word.english);
  }

  // (Ri)disegna il poster col tema corrente. Toccare lo sfondo cambia tema:
  // è il gesto "creativo" del bambino — il poster diventa SUO.
  drawPoster() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const th = POSTER_THEMES[this.themeIndex];
    if (this.poster) this.poster.destroy();
    this.poster = this.add.container(0, 0).setDepth(0);

    // Il poster vive nella FASCIA CENTRALE 800px: la foto condivisa viene
    // ritagliata lì, così cornice e decorazioni escono sempre intere.
    const FX = Math.max(0, Math.round((W - 800) / 2));
    const FW = Math.min(800, W);
    const g = this.add.graphics();
    g.fillStyle(th.sky, 1);
    g.fillRect(0, 0, W, H);
    // Bolle decorative morbide (relative alla fascia).
    g.fillStyle(th.deco, 0.18);
    [[110, 90, 70], [700, 130, 90], [180, 360, 80], [660, 350, 60], [420, 60, 40]].forEach(([x, y, r]) => g.fillCircle(FX + x, y, r));
    // Cornice del poster.
    g.lineStyle(6, th.frame, 1);
    g.strokeRoundedRect(FX + 16, 16, FW - 32, H - 32, 18);
    this.poster.add(g);

    // La parola: icona GRANDE, inglese, thai.
    this.poster.add(this.add.text(W / 2, 138, this.word.icon || '⭐', { fontSize: '96px' }).setOrigin(0.5));
    this.poster.add(
      this.add
        .text(W / 2, 240, this.word.english.toUpperCase(), { fontFamily: 'Georgia, serif', fontSize: '52px', color: th.ink === '#ffffff' ? '#ffe14d' : '#2f6fed', fontStyle: 'bold' })
        .setOrigin(0.5)
    );
    this.poster.add(
      this.add.text(W / 2, 288, this.word.thai, { fontFamily: 'sans-serif', fontSize: '26px', color: th.ink }).setOrigin(0.5)
    );

    // La firma del bambino + Mango che fa compagnia.
    const name = (this.progress && this.progress.getPlayerName()) || 'Captain';
    this.poster.add(
      this.add.text(W / 2, 330, `⭐ ${name} learned this word! ⭐`, { fontFamily: 'sans-serif', fontSize: '17px', color: th.ink, fontStyle: 'bold' }).setOrigin(0.5)
    );
    this.poster.add(this.add.image(W / 2 + 310, H - 78, 'elephant_pet').setScale(1.2));

    // Footer col link: SEMPRE visibile (è l'artefatto condivisibile).
    this.poster.add(
      this.add
        .text(W / 2, H - 34, '🎮 Captain & Teacher Kukkai • 100% FREE • alexgandi.github.io/captain-kukkai', {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          color: th.ink,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setAlpha(0.85)
    );

    // Suggerimento + zona interattiva: tocca lo sfondo per cambiare colore.
    this.hint = this.add
      .text(W / 2, 34, '🎨 Tap to change color! · แตะเพื่อเปลี่ยนสี', { fontFamily: 'sans-serif', fontSize: '13px', color: th.ink, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(5)
      .setAlpha(0.85);
    const zone = this.add.zone(W / 2, H / 2 - 40, W - 60, H - 170).setInteractive();
    zone.on('pointerdown', () => {
      if (this.sfx) this.sfx.click();
      this.themeIndex = (this.themeIndex + 1) % POSTER_THEMES.length;
      this.hint.destroy();
      this.drawPoster();
    });
    this.poster.add(zone);
  }

  createButtons() {
    const mk = (x, color, labelText, onClick) => {
      const btn = this.add.container(x, GAME_HEIGHT - 74).setDepth(10);
      const bg = this.add.graphics();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-92, -20, 184, 40, 11);
      const label = this.add.text(0, 0, labelText, { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      btn.add([bg, label]);
      btn.setSize(184, 40);
      btn.setInteractive(new Phaser.Geom.Rectangle(-92, -20, 184, 40), Phaser.Geom.Rectangle.Contains);
      btn.input.cursor = 'pointer';
      btn.on('pointerdown', onClick);
      return btn;
    };
    this.buttons = [
      mk(GAME_WIDTH / 2 - 100, 0x3fa34d, 'Share  📤', () => this.sharePoster()),
      mk(GAME_WIDTH / 2 + 100, 0x2f6fed, '⬅ Word Book', () => {
        if (this.sfx) this.sfx.click();
        this.scene.start('WordBookScene', { returnTo: 'MenuScene', resume: false });
      }),
    ];
  }

  // Condivisione: stessa "foto" del diploma — pulsanti e hint nascosti, scatto,
  // foglio di condivisione del telefono (o download su desktop).
  sharePoster() {
    if (this.sharing) return;
    this.sharing = true;
    this.buttons.forEach((b) => b.setVisible(false));
    if (this.hint && this.hint.active) this.hint.setVisible(false);
    this.time.delayedCall(80, () => {
      this.game.renderer.snapshot((image) => {
        this.buttons.forEach((b) => b.setVisible(true));
        if (this.hint && this.hint.active) this.hint.setVisible(true);
        this.sharing = false;

        // RITAGLIO al 16:9 centrale (800x450): come per il diploma, i social
        // tagliano male i panorami dei telefoni larghi.
        const cropW = Math.min(800, image.width);
        const cropX = Math.max(0, Math.round((image.width - cropW) / 2));
        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, cropX, 0, cropW, image.height, 0, 0, cropW, image.height);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], 'my-word-poster.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Captain & Teacher Kukkai',
                text: `I learned "${this.word.english}"! 🎉 Play free: https://alexgandi.github.io/captain-kukkai/`,
              });
            } catch (e) {
              // annullato: ok
            }
          } else {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = 'my-word-poster.png';
            a.click();
          }
        }, 'image/png');
      });
    });
  }
}
