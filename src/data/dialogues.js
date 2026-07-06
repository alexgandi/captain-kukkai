// Battute dei dialoghi, tenute separate dal codice.
// SOLO inglese (la voce pronuncia l'inglese; niente italiano nel gioco).
//
// ARCO NARRATIVO: il demone YAKSHA ha rapito Teacher Kukkai e la tiene
// prigioniera nel suo castello. Captain la insegue imparando le parole
// (ogni parola lo rende più forte). Al castello (L7) la libera quasi...
// ma lo Yaksha scappa con lei su un'astronave -> inseguimento nello SPAZIO (L8),
// dove Captain sconfigge il boss e la libera davvero.
//
// VOCE: ogni battuta ha il suo MP3 in public/audio/ (voce vera, ElevenLabs).
// Le chiavi sono generate in voiceLines.js dagli STESSI array qui sotto, quindi
// se cambi il testo di una battuta va RIGENERATO il suo MP3 (altrimenti la voce
// non combacia). "Kukkai" è inciso come "Cook Guy" per la pronuncia giusta.

// IntroScene: Kukkai spiega la missione all'inizio del gioco.
export const KUKKAI_INTRO = [
  'Hello, Captain! I am Teacher Kukkai.',
  'Oh no! The Yaksha, a giant demon, took me away!',
  'He keeps me in his castle, far, far away.',
  'Learn the English words — every word makes you stronger!',
  'Follow my voice, Captain. Be brave!',
];

// Fine di ogni livello: Kukkai incoraggia Captain (una riga per battuta).
// Le parole citate sono ESEMPI (3-4), non tutta la lista: più naturale da dire.
export const KUKKAI_LEVEL_END = {
  1: [
    'Wonderful, Captain! You met all twelve animals!',
    'Elephant, tiger, rabbit, horse... you know them all!',
    'The jungle is cheering for you. Keep going!',
  ],
  2: [
    'Yummy! You learned so much food!',
    'Mango, rice, banana, watermelon... now you can order dinner!',
    'Those yellow monsters throw magic — you were so quick!',
  ],
  3: [
    'So beautiful, Captain! You know all the colors!',
    'Red, blue, purple, gold... even rainbow!',
    'Wait... I saw a strange dark ship in the sky. Hurry!',
  ],
  4: [
    'Incredible! You can count in English now!',
    'One, two, five, ten... all the way to one thousand!',
    'That purple magic comes from the Yaksha. Your shield is ready!',
  ],
  5: [
    'What a ride! Car, boat, train, tuk-tuk!',
    'You dodged every tuk-tuk in Bangkok!',
    'The dark ship flew over the city... you are getting close!',
  ],
  6: [
    'You made it through the tall, tall trees!',
    'Falling coconuts, charging rhinos... nothing stops you!',
    'I can see his castle from here. Come save me, Captain!',
  ],
  7: [
    'Captain! You found me! I am almost free—',
    'Oh no! The Yaksha is pulling me to his spaceship!',
    'He is flying to space! Take that rocket and follow us!',
  ],
  8: [
    'You did it, Captain! The Yaksha is gone!',
    'You flew through the stars and learned every word!',
    'Now I am truly free. Take me home, my hero!',
  ],
};
