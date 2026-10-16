// 動手玩的小遊戲（第一批：卷一、卷六、卷九）
// 劇本寫法不變：@小遊戲 種類 題組 → 勝：場景　敗：場景（題組資料在 data.js 的 TRANSLATE）
// 這裡的每一個玩法都是 T => void：T 是 debate.js 的 Translate（提供 header、body、finish、計時器、難度）
//   T.diff：0 閱讀、1 普通、2 困難
//   T.finish(過關?, 結果文字, 完美?)
//   T.solveFn：自動測試用，直接把這一關解開
// 種類一覽：
//   接歌（記憶）：蒂娃唱幾個音，照順序點回來，一次比一次長
//   編織（組合）：照著花樣，把竹片一格一格編上去
//   潛行（路線）：回合制，避開火把的視線，走到出口
//   看潮（時機）：潮水一漲一退，水夠深的時候才划過去
//   分類（速度）：紙一張一張飄下來，快速分到左邊或右邊
//   抄紙（平衡）：按住左右，讓竹簾保持水平
//   翻牌（記憶）：先記住每個人是誰，再把名字和身分翻成一對
//   水路（路線）：轉動水道，把水引到每一棵小樹
//   方位（推理）：把城門放到它通往的方向
//   組句（組合）：挑字組成句子，回答紙上的問題
//   節奏（節奏）：音符跑到線上時按下去
//   看風（推理）：看旗子、煙、草，判斷風往哪裡吹
import { el } from './ui.js';
import { MINI2, TIPS2 } from './minigames2.js';
import { MINI3, TIPS3 } from './minigames3.js';
import { MINI4, TIPS4 } from './boardgames.js';

const NS = 'http://www.w3.org/2000/svg';
export const svg = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
export const rnd = n => Math.floor(Math.random() * n);
export const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
export const D = (T, arr) => arr[T.diff] ?? arr[1];
const DIFF_NAME = ['閱讀', '普通', '困難'];

export const MINI_TIPS = {
  接歌: '照順序點回旋律', 編織: '照花樣編竹片', 潛行: '避開火把走到出口', 看潮: '水深時再划', 分類: '快速分到兩邊',
  抄紙: '讓竹簾保持水平', 翻牌: '記住再翻成一對', 水路: '轉水道引水', 方位: '把城門放對方向', 組句: '挑字組句子',
  節奏: '音符到線上時按', 看風: '判斷風往哪裡吹',
};

// ═════════ 接歌：一次比一次長的旋律 ═════════
export const PENTA_HZ = [523.3, 587.3, 659.3, 784, 880];
function song(T) {
  const d = T.d;
  T.header();
  const L = Math.min(d.song.length, D(T, [5, 6, 7]));
  let lives = D(T, [3, 2, 2]), k = Math.min(2, L), input = [], busy = true, mistakes = 0;
  const prog = el('div', { class: 'mg-progress' });
  const line = el('div', { class: 'sg-line' });
  const pads = el('div', { class: 'sg-pads' });
  const msg = el('p', { class: 'mg-q small' });
  const btns = d.pads.map((name, i) => el('button', { class: 'sg-pad', style: { '--i': i }, 'data-i': i, onclick: () => press(i) }, name));
  pads.append(...btns);
  T.body.append(prog, line, msg, pads);
  const light = (i, ms = 360) => {
    btns[i].classList.add('on'); T.tone(PENTA_HZ[i], ms / 1000 + 0.15, 'triangle', 0.12);
    T.later(ms, () => btns[i].classList.remove('on'));
  };
  const draw = () => {
    prog.textContent = `第 ${k} 個音・${'♥'.repeat(lives)}${'♡'.repeat(Math.max(0, D(T, [3, 2, 2]) - lives))}`;
    line.innerHTML = '';
    for (let i = 0; i < L; i++) line.appendChild(el('i', { class: i < input.length ? 'done' : i < k ? 'cur' : '' }));
  };
  const play = () => {
    busy = true; input = []; draw();
    msg.textContent = d.listen || '仔細聽……';
    const gap = D(T, [700, 560, 440]);
    for (let i = 0; i < k; i++) T.later(500 + i * gap, () => light(d.song[i], gap * 0.7));
    T.later(500 + k * gap, () => { busy = false; msg.textContent = d.yourTurn || '換你了：照順序點回來。'; });
  };
  const press = i => {
    if (busy) return;
    light(i, 260);
    if (d.song[input.length] !== i) {
      busy = true; mistakes++; lives--;
      btns[i].classList.add('bad'); T.later(400, () => btns[i].classList.remove('bad'));
      T.sfx('fail');
      if (lives <= 0) return T.later(700, () => T.finish(false, `接到第 ${k - 1} 個音`));
      msg.textContent = '不對……再聽一次。';
      return T.later(900, play);
    }
    input.push(i); draw();
    if (input.length < k) return;
    busy = true;
    if (k >= L) { T.sfx('good'); return T.later(700, () => T.finish(true, `整首接完了・${L} 個音`, mistakes === 0)); }
    k++; msg.textContent = '對了！再往下一個音。';
    T.later(900, play);
  };
  T.solveFn = () => T.finish(true, `整首接完了・${L} 個音`);
  T.later(300, play);
}

