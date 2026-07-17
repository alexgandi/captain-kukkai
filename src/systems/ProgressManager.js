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
    this.mistakes = {}; // { [inglese]: quante volte sbagliata } — per il RIPASSO mirato
    this.achievements = new Set(); // id delle medaglie sbloccate
    this.stickers = new Set(); // id degli sticker dell'album (uno per livello completato)
    this.costume = 'none'; // il cappello/costume scelto per Captain
    this.playerName = ''; // il nome del bambino (per il diploma)
    this.streak = 0; // giorni CONSECUTIVI di gioco (la fiammella 🔥)
    this.lastPlayDay = ''; // ultimo giorno di gioco (per capire se la serie continua)
    this.uiLang = 'en'; // lingua della CORNICE (menu/pulsanti): 'en' | 'th'
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
          mistakes: this.mistakes,
          achievements: [...this.achievements],
          stickers: [...this.stickers],
          costume: this.costume,
          playerName: this.playerName,
          streak: this.streak,
          lastPlayDay: this.lastPlayDay,
          uiLang: this.uiLang,
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
      this.mistakes = data.mistakes || {};
      (data.achievements || []).forEach((a) => this.achievements.add(a));
      (data.stickers || []).forEach((s) => this.stickers.add(s));
      this.costume = data.costume || 'none';
      this.playerName = data.playerName || '';
      this.streak = data.streak || 0;
      this.lastPlayDay = data.lastPlayDay || '';
      this.uiLang = data.uiLang || 'en';
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

  // --- Errori / RIPASSO MIRATO ---
  // Ogni volta che una parola viene sbagliata nel quiz, sale il suo contatore:
  // così il motore del quiz può riproporla più spesso finché non è padroneggiata.
  recordMistake(english) {
    if (!english) return;
    this.mistakes[english] = (this.mistakes[english] || 0) + 1;
    this.save();
  }

  // Parola indovinata al primo colpo: è considerata imparata, esce dal ripasso.
  clearMistake(english) {
    if (this.mistakes[english]) {
      delete this.mistakes[english];
      this.save();
    }
  }

  // Le parole ancora da ripassare, dalla più sbagliata alla meno.
  getReviewWords() {
    return Object.keys(this.mistakes).sort((a, b) => this.mistakes[b] - this.mistakes[a]);
  }

  // --- Medaglie / traguardi ---
  hasAchievement(id) {
    return this.achievements.has(id);
  }

  // Sblocca una medaglia; ritorna true SOLO se è la prima volta (per la notifica).
  unlockAchievement(id) {
    if (this.achievements.has(id)) return false;
    this.achievements.add(id);
    this.save();
    return true;
  }

  getAchievements() {
    return [...this.achievements];
  }

  // --- Sticker dell'album (meta-collezione) ---
  addSticker(id) {
    if (!id || this.stickers.has(id)) return false;
    this.stickers.add(id);
    this.save();
    return true;
  }

  getStickers() {
    return [...this.stickers];
  }

  // --- STREAK: giorni consecutivi di gioco (abitudine quotidiana) ---
  // Da chiamare a ogni apertura del gioco. Se è un NUOVO giorno: ieri ho
  // giocato -> la serie cresce; altrimenti riparte da 1. Ritorna il conteggio
  // e se è appena cresciuto (per festeggiare i traguardi).
  touchStreak() {
    const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const today = dayKey(new Date());
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    if (this.lastPlayDay === today) return { count: this.streak, grew: false };
    this.streak = this.lastPlayDay === yesterday ? (this.streak || 0) + 1 : 1;
    this.lastPlayDay = today;
    this.save();
    return { count: this.streak, grew: true };
  }

  // --- Lingua della cornice UI ---
  setUiLang(lang) {
    this.uiLang = lang === 'th' ? 'th' : 'en';
    this.save();
  }

  // --- Nome del bambino (per il diploma) ---
  getPlayerName() {
    return this.playerName || '';
  }

  setPlayerName(name) {
    this.playerName = (name || '').trim().slice(0, 14); // corto: deve stare sul diploma
    this.save();
  }

  // --- Costume di Captain ---
  getCostume() {
    return this.costume || 'none';
  }

  setCostume(id) {
    this.costume = id;
    this.save();
  }

  // Ricomincia la partita da capo (usato dal "Play again" del finale).
  // Si azzera solo il PERCORSO (livelli, parole, stelle, manghi, errori).
  // STICKER, MEDAGLIE e COSTUME restano: l'album si riempie in più partite
  // ed è il motivo per rigiocare — cancellarlo sarebbe crudele. Anche nome,
  // streak e lingua restano: sono del bambino, non della partita.
  reset() {
    this.completedLevels.clear();
    this.collectedWords.clear();
    this.stars = {};
    this.mangoes = {};
    this.mistakes = {};
    this.save();
  }
}
