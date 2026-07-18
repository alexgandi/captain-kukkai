import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXTURES, SAFE } from '../config.js';
import AudioManager from '../systems/AudioManager.js';
import { drawGradientSky, drawClouds, addGrassFringe, addVignette } from '../systems/ParallaxBackground.js';
import DialoguePortrait from '../ui/DialoguePortrait.js';
import { KUKKAI_INTRO } from '../data/dialogues.js';

// IntroScene: Teacher Kukkai spiega la missione a Captain, all'inizio del gioco.
// Usa il componente riutilizzabile DialoguePortrait. Alla fine avvia GameScene.
export default class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  create() {
    // Niente musica qui: parla Kukkai (e da "Play again" arriverebbe la festa).
    const music = this.registry.get('music');
    if (music) music.stop();

    const floorH = 60;
    const floorTop = GAME_HEIGHT - floorH;

    // --- Sfondo VIVO (stessi ingredienti del menu): l'apertura della storia
    // non deve sembrare una scena di debug subito dopo un menu curato ---
    drawGradientSky(this, 'jungle');
    this.add.circle(GAME_WIDTH - 280, 66, 40, 0xfff2bf, 0.5).setDepth(-20);
    this.add.circle(GAME_WIDTH - 280, 66, 24, 0xfff8dc, 0.75).setDepth(-20);
    drawClouds(this, GAME_WIDTH, { sf: 0, depth: -18, alpha: 0.85 });
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - floorH / 2, GAME_WIDTH, floorH, COLORS.ground);
    // Qualche cespuglio per un tocco di giungla.
    for (let x = 60; x <= GAME_WIDTH + 160; x += 200) {
      this.add.ellipse(x, floorTop, 200, 110, 0x6fbf73);
    }
    addGrassFringe(this, GAME_WIDTH, floorTop - 4, [0x2f8f46, 0x3fa34d]);
    addVignette(this, { strength: 0.12 });

    // Captain (immagine ferma) in piedi sul prato, rivolto a destra, con un
    // dondolio leggero: sta ASCOLTANDO, non è un fermo immagine.
    const cap = this.add.image(150, floorTop - 30, TEXTURES.captain);
    this.tweens.add({ targets: cap, y: cap.y - 5, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Kukkai grande, sopra il pannello — PREOCCUPATA: è stata rapita!
    const kuk = this.add.image(GAME_WIDTH - 190, floorTop - 110, 'kukkai_worried').setScale(0.8);
    this.tweens.add({ targets: kuk, y: kuk.y - 6, angle: -1.5, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // --- Dialogo ---
    this.audio = new AudioManager(this);
    this.dialogue = new DialoguePortrait(this, {
      portraitKey: 'kukkai_worried',
      name: 'Teacher Kukkai',
      speak: true, // la voce inglese pronuncia le battute
      audio: this.audio,
    });

    // Il gesto utente è già avvenuto al menu (pulsante Play), che sblocca l'audio.
    // Quindi l'intro parte DA SOLA dopo un attimo (niente "Tap to start" doppio).
    // Poi ogni tap/SPAZIO fa avanzare le battute; alla fine si va al gioco.
    this.time.delayedCall(350, () => {
      this.dialogue.start(KUKKAI_INTRO, () => this.goPlay());
    });

    // SKIP sempre visibile (onboarding: mai trattenere chi vuole giocare).
    const skip = this.add
      .text(GAME_WIDTH - SAFE.right - 14, 12, 'Skip  ⏭', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#1a1a2e',
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(50)
      .setPadding(10)
      .setInteractive({ useHandCursor: true });
    skip.on('pointerdown', () => {
      // Zittisce la battuta in corso prima di cambiare scena.
      if (this.audio.currentSound) this.audio.currentSound.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      this.goPlay();
    });
  }

  // ONBOARDING RAPIDO: alla PRIMA partita assoluta si salta la mappa e si
  // atterra dritti nel Livello 1 (prima parola imparata in meno tap possibile);
  // dalla seconda in poi si passa dalla mappa, che ormai ha senso (il viaggio).
  goPlay() {
    if (this.leaving) return;
    this.leaving = true;
    const progress = this.registry.get('progress');
    const firstTime = !progress || progress.completedLevels.size === 0;
    if (firstTime) this.scene.start('GameScene', { level: 1 });
    else this.scene.start('MapScene', { next: 1 });
  }
}
