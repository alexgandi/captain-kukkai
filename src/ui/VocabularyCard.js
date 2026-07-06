import { GAME_WIDTH } from '../config.js';

// VocabularyCard: la carta che appare quando Captain impara una parola.
// Mostra: icona (immagine) · thai · inglese. Piccola e in alto a SINISTRA,
// così (dato che di solito si va verso destra) è difficile che copra l'azione.
export default class VocabularyCard {
  constructor(scene) {
    this.scene = scene;
    this.current = null;
  }

  show(word) {
    if (this.current) {
      this.current.destroy();
      this.current = null;
    }

    const scene = this.scene;
    const cardW = 210;
    const cardH = 150;
    // In alto a SINISTRA (sotto i cuori).
    const cx = cardW / 2 + 20;
    const cy = 130;

    const card = scene.add.container(cx, cy);
    card.setDepth(1000);
    card.setScrollFactor(0); // resta fissa sullo schermo

    // Sfondo bianco arrotondato con bordo giallo caldo.
    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    bg.lineStyle(4, 0xffd166, 1);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);

    // Icona (immagine della parola).
    const iconText = scene.add
      .text(0, -46, word.icon || '⭐', { fontFamily: 'sans-serif', fontSize: '42px' })
      .setOrigin(0.5);

    // Thai (grande) — quello che il bambino deve imparare a leggere.
    const thaiText = scene.add
      .text(0, 4, word.thai, {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        color: '#222222',
      })
      .setOrigin(0.5);

    // Inglese (sotto).
    const englishText = scene.add
      .text(0, 44, word.english, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#2f6fed',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    card.add([bg, iconText, thaiText, englishText]);

    // Ingresso "pop".
    card.setScale(0.6);
    card.setAlpha(0);
    scene.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });

    this.current = card;
    scene.time.delayedCall(2400, () => this.hide(card));
  }

  hide(card) {
    if (!card || !card.active) return;
    this.scene.tweens.add({
      targets: card,
      alpha: 0,
      scale: 0.7,
      duration: 200,
      onComplete: () => card.destroy(),
    });
    if (this.current === card) this.current = null;
  }
}
