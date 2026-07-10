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
import PauseScene from './scenes/PauseScene.js';
import CertificateScene from './scenes/CertificateScene.js';
import MarketScene from './scenes/MarketScene.js';
import QuizScene from './scenes/QuizScene.js';
import ActionScene from './scenes/ActionScene.js';
import ParentScene from './scenes/ParentScene.js';
import PhraseScene from './scenes/PhraseScene.js';
import AchievementsScene from './scenes/AchievementsScene.js';
import AlbumScene from './scenes/AlbumScene.js';
import TeacherScene from './scenes/TeacherScene.js';
import PosterScene from './scenes/PosterScene.js';
import WardrobeScene from './scenes/WardrobeScene.js';

// Questo è il punto d'ingresso del gioco.
// Qui creiamo l'istanza di Phaser con la sua configurazione,
// e le diciamo quali scene esistono.

const config = {
  type: Phaser.AUTO,          // Phaser sceglie da solo WebGL o Canvas
  parent: 'game',             // id del <div> nell'index.html dove va il gioco
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  // NITIDEZZA: niente più pixelArt (ingrandiva coi bordi a blocchi). Ora le
  // immagini vengono ingrandite con filtro morbido, e il mipmap migliora
  // le texture RIMPICCIOLITE (es. i medaglioni-foto ad alta risoluzione).
  render: {
    antialias: true,
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
  },
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
  scene: [BootScene, MenuScene, IntroScene, MapScene, GameScene, SpaceScene, LevelCompleteScene, RescueScene, WordBookScene, PauseScene, CertificateScene, MarketScene, QuizScene, ActionScene, ParentScene, PhraseScene, AchievementsScene, WardrobeScene, AlbumScene, TeacherScene, PosterScene],
};

// TESTO NITIDO: ogni testo di Phaser viene renderizzato su un canvas interno;
// di default a risoluzione 1, che ingrandito sui telefoni diventa sgranato.
// Qui alziamo la risoluzione di TUTTI i testi a 2 in un colpo solo (i singoli
// testi possono comunque chiedere una risoluzione propria nello stile).
const origSetStyle = Phaser.GameObjects.TextStyle.prototype.setStyle;
Phaser.GameObjects.TextStyle.prototype.setStyle = function (style, updateText, setDefaults) {
  if (style && typeof style === 'object' && !style.resolution) {
    style = Object.assign({}, style, { resolution: 2 });
  }
  return origSetStyle.call(this, style, updateText, setDefaults);
};

// Avvia il gioco.
// Lo salvo anche su window.game: comodo per ispezionarlo dalla console del browser
// mentre impari (es. `game.scene.keys.GameScene`).
window.game = new Phaser.Game(config);

// SBLOCCO AUDIO UNIVERSALE (telefono): iOS/Android attivano l'audio SOLO dentro
// un gesto dell'utente. Qui, a livello di DOCUMENTO, ogni tocco prova a sbloccare
// TUTTO (audio Phaser per le voci MP3, effetti sintetici, musica) finché non ci
// riesce — così lo sblocco non dipende da quale pulsante tocchi per primo, né
// da eventuali errori nel codice delle scene.
const tryUnlockAudio = () => {
  const g = window.game;
  if (!g || !g.registry) return;
  try {
    const sfx = g.registry.get('sfx');
    if (sfx && sfx.ensureCtx) sfx.ensureCtx();
    const music = g.registry.get('music');
    if (music && music.ensureCtx) music.ensureCtx();
    if (g.sound) {
      if (g.sound.context && g.sound.context.state === 'suspended') g.sound.context.resume();
      if (g.sound.unlock) g.sound.unlock();
    }
  } catch (e) {
    // L'audio non deve MAI bloccare il gioco.
  }
  // Quando l'audio di Phaser risulta sbloccato, smettiamo di ascoltare.
  if (g.sound && g.sound.locked === false) {
    document.removeEventListener('pointerdown', tryUnlockAudio);
    document.removeEventListener('touchend', tryUnlockAudio);
  }
};
document.addEventListener('pointerdown', tryUnlockAudio);
document.addEventListener('touchend', tryUnlockAudio);

// AUDIO DOPO IL BLOCCO SCHERMO (telefono): quando blocchi/riapri il telefono o
// cambi app, iOS/Android SOSPENDONO gli AudioContext — senza questo resume, al
// ritorno il gioco resterebbe muto. Riattiviamo tutto appena la pagina torna visibile.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  const g = window.game;
  if (!g || !g.registry) return;
  const sfx = g.registry.get('sfx');
  if (sfx && sfx.ensureCtx) sfx.ensureCtx();
  const music = g.registry.get('music');
  if (music && music.ensureCtx) music.ensureCtx();
  if (g.sound && g.sound.context && g.sound.context.state === 'suspended') {
    g.sound.context.resume();
  }
});
