// ProgressManager: tiene il progresso che deve SOPRAVVIVERE tra un livello e
// l'altro (le scene si fermano e ripartono, quindi non basta VocabularyManager
// che è per-scena). Vive nel registry del gioco (creato in BootScene).
//
// Tiene: livelli finiti + parole imparate + STELLE per livello (1-3).
// E ora PERSISTE in localStorage: chiudere/ricaricare la pagina non azzera
// più il Word Book né la mappa. "Play again" (reset) pulisce anche il salvataggio.
const STORAGE_KEY = 'captain_kukkai_progress_v1';

export default class ProgressManager {
  constructor() {
    this.completedLevels = new Set();
    this.collectedWords = new Set(); // parole inglesi imparate in tutta la partita
    this.stars = {}; // { [livello]: 1..3 } — il MIGLIOR risultato ottenuto
    this.mangoes = {}; // { [livello]: 0..3 } — manghi dorati trovati (best)
    this.load();
  }

  // --- Persistenza (localStorage) ---
  save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          levels: [...this.completedLevels],
          words: [...this.collectedWords],
          stars: this.stars,
          mangoes: this.mangoes,
        })
      );
    } catch (e) {
      // localStorage pieno o bloccato (es. private mode): il gioco continua senza salvare.
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      (data.levels || []).forEach((l) => this.completedLevels.add(l));
      (data.words || []).forEach((w) => this.collectedWords.add(w));
      this.stars = data.stars || {};
      this.mangoes = data.mangoes || {};
    } catch (e) {
      // Salvataggio corrotto: si riparte puliti.
    }
  }

  // --- Parole ---
  addWord(english) {
    this.collectedWords.add(english);
    this.save();
  }

  getCollectedWords() {
    return [...this.collectedWords];
  }

  // --- Livelli ---
  markLevelDone(level) {
    this.completedLevels.add(level);
    this.save();
  }

  isLevelDone(level) {
    return this.completedLevels.has(level);
  }

  allLevelsDone(total) {
    return this.completedLevels.size >= total;
  }

  // --- Stelle (1-3 per livello): si tiene sempre il risultato MIGLIORE ---
  setStars(level, stars) {
    this.stars[level] = Math.max(this.stars[level] || 0, stars);
    this.save();
  }

  getStars(level) {
    return this.stars[level] || 0;
  }

  // --- Manghi dorati (0-3 per livello): si tiene il record migliore ---
  setMangoes(level, count) {
    this.mangoes[level] = Math.max(this.mangoes[level] || 0, count);
    this.save();
  }

  getMangoes(level) {
    return this.mangoes[level] || 0;
  }

  // Ricomincia la partita da capo (usato dal "Play again" del finale).
  reset() {
    this.completedLevels.clear();
    this.collectedWords.clear();
    this.stars = {};
    this.mangoes = {};
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // niente storage: pazienza.
    }
  }
}