// ═════════ 編織：照花樣編竹片 ═════════
function weave(T) {
  const d = T.d;
  T.header();
  const P = d.pattern, R = P.length, C = P[0].length;
  const keys = Object.keys(d.colors);
  const grid = P.map(r => [...r].map(() => '.'));
  let cur = keys[0], miss = 0, peeks = D(T, [99, 99, 2]);
  const maxMiss = D(T, [99, 8, 4]);
  const prog = el('div', { class: 'mg-progress' });
  const cell = (ch, cls = '') => el('i', { class: 'wv-c ' + cls, style: { background: ch === '.' ? '' : d.colors[ch] } });
  const preview = el('div', { class: 'wv-grid wv-preview', style: { gridTemplateColumns: `repeat(${C}, 1fr)` } }, ...P.flatMap(r => [...r].map(ch => cell(ch))));
  const board = el('div', { class: 'wv-grid wv-board', style: { gridTemplateColumns: `repeat(${C}, 1fr)` } });
  const chips = el('div', { class: 'chips wv-chips' });
  const peekBtn = el('button', { class: 'btn small', onclick: () => peek() });
  const wrap = el('div', { class: 'wv-wrap' }, el('div', { class: 'wv-pv' }, el('small', { class: 'muted' }, d.previewLabel || '花樣'), preview), board);
  T.body.append(prog, wrap, chips);
  if (T.diff >= 2) T.body.appendChild(peekBtn);
  const drawChips = () => {
    chips.innerHTML = '';
    keys.forEach(k => chips.appendChild(el('button', { class: 'chip' + (cur === k ? ' on' : ''), onclick: () => { cur = k; drawChips(); } }, el('i', { class: 'wv-dot', style: { background: d.colors[k] } }), d.names[k])));
  };
  const done = () => grid.every((r, y) => r.every((ch, x) => ch === P[y][x]));
  const left = () => grid.reduce((s, r, y) => s + r.filter((ch, x) => ch !== P[y][x]).length, 0);
  const draw = () => {
    board.innerHTML = '';
    grid.forEach((r, y) => r.forEach((ch, x) => {
      const b = cell(ch, 'tap' + (T.diff === 0 && ch === '.' && P[y][x] === cur ? ' hint' : ''));
      b.onclick = () => tap(x, y);
      b.dataset.x = x; b.dataset.y = y;
      board.appendChild(b);
    }));
    prog.textContent = `還差 ${left()} 格・編錯 ${miss} 次${maxMiss < 99 ? `（最多 ${maxMiss} 次）` : ''}`;
    peekBtn.textContent = `再看一眼花樣（剩 ${peeks} 次）`; peekBtn.disabled = peeks <= 0 || !preview.classList.contains('hide');
  };
  const peek = () => { if (peeks <= 0) return; peeks--; preview.classList.remove('hide'); draw(); T.later(2500, () => { preview.classList.add('hide'); draw(); }); };
  const tap = (x, y) => {
    if (board.classList.contains('done')) return;
    if (grid[y][x] === P[y][x]) return;
    if (P[y][x] !== cur) {
      miss++; T.sfx('fail');
      const b = board.children[y * C + x]; b.classList.add('bad');
      T.later(300, draw);
      if (miss > maxMiss) T.later(400, () => T.finish(false, `編錯 ${miss} 次`));
      return;
    }
    grid[y][x] = cur; T.sfx('tap');
    draw();
    if (done()) { board.classList.add('done'); T.sfx('good'); T.later(900, () => T.finish(miss <= maxMiss, `編好了・編錯 ${miss} 次`, miss === 0)); }
  };
  drawChips(); draw();
  if (T.diff >= 2) T.later(6000, () => { preview.classList.add('hide'); draw(); });
  T.solveFn = () => { P.forEach((r, y) => [...r].forEach((ch, x) => { grid[y][x] = ch; })); draw(); T.finish(true, '編好了'); };
}

// ═════════ 潛行：回合制避開視線 ═════════
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
// 巡邏的人在第 t 步的位置與面向（來回走）
export function patrolAt(p, t) {
  t += p.offset || 0;
  const n = p.path.length;
  if (n === 1) return { c: p.path[0], f: p.face ?? 2 };
  const L = 2 * n - 2, m = ((t % L) + L) % L;
  const idx = m < n ? m : L - m;
  const pm = ((t - 1) % L + L) % L, pidx = pm < n ? pm : L - pm;
  const a = p.path[pidx], b = p.path[idx];
  let f = DIRS.findIndex(([dx, dy]) => dx === b[0] - a[0] && dy === b[1] - a[1]);
  if (f < 0) f = 2;
  return { c: b, f };
}
export function visionAt(level, t, reach) {
  const seen = new Set();
  const wall = (x, y) => y < 0 || y >= level.map.length || x < 0 || x >= level.map[0].length || level.map[y][x] === '#';
  for (const p of level.patrols) {
    const { c: [x, y], f } = patrolAt(p, t);
    seen.add(x + ',' + y);
    let cx = x, cy = y;
    for (let i = 0; i < reach; i++) { cx += DIRS[f][0]; cy += DIRS[f][1]; if (wall(cx, cy)) break; seen.add(cx + ',' + cy); }
  }
  return seen;
}
const findCh = (map, ch) => { for (let y = 0; y < map.length; y++) { const x = map[y].indexOf(ch); if (x >= 0) return [x, y]; } return null; };
// 找一條不被看見的路（自動測試與 check.mjs 用）
export function stealthSolve(level, reach) {
  const L = level.patrols.reduce((m, p) => { const k = p.path.length > 1 ? 2 * p.path.length - 2 : 1; return m * k / gcd(m, k); }, 1);
  const s = findCh(level.map, 'S'), e = findCh(level.map, 'E');
  const ok = (x, y) => y >= 0 && y < level.map.length && x >= 0 && x < level.map[0].length && level.map[y][x] !== '#';
  const key = (x, y, t) => `${x},${y},${t % L}`;
  const prev = new Map([[key(...s, 0), null]]);
  const q = [[...s, 0]];
  while (q.length) {
    const [x, y, t] = q.shift();
    if (x === e[0] && y === e[1]) {
      const path = []; let k = key(x, y, t), cur = [x, y, t];
      while (prev.get(k)) { path.unshift([cur[0], cur[1]]); cur = prev.get(k); k = key(...cur); }
      return path;
    }
    for (const [dx, dy] of [[0, 0], ...DIRS]) {
      const nx = x + dx, ny = y + dy;
      if (!ok(nx, ny)) continue;
      const vis = visionAt(level, t + 1, reach);
      if (vis.has(nx + ',' + ny)) continue;
      const k = key(nx, ny, t + 1);
      if (prev.has(k)) continue;
      prev.set(k, [x, y, t]);
      q.push([nx, ny, t + 1]);
    }
  }
  return null;
}
function gcd(a, b) { return b ? gcd(b, a % b) : a; }

