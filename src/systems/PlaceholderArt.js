import { COLORS, TEXTURES } from '../config.js';

// PlaceholderArt: disegna al volo le texture segnaposto (Captain e nemico)
// e le registra con la loro CHIAVE. Nessun file immagine necessario per ora.
//
// >>> COME METTERE LA VERA PIXEL-ART <<<
// In BootScene.preload() carica l'immagine con la stessa chiave, es:
//   this.load.image(TEXTURES.captain, 'assets/captain.png');
// La funzione qui sotto salta la generazione se la texture esiste già:
// quindi la tua immagine "vince" e non devi toccare altro codice.

export function createPlaceholderTextures(scene) {
  createCaptainFrames(scene);
  // Varianti nemico per livello: colore + tipo (plain/spiked/armored) + dimensione.
  createEnemyVariant(scene, 'enemy_pink', 0xff7eb6, 'plain', 40); //          Livello 1
  createEnemyVariant(scene, 'enemy_yellow_spiked', 0xf2c94c, 'spiked', 40); // Livello 2
  createEnemyVariant(scene, 'enemy_red_spiked', 0xe23b3b, 'spiked', 80); //    Livello 3 (grande)
  createEnemyVariant(scene, 'enemy_purple_armored', 0x9b59d0, 'armored', 40); // Livello 4 (viola)
  createEnemyVariant(scene, 'enemy_green_archer', 0x5aa653, 'archer', 40); //   Livello 7 (arciere)
  createTukTukTexture(scene); //                                               Livello 5 (veicolo)
  createCoconutTexture(scene); //                                              Livello 6 (cade dagli alberi)
  createStoneTexture(scene); //                                                Livello 7 (cade dal soffitto)
  createArrowTexture(scene); //                                                Livello 7 (freccia dell'arciere)
  createShieldTexture(scene); //                                               Livello 4 (scudo anti-magia)
  // Livello 8 (spazio): navicella di Captain, navicella aliena, laser, cometa.
  createShipTexture(scene);
  createAlienShipTexture(scene);
  createLaserTexture(scene, 'laser_player', 0x37e0ff, 0xd7fbff); // laser di Captain (azzurro)
  createLaserTexture(scene, 'laser_alien', 0xff5a7a, 0xffd0da); //  laser alieno (rosso)
  createCometTexture(scene);
  createRhinoTexture(scene); //                                                Livello 6 (rinoceronte che carica)
  createBossTexture(scene); //                                                 Livello 8 (boss demone-alieno)
  createKukkaiPortraitTexture(scene);
  createSlashTexture(scene);
  createSpiritHouseTexture(scene);
}

