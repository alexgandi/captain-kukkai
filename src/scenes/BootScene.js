import Phaser from 'phaser';
import { TEXTURES } from '../config.js';
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

    // >>> ARTE VERA DEI PERSONAGGI (generata con AI, in public/art/): se un
    // file esiste, in create() viene AGGANCIATO alle chiavi di gioco e il
    // segnaposto disegnato a mano non viene generato (vince l'immagine).
    // Se un file manca, il loader segnala e si continua coi segnaposto.
    this.load.image('art_captain', 'art/art_captain.png');
    this.load.image('art_elephant', 'art/art_elephant.png');
    this.load.image('art_spirit_house', 'art/art_spirit_house.png');
    this.load.image('art_yaksha', 'art/art_yaksha.png');
    // Versioni HD (4x) per i personaggi visti da vicino: il Player le usa con
    // scala 0.25, così con lo zoom della camera restano nitidi.
    this.load.image('art_captain_hd', 'art/art_captain_hd.png');
    this.load.image('art_elephant_hd', 'art/art_elephant_hd.png');

    // I RITRATTI VERI (illustrazioni): in create() vengono ritagliati in
    // medaglioni CIRCOLARI (i ritratti nel gioco "fluttuano": un rettangolo
    // con lo sfondo stonerebbe). Se un file manca, resta il disegno generato.
    this.load.image('kukkai_photo', 'kukkai.jpg'); //            felice
    this.load.image('kukkai_photo_worried', 'kukkai_worried.jpg'); // preoccupata
    this.load.image('kukkai_photo_scared', 'kukkai_scared.jpg'); //  spaventata
    this.load.image('captain_photo_src', 'captain.jpg'); //         Captain!

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
      'title_jingle', // la SIGLA cantata ("Captain and Teacher Kukkai!")
    ].forEach((key) => this.load.audio(key, `audio/${key}.mp3`));
  }

  create() {
    // RITRATTI VERI: ritaglio ogni foto in un MEDAGLIONE circolare 120x120
    // (con bordino dorato). Ogni ESPRESSIONE di Kukkai usa la sua foto
    // (felice/preoccupata/spaventata; se una manca, ripiega sulla felice),
    // e anche CAPTAIN ha il suo medaglione. Va fatto PRIMA dei segnaposto:
    // se la texture esiste già, il disegno generato viene saltato.
    // NITIDEZZA: il medaglione è a RISOLUZIONE PIENA della foto (240x240) e in
    // giro per il gioco viene mostrato a scala dimezzata — così sul telefono la
    // foto resta nitida invece di essere prima rimpicciolita e poi ringrandita.
    const makeMedallion = (destKey, srcKey) => {
      if (this.textures.exists(destKey) || !this.textures.exists(srcKey)) return;
      const src = this.textures.get(srcKey).getSourceImage();
      const canvas = this.textures.createCanvas(destKey, 240, 240);
      const ctx = canvas.getContext();
      ctx.save();
      ctx.beginPath();
      ctx.arc(120, 120, 118, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      // "Cover": prendo il quadrato col viso dalla foto (240x300 -> fascia y 25..265).
      ctx.drawImage(src, 0, 25, 240, 240, 0, 0, 240, 240);
      ctx.restore();
      // Bordo dorato sottile: lo stile "medaglione" del gioco.
      ctx.beginPath();
      ctx.arc(120, 120, 115, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#f2c14e';
      ctx.stroke();
      canvas.refresh();
    };
    const happySrc = this.textures.exists('kukkai_photo') ? 'kukkai_photo' : null;
    if (happySrc) {
      makeMedallion('kukkai_portrait', 'kukkai_photo');
      makeMedallion('kukkai_worried', this.textures.exists('kukkai_photo_worried') ? 'kukkai_photo_worried' : happySrc);
      makeMedallion('kukkai_scared', this.textures.exists('kukkai_photo_scared') ? 'kukkai_photo_scared' : happySrc);
    }
    makeMedallion('captain_photo', 'captain_photo_src'); // il viso vero di Captain

    // ARTE AI -> CHIAVI DI GIOCO: se un'immagine vera è stata caricata, la
    // registro sotto le chiavi che il gioco usa. I file in public/art/ sono già
    // alla dimensione nominale dei segnaposto (es. captain 40x60), così corpi
    // fisici e scale esistenti non cambiano. Captain usa la STESSA immagine per
    // tutti i fotogrammi: il movimento lo danno waddle/squash/polvere (puppet).
    const useArt = (artKey, gameKeys) => {
      if (!this.textures.exists(artKey)) return;
      const img = this.textures.get(artKey).getSourceImage();
      gameKeys.forEach((k) => {
        if (!this.textures.exists(k)) this.textures.addImage(k, img);
      });
    };
    useArt('art_captain', [TEXTURES.captain, 'captain_walk0', 'captain_walk1', 'captain_blink']);
    useArt('art_elephant', ['elephant_pet']);
    useArt('art_spirit_house', [TEXTURES.spiritHouse]);
    useArt('art_yaksha', ['boss_ship']);

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