function stealth(T) {
  const d = T.d, lv = d.level;
  T.header();
  const reach = D(T, [1, 2, 2]);
  const maxCaught = D(T, [3, 2, 1]);
  const W = lv.map[0].length, H = lv.map.length;
  const start = findCh(lv.map, 'S'), exit = findCh(lv.map, 'E');
  let pos = [...start], t = 0, caught = 0, steps = 0, busy = false;
  const prog = el('div', { class: 'mg-progress' });
  const board = el('div', { class: 'st-board', style: { gridTemplateColumns: `repeat(${W}, 1fr)` } });
  const wait = el('button', { class: 'btn small', onclick: () => move(0, 0) }, '原地等一步');
  const pad = el('div', { class: 'st-pad' },
    el('button', { class: 'btn', 'aria-label': '往上', onclick: () => move(0, -1) }, '↑'),
    el('button', { class: 'btn', 'aria-label': '往左', onclick: () => move(-1, 0) }, '←'),
    wait,
    el('button', { class: 'btn', 'aria-label': '往右', onclick: () => move(1, 0) }, '→'),
    el('button', { class: 'btn', 'aria-label': '往下', onclick: () => move(0, 1) }, '↓'));
  T.body.append(prog, board, pad, el('p', { class: 'muted small' }, d.help || '點旁邊的格子，或用方向鍵移動。你走一步，火把也會走一步。橘色的格子是火把照得到的地方。'));
  const draw = () => {
    const vis = visionAt(lv, t, reach);
    const next = T.diff < 2 ? new Set(lv.patrols.map(p => patrolAt(p, t + 1).c.join(','))) : new Set();
    const here = new Set(lv.patrols.map(p => patrolAt(p, t).c.join(',')));
    board.innerHTML = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = lv.map[y][x], k = x + ',' + y;
      const isMe = pos[0] === x && pos[1] === y;
      const adj = Math.abs(pos[0] - x) + Math.abs(pos[1] - y) === 1 && ch !== '#';
      let label = '';
      if (here.has(k)) label = d.foe || '火';
      else if (isMe) label = d.me || '人';
      else if (ch === 'E') label = d.exit || '出';
      board.appendChild(el('button', {
        class: 'st-c' + (ch === '#' ? ' wall' : '') + (vis.has(k) && ch !== '#' ? ' lit' : '') + (next.has(k) ? ' next' : '') + (here.has(k) ? ' foe' : '') + (isMe ? ' me' : '') + (ch === 'E' ? ' exit' : '') + (adj ? ' adj' : ''),
        disabled: !adj, 'data-x': x, 'data-y': y,
        onclick: () => move(x - pos[0], y - pos[1]),
      }, label));
    }
    prog.textContent = `走了 ${steps} 步・被照到 ${caught} 次（最多 ${maxCaught} 次）`;
  };
  const move = (dx, dy) => {
    if (busy) return;
    const nx = pos[0] + dx, ny = pos[1] + dy;
    if (ny < 0 || ny >= H || nx < 0 || nx >= W || lv.map[ny][nx] === '#') return;
    pos = [nx, ny]; t++; steps++;
    T.sfx('tap');
    if (visionAt(lv, t, reach).has(nx + ',' + ny)) {
      caught++; busy = true; draw();
      board.classList.add('caught'); T.sfx('fail'); T.ctx.ui.vibrate?.(30);
      if (caught > maxCaught) return T.later(800, () => T.finish(false, `被照到 ${caught} 次`));
      T.later(900, () => { board.classList.remove('caught'); pos = [...start]; busy = false; draw(); });
      return;
    }
    draw();
    if (nx === exit[0] && ny === exit[1]) { busy = true; T.sfx('good'); T.later(600, () => T.finish(true, `走了 ${steps} 步・被照到 ${caught} 次`, caught === 0)); }
  };
  const key = e => { const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], ' ': [0, 0] }[e.key]; if (m) { e.preventDefault(); move(...m); } };
  document.addEventListener('keydown', key);
  T.onStop(() => document.removeEventListener('keydown', key));
  draw();
  T.solveFn = async () => {
    const path = stealthSolve(lv, reach) || [];
    for (const [x, y] of path) { move(x - pos[0], y - pos[1]); await new Promise(r => setTimeout(r, 60)); }
  };
}

// ═════════ 看潮：水夠深的時候才划過去 ═════════
function tide(T) {
  const d = T.d;
  T.header();
  const n = Math.min(d.bars.length, D(T, [4, 5, 6]));
  const bars = d.bars.slice(0, n);
  const period = D(T, [5.2, 4.4, 3.6]);
  const maxGround = D(T, [3, 2, 1]);
  const limit = D(T, [0, 60, 40]);
  let seg = 0, ground = 0, busyUntil = 0, ended = false;
  const t0 = performance.now();
  const prog = el('div', { class: 'mg-progress' });
  const box = svg('svg', { viewBox: '0 0 300 220', class: 'td-svg' });
  // 水道：由下（外海）往上（內海），每一段一塊沙洲
  const segH = 170 / n;
  const water = svg('rect', { x: 0, y: 0, width: 300, height: 220, class: 'td-sea' }, box);
  for (let i = 0; i < n; i++) {
    const y = 190 - (i + 1) * segH;
    svg('rect', { x: 90, y: y + 2, width: 80, height: segH - 4, rx: 6, class: 'td-seg', 'data-i': i }, box);
    svg('text', { x: 130, y: y + segH / 2 + 4, class: 'td-lab' }, box).textContent = `沙洲 ${i + 1}`;
  }
  svg('text', { x: 130, y: 212, class: 'td-lab' }, box).textContent = d.from || '外海';
  svg('text', { x: 130, y: 14, class: 'td-lab' }, box).textContent = d.to || '內海';
  const boat = svg('path', { d: 'M-12 -5 L12 -5 L8 6 L-8 6 Z M0 -5 L0 -18 L9 -8 Z', class: 'td-boat' }, box);
  // 右邊的潮位尺
  svg('rect', { x: 230, y: 20, width: 34, height: 170, rx: 4, class: 'td-gauge' }, box);
  const level = svg('rect', { x: 232, y: 100, width: 30, height: 88, class: 'td-level' }, box);
  const need = svg('line', { x1: 222, x2: 272, y1: 100, y2: 100, class: 'td-need' }, box);
  const needT = svg('text', { x: 276, y: 104, class: 'td-lab small' }, box);
  needT.textContent = '要';
  const btn = el('button', { class: 'btn primary mg-tap', onclick: () => row() }, d.button || '划過去');
  T.body.append(prog, box, btn);
  const h = now => 0.5 + 0.46 * Math.sin(2 * Math.PI * ((now - t0) / 1000) / period - Math.PI / 2);
  const draw = now => {
    const lvl = h(now);
    level.setAttribute('y', 188 - lvl * 166); level.setAttribute('height', lvl * 166);
    water.style.opacity = 0.45 + lvl * 0.5;
    const ny = 188 - (bars[seg] ?? 1) * 166;
    need.setAttribute('y1', ny); need.setAttribute('y2', ny); needT.setAttribute('y', ny + 4);
    need.style.display = seg < n ? '' : 'none'; needT.style.display = need.style.display;
    const by = 196 - seg * segH - (seg ? segH / 2 - 4 : 0);
    boat.setAttribute('transform', `translate(130 ${seg >= n ? 22 : by})`);
    box.querySelectorAll('.td-seg').forEach((r, i) => r.classList.toggle('pass', i < seg));
    const left = limit ? Math.max(0, Math.ceil(limit - (now - t0) / 1000)) : 0;
    prog.textContent = `過了 ${seg} / ${n} 道沙洲・擱淺 ${ground} 次（最多 ${maxGround} 次）` + (limit ? `・天亮前還有 ${left} 秒` : '');
    btn.disabled = now < busyUntil;
    if (limit && left <= 0 && !ended) { ended = true; T.finish(false, `天快亮了・過了 ${seg} / ${n} 道`); }
  };
  T.frame(draw);
  const row = () => {
    const now = performance.now();
    if (now < busyUntil || ended) return;
    if (h(now) >= bars[seg]) {
      seg++; T.sfx('good');
      if (seg >= n) { ended = true; T.later(500, () => T.finish(true, `平安過了鹿耳門・擱淺 ${ground} 次`, ground === 0)); }
      busyUntil = now + 350;
    } else {
      ground++; T.sfx('fail'); box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
      busyUntil = now + 1100;
      if (ground > maxGround) { ended = true; T.later(600, () => T.finish(false, `擱淺 ${ground} 次`)); }
    }
  };
  T.solveFn = () => { ended = true; T.finish(true, '平安過了鹿耳門'); };
  T.tideNow = () => h(performance.now()) >= bars[seg]; // 自動測試用
}