// Genera una variante di nemico: colore del corpo, con/senza spine, dimensione.
// - normale (no spine) = faccia sorridente (livello 1)
// - spinato = casco di spine + faccia arrabbiata (non saltabile in testa)
// Tutte le coordinate sono relative a un disegno base 40x40 e scalate da k.
function createEnemyVariant(scene, key, bodyColor, variant, size = 40) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  const k = size / 40; // fattore di scala (80 -> k=2)
  const S = (v) => v * k;

  if (variant === 'armored') {
    // Spine ai LATI (armatura): il nemico è immune a spada/magia, si batte solo
    // saltandogli in testa. Colore viola. Disegno le spine prima del corpo.
    g.fillStyle(0x9aa0a8, 1);
    [12, 22, 32].forEach((y) => {
      g.fillTriangle(S(7), S(y - 5), S(0), S(y), S(7), S(y + 5)); // spine a sinistra
      g.fillTriangle(S(33), S(y - 5), S(40), S(y), S(33), S(y + 5)); // spine a destra
    });
    // Corpo (un po' più stretto per far spazio alle spine laterali).
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(S(7), S(5), S(26), S(30), S(8));
    // Occhi.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(S(15), S(17), S(4.5));
    g.fillCircle(S(25), S(17), S(4.5));
    g.fillStyle(0x222222, 1);
    g.fillCircle(S(15), S(18), S(2.2));
    g.fillCircle(S(25), S(18), S(2.2));
    // Sopracciglia decise.
    g.lineStyle(S(2.2), 0x3a1a4a, 1);
    g.beginPath();
    g.moveTo(S(11), S(11));
    g.lineTo(S(19), S(14));
    g.strokePath();
    g.beginPath();
    g.moveTo(S(29), S(11));
    g.lineTo(S(21), S(14));
    g.strokePath();
    // Scintilla magica sulla fronte (lancia magie).
    g.fillStyle(0xe6ccff, 1);
    g.fillCircle(S(20), S(9), S(2.2));
  } else if (variant === 'spiked') {
    // Spine grigie sulla testa (disegnate PRIMA: il corpo ne copre la base).
    g.fillStyle(0x9aa0a8, 1);
    for (let sx = 3; sx < 37; sx += 8) {
      g.fillTriangle(S(sx), S(16), S(sx + 4), S(1), S(sx + 8), S(16));
    }
    // Corpo (più in basso per far spazio alle spine).
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(S(3), S(12), S(34), S(26), S(9));
    // Occhi.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(S(14), S(25), S(5));
    g.fillCircle(S(26), S(25), S(5));
    g.fillStyle(0x222222, 1);
    g.fillCircle(S(14), S(26), S(2.4));
    g.fillCircle(S(26), S(26), S(2.4));
    // Sopracciglia arrabbiate.
    g.lineStyle(S(2.5), 0x7a2a3a, 1);
    g.beginPath();
    g.moveTo(S(9), S(19));
    g.lineTo(S(19), S(23));
    g.strokePath();
    g.beginPath();
    g.moveTo(S(31), S(19));
    g.lineTo(S(21), S(23));
    g.strokePath();
    // Bocca imbronciata.
    g.lineStyle(S(2.5), 0x9b2d5e, 1);
    g.beginPath();
    g.arc(S(20), S(36), S(5), 1.15 * Math.PI, 1.85 * Math.PI, false);
    g.strokePath();
  } else if (variant === 'archer') {
    // Mostriciattolo ARCIERE: corpo (verde), faccia decisa e un ARCO sul fianco.
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(S(5), S(7), S(28), S(31), S(9));
    // Occhi.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(S(15), S(19), S(4.5));
    g.fillCircle(S(25), S(19), S(4.5));
    g.fillStyle(0x222222, 1);
    g.fillCircle(S(15), S(20), S(2.2));
    g.fillCircle(S(25), S(20), S(2.2));
    // Sopracciglia decise.
    g.lineStyle(S(2.2), 0x2a5a2a, 1);
    g.beginPath();
    g.moveTo(S(10), S(13));
    g.lineTo(S(19), S(16));
    g.strokePath();
    g.beginPath();
    g.moveTo(S(30), S(13));
    g.lineTo(S(21), S(16));
    g.strokePath();
    // Arco di legno sul lato destro (semicerchio) + corda tesa.
    g.lineStyle(S(2.6), 0x8a5a2b, 1);
    g.beginPath();
    g.arc(S(35), S(24), S(11), -Math.PI * 0.5, Math.PI * 0.5, false);
    g.strokePath();
    g.lineStyle(S(1), 0xe8e8e8, 1);
    g.beginPath();
    g.moveTo(S(35), S(13));
    g.lineTo(S(35), S(35));
    g.strokePath();
  } else {
    // Corpo liscio arrotondato.
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(S(2), S(2), S(36), S(36), S(11));
    // Occhioni.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(S(14), S(17), S(5.5));
    g.fillCircle(S(26), S(17), S(5.5));
    g.fillStyle(0x222222, 1);
    g.fillCircle(S(14), S(18), S(2.6));
    g.fillCircle(S(26), S(18), S(2.6));
    // Sorrisone.
    g.lineStyle(S(2.5), 0x9b2d5e, 1);
    g.beginPath();
    g.arc(S(20), S(24), S(6), 0.1 * Math.PI, 0.9 * Math.PI, false);
    g.strokePath();
  }

  g.generateTexture(key, size, size);
  g.destroy();
}

