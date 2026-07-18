import { VOICE_LINES } from '../data/voiceLines.js';

// AudioManager: gestisce la voce del gioco. Preferisce gli MP3 REGISTRATI
// (voce vera di Kukkai, generata con ElevenLabs) e, se manca il file per una
// certa frase, ricade sulla voce sintetica del browser (speechSynthesis).
// REGOLA DEL PROGETTO: si pronuncia SOLO l'inglese; il thai resta testo.
export default class AudioManager {
  constructor(scene = null) {
    this.scene = scene; // serve per riprodurre gli MP3 (scene.sound)

    // Mappa testo-battuta -> chiave MP3 (dai dati in voiceLines.js).
    this.lineToKey = {};
    VOICE_LINES.forEach((v) => {
      this.lineToKey[v.text] = v.key;
    });
    this.currentSound = null;

    // --- Voce sintetica (fallback) ---
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.voice = null;
    if (this.supported) {
      this.loadVoice();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoice();
    }

    // Grafie fonetiche: SOLO per la voce sintetica (gli MP3 sono già giusti).
    this.pronunciations = {
      Kukkai: 'Cook Guy',
    };
  }

  loadVoice() {
    const voices = window.speechSynthesis.getVoices();
    this.voice = voices.find((v) => /^en[-_]/i.test(v.lang)) || voices[0] || null;
  }

  applyPronunciations(text) {
    let out = text;
    for (const [word, phonetic] of Object.entries(this.pronunciations)) {
      out = out.replace(new RegExp(word, 'gi'), phonetic);
    }
    return out;
  }

  // Pronuncia un testo (inglese). MP3 registrato se disponibile, altrimenti sintetico.
  speak(text) {
    if (!text) return;

    // DUCKING: la musica si abbassa mentre la voce parla (frasi lunghe = più a lungo).
    const music = this.scene && this.scene.registry.get('music');
    if (music && music.duck) music.duck(Math.min(4, 0.9 + text.length * 0.05));

    // 1) C'è un MP3 registrato per questa esatta frase? Riproducilo.
    const key = this.lineToKey[text];
    if (key && this.scene && this.scene.cache.audio.exists(key)) {
      if (this.supported) window.speechSynthesis.cancel(); // niente doppioni
      if (this.currentSound) {
        this.currentSound.stop();
        this.currentSound.destroy();
      }
      this.currentSound = this.scene.sound.add(key);
      if (this.scene.sound.locked) {
        // TELEFONO: l'audio si sblocca solo dentro un gesto. Se siamo ancora
        // "locked", la battuta parte appena Phaser emette 'unlocked' invece di
        // andare persa (tipico: la prima frase di Kukkai dopo il Play su iOS).
        const snd = this.currentSound;
        this.scene.sound.once('unlocked', () => {
          if (snd === this.currentSound && snd.manager) snd.play();
        });
      } else {
        this.currentSound.play();
      }
      return;
    }

    // 2) Fallback: voce sintetica del browser.
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(this.applyPronunciations(text));
    utterance.lang = 'en-US';
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.15;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }
}
