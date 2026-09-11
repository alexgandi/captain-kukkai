// SPECIAL DEL GIORNO: ogni giorno UN mini-gioco (verbi d'azione, mini-frasi o
// Mercato) vale il DOPPIO degli sticker. Stesso trucco dell'indice-giorno della
// Parola del giorno: cambia da solo a mezzanotte, uguale su ogni telefono, e dà
// un motivo per riaprire il gioco domani ("oggi tocca al Mercato!").
export const SPECIALS = ['ActionScene', 'PhraseScene', 'MarketScene'];

export const todaysSpecial = () => SPECIALS[Math.floor(Date.now() / 86400000) % SPECIALS.length];

export const isSpecialToday = (sceneKey) => todaysSpecial() === sceneKey;

// Quanti sticker vale un premio oggi in questa scena (1, o 2 se è lo special).
export const specialMultiplier = (sceneKey) => (isSpecialToday(sceneKey) ? 2 : 1);
