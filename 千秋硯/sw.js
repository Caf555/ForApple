// 離線快取：加入主畫面後，沒有網路也能玩
const CACHE = 'qqy-v3.2.1';
// 設定裡「下載全部圖片」存放的地方；版本更新時不刪，免得玩家要重新下載
const IMG_CACHE = 'qqy-img';
const FILES = [
  './', './index.html', './css/style.css', './manifest.webmanifest', './icon.svg',
  './js/main.js', './js/script.js', './js/state.js', './js/data.js', './js/ui.js', './js/audio.js',
  './js/battle.js', './js/debate.js', './js/runner.js', './js/hub.js', './js/walk.js',
  './content/序卷.txt', './content/卷一_大員.txt', './content/卷二_牧野.txt', './content/卷三_阿瑪納.txt', './content/卷四_雅典.txt', './content/卷五_羯陵伽.txt', './content/中章_書房.txt', './content/卷六_長安巴格達.txt', './content/卷七_佛羅倫斯.txt', './content/卷八_特諾奇提特蘭.txt', './content/卷九_戰壕.txt', './content/卷十_晴空.txt', './content/終卷_歸墟.txt', './content/夜話.txt',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => encodeURI(f)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// 先試網路（取得最新內容），失敗再用快取
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(async () => {
      const hit = await caches.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      // 離線時只存了 800 寬的大圖；畫面要 1600 寬的話，改給 800 寬的那一張
      if (/-1600\.webp$/.test(e.request.url)) {
        const small = await caches.match(e.request.url.replace(/-1600\.webp$/, '-800.webp'));
        if (small) return small;
      }
      return Response.error();
    })
  );
});
