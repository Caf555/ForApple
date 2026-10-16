// 動手玩的小遊戲（第三批：序卷、卷三、卷五、卷八、中章、終卷）
// 寫法和 minigames.js 一樣：每一個玩法都是 T => void，T 是 debate.js 的 Translate
// 種類一覽：
//   補紙（組合）：轉一轉補紙，找出和蟲洞一樣形狀的那一片
//   招牌（反應）：招牌上的字一塊一塊變淡，在消失前點它
//   讀向（規則）：聖書體要「迎著臉讀」，照順序點出名字裡的符號
//   記名（記憶）：先記住每個人的名字，再在他被帶走以前叫出來
//   水漂（時機）：先抓角度、再抓力道，石頭跳越多下越好
//   挖井（推理）：每挖一格，會知道旁邊有幾處水；找出所有的水脈
//   拓片（平衡）：墨包一下一下拍，整張要拍得一樣深
//   接唸（記憶）：老王唸到一半停住，接出下一個名字
//   曆輪（推理）：用「過一天、過 13 天、過 20 天」，把日子轉到要的那一天
import { el } from './ui.js';
import { svg, rnd, shuffle, D } from './minigames.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

export const TIPS3 = {
  補紙: '找出形狀一樣的補紙', 招牌: '在字消失前點它', 讀向: '迎著臉讀聖書體', 記名: '記住名字再叫出來', 水漂: '抓角度與力道',
  挖井: '推出水脈在哪裡', 拓片: '把整張拍得一樣深', 接唸: '接出下一個名字', 曆輪: '把日子轉到那一天',
};

// ═════════ 補紙：轉一轉，找出形狀一樣的補紙 ═════════
const norm = cells => { const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1])); return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
const key = cells => norm(cells).map(c => c.join(',')).join(' ');
const turn = cells => norm(cells.map(([x, y]) => [-y, x]));
const SHAPES = {
  L: [[0, 0], [0, 1], [0, 2], [1, 2]], T: [[0, 0], [1, 0], [2, 0], [1, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[1, 0], [1, 1], [1, 2], [0, 2]], 角: [[0, 0], [1, 0], [0, 1]], 長: [[0, 0], [1, 0], [2, 0]], 凸: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], 階: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
};
const drawShape = (cells, cls, size = 14) => {
  const n = norm(cells), w = Math.max(...n.map(c => c[0])) + 1, h = Math.max(...n.map(c => c[1])) + 1;
  const s = svg('svg', { viewBox: `0 0 ${w * size} ${h * size}`, class: cls, width: w * size * 2.2, height: h * size * 2.2 });
  for (const [x, y] of n) svg('rect', { x: x * size + 0.5, y: y * size + 0.5, width: size - 1, height: size - 1, rx: 1.5 }, s);
  return s;
};
function patch(T) {
  const d = T.d;
  T.header();
  const rounds = d.holes.slice(0, D(T, [2, 3, d.holes.length]));
  const maxMiss = D(T, [9, 4, 2]);
  let r = 0, miss = 0, sel = -1, tray = [];
  const prog = el('div', { class: 'mg-progress' });
  const hole = el('div', { class: 'pt-hole' });
  const trayBox = el('div', { class: 'pt-tray' });
  const btns = el('div', { class: 'row-btns mx-row' },
    el('button', { class: 'btn', onclick: () => { if (sel < 0) return; tray[sel] = turn(tray[sel]); T.sfx('tap'); draw(); } }, '轉一轉'),
    el('button', { class: 'btn primary', onclick: () => fit() }, '補上去'));
  T.body.append(prog, hole, trayBox, btns);
  const load = () => {
    const want = SHAPES[rounds[r]];
    const others = shuffle(Object.keys(SHAPES).filter(k => k !== rounds[r] && SHAPES[k].length === want.length)).slice(0, D(T, [1, 2, 3]));
    tray = shuffle([want, ...others.map(k => SHAPES[k])]).map(c => { let x = c; for (let i = rnd(4); i > 0; i--) x = turn(x); return x; });
    sel = -1; draw();
  };
  const draw = () => {
    hole.innerHTML = '';
    hole.append(el('small', {}, d.holeLabel || '紙上的蟲洞'), drawShape(SHAPES[rounds[r]], 'pt-shape hole' + (T.diff === 0 ? ' outline' : ''), 16));
    trayBox.innerHTML = '';
    tray.forEach((c, i) => trayBox.appendChild(el('button', { class: 'pt-piece' + (sel === i ? ' sel' : ''), onclick: () => { sel = i; T.sfx('tap'); draw(); } }, drawShape(c, 'pt-shape', 12))));
    prog.textContent = `第 ${r + 1} / ${rounds.length} 個洞・補錯 ${miss} 次（最多 ${maxMiss} 次）` + (sel < 0 ? '・先點一片補紙' : '');
  };
  const fit = () => {
    if (sel < 0) return;
    if (key(tray[sel]) === key(SHAPES[rounds[r]])) {
      T.sfx('good'); hole.classList.add('done');
      T.later(600, () => { hole.classList.remove('done'); r++; if (r >= rounds.length) return T.finish(true, `補好了 ${rounds.length} 個洞・補錯 ${miss} 次`, miss === 0); load(); });
      return;
    }
    miss++; T.sfx('fail');
    trayBox.children[sel].classList.add('bad'); T.later(400, () => draw());
    if (miss > maxMiss) T.later(500, () => T.finish(false, `補錯 ${miss} 次`));
  };
  load();
  T.solveFn = () => T.finish(true, `補好了 ${rounds.length} 個洞`);
}

