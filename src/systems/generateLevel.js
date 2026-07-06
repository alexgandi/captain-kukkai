import { GAME_HEIGHT } from '../config.js';

// assignStyles: dato il numero di nemici e un MIX (stili con peso percentuale),
// decide QUALE stile ha ciascun nemico, in modo DETERMINISTICO e ben SPARSO
// (non "tutti i nuovi prima, poi tutti i vecchi").
//  - conteggi via "resto più grande" (i pesi diventano numeri interi che sommano a n)
//  - poi ogni stile viene distribuito a passo regolare lungo lo slot, con
//    sondaggio in avanti sulle collisioni: risultato sempre completo e sparso.
function assignStyles(n, mix) {
  if (n === 0) return [];
  const total = mix.reduce((s, m) => s + m.weight, 0) || 1;
  const exact = mix.map((m) => (m.weight / total) * n);
  const counts = exact.map((e) => Math.floor(e));
  let sum = counts.reduce((a, b) => a + b, 0);
  // Distribuisco i posti rimasti agli stili con la frazione più alta.
  const byFrac = exact
    .map((e, i) => ({ i, frac: e - counts[i] }))
    .sort((a, b) => b.frac - a.frac);
  let k = 0;
  while (sum < n) {
    counts[byFrac[k % byFrac.length].i]++;
    sum++;
    k++;
  }

  // Piazzamento a passo regolare. Parto dagli stili più numerosi (spread migliore).
  const slots = new Array(n).fill(-1);
  const order = counts.map((c, i) => i).sort((a, b) => counts[b] - counts[a]);
  for (const si of order) {
    const c = counts[si];
    for (let j = 0; j < c; j++) {
      let pos = Math.floor(((j + 0.5) * n) / c);
      let tries = 0;
      while (slots[pos] !== -1 && tries < n) {
        pos = (pos + 1) % n;
        tries++;
      }
      slots[pos] = si;
    }
  }
  return slots.map((si) => mix[si].style);
}

