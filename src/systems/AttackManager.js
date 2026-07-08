import Phaser from 'phaser';
import { TEXTURES, COLORS } from '../config.js';
import { playFx } from './playFx.js';

// AttackManager: possiede la lista degli attacchi SBLOCCATI (in base al livello)
// e ne gestisce input, effetto e rilevamento colpo.
//
// Progressione (dal prompt):
//   Livello 1: solo salto in testa (gestito dagli overlap in GameScene)
//   Livello 2+: SPADA (mischia, tasto J)
//   Livello 3+: MAGIC BLAST (proiettile a forma di stella, tasto K)
//
// Ogni attacco è un piccolo modulo isolato (swing / castMagic): aggiungerne di
// nuovi è semplice. Quando un attacco colpisce un nemico chiama onHitEnemy(nemico),
// che in GameScene fa esattamente ciò che fa lo stomp (pop + parola + voce).
export default class AttackManager {
  constructor(scene, player, opts = {}) {
    this.scene = scene;
    this.player = player;
    this.enemies = opts.enemies || [];
    this.onHitEnemy = opts.onHitEnemy || (() => {});
    this.level = opts.level || 1;
    this.sfx = scene.registry.get('sfx'); // effetti sonori

    // Sblocchi in base al livello.
    this.hasSword = this.level >= 2;
    this.hasMagic = this.level >= 3;

    // Tasti dedicati.
    this.keySword = scene.input.keyboard.addKey('J');
    this.keyMagic = scene.input.keyboard.addKey('K');

    // Cooldown (ms) per non spammare.
    this.swordCd = 0;
    this.magicCd = 0;

    // Stato dello swing della spada.
    this.swingTimer = 0;
    this.slashSprite = null;
    this.hitThisSwing = new Set(); // un nemico per swing lo colpisci una volta sola

    // Proiettili magici attivi.
    this.projectiles = [];
  }

  // Direzione in cui guarda Captain: 1 = destra, -1 = sinistra.
  facing() {
    return this.player.flipX ? -1 : 1;
  }

  update(delta) {
    this.swordCd -= delta;
    this.magicCd -= delta;

    // Anche i pulsanti touch attaccano: rilevo il "fronte di salita" del flag
    // (premuto ORA ma non al frame prima), come JustDown per la tastiera.
    const touch = this.scene.touchState || {};
    const swordTouch = touch.sword && !this.prevTouchSword;
    const magicTouch = touch.magic && !this.prevTouchMagic;
    this.prevTouchSword = !!touch.sword;
    this.prevTouchMagic = !!touch.magic;

    if (this.hasSword && this.swordCd <= 0 && (Phaser.Input.Keyboard.JustDown(this.keySword) || swordTouch)) {
      this.swing();
    }
    if (this.hasMagic && this.magicCd <= 0 && (Phaser.Input.Keyboard.JustDown(this.keyMagic) || magicTouch)) {
      this.castMagic();
    }

    if (this.swingTimer > 0) {
      this.swingTimer -= delta;
      this.updateSwing();
      if (this.swingTimer <= 0) this.endSwing();
    }

    this.updateProjectiles(delta);
  }

  // ---------------- SPADA (mischia) ----------------
  swing() {
    this.swordCd = 350;
    this.swingTimer = 180;
    this.hitThisSwing.clear();
    playFx(this.scene, 'sfx_swordfx', 0.5, () => this.sfx && this.sfx.sword()); // swish vero

    const dir = this.facing();
    this.slashSprite = this.scene.add
      .image(this.player.x + dir * 36, this.player.y, TEXTURES.slash)
      .setDepth(50)
      .setFlipX(dir < 0);
    // Effetto: si allarga e svanisce.
    this.scene.tweens.add({
      targets: this.slashSprite,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 180,
      ease: 'Sine.easeOut',
    });
  }

  updateSwing() {
    const dir = this.facing();
    // Il fendente segue Captain mentre dura lo swing.
    if (this.slashSprite) {
      this.slashSprite.x = this.player.x + dir * 36;
      this.slashSprite.y = this.player.y;
      this.slashSprite.setFlipX(dir < 0);
    }
    // Zona di colpo davanti a Captain.
    const hb = new Phaser.Geom.Rectangle(
      dir > 0 ? this.player.x + 8 : this.player.x - 62,
      this.player.y - 32,
      54,
      64
    );
    this.hitEnemiesIn(hb);
  }

  endSwing() {
    if (this.slashSprite) {
      this.slashSprite.destroy();
      this.slashSprite = null;
    }
  }

  // Colpisce i nemici la cui area interseca il rettangolo dato (una volta per swing).
  hitEnemiesIn(rect) {
    this.enemies.forEach((enemy) => {
      if (!enemy.active || enemy.isDefeated || this.hitThisSwing.has(enemy)) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, enemy.getBounds())) {
        this.hitThisSwing.add(enemy);
        this.onHitEnemy(enemy);
      }
    });
  }

  // ---------------- MAGIC BLAST (proiettile stella) ----------------
  castMagic() {
    this.magicCd = 500;
    playFx(this.scene, 'sfx_magicfx', 0.5, () => this.sfx && this.sfx.magic()); // scintillìo vero
    const dir = this.facing();

    // Una stella luminosa (NON un'arma realistica): tema magico, adatto ai bambini.
    const star = this.scene.add
      .star(this.player.x + dir * 22, this.player.y - 6, 5, 6, 13, COLORS.popStar)
      .setDepth(50);
    const glow = this.scene.add
      .star(star.x, star.y, 5, 9, 19, 0xfff3a0)
      .setDepth(49)
      .setAlpha(0.4);
    // Rotazione continua: sembra "carica".
    this.scene.tweens.add({ targets: [star, glow], angle: 360, duration: 500, repeat: -1 });

    this.projectiles.push({ star, glow, dir, life: 1400 });
  }

  updateProjectiles(delta) {
    const speed = 430;
    const worldW = this.scene.physics.world.bounds.width;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.star.x += p.dir * speed * (delta / 1000);
      p.glow.x = p.star.x;
      p.glow.y = p.star.y;
      p.life -= delta;

      // Colpisce il primo nemico incontrato.
      let hit = false;
      const bounds = p.star.getBounds();
      for (const enemy of this.enemies) {
        if (!enemy.active || enemy.isDefeated) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, enemy.getBounds())) {
          this.onHitEnemy(enemy);
          hit = true;
          break;
        }
      }

      // Sparisce se colpisce, se scade il tempo o se esce dal mondo.
      if (hit || p.life <= 0 || p.star.x < 0 || p.star.x > worldW) {
        p.star.destroy();
        p.glow.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }
}
