import Phaser from 'phaser';
import { createPlaceholderTextures } from '../systems/PlaceholderArt.js';
import { VOICE_LINES } from '../data/voiceLines.js';
import ProgressManager from '../systems/ProgressManager.js';
import SfxManager from '../systems/SfxManager.js';
import MusicManager from '../systems/MusicManager.js';

// BootScene: la primissima scena. Prepara gli asset e poi avvia il gioco.
// È il posto giusto per caricare tutta la grafica: così, quando arriverà la
// pixel-art vera, si tocca SOLO qui.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // >>> Quando avrai la vera grafica, caricala qui con le chiavi di TEXTURES:
    //   this.load.image(TEXTURES.captain, 'assets/captain.png');
    //   this.load.image(TEXTURES.enemy, 'assets/enemy.png');
    // Se una texture viene caricata qui, il segnaposto corrispondente non verrà
    // generato (vince la tua immagine).

    // Voce di Kukkai: gli MP3 registrati (in public/audio). Se un file manca,
    // il loader emette un errore ma continua, e l'AudioManager userà il fallback.
    VOICE_LINES.forEach((v) => this.load.audio(v.key, `audio/${v.key}.mp3`));
  }

  create() {
    // Genera le texture segnaposto per ciò che non è stato caricato sopra.
    createPlaceholderTextures(this);

    // Animazione di camminata di Captain (alterna i due fotogrammi delle gambe).
    if (!this.anims.exists('captain_walk')) {
      this.anims.create({
        key: 'captain_walk',
        frames: [{ key: 'captain_walk0' }, { key: 'captain_walk1' }],
        frameRate: 9,
        repeat: -1,
      });
    }

    // Progresso di partita condiviso tra le scene (livelli finiti + parole imparate).
    this.registry.set('progress', new ProgressManager());
    // Effetti sonori condivisi (un solo AudioContext per tutto il gioco).
    this.registry.set('sfx', new SfxManager());
    // Musica di sottofondo generativa (pentatonica, un tema per ambiente).
    this.registry.set('music', new MusicManager());

    // Tutto pronto: si parte dal menu (titolo).
    this.scene.start('MenuScene');
  }
}
