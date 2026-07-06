// DialoguePortrait: componente RIUTILIZZABILE per i momenti "parlati".
// Mostra un ritratto + un riquadro di testo in basso, e fa scorrere una
// sequenza di battute (tap/click o SPAZIO/INVIO per avanzare).
// Lo useremo in IntroScene, LevelCompleteScene e RescueScene.
//
// opts: { portraitKey, name, speak(bool), audio(AudioManager) }
export default class DialoguePortrait {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.portraitKey = opts.portraitKey;
    this.name = opts.name || '';
    this.speak = opts.speak || false;
    this.audio = opts.audio || null;

    this.lines = [];
    this.index = 0;
    this.onComplete = null;
    this.active = false;

    this.build();
    this.container.setVisible(false); // nascosto finché non parte
  }

  build() {
    const scene = this.scene;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const margin = 20;
    const panelH = 150;
    const panelY = H - panelH - margin;

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(5000);

    // Pannello scuro semi-trasparente con bordo caldo.
    const g = scene.add.graphics();
    g.fillStyle(0x1c1030, 0.88);
    g.fillRoundedRect(margin, panelY, W - margin * 2, panelH, 16);
    g.lineStyle(3, 0xffd166, 1);
    g.strokeRoundedRect(margin, panelY, W - margin * 2, panelH, 16);

    // Ritratto a sinistra.
    const portraitSize = 118;
    this.portrait = scene.add
      .image(margin + 18 + portraitSize / 2, panelY + panelH / 2, this.portraitKey)
      .setDisplaySize(portraitSize, portraitSize);

    const textLeft = margin + 18 + portraitSize + 24;

    // Nome del personaggio.
    this.nameText = scene.add.text(textLeft, panelY + 16, this.name, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffd166',
      fontStyle: 'bold',
    });

    // Battuta corrente (va a capo da sola).
    this.lineText = scene.add.text(textLeft, panelY + 52, '', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      wordWrap: { width: W - margin - textLeft - 30 },
    });

    // Freccia "tap per continuare" (lampeggia).
    this.hint = scene.add
      .text(W - margin - 22, panelY + panelH - 24, '▶', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffd166',
      })
      .setOrigin(1, 0.5);
    scene.tweens.add({ targets: this.hint, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.container.add([g, this.portrait, this.nameText, this.lineText, this.hint]);

    // Riferimento all'handler legato a `this` (per aggiungere/togliere l'input).
    this._advance = () => this.advance();
  }

  // Avvia la sequenza di battute. onComplete parte dopo l'ultima.
  start(lines, onComplete) {
    this.lines = lines;
    this.index = 0;
    this.onComplete = onComplete;
    this.active = true;
    this.container.setVisible(true);

    // Input per avanzare: click/tap, SPAZIO o INVIO.
    this.scene.input.on('pointerdown', this._advance);
    this.scene.input.keyboard.on('keydown-SPACE', this._advance);
    this.scene.input.keyboard.on('keydown-ENTER', this._advance);

    this.showLine(0);
  }

  showLine(i) {
    const line = this.lines[i];
    this.lineText.setText(line);
    // La voce (inglese) è opzionale.
    if (this.speak && this.audio) this.audio.speak(line);
  }

  advance() {
    if (!this.active) return;
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.finish();
    } else {
      this.showLine(this.index);
    }
  }

  finish() {
    this.active = false;
    this.scene.input.off('pointerdown', this._advance);
    this.scene.input.keyboard.off('keydown-SPACE', this._advance);
    this.scene.input.keyboard.off('keydown-ENTER', this._advance);
    if (this.onComplete) this.onComplete();
  }

  // Nasconde il pannello (utile quando il dialogo lascia spazio ad altro).
  hide() {
    this.container.setVisible(false);
  }
}
