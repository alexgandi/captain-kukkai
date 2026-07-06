// HeartsDisplay: mostra i cuori (vite) in alto a sinistra.
// Fisso sullo schermo (scrollFactor 0) così resta fermo mentre il mondo scorre.
// Ogni cuore è un carattere ♥: rosso se pieno, grigio se perso.
export default class HeartsDisplay {
  constructor(scene, maxLives) {
    this.scene = scene;
    this.hearts = [];

    for (let i = 0; i < maxLives; i++) {
      const heart = scene.add
        .text(16 + i * 28, 12, '♥', {
          fontFamily: 'sans-serif',
          fontSize: '26px',
          color: '#ff5566',
        })
        .setScrollFactor(0)
        .setDepth(2000);
      this.hearts.push(heart);
    }
  }

  // Aggiorna quali cuori sono pieni (rossi) e quali persi (grigi).
  set(lives) {
    this.hearts.forEach((heart, i) => {
      heart.setColor(i < lives ? '#ff5566' : '#4a4a58');
    });
  }
}
