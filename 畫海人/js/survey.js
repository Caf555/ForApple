// 測繪小遊戲：用手指沿著淡淡的海岸線描一遍，描得越準，測繪得越好
import { el, $ } from './ui.js';
import { ISLANDS, SEAS } from './islands.js';

// 準確度的要求：難度越高、海域越後面，筆要離海岸線越近才算數（地圖是 100×100）
export function surveyTolerance(diff, place) {
  const base = { 悠閒: 6.5, 標準: 5, 困難: 4 }[diff] ?? 5;
  const sea = Math.max(0, SEAS.indexOf((ISLANDS[place] || {}).sea));
  return Math.max(2.8, base - sea * 0.35);
}

const NS = 'http://www.w3.org/2000/svg';

function coastline() {
  // 從左到右，起伏不定的一條海岸線
  const pts = [];
  let y = 30 + Math.random() * 40;
  for (let x = 8; x <= 92; x += 12) { pts.push([x, y]); y = Math.max(18, Math.min(82, y + (Math.random() - 0.5) * 34)); }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    d += ` C ${x0 + 6} ${y0} ${x1 - 6} ${y1} ${x1} ${y1}`;
  }
  return d;
}

export function survey(ctx, place) {
  return new Promise(res => {
    const box = el('div', { class: 'survey' });
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('class', 'sv-map');
    const mk = (tag, a) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); svg.append(n); return n; };
    mk('rect', { x: 1, y: 1, width: 98, height: 98, rx: 4, class: 'sv-paper' });
    const d = coastline();
    // 海的那一邊：一片淡淡的藍
    mk('path', { d: d + ' L 92 99 L 8 99 Z', class: 'sv-sea' });
    const guide = mk('path', { d, class: 'sv-guide' });
    const start = guide.getPointAtLength(0);
    mk('circle', { cx: start.x, cy: start.y, r: 3, class: 'sv-start' });
    const tol = surveyTolerance(ctx.g && ctx.g.diff, place);
    const strict = tol <= 3.6 ? '這裡的海岸線要描得很準。' : tol <= 4.6 ? '要描得準一點才算數。' : '';
    const msg = el('p', { class: 'sv-msg' }, '從綠色的點開始，沿著淡淡的海岸線描下去。可以描兩次，取比較好的那一次。' + strict);
    const scoreEl = el('div', { class: 'sv-score' }, '');
    const done = el('button', { class: 'btn primary', disabled: true, onclick: () => { box.remove(); res(best); } }, '畫進書裡');
    box.append(el('h2', {}, `測繪：${place}`), svg, scoreEl, msg, el('div', { class: 'btns' }, done));
    $('layer').append(box);
    let best = 0, tries = 0, pts = [], live = null;
    const len = guide.getTotalLength();
    const samples = []; for (let i = 0; i <= 40; i++) { const p = guide.getPointAtLength(len * i / 40); samples.push([p.x, p.y]); }
    const fine = []; for (let i = 0; i <= 160; i++) { const p = guide.getPointAtLength(len * i / 160); fine.push([p.x, p.y]); }
    const toSvg = e => { const m = svg.getScreenCTM().inverse(); const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return [p.x, p.y]; };
    svg.addEventListener('pointerdown', e => {
      if (tries >= 2) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (_) { /* 不支援就算了 */ }
      pts = [toSvg(e)];
      if (live) live.remove();
      live = mk('polyline', { points: pts.join(' '), class: 'sv-ink' });
    });
    svg.addEventListener('pointermove', e => { if (!live) return; pts.push(toSvg(e)); live.setAttribute('points', pts.map(p => p.join(',')).join(' ')); if (pts.length % 4 === 0) ctx.audio.sfx('pen'); });
    const up = () => {
      if (!live || pts.length < 2) return;
      const near = (x, y, r) => pts.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 <= r * r);
      // 描完整了沒有：海岸線上的點，附近有沒有描到
      const cover = samples.filter(([x, y]) => near(x, y, tol * 1.2)).length / samples.length;
      // 描得準不準：每一筆離海岸線平均多遠（難度越高，要求越近）
      const gap = pts.reduce((sum, [a, b]) => sum + Math.sqrt(Math.min(...fine.map(([x, y]) => (a - x) ** 2 + (b - y) ** 2))), 0) / pts.length;
      const acc = Math.max(0, Math.min(1, 1 - (gap - tol * 0.15) / (tol * 0.55)));
      const score = Math.round(100 * cover * (0.35 + 0.65 * acc));
      tries++;
      best = Math.max(best, score);
      live.setAttribute('class', 'sv-ink done');
      live = null;
      scoreEl.textContent = `這一次：${score} 分　最好：${best} 分`;
      msg.textContent = tries < 2 ? (score >= 80 ? '畫得很好！也可以再描一次。' : '可以再描一次。') : '描完了。';
      done.disabled = false;
      ctx.audio.sfx(score >= 80 ? 'item' : 'pen');
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
  });
}
