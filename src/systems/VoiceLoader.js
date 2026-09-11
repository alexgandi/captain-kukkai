import { KUKKAI_INTRO, KUKKAI_LEVEL_END } from '../data/dialogues.js';
import vocabulary from '../data/vocabulary.json';
import { VOICE_LINES, wordKey } from '../data/voiceLines.js';
import { ACTION_VERBS, actionKey } from '../data/actionVerbs.js';
import { PHRASES } from '../data/phrases.js';

// VoiceLoader: gli MP3 della voce si caricano SOLO quando servono.
//
// PERCHÉ: caricare tutti i 164 MP3 al boot (5,4 MB) significava ~58 MB di PCM
// decodificato residente per tutta la sessione, 164 richieste prima del menu e
// secondi di decodifica sui telefoni economici. Ora il boot carica 7 effetti
// sonori, e ogni scena chiede il SUO pacchetto (l'intro, il livello N, i verbi
// del mini-gioco...). Il service worker tiene i file in cache (cache-first),
// quindi dalla seconda volta il "download" è locale e istantaneo.
//
// SICUREZZA: AudioManager.speak e playFx sanno già cavarsela se una chiave
// manca (voce sintetica / suono sintetico), quindi un caricamento fallito o in
// ritardo non blocca mai il gioco. ensureAudio NON rigetta mai: risolve quando
// i file sono arrivati, oppure hanno fallito, oppure la scena è stata chiusa.

// Effetti sonori usati ovunque (spada, magia, tonfi...): questi restano al boot.
export const GLOBAL_AUDIO = ['sfx_horn', 'sfx_thud', 'sfx_rhino', 'sfx_swordfx', 'sfx_magicfx', 'sfx_laserfx', 'sfx_stompfx'];

// Voci e musiche che NON sono battute di Kukkai (quindi fuori da VOICE_LINES):
// lo Yaksha, il tema della mappa, la sigla. Servono all'elenco completo qui sotto.
export const EXTRA_AUDIO = ['yaksha_laugh', 'yaksha_kidnap', 'yaksha_boss', 'yaksha_defeat', 'theme_song', 'title_jingle'];

// TUTTI gli MP3 del gioco (= i file in public/audio): è l'elenco che il
// riscaldamento della cache offline (audioWarmup.js) scarica in sottofondo.
export const allAudioKeys = () => [...new Set([...GLOBAL_AUDIO, ...VOICE_LINES.map((v) => v.key), ...EXTRA_AUDIO])];

export const audioUrl = (key) => `audio/${key}.mp3`;

// --- Pacchetti per scena -----------------------------------------------------

// Tutto ciò che si può sentire nel livello N: annuncio del tema, complimenti
// finali (LevelCompleteScene), le parole del livello, lo Yaksha quando compare.
export function levelAudioKeys(level) {
  const keys = [`kukkai_start_${level}`];
  (KUKKAI_LEVEL_END[level] || []).forEach((_, i) => keys.push(`kukkai_l${level}_${i}`));
  vocabulary.filter((w) => w.level === level).forEach((w) => keys.push(wordKey(w.english)));
  // Parole dette in QUALSIASI livello: "mango" (il Mango Dorato) ed "elephant"
  // (Mango l'elefantino ripete l'ultima parola; prima di impararne una dice quella).
  keys.push(wordKey('mango'), wordKey('elephant'));
  // Lo Yaksha: risate nei sorvoli (L5-7), rapimento (L7), boss e sconfitta (L8).
  if (level >= 5 && level <= 7) keys.push('yaksha_laugh');
  if (level === 7) keys.push('yaksha_kidnap');
  if (level === 8) keys.push('yaksha_boss', 'yaksha_defeat', 'yaksha_laugh');
  return [...new Set(keys)];
}

export const introAudioKeys = () => KUKKAI_INTRO.map((_, i) => `kukkai_intro_${i}`);
export const wordsAudioKeys = (words) => words.map((w) => wordKey(w.english));
export const actionAudioKeys = () => [...ACTION_VERBS.map((v) => actionKey(v.english)), 'action_intro', 'action_win'];
export const phraseAudioKeys = () => [...PHRASES.map((p) => p.key), 'phrase_intro', 'phrase_win'];

// --- Caricamento ---------------------------------------------------------------

// Chiavi che hanno fallito di recente (404, rete giù): non le ritento a raffica.
const FAILED_AT = new Map();
const RETRY_MS = 30000;

