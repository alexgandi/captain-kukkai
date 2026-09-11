import Phaser from 'phaser';

// UiKit: il "linguaggio visivo" condiviso dei pulsanti e delle celebrazioni.
// Un solo posto per l'aspetto premium: ombra morbida, corpo con bordo "3D",
// riflesso lucido in alto, animazione di pressione. Le scene lo usano al posto
// dei rettangoli piatti, così tutto il gioco parla lo stesso design.

// Scurisce/schiarisce un colore esadecimale (amount -1..1).
function shade(color, amount) {
  const c = Phaser.Display.Color.ValueToColor(color);
  const f = (v) => Phaser.Math.Clamp(Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount)), 0, 255);
  return Phaser.Display.Color.GetColor(f(c.red), f(c.green), f(c.blue));
}

// PULSANTE del gioco: container interattivo con look "caramella".
// opts: { label, icon, color, fontSize, thaiLabel, onClick, depth, pulse }
export function makeButton(scene, x, y, w, h, opts = {}) {
  const {
    label = '',
    icon = '',
    color = 0x3fa34d,
    fontSize = Math.round(h * 0.42),
    onClick = null,
    depth = 10,
    pulse = false,
  } = opts;

  const r = Math.min(16, h / 2 - 2);
  const btn = scene.add.container(x, y).setDepth(depth);
  const g = scene.add.graphics();
  // Ombra a terra (morbida, staccata).
  g.fillStyle(0x000000, 0.22);
  g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, r);
  // Bordo inferiore "3D" (stesso colore, più scuro).
  g.fillStyle(shade(color, -0.38), 1);
  g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, r);
  // Corpo.
  g.fillStyle(color, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h - 3, r);
  // Riflesso lucido sulla metà alta.
  g.fillStyle(0xffffff, 0.18);
  g.fillRoundedRect(-w / 2 + 3, -h / 2 + 2, w - 6, h * 0.42, { tl: r, tr: r, bl: 6, br: 6 });
  // Contorno bianco netto (leggibile su ogni sfondo).
  g.lineStyle(3, 0xffffff, 0.95);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h - 3, r);
  btn.add(g);

  const text = `${icon ? icon + '  ' : ''}${label}`;
  const labelObj = scene.add
    .text(0, -1, text, { fontFamily: 'sans-serif', fontSize: `${fontSize}px`, color: '#ffffff', fontStyle: 'bold' })
    .setOrigin(0.5)
    .setShadow(0, 2, 'rgba(0,0,0,0.35)', 2);
  btn.add(labelObj);
  btn.labelObj = labelObj; // per chi vuole cambiare testo dopo (es. "Copied! ✓")

  btn.setSize(w, h);
  btn.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  btn.input.cursor = 'pointer';

  // Pressione: si schiaccia e rimbalza (feedback immediato per le dita piccole).
  btn.on('pointerdown', () => {
    scene.tweens.add({ targets: btn, scale: 0.93, duration: 70, yoyo: true, ease: 'Sine.easeOut' });
    const sfx = scene.registry.get('sfx');
    if (sfx) sfx.click();
    if (onClick) onClick();
  });

  if (pulse) {
    scene.tweens.add({ targets: btn, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return btn;
}

// PANNELLO "caramella": la card bianca+oro del gioco, in UN solo posto (prima
// era ridisegnata a mano in 6+ scene con raggi e bordi tutti diversi). Ombra a
// terra morbida, corpo crema con base più calda, riflesso lucido in alto,
// bordo oro. Ritorna un Graphics: va messo in un container (origine al centro,
// oppure originX/originY per ancorarlo a un angolo).
// opts: { radius, border, borderWidth, top, bottom, shadow, gloss, originX, originY }
export function makePanel(scene, w, h, opts = {}) {
  const {
    radius = 16,
    border = 0xffd166,
    borderWidth = 3,
    top = 0xfffdf6,
    bottom = 0xfff3d9,
    shadow = true,
    gloss = true,
    originX = 0.5,
    originY = 0.5,
  } = opts;
  const x0 = -w * originX;
  const y0 = -h * originY;
  const r = Math.min(radius, h / 2 - 1, w / 2 - 1);
  const g = scene.add.graphics();
  if (shadow) {
    g.fillStyle(0x000000, 0.16);
    g.fillRoundedRect(x0 + 2, y0 + 5, w, h, r);
  }
  // Corpo: crema chiaro sopra, base più calda sotto (due toni: il gradiente
  // vero non è disponibile sui path arrotondati).
  g.fillStyle(top, 1);
  g.fillRoundedRect(x0, y0, w, h, r);
  g.fillStyle(bottom, 1);
  g.fillRoundedRect(x0, y0 + h * 0.55, w, h * 0.45, { tl: 0, tr: 0, bl: r, br: r });
  if (gloss) {
    g.fillStyle(0xffffff, 0.45);
    g.fillRoundedRect(x0 + 4, y0 + 3, w - 8, Math.max(8, h * 0.26), { tl: Math.max(2, r - 3), tr: Math.max(2, r - 3), bl: 4, br: 4 });
  }
  g.lineStyle(borderWidth, border, 1);
  g.strokeRoundedRect(x0, y0, w, h, r);
  return g;
}

// PULSANTE ROTONDO con emoji ("icona"), stessa ricetta caramella dei pulsanti:
// ombra, bordo inferiore 3D, corpo colorato, riflesso, contorno bianco. Area di
// tocco sempre >= 44 px (dita piccole), squash alla pressione + click.
// opts: { icon, color, onClick, depth, scrollFactor, fontSize }
export function makeIconButton(scene, x, y, radius, opts = {}) {
  const { icon = '⭐', color = 0x3fa34d, onClick = null, depth = 20, scrollFactor = null, fontSize = Math.round(radius * 1.15) } = opts;
  const btn = scene.add.container(x, y).setDepth(depth);
  if (scrollFactor !== null) btn.setScrollFactor(scrollFactor);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.22);
  g.fillCircle(2, 5, radius); // ombra a terra
  g.fillStyle(shade(color, -0.38), 1);
  g.fillCircle(0, 3, radius); // bordo inferiore "3D"
  g.fillStyle(color, 1);
  g.fillCircle(0, 0, radius); // corpo
  g.fillStyle(0xffffff, 0.22);
  g.fillEllipse(0, -radius * 0.38, radius * 1.3, radius * 0.7); // riflesso
  g.lineStyle(3, 0xffffff, 0.95);
  g.strokeCircle(0, 0, radius); // contorno bianco
  btn.add(g);
  const label = scene.add.text(0, -1, icon, { fontSize: `${fontSize}px` }).setOrigin(0.5);
  btn.add(label);
  btn.labelObj = label;

  const hit = Math.max(22, radius + 4);
  btn.setSize(hit * 2, hit * 2);
  btn.setInteractive(new Phaser.Geom.Circle(0, 0, hit), Phaser.Geom.Circle.Contains);
  btn.input.cursor = 'pointer';
  btn.on('pointerdown', () => {
    scene.tweens.add({ targets: btn, scale: 0.9, duration: 70, yoyo: true, ease: 'Sine.easeOut' });
    const sfx = scene.registry.get('sfx');
    if (sfx) sfx.click();
    if (onClick) onClick();
  });
  return btn;
}

// ESPLOSIONE DI STELLINE: la celebrazione standard (raccolte, risposte giuste...).
// Piccola, senza particle manager: n stelle che schizzano e svaniscono.
export function burstStars(scene, x, y, opts = {}) {
  const { count = 10, colors = [0xffe14d, 0xffd166, 0xfff3b0], depth = 3000, scrollFactor = 1 } = opts;
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 34 + Math.random() * 40;
    const star = scene.add
      .star(x, y, 5, 3, 7, colors[i % colors.length])
      .setDepth(depth)
      .setScrollFactor(scrollFactor);
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist - 14,
      angle: 200,
      alpha: 0,
      scale: 0.4,
      duration: 480 + Math.random() * 240,
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}

// VIBRAZIONE (Android): un colpetto tattile nei momenti giusti. Su iOS non
// esiste navigator.vibrate: semplicemente non fa nulla. Mai più di ~40ms.
export function buzz(ms = 25) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {
    // niente vibrazione: pazienza
  }
}
