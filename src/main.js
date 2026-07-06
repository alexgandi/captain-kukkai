import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY_Y } from './config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import IntroScene from './scenes/IntroScene.js';
import GameScene from './scenes/GameScene.js';
import MapScene from './scenes/MapScene.js';
import SpaceScene from './scenes/SpaceScene.js';
import LevelCompleteScene from './scenes/LevelCompleteScene.js';
import RescueScene from './scenes/RescueScene.js';
import WordBookScene from './scenes/WordBookScene.js';

// Questo è il punto d'ingresso del gioco.
// Qui creiamo l'istanza di Phaser con la sua configurazione,
// e le diciamo quali scene esistono.

const config = {
  type: Phaser.AUTO,          // Phaser sceglie da solo WebGL o Canvas
  parent: 'game',             // id del <div> nell'index.html dove va il gioco
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,             // niente sfocatura: utile per la futura pixel-art
  // SCALING RESPONSIVE: il gioco resta 800x450 "dentro", ma si ADATTA a qualsiasi
  // schermo (telefono, tablet, desktop) mantenendo le proporzioni e centrandosi.
  // Così i controlli touch e la UI restano al loro posto su ogni dispositivo.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',        // motore fisico semplice e veloce, ideale per platform
    arcade: {
      gravity: { y: GRAVITY_Y },
      debug: false,           // metteremo true quando vorremo vedere gli hitbox
    },
  },
  // La lista delle scene. La PRIMA parte per prima: BootScene prepara gli asset,
  // poi IntroScene (Kukkai), poi GameScene. Man mano aggiungeremo MenuScene, ecc.
  scene: [BootScene, MenuScene, IntroScene, MapScene, GameScene, SpaceScene, LevelCompleteScene, RescueScene, WordBookScene],
};

// Avvia il gioco.
// Lo salvo anche su window.game: comodo per ispezionarlo dalla console del browser
// mentre impari (es. `game.scene.keys.GameScene`).
window.game = new Phaser.Game(config);