// ═════════ 招牌：在字消失前點它 ═════════
function signs(T) {
  const d = T.d;
  T.header();
  const N = D(T, [8, 10, 12]);
  const fade = D(T, [4.2, 3.2, 2.4]);
  const gap = D(T, [1.6, 1.2, 0.9]);
  const need = Math.ceil(N * 0.7);
  let started = 0, saved = 0, lost = 0, ended = false;
  const prog = el('div', { class: 'mg-progress' });
  const wall = el('div', { class: 'sg-wall' });
  const items = d.signs.map(t => ({ t, life: 1, fading: false }));
  items.forEach((it, i) => { it.el = el('button', { class: 'sg-sign', onclick: () => tap(i) }, it.t); wall.appendChild(it.el); });
  T.body.append(prog, wall);
  const status = () => { prog.textContent = `留住 ${saved} 塊・消失 ${lost} 塊（要留住 ${need} 塊）`; };
  const tap = i => {
    const it = items[i];
    if (!it.fading || ended) return;
    it.fading = false; it.life = 1; saved++; T.sfx('ink');
    it.el.classList.remove('fading'); it.el.classList.add('saved'); T.later(400, () => it.el.classList.remove('saved'));
    status(); check();
  };
  const check = () => { if (saved + lost >= N && !ended) { ended = true; T.later(500, () => T.finish(saved >= need, `留住 ${saved} / ${N} 塊招牌`, lost === 0)); } };
  T.every(gap * 1000, () => {
    if (started >= N || ended) return;
    const free = items.filter(it => !it.fading);
    if (!free.length) return;
    const it = free[rnd(free.length)]; it.fading = true; it.life = 1; started++;
    it.el.classList.add('fading');
  });
  let last = performance.now();
  T.frame(now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const it of items) {
      if (!it.fading) { it.el.style.opacity = 1; continue; }
      it.life -= dt / fade;
      it.el.style.opacity = Math.max(0.05, it.life);
      if (it.life <= 0) { it.fading = false; it.life = 1; lost++; T.sfx('fail'); it.el.classList.remove('fading'); it.el.classList.add('lost'); T.later(600, () => it.el.classList.remove('lost')); status(); check(); }
    }
  });
  status();
  T.solveFn = () => { ended = true; T.finish(true, `留住 ${N} / ${N} 塊招牌`); };
  T.signsAuto = () => { const loop = () => { if (ended) return; items.forEach((it, i) => { if (it.fading && it.life < 0.6) tap(i); }); setTimeout(loop, 100); }; loop(); };
}

