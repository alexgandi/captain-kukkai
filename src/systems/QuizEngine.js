import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';

// QuizEngine: il MOTORE del quiz, condiviso tra il fine-livello e il ripasso
// lampo dalla mappa. Un solo posto per tutti i tipi di sfida, la difficoltà
// crescente, il combo e il ripasso mirato delle parole sbagliate.
//
// TIPI DI DOMANDA (introdotti pian piano, livello dopo livello):
//  - listen : senti la parola  -> tocca l'ICONA giusta
//  - read   : vedi l'icona      -> tocca la PAROLA scritta
//  - match  : vedi la parola    -> tocca la scritta in THAI
//  - odd    : quattro immagini   -> tocca l'INTRUSO (categoria diversa)
//  - count  : conta gli oggetti  -> tocca il NUMERO giusto (livello dei numeri)
//  - spell  : componi la parola  -> tocca le LETTERE in ordine
//
// La difficoltà sale col livello: più domande, più opzioni, tipi più difficili.

// Parola adatta allo "spelling": una sola parola, né troppo corta né troppo lunga
// (le tessere-lettera devono starci sullo schermo).
function spellable(w) {
  return /^[a-z]+$/i.test(w.english) && w.english.length >= 3 && w.english.length <= 7;
}

const NUMBER_NAMES = ['one', 'two', 'three', 'four', 'five'];

export default class QuizEngine {
  constructor(scene, cfg) {
    this.scene = scene;
    this.words = cfg.words; // parole del livello corrente
    this.allWords = cfg.allWords || cfg.words; // tutto il vocabolario (per l'intruso)
    this.level = cfg.level || 1;
    this.audio = cfg.audio;
    this.sfx = cfg.sfx || scene.registry.get('sfx');
    this.progress = cfg.progress || scene.registry.get('progress');
    this.yBase = cfg.yBase || 250; // centro verticale del pannello domanda
    this.starY = cfg.starY || 96;
    this.onComplete = cfg.onComplete || (() => {});

    this.extras = []; // oggetti "di cornice" (stelle, combo) da ripulire alla fine
  }

  // ---------- Avvio ----------
  start() {
    this.rounds = this.buildRounds();
    this.total = this.rounds.length;
    this.index = 0;
    this.score = 0;
    this.combo = 0;
    this.buildStars();
    this.nextRound();
  }

  // Costruisce la sequenza di domande: quante, di che tipo, su quali parole.
  buildRounds() {
    const level = this.level;
    // Numero di domande: cresce col livello (L1:3 ... L6-8:6).
    const count = Phaser.Math.Clamp(3 + Math.floor(level / 2), 3, 6);

    // Tipi sbloccati man mano che si avanza.
    const pool = ['listen', 'read'];
    if (level >= 2) pool.push('match');
    if (level >= 3) pool.push('odd', 'spell');
    const isNumbers = this.words.some((w) => w.theme === 'numbers');
    if (isNumbers) pool.push('count');

    // Bersagli: le parole del livello, con quelle SBAGLIATE in passato messe
    // davanti (ripasso mirato: tornano più spesso finché non le indovini).
    const review = new Set(this.progress ? this.progress.getReviewWords() : []);
    const levelWords = Phaser.Utils.Array.Shuffle([...this.words]);
    levelWords.sort((a, b) => (review.has(b.english) ? 1 : 0) - (review.has(a.english) ? 1 : 0));

    // Sequenza dei tipi: parte SEMPRE da 'listen' (avvio dolce), poi mescola.
    const seq = Phaser.Utils.Array.Shuffle(pool.filter((t) => t !== 'listen'));
    const types = ['listen'];
    while (types.length < count) types.push(seq[(types.length - 1) % seq.length]);

    const rounds = [];
    let wi = 0;
    for (let r = 0; r < count; r++) {
      let type = types[r];
      let target = levelWords[wi % levelWords.length];
      wi++;

      if (type === 'spell' && !spellable(target)) {
        const alt = levelWords.find(spellable);
        if (alt) target = alt;
        else type = 'read';
      }
      if (type === 'count') {
        const avail = this.words.filter((w) => NUMBER_NAMES.includes(w.english));
        if (avail.length >= 3) target = Phaser.Utils.Array.GetRandom(avail);
        else type = 'read';
      }

      // Numero di opzioni: 4 nei round avanzati dei livelli alti, altrimenti 3.
      const nOpt = level >= 4 && r >= 2 ? 4 : 3;
      rounds.push({ type, target, nOpt });
    }
    return rounds;
  }