// generateLevel: costruisce il LAYOUT di un livello dalle sue parole.
// Deterministico (niente casualità): riproducibile e testabile.
//
// PRINCIPIO: ogni piattaforma ha uno SCOPO. Niente piattaforme decorative.
//  - "lowPlat" / "tower": ospitano un NEMICO (motivo per salirci)
//  - "fireCross": un fuoco LUNGO (più largo di un salto) che OBBLIGA a usare
//    delle piattaforme per attraversarlo
//  - "floor": nemico a terra + un ostacolo corto (saltabile)
//
// Reachability garantita:
//  - nemico su LOW (cima 310, testa 270): stompabile da terra (apice piedi ~260)
//  - nemico su MID (cima 235, testa 195): stompabile da un gradino LOW
//  - nemici spinati: basta RAGGIUNGERLI (salire accanto) per spada/magia
//  - il pavimento è sempre sotto come via sicura
//
// enemyMix: array [{ style, weight }] — ogni nemico riceve uno stile dal mix.
// opts.vehicles: se true, i tratti di strada ('floor') ospitano un TUK-TUK mobile
//   (ostacolo da saltare) al posto del breve ostacolo fisso spine/fuoco (Livello 5).
// opts.coconuts / opts.stones: se true, aggiunge lungo il mondo dei "dropper" da cui
//   cadono oggetti dall'alto da evitare — NOCI DI COCCO dagli alberi (foresta, L6) o
//   PIETRE dal soffitto (castello, L7). Stesso principio, texture/visuale diverse.
// opts.lengthMult: allunga il livello ripetendo i moduli (2 = doppio, stessi vocaboli).
//   Le parole si ripetono nei nemici in più (ripasso); i vocaboli unici restano 12.
// Più parole in un livello = livello più lungo, automaticamente.
export function generateLevel(words, enemyMix = [{ style: { color: 'pink' }, weight: 1 }], opts = {}) {
  const floorHeight = 40;
  const floorTop = GAME_HEIGHT - floorHeight; // 410

  const LOW = 320; // cima 310
  const MID = 245; // cima 235

  const platforms = [];
  const enemies = [];
  const hazards = [];
  const vehicles = []; // tuk-tuk (ostacoli mobili)

  // Per allungare il livello ripeto la lista delle parole (i nemici in più sono
  // ripasso; i vocaboli UNICI restano quelli del livello). Ordine deterministico.
  const mult = Math.max(1, opts.lengthMult || 1);
  const layoutWords = [];
  for (let m = 0; m < mult; m++) layoutWords.push(...words);

  // Ogni nemico ha il SUO stile (dal mix). L'altezza dipende dallo stile.
  const styles = assignStyles(layoutWords.length, enemyMix);
  // opts.firstStyle: forza lo stile del PRIMO nemico (es. il primo della foresta
  // NON deve essere un viola corazzato, troppo difficile all'inizio). Faccio uno
  // SCAMBIO con un nemico più avanti che ha già quello stile, così i conteggi
  // totali del mix restano invariati (non "perdo" un viola per colpa del primo).
  if (opts.firstStyle && styles.length && styles[0] !== opts.firstStyle) {
    const swapIdx = styles.findIndex((st, i) => i > 0 && st === opts.firstStyle);
    if (swapIdx > 0) {
      styles[swapIdx] = styles[0];
      styles[0] = opts.firstStyle;
    } else {
      styles[0] = opts.firstStyle; // nessuno da scambiare: sovrascrivo
    }
  }

  const addEnemyFloor = (x, w, style, patrol = 40) => {
    const half = (style.size || 40) / 2;
    enemies.push({ x, y: floorTop - half, word: w.english, patrol, style });
  };
  const addEnemyPlat = (x, platY, w, style, patrol = 20) => {
    const half = (style.size || 40) / 2;
    enemies.push({ x, y: platY - 10 - half, word: w.english, patrol, style });
  };

  // Sequenza di "moduli" con uno scopo, alternati per varietà e ritmo.
  const seq = ['floor', 'lowPlat', 'tower', 'floor', 'fireCross', 'lowPlat'];

  let x = 260; // il primo modulo è lontano dallo spawn (x=100)

  layoutWords.forEach((w, i) => {
    const type = seq[i % seq.length];
    const style = styles[i];
    const spiked = !!style.spiked;

    if (type === 'floor') {
      addEnemyFloor(x, w, style);
      if (opts.vehicles) {
        // Un tuk-tuk sfreccia sul tratto DOPO il nemico: va saltato (fa danno).
        vehicles.push({ minX: x + 150, maxX: x + 330, y: floorTop - 26, speed: 135 });
        x += 420;
      } else {
        hazards.push({ x: x + 175, w: 80, type: i % 2 ? 'spikes' : 'fire' }); // corto, saltabile
        x += 340;
      }
    } else if (type === 'lowPlat') {
      platforms.push({ x, y: LOW, w: 150, h: 20 });
      addEnemyPlat(x, LOW, w, style);
      x += 330;
    } else if (type === 'tower') {
      platforms.push({ x: x - 85, y: LOW, w: 120, h: 20 }); // gradino per salire/stompare
      platforms.push({ x, y: MID, w: 130, h: 20 }); //          piattaforma alta col nemico
      addEnemyPlat(x, MID, w, style);
      x += 360;
    } else if (type === 'fireCross') {
      // Fuoco LUNGO (più largo di un salto ~250): serve saltare sulle piattaforme.
      const fireW = 280;
      hazards.push({ x: x + fireW / 2, w: fireW, type: 'fire' });
      platforms.push({ x: x + 75, y: LOW - 5, w: 90, h: 20, bridge: true }); // ponte 1
      platforms.push({ x: x + 190, y: LOW - 5, w: 90, h: 20, bridge: true }); // ponte 2
      if (spiked) {
        // Nemico su una piattaforma-ponte: lo colpisci mentre attraversi.
        addEnemyPlat(x + 190, LOW - 5, w, style, 10);
        x += fireW + 150;
      } else {
        // Nemico a terra DOPO il fuoco: lo stompi una volta attraversato.
        addEnemyFloor(x + fireW + 110, w, style);
        x += fireW + 220;
      }
    }
  });

  const worldWidth = x + 180;

  // DROPPER: da questi cade qualcosa dall'alto (ostacolo da evitare).
  // 'coconot' = dagli alberi (foresta); 'stone' = dal soffitto (castello).
  // Distribuiti a passo regolare; ognuno ha una "fase" diversa così non cadono
  // tutti insieme. spawnY = altezza da cui parte la caduta.
  const dropKind = opts.coconuts ? 'coconut' : opts.stones ? 'stone' : null;
  const droppers = [];
  if (dropKind) {
    // Gli oggetti NON devono cadere sopra un nemico: altrimenti, quando provi a
    // saltargli in testa, rischi di prendere una pietra/cocco. Sposto il dropper
    // in un punto "libero" (lontano da ogni nemico).
    const enemyXs = enemies.map((e) => e.x);
    const farFromEnemies = (x) => !enemyXs.some((ex) => Math.abs(ex - x) < 95);
    const PERIOD = 3800; // caduta più RADA di prima (cocchi + pietre)
    let d = 0;
    for (let dx = 440; dx < worldWidth - 260; dx += 480) {
      d++;
      let px = dx;
      let tries = 0;
      while (!farFromEnemies(px) && tries < 8) {
        px += 70;
        tries++;
      }
      // I cocchi partono dalla chioma (~70-114); le pietre dal soffitto (~52-72).
      const spawnY = dropKind === 'coconut' ? 70 + (d % 3) * 22 : 52 + (d % 3) * 10;
      droppers.push({ x: px, spawnY, kind: dropKind, period: PERIOD, phase: (d * 620) % PERIOD });
    }
  }

  return { worldWidth, floorHeight, platforms, enemies, hazards, vehicles, droppers };
}