// ═════════ 讀向：迎著臉讀 ═════════
function reading(T) {
  const d = T.d;
  T.header();
  const rounds = d.rounds.slice(0, D(T, [2, d.rounds.length, d.rounds.length]));
  const maxMiss = D(T, [5, 3, 1]);
  let r = 0, miss = 0, next = 0, dir = 'L';
  const prog = el('div', { class: 'mg-progress' });
  const frame = el('div', { class: 'rd-cart' });
  const hint = el('p', { class: 'muted small' });
  T.body.append(prog, frame, hint);
  const load = () => {
    const rd = rounds[r];
    dir = Math.random() < 0.5 ? 'L' : 'R';
    next = 0;
    // 依每一欄的數量排版；從開始的那一邊排起
    const cols = []; let k = 0;
    for (const n of rd.cols) { cols.push(rd.signs.slice(k, k + n).map((s, j) => ({ ...s, idx: k + j }))); k += n; }
    if (dir === 'R') cols.reverse();
    frame.innerHTML = '';
    frame.classList.toggle('rtl', dir === 'R');
    for (const c of cols) frame.appendChild(el('div', { class: 'rd-col' }, ...c.map(s => el('button', { class: 'rd-sign', 'data-i': s.idx, onclick: e => tap(s.idx, e.currentTarget) },
      s.face ? el('i', { class: 'rd-face' }, dir === 'L' ? '◀' : '▶') : null, el('b', {}, s.t)))));
    hint.textContent = T.diff === 0 ? `臉朝${dir === 'L' ? '左' : '右'}，所以從${dir === 'L' ? '左' : '右'}邊開始讀；同一欄裡，先讀上面。` : (d.hint || '有臉的符號（◀ ▶ 是臉朝的方向）朝哪邊，就從哪邊開始讀；同一欄裡，先讀上面。');
    prog.textContent = `第 ${r + 1} / ${rounds.length} 個名字：${rd.name}・讀錯 ${miss} 次（最多 ${maxMiss} 次）`;
  };
  const tap = (i, b) => {
    if (b.classList.contains('done')) return;
    if (i !== next) { miss++; T.sfx('fail'); b.classList.add('bad'); T.later(400, () => b.classList.remove('bad')); prog.textContent = `不是這一個。・讀錯 ${miss} 次（最多 ${maxMiss} 次）`; if (miss > maxMiss) T.later(400, () => T.finish(false, `讀錯 ${miss} 次`)); return; }
    b.classList.add('done'); b.dataset.n = next + 1; next++; T.sfx('tap');
    if (next >= rounds[r].signs.length) {
      T.sfx('good');
      prog.textContent = `${rounds[r].name}：${rounds[r].reading}`;
      T.later(1200, () => { r++; if (r >= rounds.length) return T.finish(true, `讀出 ${rounds.length} 個名字・讀錯 ${miss} 次`, miss === 0); load(); });
    }
  };
  load();
  T.solveFn = async () => { while (r < rounds.length) { const rr = r; for (let i = 0; i < rounds[rr].signs.length; i++) tap(i, frame.querySelector(`[data-i="${i}"]`)); await wait(1300); } };
}