// ═════════ 分類：快速分到左邊或右邊 ═════════
function sort2(T) {
  const d = T.d;
  T.header();
  const N = Math.min(d.items.length, D(T, [8, 10, 12]));
  const items = shuffle(d.items).slice(0, N);
  const sec = D(T, [8, 5.5, 3.8]);
  const need = Math.ceil(N * (d.rate || 0.7));
  let i = 0, right = 0, wrong = 0, shownAt = 0, locked = false;
  const prog = el('div', { class: 'mg-progress' });
  const timer = el('div', { class: 'sr-timer' }, el('i'));
  const card = el('div', { class: 'sr-card' });
  const ink = el('div', { class: 'sr-ink' });
  const stage = el('div', { class: 'sr-stage' }, card, ink);
  const L = el('button', { class: 'btn sr-btn', onclick: () => pick(0) }, '◀ ' + d.left);
  const R = el('button', { class: 'btn sr-btn', onclick: () => pick(1) }, d.right + ' ▶');
  T.body.append(prog, timer, stage, el('div', { class: 'sr-btns' }, L, R));
  const show = () => {
    if (i >= N) return T.finish(right >= need, `${d.resultWord || '救回'} ${right} / ${N}`, wrong === 0);
    card.textContent = items[i].t; card.className = 'sr-card in';
    prog.textContent = `第 ${i + 1} / ${N} 張・分對 ${right}（要 ${need} 張）`;
    shownAt = performance.now(); locked = false;
  };
  const pick = side => {
    if (locked || i >= N) return;
    locked = true;
    const ok = side === items[i].a;
    if (ok) right++; else wrong++;
    T.sfx(ok ? 'item' : 'fail');
    card.className = 'sr-card ' + (side ? 'go-r' : 'go-l') + (ok ? '' : ' bad');
    ink.style.height = Math.min(90, wrong * 14) + '%';
    i++;
    T.later(380, show);
  };
  T.frame(now => {
    if (locked || i >= N) return;
    const r = 1 - (now - shownAt) / 1000 / sec;
    timer.firstChild.style.width = Math.max(0, r) * 100 + '%';
    if (r <= 0) { locked = true; wrong++; T.sfx('fail'); card.className = 'sr-card fade'; ink.style.height = Math.min(90, wrong * 14) + '%'; i++; T.later(380, show); }
  });
  const key = e => { if (e.key === 'ArrowLeft') pick(0); if (e.key === 'ArrowRight') pick(1); };
  document.addEventListener('keydown', key);
  T.onStop(() => document.removeEventListener('keydown', key));
  show();
  T.solveFn = async () => { while (i < N) { pick(items[i].a); await new Promise(r => setTimeout(r, 420)); } };
}

// ═════════ 抄紙：讓竹簾保持水平 ═════════
function paper(T) {
  const d = T.d;
  T.header();
  const sheets = d.sheets || 3, need = d.need ?? 2;
  const secs = D(T, d.secs || [5, 6, 7]);
  const zone = D(T, d.zone || [0.34, 0.26, 0.19]);
  const shake = D(T, [0.9, 1.3, 1.7]);
  let sheet = 0, good = 0, a = 0, v = 0, push = 0, inZone = 0, elapsed = 0, last = 0, running = false, spilled = false;
  const prog = el('div', { class: 'mg-progress' });
  const box = svg('svg', { viewBox: '0 0 300 170', class: 'pp-svg' });
  svg('rect', { x: 30, y: 70, width: 240, height: 90, rx: 10, class: 'pp-vat' }, box);
  svg('rect', { x: 36, y: 100, width: 228, height: 54, rx: 6, class: 'pp-pulp' }, box);
  const mould = svg('g', {}, box);
  svg('rect', { x: -100, y: -6, width: 200, height: 12, rx: 3, class: 'pp-mould' }, mould);
  for (let x = -90; x <= 90; x += 12) svg('line', { x1: x, y1: -6, x2: x, y2: 6, class: 'pp-reed' }, mould);
  const film = svg('rect', { x: -96, y: -9, width: 192, height: 4, rx: 2, class: 'pp-film' }, mould);
  const meter = el('div', { class: 'pp-meter' }, el('b', { style: { left: (50 - zone * 50) + '%', width: zone * 100 + '%' } }), el('i'));
  const timeBar = el('div', { class: 'sr-timer' }, el('i'));
  const sheetsBox = el('div', { class: 'pp-sheets' });
  const hold = (dir, label) => {
    const b = el('button', { class: 'btn pp-btn' }, label);
    const on = e => { e.preventDefault(); push = dir; b.classList.add('down'); };
    const off = e => { e.preventDefault(); if (push === dir) push = 0; b.classList.remove('down'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  };
  const go = el('button', { class: 'btn primary', onclick: () => startSheet() }, d.startLabel || '入漿');
  T.body.append(prog, box, meter, timeBar, el('div', { class: 'pp-btns' }, hold(-1, '◀ 左邊抬高'), hold(1, '右邊抬高 ▶')), go, sheetsBox);
  const drawSheets = () => { sheetsBox.innerHTML = ''; for (let i = 0; i < sheets; i++) sheetsBox.appendChild(el('i', { class: i < sheet ? (sheetsBox.dataset['s' + i] || '') : '' })); };
  const status = () => { prog.textContent = `第 ${Math.min(sheet + 1, sheets)} / ${sheets} 張・抄好 ${good} 張（要 ${need} 張）`; };
  const startSheet = () => {
    if (running) return;
    a = (Math.random() - 0.5) * 0.3; v = 0; inZone = 0; elapsed = 0; spilled = false; running = true; last = performance.now();
    go.disabled = true; go.textContent = '搖勻中……';
    T.sfx('tap');
  };
  const endSheet = () => {
    running = false;
    const q = spilled ? 0 : inZone / Math.max(0.001, elapsed);
    const ok = q >= 0.6;
    if (ok) good++;
    sheetsBox.dataset['s' + sheet] = ok ? (q >= 0.85 ? 'best' : 'ok') : 'bad';
    T.sfx(ok ? 'good' : 'fail');
    sheet++; drawSheets(); status();
    if (sheet >= sheets || good >= need && sheet >= sheets) return T.later(500, () => T.finish(good >= need, `抄好 ${good} / ${sheets} 張`, good === sheets));
    go.disabled = false; go.textContent = spilled ? '漿灑出來了……再入一次漿' : ok ? (q >= 0.85 ? '又薄又勻！下一張' : '抄好了。下一張') : '厚薄不勻……下一張';
  };
  T.frame(now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running) {
      v += ((Math.random() - 0.5) * shake * 6 + Math.sign(a) * 0.8 * Math.abs(a) * 2 + push * 1.6) * dt;
      v *= Math.pow(0.975, dt * 60); a += v * dt;
      if (Math.abs(a) >= 1) { a = Math.sign(a); spilled = true; endSheet(); }
      elapsed += dt; if (Math.abs(a) < zone) inZone += dt;
      if (running && elapsed >= secs) endSheet();
    }
    mould.setAttribute('transform', `translate(150 ${running ? 92 : 60}) rotate(${a * 22})`);
    film.style.opacity = running ? Math.min(1, elapsed / secs + 0.2) : 0;
    meter.lastChild.style.left = (50 + a * 50) + '%';
    meter.classList.toggle('in', Math.abs(a) < zone);
    timeBar.firstChild.style.width = (running ? Math.max(0, 1 - elapsed / secs) : 1) * 100 + '%';
  });
  const keyDown = e => { if (e.key === 'ArrowLeft') push = -1; if (e.key === 'ArrowRight') push = 1; if (e.key === 'Enter') startSheet(); };
  const keyUp = e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') push = 0; };
  document.addEventListener('keydown', keyDown); document.addEventListener('keyup', keyUp);
  T.onStop(() => { document.removeEventListener('keydown', keyDown); document.removeEventListener('keyup', keyUp); });
  drawSheets(); status();
  T.solveFn = () => T.finish(true, `抄好 ${sheets} / ${sheets} 張`);
  T.paperState = () => ({ a, running }); // 自動測試用
  T.paperPush = p => { push = p; };
}

