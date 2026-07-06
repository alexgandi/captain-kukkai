import Phaser from 'phaser';
import { GAME_HEIGHT, COLORS, PLAYER, THEMES, TEXTURES, GRAVITY_Y } from '../config.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import VocabularyManager from '../systems/VocabularyManager.js';
import AudioManager from '../systems/AudioManager.js';
import VocabularyCard from '../ui/VocabularyCard.js';
import HeartsDisplay from '../ui/HeartsDisplay.js';
import AttackManager from '../systems/AttackManager.js';
import { generateLevel } from '../systems/generateLevel.js';
import { LEVEL_CONFIG } from '../data/levels.js';
import TouchControls from '../ui/TouchControls.js';

// GameScene: la scena di gioco.
// STEP 7: livello lungo (letto dai dati) + camera che scorre e segue Captain.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // --- SISTEMI (il "cervello" educativo del gioco) ---
    this.vocab = new VocabularyManager();
    this.audio = new AudioManager(this);
    this.card = new VocabularyCard(this);
    // Progresso persistente (condiviso tra le scene): serve al finale.
    this.progress = this.registry.get('progress');
    this.sfx = this.registry.get('sfx'); // effetti sonori
    this.music = this.registry.get('music'); // musica di sottofondo

    // --- CARICO IL LIVELLO dai dati (default: 1) ---
    // Il numero di livello arriva da scene.start('GameScene', { level: n }).
    const data = this.scene.settings.data || {};
    this.levelNumber = data.level || 1;
    this.completing = false; // evita transizioni doppie a fine livello
    this.restarting = false; // evita doppi riavvii quando i cuori finiscono
    // Dopo una morte il livello riparte: ricordo se era già stato raggiunto il
    // CHECKPOINT (si riparte da lì) e che c'è stata almeno una morte (per le stelle).
    this.fromCheckpoint = !!data.fromCheckpoint;
    this.hadDeath = !!data.hadDeath;
    const cfg = LEVEL_CONFIG[this.levelNumber] || LEVEL_CONFIG[1];
    // Il LAYOUT è generato dalle parole del livello (più parole = più lungo).
    // Ogni nemico riceve uno stile dal MIX del livello (nuovi + ripasso vecchi).
    const levelWords = this.vocab.getWordsForLevel(this.levelNumber);
    const level = generateLevel(levelWords, cfg.enemyMix, {
      vehicles: cfg.vehicles,
      coconuts: cfg.coconuts,
      stones: cfg.stones,
      lengthMult: cfg.lengthMult,
    });
    const worldWidth = level.worldWidth;
    const floorHeight = level.floorHeight;
    const floorTop = GAME_HEIGHT - floorHeight;

    // TEMA dell'ambiente (giungla / ghiaccio / vulcano...). Dà identità al livello.
    this.theme = THEMES[cfg.env] || THEMES.jungle;
    this.cameras.main.setBackgroundColor(this.theme.sky);
    // Musica del livello: un tema pentatonico per ambiente.
    if (this.music) this.music.play(cfg.env);

    this.worldWidth = worldWidth;
    this.floorTopY = floorTop; // quota del suolo (schianto di pietre/cocchi/frecce)
    this.enemyShots = []; // proiettili magici lanciati dai nemici viola
    this.arrows = []; // frecce ad arco scoccate dagli arcieri

    // Limiti del MONDO: più larghi dello schermo, così c'è da esplorare.
    this.physics.world.setBounds(0, 0, worldWidth, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, worldWidth, GAME_HEIGHT);

    // Decorazioni di sfondo con parallasse (danno il senso dello scorrimento).
    this.addBackgroundDecor(worldWidth, floorTop);

    // --- SOLIDI: pavimento (tutta la larghezza) + piattaforme ---
    this.solids = [];
    this.makeSolid(worldWidth / 2, floorTop + floorHeight / 2, worldWidth, floorHeight, this.theme.ground);
    level.platforms.forEach((p) => {
      if (p.bridge) this.makeBridge(p.x, p.y, p.w, p.h);
      else this.makeSolid(p.x, p.y, p.w, p.h, this.theme.platform);
    });

    // Tocco "vulcano": una crosta di lava incandescente sopra il pavimento.
    if (this.theme.lava) {
      this.add.rectangle(worldWidth / 2, floorTop + 4, worldWidth, 8, 0xff6a00).setDepth(1);
    }

    // Tocco "città": strisce gialle tratteggiate al centro della strada.
    if (this.theme.road) {
      const laneY = floorTop + floorHeight / 2;
      for (let x = 20; x < worldWidth; x += 70) {
        this.add.rectangle(x, laneY, 34, 5, 0xf2d14e).setDepth(1).setAlpha(0.85);
      }
    }

    // Tocco "foresta": FOGLIE che cadono dolcemente, ondeggiando (vicino alla camera).
    if (this.theme.forest) {
      this.time.addEvent({
        delay: 700,
        loop: true,
        callback: () => {
          const cam = this.cameras.main;
          const x = cam.scrollX + Math.random() * this.scale.width;
          const leaf = this.add.ellipse(x, -10, 10, 5, 0x5fae59, 0.9).setDepth(5);
          leaf.setAngle(Math.random() * 180);
          this.tweens.add({ targets: leaf, y: floorTop - 4, angle: leaf.angle + 320, duration: 3600 + Math.random() * 1600, ease: 'Sine.easeIn', onComplete: () => leaf.destroy() });
          this.tweens.add({ targets: leaf, x: x + 40, duration: 900, yoyo: true, repeat: 4, ease: 'Sine.easeInOut' }); // ondeggia
        },
      });
    }

    // --- CHECKPOINT (solo nei livelli LUNGHI, es. il castello doppio) ---
    // Superata la bandierina a metà, morire fa ripartire DA LÌ, non dall'inizio.
    this.checkpointX = null;
    this.checkpointReached = false;
    if ((cfg.lengthMult || 1) >= 2) {
      this.checkpointX = Math.round(worldWidth / 2);
      this.drawCheckpointFlag(this.checkpointX, floorTop);
      this.checkpointReached = this.fromCheckpoint; // se rinasco qui, resta valido
    }

    // --- CAPTAIN ---
    const startX = this.fromCheckpoint && this.checkpointX ? this.checkpointX : 100;
    this.playerStart = { x: startX, y: floorTop - PLAYER.height };
    this.player = new Player(this, this.playerStart.x, this.playerStart.y);
    this.physics.add.collider(this.player, this.solids);

    // Quando Captain subisce danno aggiorno i cuori; a 0 vite si ricomincia.
    this.player.on('damaged', (lives) => this.hearts.set(lives));
    this.player.on('died', () => this.onPlayerDied());

    // --- NEMICI (dai dati, ognuno col SUO stile dal mix + mappato alla parola) ---
    this.enemyList = [];
    level.enemies.forEach((def) => {
      const st = def.style;
      const enemy = new Enemy(this, def.x, def.y, {
        color: st.color,
        spiked: st.spiked,
        armored: st.armored,
        castsMagic: st.castsMagic,
        archer: st.archer,
        hits: st.hits,
      });
      enemy.wordEnglish = def.word;
      // Bollicina con l'ICONA della parola sopra la testa: il bambino la vede
      // PRIMA di sconfiggere il nemico (anticipazione), poi la sente (rinforzo).
      const word = this.vocab.getWordByEnglish(def.word);
      if (word) {
        const bubble = this.add.container(def.x, def.y - enemy.displayHeight / 2 - 16).setDepth(8);
        const isLongText = (word.icon || '').length > 2; // es. i numeri "100", "1000"
        const bg = this.add.circle(0, 0, isLongText ? 15 : 13, 0xffffff, 0.88);
        bg.setStrokeStyle(2, 0xffd166, 1);
        const icon = this.add
          .text(0, 0, word.icon || '⭐', {
            fontSize: isLongText ? '10px' : '14px',
            color: '#333333',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
        bubble.add([bg, icon]);
        enemy.iconBubble = bubble;
      }
      // A L2 la prima magia arriva con più calma (stai ancora imparando a schivare).
      if (this.levelNumber === 2 && enemy.castsMagic) {
        enemy.castTimer = 3500 + Math.random() * 2500;
      }
      // Se ha un raggio di pattuglia, cammina tra x-patrol e x+patrol.
      // La velocità arriva dallo stile del nemico (default 55).
      if (def.patrol) {
        enemy.setPatrol(def.x - def.patrol, def.x + def.patrol, st.speed || 55);
      }
      this.enemyList.push(enemy);
    });
    // Un solo overlap per tutti i nemici: handleStomp riceve quello colpito.
    this.physics.add.overlap(this.player, this.enemyList, this.handleStomp, null, this);

    // --- ATTACCHI: spada (liv. 2+) e magia (liv. 3+), gestiti dall'AttackManager ---
    this.attacks = new AttackManager(this, this.player, {
      enemies: this.enemyList,
      level: this.levelNumber,
      onHitEnemy: (enemy) => this.hitEnemy(enemy, 'weapon'),
    });

    // --- SCUDO (sbloccato dal Livello 4): tieni premuto L per parare le magie/frecce.
    // NON protegge dal contatto (nemici, tuk-tuk, cocchi, pietre, spine, fuoco).
    // NON si può tenere all'infinito: ha una "batteria" (max ~2s). Quando si scarica
    // si BLOCCA finché non si ricarica del tutto (~2s), così non copri tutto il livello.
    this.hasShield = this.levelNumber >= 4;
    this.shieldActive = false;
    this.shieldMax = 2000; // ms di scudo a piena carica
    this.shieldEnergy = this.shieldMax;
    this.shieldLocked = false; // true = scarico, in ricarica, non usabile
    if (this.hasShield) {
      this.shieldKey = this.input.keyboard.addKey('L');
      this.shieldSprite = this.add.image(0, 0, 'shield_gfx').setDepth(11).setVisible(false);
      // Barretta della carica sopra Captain (blu = pronta, rossa = bloccata).
      this.shieldBarBg = this.add.rectangle(0, 0, 42, 6, 0x1a1a2e).setDepth(12).setVisible(false);
      this.shieldBarFill = this.add.rectangle(0, 0, 40, 4, 0x37e0ff).setOrigin(0, 0.5).setDepth(13).setVisible(false);
    }

    // --- CONTROLLI TOUCH (tablet/telefono): pulsanti a schermo, solo su touch ---
    this.touchControls = new TouchControls(this, 'platform', { level: this.levelNumber });

    // --- OSTACOLI (spine / fuoco): da evitare, toccarli fa "scottare" Captain ---
    this.buildHazards(level, floorTop);

    // --- TUK-TUK (ostacoli MOBILI, Livello 5): sfrecciano e vanno saltati ---
    this.buildVehicles(level);

    // --- NOCI DI COCCO (ostacoli DALL'ALTO, Livello 6): cadono e vanno evitate ---
    this.buildDroppers(level, floorTop);

    // --- RINOCERONTI (Livello 6): caricano da destra a sinistra, da SALTARE ---
    this.buildRhinos(floorTop, cfg.rhinos);

    // --- TRAGUARDO: lo Spirit House (tempietto thai). ---
    // NASCOSTO all'inizio: compare solo quando hai sconfitto TUTTI i nemici
    // (imparato tutte le parole). Poi raggiungerlo finisce il livello.
    const goalX = worldWidth - 90;
    this.goal = this.add.image(goalX, floorTop - 60, TEXTURES.spiritHouse).setDepth(2);
    this.physics.add.existing(this.goal, true); // corpo statico
    this.physics.add.overlap(this.player, this.goal, () => this.reachGoal(), null, this);
    this.goal.setVisible(false);
    this.goal.body.enable = false; // inattivo finché non compare
    this.goalRevealed = false;

    // --- CAMERA: segue Captain in modo morbido ---
    // startFollow(target, arrotonda pixel, lerpX, lerpY): lerp basso = inseguimento fluido.
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    // Deadzone: una "zona morta" al centro in cui la camera non si muove.
    // Alta in verticale così i salti non fanno ballare la telecamera.
    this.cameras.main.setDeadzone(120, 260);

    // --- Istruzioni: ANCORATE alla camera (non scorrono col mondo) ---
    // Istruzioni SOLO in inglese + thai (mai italiano nel gioco).
    // La riga cambia in base agli attacchi sbloccati nel livello.
    let controls = 'Jump on enemies!';
    if (this.levelNumber >= 2) controls += '   [J] Sword';
    if (this.levelNumber >= 3) controls += '   [K] Magic';
    if (this.levelNumber >= 4) controls += '   [L] Shield';
    controls += '   ·  Avoid spikes & fire!';
    this.add
      .text(this.scale.width / 2, 20, controls, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#1a1a2e',
        strokeThickness: 4, // contorno: leggibile su ogni tema (chiaro o scuro)
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
    this.add
      .text(this.scale.width / 2, 42, 'กระโดดใส่ศัตรู!  หลบหนามและไฟ!', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffe14d',
        stroke: '#1a1a2e',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);

    // --- CUORI (vite) in alto a sinistra ---
    this.hearts = new HeartsDisplay(this, this.player.maxLives);
    this.hearts.set(this.player.lives);

    // --- Pulsante WORD BOOK in alto a destra (o tasto B): rivedi le parole ---
    const bookBtn = this.add
      .text(this.scale.width - 16, 20, '📖', { fontSize: '28px' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive({ useHandCursor: true });
    bookBtn.on('pointerdown', () => this.openWordBook());
    this.input.keyboard.on('keydown-B', () => this.openWordBook());

    // --- BANNER "nuova arma" all'inizio dei livelli che ne sbloccano una ---
    if (this.levelNumber === 2) {
      this.showWeaponBanner('New weapon: SWORD!   Press J', 'อาวุธใหม่: ดาบ! ⚔️');
    } else if (this.levelNumber === 3) {
      this.showWeaponBanner('New weapon: MAGIC!   Press K', 'อาวุธใหม่: เวทมนตร์! ✨');
    } else if (this.levelNumber === 4) {
      // Novità 1: nemici viola (immuni ad arma/magia, si battono solo in testa).
      this.showWeaponBanner('Purple foes: JUMP on them! They cast magic', 'ศัตรูสีม่วง: กระโดดใส่หัว! พวกมันร่ายเวทมนตร์');
      // Novità 2: lo SCUDO, che para le magie (banner sfalsato, dopo il primo).
      this.showWeaponBanner('New: SHIELD!  Hold L to block magic', 'ของใหม่: โล่! กดค้าง L เพื่อกันเวทมนตร์', 4200);
    } else if (this.levelNumber === 5) {
      // I tuk-tuk sfrecciano sulla strada: vanno saltati, non si possono battere.
      this.showWeaponBanner('Watch out: TUK-TUKS! Jump over them', 'ระวังตุ๊กตุ๊ก! กระโดดข้ามไป');
    } else if (this.levelNumber === 6) {
      // Foresta: cocchi che cadono + rinoceronti che caricano. Tutti da schivare/saltare.
      this.showWeaponBanner('COCONUTS fall & RHINOS charge — jump!', 'มะพร้าวหล่น & แรดพุ่งชน — กระโดด!');
    } else if (this.levelNumber === 7) {
      // Castello: pietre dal soffitto + arcieri con frecce ad arco.
      this.showWeaponBanner('Falling ROCKS & ARCHERS! Dodge the arrows', 'ระวังหินหล่นและนักธนู! หลบลูกศร');
    }
  }

  // Banner ben visibile che annuncia una novità (inglese + thai). Appare e svanisce.
  // startDelay: ritardo prima di comparire (per mostrare più banner in sequenza).
  showWeaponBanner(enText, thText, startDelay = 0) {
    if (startDelay > 0) {
      this.time.delayedCall(startDelay, () => this.showWeaponBanner(enText, thText, 0));
      return;
    }
    const cx = this.scale.width / 2;
    const cy = 200;
    const w = 480;
    const h = 96;

    const banner = this.add.container(cx, cy).setScrollFactor(0).setDepth(4000);
    const bg = this.add.graphics();
    bg.fillStyle(0x1c1030, 0.92);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(4, 0xffd166, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    const en = this.add
      .text(0, -16, enText, { fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    const th = this.add
      .text(0, 22, thText, { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffe14d' })
      .setOrigin(0.5);
    banner.add([bg, en, th]);

    // Entra con un "pop", resta qualche secondo, poi sale e svanisce.
    banner.setScale(0.6);
    banner.setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: banner,
      alpha: 0,
      y: cy - 30,
      delay: 3400,
      duration: 500,
      onComplete: () => banner.destroy(),
    });
  }

  // Costruisce gli ostacoli del livello: un corpo di collisione (invisibile) +
  // il disegno (spine o fuoco). Tenendo separati corpo e grafica, la collisione
  // resta pulita e la parte "estetica" si cambia senza toccare la fisica.
  buildHazards(level, floorTop) {
    this.hazards = [];
    (level.hazards || []).forEach((def) => {
      const height = def.type === 'fire' ? 34 : 22;

      // Corpo di collisione: un rettangolo invisibile appoggiato al pavimento.
      const body = this.add.rectangle(def.x, floorTop - height / 2, def.w, height);
      body.setVisible(false);
      this.physics.add.existing(body, true);
      this.hazards.push(body);

      // Grafica.
      if (def.type === 'fire') this.drawFire(def.x, floorTop, def.w);
      else this.drawSpikes(def.x, floorTop, def.w);
    });

    // Toccare un ostacolo -> Captain si scotta (respawn + lampeggìo).
    this.physics.add.overlap(this.player, this.hazards, this.handleHazard, null, this);
  }

  // Spine grigie: tante puntine triangolari lungo la larghezza.
  drawSpikes(cx, baseY, width) {
    const g = this.add.graphics();
    g.setDepth(1);
    const spikeW = 15;
    const height = 22;
    const left = cx - width / 2;
    for (let x = left; x < left + width - 1; x += spikeW) {
      g.fillStyle(0xb7bcc4, 1); // grigio metallo
      g.fillTriangle(x, baseY, x + spikeW / 2, baseY - height, x + spikeW, baseY);
      g.fillStyle(0x8b9099, 1); // ombra a sinistra della punta
      g.fillTriangle(x, baseY, x + spikeW / 2, baseY - height, x + spikeW / 2, baseY);
    }
  }

  // Fuoco: fiammelle arancioni con cuore giallo; pulsa di trasparenza (flicker).
  drawFire(cx, baseY, width) {
    const g = this.add.graphics();
    g.setDepth(1);
    const flameW = 20;
    const left = cx - width / 2;
    for (let x = left; x < left + width - 1; x += flameW) {
      g.fillStyle(0xff6a00, 0.95); // fiamma esterna
      g.fillTriangle(x, baseY, x + flameW / 2, baseY - 34, x + flameW, baseY);
      g.fillStyle(0xffd21a, 0.95); // cuore giallo
      g.fillTriangle(x + flameW * 0.25, baseY, x + flameW / 2, baseY - 20, x + flameW * 0.75, baseY);
    }
    // Flicker: pulsazione di trasparenza (non tocca la posizione/collisione).
    this.tweens.add({
      targets: g,
      alpha: 0.7,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  handleHazard(player, hazard) {
    // Ostacolo: perde un cuore e torna all'ultimo terreno sicuro.
    player.takeDamage({ respawn: true });
  }

  // Crea i TUK-TUK: sprite che sfrecciano avanti e indietro su un tratto di strada.
  // NON si uccidono (nessuno stomp): toccarli fa danno + contraccolpo, vanno SALTATI.
  buildVehicles(level) {
    this.vehicles = [];
    (level.vehicles || []).forEach((def) => {
      const t = this.physics.add.sprite(def.minX, def.y, 'tuktuk').setDepth(3);
      t.body.setAllowGravity(false);
      t.body.setImmovable(true);
      t.minX = def.minX;
      t.maxX = def.maxX;
      t.speed = def.speed;
      t.dir = 1;
      t.body.setVelocityX(def.speed);
      t.setFlipX(false); // parte verso destra; la texture guarda già a destra
      // Rimbalzo verticale leggero: dà l'idea del motorino sconquassato.
      this.tweens.add({ targets: t, y: def.y - 3, duration: 140, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.vehicles.push(t);
    });
    // Toccare un tuk-tuk -> danno con contraccolpo (come un nemico, ma non si batte).
    this.physics.add.overlap(this.player, this.vehicles, this.handleVehicle, null, this);
  }

  // Aggiorna la corsa dei tuk-tuk: rimbalzano ai bordi del loro tratto e si girano.
  patrolVehicles() {
    if (!this.vehicles) return;
    this.vehicles.forEach((t) => {
      if (t.dir === 1 && t.x >= t.maxX) {
        t.dir = -1;
        t.body.setVelocityX(-t.speed);
        t.setFlipX(true); // ora va a sinistra: specchio la texture
      } else if (t.dir === -1 && t.x <= t.minX) {
        t.dir = 1;
        t.body.setVelocityX(t.speed);
        t.setFlipX(false); // ora va a destra
      }
    });
  }

  handleVehicle(player, tuktuk) {
    // Il tuk-tuk ti mette sotto: danno + spinta lontano (non si può uccidere).
    player.takeDamage({ fromX: tuktuk.x });
  }

  // Prepara i DROPPER (L6 cocchi / L7 pietre): disegna la sorgente per ognuno (albero
  // o crepa nel soffitto) e imposta un timer di caduta. Gli oggetti che cadono finiscono
  // in un gruppo fisico con:
  //  - collider col terreno/piattaforme -> si schiantano (splat)
  //  - overlap col player -> danno
  buildDroppers(level, floorTop) {
    this.droppers = (level.droppers || []).map((d) => ({ ...d, timer: d.phase }));
    this.fallers = this.physics.add.group();

    // Sorgente visiva per ogni dropper: albero (cocco) o crepa nel soffitto (pietra).
    this.droppers.forEach((d) => {
      if (d.kind === 'stone') this.drawCeilingCrack(d.x, d.spawnY);
      else this.drawTallTree(d.x, d.spawnY, floorTop);
    });

    if (this.droppers.length) {
      // NB: NIENTE collider fisico coi solidi. Lo schianto al suolo lo fa lo sweep
      // in updateDroppers (a prova di tunneling e SICURO: gira fuori dalla fisica,
      // così non distruggiamo un corpo dentro il callback di collisione — possibile
      // causa di freeze). Il danno al player resta un semplice overlap.
      this.physics.add.overlap(this.player, this.fallers, (player, obj) => this.hitByFaller(player, obj), null, this);
    }
  }

  // Albero da cocco altissimo: tronco marrone dal suolo alla chioma + chioma di
  // foglie + un grappolo di noci appese (decorative). Foreground, davanti allo sfondo.
  drawTallTree(x, canopyY, floorTop) {
    const g = this.add.graphics().setDepth(-2);
    // Tronco (leggermente curvo: due segmenti).
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(x - 9, canopyY + 10, 18, floorTop - canopyY - 6);
    g.fillStyle(0x5a3d22, 1);
    g.fillRect(x - 9, canopyY + 10, 5, floorTop - canopyY - 6); // ombra sul lato sinistro
    // Chioma: ciuffi di foglie (ellissi verdi) attorno alla cima.
    const leaf = (lx, ly, w, h, c) => g.fillStyle(c, 1) || g.fillEllipse(lx, ly, w, h);
    leaf(x, canopyY, 120, 46, 0x2f7a3a);
    leaf(x - 46, canopyY + 6, 90, 36, 0x3c9247);
    leaf(x + 46, canopyY + 6, 90, 36, 0x3c9247);
    leaf(x, canopyY - 16, 80, 34, 0x49a856);
    // Grappolo di noci appese (decorative, indicano che è un albero da cocco).
    g.fillStyle(0x6b4423, 1);
    g.fillCircle(x - 8, canopyY + 16, 6);
    g.fillCircle(x + 6, canopyY + 18, 6);
    g.fillCircle(x - 1, canopyY + 22, 6);
  }

  // Crepa nel soffitto del castello: da qui si stacca una pietra. Un pezzo di soffitto
  // di pietra + una crepa scura + qualche mattone smosso (decorativi).
  drawCeilingCrack(x, y) {
    const g = this.add.graphics().setDepth(-2);
    // Blocco di soffitto (pietra) sopra la crepa.
    g.fillStyle(0x4b4656, 1);
    g.fillRect(x - 40, 0, 80, y - 4);
    g.fillStyle(0x3c3848, 1); // fughe tra i mattoni
    for (let by = 8; by < y - 4; by += 14) g.fillRect(x - 40, by, 80, 2);
    // Crepa scura a zig-zag.
    g.lineStyle(2.5, 0x201d29, 1);
    g.beginPath();
    g.moveTo(x - 16, 0);
    g.lineTo(x - 4, y * 0.4);
    g.lineTo(x + 8, y * 0.6);
    g.lineTo(x + 2, y - 4);
    g.strokePath();
    // Un paio di mattoni smossi che stanno per cadere.
    g.fillStyle(0x5a5560, 1);
    g.fillRect(x - 10, y - 8, 12, 8);
    g.fillRect(x + 4, y - 6, 10, 6);
  }

  // Chiamato ogni frame: fa cadere un oggetto quando Captain è vicino a un dropper.
  updateDroppers(delta) {
    if (!this.droppers || !this.droppers.length) return;
    this.droppers.forEach((d) => {
      d.timer -= delta;
      if (d.timer <= 0) {
        d.timer = d.period + Math.random() * 500;
        // Cade SOLO se Captain è abbastanza vicino: pericolo reale, non sprecato.
        if (Math.abs(d.x - this.player.x) < 300) this.dropFaller(d);
      }
    });
    // Controllo del suolo A PROVA DI TUNNELING: se un oggetto ha raggiunto la quota
    // del pavimento, si schianta qui (non dipendiamo solo dal collider, che con un
    // frame lento potrebbe "bucare" il pavimento sottile).
    this.fallers.getChildren().forEach((obj) => {
      if (obj.active && obj.y >= this.floorTopY - 13) this.smashFaller(obj);
    });
  }

  // Crea l'oggetto che cade dalla sorgente con gravità (cocco o pietra secondo il kind).
  dropFaller(d) {
    const key = d.kind === 'stone' ? 'stone' : 'coconut';
    const obj = this.fallers.create(d.x, d.spawnY + 20, key);
    obj.setDepth(6);
    obj.smashed = false;
    obj.body.setCircle(12);
    // Niente gravità del MONDO (si sommava a quella impostata): uso un'accelerazione
    // mia, così la caduta è prevedibile e non "buca" il pavimento.
    obj.body.setAllowGravity(false);
    obj.setVelocityY(140);
    obj.setAccelerationY(GRAVITY_Y * 0.5); // cade decisa ma con un attimo di reazione
    obj.setAngularVelocity(d.kind === 'stone' ? 120 : 180); // ruota mentre cade
    if (this.sfx) this.sfx.click(); // "toc": si è staccata
  }

  // L'oggetto tocca terra/piattaforma o il player: si schianta (splat) e sparisce.
  smashFaller(obj) {
    if (!obj || obj.smashed || !obj.active) return; // idempotente: mai due volte
    obj.smashed = true;
    const x = obj.x;
    const y = obj.y + 6;
    const stone = obj.texture.key === 'stone';
    obj.destroy();
    if (this.sfx) this.sfx.tink();
    // Splat: scheggie che schizzano e svaniscono (polvere grigia per la pietra,
    // acqua di cocco bianca + guscio per il cocco).
    for (let i = 0; i < 7; i++) {
      const c = stone ? (i % 2 ? 0x6f6f77 : 0xb4b4bc) : i % 2 ? 0x6b4423 : 0xf2ead6;
      const shard = this.add.circle(x, y, 3, c).setDepth(6);
      const ang = -Math.PI + (Math.PI * i) / 6; // ventaglio verso l'alto
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(ang) * 34,
        y: y + Math.sin(ang) * 26,
        alpha: 0,
        scale: 0.3,
        duration: 360,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  hitByFaller(player, obj) {
    if (player.isHurt) return;
    player.takeDamage({ fromX: obj.x });
    this.smashFaller(obj); // si spacca anche colpendoti
  }

  // Prepara i RINOCERONTI (Livello 6): ostacoli mobili che CARICANO da destra a
  // sinistra attraverso tutto il livello. Vanno SALTATI: non si uccidono (la magia
  // li attraversa senza effetto, perché non sono nella lista dei nemici). Al contatto
  // fanno danno + contraccolpo; spariscono quando escono dallo schermo a sinistra.
  buildRhinos(floorTop, enabled) {
    this.spawnRhinos = !!enabled;
    this.rhinos = this.physics.add.group();
    this.rhinoY = floorTop - 21; // appoggiati sul pavimento
    this.rhinoTimer = 5000; // primo rinoceronte dopo qualche secondo
    if (this.spawnRhinos) {
      this.physics.add.overlap(this.player, this.rhinos, (player, rhino) => this.hitByRhino(player, rhino), null, this);
    }
  }

  // Spawna a intervalli, muove e ripulisce i rinoceronti.
  updateRhinos(delta) {
    if (!this.spawnRhinos) return;
    this.rhinoTimer -= delta;
    if (this.rhinoTimer <= 0) {
      this.rhinoTimer = 6000 + Math.random() * 3000; // uno ogni 6-9 secondi (casuale)
      this.spawnRhino();
    }
    // Spariti a sinistra dello schermo: si rimuovono.
    const leftEdge = this.cameras.main.scrollX - 100;
    this.rhinos.getChildren().forEach((r) => {
      if (r.active && r.x < leftEdge) r.destroy();
    });
  }

  spawnRhino() {
    // Entra dal bordo destro dello schermo e carica verso sinistra.
    const x = this.cameras.main.scrollX + this.scale.width + 60;
    const r = this.rhinos.create(x, this.rhinoY, 'rhino');
    r.body.setAllowGravity(false);
    r.setDepth(4);
    r.setVelocityX(-210); // carica veloce verso sinistra
    if (this.sfx) this.sfx.tink(); // uno "sbuffo"
  }

  hitByRhino(player, rhino) {
    // Ti travolge: danno + spinta. NON si può uccidere (va saltato).
    player.takeDamage({ fromX: rhino.x });
  }

  // Bandierina del checkpoint: palo + bandiera rossa con bordo dorato (stile thai).
  drawCheckpointFlag(x, floorTop) {
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x9aa0a8, 1); // palo
    g.fillRect(x - 2, floorTop - 88, 4, 88);
    g.fillStyle(0xf2c14e, 1); // pomello dorato
    g.fillCircle(x, floorTop - 90, 4);
    g.fillStyle(0xb0392e, 1); // bandiera
    g.fillTriangle(x + 2, floorTop - 86, x + 40, floorTop - 74, x + 2, floorTop - 62);
    g.lineStyle(2, 0xf2c14e, 1);
    g.strokeTriangle(x + 2, floorTop - 86, x + 40, floorTop - 74, x + 2, floorTop - 62);
    this.checkpointGfx = g;
  }

  // Captain supera la bandierina: da adesso si rinasce qui (festeggia un attimo).
  reachCheckpoint() {
    this.checkpointReached = true;
    if (this.sfx) this.sfx.win();
    const msg = this.add
      .text(this.scale.width / 2, 120, 'Checkpoint! 🚩', {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        stroke: '#1a1a2e',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);
    this.tweens.add({ targets: msg, alpha: 0, y: 96, delay: 1300, duration: 500, onComplete: () => msg.destroy() });
  }

  // A 0 vite: reset gentile (niente game over spaventoso).
  // Finiti i cuori: si RICOMINCIA IL LIVELLO DA CAPO (i nemici ricompaiono).
  // Blocco i comandi, mostro un messaggio gentile e poi riavvio la scena:
  // il generatore è deterministico, quindi ritorna lo stesso livello intatto.
  onPlayerDied() {
    if (this.restarting) return;
    this.restarting = true;
    this.player.body.setVelocity(0, 0);
    this.player.body.moves = false; // stop ai comandi durante la transizione

    // Messaggio gentile (solo inglese + thai).
    const msg = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Try again!  ลองอีกครั้ง!', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);

    // Dopo un attimo, riavvio il livello (nemici e parole resettati). Se il
    // checkpoint era stato raggiunto, si riparte da lì; e ricordo la morte (stelle).
    this.time.delayedCall(1100, () => {
      this.scene.restart({
        level: this.levelNumber,
        fromCheckpoint: this.checkpointReached,
        hadDeath: true,
      });
    });
  }

  // Colline in lontananza, con scrollFactor < 1 per la parallasse.
  // Il colore viene dal tema; sul ghiaccio aggiungo una calotta di neve.
  addBackgroundDecor(worldWidth, floorTop) {
    // Città: grattacieli sullo sfondo al posto delle colline (vedi sotto).
    if (this.theme.buildings) {
      this.addCityscape(worldWidth, floorTop);
    } else if (this.theme.forest) {
      this.addForestBackdrop(worldWidth, floorTop);
    } else if (this.theme.castle) {
      this.addCastleBackdrop(worldWidth, floorTop);
    } else {
      for (let x = 0; x <= worldWidth; x += 300) {
        const hill = this.add.ellipse(x, floorTop, 280, 150, this.theme.hill);
        hill.setScrollFactor(0.5); // si muove a metà velocità -> senso di profondità
        hill.setDepth(-10);

        if (this.theme.snow) {
          const cap = this.add.ellipse(x, floorTop - 45, 150, 80, 0xffffff);
          cap.setScrollFactor(0.5);
          cap.setDepth(-9);
        }
      }
    }

    // Tocco "notte": un cielo di stelle sparse che luccicano piano.
    if (this.theme.stars) {
      // Luna in alto a destra, fissa (parallasse quasi nulla).
      const moon = this.add.circle(680, 70, 34, 0xf4f0d8).setScrollFactor(0.1).setDepth(-12);
      moon.setAlpha(0.95);
      // Distribuzione deterministica (niente random): passo fisso + sfasamento.
      let n = 0;
      for (let x = 20; x <= worldWidth; x += 70) {
        n++;
        const y = 30 + ((n * 53) % 180); // altezze varie nella fascia alta del cielo
        const r = 1 + (n % 3) * 0.6;
        const star = this.add.circle(x, y, r, 0xffffff).setScrollFactor(0.3).setDepth(-11);
        star.setAlpha(0.5 + (n % 4) * 0.12);
        // Un lieve battito luminoso, sfasato per ogni stella.
        this.tweens.add({
          targets: star,
          alpha: 0.25,
          duration: 900 + (n % 5) * 250,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  // Skyline di Bangkok: due file di grattacieli (lontani + vicini) con parallasse,
  // qualche finestra accesa. Tutto deterministico (niente casualità).
  addCityscape(worldWidth, floorTop) {
    const rows = [
      { color: this.theme.hill, sf: 0.35, depth: -11, base: floorTop - 10, hMin: 120, hMax: 230, step: 130, w: 90 }, // lontani, più chiari
      { color: 0x5c6b80, sf: 0.6, depth: -9, base: floorTop, hMin: 90, hMax: 180, step: 160, w: 110 }, //             vicini, più scuri
    ];
    rows.forEach((row, ri) => {
      let n = 0;
      for (let x = 0; x <= worldWidth + row.step; x += row.step) {
        n++;
        const h = row.hMin + ((n * 37 + ri * 53) % (row.hMax - row.hMin));
        const top = row.base - h;
        const b = this.add.rectangle(x, top + h / 2, row.w, h, row.color);
        b.setScrollFactor(row.sf);
        b.setDepth(row.depth);
        // Finestrelle accese (griglia rada) solo sulla fila vicina.
        if (ri === 1) {
          for (let wy = top + 14; wy < row.base - 10; wy += 26) {
            for (let wx = x - row.w / 2 + 14; wx < x + row.w / 2 - 8; wx += 24) {
              if ((wx + wy) % 3 === 0) continue; // qualcuna spenta, per varietà
              const win = this.add.rectangle(wx, wy, 8, 10, 0xffe9a8);
              win.setScrollFactor(row.sf);
              win.setDepth(row.depth + 0.1);
              win.setAlpha(0.85);
            }
          }
          // INSEGNE AL NEON (Bangkok!): colorate, con scritte thai, una ogni 3
          // grattacieli. Una su due "sfarfalla" come un neon vero.
          if (n % 3 === 0) {
            const neonColors = [0xff5aa0, 0x37e0ff, 0xffe14d, 0x4be08a];
            const neonWords = ['อาหาร', 'โรงแรม', 'ตลาด', 'นวด'];
            const ci = Math.floor(n / 3) % neonColors.length;
            const sign = this.add.container(x, top + 30).setScrollFactor(row.sf).setDepth(row.depth + 0.2);
            const box = this.add.rectangle(0, 0, 64, 22, 0x14101f, 0.9);
            box.setStrokeStyle(2, neonColors[ci], 1);
            const txt = this.add
              .text(0, 0, neonWords[ci], { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff' })
              .setOrigin(0.5)
              .setTint(neonColors[ci]);
            sign.add([box, txt]);
            if (n % 6 === 0) {
              // Sfarfallio del neon.
              this.tweens.add({ targets: sign, alpha: 0.35, duration: 90, yoyo: true, repeat: -1, repeatDelay: 1400 + n * 130 });
            }
          }
        }
      }
    });
  }

  // Sfondo di foresta: file di alberi lontani (tronchi + chiome) con parallasse,
  // per dare profondità dietro agli alberi-dropper in primo piano. Deterministico.
  addForestBackdrop(worldWidth, floorTop) {
    const rows = [
      { sf: 0.35, depth: -11, trunk: 0x3a5230, canopy: this.theme.hill, top: 150, step: 150, cw: 130 }, // lontani, scuri
      { sf: 0.6, depth: -9, trunk: 0x4a5f34, canopy: 0x3c8a46, top: 210, step: 210, cw: 150 }, //          vicini, più chiari
    ];
    rows.forEach((row, ri) => {
      let n = 0;
      for (let x = 0; x <= worldWidth + row.step; x += row.step) {
        n++;
        const canopyY = row.top + ((n * 29 + ri * 41) % 40);
        const g = this.add.graphics().setScrollFactor(row.sf).setDepth(row.depth);
        // Tronco.
        g.fillStyle(row.trunk, 1);
        g.fillRect(x - 7, canopyY, 14, floorTop - canopyY);
        // Chioma tondeggiante.
        g.fillStyle(row.canopy, 1);
        g.fillEllipse(x, canopyY, row.cw, row.cw * 0.5);
        g.fillEllipse(x - row.cw * 0.3, canopyY + 10, row.cw * 0.7, row.cw * 0.4);
        g.fillEllipse(x + row.cw * 0.3, canopyY + 10, row.cw * 0.7, row.cw * 0.4);
      }
    });
  }

  // Sfondo di castello: colonne di pietra con capitello + stendardi rosso/oro appesi
  // + qualche torcia accesa, con parallasse. Deterministico.
  addCastleBackdrop(worldWidth, floorTop) {
    for (let x = 60; x <= worldWidth; x += 240) {
      const n = Math.round(x / 240);
      const g = this.add.graphics().setScrollFactor(0.5).setDepth(-10);
      // Colonna (fusto + base + capitello).
      g.fillStyle(0x4a4658, 1);
      g.fillRect(x - 16, 60, 32, floorTop - 60);
      g.fillStyle(0x565270, 1); // luce sul fusto
      g.fillRect(x - 16, 60, 8, floorTop - 60);
      g.fillStyle(0x39364a, 1); // capitello + base più scuri
      g.fillRect(x - 22, 60, 44, 14);
      g.fillRect(x - 22, floorTop - 16, 44, 16);

      // Stendardo appeso a colonne alterne (rosso con bordo/filo dorato).
      if (n % 2 === 0) {
        g.fillStyle(0xf2c14e, 1);
        g.fillRect(x - 15, 96, 30, 4);
        g.fillStyle(0xb0392e, 1);
        g.fillRect(x - 13, 100, 26, 66);
        g.fillTriangle(x - 13, 166, x + 13, 166, x, 182); // punta a V
        g.fillStyle(0xf2c14e, 1); // emblema dorato
        g.fillCircle(x, 126, 7);
      } else {
        // Torcia: bastone + fiammella che pulsa.
        g.fillStyle(0x3a2c1c, 1);
        g.fillRect(x - 2, 120, 4, 22);
        const flame = this.add.ellipse(x, 116, 12, 20, 0xffa733).setScrollFactor(0.5).setDepth(-9);
        const core = this.add.ellipse(x, 118, 6, 12, 0xffe14d).setScrollFactor(0.5).setDepth(-9);
        this.tweens.add({ targets: [flame, core], scaleY: 0.8, alpha: 0.8, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  // Helper: crea un rettangolo SOLIDO (corpo statico) e lo registra in `solids`.
  makeSolid(x, y, width, height, color) {
    const block = this.add.rectangle(x, y, width, height, color);
    this.physics.add.existing(block, true);
    this.solids.push(block);
    return block;
  }

  // Come makeSolid, ma con l'aspetto di un PONTE thailandese (legno + parapetto
  // rosso/oro): usato per le piattaforme che fanno attraversare i fuochi lunghi.
  makeBridge(x, y, width, height) {
    const block = this.add.rectangle(x, y, width, height, 0x9c6b3f); // legno
    this.physics.add.existing(block, true);
    this.solids.push(block);

    const left = x - width / 2;
    const top = y - height / 2;
    const g = this.add.graphics().setDepth(3);
    // Assi verticali del tavolato.
    g.lineStyle(1, 0x6e4a2a, 0.7);
    for (let px = left + 6; px < left + width; px += 11) {
      g.beginPath();
      g.moveTo(px, top);
      g.lineTo(px, y + height / 2);
      g.strokePath();
    }
    // Parapetto rosso + filo dorato (tocco thai).
    g.fillStyle(0xb0392e, 1);
    g.fillRect(left, top - 4, width, 5);
    g.fillStyle(0xf2c14e, 1);
    g.fillRect(left, top - 6, width, 2);
    return block;
  }

  // Sconfitta con salto in testa: solo se Captain arriva dall'alto.
  handleStomp(player, enemy) {
    if (enemy.isDefeated) return;

    const pBody = player.body;
    const eBody = enemy.body;
    const comingFromAbove = pBody.velocity.y > 0 && pBody.bottom <= eBody.top + 12;

    if (comingFromAbove && !enemy.spiked) {
      // Salto in testa (solo nemici SENZA spine in testa): colpo + rimbalzo.
      this.hitEnemy(enemy, 'stomp');
      pBody.setVelocityY(PLAYER.jumpVelocity * 0.6);
    } else {
      // Contatto di lato/dal basso, OPPURE atterraggio sulle spine: Captain si fa male.
      // (I nemici spinati si battono solo con spada/magia.)
      player.takeDamage({ fromX: enemy.x });
    }
  }

  // Colpisce un nemico. `source` = 'stomp' | 'weapon'.
  // Riduce la vita; solo quando arriva a 0 fa pop + parola imparata.
  hitEnemy(enemy, source = 'weapon') {
    if (enemy.isDefeated) return;

    // Corazzati (spine ai lati): immuni a spada/magia, si battono SOLO in testa.
    if (enemy.armored && source !== 'stomp') {
      enemy.flashHurt(); // "clang": colpo respinto
      if (this.sfx) this.sfx.tink();
      return;
    }

    enemy.health -= 1;
    if (enemy.health > 0) {
      enemy.flashHurt(); // colpito ma ancora vivo (nemici a più colpi)
      if (this.sfx) this.sfx.tink();
      return;
    }

    // --- Sconfitta finale: pop + momento educativo ---
    const word = this.vocab.getWordByEnglish(enemy.wordEnglish);
    if (enemy.iconBubble) enemy.iconBubble.destroy(); // via la bollicina-icona
    enemy.defeat();
    if (this.sfx) this.sfx.defeat();

    if (word) {
      this.vocab.collect(word.english);
      if (this.progress) this.progress.addWord(word.english); // progresso di partita
      this.card.show(word);
      this.audio.speak(word.english);

      // Sconfitti TUTTI i nemici (tutte le parole imparate)? Compare il tempietto.
      if (this.vocab.isLevelComplete(this.levelNumber) && !this.goalRevealed) {
        this.revealGoal();
      }
    }
  }

  // Il tempietto COMPARE quando hai sconfitto tutti i nemici.
  revealGoal() {
    if (this.goalRevealed) return;
    this.goalRevealed = true;
    this.goal.setVisible(true);
    this.goal.body.enable = true;

    // Entrata "pop" + dondolìo che lo fa notare come meta.
    const baseY = this.goal.y;
    this.goal.setScale(0);
    this.tweens.add({ targets: this.goal, scale: 1, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.goal,
      y: baseY - 6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.showGoalMessage();
  }

  // Messaggio (inglese + thai) che invita a raggiungere il tempietto.
  showGoalMessage() {
    const cx = this.scale.width / 2;
    const en = this.add
      .text(cx, 108, 'Reach the temple! 🛕', {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        stroke: '#1a1a2e',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);
    const th = this.add
      .text(cx, 142, 'ไปที่วัด!', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffe14d',
        stroke: '#1a1a2e',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);
    this.tweens.add({
      targets: [en, th],
      alpha: 0,
      delay: 2400,
      duration: 600,
      onComplete: () => {
        en.destroy();
        th.destroy();
      },
    });
  }

  // Captain raggiunge lo Spirit House: FINE LIVELLO.
  reachGoal() {
    if (this.completing) return;
    this.completing = true;
    if (this.progress) this.progress.markLevelDone(this.levelNumber); // livello finito
    if (this.sfx) this.sfx.win();

    // STELLE del livello: 1 = finito, +1 = senza mai morire, +1 = cuori pieni.
    this.earnedStars = 1 + (this.hadDeath ? 0 : 1) + (this.player.lives === this.player.maxLives ? 1 : 0);
    if (this.progress) this.progress.setStars(this.levelNumber, this.earnedStars);

    // Al CASTELLO (L7) la storia si ferma un attimo: Kukkai era quasi salva,
    // ma lo Yaksha la rapisce sotto gli occhi di Captain -> cutscene!
    if (this.levelNumber === 7) {
      this.playKidnapCutscene();
      return;
    }

    // Feedback: il tempietto saltella.
    this.tweens.add({
      targets: this.goal,
      y: this.goal.y - 16,
      yoyo: true,
      duration: 180,
      repeat: 1,
      ease: 'Sine.easeOut',
    });
    this.time.delayedCall(600, () => {
      this.scene.start('LevelCompleteScene', { level: this.levelNumber, stars: this.earnedStars });
    });
  }

  // CUTSCENE del rapimento (fine castello): Kukkai appare felice accanto al
  // tempietto... ma l'astronave dello Yaksha scende, la cattura col raggio
  // traente e vola via. Poi si passa ai dialoghi (cliffhanger) e allo spazio.
  playKidnapCutscene() {
    this.player.body.moves = false; // Captain guarda impotente
    if (this.music) this.music.play('boss'); // musica: arriva la minaccia

    const gx = this.goal.x;
    const groundY = this.floorTopY - 36;

    // 1) Kukkai compare accanto al tempietto (quasi libera!).
    const kukkai = this.add.image(gx - 56, groundY, TEXTURES.kukkaiPortrait).setScale(0.001).setDepth(20);
    this.tweens.add({ targets: kukkai, scale: 0.62, duration: 420, ease: 'Back.easeOut' });

    // 2) L'astronave dello Yaksha scende dall'alto.
    const ship = this.add.image(gx - 56, -80, 'boss_ship').setDepth(21);
    this.tweens.add({ targets: ship, y: 120, delay: 900, duration: 900, ease: 'Sine.easeInOut' });

    // 3) Raggio traente + Kukkai risucchiata verso l'alto.
    this.time.delayedCall(2000, () => {
      const beam = this.add.graphics().setDepth(19);
      beam.fillStyle(0x37e0ff, 0.3);
      beam.fillTriangle(gx - 56, 150, gx - 90, groundY + 24, gx - 22, groundY + 24);
      this.tweens.add({ targets: beam, alpha: 0.12, duration: 220, yoyo: true, repeat: 6 });
      if (this.sfx) this.sfx.magic();

      this.tweens.add({
        targets: kukkai,
        y: 140,
        scale: 0.3,
        angle: 10,
        delay: 250,
        duration: 950,
        ease: 'Sine.easeIn',
        onComplete: () => {
          kukkai.destroy();
          beam.destroy();
        },
      });
    });

    // 4) "Oh no!" di Captain + l'astronave scappa in alto a destra.
    this.time.delayedCall(3300, () => {
      if (this.sfx) this.sfx.hurt();
      const oh = this.add
        .text(this.scale.width / 2, 150, 'Oh no! The Yaksha took Kukkai!', {
          fontFamily: 'sans-serif',
          fontSize: '26px',
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#1a1a2e',
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(3000);
      this.add
        .text(this.scale.width / 2, 182, 'ยักษ์จับครูกุ๊กไก่ไป!', {
          fontFamily: 'sans-serif',
          fontSize: '19px',
          color: '#ffe14d',
          stroke: '#1a1a2e',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(3000);
      this.tweens.add({
        targets: ship,
        x: gx + 300,
        y: -140,
        angle: -8,
        duration: 1100,
        ease: 'Sine.easeIn',
      });
    });

    // 5) Verso i dialoghi (cliffhanger) e poi lo spazio.
    this.time.delayedCall(4900, () => {
      this.scene.start('LevelCompleteScene', { level: this.levelNumber, stars: this.earnedStars });
    });
  }

  // Apre il Word Book mettendo il gioco in PAUSA (overlay). Alla chiusura riprende.
  openWordBook() {
    if (this.completing) return;
    if (this.sfx) this.sfx.click();
    this.scene.pause();
    this.scene.launch('WordBookScene', { returnTo: 'GameScene', resume: true });
  }

  update(time, delta) {
    this.player.update(delta);
    this.attacks.update(delta);
    this.updateShield(delta);
    // Pattuglia + magia dei nemici ancora vivi.
    this.enemyList.forEach((enemy) => {
      if (!enemy.active) return;
      enemy.patrol();
      // La bollicina-icona segue il nemico che pattuglia.
      if (enemy.iconBubble) {
        enemy.iconBubble.setPosition(enemy.x, enemy.y - enemy.displayHeight / 2 - 16);
      }
      if (enemy.castsMagic && !enemy.isDefeated) {
        enemy.castTimer -= delta;
        if (enemy.castTimer <= 0) {
          if (Math.abs(enemy.x - this.player.x) < 460) this.enemyCast(enemy);
          // A L2 sei "disarmato" contro la magia (né scudo né magia tua):
          // i gialli sparano MOLTO più lentamente. Dal L3 ritmo pieno.
          enemy.castTimer =
            this.levelNumber === 2 ? 4200 + Math.random() * 2200 : 2200 + Math.random() * 1400;
        }
      }
      if (enemy.archer && !enemy.isDefeated) {
        enemy.arrowTimer -= delta;
        if (enemy.arrowTimer <= 0) {
          if (Math.abs(enemy.x - this.player.x) < 520) this.enemyShootArrow(enemy);
          enemy.arrowTimer = 2400 + Math.random() * 1500;
        }
      }
    });
    this.updateEnemyShots(delta);
    this.updateArrows(delta);
    this.patrolVehicles();
    this.updateDroppers(delta);
    this.updateRhinos(delta);

    // Checkpoint: appena Captain supera la bandierina, la "attiva".
    if (this.checkpointX && !this.checkpointReached && this.player.x >= this.checkpointX) {
      this.reachCheckpoint();
    }
  }

  // Scudo: attivo mentre tieni premuto L, MA con una "batteria" limitata.
  //  - mentre è attivo, la carica scende; a 0 si BLOCCA (shieldLocked)
  //  - quando non è attivo, si ricarica; il blocco si toglie solo a carica PIENA
  // Così puoi tenerlo ~2s, poi devi aspettare ~2s: niente scudo perenne.
  updateShield(delta) {
    if (!this.hasShield) return;

    const wantShield = this.shieldKey.isDown || !!(this.touchState && this.touchState.shield);
    let active = false;
    if (wantShield && !this.shieldLocked && this.shieldEnergy > 0) {
      active = true;
      this.shieldEnergy = Math.max(0, this.shieldEnergy - delta);
      if (this.shieldEnergy === 0) {
        this.shieldLocked = true; // scarico: si blocca fino a ricarica completa
        active = false;
      }
    } else {
      // Ricarica quando non è in uso; sblocca solo a piena carica.
      this.shieldEnergy = Math.min(this.shieldMax, this.shieldEnergy + delta);
      if (this.shieldLocked && this.shieldEnergy >= this.shieldMax) this.shieldLocked = false;
    }
    this.shieldActive = active;

    // Scudo davanti a Captain, sul lato in cui guarda.
    if (active) {
      const dir = this.player.flipX ? -1 : 1;
      this.shieldSprite.setVisible(true);
      this.shieldSprite.x = this.player.x + dir * 26;
      this.shieldSprite.y = this.player.y;
      this.shieldSprite.setFlipX(dir < 0);
    } else {
      this.shieldSprite.setVisible(false);
    }

    // Barretta della carica sopra Captain: appare quando è attivo o non è pieno.
    const showBar = active || this.shieldEnergy < this.shieldMax;
    const bx = this.player.x - 21;
    const by = this.player.y - 46;
    this.shieldBarBg.setVisible(showBar).setPosition(this.player.x, by);
    this.shieldBarFill.setVisible(showBar).setPosition(bx, by);
    this.shieldBarFill.width = 40 * (this.shieldEnergy / this.shieldMax);
    // Blu quando usabile, rosso quando bloccato (in ricarica forzata).
    this.shieldBarFill.setFillStyle(this.shieldLocked ? 0xe0603a : 0x37e0ff);
  }

  // Scintilla di parata quando lo scudo respinge un proiettile.
  deflect(x, y) {
    if (this.sfx) this.sfx.tink();
    const spark = this.add.star(x, y, 6, 3, 8, 0xfff2b0).setDepth(52);
    this.tweens.add({ targets: spark, scale: 0, alpha: 0, duration: 220, onComplete: () => spark.destroy() });
  }

  // Un nemico lancia una magia MIRATA verso Captain.
  enemyCast(enemy) {
    const p = this.player;
    const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    // Proiettile più LENTO a L2 (si impara a schivare), pieno ritmo dal L3.
    const speed = this.levelNumber === 2 ? 150 : 210;
    const shot = this.add.star(enemy.x, enemy.y, 5, 5, 11, 0xb06bff).setDepth(50);
    const glow = this.add.star(enemy.x, enemy.y, 5, 8, 16, 0xd9b3ff).setAlpha(0.4).setDepth(49);
    shot.vx = Math.cos(angle) * speed;
    shot.vy = Math.sin(angle) * speed;
    shot.life = 2600;
    this.tweens.add({ targets: [shot, glow], angle: 360, duration: 600, repeat: -1 });
    this.enemyShots.push({ shot, glow });
    if (this.sfx) this.sfx.magic();
  }

  // Muove i proiettili nemici; se colpiscono Captain fanno danno.
  updateEnemyShots(delta) {
    const dt = delta / 1000;
    for (let i = this.enemyShots.length - 1; i >= 0; i--) {
      const s = this.enemyShots[i];
      s.shot.x += s.shot.vx * dt;
      s.shot.y += s.shot.vy * dt;
      s.glow.x = s.shot.x;
      s.glow.y = s.shot.y;
      s.shot.life -= delta;

      let hit = false;
      if (
        !this.player.isHurt &&
        Phaser.Geom.Intersects.RectangleToRectangle(s.shot.getBounds(), this.player.getBounds())
      ) {
        // Con lo scudo alzato la magia viene PARATA (niente danno); altrimenti colpisce.
        if (this.shieldActive) this.deflect(s.shot.x, s.shot.y);
        else this.player.takeDamage({ fromX: s.shot.x });
        hit = true;
      }

      if (
        hit ||
        s.shot.life <= 0 ||
        s.shot.y > GAME_HEIGHT + 40 ||
        s.shot.x < -40 ||
        s.shot.x > this.worldWidth + 40
      ) {
        s.shot.destroy();
        s.glow.destroy();
        this.enemyShots.splice(i, 1);
      }
    }
  }

  // Un arciere scocca una FRECCIA verso Captain con TRAIETTORIA AD ARCO (balistica).
  // A differenza della magia (linea retta), la freccia ha gravità: calcolo la velocità
  // iniziale per farla arrivare sul player in un tempo di volo T, così descrive un arco.
  enemyShootArrow(enemy) {
    const p = this.player;
    const ax = enemy.x;
    const ay = enemy.y - 6;
    const dx = p.x - ax;
    const dy = p.y - ay;
    const g = GRAVITY_Y; // la freccia "sente" la stessa gravità del mondo
    // Tempo di volo proporzionale alla distanza (arco più ampio da lontano).
    const dist = Math.hypot(dx, dy);
    const T = Phaser.Math.Clamp(dist / 260, 0.55, 1.35);
    const vx = dx / T;
    const vy = (dy - 0.5 * g * T * T) / T; // parte verso l'alto e ricade sul bersaglio
    const spr = this.add.image(ax, ay, 'arrow').setDepth(50);
    spr.vx = vx;
    spr.vy = vy;
    spr.life = 3200;
    spr.rotation = Math.atan2(vy, vx);
    this.arrows.push(spr);
    if (this.sfx) this.sfx.sword(); // "twang" secco dell'arco
  }

  // Muove le frecce con GRAVITÀ (arco); si orientano lungo la traiettoria. Colpiscono
  // il player, si conficcano al suolo o svaniscono a fine vita.
  updateArrows(delta) {
    const dt = delta / 1000;
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.vy += GRAVITY_Y * dt; // <-- l'arco: la gravità curva la traiettoria
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rotation = Math.atan2(a.vy, a.vx); // la punta guarda dove va
      a.life -= delta;

      let hit = false;
      if (
        !this.player.isHurt &&
        Phaser.Geom.Intersects.RectangleToRectangle(a.getBounds(), this.player.getBounds())
      ) {
        // Lo scudo para anche le frecce; senza scudo, la freccia colpisce.
        if (this.shieldActive) this.deflect(a.x, a.y);
        else this.player.takeDamage({ fromX: a.x });
        hit = true;
      }

      const hitGround = a.y >= this.floorTopY - 2;
      if (hit || hitGround || a.life <= 0 || a.x < -40 || a.x > this.worldWidth + 40) {
        a.destroy();
        this.arrows.splice(i, 1);
      }
    }
  }
}
