// Vite ci permette di importare direttamente un file JSON come un normale oggetto JS.
// Così le parole vivono nel loro file dati e le puoi aggiungere/modificare
// SENZA toccare il codice di gioco (uno degli obiettivi del progetto).
import vocabulary from '../data/vocabulary.json';

// VocabularyManager: la "fonte di verità" sulle parole.
// - carica il vocabolario
// - serve le parole di un certo livello
// - tiene traccia di quali parole Captain ha già imparato
export default class VocabularyManager {
  constructor() {
    this.all = vocabulary;
    // Uso un Set di parole inglesi già imparate (l'inglese è la chiave univoca).
    this.collected = new Set();
  }

  // Tutte le parole di un livello (es. livello 1 = animali).
  getWordsForLevel(level) {
    return this.all.filter((w) => w.level === level);
  }

  // Trova una parola dalla sua forma inglese (usata per mappare nemico -> parola).
  getWordByEnglish(english) {
    return this.all.find((w) => w.english === english);
  }

  // Segna una parola come imparata.
  collect(english) {
    this.collected.add(english);
  }

  hasCollected(english) {
    return this.collected.has(english);
  }

  // Un livello è "completo" quando TUTTE le sue parole sono state imparate.
  // Ci servirà allo Step 10 per la schermata di fine livello.
  isLevelComplete(level) {
    return this.getWordsForLevel(level).every((w) => this.collected.has(w.english));
  }
}
