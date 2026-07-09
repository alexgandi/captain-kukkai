// I VERBI D'AZIONE per il gioco "Do what I say!" (Total Physical Response):
// Kukkai pronuncia un verbo, il bambino tocca il pulsante giusto e Captain
// esegue il movimento. Imparare col corpo (TPR) fissa le parole molto meglio.
//
// Restano in un file SEPARATO (non in vocabulary.json): non appartengono a un
// livello e non devono finire nei quiz per tema. La chiave voce è `action_<eng>`
// (MP3 in public/audio/, con fallback alla voce sintetica).
export const ACTION_VERBS = [
  { english: 'run', thai: 'วิ่ง', romanization: 'wîng', icon: '🏃', anim: 'run' },
  { english: 'jump', thai: 'กระโดด', romanization: 'grà-dòot', icon: '🦘', anim: 'jump' },
  { english: 'stop', thai: 'หยุด', romanization: 'yùt', icon: '✋', anim: 'stop' },
  { english: 'clap', thai: 'ตบมือ', romanization: 'dtòp-mʉʉ', icon: '👏', anim: 'clap' },
  { english: 'spin', thai: 'หมุน', romanization: 'mǔn', icon: '🌀', anim: 'spin' },
  { english: 'fly', thai: 'บิน', romanization: 'bin', icon: '🕊️', anim: 'fly' },
  { english: 'swim', thai: 'ว่ายน้ำ', romanization: 'wâai-náam', icon: '🏊', anim: 'swim' },
  { english: 'wave', thai: 'โบกมือ', romanization: 'bòhk-mʉʉ', icon: '👋', anim: 'wave' },
];

export const actionKey = (english) => `action_${english}`;