// ═════════ 翻牌：先記住，再翻成一對 ═════════
function pairs(T) {
  const d = T.d;
  T.header();
  const people = shuffle(d.people).slice(0, D(T, [4, 5, 6]));
  const maxMiss = D(T, [12, 8, 6]);
  let miss = 0, open = [], found = 0, busy = true;
  const prog = el('div', { class: 'mg-progress' });
  const list = el('div', { class: 'pr-list' }, ...people.map(p => el('div', { class: 'pr-row' }, el('b', {}, p.name), el('span', {}, p.tag))));
  const ready = el('button', { class: 'btn primary', onclick: () => begin() }, '記好了');
  T.body.append(prog, list, ready);
  let left = D(T, [20, 14, 10]);
  prog.textContent = `${d.memo || '先記住每一個人'}（${left} 秒）`;
  const tick = T.every(1000, () => { left--; prog.textContent = `${d.memo || '先記住每一個人'}（${left} 秒）`; if (left <= 0) begin(); });
  const cards = shuffle(people.flatMap((p, i) => [{ k: i, kind: 'name', t: p.name, v: p.tag }, { k: i, kind: 'tag', t: p.tag, v: p.tag }]));
  const grid = el('div', { class: 'pr-grid' });
  const begin = () => {
    if (!busy) return;
    clearInterval(tick); list.remove(); ready.remove(); busy = false;
    T.body.append(grid, el('p', { class: 'muted small' }, d.help || '翻兩張：一張名字、一張身分，對上了就會留下來。'));
    draw();
  };
  const draw = () => {
    grid.innerHTML = '';
    cards.forEach((c, i) => grid.appendChild(el('button', { class: 'pr-card' + (c.done ? ' done' : open.includes(i) ? ' up' : '') + (c.kind === 'tag' ? ' tag' : ''), 'data-i': i, onclick: () => flip(i) },
      c.done || open.includes(i) ? c.t : '？')));
    prog.textContent = `配好 ${found} / ${people.length} 對・翻錯 ${miss} 次（最多 ${maxMiss} 次）`;
  };
  const flip = i => {
    if (busy || cards[i].done || open.includes(i)) return;
    open.push(i); T.sfx('tap'); draw();
    if (open.length < 2) return;
    const [x, y] = open.map(j => cards[j]);
    if (x.kind !== y.kind && x.v === y.v) {
      x.done = y.done = true; found++; open = []; T.sfx('item'); draw();
      if (found >= people.length) T.later(600, () => T.finish(miss <= maxMiss, `配好 ${found} 對・翻錯 ${miss} 次`, miss === 0));
      return;
    }
    miss++; busy = true;
    T.later(900, () => {
      open = []; busy = false; draw();
      if (miss > maxMiss) T.finish(false, `翻錯 ${miss} 次`);
    });
  };
  T.solveFn = () => T.finish(true, `配好 ${people.length} 對`);
}

