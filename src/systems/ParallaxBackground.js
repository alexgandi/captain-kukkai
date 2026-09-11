import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

// ParallaxBackground: dà PROFONDITÀ agli sfondi senza appesantirli. Due ingredienti:
//  1) un CIELO A GRADIENTE (in alto più intenso, verso l'orizzonte più chiaro) —
//     valido per tutti i temi, sostituisce il colore piatto;
//  2) più STRATI in parallasse (lontano/medio/vicino) che scorrono a velocità
//     diverse: le cose lontane sono più chiare/sfumate (foschia) e si muovono piano.
// Regola d'oro: sobrio. Palette limitata, poco movimento, niente dettagli nella
// "corsia" di gioco (tutto sta DIETRO al pavimento e a Captain).
//
// RENDER PER TELEFONI ECONOMICI (revisione ultra #19): ogni strato ripetitivo è
// una TESSERA periodica "cotta" UNA volta in una texture power-of-two e stesa
// con un TileSprite grande quanto lo schermo — un solo quad per strato, qualunque
// sia la lunghezza del mondo. Prima ogni strato era un Graphics con 50-230
// ellissi/rettangoli che Phaser ridisegnava a OGNI frame (e ogni Graphics
// spezza il batch WebGL). Ciuffi d'erba e nuvole sono Image da texture cotte
// (un solo draw call), e le animazioni ambientali condividono pochi tween.

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

// --- Infrastruttura: texture cotte, strati a tessera, intervallo visibile -----

// Cuoce una texture `w`×`h` disegnata da draw(g) (origine in alto a sinistra).
// Le texture sono GLOBALI: la stessa chiave si riusa a ogni riavvio della scena
// e nei livelli con lo stesso ambiente, senza ridisegnare nulla.
export function bakeTexture(scene, key, w, h, draw) {
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  return key;
}

// STRATO PERIODICO: la tessera (larga `period`, alta `h`, entrambi power-of-two)
// viene disegnata chiamando draw(g, ox) per ox = -2P..+2P, così le forme che
// sporgono da un bordo rientrano dall'altro e la ripetizione è senza cuciture.
// Il TileSprite è largo quanto lo SCHERMO e fisso alla camera: la parallasse la
// fa tilePositionX = scrollX × sf, aggiornato a ogni frame. `y` è la quota
// (in coordinate del mondo/schermo) del bordo superiore della tessera.
export function addTiledLayer(scene, key, { period, h, y, sf = 0.5, depth = -10, draw, alpha = 1 }) {
  const texKey = bakeTexture(scene, `bg_${key}`, period, h, (g) => {
    [-2, -1, 0, 1, 2].forEach((k) => draw(g, k * period));
  });
  const ts = scene.add.tileSprite(0, y, scene.scale.width, h, texKey).setOrigin(0, 0).setScrollFactor(0).setDepth(depth).setAlpha(alpha);
  const cam = scene.cameras.main;
  const sync = () => {
    ts.tilePositionX = cam.scrollX * sf;
  };
  sync();
  scene.events.on('postupdate', sync);
  const off = () => scene.events.off('postupdate', sync);
  ts.once('destroy', off);
  scene.events.once('shutdown', off);
  return ts;
}

// Fin dove può arrivare, in coordinate del mondo, un oggetto con scrollFactor
// `sf` prima di uscire per sempre dallo schermo: oltre questa x non ha senso
// crearlo (la camera non ci arriva mai). Con sf = 0.3 e un mondo di 9000 px,
// bastano ~3300 px di stelle invece di 9000.
export function visibleSpan(scene, worldWidth, sf) {
  const W = scene.scale.width;
  return Math.min(worldWidth, (worldWidth - W) * sf + W) + 40;
}

