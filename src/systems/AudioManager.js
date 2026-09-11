import { VOICE_LINES } from '../data/voiceLines.js';
import { ensureAudio } from './VoiceLoader.js';

// Quanto aspettare un MP3 ancora in scaricamento prima di ripiegare sulla voce
// sintetica: dalla cache offline arriva in un attimo, su 4G in meno di un
// secondo; su una rete lenta il bimbo non deve comunque restare senza risposta.
const LAZY_WAIT_MS = 3000;

// AudioManager: gestisce la voce del gioco. Preferisce gli MP3 REGISTRATI
// (voce vera di Kukkai, generata con ElevenLabs) e, se manca il file per una
// certa frase, ricade sulla voce sintetica del browser (speechSynthesis).
// Gli MP3 si caricano "lazy" (VoiceLoader): se una battuta non è ancora in
// memoria, la si scarica al volo e la si dice appena arriva.
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
    // Progressivo delle richieste: una battuta ancora in scaricamento non deve
    // parlare SOPRA una chiesta dopo (es. il bimbo ha già toccato "avanti").
    this.speakSeq = 0;
    // Alla chiusura della scena i caricamenti in ritardo vengono ignorati e
    // l'ultimo suono viene distrutto (se sta ancora parlando, finisce e poi
    // si distrugge da solo): niente suoni fermi-ma-vivi nel sound manager.
    this.alive = true;
    if (scene && scene.events) {
      scene.events.once('shutdown', () => {
        this.alive = false;
        this.speakSeq += 1;
        const snd = this.currentSound;
        this.currentSound = null;
        if (snd && !snd.isPlaying) snd.destroy();
      });
    }

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
    const seq = ++this.speakSeq;

    // DUCKING: la musica si abbassa mentre la voce parla (frasi lunghe = più a lungo).
    const music = this.scene && this.scene.registry.get('music');
    if (music && music.duck) music.duck(Math.min(4, 0.9 + text.length * 0.05));

    const key = this.lineToKey[text];
    if (key && this.scene) {
      // 1) L'MP3 è già in memoria: si suona subito.
      if (this.scene.cache.audio.exists(key)) {
        this.playKey(key);
        return;
      }
      // 2) Non ancora (caricamento lazy): lo scarico ORA e lo suono appena
      // arriva, se nel frattempo nessuno ha chiesto un'altra battuta. Se tarda
      // troppo, parla la voce sintetica e l'MP3 (quando arriva) resta per dopo.
      let settled = false;
      const fallbackTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (seq === this.speakSeq && this.alive) this.speakSynthetic(text);
      }, LAZY_WAIT_MS);
      ensureAudio(this.scene, [key]).then(() => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        if (seq !== this.speakSeq || !this.alive) return;
        if (this.scene.cache.audio.exists(key)) this.playKey(key);
        else this.speakSynthetic(text);
      });
      return;
    }

    // 3) Nessun MP3 previsto per questo testo: voce sintetica del browser.
    this.speakSynthetic(text);
  }

  // Riproduce un MP3 già in cache, fermando quello precedente.
  playKey(key) {
    if (this.supported) window.speechSynthesis.cancel(); // niente doppioni
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound.destroy();
    }
    const snd = this.scene.sound.add(key);
    this.currentSound = snd;
    // A fine battuta il suono si distrugge da solo (non resta nel sound manager).
    snd.once('complete', () => {
      if (this.currentSound === snd) this.currentSound = null;
      snd.destroy();
    });
    if (this.scene.sound.locked) {
      // TELEFONO: l'audio si sblocca solo dentro un gesto. Se siamo ancora
      // "locked", la battuta parte appena Phaser emette 'unlocked' invece di
      // andare persa (tipico: la prima frase di Kukkai dopo il Play su iOS).
      this.scene.sound.once('unlocked', () => {
        if (snd === this.currentSound && snd.manager) snd.play();
      });
    } else {
      snd.play();
    }
  }

  // Fallback: voce sintetica del browser.
  speakSynthetic(text) {
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