// ═════════ 水路：轉動水道，把水引到每一棵小樹 ═════════
const rot = m => ((m << 1) | (m >> 3)) & 15;
const BIT = [1, 2, 4, 8]; // 上、右、下、左
const OPP = [4, 8, 1, 2];
// 隨機產生一張「每一格都連在一起」的水道圖（從左上角進水）
export function makePipes(n) {
  const m = Array.from({ length: n }, () => Array(n).fill(0));
  const seen = Array.from({ length: n }, () => Array(n).fill(false));
  const stack = [[0, 0]]; seen[0][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const opts = DIRS.map(([dx, dy], i) => [x + dx, y + dy, i]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen[b][a]);
    if (!opts.length) { stack.pop(); continue; }
    const [a, b, i] = opts[rnd(opts.length)];
    m[y][x] |= BIT[i]; m[b][a] |= OPP[i]; seen[b][a] = true;
    stack.push([a, b]);
  }
  m[0][0] |= 8; // 水從左邊進來
  return m;
}
export function wetCells(g) {
  const n = g.length, wet = new Set();
  if (!(g[0][0] & 8)) return wet;
  const q = [[0, 0]]; wet.add('0,0');
  while (q.length) {
    const [x, y] = q.shift();
    DIRS.forEach(([dx, dy], i) => {
      const a = x + dx, b = y + dy;
      if (a < 0 || b < 0 || a >= n || b >= n || !(g[y][x] & BIT[i]) || !(g[b][a] & OPP[i]) || wet.has(a + ',' + b)) return;
      wet.add(a + ',' + b); q.push([a, b]);
    });
  }
  return wet;
}
function pipes(T) {
  const d = T.d;
  T.header();
  const n = D(T, [4, 5, 6]);
  const sol = makePipes(n);
  const ends = [];
  sol.forEach((r, y) => r.forEach((m, x) => { if ([1, 2, 4, 8].includes(m & ~(x === 0 && y === 0 ? 8 : 0)) && !(x === 0 && y === 0)) ends.push(x + ',' + y); }));
  const g = sol.map(r => r.map(m => { let v = m; for (let k = rnd(4); k > 0; k--) v = rot(v); return v; }));
  // 進水口固定朝左
  while (!(g[0][0] & 8)) g[0][0] = rot(g[0][0]);
  let moves = 0;
  const limit = D(T, [0, 150, 100]);
  const t0 = performance.now();
  let ended = false;
  const prog = el('div', { class: 'mg-progress' });
  const board = el('div', { class: 'pi-board', style: { gridTemplateColumns: `repeat(${n}, 1fr)` } });
  T.body.append(prog, el('div', { class: 'pi-wrap' }, el('span', { class: 'pi-src' }, d.source || '水'), board), el('p', { class: 'muted small' }, d.help || '點一格，水道會轉 90 度。左上角是進水的地方，把水引到每一棵小樹。'));
  const tile = (m, wet, tree) => {
    const s = svg('svg', { viewBox: '0 0 40 40' });
    svg('rect', { x: 0, y: 0, width: 40, height: 40, class: 'pi-ground' }, s);
    const ends2 = [[20, 0], [40, 20], [20, 40], [0, 20]];
    BIT.forEach((b, i) => { if (m & b) svg('line', { x1: 20, y1: 20, x2: ends2[i][0], y2: ends2[i][1], class: 'pi-pipe' + (wet ? ' wet' : '') }, s); });
    svg('circle', { cx: 20, cy: 20, r: 5.5, class: 'pi-pipe-c' + (wet ? ' wet' : '') }, s);
    if (tree && d.icon === '燈') svg('circle', { cx: 20, cy: 20, r: 9, class: 'pi-lamp' + (wet ? ' wet' : '') }, s);
    else if (tree) { svg('path', { d: 'M20 30 L20 18 M20 22 L14 15 M20 20 L27 13', class: 'pi-tree' + (wet ? ' wet' : '') }, s); }
    return s;
  };
  const draw = () => {
    const wet = wetCells(g);
    board.innerHTML = '';
    g.forEach((r, y) => r.forEach((m, x) => board.appendChild(el('button', { class: 'pi-c', 'data-x': x, 'data-y': y, onclick: () => turn(x, y) }, tile(m, wet.has(x + ',' + y), ends.includes(x + ',' + y))))));
    const got = ends.filter(k => wet.has(k)).length;
    const left = limit ? Math.max(0, Math.ceil(limit - (performance.now() - t0) / 1000)) : 0;
    prog.textContent = `${d.got || '澆到'} ${got} / ${ends.length} ${d.unit || '棵'}・轉了 ${moves} 次` + (limit ? `・還有 ${left} 秒` : '');
    return got === ends.length;
  };
  const turn = (x, y) => {
    if (ended || (x === 0 && y === 0 && [8].includes(g[0][0]))) return;
    if (x === 0 && y === 0) { do g[0][0] = rot(g[0][0]); while (!(g[0][0] & 8)); }
    else g[y][x] = rot(g[y][x]);
    moves++; T.sfx('tap');
    if (draw()) { ended = true; T.sfx('good'); board.classList.add('done'); T.later(900, () => T.finish(true, `${d.doneText || '水都流到了'}・轉了 ${moves} 次`, moves <= n * n * 1.5)); }
  };
  if (limit) T.every(1000, () => { if (ended) return; draw(); if ((performance.now() - t0) / 1000 >= limit) { ended = true; T.finish(false, `時間到了・轉了 ${moves} 次`); } });
  draw();
  T.solveFn = () => { sol.forEach((r, y) => r.forEach((m, x) => { g[y][x] = m; })); draw(); ended = true; T.finish(true, d.doneText || '水都流到了'); };
}

// ═════════ 方位：把城門放到它通往的方向 ═════════
function compass(T) {
  const d = T.d;
  T.header();
  const slots = d.slots; // [{ dir: '東北', x, y }]
  const gates = d.gates; // [{ name, dir, clue: [簡單, 普通, 困難] }]
  const tries = D(T, [3, 2, 1]);
  let used = 0, sel = null;
  const place = {};
  const prog = el('div', { class: 'mg-progress' });
  const box = svg('svg', { viewBox: '0 0 240 240', class: 'cp-svg' });
  if (T.diff < 2 || d.mapOnHard) for (const m of d.marks || []) {
    svg('circle', { cx: m.x, cy: m.y, r: 3, class: 'cp-mark' }, box);
    svg('text', { x: m.x, y: m.y - 6, class: 'cp-mlab' }, box).textContent = m.t;
  }
  svg('circle', { cx: 120, cy: 120, r: 62, class: 'cp-wall' }, box);
  svg('circle', { cx: 120, cy: 120, r: 46, class: 'cp-ring' }, box);
  svg('circle', { cx: 120, cy: 120, r: 14, class: 'cp-core' }, box);
  svg('text', { x: 120, y: 18, class: 'cp-n' }, box).textContent = '北';
  const slotEls = slots.map((s, i) => {
    const g = svg('g', { class: 'cp-slot', 'data-i': i, tabindex: 0 }, box);
    svg('rect', { x: s.x - 34, y: s.y - 13, width: 68, height: 26, rx: 13 }, g);
    const t = svg('text', { x: s.x, y: s.y + 5 }, g);
    g.addEventListener('click', () => tapSlot(i));
    return { g, t };
  });
  const tiles = el('div', { class: 'cp-tiles' });
  const clues = el('ul', { class: 'cp-clues' }, ...gates.map(gt => el('li', {}, el('b', {}, gt.name + '：'), gt.clue[T.diff] ?? gt.clue[1])));
  const ok = el('button', { class: 'btn primary', disabled: true, onclick: () => check() }, '確定');
  T.body.append(prog, box, tiles, ok, clues);
  const draw = () => {
    slotEls.forEach(({ g, t }, i) => { t.textContent = place[i] || slots[i].dir; g.classList.toggle('filled', !!place[i]); g.classList.remove('right', 'wrong'); });
    tiles.innerHTML = '';
    gates.forEach(gt => { const on = Object.values(place).includes(gt.name); tiles.appendChild(el('button', { class: 'chip' + (sel === gt.name ? ' on' : '') + (on ? ' used' : ''), onclick: () => { sel = sel === gt.name ? null : gt.name; draw(); } }, gt.name)); });
    ok.disabled = Object.keys(place).length < slots.length;
    prog.textContent = sel ? `把「${sel}」放到城牆上的一個位置` : `先點下面的門名，再點城牆上的位置（還可以試 ${tries - used} 次）`;
  };
  const tapSlot = i => {
    if (!sel) { if (place[i]) { delete place[i]; T.sfx('tap'); draw(); } return; }
    for (const k in place) if (place[k] === sel) delete place[k];
    place[i] = sel; sel = null; T.sfx('tap'); draw();
  };
  const check = () => {
    used++;
    let right = 0;
    slots.forEach((s, i) => { const gt = gates.find(x => x.name === place[i]); const good = gt && gt.dir === s.dir; if (good) right++; slotEls[i].g.classList.add(good ? 'right' : 'wrong'); });
    if (right === slots.length) { T.sfx('good'); return T.later(900, () => T.finish(true, `四座門都放對了・試了 ${used} 次`, used === 1)); }
    T.sfx('fail');
    if (used >= tries) return T.later(1100, () => T.finish(false, `放對 ${right} / ${slots.length} 座`));
    prog.textContent = `放對 ${right} 座。紅色的位置再想想。`;
    T.later(1300, () => { slots.forEach((s, i) => { const gt = gates.find(x => x.name === place[i]); if (!gt || gt.dir !== s.dir) delete place[i]; }); draw(); });
  };
  draw();
  T.solveFn = () => { slots.forEach((s, i) => { place[i] = gates.find(x => x.dir === s.dir).name; }); draw(); check(); };
}

