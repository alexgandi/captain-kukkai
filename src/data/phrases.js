// MINI-FRASI: due parole GIÀ imparate messe insieme (colore/numero + nome).
// Kukkai pronuncia la frase, il bambino la RICOSTRUISCE toccando le due parole
// nell'ordine giusto. È il primo passo dalle parole singole alle frasi vere.
//
// Ogni frase riusa parole del vocabolario. `w1`/`w2` sono le due parole (con la
// loro grafia thai), `show` è cosa mostrare come indizio, `key` è l'MP3 in
// public/audio/ (con fallback alla voce sintetica). `text` = ciò che si sente.
export const PHRASES = [
  { key: 'phrase_red_apple', text: 'red apple', w1: { en: 'red', th: 'แดง' }, w2: { en: 'apple', th: 'แอปเปิล' }, show: '🍎' },
  { key: 'phrase_yellow_banana', text: 'yellow banana', w1: { en: 'yellow', th: 'เหลือง' }, w2: { en: 'banana', th: 'กล้วย' }, show: '🍌' },
  { key: 'phrase_green_snake', text: 'green snake', w1: { en: 'green', th: 'เขียว' }, w2: { en: 'snake', th: 'งู' }, show: '🐍' },
  { key: 'phrase_blue_fish', text: 'blue fish', w1: { en: 'blue', th: 'น้ำเงิน' }, w2: { en: 'fish', th: 'ปลา' }, show: '🐟' },
  { key: 'phrase_white_rice', text: 'white rice', w1: { en: 'white', th: 'ขาว' }, w2: { en: 'rice', th: 'ข้าว' }, show: '🍚' },
  { key: 'phrase_one_cat', text: 'one cat', w1: { en: 'one', th: 'หนึ่ง' }, w2: { en: 'cat', th: 'แมว' }, show: '🐱' },
  { key: 'phrase_two_dogs', text: 'two dogs', w1: { en: 'two', th: 'สอง' }, w2: { en: 'dogs', th: 'หมา' }, show: '🐶🐶' },
  { key: 'phrase_three_fish', text: 'three fish', w1: { en: 'three', th: 'สาม' }, w2: { en: 'fish', th: 'ปลา' }, show: '🐟🐟🐟' },
];

// Parole "extra" usabili come distrattori nelle tessere (non nella frase giusta).
export const PHRASE_DISTRACTORS = ['big', 'small', 'happy', 'good', 'hot', 'cold'];
