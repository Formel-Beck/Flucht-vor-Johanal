// Service Worker: speichert das Spiel auf dem Handy, damit es auch ohne Internet läuft.
// Bei jeder neuen Version die Nummer erhöhen – dann aktualisiert sich die App von selbst.
const VERSION = 'flucht-v4';
const FILES = ['./', 'index.html', 'chars.js', 'levels.js', 'audio.js', 'game.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(VERSION).then(c => Promise.all(FILES.map(f => fetch(f, { cache: 'reload' }).then(r => c.put(f, r)))))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request.mode === 'navigate' ? new Request(e.request.url.split('?')[0]) : e.request;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
