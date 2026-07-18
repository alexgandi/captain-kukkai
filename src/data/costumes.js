// COSTUMI di Captain: cappellini sbloccabili guadagnando stelle, manghi, livelli
// e parole. Sono un ACCESSORIO (emoji) indossato sopra la testa di Captain nel
// gioco; il bambino li sceglie nel Guardaroba. `cond(progress)` dice quando si
// sblocca; `none` è sempre disponibile (nessun cappello extra).
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
const totalStars = (p) => LEVELS.reduce((s, l) => s + p.getStars(l), 0);
const totalMangoes = (p) => LEVELS.reduce((s, l) => s + p.getMangoes(l), 0);

export const COSTUMES = [
  { id: 'none', emoji: '', name: 'Captain', hint: 'Always yours', cond: () => true },
  { id: 'cowboy', emoji: '🤠', name: 'Cowboy', hint: 'Beat 2 levels', cond: (p) => p.completedLevels.size >= 2 },
  { id: 'crown', emoji: '👑', name: 'King', hint: 'Earn 6 stars', cond: (p) => totalStars(p) >= 6 },
  { id: 'grad', emoji: '🎓', name: 'Scholar', hint: 'Learn 40 words', cond: (p) => p.getCollectedWords().length >= 40 },
  { id: 'helmet', emoji: '⛑️', name: 'Explorer', hint: 'Find 6 mangoes', cond: (p) => totalMangoes(p) >= 6 },
  { id: 'tophat', emoji: '🎩', name: 'Fancy', hint: 'Earn 12 stars', cond: (p) => totalStars(p) >= 12 },
  { id: 'sunhat', emoji: '👒', name: 'Sunny', hint: 'Beat 6 levels', cond: (p) => p.completedLevels.size >= 6 },
  { id: 'party', emoji: '🥳', name: 'Party', hint: 'Free Teacher Kukkai', cond: (p) => p.isLevelDone(8) },
  // COSTUMI DA STREAK: si sbloccano tornando ogni giorno — la fiammella sul
  // menu ora PROMETTE qualcosa, non è solo un numero.
  { id: 'flame', emoji: '🔥', name: 'On fire', hint: 'Play 3 days in a row', cond: (p) => (p.streak || 0) >= 3 },
  { id: 'star', emoji: '🌟', name: 'Superstar', hint: 'Play 7 days in a row', cond: (p) => (p.streak || 0) >= 7 },
];

export function getCostume(id) {
  return COSTUMES.find((c) => c.id === id) || COSTUMES[0];
}
