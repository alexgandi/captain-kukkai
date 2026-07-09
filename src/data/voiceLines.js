import { KUKKAI_INTRO, KUKKAI_LEVEL_END, KUKKAI_LEVEL_START } from './dialogues.js';
import vocabulary from './vocabulary.json';
import { ACTION_VERBS, actionKey } from './actionVerbs.js';
import { PHRASES } from './phrases.js';

// Chiave-file sicura per una parola: minuscolo, non-alfanumerici -> "_".
// (Deve combaciare con il nome dell'MP3 in public/audio/, es. "five hundred"
// -> word_five_hundred.mp3, "tuk-tuk" -> word_tuk_tuk.mp3)
export const wordKey = (english) =>
  'word_' + english.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Mappa: TESTO pronunciato in gioco -> chiave dell'MP3 (voce vera, ElevenLabs).
// Costruita dagli STESSI dati (dialoghi + vocabolario), così il testo combacia
// sempre con quello parlato (niente doppioni da allineare a mano).
// I file stanno in public/audio/<chiave>.mp3 e vengono caricati in BootScene.
export const VOICE_LINES = [
  ...KUKKAI_INTRO.map((text, i) => ({ key: `kukkai_intro_${i}`, text })),
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((lvl) =>
    (KUKKAI_LEVEL_END[lvl] || []).map((text, i) => ({ key: `kukkai_l${lvl}_${i}`, text }))
  ),
  // Annuncio del tema all'inizio di ogni livello.
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => ({ key: `kukkai_start_${lvl}`, text: KUKKAI_LEVEL_START[lvl] })),
  // Le singole PAROLE del vocabolario (pronunciate imparandole / toccandole / nel quiz).
  ...vocabulary.map((w) => ({ key: wordKey(w.english), text: w.english })),
  // I VERBI D'AZIONE (gioco "Do what I say!"): Kukkai comanda, il bimbo esegue.
  ...ACTION_VERBS.map((v) => ({ key: actionKey(v.english), text: v.english })),
  { key: 'action_intro', text: 'Listen, and do what I say!' },
  { key: 'action_win', text: 'Amazing! You did it!' },
  // Le MINI-FRASI (gioco "Build the words you hear!").
  ...PHRASES.map((p) => ({ key: p.key, text: p.text })),
  { key: 'phrase_intro', text: 'Build the words you hear!' },
  { key: 'phrase_win', text: 'Wonderful! You made it!' },
];