// Spirit House: il tempietto thailandese (san phra phum) = traguardo di fine livello.
// Personaggio/oggetto ORIGINALE, stile segnaposto. 80x120, sostituibile.
function createSpiritHouseTexture(scene) {
  if (scene.textures.exists(TEXTURES.spiritHouse)) return;
  const g = scene.make.graphics({ add: false });

  // Palo di sostegno.
  g.fillStyle(0x8a5a2b, 1);
  g.fillRect(34, 74, 12, 46);
  // Base/piattaforma dorata.
  g.fillStyle(0xcaa15a, 1);
  g.fillRect(14, 64, 52, 12);
  // Corpo della casetta (rosso).
  g.fillStyle(0xc0392b, 1);
  g.fillRect(22, 36, 36, 30);
  // Porticina.
  g.fillStyle(0x7a1f1f, 1);
  g.fillRect(34, 48, 12, 18);
  // Tetto a punta thailandese (tiers dorati).
  g.fillStyle(0xf2c14e, 1);
  g.fillTriangle(12, 40, 40, 8, 68, 40);
  g.fillTriangle(20, 24, 40, 2, 60, 24);
  // Guglia in cima.
  g.fillStyle(0xffe08a, 1);
  g.fillRect(38, 0, 4, 8);

  g.generateTexture(TEXTURES.spiritHouse, 80, 120);
  g.destroy();
}

// Tuk-tuk: il tre-ruote colorato di Bangkok. È un OSTACOLO mobile (Livello 5):
// sfreccia sulla strada e va SALTATO. Disegno base 72x48, guarda a destra.
function createTukTukTexture(scene) {
  if (scene.textures.exists('tuktuk')) return;
  const g = scene.make.graphics({ add: false });

  // Ruote (due dietro a sinistra, una grande davanti a destra).
  g.fillStyle(0x2b2b2b, 1);
  g.fillCircle(18, 42, 7);
  g.fillCircle(54, 42, 8);
  g.fillStyle(0x9aa0a8, 1); // mozzi grigi
  g.fillCircle(18, 42, 3);
  g.fillCircle(54, 42, 3);

  // Pianale/cabina (giallo caldo).
  g.fillStyle(0xf2b134, 1);
  g.fillRoundedRect(8, 22, 52, 16, 4);
  // Muso anteriore arrotondato.
  g.fillStyle(0xf2b134, 1);
  g.fillRoundedRect(48, 16, 16, 20, 6);

  // Tettuccio/capote (verde acqua thai) con supporti.
  g.fillStyle(0x16a085, 1);
  g.fillRoundedRect(10, 6, 40, 10, 4);
  g.fillRect(12, 14, 3, 10); // montante posteriore
  g.fillRect(44, 14, 3, 10); // montante anteriore

  // Parabrezza.
  g.fillStyle(0xbfe6ff, 1);
  g.fillRoundedRect(47, 18, 12, 10, 3);
  // Faro.
  g.fillStyle(0xfff3b0, 1);
  g.fillCircle(62, 30, 3);
  // Striscia decorativa rossa sulla fiancata.
  g.fillStyle(0xc0392b, 1);
  g.fillRect(10, 34, 40, 3);

  g.generateTexture('tuktuk', 72, 52);
  g.destroy();
}

// Noce di cocco VERDE (cocco giovane): cade dagli alberi (Livello 6). Verde così
// si distingue dal tronco marrone e dal cielo mentre cade. Contorno scuro per
// staccarla dallo sfondo. Base 26x26 con i tre "occhi" del cocco.
function createCoconutTexture(scene) {
  if (scene.textures.exists('coconut')) return;
  const g = scene.make.graphics({ add: false });
  // Contorno scuro (stacca dal tronco/foglie).
  g.fillStyle(0x184a20, 1);
  g.fillCircle(13, 13, 13);
  // Guscio verde.
  g.fillStyle(0x3fa34d, 1);
  g.fillCircle(13, 12, 11);
  // Ombra in basso (volume).
  g.fillStyle(0x2f7a3a, 1);
  g.fillCircle(13, 16, 9);
  g.fillStyle(0x3fa34d, 1);
  g.fillCircle(13, 11, 9);
  // Luce in alto a sinistra.
  g.fillStyle(0x8ee09a, 0.9);
  g.fillCircle(10, 8, 3.4);
  // I tre "occhi" scuri del cocco.
  g.fillStyle(0x123c18, 1);
  g.fillCircle(10, 14, 1.6);
  g.fillCircle(16, 14, 1.6);
  g.fillCircle(13, 18, 1.6);

  g.generateTexture('coconut', 26, 26);
  g.destroy();
}