  // Fila di stelline del punteggio (una per domanda).
  buildStars() {
    this.starIcons = [];
    const spread = 36;
    const startX = GAME_WIDTH / 2 - ((this.total - 1) / 2) * spread;
    for (let i = 0; i < this.total; i++) {
      const s = this.scene.add
        .text(startX + i * spread, this.starY, '☆', { fontSize: '24px', color: '#ffd166' })
        .setOrigin(0.5);
      this.starIcons.push(s);
      this.extras.push(s);
    }
  }

  lightStar(i) {
    if (!this.starIcons[i]) return;
    this.starIcons[i].setText('⭐');
    this.scene.tweens.add({ targets: this.starIcons[i], scale: 1.5, duration: 160, yoyo: true });
  }

  // ---------- Round ----------
  nextRound() {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    if (this.index >= this.rounds.length) {
      this.finish();
      return;
    }
    this.failedThisRound = false;
    this.locked = false;
    const round = this.rounds[this.index];
    this.currentTarget = round.target;

    switch (round.type) {
      case 'read':
        this.roundRead(round);
        break;
      case 'match':
        this.roundMatch(round);
        break;
      case 'odd':
        this.roundOdd(round);
        break;
      case 'count':
        this.roundCount(round);
        break;
      case 'spell':
        this.roundSpell(round);
        break;
      case 'listen':
      default:
        this.roundListen(round);
        break;
    }
  }

  // Distrattori: altre parole dello STESSO livello.
  distractors(target, n) {
    return Phaser.Utils.Array.Shuffle(this.words.filter((w) => w.english !== target.english)).slice(0, n);
  }

