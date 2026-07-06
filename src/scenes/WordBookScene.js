import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import AudioManager from '../systems/AudioManager.js';
import VocabularyManager from '../systems/VocabularyManager.js';

// WordBookScene: il "quaderno delle parole". Mostra TUTTE le parole imparate
// finora (dal progresso persistente) e permette di risentire l'inglese toccandole.
// Può essere aperta dal menu o durante il gioco (che viene messo in pausa).
export default class WordBookScene extends Phaser.Scene {
  constructor() {
    super('WordBookScene');
  }

  init(data) {
    this.returnTo = (data && data.returnTo) || 'MenuScene';
    // resume=true: era un overlay su una scena in pausa (gioco) -> la riprendo.
    // resume=false: sostituivo la scena chiamante (menu) -> la riavvio.
    this.resumeCaller = !!(data && data.resume);
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.audio = new AudioManager(this);
    this.sfx = this.registry.get('sfx');

    // Velo scuro semi-trasparente (se sopra il gioco, lo oscura).
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1030, 0.82).setDepth(0);

    // Fascia dell'header: copre le tessere che scorrono SOTTO il titolo.
    this.add.rectangle(W / 2, 32, W, 64, 0x1a1030, 1).setDepth(3);

    // Titolo (inglese + thai) — sopra la fascia.
    this.add
      .text(W / 2, 24, '📖  Word Book', {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(4);
    this.add
      .text(W / 2, 48, 'สมุดคำศัพท์ · แตะเพื่อฟัง', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(4);

    // Le parole imparate, in ordine di vocabolario (livello 1, 2, 3).
    const vocab = new VocabularyManager();
    const progress = this.registry.get('progress');
    const learned = progress ? new Set(progress.getCollectedWords()) : new Set();
    const words = vocab.all.filter((w) => learned.has(w.english));

    // Contatore: quante parole hai imparato sul totale (motiva a collezionarle!).
    this.add
      .text(W - 20, 30, `⭐ ${words.length} / ${vocab.all.length}`, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setDepth(4);

    if (words.length === 0) {
      this.add
        .text(W / 2, H / 2, 'No words yet!\nBeat enemies to learn words.', {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(1);
    } else {
      this.buildGrid(words);
    }

    this.createBackButton();
  }

  buildGrid(words) {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const cols = Math.min(6, words.length);
    const tileW = 118;
    const tileH = 84;
    const gap = 8;
    const gridW = cols * tileW + (cols - 1) * gap;
    const startX = (W - gridW) / 2 + tileW / 2;
    const startY = 72 + tileH / 2;

    // Le tessere vivono in un CONTENITORE che possiamo far scorrere:
    // con 8 livelli le parole sono tante (fino a 96) e non stanno in una schermata.
    this.gridContainer = this.add.container(0, 0).setDepth(1);

    words.forEach((word, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (tileW + gap);
      const y = startY + row * (tileH + gap);
      this.createTile(word, x, y, tileW, tileH);
    });

    // Quanto si può scorrere: fondo della griglia meno lo schermo (se serve).
    const rows = Math.ceil(words.length / cols);
    const gridBottom = startY + (rows - 1) * (tileH + gap) + tileH / 2;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, gridBottom - (H - 16));

    if (this.maxScroll > 0) {
      // Rotellina del mouse.
      this.input.on('wheel', (pointer, objs, dx, dy) => this.scrollBy(dy * 0.6));
      // Trascinamento (touch/mouse): scorri col dito, come su un telefono.
      this.input.on('pointermove', (pointer) => {
        if (pointer.isDown) this.scrollBy(-(pointer.y - pointer.prevPosition.y));
      });
      // Indicatore: si può scorrere.
      this.add
        .text(GAME_WIDTH - 22, GAME_HEIGHT / 2, '↕', { fontSize: '26px', color: '#ffd166' })
        .setOrigin(0.5)
        .setDepth(2)
        .setAlpha(0.8);
    }
  }

  // Scorre la griglia, tenendola nei limiti (mai oltre l'inizio o la fine).
  scrollBy(dy) {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScroll);
    this.gridContainer.y = -this.scrollY;
  }

  createTile(word, x, y, tileW, tileH) {
    const tile = this.add.container(x, y);
    this.gridContainer.add(tile); // dentro il contenitore scorrevole

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRoundedRect(-tileW / 2, -tileH / 2, tileW, tileH, 10);
    bg.lineStyle(2, 0xffd166, 1);
    bg.strokeRoundedRect(-tileW / 2, -tileH / 2, tileW, tileH, 10);

    const icon = this.add.text(0, -22, word.icon || '⭐', { fontSize: '26px' }).setOrigin(0.5);
    const thai = this.add
      .text(0, 6, word.thai, { fontFamily: 'sans-serif', fontSize: '20px', color: '#222222' })
      .setOrigin(0.5);
    const eng = this.add
      .text(0, 30, word.english, {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#2f6fed',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    tile.add([bg, icon, thai, eng]);
    tile.setSize(tileW, tileH);
    tile.setInteractive(new Phaser.Geom.Rectangle(-tileW / 2, -tileH / 2, tileW, tileH), Phaser.Geom.Rectangle.Contains);
    tile.input.cursor = 'pointer';
    tile.on('pointerdown', () => {
      this.audio.speak(word.english); // risenti l'inglese
      this.tweens.add({ targets: tile, scale: 1.12, duration: 100, yoyo: true, ease: 'Sine.easeOut' });
    });
  }

  createBackButton() {
    const btn = this.add.container(74, 26).setDepth(5);
    const bg = this.add.graphics();
    bg.fillStyle(0x2f6fed, 1);
    bg.fillRoundedRect(-56, -18, 112, 36, 10);
    const label = this.add
      .text(0, 0, '← Back', { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    btn.add([bg, label]);
    btn.setSize(112, 36);
    btn.setInteractive(new Phaser.Geom.Rectangle(-56, -18, 112, 36), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';
    btn.on('pointerdown', () => this.close());
    // Anche ESC o B chiudono.
    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.keyboard.once('keydown-B', () => this.close());
  }

  close() {
    if (this.sfx) this.sfx.click();
    if (this.resumeCaller) {
      // Era un overlay sul gioco in pausa: lo riprendo e chiudo il quaderno.
      this.scene.resume(this.returnTo);
      this.scene.stop();
    } else {
      this.scene.start(this.returnTo);
    }
  }
}
