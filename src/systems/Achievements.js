import { GAME_WIDTH } from '../config.js';

// MEDAGLIERE: i traguardi che Captain può sbloccare giocando. Alcuni si
// controllano dallo STATO (parole/stelle/manghi/livelli: `test`), altri sono
// legati a un EVENTO (giocare un mini-gioco: `test: null`, sbloccati a mano).
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
const totalMangoes = (p) => LEVELS.reduce((s, l) => s + p.getMangoes(l), 0);

export const ACHIEVEMENTS = [
  { id: 'first_word', icon: '🌱', title: 'First Word', desc: 'Learn your first word', test: (p) => p.getCollectedWords().length >= 1 },
  { id: 'words_25', icon: '📚', title: 'Bookworm', desc: 'Learn 25 words', test: (p) => p.getCollectedWords().length >= 25 },
  { id: 'words_50', icon: '🧠', title: 'Word Master', desc: 'Learn 50 words', test: (p) => p.getCollectedWords().length >= 50 },
  { id: 'words_all', icon: '👑', title: 'All Words!', desc: 'Learn every word', test: (p, tot) => p.getCollectedWords().length >= tot },
  { id: 'first_star', icon: '⭐', title: 'First Star', desc: 'Earn a star', test: (p) => LEVELS.some((l) => p.getStars(l) >= 1) },
  { id: 'flawless', icon: '🏆', title: 'Flawless', desc: 'Get 3 stars in a level', test: (p) => LEVELS.some((l) => p.getStars(l) >= 3) },
  { id: 'mango_hunter', icon: '🥭', title: 'Mango Hunter', desc: 'Find all 3 mangoes in a level', test: (p) => LEVELS.some((l) => p.getMangoes(l) >= 3) },
  { id: 'golden_touch', icon: '🏵️', title: 'Golden Touch', desc: 'Find all 24 mangoes', test: (p) => totalMangoes(p) >= 24 },
  { id: 'halfway', icon: '🧗', title: 'Halfway There', desc: 'Beat 4 levels', test: (p) => p.completedLevels.size >= 4 },
  { id: 'hero', icon: '🦸', title: 'Hero!', desc: 'Free Teacher Kukkai', test: (p) => p.isLevelDone(8) },
  { id: 'mover', icon: '🏃', title: 'Mover', desc: 'Play the Action game', test: null },
  { id: 'builder', icon: '🧩', title: 'Phrase Builder', desc: 'Build a phrase', test: null },
  // SEGRETA (stile Sprunki): la descrizione non svela nulla — i bambini devono
  // scoprirla giocando (tocca Mango 5 volte di fila!) e raccontarsela.
  { id: 'golden_mango', icon: '🌟', title: 'Golden Mango', desc: 'Secret! 🤫', test: null, secret: true },
];

export function getAchievement(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

// Controlla le medaglie "da stato" e sblocca quelle appena raggiunte.
// Ritorna la lista delle NUOVE medaglie (per mostrare le notifiche).
export function evaluateAchievements(progress, vocabTotal) {
  const newly = [];
  if (!progress) return newly;
  ACHIEVEMENTS.forEach((a) => {
    if (a.test && !progress.hasAchievement(a.id) && a.test(progress, vocabTotal)) {
      if (progress.unlockAchievement(a.id)) newly.push(a);
    }
  });
  return newly;
}

// Toast "Achievement!" che scende dall'alto, uno dopo l'altro.
export function showAchievementToasts(scene, list) {
  if (!list || !list.length) return;
  const sfx = scene.registry.get('sfx');
  list.forEach((a, i) => {
    scene.time.delayedCall(i * 1700, () => {
      if (sfx) sfx.win();
      const box = scene.add.container(GAME_WIDTH / 2, -40).setDepth(1000);
      const bg = scene.add.graphics();
      bg.fillStyle(0x1c1030, 0.96);
      bg.fillRoundedRect(-165, -26, 330, 52, 14);
      bg.lineStyle(3, 0xffd166, 1);
      bg.strokeRoundedRect(-165, -26, 330, 52, 14);
      const icon = scene.add.text(-140, 0, a.icon, { fontSize: '28px' }).setOrigin(0.5);
      const head = scene.add.text(-114, -10, '🏅 Achievement unlocked!', { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0, 0.5);
      const title = scene.add.text(-114, 10, a.title, { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5);
      box.add([bg, icon, head, title]);
      scene.tweens.add({ targets: box, y: 54, duration: 420, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: box, y: -60, delay: 1550, duration: 380, ease: 'Back.easeIn', onComplete: () => box.destroy() });
    });
  });
}
