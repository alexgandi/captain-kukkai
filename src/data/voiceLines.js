import { KUKKAI_INTRO, KUKKAI_LEVEL_END } from './dialogues.js';
import vocabulary from './vocabulary.json';

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
  // Le singole PAROLE del vocabolario (pronunciate imparandole / toccandole / nel quiz).
  ...vocabulary.map((w) => ({ key: wordKey(w.english), text: w.english })),
];
