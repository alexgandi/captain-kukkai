import Phaser from 'phaser';
import { SAFE } from '../config.js';

// TouchControls: pulsanti a schermo per giocare su TABLET/TELEFONO (niente tastiera).
// Compare SOLO su dispositivi touch; su desktop non disegna nulla.
//
// COME FUNZIONA (importante!): NON usa gli eventi pointerdown/pointerout dei
// singoli pulsanti — su un telefono vero il pollice SCIVOLA di continuo e gli
// eventi "out" rilasciano il pulsante mentre il bambino sta ancora premendo.
// Invece fa POLLING A ZONE: a ogni frame guarda DOVE SONO le dita appoggiate
// e accende i flag dei pulsanti che le contengono. Così:
//  - tenere premuto funziona anche se il dito balla o esce di qualche pixel
//  - si può SCIVOLARE da ◀ a ▶ senza staccare il dito (come un vero D-pad)
//  - più dita insieme (muovi + salta + attacca) senza conflitti di eventi
//
// Scrive dei FLAG booleani in scene.touchState ({ left, right, jump, sword,
// magic, shield, up, down, fire }) letti da Player/AttackManager/scudo/SpaceScene.
export default class TouchControls {
  // È un dispositivo touch? (window.__forceTouch = true per provarli col mouse)
  static isTouchDevice() {
    return (
      (typeof window !== 'undefined' &&
        (window.__forceTouch || 'ontouchstart' in window || navigator.maxTouchPoints > 0)) ||
      false
    );
  }

  // layout: 'platform' (Game) | 'space' (SpaceScene). opts.level abilita i pulsanti arma.
  constructor(scene, layout = 'platform', opts = {}) {
    this.scene = scene;
    // Lo stato esiste SEMPRE (anche su desktop: resta tutto false).
    this.state = scene.touchState = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      sword: false,
      magic: false,
      shield: false,
      fire: false,
    };
    this.buttons = [];

    if (!TouchControls.isTouchDevice()) return;
    scene.input.addPointer(3); // fino a 4 dita insieme

    const H = scene.scale.height;
    const W = scene.scale.width;
    // Margini safe-area: sui telefoni col notch i pulsanti si staccano dal bordo
    // "occupato" (SL a sinistra, SR a destra), così restano sempre toccabili.
    const SL = SAFE.left;
    const SR = SAFE.right;

    // Pulsanti GRANDI e staccati dai bordi (in basso ci sono la barra-gesti di
    // iOS e gli angoli arrotondati dei telefoni: lì i tocchi si perdono).
    if (layout === 'platform') {
      this.addButton(SL + 66, H - 70, 38, '◀', 'left');
      this.addButton(SL + 168, H - 70, 38, '▶', 'right');
      this.addButton(W - SR - 66, H - 70, 42, '⬆', 'jump', 0x2f6fed);
      const level = opts.level || 1;
      if (level >= 2) this.addButton(W - SR - 170, H - 58, 30, '⚔️', 'sword', 0xb0392e);
      if (level >= 3) this.addButton(W - SR - 188, H - 138, 28, '✨', 'magic', 0x8e44c8);
      if (level >= 4) this.addButton(W - SR - 78, H - 168, 28, '🛡️', 'shield', 0x16a085);
    } else {
      // Spazio: pad a rombo (4 direzioni) a sinistra + fuoco a destra.
      this.addButton(SL + 58, H - 110, 36, '◀', 'left');
      this.addButton(SL + 180, H - 110, 36, '▶', 'right');
      this.addButton(SL + 119, H - 172, 36, '⬆', 'up');
      this.addButton(SL + 119, H - 52, 32, '⬇', 'down');
      this.addButton(W - SR - 70, H - 78, 44, '💥', 'fire', 0xb0392e);
    }

    // Il POLLING gira a ogni frame della scena (prima dell'update del gioco).
    this.updateHandler = () => this.poll(scene.input.manager.pointers);
    scene.events.on('update', this.updateHandler);
    scene.events.once('shutdown', () => scene.events.off('update', this.updateHandler));
  }

  // Disegna un pulsante rotondo semi-trasparente e registra la sua ZONA di tocco.
  addButton(x, y, r, label, flag, color = 0x1a1a2e) {
    const scene = this.scene;
    const c = scene.add.container(x, y).setScrollFactor(0).setDepth(2500);
    const bg = scene.add.circle(0, 0, r, color, 0.38);
    bg.setStrokeStyle(2, 0xffffff, 0.55);
    const txt = scene.add
      .text(0, 0, label, { fontSize: `${Math.round(r * 0.9)}px` })
      .setOrigin(0.5)
      .setAlpha(0.95);
    c.add([bg, txt]);

    // Zona di tocco più GRANDE del disegno (dita piccole ma imprecise).
    this.buttons.push({ x, y, r, hitR: r * 1.5, flag, bg, active: false });
  }

  // Ogni frame: quali pulsanti hanno un dito sopra? Un dito attiva il pulsante
  // PIÙ VICINO tra quelli che lo contengono (mai due insieme per sbaglio).
  poll(pointers) {
    this.buttons.forEach((b) => (b.active = false));

    for (const p of pointers) {
      if (!p || !p.isDown) continue;
      let best = null;
      let bestD = Infinity;
      for (const b of this.buttons) {
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d <= b.hitR && d < bestD) {
          best = b;
          bestD = d;
        }
      }
      if (best) best.active = true;
    }

    this.buttons.forEach((b) => {
      this.state[b.flag] = b.active;
      b.bg.setAlpha(b.active ? 0.8 : 0.38);
    });
  }
}
