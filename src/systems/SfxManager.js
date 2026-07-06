// SfxManager: piccoli effetti sonori "arcade" sintetizzati al volo con la Web
// Audio API (niente file audio). Un solo AudioContext condiviso (creato al primo
// suono, dopo un gesto dell'utente, come richiedono i browser).
export default class SfxManager {
  constructor() {
    this.ctx = null;
  }

  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    // Se sospeso (prima del gesto utente), provo a riattivarlo.
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // Suona una singola nota. freq in Hz, dur in secondi; slideTo = glissato opzionale.
  tone(freq, dur, { type = 'square', volume = 0.12, slideTo = null, delay = 0 } = {}) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // sfumatura in coda
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  // --- Effetti del gioco ---
  jump() {
    this.tone(300, 0.14, { type: 'square', slideTo: 640, volume: 0.1 });
  }

  // Nemico sconfitto / parola imparata: due note allegre in salita (stile "coin").
  defeat() {
    this.tone(880, 0.09, { type: 'square', volume: 0.1 });
    this.tone(1320, 0.13, { type: 'square', volume: 0.1, delay: 0.09 });
  }

  // Nemico colpito ma vivo (nemici a più colpi): "tink" secco.
  tink() {
    this.tone(1200, 0.05, { type: 'square', volume: 0.08 });
  }

  // Captain si fa male: nota che scende, un po' aspra.
  hurt() {
    this.tone(320, 0.28, { type: 'sawtooth', slideTo: 90, volume: 0.12 });
  }

  sword() {
    this.tone(720, 0.09, { type: 'square', slideTo: 300, volume: 0.09 });
  }

  magic() {
    this.tone(520, 0.26, { type: 'sine', slideTo: 1500, volume: 0.1 });
  }

  // Traguardo raggiunto: piccola fanfara.
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.16, { type: 'square', volume: 0.1, delay: i * 0.13 }));
  }

  click() {
    this.tone(600, 0.05, { type: 'square', volume: 0.09 });
  }
}
