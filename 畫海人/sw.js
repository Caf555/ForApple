// 離線快取：加入主畫面後，沒有網路也能玩
const CACHE = 'hhr-m5-0.6';
const FILES = ['./', './index.html', './css/style.css', './manifest.webmanifest', './icon.svg',
  './js/main.js', './js/data.js', './js/state.js', './js/ui.js', './js/audio.js', './js/battle.js', './js/explore.js', './js/survey.js', './js/puzzle.js', './js/islands.js', './js/port.js', './js/cinema.js', './js/training.js', './js/story.js', './js/gamble.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(encodeURI(f), { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 同一個網站的檔案：每次都跟伺服器確認有沒有新版（不要用瀏覽器暫存的舊檔，免得新舊檔案混在一起）
  const same = new URL(e.request.url).origin === location.origin;
  e.respondWith((same ? fetch(e.request.url, { cache: 'no-cache' }) : fetch(e.request)).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return r; }).catch(() => caches.match(e.request)));
});
