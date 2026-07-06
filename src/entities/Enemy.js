import Phaser from 'phaser';
import { COLORS } from '../config.js';

// Enemy = nemico carino, ora come SPRITE con texture (occhi e sorriso sono
// "cotti" nell'immagine, quindi seguono il nemico quando si muoverà, Step 8).
// STEP 6: aggiunta una piccola animazione "idle" (respiro) e resta lo stomp+pop.
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  // opts: { color: 'pink'|'yellow'|'red', spiked: bool, hits: numero di colpi per batterlo }
  constructor(scene, x, y, opts = {}) {
    const color = opts.color || 'pink';
    const spiked = opts.spiked || false;
    const armored = opts.armored || false;
    const archer = opts.archer || false;
    // La chiave texture codifica colore + tipo (es. 'enemy_purple_armored').
    let suffix = '';
    if (spiked) suffix = '_spiked';
    else if (armored) suffix = '_armored';
    else if (archer) suffix = '_archer';
    const textureKey = `enemy_${color}${suffix}`;
    super(scene, x, y, textureKey);

    this.isDefeated = false;
    // spiked = casco di spine in testa: NON saltabile (serve spada/magia).
    this.spiked = spiked;
    // armored = spine ai lati: immune a spada/magia, si batte SOLO saltandolo in testa.
    this.armored = armored;
    // castsMagic = lancia magie contro il player (gestito da GameScene).
    this.castsMagic = opts.castsMagic || false;
    if (this.castsMagic) this.castTimer = 1000 + Math.random() * 1500;
    // archer = scocca frecce ad arco balistico (gestito da GameScene).
    this.archer = archer;
    if (this.archer) this.arrowTimer = 1200 + Math.random() * 1500;
    // Vita: quanti colpi servono per sconfiggerlo (1 per default; 3 per i "boss" rossi).
    this.maxHealth = opts.hits || 1;
    this.health = this.maxHealth;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false); // resta sospeso dov'è (nemico fermo)
    this.body.setImmovable(true);     // Captain non lo spinge via

    // Animazione "idle": un respiro lento. È solo visiva (scala), non tocca la fisica.
    this.idleTween = scene.tweens.add({
      targets: this,
      scaleY: 1.08,
      scaleX: 0.96,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pattuglia: di default il nemico è fermo (compatibile con prima).
    this.isPatrolling = false;
  }

  // Attiva il pattugliamento tra minX e maxX a una certa velocità.
  // Il nemico cammina e si gira ai bordi. La gravità resta spenta:
  // muoviamo solo in orizzontale, così non cade dalle piattaforme.
  setPatrol(minX, maxX, speed) {
    this.patrolMin = minX;
    this.patrolMax = maxX;
    this.patrolSpeed = speed;
    this.patrolDir = 1; // 1 = verso destra, -1 = verso sinistra
    this.isPatrolling = true;
    this.body.setVelocityX(speed);
  }

  // Chiamata ogni frame dalla scena: inverte la direzione ai bordi del tratto.
  patrol() {
    if (!this.isPatrolling || this.isDefeated) return;

    if (this.patrolDir === 1 && this.x >= this.patrolMax) {
      this.patrolDir = -1;
      this.body.setVelocityX(-this.patrolSpeed);
    } else if (this.patrolDir === -1 && this.x <= this.patrolMin) {
      this.patrolDir = 1;
      this.body.setVelocityX(this.patrolSpeed);
    }

    // Guarda nella direzione di marcia (utile quando avremo nemici direzionali).
    this.setFlipX(this.patrolDir === -1);
  }

  // Flash bianco quando viene colpito ma NON ucciso (feedback per i nemici a più vite).
  flashHurt() {
    if (!this.active) return;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => {
      if (this.active) this.clearTint();
    });
  }

  // Sconfitta: il nemico "pop"pa in stelline e sparisce.
  defeat() {
    if (this.isDefeated) return;
    this.isDefeated = true;
    this.body.enable = false;

    const scene = this.scene;
    const { x, y } = this;

    scene.tweens.killTweensOf(this); // ferma il respiro
    this.destroy();

    this.spawnPop(scene, x, y);
  }

  // Effetto "pop": una manciata di stelline che schizzano fuori e svaniscono.
  spawnPop(scene, x, y) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const star = scene.add.star(x, y, 5, 4, 9, COLORS.popStar);
      const angle = ((Math.PI * 2) / count) * i;
      scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * 55,
        y: y + Math.sin(angle) * 55,
        alpha: 0,
        scale: 0,
        duration: 420,
        ease: 'Cubic.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }
}