// ═════════ 記名：先記住，再叫出來 ═════════
function names(T) {
  const d = T.d;
  T.header();
  const people = shuffle(d.people).slice(0, D(T, [5, 6, d.people.length]));
  const sec = D(T, [16, 12, 9]);
  const answer = D(T, [0, 8, 5]);
  const N = people.length, need = Math.ceil(N * 0.7);
  let i = 0, right = 0, order = shuffle(people), shown = 0, locked = false;
  const prog = el('div', { class: 'mg-progress' });
  const list = el('div', { class: 'pr-list' }, ...people.map(p => el('div', { class: 'pr-row' }, el('span', {}, p.who), el('b', {}, p.name))));
  const ready = el('button', { class: 'btn primary', onclick: () => begin() }, '記好了');
  T.body.append(prog, list, ready);
  let left = sec;
  prog.textContent = `${d.memo || '記住每一個人的名字'}（${left} 秒）`;
  const tick = T.every(1000, () => { left--; prog.textContent = `${d.memo || '記住每一個人的名字'}（${left} 秒）`; if (left <= 0) begin(); });
  const who = el('div', { class: 'mg-q' });
  const timer = el('div', { class: 'sr-timer' }, el('i'));
  const opts = el('div', { class: 'mg-opts' });
  let began = false;
  function begin() {
    if (began) return; began = true;
    clearInterval(tick); list.remove(); ready.remove();
    T.body.append(who, ...(answer ? [timer] : []), opts);
    ask();
  }
  const ask = () => {
    if (i >= N) return T.finish(right >= need, `叫出 ${right} / ${N} 個名字`, right === N);
    const p = order[i];
    who.textContent = (d.ask || '被帶走的是：') + p.who;
    opts.innerHTML = '';
    shuffle([p.name, ...shuffle(people.filter(x => x !== p).map(x => x.name)).slice(0, 3)]).forEach(n => opts.appendChild(el('button', { class: 'btn mg-opt', onclick: e => pick(n, e.currentTarget) }, n)));
    prog.textContent = `第 ${i + 1} / ${N} 個・叫對 ${right}（要 ${need} 個）`;
    shown = performance.now(); locked = false;
  };
  const pick = (n, b) => {
    if (locked) return; locked = true;
    const p = order[i], ok = n === p.name;
    if (ok) right++;
    T.sfx(ok ? 'item' : 'fail');
    if (b) b.classList.add(ok ? 'right' : 'wrong');
    if (!ok) [...opts.children].find(x => x.textContent === p.name)?.classList.add('right');
    i++; T.later(800, ask);
  };
  if (answer) T.frame(now => { if (!began || locked || i >= N) return; const f = 1 - (now - shown) / 1000 / answer; timer.firstChild.style.width = Math.max(0, f) * 100 + '%'; if (f <= 0) pick(null, null); });
  T.solveFn = async () => { begin(); while (i < N) { pick(order[i].name, null); await wait(850); } };
}

// ═════════ 水漂：先抓角度，再抓力道 ═════════
function skip(T) {
  const d = T.d;
  T.header();
  const N = 3, need = D(T, [8, 12, 15]);
  const speed = D(T, [0.7, 1, 1.35]);
  let throwN = 0, total = 0, phase = 'angle', a = 0, p = 0, t0 = performance.now(), busy = false;
  const prog = el('div', { class: 'mg-progress' });
  const box = svg('svg', { viewBox: '0 0 300 140', class: 'sk-svg' });
  svg('rect', { x: 0, y: 0, width: 300, height: 140, class: 'sk-sky' }, box);
  svg('rect', { x: 0, y: 92, width: 300, height: 48, class: 'sk-water' }, box);
  const hand = svg('line', { x1: 24, y1: 88, x2: 60, y2: 88, class: 'sk-aim' }, box);
  const path = svg('path', { class: 'sk-path' }, box);
  const dots = svg('g', {}, box);
  const meter = el('div', { class: 'pp-meter' }, el('b', { style: { left: '75%', width: '20%' } }), el('i'));
  const msg = el('p', { class: 'mg-q small' });
  const btn = el('button', { class: 'btn primary mg-tap', onclick: () => press() }, '丟');
  T.body.append(prog, box, meter, msg, btn);
  const status = () => { prog.textContent = `第 ${Math.min(throwN + 1, N)} / ${N} 顆・一共跳了 ${total} 下（要 ${need} 下）`; msg.textContent = phase === 'angle' ? (d.angleText || '先抓角度：手臂放低一點，貼著水面最好。') : (d.powerText || '再抓力道：越用力越好，可是太用力會直接沉下去。'); meter.style.visibility = phase === 'power' ? 'visible' : 'hidden'; };
  T.frame(now => {
    if (busy) return;
    const s = (now - t0) / 1000 * speed;
    if (phase === 'angle') { a = 45 * (0.5 - 0.5 * Math.cos(s * 2.4)); const rad = a * Math.PI / 180; hand.setAttribute('x2', 24 + 40 * Math.cos(rad)); hand.setAttribute('y2', 88 - 40 * Math.sin(rad)); }
    else { p = 0.5 - 0.5 * Math.cos(s * 3.2); meter.lastChild.style.left = p * 100 + '%'; }
  });
  const press = () => {
    if (busy) return;
    if (phase === 'angle') { phase = 'power'; t0 = performance.now(); status(); return; }
    busy = true;
    const qa = Math.max(0, 1 - Math.abs(a - 15) / 15);
    const qp = p > 0.95 ? 0.2 : p >= 0.75 ? 1 : p * 1.1;
    const n = Math.max(0, Math.round(1 + 9 * qa * qp));
    total += n; throwN++;
    // 畫出石頭跳過的路線
    let x = 30, dd = '', w = 34;
    dots.innerHTML = '';
    dd = `M30 92`;
    for (let k = 0; k < n; k++) { const x2 = x + w; dd += ` Q${(x + x2) / 2} ${92 - w * 0.6} ${x2} 92`; svg('circle', { cx: x2, cy: 92, r: 3, class: 'sk-dot' }, dots); x = x2; w *= 0.82; }
    path.setAttribute('d', dd);
    T.sfx(n >= 5 ? 'good' : n ? 'tap' : 'fail');
    msg.textContent = n ? `跳了 ${n} 下！` : '咚。直接沉下去了。';
    T.later(1300, () => {
      busy = false; phase = 'angle'; t0 = performance.now(); path.setAttribute('d', ''); dots.innerHTML = '';
      if (throwN >= N) return T.finish(total >= need, `三顆石頭，一共跳了 ${total} 下`, total >= 27);
      status();
    });
  };
  status();
  T.solveFn = () => T.finish(true, `三顆石頭，一共跳了 ${need + 3} 下`);
}

