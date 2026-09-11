import { allAudioKeys, audioUrl, isVoiceLoading } from './VoiceLoader.js';

// audioWarmup: RISCALDA la cache offline del service worker con tutti gli MP3,
// piano piano e in sottofondo, così il gioco resta giocabile senza internet
// anche nei livelli non ancora visitati (promessa del PWA: "offline dopo la
// prima visita"). Con la voce "lazy" i file non passano più tutti dal boot,
// quindi qualcuno deve pur scaricarli una volta: questo modulo.
//
// Regole:
//  - solo se la pagina è controllata dal service worker (altrimenti i byte
//    scaricati non finirebbero in nessuna cache: spreco puro);
//  - mai con "risparmio dati" attivo;
//  - un file alla volta, con pause, e in attesa finché il gioco sta caricando
//    qualcosa che serve subito (la voce del livello ha la precedenza);
//  - i file già in cache si saltano (nessun download ripetuto tra sessioni).
//  - il download passa dal SW (cache-first), che lo mette in cache da solo.

let started = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function startAudioWarmup({ delayMs = 6000 } = {}) {
  if (started) return;
  started = true;
  try {
    if (!('serviceWorker' in navigator) || !('caches' in window)) return;
    const conn = navigator.connection;
    if (conn && conn.saveData) return;
    navigator.serviceWorker.ready
      .then(() => {
        const go = () => setTimeout(() => runWarmup().catch(() => {}), delayMs);
        if (navigator.serviceWorker.controller) go();
        else navigator.serviceWorker.addEventListener('controllerchange', go, { once: true });
      })
      .catch(() => {});
  } catch (e) {
    // Il riscaldamento è un extra: mai rompere il gioco.
  }
}

async function runWarmup() {
  const keys = allAudioKeys();
  let failures = 0;
  for (const key of keys) {
    const url = new URL(audioUrl(key), document.baseURI).href;
    try {
      if (await caches.match(url)) continue; // già offline-ready
      while (isVoiceLoading() || document.hidden) await sleep(500);
      const res = await fetch(url, { priority: 'low' });
      if (!res.ok) throw new Error(String(res.status));
      await res.blob(); // consuma il corpo: chiude la connessione pulita
      failures = 0;
      await sleep(120);
    } catch (e) {
      // Offline o errore: dopo 3 di fila si lascia perdere per questa sessione.
      failures += 1;
      if (failures >= 3) return;
      await sleep(1500);
    }
  }
}
