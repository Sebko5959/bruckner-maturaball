// Service Worker für den Maturaball Orga-Hub: hält die App-Hülle offline bereit.
// Muss im selben Ordner wie index.html liegen. Daten laufen weiter über den Worker-API-Aufruf in index.html.
const C = 'orga-hub-v1';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'index.html'])).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Netzwerk zuerst (neue Version, sobald online), sonst Kopie aus dem Cache
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(r).then(m => m || caches.match('index.html')))
  );
});
