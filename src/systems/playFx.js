// playFx: suona un effetto MP3 "vero" (ElevenLabs) se è in cache, altrimenti
// esegue il fallback (il vecchio suono sintetico). Così il gioco funziona
// anche se un file audio manca o non è ancora caricato.
export function playFx(scene, key, volume = 0.5, fallback = null) {
  if (scene.cache.audio.exists(key)) {
    scene.sound.play(key, { volume });
  } else if (fallback) {
    fallback();
  }
}
