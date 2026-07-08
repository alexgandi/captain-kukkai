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
    // BARRA DI CARICAMENTO: gli audio sono ~130 file — su telefono servono
    // secondi, e senza barra il gioco sembra bloccato su uno schermo nero.
    const W = this.scale.width;
    const H = this.scale.height;
    this.add
      .text(W / 2, H / 2 - 40, 'Captain & Teacher Kukkai', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const barBg = this.add.rectangle(W / 2, H / 2 + 8, 320, 18, 0x1a1a2e).setStrokeStyle(2, 0xffd166);
    const barFill = this.add.rectangle(W / 2 - 158, H / 2 + 8, 1, 12, 0x3fa34d).setOrigin(0, 0.5);
    const label = this.add
      .text(W / 2, H / 2 + 38, 'Loading... 0%', { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5);
    this.load.on('progress', (p) => {
      barFill.width = Math.max(1, 316 * p);
      label.setText(`Loading... ${Math.round(p * 100)}%`);
    });

    // >>> Quando avrai la vera grafica, caricala qui con le chiavi di TEXTURES:
    //   this.load.image(TEXTURES.captain, 'assets/captain.png');
    //   this.load.image(TEXTURES.enemy, 'assets/enemy.png');
    // Se una texture viene caricata qui, il segnaposto corrispondente non verrà
    // generato (vince la tua immagine).

    // Il RITRATTO VERO di Kukkai (illustrazione): in create() viene ritagliato
    // in un medaglione CIRCOLARE (i ritratti nel gioco "fluttuano": un rettangolo
    // con lo sfondo stonerebbe). Se il file manca, resta il disegno generato.
    this.load.image('kukkai_photo', 'kukkai.jpg');

    // Voce di Kukkai: gli MP3 registrati (in public/audio). Se un file manca,
    // il loader emette un errore ma continua, e l'AudioManager userà il fallback.
    VOICE_LINES.forEach((v) => this.load.audio(v.key, `audio/${v.key}.mp3`));

    // Voce del CATTIVO (Yaksha), effetti sonori VERI e sigla del gioco.
    // Anche qui: se un file manca, playFx usa il fallback sintetico.
    [
      'yaksha_laugh',
      'yaksha_kidnap',
      'yaksha_boss',
      'yaksha_defeat',
      'sfx_horn',
      'sfx_thud',
      'sfx_rhino',
      'sfx_swordfx',
      'sfx_magicfx',
      'sfx_laserfx',
      'sfx_stompfx',
      'theme_song',
    ].forEach((key) => this.load.audio(key, `audio/${key}.mp3`));
  }

  create() {
    // RITRATTO VERO DI KUKKAI: ritaglio la foto in un MEDAGLIONE circolare
    // 120x120 (con bordino dorato) e la uso per tutte e tre le espressioni,
    // così lo stile è coerente ovunque. Va fatto PRIMA dei segnaposto:
    // se la texture esiste già, il disegno generato viene saltato.
    if (this.textures.exists('kukkai_photo')) {
      const src = this.textures.get('kukkai_photo').getSourceImage();
      ['kukkai_portrait', 'kukkai_worried', 'kukkai_scared'].forEach((key) => {
        if (this.textures.exists(key)) return;
        const canvas = this.textures.createCanvas(key, 120, 120);
        const ctx = canvas.getContext();
        ctx.save();
        ctx.beginPath();
        ctx.arc(60, 60, 59, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        // "Cover": prendo il quadrato col viso dalla foto (240x300 -> fascia y 25..265).
        ctx.drawImage(src, 0, 25, 240, 240, 0, 0, 120, 120);
        ctx.restore();
        // Bordo dorato sottile: il medaglione della maestra.
        ctx.beginPath();
        ctx.arc(60, 60, 57.5, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f2c14e';
        ctx.stroke();
        canvas.refresh();
      });
    }

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
