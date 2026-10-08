// 離線快取：加入主畫面後，沒有網路也能玩
const CACHE = 'hhr-m1-0.4';
const FILES = ['./', './index.html', './css/style.css', './manifest.webmanifest', './icon.svg',
  './js/main.js', './js/data.js', './js/state.js', './js/ui.js', './js/audio.js', './js/battle.js', './js/explore.js', './js/survey.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => encodeURI(f)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return r; }).catch(() => caches.match(e.request)));
});