// ═════════ 挖井：推出水脈在哪裡 ═════════
function wells(T) {
  const d = T.d;
  T.header();
  const n = D(T, [5, 6, 6]);
  const K = D(T, [3, 3, 4]);
  const limit = D(T, [16, 12, 10]);
  const water = new Set();
  while (water.size < K) water.add(rnd(n) + ',' + rnd(n));
  const dug = new Map();
  let digs = 0, found = 0, ended = false;
  const prog = el('div', { class: 'mg-progress' });
  const board = el('div', { class: 'wl-board', style: { gridTemplateColumns: `repeat(${n}, 1fr)` } });
  T.body.append(prog, board, el('p', { class: 'muted small' }, d.help || '點一格挖下去。沒有水的話，會出現一個數字：旁邊八格裡有幾處水。'));
  const around = (x, y) => { let c = 0; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && water.has((x + dx) + ',' + (y + dy))) c++; return c; };
  const draw = () => {
    board.innerHTML = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const k = x + ',' + y, v = dug.get(k);
      board.appendChild(el('button', { class: 'wl-c' + (v === 'w' ? ' water' : v != null ? ' dry' : ''), 'data-x': x, 'data-y': y, disabled: v != null || ended, onclick: () => dig(x, y) }, v === 'w' ? '水' : v != null ? String(v) : ''));
    }
    prog.textContent = `找到 ${found} / ${K} 處水脈・還可以挖 ${limit - digs} 次`;
  };
  const dig = (x, y) => {
    const k = x + ',' + y;
    if (dug.has(k) || ended) return;
    digs++;
    if (water.has(k)) { dug.set(k, 'w'); found++; T.sfx('good'); } else { dug.set(k, around(x, y)); T.sfx('tap'); }
    draw();
    if (found >= K) { ended = true; return T.later(600, () => T.finish(true, `找到所有的水脈・挖了 ${digs} 次`, digs <= K + 3)); }
    if (digs >= limit) { ended = true; T.later(600, () => T.finish(false, `挖了 ${digs} 次，找到 ${found} 處`)); }
  };
  draw();
  T.solveFn = () => { for (const k of water) { const [x, y] = k.split(',').map(Number); dig(x, y); } };
}

