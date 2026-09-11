import { burstStars, buzz } from '../systems/UiKit.js';
import { pickNewSticker, isAlbumComplete, STICKERS } from '../data/stickers.js';

// StickerCard: la CARD-RIVELAZIONE di uno sticker, condivisa da fine livello,
// quiz lampo, regalo del giorno e mini-giochi (prima ogni scena aveva la sua).
// Sequenza da "bustina di figurine": la card scende dall'alto mostrando il
// DORSO (un attimo di attesa: "cosa sarà?"), poi si GIRA e rivela lo sticker.
// Le RARE hanno la card d'oro, la scritta RARE, doppia esplosione di stelline
// e una nota in più: il bambino capisce subito che è successo qualcosa di speciale.

const CARD_W = 230;
const CARD_H = 120;
const DROP_MS = 450;
const HOLD_BACK_MS = 600;
const FLIP_MS = 360;

export function showStickerCard(scene, sticker, opts = {}) {
  const { title = 'New sticker!  สติกเกอร์ใหม่!', y = 150, holdMs = 2200, depth = 500, scrollFactor = 0, onDone = null } = opts;
  const x = scene.scale.width / 2;
  const rare = !!sticker.rare;
  const sfx = scene.registry.get('sfx');
  const card = scene.add.container(x, -110).setDepth(depth).setScrollFactor(scrollFactor);

  // DORSO: blu (o oro per le rare) con un motivo di pallini e un "?".
  const back = scene.add.graphics();
  back.fillStyle(rare ? 0xb8860b : 0x2f6fed, 1);
  back.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
  back.lineStyle(4, rare ? 0xffe27a : 0xffd166, 1);
  back.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
  back.fillStyle(0xffffff, 0.22);
  for (let i = 0; i < 12; i++) back.fillCircle(-CARD_W / 2 + 22 + (i % 6) * 37, -CARD_H / 2 + 28 + Math.floor(i / 6) * 64, 4);
  const backMark = scene.add.text(0, 0, '❔', { fontSize: '40px' }).setOrigin(0.5);
  const backSide = scene.add.container(0, 0, [back, backMark]);

  // FRONTE: crema (o gradiente d'oro), icona grande, nome inglese + thai.
  const front = scene.add.graphics();
  if (rare) front.fillGradientStyle(0xfff4c2, 0xffe27a, 0xffd54f, 0xf2b90b, 1);
  else front.fillStyle(0xfff8e7, 0.98);
  front.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
  front.lineStyle(4, rare ? 0xd4a017 : 0xffd166, 1);
  front.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
  const head = scene.add
    .text(0, -40, rare ? '✨ RARE!  หายาก! ✨' : title, { fontFamily: 'sans-serif', fontSize: '14px', color: rare ? '#7a4a00' : '#8a5a17', fontStyle: 'bold' })
    .setOrigin(0.5);
  const icon = scene.add.text(0, -2, sticker.icon, { fontSize: '38px' }).setOrigin(0.5);
  const name = scene.add
    .text(0, 38, `${sticker.en} · ${sticker.th}`, { fontFamily: 'sans-serif', fontSize: '14px', color: rare ? '#7a4a00' : '#2f6fed', fontStyle: 'bold' })
    .setOrigin(0.5);
  const frontSide = scene.add.container(0, 0, [front, head, icon, name]).setVisible(false);
  card.add([backSide, frontSide]);

  // 1) La card scende (dorso in vista).
  if (sfx) sfx.click();
  scene.tweens.add({ targets: card, y, duration: DROP_MS, ease: 'Back.easeOut' });

  // 2) Dopo l'attesa si gira: si schiaccia in larghezza, cambia faccia, si riapre.
  scene.time.delayedCall(DROP_MS + HOLD_BACK_MS, () => {
    scene.tweens.add({
      targets: card,
      scaleX: 0,
      duration: FLIP_MS * 0.45,
      ease: 'Sine.easeIn',
      onComplete: () => {
        backSide.setVisible(false);
        frontSide.setVisible(true);
        scene.tweens.add({ targets: card, scaleX: 1, duration: FLIP_MS * 0.55, ease: 'Back.easeOut' });
        scene.tweens.add({ targets: icon, scale: 1.25, delay: 200, duration: 200, yoyo: true });
        if (sfx) sfx.win();
        buzz(rare ? 60 : 30);
        const colors = rare ? [0xffd700, 0xfff1b0, 0xffa500] : undefined;
        burstStars(scene, x, y, { count: rare ? 18 : 12, scrollFactor, colors });
        if (rare) {
          // Le rare brillano più a lungo: seconda pioggia di stelline e una nota alta.
          scene.time.delayedCall(450, () => burstStars(scene, x, y, { count: 16, scrollFactor, colors: [0xffd700, 0xffffff, 0xffe27a] }));
          if (sfx) sfx.tone(1568, 0.32, { type: 'triangle', volume: 0.1, delay: 0.18 });
        }
      },
    });
  });

  // 3) Risale e sparisce.
  scene.tweens.add({
    targets: card,
    y: -130,
    delay: DROP_MS + HOLD_BACK_MS + FLIP_MS + holdMs,
    duration: 350,
    ease: 'Back.easeIn',
    onComplete: () => {
      card.destroy();
      if (onDone) onDone();
    },
  });
  return card;
}

