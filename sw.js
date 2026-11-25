const CACHE = 'fire-love-pwa-v20';
const FILES = ['./', './index.html', './cards.json', './bonus.json', './cards-x.json', './cards-en.json', './bonus-en.json', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
// The page and the card data come from the network first, so an update shows on the next open;
// the cache is the fallback for offline. Icons and the QR script stay cache-first.
const fresh = url => url.pathname.endsWith('/') || /\.(html|json)$/.test(url.pathname);
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.endsWith('/ws')) return;
  const save = response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); } return response; };
  if (event.request.mode === 'navigate' || fresh(url)) {
    event.respondWith(fetch(event.request).then(save).catch(() =>
      caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(save)
    .catch(() => caches.match('./index.html'))));
});
