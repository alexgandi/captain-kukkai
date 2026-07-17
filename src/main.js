import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY_Y, SAFE } from './config.js';
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

// TRANSIZIONI MORBIDE: ogni cambio scena (scene.start) fa prima una DISSOLVENZA
// veloce verso lo scuro, poi parte davvero; la scena nuova rientra in dissolvenza
// (via fadeIn nelle create). Un dettaglio da "gioco vero": via gli stacchi secchi.
// Il flag _fading evita doppie partenze se il bambino tamburella sui pulsanti.
const origSceneStart = Phaser.Scenes.ScenePlugin.prototype.start;
Phaser.Scenes.ScenePlugin.prototype.start = function (key, data) {
  try {
    const cam = this.systems.cameras && this.systems.cameras.main;
    const sys = this.systems;
    if (!cam || sys._fading) return this;
    sys._fading = true;
    cam.fadeOut(150, 20, 16, 40);
    // setTimeout (orologio vero) e non delayedCall (orologio di gioco): nei tab
    // in secondo piano il clock di gioco si congela e la scena non partirebbe mai.
    setTimeout(() => {
      sys._fading = false; // il Systems sopravvive ai restart: va sempre ripulito
      origSceneStart.call(this, key, data);
    }, 160);
    return this;
  } catch (e) {
    return origSceneStart.call(this, key, data);
  }
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

// SAFE AREA (notch/fotocamera): ora che il gioco riempie TUTTO lo schermo,
// gli elementi attaccati ai bordi possono finire sotto il notch. Leggo gli
// env(safe-area-inset-*) dalla sonda CSS e li converto in pixel DI GIOCO
// (dipendono da quanto Scale.FIT ha ingrandito il canvas). Ricalcolo anche al
// resize/rotazione: le scene li leggono da SAFE quando costruiscono la UI.
const updateSafeInsets = () => {
  try {
    const probe = document.getElementById('safe-probe');
    if (!probe) return;
    const cs = getComputedStyle(probe);
    // Quanti pixel di gioco vale un pixel CSS (con FIT: fattore unico).
    // Prima che il canvas esista, lo stimo dalla finestra: stesso conto di FIT.
    const scaleFactor =
      (window.game && window.game.scale.displaySize.width / GAME_WIDTH) ||
      Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT) ||
      1;
    SAFE.left = Math.round(parseFloat(cs.paddingLeft || '0') / scaleFactor) || 0;
    SAFE.right = Math.round(parseFloat(cs.paddingRight || '0') / scaleFactor) || 0;
    SAFE.top = Math.round(parseFloat(cs.paddingTop || '0') / scaleFactor) || 0;
    SAFE.bottom = Math.round(parseFloat(cs.paddingBottom || '0') / scaleFactor) || 0;
  } catch (e) {
    // Senza insets si gioca comunque: al massimo un'icona finisce sotto il notch.
  }
};
// La scena che ARRIVA rientra in dissolvenza (fadeIn), agganciato una volta sola
// per tutte le scene. Escluse: Boot (è il caricamento), Pause e WordBook quando
// fanno da overlay sopra il gioco (un fadeIn coprirebbe di nero il gioco sotto).
const FADE_EXCLUDE = new Set(['BootScene', 'PauseScene', 'WordBookScene']);
window.game.events.once(Phaser.Core.Events.READY, () => {
  window.game.scene.scenes.forEach((s) => {
    if (FADE_EXCLUDE.has(s.sys.settings.key)) return;
    s.sys.events.on(Phaser.Scenes.Events.CREATE, () => {
      try {
        s.cameras.main.fadeIn(220, 20, 16, 40);
      } catch (e) {
        // la dissolvenza è cosmetica: mai bloccare la scena
      }
    });
  });
});

updateSafeInsets(); // subito (stima), così anche la PRIMA scena ha i margini
window.game.events.once('ready', updateSafeInsets);
window.addEventListener('resize', () => setTimeout(updateSafeInsets, 60));

// FULLSCREEN su Android: al primo tocco (gesto valido) il gioco entra a schermo
// intero immersivo — via barra indirizzi e barra di sistema. Solo Android: iOS
// non supporta la Fullscreen API (lì la strada è "Aggiungi a Home" / Capacitor).
const tryFullscreen = () => {
  document.removeEventListener('pointerdown', tryFullscreen);
  try {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isAndroid && !standalone && document.fullscreenEnabled && !document.fullscreenElement) {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
  } catch (e) {
    // Il fullscreen è un extra: se fallisce, il gioco resta giocabile.
  }
};
document.addEventListener('pointerdown', tryFullscreen);

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