// Pietra: cade dal soffitto del castello (Livello 6->7, stesso principio del cocco).
// Base 26x26: masso grigio irregolare con crepe.
function createStoneTexture(scene) {
  if (scene.textures.exists('stone')) return;
  const g = scene.make.graphics({ add: false });
  // Sasso (grigio) con forma irregolare a blocchi.
  g.fillStyle(0x8a8a92, 1);
  g.fillCircle(13, 13, 12);
  g.fillStyle(0x6f6f77, 1); // ombra in basso
  g.fillCircle(13, 16, 10);
  g.fillStyle(0x9a9aa2, 1); // corpo chiaro
  g.fillCircle(13, 11, 10);
  g.fillStyle(0xb4b4bc, 1); // luce in alto a sinistra
  g.fillCircle(10, 9, 4);
  // Crepe scure.
  g.lineStyle(1.4, 0x5a5a62, 1);
  g.beginPath();
  g.moveTo(7, 12);
  g.lineTo(13, 15);
  g.lineTo(18, 11);
  g.strokePath();
  g.beginPath();
  g.moveTo(13, 15);
  g.lineTo(12, 21);
  g.strokePath();

  g.generateTexture('stone', 26, 26);
  g.destroy();
}

// Freccia dell'arciere (Livello 7): asta + punta + impennaggio. Base 28x10,
// punta verso DESTRA (+x); in volo viene ruotata secondo la sua velocità.
function createArrowTexture(scene) {
  if (scene.textures.exists('arrow')) return;
  const g = scene.make.graphics({ add: false });
  // Asta di legno.
  g.fillStyle(0x8a5a2b, 1);
  g.fillRect(3, 4, 17, 2);
  // Punta metallica.
  g.fillStyle(0xd0d4da, 1);
  g.fillTriangle(19, 0, 28, 5, 19, 10);
  // Impennaggio (piume rosse) in coda.
  g.fillStyle(0xd0392b, 1);
  g.fillTriangle(0, 0, 7, 5, 3, 5);
  g.fillTriangle(0, 10, 7, 5, 3, 5);

  g.generateTexture('arrow', 28, 10);
  g.destroy();
}

// Scudo (Livello 4): scudetto "heater" con bordo dorato, borchia centrale e croce.
// Base 26x32, guarda a destra (verso il lato che Captain protegge).
function createShieldTexture(scene) {
  if (scene.textures.exists('shield_gfx')) return;
  const g = scene.make.graphics({ add: false });
  // Piastra a scudo (metallo azzurro).
  g.fillStyle(0x4a78c8, 1);
  g.fillRoundedRect(3, 2, 20, 20, 6);
  g.fillTriangle(3, 20, 23, 20, 13, 31); // punta in basso
  // Bordo dorato.
  g.lineStyle(2.5, 0xf2c14e, 1);
  g.strokeRoundedRect(3, 2, 20, 20, 6);
  g.beginPath();
  g.moveTo(3, 20);
  g.lineTo(13, 31);
  g.lineTo(23, 20);
  g.strokePath();
  // Croce chiara al centro (emblema).
  g.fillStyle(0xdfeaff, 1);
  g.fillRect(11, 5, 4, 18);
  g.fillRect(5, 10, 16, 4);
  // Borchia centrale.
  g.fillStyle(0xf2c14e, 1);
  g.fillCircle(13, 12, 3);

  g.generateTexture('shield_gfx', 26, 33);
  g.destroy();
}