// ═════════ 拓片：整張拍得一樣深 ═════════
function rubbing(T) {
  const d = T.d;
  T.header();
  const W = 5, H = 4, lo = 1.4, hi = 2.6;
  const maxBlot = D(T, [3, 2, 1]);
  const g = Array.from({ length: H }, () => Array(W).fill(0));
  let bag = 1.2, blots = 0, ended = false, pats = 0;
  const prog = el('div', { class: 'mg-progress' });
  const board = el('div', { class: 'rb-board', style: { gridTemplateColumns: `repeat(${W}, 1fr)` } });
  const bagBar = el('div', { class: 'pp-meter rb-bag' }, el('i'));
  const refill = el('button', { class: 'btn', onclick: () => { bag = 1.2; T.sfx('tap'); draw(); } }, '墨包沾墨');
  T.body.append(prog, board, el('small', { class: 'muted' }, '墨包上的墨'), bagBar, refill, el('p', { class: 'muted small' }, d.help || '點一格拍一下：那一格會變深，旁邊的格子也會沾到一點。每一格都拍到綠框的深淺；超過太多，字就糊了。墨包越拍越乾，記得沾墨。'));
  const draw = () => {
    board.innerHTML = '';
    g.forEach((row, y) => row.forEach((v, x) => {
      const ok = v >= lo && v <= hi, over = v > 3;
      board.appendChild(el('button', { class: 'rb-c' + (ok ? ' ok' : '') + (over ? ' blot' : ''), 'data-x': x, 'data-y': y, style: { '--ink': Math.min(1, v / 3) }, onclick: () => pat(x, y) }, el('i')));
    }));
    bagBar.lastChild.style.left = Math.min(100, bag / 1.2 * 100) + '%';
    const done = g.flat().filter(v => v >= lo && v <= hi).length;
    prog.textContent = `拍好 ${done} / ${W * H} 格・糊掉 ${blots} 格（最多 ${maxBlot} 格）・拍了 ${pats} 下`;
  };
  const pat = (x, y) => {
    if (ended) return;
    pats++;
    const amt = bag; bag = Math.max(0.3, bag - 0.15);
    const add = (a, b, v) => { if (a < 0 || b < 0 || a >= W || b >= H) return; const before = g[b][a]; g[b][a] += v; if (before <= 3 && g[b][a] > 3) { blots++; T.sfx('fail'); } };
    add(x, y, amt); add(x + 1, y, amt * 0.25); add(x - 1, y, amt * 0.25); add(x, y + 1, amt * 0.25); add(x, y - 1, amt * 0.25);
    T.sfx('tap'); draw();
    if (blots > maxBlot) { ended = true; return T.later(500, () => T.finish(false, `糊掉 ${blots} 格`)); }
    if (g.flat().every(v => v >= lo && v <= hi)) { ended = true; T.sfx('good'); T.later(600, () => T.finish(true, `拓好了・拍了 ${pats} 下`, blots === 0)); }
  };
  draw();
  T.solveFn = () => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { bag = 1.2; pat(x, y); } if (!ended) { ended = true; T.finish(true, '拓好了'); } };
}

// ═════════ 接唸：接出下一個名字 ═════════
function recite(T) {
  const d = T.d;
  T.header();
  const all = d.names;
  const sec = D(T, [12, 9, 6]);
  const pauses = shuffle(all.map((n, i) => i).slice(1)).slice(0, D(T, [3, 3, 4])).sort((a, b) => a - b);
  let pos = 0, right = 0, asked = 0;
  const prog = el('div', { class: 'mg-progress' });
  const leaf = el('div', { class: 'rc-leaf' }, ...all.map(n => el('span', {}, n)));
  const ready = el('button', { class: 'btn primary', onclick: () => begin() }, '記好了');
  T.body.append(prog, leaf, ready);
  let left = sec;
  prog.textContent = `${d.memo || '先看一次名冊'}（${left} 秒）`;
  const tick = T.every(1000, () => { left--; prog.textContent = `${d.memo || '先看一次名冊'}（${left} 秒）`; if (left <= 0) begin(); });
  const said = el('div', { class: 'rc-said' });
  const opts = el('div', { class: 'mg-opts' });
  let began = false;
  function begin() {
    if (began) return; began = true;
    clearInterval(tick); leaf.remove(); ready.remove();
    T.body.append(said, opts);
    step();
  }
  const step = () => {
    if (pos >= all.length) return T.finish(right >= Math.ceil(pauses.length * 0.6), `接對 ${right} / ${pauses.length} 次`, right === pauses.length);
    if (pauses.includes(pos)) {
      asked++;
      prog.textContent = d.pauseText || '老王停了下來。下一個名字是……？';
      opts.innerHTML = '';
      shuffle([all[pos], ...shuffle(all.filter((n, i) => i !== pos)).slice(0, 3)]).forEach(n => opts.appendChild(el('button', { class: 'btn mg-opt', onclick: e => pick(n, e.currentTarget) }, n)));
      return;
    }
    say(all[pos]); pos++;
    T.later(700, step);
  };
  const say = n => { said.appendChild(el('span', {}, n)); prog.textContent = d.readText || '老王一個一個地唸。'; };
  let picking = false;
  const pick = (n, b) => {
    if (picking) return; picking = true;
    const ok = n === all[pos];
    if (ok) right++;
    T.sfx(ok ? 'item' : 'fail');
    if (b) b.classList.add(ok ? 'right' : 'wrong');
    opts.querySelectorAll('button').forEach(x => { x.disabled = true; if (x.textContent === all[pos]) x.classList.add('right'); });
    T.later(800, () => { picking = false; opts.innerHTML = ''; say(all[pos]); pos++; step(); });
  };
  T.solveFn = async () => { begin(); while (pos < all.length) { if (pauses.includes(pos) && opts.children.length) pick(all[pos], null); await wait(300); } };
}