  // ---- Pannello a scelta multipla (comune a listen/read/match/odd/count) ----
  choicePanel({ question, sub, help, big, tiles, speakOnStart }) {
    const scene = this.scene;
    const panel = scene.add.container(GAME_WIDTH / 2, this.yBase);
    this.panel = panel;

    const q = scene.add
      .text(0, -110, question, { fontFamily: 'sans-serif', fontSize: '21px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: 640 } })
      .setOrigin(0.5);
    panel.add(q);
    if (help) {
      const sp = scene.add.text(q.width / 2 + 16, -110, '🔊', { fontSize: '24px' }).setOrigin(0.5);
      sp.setInteractive({ useHandCursor: true });
      sp.on('pointerdown', () => this.audio.speak(help));
      panel.add(sp);
    }
    if (sub) {
      panel.add(scene.add.text(0, -82, sub, { fontFamily: 'sans-serif', fontSize: '14px', color: '#cfe0ff' }).setOrigin(0.5));
    }
    if (big) {
      big.setY(-52);
      panel.add(big);
    }

    const n = tiles.length;
    const tileW = n <= 3 ? 120 : 92;
    const spread = n <= 3 ? 150 : 116;
    const startX = -((n - 1) / 2) * spread;
    tiles.forEach((t, i) => {
      const x = startX + i * spread;
      const tile = scene.add.container(x, 22);
      const bg = scene.add.graphics();
      bg.fillStyle(0xffffff, 0.97);
      bg.fillRoundedRect(-tileW / 2, -55, tileW, 110, 14);
      bg.lineStyle(4, 0xffd166, 1);
      bg.strokeRoundedRect(-tileW / 2, -55, tileW, 110, 14);
      tile.add([bg, t.face]);
      tile.setSize(tileW, 110);
      tile.setInteractive(new Phaser.Geom.Rectangle(-tileW / 2, -55, tileW, 110), Phaser.Geom.Rectangle.Contains);
      tile.input.cursor = 'pointer';
      tile.on('pointerdown', () => this.onChoice(tile, bg, tileW, t.correct));
      panel.add(tile);
    });

    if (speakOnStart) this.audio.speak(speakOnStart);
  }

  makeIcon(text) {
    return this.scene.add.text(0, 0, text, { fontSize: '46px' }).setOrigin(0.5);
  }
  makeWord(text) {
    return this.scene.add
      .text(0, 0, text, { fontFamily: 'sans-serif', fontSize: text.length > 8 ? '15px' : '20px', color: '#2f6fed', fontStyle: 'bold', align: 'center', wordWrap: { width: 108 } })
      .setOrigin(0.5);
  }
  makeThai(text) {
    return this.scene.add
      .text(0, 0, text, { fontFamily: 'sans-serif', fontSize: '24px', color: '#8a3ffc', fontStyle: 'bold', align: 'center', wordWrap: { width: 108 } })
      .setOrigin(0.5);
  }

  roundListen(round) {
    const target = round.target;
    const opts = Phaser.Utils.Array.Shuffle([target, ...this.distractors(target, round.nOpt - 1)]);
    this.choicePanel({
      question: `Which one is "${target.english}"?`,
      sub: 'แตะรูปที่ถูกต้อง!',
      help: target.english,
      tiles: opts.map((w) => ({ face: this.makeIcon(w.icon || '⭐'), correct: w.english === target.english })),
      speakOnStart: target.english,
    });
  }

  roundRead(round) {
    const target = round.target;
    const opts = Phaser.Utils.Array.Shuffle([target, ...this.distractors(target, round.nOpt - 1)]);
    this.choicePanel({
      question: 'Which word is this?',
      sub: 'อ่านแล้วเลือกคำที่ถูก',
      help: target.english,
      big: this.makeIcon(target.icon || '⭐'),
      tiles: opts.map((w) => ({ face: this.makeWord(w.english), correct: w.english === target.english })),
    });
  }

  roundMatch(round) {
    const target = round.target;
    const opts = Phaser.Utils.Array.Shuffle([target, ...this.distractors(target, round.nOpt - 1)]);
    this.choicePanel({
      question: `Which is "${target.english}" in Thai?`,
      sub: 'จับคู่คำ',
      help: target.english,
      big: this.makeIcon(target.icon || '⭐'),
      tiles: opts.map((w) => ({ face: this.makeThai(w.thai), correct: w.english === target.english })),
    });
  }

  roundOdd(round) {
    // Tre parole dello stesso tema + un INTRUSO da un tema diverso.
    const theme = this.words[0] ? this.words[0].theme : null;
    const family = Phaser.Utils.Array.Shuffle(this.words).slice(0, round.nOpt - 1);
    const outsiders = this.allWords.filter((w) => w.theme !== theme);
    const intruder = outsiders.length ? Phaser.Utils.Array.GetRandom(outsiders) : this.distractors(family[0], 1)[0];
    this.currentTarget = intruder;
    const opts = Phaser.Utils.Array.Shuffle([...family, intruder]);
    this.choicePanel({
      question: 'Tap the one that is different!',
      sub: 'อันไหนไม่เข้าพวก?',
      tiles: opts.map((w) => ({ face: this.makeIcon(w.icon || '⭐'), correct: w.english === intruder.english })),
    });
  }

  roundCount(round) {
    // Conta gli oggetti mostrati e tocca il NUMERO giusto (parola inglese).
    const target = round.target; // parola-numero (one..five)
    const n = NUMBER_NAMES.indexOf(target.english) + 1;
    const emoji = '🥭';
    const big = this.scene.add.text(0, 0, emoji.repeat(n), { fontSize: '30px' }).setOrigin(0.5);
    const numberWords = this.words.filter((w) => NUMBER_NAMES.includes(w.english));
    const opts = Phaser.Utils.Array.Shuffle([target, ...Phaser.Utils.Array.Shuffle(numberWords.filter((w) => w.english !== target.english)).slice(0, round.nOpt - 1)]);
    this.choicePanel({
      question: 'How many? นับดูสิ!',
      big,
      tiles: opts.map((w) => ({ face: this.makeWord(w.english), correct: w.english === target.english })),
    });
  }

  // ---- Spelling: componi la parola toccando le lettere in ordine ----
  roundSpell(round) {
    const scene = this.scene;
    const target = round.target;
    const word = target.english.toLowerCase();
    const panel = scene.add.container(GAME_WIDTH / 2, this.yBase);
    this.panel = panel;

    panel.add(scene.add.text(0, -110, 'Spell the word! สะกดคำ', { fontFamily: 'sans-serif', fontSize: '21px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    const sp = scene.add.text(120, -110, '🔊', { fontSize: '24px' }).setOrigin(0.5);
    sp.setInteractive({ useHandCursor: true });
    sp.on('pointerdown', () => this.audio.speak(target.english));
    panel.add(sp);
    panel.add(scene.add.text(0, -62, target.icon || '⭐', { fontSize: '40px' }).setOrigin(0.5));

    // Caselle vuote (una per lettera) + puntatore alla prossima da riempire.
    const slotW = Math.min(48, Math.floor(560 / word.length));
    const startX = -((word.length - 1) / 2) * slotW;
    this.spellSlots = [];
    let pos = 0;
    for (let i = 0; i < word.length; i++) {
      const g = scene.add.graphics();
      g.lineStyle(3, 0xffd166, 1);
      g.strokeRoundedRect(startX + i * slotW - slotW / 2 + 4, -12, slotW - 8, 44, 8);
      panel.add(g);
      const letter = scene.add.text(startX + i * slotW, 10, '', { fontFamily: 'sans-serif', fontSize: '26px', color: '#2f6fed', fontStyle: 'bold' }).setOrigin(0.5);
      panel.add(letter);
      this.spellSlots.push(letter);
    }

    // Tessere-lettera mescolate, in basso.
    const letters = Phaser.Utils.Array.Shuffle(word.split(''));
    const lw = Math.min(48, Math.floor(560 / letters.length));
    const lstart = -((letters.length - 1) / 2) * lw;
    letters.forEach((ch, i) => {
      const tile = scene.add.container(lstart + i * lw, 78);
      const bg = scene.add.graphics();
      bg.fillStyle(0xffffff, 0.97);
      bg.fillRoundedRect(-lw / 2 + 3, -24, lw - 6, 48, 8);
      bg.lineStyle(3, 0x2f6fed, 1);
      bg.strokeRoundedRect(-lw / 2 + 3, -24, lw - 6, 48, 8);
      const txt = scene.add.text(0, 0, ch, { fontFamily: 'sans-serif', fontSize: '24px', color: '#2f6fed', fontStyle: 'bold' }).setOrigin(0.5);
      tile.add([bg, txt]);
      tile.setSize(lw, 48);
      tile.setInteractive(new Phaser.Geom.Rectangle(-lw / 2, -24, lw, 48), Phaser.Geom.Rectangle.Contains);
      tile.input.cursor = 'pointer';
      tile.on('pointerdown', () => {
        if (this.locked || !tile.input || !tile.input.enabled) return;
        if (ch === word[pos]) {
          // Lettera giusta: si posa nella casella, la tessera sparisce.
          this.spellSlots[pos].setText(ch.toUpperCase());
          scene.tweens.add({ targets: this.spellSlots[pos], scale: 1.4, duration: 130, yoyo: true });
          tile.disableInteractive();
          scene.tweens.add({ targets: tile, alpha: 0.2, duration: 150 });
          pos++;
          if (this.sfx) this.sfx.click();
          if (pos >= word.length) {
            this.locked = true;
            if (this.sfx) this.sfx.win();
            this.roundSolved();
          }
        } else {
          // Lettera sbagliata: scossa, si segna l'errore, si può riprovare.
          if (this.sfx) this.sfx.tink();
          this.failedThisRound = true;
          this.combo = 0;
          scene.tweens.add({ targets: tile, x: tile.x + 6, duration: 45, yoyo: true, repeat: 3 });
          this.showTryAgain();
        }
      });
      panel.add(tile);
    });
  }

  // ---------- Esito di una risposta ----------
  onChoice(tile, bg, w, correct) {
    if (this.locked) return;
    if (correct) {
      this.locked = true;
      if (this.sfx) this.sfx.win();
      bg.lineStyle(5, 0x3fa34d, 1);
      bg.strokeRoundedRect(-w / 2, -55, w, 110, 14);
      this.scene.tweens.add({ targets: tile, scale: 1.15, duration: 130, yoyo: true });
      this.roundSolved();
    } else {
      if (this.sfx) this.sfx.tink();
      this.failedThisRound = true;
      this.combo = 0;
      this.scene.tweens.add({ targets: tile, x: tile.x + 8, duration: 50, yoyo: true, repeat: 3 });
      this.showTryAgain();
    }
  }

  roundSolved() {
    if (!this.failedThisRound) {
      this.score += 1;
      this.combo += 1;
      this.lightStar(this.index);
      if (this.progress) this.progress.clearMistake(this.currentTarget.english);
      this.showCombo();
    } else if (this.progress) {
      // Sbagliata almeno una volta: entra nel ripasso mirato.
      this.progress.recordMistake(this.currentTarget.english);
    }
    this.index += 1;
    this.scene.time.delayedCall(750, () => this.nextRound());
  }

  showTryAgain() {
    if (!this.panel) return;
    const t = this.scene.add
      .text(0, 96, 'Try again!  ลองอีกครั้ง!', { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffd166' })
      .setOrigin(0.5);
    this.panel.add(t);
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 300, onComplete: () => t.destroy() });
  }

  showCombo() {
    if (this.combo < 2 || !this.panel) return;
    const msg = this.combo >= 4 ? `${this.combo} COMBO! 🔥` : this.combo === 3 ? 'Great streak! ⚡' : 'Nice! 2 in a row!';
    const t = this.scene.add
      .text(0, -140, msg, { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffb703', fontStyle: 'bold', stroke: '#1a1a2e', strokeThickness: 4 })
      .setOrigin(0.5)
      .setScale(0.3);
    this.panel.add(t);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  // ---------- Fine ----------
  finish() {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    this.onComplete(this.score, this.total);
  }

  // Ripulisce le stelline (chiamato dalla scena dopo il messaggio finale).
  clear() {
    this.extras.forEach((o) => o.destroy());
    this.extras = [];
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
  }
}
