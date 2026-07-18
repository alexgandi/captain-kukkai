import Phaser from 'phaser';
import { PLAYER, TEXTURES } from '../config.js';
import { buzz } from '../systems/UiKit.js';

// Player = Captain (sprite con texture identificata da una chiave).
// Movimento/salto con "feel" (coyote time, jump buffer, altezza variabile),
// animazioni procedurali (squash/stretch, waddle) e gestione del "danno" da ostacoli.
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    // ARTE HD: se c'è la versione 4x del Captain (160x240) la usiamo a scala
    // 0.25 — stessa dimensione in gioco (40x60), ma nitida con lo zoom della
    // camera. baseScale moltiplica TUTTE le animazioni di scala qui sotto.
    const hasHd = scene.textures.exists('art_captain_hd');
    super(scene, x, y, hasHd ? 'art_captain_hd' : TEXTURES.captain);
    this.hasArt = hasHd;
    this.baseScale = hasHd ? 0.25 : 1;
    this.setScale(this.baseScale);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);

    // --- Tasti: frecce + WASD, SPAZIO per saltare ---
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Stato per il feel del salto.
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wasJumpDown = false;

    // Stato per le animazioni.
    this.wasOnFloor = false;
    this.prevFallSpeed = 0;

    // Stato per il "danno" (ostacoli e nemici).
    this.isHurt = false;         // true = invulnerabile (sta lampeggiando)
    this.knockbackTimer = 0;     // ms in cui il controllo orizzontale è sospeso
    this.lastSafe = { x, y };    // ultimo punto a terra sicuro (per il respawn)

    // Vite.
    this.maxLives = PLAYER.maxLives;
    this.lives = this.maxLives;

    // Effetti sonori condivisi (dal registry).
    this.sfx = scene.registry.get('sfx');
  }

  update(delta) {
    const body = this.body;
    const onFloor = body.blocked.down;

    // Memorizzo l'ultimo punto a terra sicuro (serve al respawn dopo un ostacolo).
    if (onFloor && !this.isHurt) {
      this.lastSafe = { x: this.x, y: this.y };
    }

    // ---------- MOVIMENTO ORIZZONTALE ----------
    // Durante il contraccolpo (dopo un colpo) sospendo il controllo, così la
    // spinta si sente; per il resto il controllo è normale.
    // Il touch (tablet) scrive dei flag in scene.touchState: li leggo insieme ai tasti.
    const touch = this.scene.touchState || {};
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= delta;
    } else {
      const left = this.cursors.left.isDown || this.keys.left.isDown || touch.left;
      const right = this.cursors.right.isDown || this.keys.right.isDown || touch.right;
      if (left && !right) body.setVelocityX(-PLAYER.speed);
      else if (right && !left) body.setVelocityX(PLAYER.speed);
      else body.setVelocityX(0);
    }

    // ---------- SALTO (coyote time + jump buffer + altezza variabile) ----------
    const jumpDown =
      this.cursors.up.isDown || this.keys.up.isDown || this.keys.jump.isDown || !!touch.jump;
    const jumpJustReleased = !jumpDown && this.wasJumpDown;

    if (onFloor) this.coyoteTimer = PLAYER.coyoteMs;
    else this.coyoteTimer -= delta;

    if (jumpDown && !this.wasJumpDown) this.jumpBufferTimer = PLAYER.jumpBufferMs;
    else this.jumpBufferTimer -= delta;

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      body.setVelocityY(PLAYER.jumpVelocity);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.stretchJump();
      if (this.sfx) this.sfx.jump();
    }

    if (jumpJustReleased && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * PLAYER.jumpCutMultiplier);
    }

    this.updateAnimation(onFloor);

    // POLVERE sotto i piedi mentre corre (piccolo tocco di vita).
    this.dustTimer = (this.dustTimer || 0) - delta;
    if (onFloor && Math.abs(body.velocity.x) > 60 && this.dustTimer <= 0) {
      this.dustTimer = 170;
      this.spawnDust(1);
    }

    // SBATTE LE PALPEBRE da fermo, ogni tanto: il personaggio "è vivo".
    // (Solo coi fotogrammi disegnati: l'arte HD non ha il frame occhi-chiusi.)
    const standing = onFloor && Math.abs(body.velocity.x) < 5;
    this.blinkTimer = (this.blinkTimer ?? 1800) - delta;
    if (this.blinkTimer <= 0 && standing && !this.isHurt && !this.hasArt) {
      this.blinkTimer = 2400 + Math.random() * 2200;
      this.setTexture('captain_blink');
      this.scene.time.delayedCall(140, () => {
        if (this.active && this.texture.key === 'captain_blink') this.setTexture('captain');
      });
    }

    // RESPIRO da fermo + DONDOLIO nel passo (solo visivi; niente durante i
    // tween di squash/stretch, che hanno la precedenza).
    const bs = this.baseScale;
    this.animT = (this.animT || 0) + delta;
    if (!this.isHurt && !this.scene.tweens.isTweening(this)) {
      if (standing) {
        const s = Math.sin(this.animT / 320);
        this.setScale(bs * (1 - s * 0.012), bs * (1 + s * 0.02));
        this.setAngle(0);
      } else if (onFloor) {
        this.setScale(bs, bs);
        this.setAngle(Math.sin(this.animT / 90) * 3); // waddle da cartone
      } else {
        this.setAngle(0);
      }
    }

    this.prevFallSpeed = body.velocity.y;
    this.wasJumpDown = jumpDown;
  }

  // Sbuffi di polvere ai piedi: cerchietti chiari che salgono e svaniscono.
  spawnDust(count) {
    for (let i = 0; i < count; i++) {
      const dir = Math.sign(this.body.velocity.x) || 1;
      const puff = this.scene.add
        .circle(this.x - dir * 8 + (Math.random() * 12 - 6), this.y + 26, 3 + Math.random() * 2, 0xe8e0d0, 0.4)
        .setDepth(4);
      this.scene.tweens.add({
        targets: puff,
        y: puff.y - 9,
        x: puff.x - dir * 8,
        alpha: 0,
        scale: 1.7,
        duration: 340,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  }

  updateAnimation(onFloor) {
    const vx = this.body.velocity.x;

    // Guarda nella direzione in cui si muove.
    if (vx < -5) this.setFlipX(true);
    else if (vx > 5) this.setFlipX(false);

    // Durante il "danno" salto le altre animazioni (lampeggìo gestito a parte).
    if (this.isHurt) {
      this.wasOnFloor = onFloor;
      return;
    }

    // Squash SOLO dopo una caduta vera (evita il tremolìo sui micro-riappoggi).
    if (onFloor && !this.wasOnFloor && this.prevFallSpeed > 150) this.squashLand();

    // Cammina a terra -> animazione delle gambe; altrimenti posa ferma.
    // Con l'arte HD niente scambio di fotogrammi (unica immagine): il movimento
    // lo raccontano già waddle, squash e polvere.
    const moving = onFloor && Math.abs(vx) > 5;
    if (this.hasArt) {
      // nessun frame-swap
    } else if (moving) {
      this.play('captain_walk', true); // 'true' = non ripartire se già in corso
    } else {
      this.stop();
      // Non sovrascrivere il fotogramma 'blink' (dura solo 140ms).
      if (this.texture.key !== 'captain' && this.texture.key !== 'captain_blink') this.setTexture('captain');
    }

    this.wasOnFloor = onFloor;
  }

  // SALTELLO DI GIOIA: quando Captain impara una parola festeggia — hop verso
  // l'alto + stretch. Piccolo rinforzo emotivo del momento educativo.
  celebrate() {
    if (this.isHurt) return;
    if (this.body.blocked.down) this.body.setVelocityY(-190);
    const bs = this.baseScale;
    this.scene.tweens.killTweensOf(this);
    this.setScale(bs * 0.85, bs * 1.18);
    this.scene.tweens.add({ targets: this, scaleX: bs, scaleY: bs, duration: 260, ease: 'Back.easeOut' });
  }

  // --- "Danno": Captain perde un cuore, lampeggia di rosso ed è invulnerabile ~1,5s. ---
  // opts.respawn = true  -> torna all'ultimo punto sicuro (ostacoli: spine/fuoco)
  // opts.fromX  = numero -> contraccolpo lontano da lì (nemici)
  // Emette 'damaged' (con le vite rimaste) e 'died' (a 0 vite): la scena reagisce.
  takeDamage(opts = {}) {
    if (this.isHurt) return; // già invulnerabile: colpo ignorato
    this.isHurt = true;

    this.lives = Math.max(0, this.lives - 1);
    this.emit('damaged', this.lives);
    if (this.sfx) this.sfx.hurt();
    buzz(60); // colpo ricevuto: vibrazione netta (solo Android)

    // Azzero eventuali animazioni in corso.
    if (!this.hasArt) {
      this.stop();
      this.setTexture('captain');
    }
    this.scene.tweens.killTweensOf(this);
    this.setScale(this.baseScale, this.baseScale);
    this.setAngle(0); // niente dondolio residuo mentre lampeggia

    if (opts.respawn) {
      // Ostacolo: rimetto Captain sull'ultimo terreno sicuro.
      this.body.reset(this.lastSafe.x, this.lastSafe.y);
    } else {
      // Nemico: contraccolpo lontano dal nemico + verso l'alto.
      const dir = this.x < (opts.fromX ?? this.x) ? -1 : 1;
      this.body.setVelocity(dir * 200, -280);
      this.knockbackTimer = 220;
    }

    // Lampeggìo rosso = feedback + invulnerabilità temporanea.
    this.setTint(0xff5555);
    const blinkHalf = 125;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: blinkHalf,
      yoyo: true,
      repeat: Math.round(PLAYER.invulnMs / (blinkHalf * 2)) - 1,
      onComplete: () => {
        this.clearTint();
        this.setAlpha(1);
        this.isHurt = false;
      },
    });

    if (this.lives <= 0) this.emit('died');
  }

  // --- Animazioni (tween). Scala e rotazione sono SOLO visive. ---

  stretchJump() {
    if (this.isHurt) return;
    const bs = this.baseScale;
    this.scene.tweens.killTweensOf(this);
    this.setScale(bs * 0.82, bs * 1.2);
    this.scene.tweens.add({ targets: this, scaleX: bs, scaleY: bs, duration: 280, ease: 'Sine.easeOut' });
  }

  squashLand() {
    if (this.isHurt) return;
    const bs = this.baseScale;
    this.scene.tweens.killTweensOf(this);
    this.setScale(bs * 1.25, bs * 0.75);
    this.scene.tweens.add({ targets: this, scaleX: bs, scaleY: bs, duration: 200, ease: 'Back.easeOut' });
    this.spawnDust(4); // atterraggio: nuvoletta più grossa
  }
}
