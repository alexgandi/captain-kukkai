// ALBUM DEGLI STICKER: 24 figurine a tema Thailandia (4 RARE, card d'oro). Se ne vince UNA nuova a
// ogni livello completato (+1 bonus se il quiz è perfetto): per riempire
// l'album bisogna rigiocare — è la meta-collezione che fa tornare nel gioco.
// (thai = nome nella lingua di casa; l'inglese resta il contenuto didattico)
export const STICKERS = [
  { id: 'elephant', icon: '🐘', en: 'Elephant', th: 'ช้าง' },
  { id: 'tiger', icon: '🐯', en: 'Tiger', th: 'เสือ' },
  { id: 'monkey', icon: '🐒', en: 'Monkey', th: 'ลิง' },
  { id: 'parrot', icon: '🦜', en: 'Parrot', th: 'นกแก้ว' },
  { id: 'crocodile', icon: '🐊', en: 'Crocodile', th: 'จระเข้' },
  { id: 'butterfly', icon: '🦋', en: 'Butterfly', th: 'ผีเสื้อ' },
  { id: 'mango', icon: '🥭', en: 'Mango', th: 'มะม่วง' },
  { id: 'pineapple', icon: '🍍', en: 'Pineapple', th: 'สับปะรด' },
  { id: 'coconut', icon: '🥥', en: 'Coconut', th: 'มะพร้าว' },
  { id: 'noodles', icon: '🍜', en: 'Noodles', th: 'ก๋วยเตี๋ยว' },
  { id: 'sticky_rice', icon: '🍚', en: 'Sticky rice', th: 'ข้าวเหนียว' },
  { id: 'durian', icon: '🍈', en: 'Durian', th: 'ทุเรียน' },
  { id: 'tuktuk', icon: '🛺', en: 'Tuk-tuk', th: 'ตุ๊กตุ๊ก' },
  { id: 'boat', icon: '🚤', en: 'Longtail boat', th: 'เรือหางยาว' },
  { id: 'temple', rare: true, icon: '🛕', en: 'Temple', th: 'วัด' },
  { id: 'lotus', icon: '🪷', en: 'Lotus', th: 'ดอกบัว' },
  { id: 'orchid', icon: '🌺', en: 'Orchid', th: 'กล้วยไม้' },
  { id: 'bamboo', icon: '🎋', en: 'Bamboo', th: 'ไผ่' },
  { id: 'kite', icon: '🪁', en: 'Kite', th: 'ว่าว' },
  { id: 'muaythai', rare: true, icon: '🥊', en: 'Muay Thai', th: 'มวยไทย' },
  { id: 'mask', rare: true, icon: '🎭', en: 'Khon mask', th: 'หัวโขน' },
  { id: 'umbrella', icon: '☂️', en: 'Umbrella', th: 'ร่ม' },
  { id: 'lantern', icon: '🏮', en: 'Lantern', th: 'โคมไฟ' },
  { id: 'star', rare: true, icon: '⭐', en: 'Lucky star', th: 'ดาวนำโชค' },
];

export function getSticker(id) {
  return STICKERS.find((s) => s.id === id);
}

// Le RARE (`rare: true`, card d'oro) escono meno spesso: di solito sono le
// ultime a entrare nell'album, ed è proprio questo a renderle preziose.
const RARE_WEIGHT = 0.3;

// Pesca uno sticker NUOVO tra quelli non ancora posseduti, con pesca PESATA
// (le rare valgono 0,3 contro 1). null = album pieno.
export function pickNewSticker(ownedIds) {
  const remaining = STICKERS.filter((s) => !ownedIds.includes(s.id));
  if (!remaining.length) return null;
  const weight = (s) => (s.rare ? RARE_WEIGHT : 1);
  let r = Math.random() * remaining.reduce((sum, s) => sum + weight(s), 0);
  for (const s of remaining) {
    r -= weight(s);
    if (r <= 0) return s;
  }
  return remaining[remaining.length - 1];
}

export const isAlbumComplete = (ownedIds) => STICKERS.every((s) => ownedIds.includes(s.id));
