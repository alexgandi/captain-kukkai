// Configurazione centrale del gioco.
// La tengo separata da main.js così i numeri "magici" (dimensioni, gravità)
// stanno tutti in un posto solo e sono facili da ritoccare.

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 450;

// Chiavi delle texture (immagini) usate dagli sprite.
// Sono il "seam" per la grafica: per usare la vera pixel-art basterà caricare
// un'immagine con QUESTA chiave in BootScene — il resto del codice non cambia.
export const TEXTURES = {
  captain: 'captain',
  // I nemici usano chiavi calcolate a runtime da colore+spine (es. 'enemy_yellow_spiked'),
  // generate in PlaceholderArt. Vedi createEnemyVariant.
  kukkaiPortrait: 'kukkai_portrait',
  slash: 'slash', // fendente della spada
  spiritHouse: 'spirit_house', // il tempietto-traguardo di fine livello
};

// Gravità di default del mondo: nello Step 2 la useremo per il salto.
export const GRAVITY_Y = 900;

// Colori del gioco (in formato numerico esadecimale, come vuole Phaser).
export const COLORS = {
  sky: 0x87ceeb,        // azzurro cielo, tema giungla/tempio luminoso
  captain: 0x2f6fed,    // blu: il colore fisso di Captain, facile da individuare
  ground: 0x5b3a29,     // marrone terra (il pavimento)
  platform: 0x3fa34d,   // verde: le piattaforme sospese (foglie/tema giungla)
  enemy: 0xff7eb6,      // rosa: nemico CARINO, non minaccioso
  popStar: 0xffe14d,    // giallo: le stelline dell'effetto "pop"
};

// TEMI degli ambienti: ogni livello ne sceglie uno (campo `env` in levels.js).
// Danno identità visiva ai livelli cambiando i colori + qualche tocco speciale
// (neve sulle colline, crosta di lava, ecc.). Facile aggiungerne di nuovi (luna...).
export const THEMES = {
  jungle: { sky: 0x87ceeb, ground: 0x5b3a29, platform: 0x3fa34d, hill: 0x6fbf73 },
  ice: { sky: 0xbfe6ff, ground: 0x7fa8c9, platform: 0xdff2ff, hill: 0xa9d6ef, snow: true },
  volcano: { sky: 0x3a1414, ground: 0x241413, platform: 0x7a4030, hill: 0x5a2420, lava: true },
  night: { sky: 0x141a3a, ground: 0x2a2a48, platform: 0x44446a, hill: 0x1e2650, stars: true },
  // Città (Bangkok): cielo caldo di giorno, strada d'asfalto grigia, grattacieli sullo sfondo.
  city: { sky: 0xa9d4e8, ground: 0x53565f, platform: 0x7d8494, hill: 0x8794a6, buildings: true, road: true },
  // Foresta: cielo verde-menta filtrato, terra scura, foglie; alberi altissimi sullo sfondo.
  forest: { sky: 0xaee0c0, ground: 0x46331f, platform: 0x4f9d4f, hill: 0x2f6d3a, forest: true },
  // Castello: interno di pietra fioco, pavimento e blocchi grigi, colonne sullo sfondo.
  castle: { sky: 0x352f47, ground: 0x5a5560, platform: 0x817c8c, hill: 0x453f57, castle: true },
};

// Parametri di movimento di Captain.
// Sono tutti qui insieme così puoi "sentire" il gioco cambiando un numero
// e vedendo subito l'effetto, senza cercare nel codice.
export const PLAYER = {
  width: 40,
  height: 60,

  speed: 220,            // velocità orizzontale (pixel al secondo)
  jumpVelocity: -520,    // spinta del salto (negativa = verso l'alto)

  maxLives: 3,           // cuori iniziali (finiti = si ricomincia il livello)
  invulnMs: 1500,        // invulnerabilità dopo un colpo (lampeggìo ~1,5s)

  // --- I tre trucchi per un salto che "si sente bene" ---
  // Coyote time: puoi ancora saltare per pochi ms DOPO aver lasciato il bordo.
  // (dal cartone di Willy il Coyote, che resta un attimo sospeso nel vuoto)
  coyoteMs: 100,
  // Jump buffer: se premi salto un attimo PRIMA di toccare terra, il gioco
  // "ricorda" la pressione e salta appena atterri. Niente salti "mangiati".
  jumpBufferMs: 120,
  // Altezza variabile: se rilasci il tasto mentre sali, il salto viene tagliato.
  // Tap corto = saltino; tenuto premuto = salto pieno.
  jumpCutMultiplier: 0.4,
};
