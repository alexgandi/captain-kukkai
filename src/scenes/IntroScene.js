import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXTURES } from '../config.js';
import AudioManager from '../systems/AudioManager.js';
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

    // --- Sfondo semplice (cielo + prato) per ambientare la scena ---
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - floorH / 2, GAME_WIDTH, floorH, COLORS.ground);
    // Qualche cespuglio per un tocco di giungla.
    for (let x = 60; x <= GAME_WIDTH; x += 200) {
      this.add.ellipse(x, floorTop, 200, 110, 0x6fbf73);
    }

    // Captain (immagine ferma) in piedi sul prato, rivolto a destra.
    this.add.image(150, floorTop - 30, TEXTURES.captain);

    // Kukkai grande, sopra il pannello — PREOCCUPATA: è stata rapita!
    this.add.image(GAME_WIDTH - 190, floorTop - 110, 'kukkai_worried').setScale(1.6);

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
      // Dall'intro si va alla MAPPA (si vede il viaggio), poi al livello 1.
      this.dialogue.start(KUKKAI_INTRO, () => this.scene.start('MapScene', { next: 1 }));
    });
  }
}
