// ALBUM DEGLI STICKER: 24 figurine a tema Thailandia. Se ne vince UNA nuova a
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
  { id: 'temple', icon: '🛕', en: 'Temple', th: 'วัด' },
  { id: 'lotus', icon: '🪷', en: 'Lotus', th: 'ดอกบัว' },
  { id: 'orchid', icon: '🌺', en: 'Orchid', th: 'กล้วยไม้' },
  { id: 'bamboo', icon: '🎋', en: 'Bamboo', th: 'ไผ่' },
  { id: 'kite', icon: '🪁', en: 'Kite', th: 'ว่าว' },
  { id: 'muaythai', icon: '🥊', en: 'Muay Thai', th: 'มวยไทย' },
  { id: 'mask', icon: '🎭', en: 'Khon mask', th: 'หัวโขน' },
  { id: 'umbrella', icon: '☂️', en: 'Umbrella', th: 'ร่ม' },
  { id: 'lantern', icon: '🏮', en: 'Lantern', th: 'โคมไฟ' },
  { id: 'star', icon: '⭐', en: 'Lucky star', th: 'ดาวนำโชค' },
];

export function getSticker(id) {
  return STICKERS.find((s) => s.id === id);
}

// Pesca uno sticker NUOVO a caso tra quelli non ancora posseduti (null = album pieno).
export function pickNewSticker(ownedIds) {
  const remaining = STICKERS.filter((s) => !ownedIds.includes(s.id));
  if (!remaining.length) return null;
  return remaining[Math.floor(Math.random() * remaining.length)];
}
