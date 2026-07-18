// MusicManager: musica di sottofondo GENERATIVA con Web Audio (niente file).
// Ogni ambiente ha il suo "carattere": scala PENTATONICA (come la musica thai),
// nota fondamentale, velocità e timbro diversi. Il loop è una sequenza di gradi
// della scala che si ripete, con un basso morbido ogni 4 passi.
//
// API: play('jungle'|'ice'|...|'boss'|'celebration'), stop().
// play() con lo stesso tema non riparte da capo (idempotente).
const SEMITONE = Math.pow(2, 1 / 12);

// Scala pentatonica MAGGIORE (0,2,4,7,9) o "scura" (0,3,5,7,10) in semitoni.
const MAJOR = [0, 2, 4, 7, 9];
const DARK = [0, 3, 5, 7, 10];

// Un tema = radice (Hz) + passo (ms) + scala + timbro + melodia (gradi, null = pausa).
// I gradi >4 salgono d'ottava (es. 5 = grado 0 un'ottava sopra).
const THEMES = {
  jungle: {
    root: 523.25, // C5, luminoso
    step: 270,
    scale: MAJOR,
    wave: 'triangle',
    vol: 0.045,
    melody: [0, 2, 3, null, 2, 3, 4, null, 3, 4, 5, 4, 3, 2, 0, null],
  },
  ice: {
    root: 587.33, // D5, cristallino
    step: 340,
    scale: MAJOR,
    wave: 'sine',
    vol: 0.05,
    melody: [4, null, 3, null, 2, null, 3, 4, null, 5, null, 4, 3, null, 2, null],
  },
  volcano: {
    root: 349.23, // F4, più basso e teso
    step: 300,
    scale: DARK,
    wave: 'triangle',
    vol: 0.05,
    melody: [0, null, 1, 0, 2, null, 1, null, 0, 1, 2, 3, 2, 1, 0, null],
  },
  night: {
    root: 440, // A4, quieto
    step: 380,
    scale: MAJOR,
    wave: 'sine',
    vol: 0.045,
    melody: [2, null, null, 4, null, null, 3, null, 5, null, null, 4, null, 2, null, null],
  },
  city: {
    root: 523.25, // C5, vivace
    step: 210,
    scale: MAJOR,
    wave: 'triangle',
    vol: 0.04,
    melody: [0, 2, 4, 2, 5, 4, 2, 0, 3, 4, 5, 4, 2, 3, 2, 0],
  },
  forest: {
    root: 466.16, // Bb4, calmo
    step: 330,
    scale: MAJOR,
    wave: 'sine',
    vol: 0.045,
    melody: [3, null, 2, null, 0, null, 2, 3, null, 4, null, 3, null, 2, null, null],
  },
  castle: {
    root: 311.13, // Eb4, misterioso
    step: 350,
    scale: DARK,
    wave: 'triangle',
    vol: 0.05,
    melody: [0, null, 2, null, 1, null, 3, null, 2, null, 4, 3, 2, 1, 0, null],
  },
  space: {
    root: 659.25, // E5, etereo (note lunghe e rade)
    step: 420,
    scale: MAJOR,
    wave: 'sine',
    vol: 0.04,
    sustain: 2.4, // le note durano di più: senso di vuoto cosmico
    melody: [0, null, null, 4, null, null, 5, null, null, 3, null, null, 2, null, null, null],
  },
  boss: {
    root: 220, // A3, incalzante e scuro
    step: 185,
    scale: DARK,
    wave: 'square',
    vol: 0.03,
    melody: [0, 0, 3, 0, 2, 0, 3, 4, 0, 0, 3, 0, 5, 4, 3, 2],
  },
  celebration: {
    root: 523.25, // C5, festa!
    step: 190,
    scale: MAJOR,
    wave: 'triangle',
    vol: 0.045,
    melody: [0, 2, 4, 5, 7, 5, 4, 2, 0, 4, 7, 9, 7, 5, 4, 2],
  },
};

export default class MusicManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.themeKey = null;
    this.stepIndex = 0;
    this.intervalId = null;
  }

  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  // DUCKING: abbassa la musica mentre parla Kukkai (in un gioco di pronuncia
  // le PAROLE devono vincere il mix), poi risale dolcemente in `sec` secondi.
  duck(sec = 1.4) {
    if (!this.ctx || !this.master) return;
    try {
      const t = this.ctx.currentTime;
      const g = this.master.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0.22, t + 0.08);
      g.linearRampToValueAtTime(1, t + 0.08 + sec);
    } catch (e) {
      // il ducking è cosmetico: mai rompere l'audio
    }
  }

  // Frequenza del grado `deg` della scala del tema (i gradi alti salgono d'ottava).
  freqOf(theme, deg) {
    const scale = theme.scale;
    const octave = Math.floor(deg / scale.length);
    const semis = scale[deg % scale.length] + octave * 12;
    return theme.root * Math.pow(SEMITONE, semis);
  }

  // Una nota morbida: attacco rapido, coda dolce (niente "click").
  note(freq, wave, vol, durSec) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + durSec + 0.05);
  }

  play(themeKey) {
    if (this.themeKey === themeKey && this.intervalId) return; // già in corso
    this.stop();
    const theme = THEMES[themeKey];
    if (!theme || !this.ensureCtx()) return;
    this.themeKey = themeKey;
    this.stepIndex = 0;

    this.intervalId = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const deg = theme.melody[this.stepIndex % theme.melody.length];
      const durSec = (theme.sustain || 1.6) * (theme.step / 1000);
      if (deg !== null) this.note(this.freqOf(theme, deg), theme.wave, theme.vol, durSec);
      // Basso: la fondamentale un'ottava sotto, ogni 4 passi (dà il "battito").
      if (this.stepIndex % 4 === 0) this.note(theme.root / 2, 'sine', theme.vol * 0.9, durSec * 1.4);
      this.stepIndex++;
    }, theme.step);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.themeKey = null;
  }
}