// Richieste già PARTITE (da qualsiasi scena, anche una ormai chiusa): un file
// in scaricamento arriva in cache comunque, quindi la scena nuova non lo
// richiede una seconda volta ma aspetta l'evento 'add' della cache audio.
// (Tipico: la mappa pre-carica il livello, il bimbo tocca subito "Start".)
const INFLIGHT = new Map();
const INFLIGHT_TTL = 20000;

// Quanti caricamenti sono in corso: il riscaldamento della cache (audioWarmup)
// si ferma finché il gioco sta scaricando qualcosa che serve SUBITO.
let activeLoads = 0;
export const isVoiceLoading = () => activeLoads > 0;

// Carica (se mancano) le chiavi audio nella scena data. Ritorna una Promise che
// risolve quando ogni chiave è in cache O ha fallito O la scena si è chiusa —
// mai un reject, mai un'attesa infinita (c'è un timeout di sicurezza).
export function ensureAudio(scene, keys, { timeout = 15000 } = {}) {
  try {
    const loader = scene && scene.load;
    const cache = scene && scene.cache && scene.cache.audio;
    if (!loader || !cache || !Array.isArray(keys)) return Promise.resolve();
    const now = Date.now();
    const wanted = [...new Set(keys)].filter(
      (k) => k && !cache.exists(k) && !(FAILED_AT.has(k) && now - FAILED_AT.get(k) < RETRY_MS)
    );
    if (!wanted.length) return Promise.resolve();
    // Scena già chiusa (loader in shutdown): niente da fare.
    if (!loader.isReady() && !loader.isLoading()) return Promise.resolve();
    // Da richiedere davvero: solo ciò che nessuno sta già scaricando.
    const toRequest = wanted.filter((k) => !(INFLIGHT.has(k) && now - INFLIGHT.get(k) < INFLIGHT_TTL));

    return new Promise((resolve) => {
      const pending = new Set(wanted);
      let done = false;
      let timer = null;
      activeLoads += 1;
      const finish = () => {
        if (done) return;
        done = true;
        activeLoads -= 1;
        clearTimeout(timer);
        cache.events.off('add', onAdd);
        loader.off('loaderror', onError);
        loader.off('complete', onComplete);
        scene.events.off('shutdown', finish);
        resolve();
      };
      const settle = (key) => {
        if (pending.delete(key) && pending.size === 0) finish();
      };
      // Arrivato in cache (da questo loader o da quello di una scena chiusa).
      const onAdd = (_cache, key) => {
        INFLIGHT.delete(key);
        settle(key);
      };
      const onError = (file) => {
        if (!file) return;
        FAILED_AT.set(file.key, Date.now());
        INFLIGHT.delete(file.key);
        settle(file.key);
      };
      // Questo loader ha finito: ciò che dovevo caricare io e non è in cache è
      // fallito (es. errore di decodifica, che non emette 'loaderror').
      const onComplete = () => {
        toRequest.forEach((k) => {
          if (pending.has(k) && !cache.exists(k)) {
            INFLIGHT.delete(k);
            settle(k);
          }
        });
      };
      timer = setTimeout(finish, timeout);
      cache.events.on('add', onAdd);
      loader.on('loaderror', onError);
      loader.on('complete', onComplete);
      scene.events.once('shutdown', finish);

      toRequest.forEach((k) => {
        INFLIGHT.set(k, now);
        loader.audio(k, audioUrl(k));
      });
      // Se il loader sta già scaricando, i nuovi file entrano nella coda da soli.
      if (toRequest.length && !loader.isLoading()) loader.start();
    });
  } catch (e) {
    return Promise.resolve();
  }
}

// Libera dalla memoria gli MP3 "di scena" che NON servono adesso (voce, Yaksha,
// tema, sigla). Gli effetti sonori globali non si toccano. Un suono già in
// riproduzione continua fino alla fine: si toglie solo la voce dalla cache,
// e la prossima scena che ne ha bisogno la ricarica (dal service worker).
const EVICTABLE = /^(kukkai_|word_|action_|phrase_|yaksha_|theme_song$|title_jingle$)/;
export function pruneAudio(scene, keep = []) {
  try {
    const cache = scene.cache.audio;
    const keepSet = new Set(keep);
    cache.entries.keys().forEach((k) => {
      if (EVICTABLE.test(k) && !keepSet.has(k)) cache.remove(k);
    });
  } catch (e) {
    // Liberare memoria è un'ottimizzazione: mai bloccare la scena per questo.
  }
}
