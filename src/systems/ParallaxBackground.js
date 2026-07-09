import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

// ParallaxBackground: dà PROFONDITÀ agli sfondi senza appesantirli. Due ingredienti:
//  1) un CIELO A GRADIENTE (in alto più intenso, verso l'orizzonte più chiaro) —
//     valido per tutti i temi, sostituisce il colore piatto;
//  2) più STRATI in parallasse (lontano/medio/vicino) che scorrono a velocità
//     diverse: le cose lontane sono più chiare/sfumate (foschia) e si muovono piano.
// Regola d'oro: sobrio. Palette limitata, poco movimento, niente dettagli nella
// "corsia" di gioco (tutto sta DIETRO al pavimento e a Captain).

// Coppie di colore per il cielo, per tema (alto -> orizzonte).
const SKY = {
  jungle: [0x4f9fd6, 0xcfeefb],
  ice: [0x8fcdf0, 0xecf8ff],
  volcano: [0x2a0e0e, 0x6a2418],
  night: [0x0a0f2a, 0x232a52],
  city: [0x7fb4d6, 0xe1eef5],
  forest: [0x8fd0ad, 0xdaf3e4],
  castle: [0x241f33, 0x3c3552],
};

// Cielo a gradiente verticale, fisso alla camera, dietro a tutto.
export function drawGradientSky(scene, envKey) {
  const [top, bottom] = SKY[envKey] || SKY.jungle;
  scene.cameras.main.setBackgroundColor(bottom); // i bordi combaciano col gradiente
  const g = scene.add.graphics().setScrollFactor(0).setDepth(-30);
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  return g;
}

