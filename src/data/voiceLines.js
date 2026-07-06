import { KUKKAI_INTRO, KUKKAI_LEVEL_END } from './dialogues.js';

// Mappa: battuta di Kukkai -> chiave dell'MP3 (voce vera, generata con ElevenLabs).
// È costruita dagli STESSI array dei dialoghi, così il testo combacia sempre
// con quello pronunciato in gioco (niente doppioni da tenere allineati a mano).
// I file stanno in public/audio/<chiave>.mp3 e vengono caricati in BootScene.
export const VOICE_LINES = [
  ...KUKKAI_INTRO.map((text, i) => ({ key: `kukkai_intro_${i}`, text })),
  ...[1, 2, 3].flatMap((lvl) =>
    (KUKKAI_LEVEL_END[lvl] || []).map((text, i) => ({ key: `kukkai_l${lvl}_${i}`, text }))
  ),
];