// Navicella di Captain (Livello 8): razzo che PUNTA A DESTRA, blu come Captain.
function createShipTexture(scene) {
  if (scene.textures.exists('ship')) return;
  const g = scene.make.graphics({ add: false });
  // Fiamma dei motori (dietro, a sinistra).
  g.fillStyle(0xffa733, 1);
  g.fillTriangle(6, 17, 0, 22, 6, 27);
  g.fillStyle(0xffe14d, 1);
  g.fillTriangle(6, 19, 3, 22, 6, 25);
  // Corpo (fusoliera blu) che si assottiglia verso il muso.
  g.fillStyle(0x2f6fed, 1);
  g.fillRoundedRect(6, 12, 34, 20, 8);
  g.fillTriangle(38, 12, 54, 22, 38, 32); // muso a punta
  // Pinne.
  g.fillStyle(0x1c4bb0, 1);
  g.fillTriangle(10, 12, 20, 12, 12, 3);
  g.fillTriangle(10, 32, 20, 32, 12, 41);
  // Oblò (con un accenno del casco di Captain).
  g.fillStyle(0xbfe6ff, 1);
  g.fillCircle(24, 22, 6);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(26, 20, 2);

  g.generateTexture('ship', 56, 44);
  g.destroy();
}

// Navicella aliena (Livello 8): un caccia/disco che PUNTA A SINISTRA (verso Captain),
// viola con cupola verde e un cannoncino frontale.
function createAlienShipTexture(scene) {
  if (scene.textures.exists('alien_ship')) return;
  const g = scene.make.graphics({ add: false });
  // Scafo a disco (viola).
  g.fillStyle(0x8e44c8, 1);
  g.fillEllipse(26, 22, 40, 20);
  g.fillStyle(0x6f2fa8, 1); // ombra sotto
  g.fillEllipse(26, 26, 36, 12);
  // Cupola (verde alieno) con occhio.
  g.fillStyle(0x4be08a, 1);
  g.fillEllipse(28, 15, 22, 16);
  g.fillStyle(0x0d3b24, 1);
  g.fillCircle(24, 14, 3.5);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(23, 13, 1.3);
  // Cannoncino frontale (a sinistra, verso il player).
  g.fillStyle(0x9aa0a8, 1);
  g.fillRect(2, 20, 10, 5);
  // Lucine sotto lo scafo.
  g.fillStyle(0xffe14d, 1);
  g.fillCircle(18, 28, 2);
  g.fillCircle(28, 29, 2);
  g.fillCircle(38, 28, 2);

  g.generateTexture('alien_ship', 52, 40);
  g.destroy();
}

// Laser (Livello 8): capsula luminosa orizzontale con nucleo chiaro. Riusata per
// Captain (azzurro) e alieni (rosso) cambiando i colori.
function createLaserTexture(scene, key, outer, inner) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(outer, 1);
  g.fillRoundedRect(0, 1, 24, 6, 3);
  g.fillStyle(inner, 1);
  g.fillRoundedRect(3, 2, 18, 3, 2);
  g.generateTexture(key, 24, 8);
  g.destroy();
}

// Cometa/meteora (Livello 8): testa infuocata + una scia. Punta in alto a DESTRA,
// così, ruotata di 180°, "vola" verso il basso-sinistra (traiettoria diagonale).
function createCometTexture(scene) {
  if (scene.textures.exists('comet')) return;
  const g = scene.make.graphics({ add: false });
  // Scia (dalla coda, in alto a destra, che si affina).
  g.fillStyle(0xffd21a, 0.5);
  g.fillTriangle(18, 12, 44, 2, 44, 14);
  g.fillStyle(0xff8a3d, 0.7);
  g.fillTriangle(18, 13, 40, 6, 42, 14);
  // Testa (roccia infuocata).
  g.fillStyle(0x6b4a2b, 1);
  g.fillCircle(14, 14, 12);
  g.fillStyle(0xff6a00, 1);
  g.fillCircle(14, 14, 9);
  g.fillStyle(0xffd21a, 1);
  g.fillCircle(12, 12, 5);

  g.generateTexture('comet', 46, 28);
  g.destroy();
}