// Nuvole morbide che scivolano lentissime (parallasse quasi nulla).
export function drawClouds(scene, worldWidth, opts = {}) {
  const { sf = 0.14, depth = -15, yMax = 150, color = 0xffffff, alpha = 0.8 } = opts;
  const count = Math.max(2, Math.ceil(worldWidth / 520));
  for (let i = 0; i < count; i++) {
    const x = 140 + ((i * 613) % Math.max(1, worldWidth - 220));
    const y = 26 + ((i * 47) % yMax);
    const s = 0.7 + (i % 3) * 0.35;
    const cloud = scene.add.container(x, y).setScrollFactor(sf).setDepth(depth);
    const g = scene.add.graphics();
    g.fillStyle(color, alpha);
    g.fillEllipse(0, 0, 92 * s, 34 * s);
    g.fillEllipse(-34 * s, 7 * s, 60 * s, 26 * s);
    g.fillEllipse(36 * s, 6 * s, 66 * s, 28 * s);
    cloud.add(g);
    scene.tweens.add({ targets: cloud, x: x + 42, duration: 9000 + i * 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

// Silhouette di un tempio thai (chedi): basamento a gradoni + campana + guglia.
function drawChedi(g, x, baseY, h, color, alpha) {
  const w = h * 0.5;
  g.fillStyle(color, alpha);
  g.fillRect(x - w * 0.5, baseY - h * 0.14, w, h * 0.14); // basamento largo
  g.fillTriangle(x - w * 0.42, baseY - h * 0.12, x + w * 0.42, baseY - h * 0.12, x, baseY - h * 0.58); // campana
  g.fillTriangle(x - w * 0.22, baseY - h * 0.48, x + w * 0.22, baseY - h * 0.48, x, baseY - h * 0.82); // gradone
  g.fillRect(x - h * 0.022, baseY - h * 0.9, h * 0.044, h * 0.18); // guglia
  g.fillCircle(x, baseY - h * 0.92, h * 0.035); // pinnacolo dorato
}

// SFONDO GIUNGLA (Livello 1): sole caldo, nuvole, montagne lontane nella foschia
// con qualche tempio, una fila d'alberi a media distanza, cespugli in primo piano.
export function buildJungleBackground(scene, worldWidth, floorTop) {
  // Sole caldo con alone, in alto a destra (lontano da cuori/HUD), quasi immobile.
  scene.add.circle(660, 66, 44, 0xfff2bf, 0.45).setScrollFactor(0.08).setDepth(-17);
  scene.add.circle(660, 66, 27, 0xfff8dc, 0.7).setScrollFactor(0.08).setDepth(-17);

  drawClouds(scene, worldWidth, { sf: 0.13, depth: -16 });

  // LONTANO: catena di montagne verde-azzurre nella foschia + templi thai.
  const far = scene.add.graphics().setScrollFactor(0.2).setDepth(-14);
  far.fillStyle(0x9fc6c0, 0.85);
  for (let x = -140; x <= worldWidth + 140; x += 250) far.fillEllipse(x, floorTop + 10, 440, 250);
  // Ogni "tempio" è un wat: un chedi grande + uno piccolo accanto.
  for (let i = 0; i * 820 < worldWidth; i++) {
    const tx = 300 + i * 820;
    drawChedi(far, tx, floorTop - 58, 132, 0xcabfa6, 0.92);
    drawChedi(far, tx + 66, floorTop - 40, 84, 0xc2b79e, 0.9);
  }

  // MEDIO: linea di alberi della giungla (due toni per un po' di volume).
  const mid = scene.add.graphics().setScrollFactor(0.42).setDepth(-12);
  mid.fillStyle(0x3f8a49, 1);
  for (let x = -110; x <= worldWidth + 110; x += 128) mid.fillEllipse(x, floorTop - 6, 190, 150);
  mid.fillStyle(0x54a85c, 1);
  for (let x = -110; x <= worldWidth + 110; x += 128) mid.fillEllipse(x + 30, floorTop - 40, 150, 120);

  // VICINO: cespugli/felci scure che spuntano appena sopra il bordo del suolo.
  const near = scene.add.graphics().setScrollFactor(0.72).setDepth(-8);
  near.fillStyle(0x2c7538, 1);
  for (let x = -50; x <= worldWidth + 50; x += 96) near.fillEllipse(x, floorTop + 8, 160, 76);
}

// SFONDO GHIACCIO (L2): vette innevate lontane, colline di neve, cumuli vicini.
export function buildIceBackground(scene, worldWidth, floorTop) {
  drawClouds(scene, worldWidth, { sf: 0.13, depth: -16, alpha: 0.7 });

  const far = scene.add.graphics().setScrollFactor(0.2).setDepth(-14);
  for (let x = -160; x <= worldWidth + 160; x += 230) {
    far.fillStyle(0xbcd8ef, 0.9);
    far.fillTriangle(x - 155, floorTop, x + 155, floorTop, x, floorTop - 172);
    far.fillStyle(0xffffff, 0.95); // cappuccio di neve
    far.fillTriangle(x - 48, floorTop - 118, x + 48, floorTop - 118, x, floorTop - 172);
  }

  const mid = scene.add.graphics().setScrollFactor(0.42).setDepth(-12);
  mid.fillStyle(0xdff1ff, 1);
  for (let x = -120; x <= worldWidth + 120; x += 200) mid.fillEllipse(x, floorTop, 300, 150);

  const near = scene.add.graphics().setScrollFactor(0.72).setDepth(-8);
  near.fillStyle(0xf2fbff, 1);
  for (let x = -60; x <= worldWidth + 60; x += 110) near.fillEllipse(x, floorTop + 8, 172, 76);
}

// SFONDO VULCANO (L3): creste scure, grandi coni con cratere che brilla, rocce.
export function buildVolcanoBackground(scene, worldWidth, floorTop) {
  const far = scene.add.graphics().setScrollFactor(0.2).setDepth(-14);
  far.fillStyle(0x3a1c18, 0.95);
  for (let x = -160; x <= worldWidth + 160; x += 240) far.fillTriangle(x - 175, floorTop, x + 175, floorTop, x, floorTop - 158);

  // Un grande vulcano ogni tanto, con cratere incandescente e colata luminosa.
  for (let i = 0; i * 880 < worldWidth; i++) {
    const vx = 360 + i * 880;
    far.fillStyle(0x241210, 1);
    far.fillTriangle(vx - 145, floorTop, vx + 145, floorTop, vx, floorTop - 194);
    far.fillStyle(0xff6a1e, 0.45); // colata sul fianco
    far.fillTriangle(vx - 7, floorTop - 186, vx + 7, floorTop - 186, vx, floorTop);
    const glow = scene.add.circle(vx, floorTop - 182, 20, 0xff7a2a, 0.8).setScrollFactor(0.2).setDepth(-13);
    scene.tweens.add({ targets: glow, alpha: 0.4, scale: 1.25, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  const near = scene.add.graphics().setScrollFactor(0.72).setDepth(-8);
  near.fillStyle(0x1c0f0e, 1);
  for (let x = -60; x <= worldWidth + 60; x += 120) near.fillEllipse(x, floorTop + 10, 172, 82);
}