// Un solo tween per GRUPPO di oggetti (con fasi sfalsate tra i gruppi) al
// posto di un tween per oggetto: stesse animazioni, decine di tween in meno.
export function tweenInGroups(scene, targets, groups, makeConfig) {
  const buckets = Array.from({ length: groups }, () => []);
  targets.forEach((t, i) => buckets[i % groups].push(t));
  buckets.forEach((bucket, gi) => {
    if (bucket.length) scene.tweens.add({ targets: bucket, ...makeConfig(gi) });
  });
}

// --- Nuvole e sole ------------------------------------------------------------

// Nuvole morbide che scivolano lentissime (parallasse quasi nulla). Una sola
// texture cotta, riusata a tre scale: Image, non Graphics (batch unico).
export function drawClouds(scene, worldWidth, opts = {}) {
  const { sf = 0.14, depth = -15, yMax = 150, color = 0xffffff, alpha = 0.8 } = opts;
  const key = bakeTexture(scene, `bg_cloud_${color.toString(16)}`, 160, 48, (g) => {
    g.fillStyle(color, 1);
    g.fillEllipse(80, 22, 92, 34);
    g.fillEllipse(46, 29, 60, 26);
    g.fillEllipse(116, 28, 66, 28);
  });
  const span = visibleSpan(scene, worldWidth, sf);
  const count = Math.max(2, Math.ceil(span / 520));
  for (let i = 0; i < count; i++) {
    const x = 140 + ((i * 613) % Math.max(1, span - 220));
    const y = 26 + ((i * 47) % yMax);
    const s = 0.7 + (i % 3) * 0.35;
    const cloud = scene.add.image(x, y, key).setScale(s).setAlpha(alpha).setScrollFactor(sf).setDepth(depth);
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

// --- Sfondi a strati per ambiente ---------------------------------------------

// SFONDO GIUNGLA (Livello 1): sole caldo, nuvole, montagne lontane nella foschia
// con un tempio ogni tanto, una fila d'alberi a media distanza, cespugli vicini.
export function buildJungleBackground(scene, worldWidth, floorTop) {
  // Sole caldo con alone, in alto a destra (lontano da cuori/HUD), quasi immobile.
  scene.add.circle(660, 66, 44, 0xfff2bf, 0.45).setScrollFactor(0.08).setDepth(-17);
  scene.add.circle(660, 66, 27, 0xfff8dc, 0.7).setScrollFactor(0.08).setDepth(-17);

  drawClouds(scene, worldWidth, { sf: 0.13, depth: -16 });

  // LONTANO: catena di montagne verde-azzurre nella foschia + un wat (chedi
  // grande + piccolo) ogni 1024 px, in un'unica tessera.
  addTiledLayer(scene, 'jungle_far', {
    period: 1024, h: 256, y: floorTop - 200, sf: 0.2, depth: -14,
    draw: (g, ox) => {
      const by = 200;
      g.fillStyle(0x9fc6c0, 0.85);
      for (let x = 128; x < 1024; x += 256) g.fillEllipse(ox + x, by + 10, 440, 250);
      drawChedi(g, ox + 300, by - 58, 132, 0xcabfa6, 0.92);
      drawChedi(g, ox + 366, by - 40, 84, 0xc2b79e, 0.9);
    },
  });

  // MEDIO: linea di alberi della giungla (due toni per un po' di volume).
  addTiledLayer(scene, 'jungle_mid', {
    period: 128, h: 128, y: floorTop - 110, sf: 0.42, depth: -12,
    draw: (g, ox) => {
      const by = 110;
      g.fillStyle(0x3f8a49, 1);
      g.fillEllipse(ox + 64, by - 6, 190, 150);
      g.fillStyle(0x54a85c, 1);
      g.fillEllipse(ox + 94, by - 40, 150, 120);
    },
  });

  // VICINO: cespugli/felci scure che spuntano appena sopra il bordo del suolo.
  addTiledLayer(scene, 'jungle_near', {
    period: 128, h: 64, y: floorTop - 40, sf: 0.72, depth: -8,
    draw: (g, ox) => {
      g.fillStyle(0x2c7538, 1);
      g.fillEllipse(ox + 64, 48, 200, 76);
    },
  });
}

// SFONDO GHIACCIO (L2): vette innevate lontane, colline di neve, cumuli vicini.
export function buildIceBackground(scene, worldWidth, floorTop) {
  drawClouds(scene, worldWidth, { sf: 0.13, depth: -16, alpha: 0.7 });

  addTiledLayer(scene, 'ice_far', {
    period: 256, h: 256, y: floorTop - 200, sf: 0.2, depth: -14,
    draw: (g, ox) => {
      const by = 200;
      const x = ox + 128;
      g.fillStyle(0xbcd8ef, 0.9);
      g.fillTriangle(x - 155, by, x + 155, by, x, by - 172);
      g.fillStyle(0xffffff, 0.95); // cappuccio di neve
      g.fillTriangle(x - 48, by - 118, x + 48, by - 118, x, by - 172);
    },
  });

  addTiledLayer(scene, 'ice_mid', {
    period: 256, h: 128, y: floorTop - 80, sf: 0.42, depth: -12,
    draw: (g, ox) => {
      g.fillStyle(0xdff1ff, 1);
      g.fillEllipse(ox + 128, 80, 300, 150);
    },
  });

  addTiledLayer(scene, 'ice_near', {
    period: 128, h: 64, y: floorTop - 40, sf: 0.72, depth: -8,
    draw: (g, ox) => {
      g.fillStyle(0xf2fbff, 1);
      g.fillEllipse(ox + 64, 48, 172, 76);
    },
  });
}

// SFONDO VULCANO (L3): creste scure, grandi coni con cratere che brilla, rocce.
export function buildVolcanoBackground(scene, worldWidth, floorTop) {
  const BIG = 1024; // un grande vulcano ogni 1024 px (col cratere che pulsa)
  addTiledLayer(scene, 'volcano_far', {
    period: BIG, h: 256, y: floorTop - 200, sf: 0.2, depth: -14,
    draw: (g, ox) => {
      const by = 200;
      g.fillStyle(0x3a1c18, 0.95);
      for (let x = 128; x < BIG; x += 256) g.fillTriangle(ox + x - 175, by, ox + x + 175, by, ox + x, by - 158);
      const vx = ox + 360;
      g.fillStyle(0x241210, 1);
      g.fillTriangle(vx - 145, by, vx + 145, by, vx, by - 194);
      g.fillStyle(0xff6a1e, 0.45); // colata sul fianco
      g.fillTriangle(vx - 7, by - 186, vx + 7, by - 186, vx, by);
    },
  });
  // I crateri incandescenti pulsano: pochi oggetti (solo nell'intervallo
  // visibile) e UN solo tween per tutti.
  const glows = [];
  const span = visibleSpan(scene, worldWidth, 0.2);
  for (let vx = 360; vx < span; vx += BIG) {
    glows.push(scene.add.circle(vx, floorTop - 182, 20, 0xff7a2a, 0.8).setScrollFactor(0.2).setDepth(-13));
  }
  if (glows.length) scene.tweens.add({ targets: glows, alpha: 0.4, scale: 1.25, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  addTiledLayer(scene, 'volcano_near', {
    period: 128, h: 64, y: floorTop - 40, sf: 0.72, depth: -8,
    draw: (g, ox) => {
      g.fillStyle(0x1c0f0e, 1);
      g.fillEllipse(ox + 64, 50, 172, 82);
    },
  });
}

// --- Rifiniture per i temi che avevano già uno sfondo di base ---

// CITTÀ: nuvole alte + uno skyline lontanissimo pallido (foschia) + alberelli
// di strada in primo piano. Si somma allo skyline+neon (buildCityscape).
export function enrichCity(scene, worldWidth, floorTop) {
  drawClouds(scene, worldWidth, { sf: 0.1, depth: -18, alpha: 0.5 });
  addTiledLayer(scene, 'city_haze', {
    period: 512, h: 256, y: floorTop - 220, sf: 0.18, depth: -15,
    draw: (g, ox) => {
      const by = 220;
      g.fillStyle(0xb9cddd, 0.6);
      [90, 130, 170, 210].forEach((h, i) => g.fillRect(ox + i * 128 + 24, by - h, 80, h));
    },
  });
  // Alberelli di strada vicino al suolo (verde urbano, in primo piano).
  addTiledLayer(scene, 'city_trees', {
    period: 256, h: 64, y: floorTop - 64, sf: 0.82, depth: -6,
    draw: (g, ox) => {
      const x = ox + 128;
      g.fillStyle(0x5a4632, 1);
      g.fillRect(x - 3, 30, 6, 34); // tronco
      g.fillStyle(0x4f8f52, 1);
      g.fillEllipse(x, 22, 46, 40); // chioma
    },
  });
}

// Skyline di Bangkok: due file di grattacieli (lontani + vicini) con parallasse,
// finestre accese COTTE nella tessera; le insegne al neon (testo thai) restano
// oggetti veri, ma solo nell'intervallo visibile e con un tween condiviso.
export function buildCityscape(scene, worldWidth, floorTop, hillColor) {
  const P = 1024;
  // Fila lontana: 8 grattacieli per tessera, altezze "irregolari" ma fisse.
  const farH = [157, 194, 121, 158, 195, 122, 159, 196];
  addTiledLayer(scene, `city_far_${hillColor.toString(16)}`, {
    period: P, h: 256, y: floorTop - 10 - 246, sf: 0.35, depth: -11,
    draw: (g, ox) => {
      g.fillStyle(hillColor, 1);
      farH.forEach((h, i) => g.fillRect(ox + i * 128 + 19, 246 - h, 90, h));
    },
  });
  // Fila vicina: più scura, con le finestrelle accese (griglia rada, qualcuna spenta).
  const nearH = [90, 127, 164, 111, 148, 95, 132, 169];
  addTiledLayer(scene, 'city_near', {
    period: P, h: 256, y: floorTop - 250, sf: 0.6, depth: -9,
    draw: (g, ox) => {
      const by = 250;
      nearH.forEach((h, i) => {
        const x = ox + i * 128 + 64;
        const top = by - h;
        g.fillStyle(0x5c6b80, 1);
        g.fillRect(x - 55, top, 110, h);
        g.fillStyle(0xffe9a8, 0.85);
        for (let wy = top + 14; wy < by - 10; wy += 26) {
          for (let wx = x - 55 + 14; wx < x + 55 - 8; wx += 24) {
            if ((wx + wy + i) % 3 === 0) continue; // qualcuna spenta, per varietà
            g.fillRect(wx - 4, wy - 5, 8, 10);
          }
        }
      });
    },
  });
  // INSEGNE AL NEON (Bangkok!): colorate, con scritte thai, una ogni 3 palazzi.
  // Una su due "sfarfalla" come un neon vero (un solo tween per tutte).
  const neonColors = [0xff5aa0, 0x37e0ff, 0xffe14d, 0x4be08a];
  const neonWords = ['อาหาร', 'โรงแรม', 'ตลาด', 'นวด'];
  const flicker = [];
  const span = visibleSpan(scene, worldWidth, 0.6);
  for (let n = 3; n * 128 < span; n += 3) {
    const x = n * 128 - 64; // il centro del palazzo n-esimo (tessera: 64 + i*128)
    const top = floorTop - nearH[(n - 1) % 8];
    const ci = Math.floor(n / 3) % neonColors.length;
    const sign = scene.add.container(x, top + 30).setScrollFactor(0.6).setDepth(-8.8);
    const box = scene.add.rectangle(0, 0, 64, 22, 0x14101f, 0.9);
    box.setStrokeStyle(2, neonColors[ci], 1);
    const txt = scene.add
      .text(0, 0, neonWords[ci], { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5)
      .setTint(neonColors[ci]);
    sign.add([box, txt]);
    if (n % 6 === 0) flicker.push(sign);
  }
  if (flicker.length) scene.tweens.add({ targets: flicker, alpha: 0.35, duration: 90, yoyo: true, repeat: -1, repeatDelay: 1700 });
}

// FORESTA: cresta di colline nella foschia dietro agli alberi + nuvole tenui +
// felci scure in primo piano. Si somma alla doppia fila di alberi (buildForestTrees).
export function enrichForest(scene, worldWidth, floorTop) {
  drawClouds(scene, worldWidth, { sf: 0.1, depth: -18, alpha: 0.35 });
  addTiledLayer(scene, 'forest_haze', {
    period: 256, h: 128, y: floorTop - 120, sf: 0.2, depth: -15,
    draw: (g, ox) => {
      g.fillStyle(0x8fbf9c, 0.55);
      g.fillEllipse(ox + 128, 120, 470, 220);
    },
  });
  addTiledLayer(scene, 'forest_ferns', {
    period: 128, h: 64, y: floorTop - 40, sf: 0.78, depth: -6,
    draw: (g, ox) => {
      g.fillStyle(0x214726, 1);
      g.fillEllipse(ox + 64, 48, 164, 76);
    },
  });
}

// Sfondo di foresta: due file di alberi (tronchi + chiome) con parallasse, per
// dare profondità dietro agli alberi-dropper in primo piano. La tessera è alta
// 512 (dalla chioma al suolo), quindi dipende dalla quota del pavimento.
export function buildForestTrees(scene, worldWidth, floorTop, hillColor) {
  const rows = [
    { key: 'far', sf: 0.35, depth: -11, trunk: 0x3a5230, canopy: hillColor, top: 150, period: 512, step: 128, cw: 130 },
    { key: 'near', sf: 0.6, depth: -9, trunk: 0x4a5f34, canopy: 0x3c8a46, top: 210, period: 1024, step: 256, cw: 150 },
  ];
  rows.forEach((row, ri) => {
    const H = 512;
    const by = 500; // quota del suolo nella tessera
    addTiledLayer(scene, `forest_${row.key}_${floorTop}_${row.canopy.toString(16)}`, {
      period: row.period, h: H, y: floorTop - by, sf: row.sf, depth: row.depth,
      draw: (g, ox) => {
        for (let i = 0; i * row.step < row.period; i++) {
          const x = ox + i * row.step + row.step / 2;
          const canopyY = by - (floorTop - (row.top + ((i * 29 + ri * 41) % 40)));
          g.fillStyle(row.trunk, 1);
          g.fillRect(x - 7, canopyY, 14, by - canopyY); // tronco
          g.fillStyle(row.canopy, 1); // chioma tondeggiante
          g.fillEllipse(x, canopyY, row.cw, row.cw * 0.5);
          g.fillEllipse(x - row.cw * 0.3, canopyY + 10, row.cw * 0.7, row.cw * 0.4);
          g.fillEllipse(x + row.cw * 0.3, canopyY + 10, row.cw * 0.7, row.cw * 0.4);
        }
      },
    });
  });
}

// CASTELLO: una fila di colonne PIÙ lontane e scure (profondità) + pulviscolo
// che fluttua nella luce delle torce. Si somma alle colonne/stendardi (buildCastleColumns).
export function enrichCastle(scene, worldWidth, floorTop) {
  const by = 500;
  addTiledLayer(scene, `castle_far_${floorTop}`, {
    period: 128, h: 512, y: floorTop - by, sf: 0.28, depth: -15,
    draw: (g, ox) => {
      const x = ox + 64;
      const top = by - (floorTop - 74);
      g.fillStyle(0x2c2838, 1);
      g.fillRect(x - 11, top, 22, by - top); // fusto lontano
      g.fillRect(x - 16, top, 32, 12); // capitello
      g.fillRect(x + 11, top, 96, 13); // architrave tra colonne (arco)
    },
  });
  addDustMotes(scene, worldWidth, floorTop);
}

// Colonne di pietra con capitello + stendardi rosso/oro appesi (una colonna
// su due) + torce accese sulle altre. Le fiammelle restano oggetti animati
// (solo quelle raggiungibili dalla camera, un tween per tutte).
export function buildCastleColumns(scene, worldWidth, floorTop) {
  const by = 500;
  const P = 512; // due colonne per tessera: una con stendardo, una con torcia
  addTiledLayer(scene, `castle_cols_${floorTop}`, {
    period: P, h: 512, y: floorTop - by, sf: 0.5, depth: -10,
    draw: (g, ox) => {
      [60, 316].forEach((cx, n) => {
        const x = ox + cx;
        const top = by - (floorTop - 60);
        g.fillStyle(0x4a4658, 1);
        g.fillRect(x - 16, top, 32, by - top); // fusto
        g.fillStyle(0x565270, 1); // luce sul fusto
        g.fillRect(x - 16, top, 8, by - top);
        g.fillStyle(0x39364a, 1); // capitello + base più scuri
        g.fillRect(x - 22, top, 44, 14);
        g.fillRect(x - 22, by - 16, 44, 16);
        if (n === 0) {
          // Stendardo (rosso con bordo/filo dorato).
          const t = by - (floorTop - 96);
          g.fillStyle(0xf2c14e, 1);
          g.fillRect(x - 15, t, 30, 4);
          g.fillStyle(0xb0392e, 1);
          g.fillRect(x - 13, t + 4, 26, 66);
          g.fillTriangle(x - 13, t + 70, x + 13, t + 70, x, t + 86); // punta a V
          g.fillStyle(0xf2c14e, 1); // emblema dorato
          g.fillCircle(x, t + 30, 7);
        } else {
          // Bastone della torcia (la fiammella è un oggetto vivo, sotto).
          const t = by - (floorTop - 120);
          g.fillStyle(0x3a2c1c, 1);
          g.fillRect(x - 2, t, 4, 22);
        }
      });
    },
  });
  const flames = [];
  const span = visibleSpan(scene, worldWidth, 0.5);
  for (let x = 316; x < span; x += P) {
    flames.push(scene.add.ellipse(x, 116, 12, 20, 0xffa733).setScrollFactor(0.5).setDepth(-9));
    flames.push(scene.add.ellipse(x, 118, 6, 12, 0xffe14d).setScrollFactor(0.5).setDepth(-9));
  }
  if (flames.length) scene.tweens.add({ targets: flames, scaleY: 0.8, alpha: 0.8, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

// NOTTE: colline scure (tessera) + luna + stelle che luccicano piano (solo
// nell'intervallo visibile, con 5 tween in tutto invece di uno per stella).
export function buildNightBackground(scene, worldWidth, floorTop, hillColor) {
  addTiledLayer(scene, `night_hills_${hillColor.toString(16)}`, {
    period: 256, h: 128, y: floorTop - 80, sf: 0.5, depth: -10,
    draw: (g, ox) => {
      g.fillStyle(hillColor, 1);
      g.fillEllipse(ox + 128, 80, 280, 150);
    },
  });
  // Luna in alto a destra, fissa (parallasse quasi nulla).
  scene.add.circle(680, 70, 34, 0xf4f0d8).setScrollFactor(0.1).setDepth(-12).setAlpha(0.95);
  // Stelle: distribuzione deterministica (niente random): passo fisso + sfasamento.
  const stars = [];
  const span = visibleSpan(scene, worldWidth, 0.3);
  let n = 0;
  for (let x = 20; x <= span; x += 70) {
    n++;
    const y = 30 + ((n * 53) % 180); // altezze varie nella fascia alta del cielo
    const r = 1 + (n % 3) * 0.6;
    const star = scene.add.circle(x, y, r, 0xffffff).setScrollFactor(0.3).setDepth(-11);
    star.setAlpha(0.5 + (n % 4) * 0.12);
    stars.push(star);
  }
  tweenInGroups(scene, stars, 5, (gi) => ({ alpha: 0.25, duration: 900 + gi * 250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
}

// Lucciole nella notte: puntini caldi che vagano e pulsano vicino a terra
// (12 lucciole, 6 tween in tutto).
export function addFireflies(scene, worldWidth) {
  const flies = [];
  for (let i = 0; i < 12; i++) {
    const fx = 200 + ((i * 397) % Math.max(1, worldWidth - 400));
    const fy = 260 + ((i * 61) % 120);
    const fly = scene.add.circle(fx, fy, 2.5, 0xffe98a, 0.9).setDepth(6);
    fly.startX = fx;
    fly.startY = fy;
    flies.push(fly);
  }
  tweenInGroups(scene, flies, 3, (gi) => ({ alpha: 0.15, duration: 600 + gi * 220, yoyo: true, repeat: -1 }));
  tweenInGroups(scene, flies, 3, (gi) => ({ x: '+=26', y: '-=16', duration: 1800 + gi * 350, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
}

// SPAZIO: campo stellare a due strati (tessere 512×512) + qualche stella che
// luccica davvero (12 oggetti, 3 tween) + pianeti decorativi.
export function buildSpaceStarfield(scene, worldWidth) {
  [
    { key: 'space_far', sf: 0.2, n: 26, r: 1.2, a: 0.7, seed: 197 },
    { key: 'space_mid', sf: 0.45, n: 16, r: 1.8, a: 0.9, seed: 271 },
  ].forEach((layer, li) => {
    addTiledLayer(scene, layer.key, {
      period: 512, h: 512, y: 0, sf: layer.sf, depth: -20,
      draw: (g, ox) => {
        g.fillStyle(0xffffff, layer.a);
        for (let i = 0; i < layer.n; i++) {
          const x = (i * layer.seed + li * 71) % 512;
          const y = (i * 89 + li * 43 + i * i * 7) % 512;
          g.fillCircle(ox + x, y, layer.r);
        }
      },
    });
  });
  const twinkles = [];
  const span = visibleSpan(scene, worldWidth, 0.45);
  for (let i = 0; i < 12; i++) {
    const x = 60 + ((i * 331) % Math.max(1, span - 120));
    const y = (i * 97 + 20) % GAME_HEIGHT;
    twinkles.push(scene.add.circle(x, y, 2, 0xffffff, 0.9).setScrollFactor(0.45).setDepth(-19));
  }
  tweenInGroups(scene, twinkles, 3, (gi) => ({ alpha: 0.2, duration: 800 + gi * 180, yoyo: true, repeat: -1 }));
  // Pianeti/sole/luna sparsi (decorativi, parallasse lenta).
  [
    { x: 500, y: 110, r: 44, c: 0xf2a94e, ring: false }, // sole/pianeta arancio
    { x: 1500, y: 330, r: 60, c: 0x4a78c8, ring: true }, // pianeta con anello
    { x: 2600, y: 90, r: 34, c: 0xd8d8e0, ring: false }, // luna
    { x: 3600, y: 300, r: 52, c: 0x8e44c8, ring: false }, // pianeta viola
    { x: 4600, y: 120, r: 40, c: 0x4be08a, ring: true },
  ].forEach((b) => {
    if (b.x > visibleSpan(scene, worldWidth, 0.3)) return;
    scene.add.circle(b.x, b.y, b.r, b.c).setScrollFactor(0.3).setDepth(-18).setAlpha(0.9);
    if (b.ring) {
      const ring = scene.add.ellipse(b.x, b.y, b.r * 3, b.r * 0.8, 0xffffff, 0).setScrollFactor(0.3).setDepth(-17);
      ring.setStrokeStyle(4, 0xf2d14e, 0.7);
    }
  });
}

// --- Tocchi "vivi" ---

// Erba che ondeggia sul bordo del suolo: ciuffi che dondolano dalla base.
// Ogni ciuffo è un'Image (texture cotta, una per colore): un solo draw call.
export function addGrassFringe(scene, worldWidth, floorTop, colors) {
  const keys = colors.map((c) =>
    bakeTexture(scene, `bg_tuft_${c.toString(16)}`, 24, 28, (g) => {
      g.fillStyle(c, 1);
      [-8, -3, 2, 7].forEach((bx, k) => {
        const h = 12 + (k % 3) * 5;
        g.fillTriangle(12 + bx - 2.5, 28, 12 + bx + 2.5, 28, 12 + bx + (k - 1.5), 28 - h);
      });
    })
  );
  const even = [];
  const odd = [];
  let i = 0;
  for (let x = 24; x < worldWidth; x += 128, i++) {
    const tuft = scene.add.image(x, floorTop + 3, keys[i % 2]).setOrigin(0.5, 1).setDepth(-0.5);
    (i % 2 ? even : odd).push(tuft);
  }
  if (even.length) scene.tweens.add({ targets: even, angle: 5, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  if (odd.length) scene.tweens.add({ targets: odd, angle: -5, duration: 1550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

// Farfalle che svolazzano piano (giungla): vagano e battono le ali.
export function addButterflies(scene, worldWidth, floorTop) {
  const span = Math.max(1, worldWidth - 400);
  for (let i = 0; i < 3; i++) {
    const bx = 320 + (i * 761) % span;
    const by = floorTop - 130 - (i % 3) * 34;
    const b = scene.add.text(bx, by, '🦋', { fontSize: '20px' }).setOrigin(0.5).setDepth(4);
    scene.tweens.add({ targets: b, x: bx + 130, y: by - 34, duration: 4200 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: b, scaleX: 0.45, duration: 230, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

// VIGNETTA/LUCE DI SCENA: una sola texture radiale (centro trasparente, angoli
// scuri) riusata ovunque, tinta per tema — il "palcoscenico illuminato" che
// separa un gioco vero da un prototipo, a costo per-frame zero.
// strength: opacità della vignetta; tint: velo colore ambiente (opzionale).
export function addVignette(scene, opts = {}) {
  const { strength = 0.26, tint = null, tintAlpha = 0.08 } = opts;
  const key = 'fx_vignette';
  if (!scene.textures.exists(key)) {
    const w = 320;
    const h = 180;
    const canvas = scene.textures.createCanvas(key, w, h);
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.42, w / 2, h / 2, w * 0.62);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    canvas.refresh();
  }
  const W = scene.scale.width;
  const H = scene.scale.height;
  // Velo colore ambiente sotto la vignetta (es. bagliore lava, gelo azzurro).
  if (tint !== null) {
    scene.add.rectangle(W / 2, H / 2, W, H, tint, tintAlpha).setScrollFactor(0).setDepth(1898);
  }
  const v = scene.add.image(W / 2, H / 2, key).setScrollFactor(0).setDepth(1900).setAlpha(strength);
  v.setDisplaySize(W, H);
  return v;
}

// Pulviscolo dorato che fluttua (castello): granelli lenti nella luce
// (14 granelli, 2 tween in tutto).
export function addDustMotes(scene, worldWidth, floorTop) {
  const span = Math.max(1, worldWidth - 300);
  const motes = [];
  for (let i = 0; i < 14; i++) {
    const mx = 150 + (i * 331) % span;
    const my = 120 + (i * 53) % Math.max(60, floorTop - 170);
    motes.push(scene.add.circle(mx, my, 1.7, 0xffe9b0, 0.5).setDepth(3));
  }
  tweenInGroups(scene, motes, 2, (gi) => ({ y: '-=32', x: '+=12', alpha: 0.1, duration: 3000 + gi * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
}