// Rinoceronte (Livello 6): carica da destra verso SINISTRA, va SALTATO (non si uccide).
// Base 68x42, guarda a SINISTRA (corno in avanti verso sinistra).
function createRhinoTexture(scene) {
  if (scene.textures.exists('rhino')) return;
  const g = scene.make.graphics({ add: false });
  // Corpo (grigio).
  g.fillStyle(0x8a8f96, 1);
  g.fillRoundedRect(24, 8, 40, 24, 10);
  // Testa (a sinistra).
  g.fillRoundedRect(10, 12, 22, 20, 8);
  // Corno grande in avanti (verso sinistra) + cornino.
  g.fillStyle(0xe8e2d0, 1);
  g.fillTriangle(12, 16, 0, 22, 12, 26);
  g.fillTriangle(16, 12, 12, 5, 22, 14);
  // Orecchio.
  g.fillStyle(0x6f747b, 1);
  g.fillTriangle(30, 9, 36, 1, 38, 11);
  // Occhio.
  g.fillStyle(0x201a10, 1);
  g.fillCircle(20, 20, 2.2);
  // Zampe tozze.
  g.fillStyle(0x6f747b, 1);
  g.fillRect(28, 30, 7, 10);
  g.fillRect(40, 30, 7, 10);
  g.fillRect(52, 30, 7, 10);
  // Ombra della pancia.
  g.fillStyle(0x777c83, 1);
  g.fillRect(24, 27, 40, 4);

  g.generateTexture('rhino', 68, 42);
  g.destroy();
}

// BOSS del Livello 8: demone-alieno IBRIDO. Astronave scura + testa da Yaksha
// (demone-gigante thai): pelle verde, corna e corona dorate, occhi fieri, zanne.
// Base 120x110, guarda a SINISTRA (verso Captain).
function createBossTexture(scene) {
  if (scene.textures.exists('boss_ship')) return;
  const g = scene.make.graphics({ add: false });
  // Scafo dell'astronave (dietro, a destra).
  g.fillStyle(0x2b2540, 1);
  g.fillRoundedRect(40, 20, 76, 70, 14);
  g.fillStyle(0x1d1830, 1); // ali/pinne
  g.fillTriangle(70, 20, 116, 4, 116, 30);
  g.fillTriangle(70, 90, 116, 106, 116, 80);
  // Reattori con bagliore (destra).
  g.fillStyle(0x37e0ff, 1);
  g.fillCircle(114, 45, 6);
  g.fillCircle(114, 66, 6);
  // Testa da Yaksha (davanti, a sinistra): pelle verde.
  g.fillStyle(0x5aa653, 1);
  g.fillRoundedRect(6, 26, 62, 60, 16);
  // Corna dorate ricurve.
  g.fillStyle(0xf2c14e, 1);
  g.fillTriangle(14, 26, 2, 2, 26, 22);
  g.fillTriangle(58, 26, 70, 2, 46, 22);
  // Corona/ornamento thai dorato sulla fronte.
  g.fillTriangle(24, 26, 32, 8, 40, 26);
  g.fillRect(18, 26, 34, 4);
  // Occhi fieri (gialli, contorno rosso).
  g.fillStyle(0xb0392e, 1);
  g.fillCircle(24, 50, 9);
  g.fillCircle(50, 50, 9);
  g.fillStyle(0xffe14d, 1);
  g.fillCircle(24, 50, 6);
  g.fillCircle(50, 50, 6);
  g.fillStyle(0x201a10, 1);
  g.fillCircle(22, 51, 2.6);
  g.fillCircle(48, 51, 2.6);
  // Sopracciglia arrabbiate.
  g.lineStyle(3, 0x2a5a2a, 1);
  g.beginPath();
  g.moveTo(13, 42);
  g.lineTo(31, 48);
  g.strokePath();
  g.beginPath();
  g.moveTo(61, 42);
  g.lineTo(43, 48);
  g.strokePath();
  // Bocca con denti e zanne.
  g.fillStyle(0x3a1a1a, 1);
  g.fillRoundedRect(18, 68, 38, 12, 4);
  g.fillStyle(0xf0f0f0, 1);
  for (let tx = 20; tx < 54; tx += 6) g.fillRect(tx, 68, 4, 4);
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(21, 68, 26, 68, 23, 82); // zanna sinistra
  g.fillTriangle(48, 68, 53, 68, 51, 82); // zanna destra

  g.generateTexture('boss_ship', 120, 110);
  g.destroy();
}