// ═════════ 組句：挑字組成句子 ═════════
function compose(T) {
  const d = T.d;
  T.header();
  const rounds = d.rounds.slice(0, D(T, [3, d.rounds.length, d.rounds.length]));
  const maxMiss = D(T, [6, 3, 1]);
  let r = 0, miss = 0, pick = [];
  const prog = el('div', { class: 'mg-progress' });
  const q = el('div', { class: 'cs-q' });
  const ans = el('div', { class: 'cs-ans' });
  const pool = el('div', { class: 'cs-pool' });
  const back = el('button', { class: 'btn small', onclick: () => { pick.pop(); T.sfx('tap'); draw(); } }, '退一個字');
  T.body.append(prog, q, ans, pool, back);
  let tiles = [];
  const answers = rd => [].concat(rd.a);
  const load = () => {
    const rd = rounds[r];
    const main = answers(rd)[0];
    const extra = shuffle([...(rd.extra || '')]).slice(0, D(T, [2, 4, 6]));
    tiles = shuffle([...main, ...extra]).map((ch, i) => ({ ch, i }));
    pick = []; draw();
  };
  const draw = () => {
    const rd = rounds[r];
    q.innerHTML = ''; q.append(el('small', {}, rd.who || ''), el('div', {}, rd.q));
    const len = answers(rd)[0].length;
    ans.innerHTML = '';
    for (let i = 0; i < len; i++) ans.appendChild(el('i', {}, pick[i] ? pick[i].ch : ''));
    pool.innerHTML = '';
    tiles.forEach(t => pool.appendChild(el('button', { class: 'cs-tile', disabled: pick.includes(t), onclick: () => add(t) }, t.ch)));
    prog.textContent = `第 ${r + 1} / ${rounds.length} 張紙・寫錯 ${miss} 次（最多 ${maxMiss} 次）`;
    back.disabled = !pick.length;
  };
  const add = t => {
    const rd = rounds[r];
    pick.push(t); T.sfx('tap'); draw();
    if (pick.length < answers(rd)[0].length) return;
    const s = pick.map(x => x.ch).join('');
    if (answers(rd).includes(s)) {
      T.sfx('good'); ans.classList.add('right');
      T.later(rd.reply ? 1600 : 800, () => {
        ans.classList.remove('right');
        r++;
        if (r >= rounds.length) return T.finish(miss <= maxMiss, `回答了 ${rounds.length} 張紙・寫錯 ${miss} 次`, miss === 0);
        load();
      });
      if (rd.reply) prog.textContent = rd.reply;
    } else {
      miss++; T.sfx('fail'); ans.classList.add('wrong');
      T.later(600, () => { ans.classList.remove('wrong'); pick = []; draw(); if (miss > maxMiss) T.finish(false, `寫錯 ${miss} 次`); });
    }
  };
  load();
  T.solveFn = async () => {
    while (r < rounds.length) {
      const main = answers(rounds[r])[0], rr = r;
      pick = [];
      for (const ch of main) { const t = tiles.find(x => x.ch === ch && !pick.includes(x)); add(t); }
      await new Promise(res => setTimeout(res, (rounds[rr].reply ? 1700 : 900)));
    }
  };
}

// ═════════ 節奏：音符跑到線上時按 ═════════
function rhythm(T) {
  const d = T.d;
  T.header();
  const bpm = d.bpm * D(T, [0.8, 1, 1.12]);
  const beat = 60 / bpm;
  const win = D(T, [0.24, 0.17, 0.12]);
  const pass = D(T, [0.55, 0.7, 0.82]);
  const notes = []; let tt = 0;
  for (const [f, b, ly] of d.song) { if (f) notes.push({ t: tt, f, ly, hit: false, miss: false }); tt += b * beat; }
  const total = tt;
  const speed = 140; // 每秒幾 px
  const lead = 2.2;
  let phase = d.call ? 'listen' : 'play', t0 = 0, hits = 0, misses = 0, started = false;
  const prog = el('div', { class: 'mg-progress' });
  const lane = el('div', { class: 'rh-lane idle' }, el('i', { class: 'rh-line' }));
  const lyric = el('div', { class: 'rh-lyric' }, '　');
  const dots = notes.map(n => { const e = el('b', { class: 'rh-note' }); lane.appendChild(e); n.el = e; return e; });
  const btn = el('button', { class: 'btn primary mg-tap rh-btn' }, d.button || '唱');
  const go = el('button', { class: 'btn', onclick: () => begin() }, d.call ? '開始聽' : '開始');
  T.body.append(prog, lane, lyric, btn, go);
  const setProg = () => { prog.textContent = phase === 'listen' ? (d.listenText || '先聽對面唱一次') : `跟上 ${hits} / ${notes.length} 個音（要 ${Math.ceil(notes.length * pass)} 個）`; };
  setProg();
  const begin = () => {
    if (started) return;
    started = true; go.remove(); lane.classList.remove('idle');
    notes.forEach(n => { n.hit = n.miss = false; n.auto = false; n.el.className = 'rh-note' + (phase === 'listen' ? ' ghost' : ''); });
    t0 = performance.now() / 1000 + lead;
    setProg();
  };
  const tap = e => {
    if (e) e.preventDefault();
    if (!started || phase !== 'play') return;
    const now = performance.now() / 1000 - t0;
    let best = null;
    for (const n of notes) if (!n.hit && !n.miss && Math.abs(n.t - now) <= win && (!best || Math.abs(n.t - now) < Math.abs(best.t - now))) best = n;
    btn.classList.remove('down'); void btn.offsetWidth; btn.classList.add('down');
    if (!best) return;
    best.hit = true; hits++;
    best.el.classList.add('hit');
    T.tone(best.f, beat * 0.9, 'triangle', 0.12);
    if (best.ly) lyric.textContent = best.ly;
    setProg();
  };
  btn.addEventListener('pointerdown', tap);
  const key = e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) tap(e); };
  document.addEventListener('keydown', key);
  T.onStop(() => document.removeEventListener('keydown', key));
  T.frame(() => {
    if (!started) return;
    const now = performance.now() / 1000 - t0;
    const w = lane.clientWidth || 300, hitX = w * 0.18;
    for (const n of notes) {
      n.el.style.transform = `translateX(${hitX + (n.t - now) * speed}px)`;
      if (phase === 'listen' && !n.auto && now >= n.t) { n.auto = true; n.el.classList.add('hit'); T.tone(n.f, beat * 0.9, 'sine', 0.08); if (n.ly) lyric.textContent = n.ly; }
      if (phase === 'play' && !n.hit && !n.miss && now > n.t + win) { n.miss = true; misses++; n.el.classList.add('miss'); }
    }
    if (now > total + 0.6) {
      if (phase === 'listen') { phase = 'play'; started = false; lyric.textContent = d.yourTurn || '換你了'; setProg(); T.later(900, begin); return; }
      started = false;
      const ok = hits >= Math.ceil(notes.length * pass);
      T.later(300, () => T.finish(ok, `跟上 ${hits} / ${notes.length} 個音`, hits === notes.length));
    }
  });
  T.solveFn = () => T.finish(true, `跟上 ${notes.length} / ${notes.length} 個音`);
  T.rhythmAuto = () => { // 自動測試：在每個音的時間按下去
    const loop = () => { if (!T.root.classList.contains('open')) return; if (started && phase === 'play') { const now = performance.now() / 1000 - t0; if (notes.some(n => !n.hit && !n.miss && Math.abs(n.t - now) < 0.04)) tap(); } setTimeout(loop, 15); };
    loop();
  };
}

