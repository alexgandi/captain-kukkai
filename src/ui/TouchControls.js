import Phaser from 'phaser';

// TouchControls: pulsanti a schermo per giocare su TABLET/TELEFONO (niente tastiera).
// Compare SOLO su dispositivi touch; su desktop non disegna nulla.
//
// Non "preme" tasti veri: scrive dei FLAG booleani in scene.touchState
// ({ left, right, jump, sword, magic, shield, up, down, fire }) e sono le scene
// (Player, AttackManager, scudo, SpaceScene) a leggerli insieme alla tastiera.
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

    if (!TouchControls.isTouchDevice()) return;
    scene.input.addPointer(3); // fino a 4 dita insieme (muovi + salta + attacca)

    const H = scene.scale.height;
    const W = scene.scale.width;

    if (layout === 'platform') {
      // Sinistra: frecce di movimento. Destra: salto + armi sbloccate.
      this.addButton(56, H - 56, 34, '◀', 'left');
      this.addButton(140, H - 56, 34, '▶', 'right');
      this.addButton(W - 56, H - 56, 36, '⬆', 'jump', 0x2f6fed);
      const level = opts.level || 1;
      if (level >= 2) this.addButton(W - 140, H - 48, 26, '⚔️', 'sword', 0xb0392e);
      if (level >= 3) this.addButton(W - 190, H - 104, 26, '✨', 'magic', 0x8e44c8);
      if (level >= 4) this.addButton(W - 92, H - 128, 26, '🛡️', 'shield', 0x16a085);
    } else {
      // Spazio: pad a rombo (4 direzioni) a sinistra + fuoco a destra.
      this.addButton(96, H - 56, 30, '◀', 'left');
      this.addButton(176, H - 56, 30, '▶', 'right');
      this.addButton(136, H - 112, 30, '⬆', 'up');
      this.addButton(136, H - 30, 26, '⬇', 'down');
      this.addButton(W - 64, H - 64, 38, '💥', 'fire', 0xb0392e);
    }
  }

  // Un pulsante rotondo semi-trasparente: premuto = flag true, rilasciato = false.
  addButton(x, y, r, label, flag, color = 0x1a1a2e) {
    const scene = this.scene;
    const c = scene.add.container(x, y).setScrollFactor(0).setDepth(2500);
    const bg = scene.add.circle(0, 0, r, color, 0.38);
    bg.setStrokeStyle(2, 0xffffff, 0.55);
    const txt = scene.add
      .text(0, 0, label, { fontSize: `${Math.round(r * 0.95)}px` })
      .setOrigin(0.5)
      .setAlpha(0.95);
    c.add([bg, txt]);

    // Area di tocco un po' PIÙ GRANDE del disegno: dita piccole ma imprecise.
    c.setSize(r * 2.6, r * 2.6);
    c.setInteractive(new Phaser.Geom.Circle(0, 0, r * 1.3), Phaser.Geom.Circle.Contains);

    const press = () => {
      this.state[flag] = true;
      bg.setAlpha(0.75);
    };
    const release = () => {
      this.state[flag] = false;
      bg.setAlpha(0.38);
    };
    c.on('pointerdown', press);
    c.on('pointerup', release);
    c.on('pointerout', release); // il dito scivola via dal pulsante = rilascio
  }
}
