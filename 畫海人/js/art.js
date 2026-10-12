// 生好的圖（img/manifest.json）：怪物、裝備、物品、港口與島嶼的遠景、海圖。
// 還沒有圖的東西，照舊用文字顯示，所以可以一批一批畫、一批一批上線。
import { el } from './ui.js';

let man = null;
let loading = null;
export function loadArt() {
  if (man) return Promise.resolve(man);
  return loading || (loading = fetch('img/manifest.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))
    .then(m => (man = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, new Set(v)])))));
}

// 生圖清單的名稱前綴
const PREFIX = { enemy: '怪_', gear: '裝_', item: '物_', place: '景_', chart: '圖_' };
const FOLDER = { chart: 'place' };
export function hasArt(kind, name) { const f = FOLDER[kind] || kind; return !!(man && man[f] && man[f].has(PREFIX[kind] + name)); }

// 小圖示：怪物（戰鬥）、裝備、物品。沒有圖就回傳 null
export function icon(kind, name, cls = '') {
  if (!hasArt(kind, name)) return null;
  const im = el('img', { class: 'pic pic-' + kind + (cls ? ' ' + cls : ''), src: encodeURI(`img/${kind}/${PREFIX[kind]}${name}.webp`), alt: '', loading: 'lazy' });
  im.onerror = () => im.remove();
  return im;
}

// 橫幅：港口、設施、島嶼的遠景（place）或海圖（chart）。沒有圖就回傳 null
export function banner(kind, name, cls = '') {
  if (!hasArt(kind, name)) return null;
  const w = Math.min(innerWidth, 900) * (devicePixelRatio || 1) > 900 ? 1600 : 800;
  const im = el('img', { src: encodeURI(`img/place/${PREFIX[kind]}${name}-${w}.webp`), alt: '' });
  const box = el('div', { class: 'banner banner-' + kind + (cls ? ' ' + cls : '') }, im);
  im.onerror = () => box.remove();
  return box;
}
