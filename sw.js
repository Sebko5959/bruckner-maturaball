// Service Worker für den Maturaball Orga-Hub: hält die App-Hülle offline bereit.
// Muss im selben Ordner wie index.html liegen. Daten laufen weiter über den Worker-API-Aufruf in index.html.
const C = 'orga-hub-v2';
const SHELL = ['./', 'index.html'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netzwerk zuerst (neue Version, sobald online), sonst Kopie aus dem Cache.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;

  let u;
  try { u = new URL(r.url); } catch { return; }
  if (u.origin !== location.origin) return;
  // API-Aufrufe niemals cachen – auch nicht, wenn die Seite später direkt
  // vom Worker ausgeliefert wird.
  if (/\/state\/?$/.test(u.pathname)) return;

  e.respondWith(
    fetch(r).then(res => {
      if (res.ok && res.type === 'basic') {
        const cp = res.clone();
        caches.open(C).then(c => c.put(r, cp)).catch(() => {});
      }
      return res;
    }).catch(async () => {
      const hit = await caches.match(r);
      if (hit) return hit;
      if (r.mode === 'navigate') {
        const shell = (await caches.match('index.html')) || (await caches.match('./'));
        if (shell) return shell;
      }
      // Nie `undefined` zurückgeben, sonst schlägt die Navigation hart fehl.
      return new Response('Offline – bitte später erneut versuchen.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })
  );
});
