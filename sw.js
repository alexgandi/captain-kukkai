// Service Worker: rende il gioco GIOCABILE OFFLINE dopo la prima visita.
// Strategie per tipo di risorsa:
//  - index.html (navigazioni): PRIMA la rete (così gli aggiornamenti arrivano),
//    cache come riserva quando sei offline.
//  - /assets/ (js con hash nel nome): cache-first — un file con quell'hash non
//    cambia mai, inutile riscaricarlo.
//  - /audio/ e il resto (manifest, icone): "stale-while-revalidate" — risposta
//    subito dalla cache, e intanto si aggiorna in background.
// La VERSIONE va alzata quando serve buttare le cache vecchie su tutti i
// dispositivi (l'activate elimina ogni cache con nome diverso da questo).
const CACHE = 'captain-kukkai-v3'; // v3: fullscreen dinamico + restyle UI

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // solo le nostre risorse

  // Navigazioni (index.html): rete prima, cache di riserva.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Bundle con hash: cache-first (immutabili).
  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Audio, icone, manifest: cache subito + aggiornamento in background.
  e.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => hit); // offline: va bene la cache
      return hit || refresh;
    })
  );
});
