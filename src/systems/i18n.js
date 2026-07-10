// i18n della "CORNICE" del gioco: menu, pulsanti, navigazione.
// Il CONTENUTO didattico resta in inglese (è la materia!), e i testi in-gioco
// già bilingui (istruzioni EN+TH) non passano da qui. Questo modulo serve ai
// GENITORI e alle MAESTRE thai: la cornice nella loro lingua abbassa la
// barriera d'adozione (lezione della ricerca marketing).
// Lingua scelta salvata in ProgressManager.uiLang ('en' | 'th').

const STRINGS = {
  en: {
    play: '▶  Play',
    wordOfDay: 'Word of the day  🔊',
    forGrownups: '👨‍👩‍👧 For grown-ups',
    startLevel: (n) => `Start level ${n}  ▶   (Space)`,
    blastOff: 'Blast off!  🚀   (Space)',
    playAgain: 'Play again  ▶',
    quickQuiz: 'Quick Quiz  ⚡',
    action: 'Action!',
    phrases: 'Phrases',
    market: 'Market!',
    back: '⬅ Back',
    backToMenu: '⬅ Back to menu',
    mapBtn: 'Map  🗺️  (Space)',
    share: 'Share  📤',
    playAgainCert: 'Play again  ↺',
    yourDiploma: 'Your diploma!  🎓   (Space)',
    days: (n) => `🔥 ${n} ${n === 1 ? 'day' : 'days'}`,
    freeBadge: '💚 100% Free • No Ads',
  },
  th: {
    play: '▶  เล่น',
    wordOfDay: 'คำศัพท์ประจำวัน  🔊',
    forGrownups: '👨‍👩‍👧 สำหรับผู้ปกครอง',
    startLevel: (n) => `เริ่มด่าน ${n}  ▶`,
    blastOff: 'ทะยานสู่อวกาศ!  🚀',
    playAgain: 'เล่นอีกครั้ง  ▶',
    quickQuiz: 'แบบทดสอบเร็ว  ⚡',
    action: 'ขยับตัว!',
    phrases: 'ต่อคำ',
    market: 'ตลาด!',
    back: '⬅ กลับ',
    backToMenu: '⬅ กลับเมนู',
    mapBtn: 'แผนที่  🗺️',
    share: 'แชร์  📤',
    playAgainCert: 'เล่นอีกครั้ง  ↺',
    yourDiploma: 'รับประกาศนียบัตร!  🎓',
    days: (n) => `🔥 ${n} วัน`,
    freeBadge: '💚 ฟรี 100% • ไม่มีโฆษณา',
  },
};

export function getLang(registry) {
  const p = registry.get('progress');
  return (p && p.uiLang) || 'en';
}

export function setLang(registry, lang) {
  const p = registry.get('progress');
  if (p) p.setUiLang(lang);
}

// t(scene, 'play') oppure t(scene, 'startLevel', 3) per le stringhe-funzione.
export function t(scene, key, ...args) {
  const lang = getLang(scene.registry);
  const v = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}