// Fendente della spada: un arco luminoso (mezzaluna) che "sbulge" verso destra.
// Nel gioco lo giriamo (flipX) in base alla direzione di Captain. 64x64.
function createSlashTexture(scene) {
  if (scene.textures.exists(TEXTURES.slash)) return;
  const g = scene.make.graphics({ add: false });
  // Fendente vivace: arco BLU esterno + nucleo ROSSO (più energico del bianco).
  g.lineStyle(11, 0x2f6fff, 0.95); // blu vivo (esterno)
  g.beginPath();
  g.arc(24, 32, 22, -0.5 * Math.PI, 0.5 * Math.PI, false);
  g.strokePath();
  g.lineStyle(5, 0xff3b3b, 1); // rosso vivo (nucleo)
  g.beginPath();
  g.arc(24, 32, 22, -0.42 * Math.PI, 0.42 * Math.PI, false);
  g.strokePath();
  g.generateTexture(TEXTURES.slash, 64, 64);
  g.destroy();
}

// Captain ha 3 fotogrammi: posa ferma ('captain') + 2 di camminata
// ('captain_walk0/1') con le gambe che si alzano a turno. In gioco riproduciamo
// l'animazione 'captain_walk' mentre cammina (creata in BootScene).
function createCaptainFrames(scene) {
  if (scene.textures.exists(TEXTURES.captain)) return; // già generati
  createCaptainFrame(scene, TEXTURES.captain, 'idle');
  createCaptainFrame(scene, 'captain_walk0', 'walkA');
  createCaptainFrame(scene, 'captain_walk1', 'walkB');
}

function createCaptainFrame(scene, key, pose) {
  const g = scene.make.graphics({ add: false });

  // --- GAMBE (disegnate prima, così il corpo ne copre l'attaccatura) ---
  // In camminata una gamba è "giù" (più lunga) e l'altra "su" (più corta): a
  // turno, dà il passo. Da ferma sono uguali.
  let hLeft = 13;
  let hRight = 13;
  if (pose === 'walkA') { hLeft = 14; hRight = 9; }
  else if (pose === 'walkB') { hLeft = 9; hRight = 14; }
  g.fillStyle(0x14307a, 1); // pantaloni blu scuro
  g.fillRoundedRect(11, 45, 8, hLeft, 3);
  g.fillRoundedRect(21, 45, 8, hRight, 3);

  // --- CORPO (tuta blu), 3/4 rivolto a destra ---
  g.fillStyle(COLORS.captain, 1);
  g.fillRoundedRect(5, 24, 30, 23, 8);
  // Testa.
  g.fillStyle(0xffd9a8, 1);
  g.fillCircle(19, 15, 12);
  g.fillCircle(30, 16, 2.6); // nasino verso destra
  // Cappello (cocuzzolo + visiera a destra).
  g.fillStyle(0x14307a, 1);
  g.fillRoundedRect(7, 5, 26, 5, 2);
  g.fillRoundedRect(11, -1, 18, 8, 3);
  g.fillRoundedRect(28, 6, 12, 4, 2);
  // Occhi verso la fronte (destra).
  g.fillStyle(0xffffff, 1);
  g.fillCircle(20, 15, 3.4);
  g.fillCircle(27, 15, 3.4);
  g.fillStyle(0x222222, 1);
  g.fillCircle(21, 15.5, 1.8);
  g.fillCircle(28, 15.5, 1.8);
  // Sorriso in avanti.
  g.lineStyle(2, 0x7a3b1e, 1);
  g.beginPath();
  g.arc(23, 19, 4, 0.05 * Math.PI, 0.75 * Math.PI, false);
  g.strokePath();

  g.generateTexture(key, 40, 60);
  g.destroy();
}