// Durata totale di una card (per mettere in fila più rivelazioni).
export const stickerCardDuration = (holdMs = 2200) => DROP_MS + HOLD_BACK_MS + FLIP_MS + holdMs + 350;

// Assegna `count` sticker NUOVI (pesca pesata: le rare escono meno spesso),
// li rivela uno dopo l'altro e, se l'ultimo COMPLETA l'album, fa partire la
// festa (celebrateAlbum). Ritorna gli sticker vinti (vuoto = album già pieno).
export function awardStickers(scene, count, opts = {}) {
  const progress = scene.registry.get('progress');
  if (!progress) return [];
  const won = [];
  for (let i = 0; i < count; i++) {
    const s = pickNewSticker(progress.getStickers());
    if (s && progress.addSticker(s.id)) won.push(s);
  }
  const completed = won.length > 0 && isAlbumComplete(progress.getStickers());
  const { startDelay = 500, card = {} } = opts;
  let at = startDelay;
  won.forEach((s, i) => {
    const last = i === won.length - 1;
    const holdMs = last ? 2200 : 900; // le card intermedie restano meno
    scene.time.delayedCall(at, () =>
      showStickerCard(scene, s, { ...card, holdMs, onDone: last && completed ? () => celebrateAlbum(scene) : null })
    );
    at += stickerCardDuration(holdMs) - 250; // la prossima entra mentre questa risale
  });
  return won;
}

// ALBUM COMPLETO: il traguardo più lungo del gioco merita una festa vera —
// bandierone, pioggia di coriandoli dorati, fanfara doppia, e l'annuncio del
// costume "Collector" (si sblocca da solo: la condizione è l'album pieno).
export function celebrateAlbum(scene) {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const sfx = scene.registry.get('sfx');
  if (sfx) {
    sfx.win();
    scene.time.delayedCall(450, () => sfx.win());
  }
  buzz(80);
  const banner = scene.add.container(W / 2, H / 2 - 20).setDepth(600).setScrollFactor(0).setScale(0.2);
  const bg = scene.add.graphics();
  bg.fillStyle(0x1c1030, 0.94);
  bg.fillRoundedRect(-230, -62, 460, 124, 20);
  bg.lineStyle(5, 0xffd700, 1);
  bg.strokeRoundedRect(-230, -62, 460, 124, 20);
  const t1 = scene.add.text(0, -34, '🏆 ALBUM COMPLETE! 🏆', { fontFamily: 'sans-serif', fontSize: '26px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);
  const t2 = scene.add.text(0, 0, `${STICKERS.length}/${STICKERS.length}  ·  สะสมครบทุกใบแล้ว!`, { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
  const t3 = scene.add.text(0, 32, 'New costume: Collector 🏆  →  Wardrobe 👕', { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffe27a', fontStyle: 'bold' }).setOrigin(0.5);
  banner.add([bg, t1, t2, t3]);
  scene.tweens.add({ targets: banner, scale: 1, duration: 420, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: banner, alpha: 0, delay: 4200, duration: 500, onComplete: () => banner.destroy() });
  // Coriandoli dorati che piovono (come le 3 stelle a fine livello).
  const colors = [0xffd700, 0xffe14d, 0xfff3b0, 0xffffff];
  scene.time.addEvent({
    delay: 80,
    repeat: 30,
    callback: () => {
      const x = 20 + Math.random() * (W - 40);
      const star = scene.add.star(x, -12, 5, 4, 9, colors[Math.floor(Math.random() * colors.length)]).setDepth(590).setScrollFactor(0);
      scene.tweens.add({ targets: star, y: H + 20, angle: 360, duration: 2000 + Math.random() * 1200, onComplete: () => star.destroy() });
    },
  });
}