// ═════════ 曆輪：把日子轉到要的那一天 ═════════
function calendar(T) {
  const d = T.d;
  T.header();
  const S = d.signs; // 20 個日子的名字
  const N = d.rounds || 3, need = d.need || 2;
  const slack = D(T, [99, 3, 1]);
  const moves = [1, 13, 20];
  const step = ([n, s], k) => [((n - 1 + k) % 13) + 1, (s + k) % 20];
  const par = (from, to) => { // 最少要按幾次
    const kf = x => x[0] + ',' + x[1];
    const seen = new Set([kf(from)]); let q = [from], dpt = 0;
    while (q.length) { if (q.some(x => kf(x) === kf(to))) return dpt; const nq = []; for (const x of q) for (const m of moves) { const y = step(x, m); if (!seen.has(kf(y))) { seen.add(kf(y)); nq.push(y); } } q = nq; dpt++; }
    return 99;
  };
  let r = 0, good = 0, cur, target, used, best, days, busy = false;
  const prog = el('div', { class: 'mg-progress' });
  const show = el('div', { class: 'cl-show' });
  const btns = el('div', { class: 'cl-btns' }, ...moves.map(m => el('button', { class: 'btn', onclick: () => go(m) }, `過 ${m} 天`)));
  const note = el('p', { class: 'muted small' }, d.help || '過一天，數字和名字都往前一格。過 13 天，數字繞一圈回來，只有名字往前。過 20 天，名字繞一圈回來，只有數字往前（往前 7）。');
  T.body.append(prog, show, btns, note);
  const label = ([n, s]) => `${n} ${S[s]}`;
  const load = () => {
    cur = [1 + rnd(13), rnd(20)];
    do target = [1 + rnd(13), rnd(20)]; while (par(cur, target) < 3);
    best = par(cur, target); used = 0; days = 0; busy = false;
    draw();
  };
  const draw = () => {
    show.innerHTML = '';
    show.append(el('div', { class: 'cl-day' }, el('small', {}, '今天'), el('b', {}, label(cur))), el('div', { class: 'cl-arrow' }, '→'), el('div', { class: 'cl-day tgt' }, el('small', {}, d.targetLabel || '要到的那一天'), el('b', {}, label(target))));
    prog.textContent = `第 ${r + 1} / ${N} 個日子・按了 ${used} 次${slack < 99 ? `（最多 ${best + slack} 次）` : ''}・過了 ${days} 天`;
  };
  const go = m => {
    if (busy) return;
    cur = step(cur, m); used++; days += m; T.sfx('tap'); draw();
    if (cur[0] === target[0] && cur[1] === target[1]) {
      good++; T.sfx('good'); busy = true;
      return T.later(700, () => { r++; if (r >= N) return T.finish(good >= need, `轉對 ${good} / ${N} 個日子`, good === N); load(); });
    }
    if (used >= best + slack) { busy = true; T.sfx('fail'); prog.textContent = `按太多次了。那一天是「${label(target)}」。`; T.later(1200, () => { r++; if (r >= N) return T.finish(good >= need, `轉對 ${good} / ${N} 個日子`); load(); }); }
  };
  load();
  T.solveFn = () => T.finish(true, `轉對 ${N} / ${N} 個日子`);
}

export const MINI3 = { 補紙: patch, 招牌: signs, 讀向: reading, 記名: names, 水漂: skip, 挖井: wells, 拓片: rubbing, 接唸: recite, 曆輪: calendar };