// Ritratto segnaposto di Teacher Kukkai: una maestra dal viso caldo e gentile.
// Personaggio ORIGINALE (non basato su persone reali). 120x120, sostituibile.
function createKukkaiPortraitTexture(scene) {
  // TRE emozioni: felice (chiave storica), preoccupata, spaventata.
  // La storia le usa: preoccupata quando avvista lo Yaksha, spaventata da
  // prigioniera, felice all'inizio dei complimenti e al finale.
  drawKukkaiPortrait(scene, TEXTURES.kukkaiPortrait, 'happy');
  drawKukkaiPortrait(scene, 'kukkai_worried', 'worried');
  drawKukkaiPortrait(scene, 'kukkai_scared', 'scared');
}

// Disegna il ritratto di Kukkai con l'espressione richiesta.
function drawKukkaiPortrait(scene, key, mood) {
  if (scene.textures.exists(key)) return;

  const g = scene.make.graphics({ add: false });

  // Capelli (dietro), tono caldo scuro.
  g.fillStyle(0x4a2f1a, 1);
  g.fillCircle(60, 58, 52);
  // Viso.
  g.fillStyle(0xffd9b0, 1);
  g.fillCircle(60, 64, 40);
  // Guance rosate (gentilezza) — meno visibili quando è spaventata (pallida).
  g.fillStyle(0xff9e8a, mood === 'scared' ? 0.25 : 0.55);
  g.fillCircle(40, 74, 8);
  g.fillCircle(80, 74, 8);

  // Occhi: più SBARRATI quando è spaventata.
  const eyeR = mood === 'scared' ? 8.5 : 7;
  const pupilR = mood === 'scared' ? 2.8 : 3.6;
  g.fillStyle(0xffffff, 1);
  g.fillCircle(47, 60, eyeR);
  g.fillCircle(73, 60, eyeR);
  g.fillStyle(0x33241a, 1);
  g.fillCircle(47, 61, pupilR);
  g.fillCircle(73, 61, pupilR);

  // Sopracciglia: assenti da felice; INCLINATE (interno in su) da preoccupata/spaventata.
  if (mood !== 'happy') {
    const lift = mood === 'scared' ? 4 : 2; // spaventata = più alzate
    g.lineStyle(2.6, 0x4a2f1a, 1);
    g.beginPath();
    g.moveTo(39, 52);
    g.lineTo(53, 47 - lift);
    g.strokePath();
    g.beginPath();
    g.moveTo(81, 52);
    g.lineTo(67, 47 - lift);
    g.strokePath();
  }

  // Bocca: sorriso / piega preoccupata / "O" di paura.
  if (mood === 'happy') {
    g.lineStyle(3, 0x8a4b2a, 1);
    g.beginPath();
    g.arc(60, 72, 16, 0.12 * Math.PI, 0.88 * Math.PI, false);
    g.strokePath();
  } else if (mood === 'worried') {
    g.lineStyle(3, 0x8a4b2a, 1);
    g.beginPath();
    g.arc(60, 90, 10, 1.2 * Math.PI, 1.8 * Math.PI, false); // arco all'ingiù
    g.strokePath();
  } else {
    g.fillStyle(0x5a3324, 1); // bocca aperta ("oh no!")
    g.fillEllipse(60, 82, 13, 17);
    g.fillStyle(0x8a4b3a, 1);
    g.fillEllipse(60, 84, 8, 10);
  }

  // Un fiore tra i capelli: tocco affettuoso da maestra (sempre).
  g.fillStyle(0xffd166, 1);
  g.fillCircle(96, 34, 6);
  g.fillStyle(0xff7eb6, 1);
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5;
    g.fillCircle(96 + Math.cos(a) * 8, 34 + Math.sin(a) * 8, 4);
  }

  g.generateTexture(key, 120, 120);
  g.destroy();
}
