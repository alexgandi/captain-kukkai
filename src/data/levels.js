// Configurazione dei livelli. NON contiene più il layout (piattaforme/nemici):
// quello lo costruisce il generatore (systems/generateLevel.js) dalle parole del
// livello. Qui restano solo le scelte "artistiche": ambiente + MIX di nemici.
//
// STILI di nemico riutilizzabili (un "tipo" di nemico ciascuno):
//  - color: 'pink' | 'yellow' | 'red' | 'purple' (texture generate in PlaceholderArt)
//  - spiked: true = spine in testa, non saltabili (servono spada/magia)
//  - armored: true = spine ai lati, immuni ad arma/magia, si battono SOLO in testa
//  - castsMagic: true = lancia magie contro Captain
//  - hits: colpi per sconfiggerlo
//  - size: altezza in px (80 = grande, "boss")
//  - speed: velocità di pattuglia (default 55)
const PINK = { color: 'pink', spiked: false, hits: 1 }; //                              Liv. 1
const YELLOW = { color: 'yellow', spiked: true, hits: 1, speed: 95, castsMagic: true }; // Liv. 2 (spinato + lancia magie)
const RED_BIG = { color: 'red', spiked: true, hits: 3, size: 80 }; //                   Liv. 3 (grande)
const PURPLE = { color: 'purple', spiked: false, armored: true, castsMagic: true, hits: 1 }; // Liv. 4
const ARCHER = { color: 'green', archer: true, hits: 1 }; //                             Liv. 7 (arciere, frecce ad arco)

// MIX di nemici per livello: ogni livello ha UN nemico nuovo dominante, ma anche
// una quota dei nemici dei livelli precedenti (ripasso + varietà). I pesi sono
// percentuali (sommano a 1); il generatore li distribuisce in modo deterministico
// e ben sparso lungo il livello.
export const LEVEL_CONFIG = {
  1: {
    theme: 'animals',
    env: 'jungle',
    enemyMix: [{ style: PINK, weight: 1 }],
  },
  2: {
    theme: 'food',
    env: 'ice',
    enemyMix: [
      { style: YELLOW, weight: 0.6 }, // 60% nuovi (gialli spinati)
      { style: PINK, weight: 0.4 }, //   40% del livello 1
    ],
  },
  3: {
    theme: 'colors',
    env: 'volcano',
    enemyMix: [
      { style: RED_BIG, weight: 0.5 }, // 50% nuovi (rossi grandi)
      { style: YELLOW, weight: 0.3 }, //  30% del livello 2
      { style: PINK, weight: 0.2 }, //    20% del livello 1
    ],
  },
  // Livello 4 — NUMERI, di notte. Nemici viola "corazzati" (immuni a spada e magia,
  // si battono SOLO saltandoci in testa, e lanciano magie), più un ripasso di L3/L2.
  4: {
    theme: 'numbers',
    env: 'night',
    enemyMix: [
      { style: PURPLE, weight: 0.5 }, //  50% nuovi (viola corazzati)
      { style: RED_BIG, weight: 0.25 }, // 25% del livello 3
      { style: YELLOW, weight: 0.25 }, //  25% del livello 2
    ],
  },
  // Livello 5 — MEZZI DI TRASPORTO, per le strade di Bangkok. La novità NON è un
  // nemico ma un OSTACOLO mobile: i TUK-TUK che sfrecciano e vanno saltati (fanno
  // danno, non si uccidono). I nemici sono un ripasso equilibrato di tutti i tipi.
  5: {
    theme: 'transport',
    env: 'city',
    vehicles: true, // abilita i tuk-tuk sui tratti di strada
    enemyMix: [
      { style: PINK, weight: 0.25 },
      { style: YELLOW, weight: 0.25 },
      { style: RED_BIG, weight: 0.25 },
      { style: PURPLE, weight: 0.25 },
    ],
  },
  // Livello 6 — FORESTA di alberi altissimi. Novità: NOCI DI COCCO che cadono dagli
  // alberi e vanno evitate (si schiantano al suolo). Nemici: ripasso finale, un po'
  // più tosto (più viola e rossi).
  6: {
    theme: 'forest',
    env: 'forest',
    coconuts: true, // abilita le noci di cocco che cadono
    rhinos: true, // rinoceronti che caricano da destra a sinistra (da saltare)
    firstEnemy: YELLOW, // il PRIMO nemico è giallo (non viola corazzato: troppo forte)
    // Meno viola corazzati (difficilissimi da battere, ne restano ~2), più gialli.
    enemyMix: [
      { style: YELLOW, weight: 0.3 },
      { style: RED_BIG, weight: 0.3 },
      { style: PURPLE, weight: 0.2 },
      { style: PINK, weight: 0.2 },
    ],
  },
  // Livello 7 — CASTELLO di pietra. Novità 1: PIETRE che cadono dal soffitto (come i
  // cocchi, stesso principio). Novità 2: mostri ARCIERI verdi che scoccano FRECCE ad
  // arco balistico (più difficili da schivare della magia rettilinea). Niente più
  // mostri rosa (L1): il ripasso è di gialli/rossi/viola + i nuovi arcieri.
  7: {
    theme: 'castle',
    env: 'castle',
    stones: true, // pietre che cadono dal soffitto
    lengthMult: 2, // castello LUNGO: il doppio degli altri (nemici ripetuti = ripasso)
    // Meno viola (2 in meno, sostituiti da gialli): il castello era troppo difficile.
    enemyMix: [
      { style: ARCHER, weight: 0.4 }, // 40% arcieri verdi
      { style: YELLOW, weight: 0.23 },
      { style: RED_BIG, weight: 0.21 },
      { style: PURPLE, weight: 0.16 },
    ],
  },
};

// Quanti livelli esistono (per capire quando arriva il finale).
export const LEVEL_COUNT = Object.keys(LEVEL_CONFIG).length;