// ═════════ 看風：判斷風往哪裡吹 ═════════
const WIND8 = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
function wind(T) {
  const d = T.d;
  T.header();
  const N = D(T, [3, 4, 5]), need = D(T, [2, 3, 4]);
  const dirs = T.diff === 0 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
  const sec = D(T, [0, 14, 9]);
  let r = 0, right = 0, ans = 0, shown = 0, locked = false;
  const prog = el('div', { class: 'mg-progress' });
  const box = svg('svg', { viewBox: '0 0 300 180', class: 'wd-svg' });
  const timer = el('div', { class: 'sr-timer' }, el('i'));
  const rose = el('div', { class: 'wd-rose' });
  const note = el('p', { class: 'muted small' });
  T.body.append(prog, box, ...(sec ? [timer] : []), el('p', { class: 'mg-q small' }, d.ask || '風往哪一邊吹？'), rose, note);
  WIND8.forEach((name, i) => rose.appendChild(el('button', { class: 'btn wd-b', style: { gridArea: 'd' + i }, disabled: !dirs.includes(i), onclick: () => pick(i) }, name)));
  rose.appendChild(el('span', { class: 'wd-c' }, '風往'));
  // 一個指標：位置、角度、種類、是不是在牆後面（不可靠）
  const drawRound = () => {
    box.innerHTML = '';
    svg('rect', { x: 0, y: 0, width: 300, height: 180, rx: 8, class: 'wd-ground' }, box);
    svg('text', { x: 286, y: 20, class: 'wd-n' }, box).textContent = '北↑';
    ans = dirs[rnd(dirs.length)];
    const fake = T.diff >= 1 && (T.diff === 2 || r % 2 === 1) ? rnd(3) : -1;
    const kinds = ['旗', '煙', '草'];
    kinds.forEach((k, i) => {
      const cx = 55 + i * 95, cy = 95;
      let dir = ans * 45;
      const sheltered = i === fake;
      if (sheltered) { dir = ((ans + 2 + rnd(5)) % 8) * 45; svg('rect', { x: cx - 38, y: cy - 46, width: 10, height: 92, class: 'wd-wall' }, box); }
      dir += (Math.random() - 0.5) * D(T, [10, 26, 36]);
      const g = svg('g', { transform: `translate(${cx} ${cy}) rotate(${dir})`, class: 'wd-ind' }, box);
      if (k === '旗') { svg('line', { x1: 0, y1: 0, x2: 0, y2: 0, class: 'wd-pole' }, g); svg('circle', { cx: 0, cy: 0, r: 4, class: 'wd-pole' }, g); svg('path', { d: 'M-8 0 L8 0 L0 -36 Z', class: 'wd-flag' }, g); }
      if (k === '煙') { for (let j = 0; j < 5; j++) svg('circle', { cx: Math.sin(j * 1.3) * 3, cy: -j * 8, r: 4 + j * 1.6, class: 'wd-smoke', style: `animation-delay:${j * 0.2}s` }, g); svg('rect', { x: -6, y: -2, width: 12, height: 8, class: 'wd-pole' }, g); }
      if (k === '草') { for (let j = -2; j <= 2; j++) { svg('path', { d: `M${j * 7} 12 L${j * 7} -20`, class: 'wd-grass' }, g); svg('circle', { cx: j * 7, cy: 12, r: 2.6, class: 'wd-root' }, g); } }
      svg('text', { x: cx, y: 172, class: 'wd-lab' }, box).textContent = k + (sheltered ? '（在牆後）' : '');
    });
    note.textContent = fake >= 0 ? (d.wallNote || '牆後面的東西，吹到的是繞過牆的風，不準。') : '';
    prog.textContent = `第 ${r + 1} / ${N} 次・看對 ${right}（要 ${need} 次）`;
    shown = performance.now(); locked = false;
  };
  const pick = i => {
    if (locked) return;
    locked = true;
    const ok = i === ans;
    if (ok) right++;
    T.sfx(ok ? 'good' : 'fail');
    rose.querySelectorAll('.wd-b').forEach((b, k) => b.classList.toggle('right', k === ans));
    if (!ok && i >= 0) rose.querySelectorAll('.wd-b')[i].classList.add('wrong');
    T.later(1000, () => {
      rose.querySelectorAll('.wd-b').forEach(b => b.classList.remove('right', 'wrong'));
      r++;
      if (r >= N) return T.finish(right >= need, `看對 ${right} / ${N} 次`, right === N);
      drawRound();
    });
  };
  if (sec) T.frame(now => { if (locked) return; const f = 1 - (now - shown) / 1000 / sec; timer.firstChild.style.width = Math.max(0, f) * 100 + '%'; if (f <= 0) pick(-1); });
  drawRound();
  T.solveFn = async () => { while (r < N) { pick(ans); await new Promise(res => setTimeout(res, 1100)); } };
}

export const MINI = { 接歌: song, 編織: weave, 潛行: stealth, 看潮: tide, 分類: sort2, 抄紙: paper, 翻牌: pairs, 水路: pipes, 方位: compass, 組句: compose, 節奏: rhythm, 看風: wind, ...MINI2, ...MINI3, ...MINI4 };
Object.assign(MINI_TIPS, TIPS2, TIPS3, TIPS4);
export const MINI_KINDS = Object.keys(MINI);
export { DIFF_NAME };
// 劇本「@小遊戲」可以用的所有種類（原本的＋新的）
export const MINI_ALL = ['譯字', '牽星', '識字', '透視', '研墨', '電碼', '描字', '修復', '排序', ...MINI_KINDS];
