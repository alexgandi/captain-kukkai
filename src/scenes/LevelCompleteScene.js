import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXTURES } from '../config.js';
import AudioManager from '../systems/AudioManager.js';
import VocabularyManager from '../systems/VocabularyManager.js';
import DialoguePortrait from '../ui/DialoguePortrait.js';
import { KUKKAI_LEVEL_END } from '../data/dialogues.js';
import { LEVEL_CONFIG, LEVEL_COUNT } from '../data/levels.js';

// LevelCompleteScene: a fine livello Kukkai fa i complimenti, poi mostra il
// recap di TUTTE le parole imparate nel livello (tap su una parola = risenti l'inglese).
export default class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super('LevelCompleteScene');
  }

  init(data) {
    this.levelNumber = (data && data.level) || 1;
    this.earnedStars = (data && data.stars) || 0;
  }

  create() {
    this.audio = new AudioManager(this);
    // Musica spenta: qui parla Kukkai (la voce deve essere chiara).
    const music = this.registry.get('music');
    if (music) music.stop();
    const vocab = new VocabularyManager();
    this.words = vocab.getWordsForLevel(this.levelNumber);

    // Sfondo a tema thailandese: templi dorati al tramonto.
    this.drawThaiBackdrop();

    // Kukkai fa i complimenti; alla fine si scopre il recap.
    this.dialogue = new DialoguePortrait(this, {
      portraitKey: TEXTURES.kukkaiPortrait,
      name: 'Teacher Kukkai',
      speak: true,
      audio: this.audio,
    });
    const lines = KUKKAI_LEVEL_END[this.levelNumber] || KUKKAI_LEVEL_END[1];
    // Dopo i complimenti: prima il QUIZ (richiamo attivo!), poi il recap.
    this.dialogue.start(lines, () => this.startQuiz());

    // Le STELLE del livello (1 finito, 2 mai morto, 3 cuori pieni), in alto a
    // sinistra: compaiono una alla volta con un "pop" festoso.
    if (this.earnedStars > 0) {
      const sfx = this.registry.get('sfx');
      [0, 1, 2].forEach((i) => {
        const filled = i < this.earnedStars;
        const star = this.add
          .text(36 + i * 36, 30, filled ? '⭐' : '☆', { fontSize: '28px', color: '#ffd166' })
          .setOrigin(0.5)
          .setScale(0.01);
        this.tweens.add({
          targets: star,
          scale: 1,
          delay: 350 + i * 260,
          duration: 260,
          ease: 'Back.easeOut',
          onStart: () => {
            if (filled && sfx) sfx.click();
          },
        });
      });
    }
  }

  // ---------------- QUIZ DI KUKKAI ----------------
  // 3 domande: Kukkai PRONUNCIA una parola del livello, il bambino tocca
  // l'icona giusta tra 3. Giusta = stellina; sbagliata = riprova gentile
  // (nessun fallimento: si può ritentare finché non trova quella giusta).
  startQuiz() {
    this.dialogue.hide();
    this.quizRound = 0;
    this.quizStars = 0;
    this.quizFailedThisRound = false;
    // 3 parole bersaglio a caso dal livello (senza ripetizioni).
    this.quizTargets = Phaser.Utils.Array.Shuffle([...this.words]).slice(0, 3);

    // Intestazione del quiz (inglese + thai).
    this.quizHeader = this.add.container(GAME_WIDTH / 2, 40);
    const title = this.add
      .text(0, 0, "⭐ Kukkai's Quiz! ⭐", {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(0, 28, 'แตะรูปที่ถูกต้อง!', { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);
    this.quizHeader.add([title, sub]);

    // Le 3 stelline del punteggio (si accendono a ogni risposta giusta al primo colpo).
    this.quizStarIcons = [0, 1, 2].map((i) =>
      this.add.text(GAME_WIDTH / 2 - 40 + i * 40, 100, '☆', { fontSize: '26px', color: '#ffd166' }).setOrigin(0.5)
    );

    this.nextQuizRound();
  }

  nextQuizRound() {
    if (this.quizPanel) this.quizPanel.destroy();
    if (this.quizRound >= this.quizTargets.length) {
      this.endQuiz();
      return;
    }
    this.quizFailedThisRound = false;
    const target = this.quizTargets[this.quizRound];

    // Opzioni: la parola giusta + 2 "distrattori" dello stesso livello, mescolate.
    const others = Phaser.Utils.Array.Shuffle(this.words.filter((w) => w.english !== target.english)).slice(0, 2);
    const options = Phaser.Utils.Array.Shuffle([target, ...others]);

    this.quizPanel = this.add.container(GAME_WIDTH / 2, 235);

    // La domanda: "Which one is ...?" + pulsante 🔊 per risentirla.
    const q = this.add
      .text(-14, -105, `Which one is "${target.english}"?`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const speaker = this.add.text(q.width / 2 + 12, -105, '🔊', { fontSize: '24px' }).setOrigin(0.5);
    speaker.setInteractive({ useHandCursor: true });
    speaker.on('pointerdown', () => this.audio.speak(target.english));
    this.quizPanel.add([q, speaker]);

    // Le 3 tessere-icona.
    options.forEach((word, i) => {
      const x = (i - 1) * 150;
      const tile = this.add.container(x, 10);
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.97);
      bg.fillRoundedRect(-60, -55, 120, 110, 14);
      bg.lineStyle(4, 0xffd166, 1);
      bg.strokeRoundedRect(-60, -55, 120, 110, 14);
      const icon = this.add.text(0, 0, word.icon || '⭐', { fontSize: '46px' }).setOrigin(0.5);
      tile.add([bg, icon]);
      tile.setSize(120, 110);
      tile.setInteractive(new Phaser.Geom.Rectangle(-60, -55, 120, 110), Phaser.Geom.Rectangle.Contains);
      tile.input.cursor = 'pointer';
      tile.on('pointerdown', () => this.onQuizAnswer(tile, bg, word, target));
      this.quizPanel.add(tile);
    });

    // Kukkai pronuncia la parola da trovare.
    this.audio.speak(target.english);
  }

  onQuizAnswer(tile, bg, word, target) {
    const sfx = this.registry.get('sfx');
    if (word.english === target.english) {
      // GIUSTA: bordo verde, saltello, stellina se al primo colpo, poi round dopo.
      if (sfx) sfx.win();
      bg.lineStyle(5, 0x3fa34d, 1);
      bg.strokeRoundedRect(-60, -55, 120, 110, 14);
      this.tweens.add({ targets: tile, scale: 1.15, duration: 130, yoyo: true });
      if (!this.quizFailedThisRound) {
        this.quizStarIcons[this.quizRound].setText('⭐');
        this.tweens.add({ targets: this.quizStarIcons[this.quizRound], scale: 1.5, duration: 160, yoyo: true });
        this.quizStars += 1;
      }
      this.quizRound += 1;
      this.time.delayedCall(650, () => this.nextQuizRound());
    } else {
      // SBAGLIATA: scossa gentile + "Try again!"; si può ritentare subito.
      if (sfx) sfx.tink();
      this.quizFailedThisRound = true;
      this.tweens.add({ targets: tile, x: tile.x + 8, duration: 50, yoyo: true, repeat: 3 });
      const oops = this.add
        .text(GAME_WIDTH / 2, 372, 'Try again!  ลองอีกครั้ง!', {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          color: '#ffd166',
        })
        .setOrigin(0.5);
      this.tweens.add({ targets: oops, alpha: 0, delay: 700, duration: 300, onComplete: () => oops.destroy() });
    }
  }

  endQuiz() {
    // Complimenti proporzionati alle stelline, poi si passa al recap.
    const sfx = this.registry.get('sfx');
    if (sfx) sfx.win();
    const msg = this.quizStars >= 3 ? 'Perfect! ⭐⭐⭐' : this.quizStars >= 1 ? 'Great job!' : 'Good practice!';
    const done = this.add
      .text(GAME_WIDTH / 2, 235, msg, {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        color: '#ffd166',
        fontStyle: 'bold',
        stroke: '#1a1a2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScale(0.5);
    this.tweens.add({ targets: done, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.time.delayedCall(1400, () => {
      done.destroy();
      if (this.quizHeader) this.quizHeader.destroy();
      this.quizStarIcons.forEach((s) => s.destroy());
      this.revealRecap();
    });
  }

  // Sfondo thailandese: cielo al tramonto, alone dorato e skyline di templi.
  drawThaiBackdrop() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.cameras.main.setBackgroundColor(0x3a2350); // viola dusk
    this.add.rectangle(W / 2, H - 90, W, 200, 0x8a4a5a).setAlpha(0.55).setDepth(-20); // fascia calda
    this.add.circle(W / 2, H * 0.5, 150, 0xf6c96b, 0.28).setDepth(-19); // alone dorato dietro Kukkai

    const g = this.add.graphics().setDepth(-18);
    const baseY = H - 24;
    [90, 710].forEach((sx) => this.drawTempleSpire(g, sx, baseY, 1.1));
    [250, 550].forEach((sx) => this.drawTempleSpire(g, sx, baseY, 0.85));

    // COMPARSA DEL CATTIVO: dal livello 3 in poi, l'astronave dello Yaksha
    // attraversa il cielo come silhouette scura (Kukkai la nomina nelle battute).
    // Più il livello è avanzato, più è grande e vicina: la minaccia cresce.
    if (this.levelNumber >= 3 && this.levelNumber <= 7) {
      const scale = 0.5 + (this.levelNumber - 3) * 0.14; // L3 piccola -> L7 grande
      const ufoY = 46 + (this.levelNumber % 3) * 14;
      const ufo = this.add.image(W + 80, ufoY, 'boss_ship').setDepth(-17);
      ufo.setScale(scale);
      ufo.setTint(0x241a3a); // silhouette scura contro il cielo del tramonto
      ufo.setAlpha(0.9);
      this.tweens.add({
        targets: ufo,
        x: -100,
        y: ufoY + 12,
        duration: 5200,
        delay: 700,
        ease: 'Sine.easeInOut',
        repeat: -1, // riappare: continua a pattugliare il cielo
        repeatDelay: 5200,
      });
    }
  }

  // Un tempietto thai stilizzato: corpo + tetti a punta dorati + guglia.
  drawTempleSpire(g, sx, baseY, s) {
    const bw = 80 * s;
    const bh = 70 * s;
    g.fillStyle(0x5a3d2a, 1); // corpo
    g.fillRect(sx - bw / 2, baseY - bh, bw, bh);
    g.fillStyle(0x2e2018, 1); // porta
    g.fillRect(sx - 9 * s, baseY - 32 * s, 18 * s, 32 * s);
    g.fillStyle(0xf2c14e, 1); // tetti a punta dorati (thai)
    g.fillTriangle(sx - bw / 2 - 10 * s, baseY - bh, sx, baseY - bh - 46 * s, sx + bw / 2 + 10 * s, baseY - bh);
    g.fillTriangle(sx - bw / 3, baseY - bh - 30 * s, sx, baseY - bh - 80 * s, sx + bw / 3, baseY - bh - 30 * s);
    g.fillRect(sx - 3 * s, baseY - bh - 108 * s, 6 * s, 32 * s); // guglia
    g.fillCircle(sx, baseY - bh - 110 * s, 6 * s);
  }

  // Dopo il dialogo: header + griglia di parole (toccabili) + pulsante Continue.
  revealRecap() {
    this.dialogue.hide();

    // Intestazione (inglese + thai, mai italiano).
    this.add
      .text(GAME_WIDTH / 2, 34, 'You learned these words!', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 62, 'แตะเพื่อฟังอีกครั้ง', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Griglia adattiva: sceglie le colonne e ridimensiona le tessere così
    // stanno sullo schermo anche con 12+ parole (max 2-3 righe).
    const n = this.words.length;
    const cols = n <= 6 ? 3 : n <= 8 ? 4 : 6;
    const gap = 10;
    const tileW = Math.min(146, (700 - (cols - 1) * gap) / cols);
    const tileH = Math.min(112, tileW * 0.78);
    const gridW = cols * tileW + (cols - 1) * gap;
    const startX = (GAME_WIDTH - gridW) / 2 + tileW / 2;
    const startY = 116 + tileH / 2;

    this.words.forEach((word, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (tileW + gap);
      const y = startY + row * (tileH + gap);
      this.createTile(word, x, y, tileW, tileH);
    });

    // Pulsante Continue in basso.
    this.createContinueButton();
  }

  // Una "tesserina" toccabile: icona + thai + inglese. Tap = pronuncia l'inglese.
  createTile(word, x, y, tileW, tileH) {
    const tile = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRoundedRect(-tileW / 2, -tileH / 2, tileW, tileH, 12);
    bg.lineStyle(3, 0xffd166, 1);
    bg.strokeRoundedRect(-tileW / 2, -tileH / 2, tileW, tileH, 12);

    const icon = this.add.text(0, -32, word.icon || '⭐', { fontSize: '34px' }).setOrigin(0.5);
    const thai = this.add
      .text(0, 8, word.thai, { fontFamily: 'sans-serif', fontSize: '24px', color: '#222222' })
      .setOrigin(0.5);
    const eng = this.add
      .text(0, 38, word.english, {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#2f6fed',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    tile.add([bg, icon, thai, eng]);

    // Rendo tutta la tesserina cliccabile.
    tile.setSize(tileW, tileH);
    tile.setInteractive(
      new Phaser.Geom.Rectangle(-tileW / 2, -tileH / 2, tileW, tileH),
      Phaser.Geom.Rectangle.Contains
    );
    tile.input.cursor = 'pointer'; // "manina" al passaggio del mouse
    tile.on('pointerdown', () => {
      this.audio.speak(word.english);
      this.tweens.add({ targets: tile, scale: 1.12, duration: 100, yoyo: true, ease: 'Sine.easeOut' });
    });
  }

  createContinueButton() {
    const btn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 34);
    const bg = this.add.graphics();
    bg.fillStyle(0x2f6fed, 1);
    bg.fillRoundedRect(-120, -24, 240, 48, 12);
    // A fine castello il pulsante racconta l'inseguimento (Kukkai è stata rapita!).
    const labelText = this.levelNumber === 7 ? 'Follow them!  🚀   (Space)' : 'Continue  ▶   (Space)';
    const label = this.add
      .text(0, 0, labelText, {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    btn.add([bg, label]);

    btn.setSize(240, 48);
    btn.setInteractive(new Phaser.Geom.Rectangle(-120, -24, 240, 48), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer'; // "manina" al passaggio del mouse
    btn.on('pointerdown', () => this.onContinue());

    // Si può continuare anche da TASTIERA (comodo se giochi senza mouse).
    this.input.keyboard.once('keydown-SPACE', () => this.onContinue());
    this.input.keyboard.once('keydown-ENTER', () => this.onContinue());
  }

  onContinue() {
    const sfx = this.registry.get('sfx');
    if (sfx) sfx.click();
    const next = this.levelNumber + 1;
    if (this.levelNumber === 7) {
      // Fine castello: lo Yaksha è scappato NELLO SPAZIO con Kukkai.
      // La mappa mostra l'ultima tappa (il razzo), poi si decolla.
      this.scene.start('MapScene', { next: 8 });
    } else if (LEVEL_CONFIG[next]) {
      // C'è un altro livello: prima la MAPPA (vedi il viaggio avanzare), poi si gioca.
      this.scene.start('MapScene', { next });
    } else {
      // Dopo lo SPAZIO (L8, boss sconfitto) -> FINALE: Kukkai è libera davvero.
      this.scene.start('RescueScene');
    }
  }
}
