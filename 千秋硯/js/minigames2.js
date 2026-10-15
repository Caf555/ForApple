// 動手玩的小遊戲（第二批：卷二、卷四、卷七、卷十）
// 寫法和 minigames.js 一樣：每一個玩法都是 T => void，T 是 debate.js 的 Translate
// 種類一覽：
//   灼骨（時機）：按住加熱，裂紋長到記號的範圍就放手
//   排音（聽音）：敲一敲每一片石磬，從低排到高
//   解繩（推理）：繩子疊在一起，只能先解最上面的那一條
//   火候（平衡）：按住鼓風，讓窯溫跟著目標升、穩住、再慢慢降
//   矛盾（推理）：五句話裡，找出放在一起就說不通的兩句
//   數石（見證）：沒有輸贏；把卵石十顆一堆排好，看兩邊差多少
//   消失點（推理）：看地板的線，點出所有的線收到哪一點
//   調色（組合）：用幾種顏料調出指定的顏色
//   記物（記憶）：先看，再把速寫裡漏掉的東西放回對的那一層
//   對照（找不同）：對照原話，點出被改掉的字
//   對話（平衡）：挑話題，讓痛苦指數待在中間
//   抽屜（推理）：照線索，找出對的抽屜
//   開關（推理）：每按一格，它和上下左右都會翻面，把全部打開
import { el } from './ui.js';
import { svg, rnd, shuffle, D, PENTA_HZ } from './minigames.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

export const TIPS2 = {
  灼骨: '裂紋到記號時放手', 排音: '從低排到高', 解繩: '先解最上面的繩子', 火候: '跟著目標控制窯溫', 矛盾: '找出說不通的兩句',
  數石: '一起數卵石', 消失點: '找出線收到哪一點', 調色: '調出指定的顏色', 記物: '把漏掉的放回去', 對照: '點出被改掉的字',
  對話: '讓指數待在中間', 抽屜: '照線索找抽屜', 開關: '把燈全部打開',
};

// 按住的按鈕：滑鼠、手指、空白鍵都可以
function holdButton(T, label, on, off) {
  const b = el('button', { class: 'btn primary mg-tap' }, label);
  let down = false;
  const start = e => { e.preventDefault(); if (down || b.disabled) return; down = true; b.classList.add('down'); on(); };
  const stop = e => { if (e) e.preventDefault(); if (!down) return; down = false; b.classList.remove('down'); off(); };
  b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
  b.addEventListener('contextmenu', e => e.preventDefault());
  const kd = e => { if (e.key === ' ' && !e.repeat) start(e); };
  const ku = e => { if (e.key === ' ') stop(e); };
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  T.onStop(() => { document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); });
  b.release = () => stop();
  return b;
}

// ═════════ 灼骨：按住加熱，裂紋長到記號就放手 ═════════
function burn(T) {
  const d = T.d;
  T.header();
  const N = d.rounds || 3, need = d.need || 2;
  const band = D(T, [0.24, 0.16, 0.11]);
  const speed = D(T, [0.38, 0.5, 0.62]);
  let r = 0, good = 0, len = 0, heating = false, lo = 0, done = false, last = 0;
  const prog = el('div', { class: 'mg-progress' });
  const box = svg('svg', { viewBox: '0 0 300 200', class: 'bn-svg' });
  svg('path', { d: 'M40 30 Q150 0 260 30 L250 170 Q150 196 50 170 Z', class: 'bn-bone' }, box);
  svg('ellipse', { cx: 150, cy: 100, rx: 12, ry: 22, class: 'bn-pit' }, box);
  const zone = svg('path', { class: 'bn-zone' }, box);
  const crack = svg('path', { class: 'bn-crack' }, box);
  const branch = svg('path', { class: 'bn-crack' }, box);
  const glow = svg('circle', { cx: 150, cy: 100, r: 20, class: 'bn-glow' }, box);
  const meter = el('div', { class: 'pp-meter bn-meter' }, el('b'), el('i'));
  const msg = el('p', { class: 'mg-q small' });
  const btn = holdButton(T, d.button || '灼', () => { if (!done) { heating = true; last = performance.now(); } }, () => release());
  T.body.append(prog, box, meter, msg, btn);
  // 裂紋往下長；長度 0～1，對應圖上 0～130 px
  const path = l => `M150 100 L150 ${100 - l * 70} `;
  const setRound = () => {
    lo = 0.35 + Math.random() * (0.85 - band - 0.35);
    len = 0; done = false; heating = false;
    meter.firstChild.style.left = lo * 100 + '%'; meter.firstChild.style.width = band * 100 + '%';
    const y1 = 100 - lo * 70, y2 = 100 - (lo + band) * 70;
    zone.setAttribute('d', `M140 ${y1} L160 ${y1} L160 ${y2} L140 ${y2} Z`);
    crack.setAttribute('d', path(0)); branch.setAttribute('d', '');
    box.classList.remove('broke');
    prog.textContent = `第 ${r + 1} / ${N} 片・讀出 ${good} 個兆（要 ${need} 個）`;
    msg.textContent = d.hint || '按住「灼」。裂紋長到金色的範圍，就放手。';
  };
  const release = () => {
    if (done || !heating) return;
    heating = false; done = true;
    const ok = len >= lo && len <= lo + band;
    if (ok) {
      good++; T.sfx('good');
      const up = Math.random() < 0.5;
      branch.setAttribute('d', `M150 ${100 - len * 60} L${up ? 178 : 176} ${100 - len * 60 + (up ? -16 : 14)}`);
      msg.textContent = up ? '兆紋往上翹。' : '兆紋往下垂。';
    } else {
      T.sfx('fail');
      msg.textContent = len < lo ? '火候不夠，骨頭沒有裂開。' : '燒太久了，裂紋亂了。';
    }
    r++;
    T.later(1100, () => { if (r >= N) return T.finish(good >= need, `讀出 ${good} / ${N} 個兆`, good === N); setRound(); });
  };
  T.frame(now => {
    if (heating && !done) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      len += speed * (0.6 + len) * dt;
      if (len >= 1) { len = 1; box.classList.add('broke'); btn.release(); release(); }
    }
    crack.setAttribute('d', path(len));
    meter.lastChild.style.left = Math.min(100, len * 100) + '%';
    glow.style.opacity = heating ? 0.8 : 0;
  });
  setRound();
  T.solveFn = () => T.finish(true, `讀出 ${N} / ${N} 個兆`);
  T.burnState = () => ({ len, lo, band, heating, done }); // 自動測試用
}

// ═════════ 排音：從低排到高 ═════════
function pitch(T) {
  const d = T.d;
  T.header();
  const n = D(T, [4, 5, 6]);
  const scale = [392, 440, 523.3, 587.3, 659.3, 784, 880, 1046.5];
  const pick = shuffle(scale).slice(0, n).sort((a, b) => a - b);
  let order = shuffle(pick.map((f, i) => i));
  while (order.every((v, i) => v === i)) order = shuffle(order);
  const tries = D(T, [3, 2, 1]);
  let used = 0, sel = -1;
  const prog = el('div', { class: 'mg-progress' });
  const rack = el('div', { class: 'ps-rack' });
  const ok = el('button', { class: 'btn primary', onclick: () => check() }, '敲一遍，確定');
  T.body.append(prog, rack, ok, el('p', { class: 'muted small' }, d.help || '點一片石磬會聽到它的聲音（關掉聲音的話，看石磬上震動的高低）。點一片、再點另一片，兩片會交換位置。從左到右，排成從低到高。'));
  const ring = (i, el2) => {
    const f = pick[order[i]];
    T.tone(f, 0.9, 'sine', 0.14); T.tone(f * 2.01, 0.5, 'sine', 0.03);
    el2.style.setProperty('--h', ((pick.indexOf(f) + 1) / n * 100) + '%');
    el2.classList.remove('ring'); void el2.offsetWidth; el2.classList.add('ring');
  };
  const draw = () => {
    rack.innerHTML = '';
    order.forEach((k, i) => {
      const b = el('button', { class: 'ps-stone' + (sel === i ? ' sel' : ''), 'data-i': i, style: T.diff === 0 ? { '--w': (100 - k * 7) + '%' } : {}, onclick: () => tap(i, b) }, el('i', { class: 'ps-wave' }), el('span', {}, '磬'));
      rack.appendChild(b);
    });
    prog.textContent = sel >= 0 ? '再點一片，兩片交換。' : `點一片聽聲音（還可以確定 ${tries - used} 次）`;
  };
  const tap = (i, b) => {
    ring(i, b);
    if (sel < 0) { sel = i; draw(); rack.children[i].classList.add('ring'); return; }
    if (sel !== i) [order[sel], order[i]] = [order[i], order[sel]];
    sel = -1; draw();
  };
  const check = async () => {
    used++; ok.disabled = true;
    for (let i = 0; i < n; i++) { ring(i, rack.children[i]); await wait(380); }
    const right = order.filter((v, i) => v === i).length;
    if (right === n) { T.sfx('good'); return T.later(500, () => T.finish(true, `排好了・試了 ${used} 次`, used === 1)); }
    T.sfx('fail');
    if (used >= tries) return T.later(500, () => T.finish(false, `排對 ${right} / ${n} 片`));
    [...rack.children].forEach((c, i) => c.classList.toggle('right', order[i] === i));
    prog.textContent = `排對 ${right} 片（亮金邊的）。再聽聽看。`;
    ok.disabled = false;
  };
  draw();
  T.solveFn = () => { order = pick.map((f, i) => i); draw(); check(); };
}

// ═════════ 解繩：只能先解最上面的那一條 ═════════
function ropes(T) {
  const d = T.d;
  T.header();
  const n = D(T, [4, 6, 8]);
  const maxMiss = D(T, [5, 3, 2]);
  const W = 300, H = 220;
  const colors = ['#c0402a', '#3a7ab8', '#d9a43a', '#4a9a5a', '#8a5ab8', '#d97aa0', '#3ab8b0', '#a07a4a'];
  // 每一條繩子：從左邊到右邊的一條彎線；z 越大越在上面
  const rs = [];
  for (let i = 0; i < n; i++) {
    const P = [[6, 20 + rnd(H - 40)], [90 + rnd(40), rnd(H)], [170 + rnd(40), rnd(H)], [W - 6, 20 + rnd(H - 40)]];
    rs.push({ i, z: 0, P, d: `M${P[0]} C${P[1]} ${P[2]} ${P[3]}`, cut: false, color: colors[i] });
  }
  shuffle(rs.map((r, k) => k)).forEach((k, z) => { rs[k].z = z; });
  // 兩條線有沒有交叉：取樣比對
  const box = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'rp-svg' });
  const bez = (P, t) => { const u = 1 - t; return [0, 1].map(k => u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]); };
  const probe = rs.map(r => Array.from({ length: 61 }, (_, k) => bez(r.P, k / 60)));
  const cross = (a, b) => { for (let i = 0; i < 60; i++) for (let j = 0; j < 60; j++) { const [p1, p2] = [probe[a][i], probe[a][i + 1]], [q1, q2] = [probe[b][j], probe[b][j + 1]]; const s = (x1, y1, x2, y2, x3, y3) => (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1); if (s(...p1, ...p2, ...q1) * s(...p1, ...p2, ...q2) < 0 && s(...q1, ...q2, ...p1) * s(...q1, ...q2, ...p2) < 0) return true; } return false; };
  const over = rs.map((r, a) => rs.filter((o, b) => b !== a && o.z > r.z && cross(a, b)).map(o => o.i));
  let miss = 0, cut = 0;
  const prog = el('div', { class: 'mg-progress' });
  T.body.append(prog, box, el('p', { class: 'muted small' }, d.help || '點一條繩子割斷它。被別的繩子壓住的，割不動，還會拉緊。'));
  const draw = () => {
    box.innerHTML = '';
    [...rs].sort((a, b) => a.z - b.z).forEach(r => {
      if (r.cut) return;
      const g = svg('g', { class: 'rp-rope', 'data-i': r.i }, box);
      svg('path', { d: r.d, class: 'rp-edge' }, g);
      svg('path', { d: r.d, class: 'rp-line', stroke: r.color }, g);
      svg('path', { d: r.d, class: 'rp-hit' }, g);
      g.addEventListener('click', () => tap(r));
    });
    prog.textContent = `割斷 ${cut} / ${n} 條・拉錯 ${miss} 次（最多 ${maxMiss} 次）`;
  };
  const free = r => over[r.i].every(k => rs[k].cut);
  const tap = r => {
    if (r.cut) return;
    if (!free(r)) {
      miss++; T.sfx('fail');
      box.classList.remove('tug'); void box.offsetWidth; box.classList.add('tug');
      draw();
      if (miss > maxMiss) T.later(500, () => T.finish(false, `拉錯 ${miss} 次`));
      return;
    }
    r.cut = true; cut++; T.sfx('tap'); draw();
    if (cut >= n) { T.sfx('good'); T.later(600, () => T.finish(true, `繩子都割斷了・拉錯 ${miss} 次`, miss === 0)); }
  };
  draw();
  T.solveFn = async () => { for (const r of [...rs].sort((a, b) => b.z - a.z)) { tap(r); await wait(80); } };
}

// ═════════ 火候：按住鼓風，跟著目標控制窯溫 ═════════
function kiln(T) {
  const d = T.d;
  T.header();
  const secs = D(T, [18, 21, 24]);
  const half = D(T, [0.15, 0.11, 0.08]);
  const pass = D(T, [0.55, 0.65, 0.75]);
  let t = 0, temp = 0.15, blowing = false, inBand = 0, running = false, last = 0, ended = false;
  const target = x => x < 0.3 ? 0.2 + (0.78 - 0.2) * x / 0.3 : x < 0.65 ? 0.78 : 0.78 - (0.78 - 0.4) * (x - 0.65) / 0.35;
  const prog = el('div', { class: 'mg-progress' });
  const box = svg('svg', { viewBox: '0 0 300 160', class: 'kl-svg' });
  svg('rect', { x: 0, y: 0, width: 300, height: 160, rx: 8, class: 'kl-bg' }, box);
  const bandPath = svg('path', { class: 'kl-band' }, box);
  const trail = svg('polyline', { class: 'kl-trail', points: '' }, box);
  const dot = svg('circle', { r: 5, class: 'kl-dot' }, box);
  const pts = [];
  // 目標帶：整段畫出來
  const top = [], bot = [];
  for (let k = 0; k <= 60; k++) { const x = k / 60; top.push(`${10 + x * 280},${150 - (target(x) + half) * 140}`); bot.unshift(`${10 + x * 280},${150 - (target(x) - half) * 140}`); }
  bandPath.setAttribute('d', 'M' + top.join(' L') + ' L' + bot.join(' L') + ' Z');
  const stage = el('p', { class: 'mg-q small' }, d.ready || '按「點火」開始。');
  const go = el('button', { class: 'btn', onclick: () => { if (running || ended) return; running = true; last = performance.now(); go.remove(); } }, '點火');
  const btn = holdButton(T, d.button || '鼓風', () => { blowing = true; }, () => { blowing = false; });
  T.body.append(prog, box, stage, btn, go);
  T.frame(now => {
    if (running && !ended) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      t += dt / secs;
      temp += ((blowing ? 0.32 : -0.14) + (Math.random() - 0.5) * 0.08) * dt;
      temp = Math.max(0, Math.min(1, temp));
      if (Math.abs(temp - target(Math.min(t, 1))) <= half) inBand += dt / secs;
      pts.push(`${10 + Math.min(t, 1) * 280},${150 - temp * 140}`);
      trail.setAttribute('points', pts.join(' '));
      stage.textContent = t < 0.3 ? (d.s1 || '慢慢升溫。') : t < 0.65 ? (d.s2 || '穩住火。') : (d.s3 || '慢慢降溫，不要一下子冷掉。');
      if (t >= 1) { ended = true; running = false; const ok = inBand >= pass; T.sfx(ok ? 'good' : 'fail'); T.later(500, () => T.finish(ok, `火候對的時間 ${Math.round(inBand * 100)}%`, inBand >= 0.9)); }
    }
    dot.setAttribute('cx', 10 + Math.min(t, 1) * 280); dot.setAttribute('cy', 150 - temp * 140);
    const on = Math.abs(temp - target(Math.min(t, 1))) <= half;
    dot.classList.toggle('in', on);
    prog.textContent = `火候對的時間：${Math.round(inBand * 100)}%（要 ${Math.round(pass * 100)}%）`;
  });
  T.solveFn = () => { ended = true; T.finish(true, '火候對的時間 100%'); };
  T.kilnState = () => ({ t, temp, target: target(Math.min(t, 1)), running }); // 自動測試用
  T.kilnBlow = b => { blowing = b; };
  T.kilnStart = () => go.click();
}

// ═════════ 矛盾：找出放在一起就說不通的兩句 ═════════
function contra(T) {
  const d = T.d;
  T.header();
  const rounds = d.rounds.slice(0, D(T, [2, d.rounds.length, d.rounds.length]));
  const maxMiss = D(T, [4, 2, 1]);
  let r = 0, miss = 0, pick = [];
  const prog = el('div', { class: 'mg-progress' });
  const who = el('div', { class: 'ct-who' });
  const list = el('div', { class: 'ct-list' });
  const note = el('p', { class: 'mg-intro small' });
  T.body.append(prog, who, list, note);
  const draw = () => {
    const rd = rounds[r];
    who.textContent = rd.who;
    list.innerHTML = '';
    rd.lines.forEach((t, i) => list.appendChild(el('button', { class: 'ct-line' + (pick.includes(i) ? ' on' : ''), 'data-i': i, onclick: () => tap(i) }, t)));
    prog.textContent = `第 ${r + 1} / ${rounds.length} 段・問錯 ${miss} 次（最多 ${maxMiss} 次）`;
  };
  const tap = i => {
    if (pick.length >= 2) return;
    if (pick.includes(i)) { pick = pick.filter(x => x !== i); return draw(); }
    pick.push(i); T.sfx('tap'); draw();
    if (pick.length < 2) return;
    const rd = rounds[r];
    const ok = rd.pair.includes(pick[0]) && rd.pair.includes(pick[1]);
    [...list.children].forEach((b, k) => { if (rd.pair.includes(k)) b.classList.add('right'); else if (pick.includes(k)) b.classList.add('wrong'); });
    note.textContent = rd.why;
    if (!ok) miss++;
    T.sfx(ok ? 'good' : 'fail');
    const next = el('button', { class: 'btn primary', onclick: () => {
      next.remove(); note.textContent = ''; pick = []; r++;
      if (miss > maxMiss) return T.finish(false, `問錯 ${miss} 次`);
      if (r >= rounds.length) return T.finish(true, `${rounds.length} 段都問倒了・問錯 ${miss} 次`, miss === 0);
      draw();
    } }, '下一段');
    T.body.appendChild(next);
  };
  draw();
  T.solveFn = async () => {
    while (r < rounds.length) { const rr = r; rounds[rr].pair.forEach(i => tap(i)); await wait(200); T.body.querySelector('.btn.primary')?.click(); await wait(100); }
  };
}

// ═════════ 數石：沒有輸贏，一起數 ═════════
function count(T) {
  const d = T.d;
  T.header();
  const [A, B] = d.counts; // 例如 [280, 220]
  let a = 0, b = 0, ended = false;
  const prog = el('div', { class: 'mg-progress' });
  const stage = el('div', { class: 'ck-stage' });
  const colA = el('div', { class: 'ck-col' }), colB = el('div', { class: 'ck-col' });
  stage.append(el('div', { class: 'ck-side' }, el('b', {}, d.left), colA, el('span', { class: 'ck-n' }, '0')), el('div', { class: 'ck-side' }, el('b', {}, d.right), colB, el('span', { class: 'ck-n' }, '0')));
  const btn = el('button', { class: 'btn primary mg-tap', onclick: () => step() }, d.button || '數十顆');
  const msg = el('p', { class: 'mg-q small' });
  T.body.append(prog, stage, btn, msg);
  const pile = (col, k) => { const p = el('i', { class: 'ck-pile' }); col.appendChild(p); return p; };
  const step = () => {
    if (ended) return;
    if (a < A) { a += 10; pile(colA); }
    if (b < B) { b += 10; pile(colB); }
    stage.querySelectorAll('.ck-n')[0].textContent = a; stage.querySelectorAll('.ck-n')[1].textContent = b;
    T.sfx('tap');
    prog.textContent = d.counting || '書記一堆一堆地數。';
    if (a >= A && b >= B) {
      ended = true; btn.disabled = true;
      const diff = (A - B) / 2 / 10; // 換邊的堆數
      [...colA.children].slice(-diff).forEach(p => p.classList.add('swing'));
      msg.textContent = d.end || '';
      T.later(1800, () => T.finish(true, `${d.left} ${A}・${d.right} ${B}`));
    }
  };
  prog.textContent = d.start || '按一下，數一堆。';
  T.solveFn = () => { while (!ended) step(); };
}

// ═════════ 消失點：所有的線收到哪一點 ═════════
function vanish(T) {
  const d = T.d;
  T.header();
  const N = d.rounds || 3, need = d.need || 2;
  const tol = D(T, [20, 13, 9]);
  let r = 0, good = 0, vp = [0, 0], locked = false;
  const prog = el('div', { class: 'mg-progress' });
  const box = svg('svg', { viewBox: '0 0 300 220', class: 'vp-svg' });
  const msg = el('p', { class: 'muted small' }, d.help || '每一條地板的線，延長以後都會碰在同一點。點出那一點。');
  T.body.append(prog, box, msg);
  const draw = () => {
    box.innerHTML = '';
    svg('rect', { x: 0, y: 0, width: 300, height: 220, class: 'vp-paper' }, box);
    vp = [60 + rnd(180), 40 + rnd(60)];
    // 地板：從下邊往消失點收，只畫到一半
    const xs = shuffle([-80, -20, 40, 100, 160, 220, 280, 340, 380]).slice(0, T.diff >= 2 ? 3 : 4);
    for (const x of xs) {
      const len = 0.35 + Math.random() * 0.2;
      svg('line', { x1: x, y1: 220, x2: x + (vp[0] - x) * len, y2: 220 + (vp[1] - 220) * len, class: 'vp-line' }, box);
      if (T.diff === 0) svg('line', { x1: x + (vp[0] - x) * len, y1: 220 + (vp[1] - 220) * len, x2: x + (vp[0] - x) * 0.75, y2: 220 + (vp[1] - 220) * 0.75, class: 'vp-hint' }, box);
    }
    // 幾條橫的磚縫，讓畫面像地板
    for (const t of [0.15, 0.3]) { const y = 220 + (vp[1] - 220) * t; svg('line', { x1: 0, y1: y, x2: 300, y2: y, class: 'vp-tile' }, box); }
    prog.textContent = `第 ${r + 1} / ${N} 張・找對 ${good} 張（要 ${need} 張）`;
    locked = false;
  };
  box.addEventListener('click', e => {
    if (locked) return;
    const m = box.getScreenCTM().inverse(); const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    locked = true;
    const dist = Math.hypot(p.x - vp[0], p.y - vp[1]);
    const ok = dist <= tol;
    if (ok) good++;
    T.sfx(ok ? 'good' : 'fail');
    svg('circle', { cx: p.x, cy: p.y, r: 5, class: 'vp-mine' + (ok ? ' ok' : '') }, box);
    box.querySelectorAll('.vp-line').forEach(l => svg('line', { x1: l.getAttribute('x2'), y1: l.getAttribute('y2'), x2: vp[0], y2: vp[1], class: 'vp-ext' }, box));
    svg('circle', { cx: vp[0], cy: vp[1], r: 4, class: 'vp-true' }, box);
    r++;
    T.later(1300, () => { if (r >= N) return T.finish(good >= need, `找對 ${good} / ${N} 張`, good === N); draw(); });
  });
  draw();
  T.solveFn = () => { T.finish(true, `找對 ${N} / ${N} 張`); };
  T.vpNow = () => vp; // 自動測試用
}

// ═════════ 調色：用幾種顏料調出指定的顏色 ═════════
const mixRGB = (pig, parts) => {
  let n = 0; const c = [0, 0, 0];
  for (const k in parts) { const v = parts[k]; if (!v) continue; n += v; pig[k].forEach((x, i) => { c[i] += x * v; }); }
  return n ? c.map(x => Math.round(x / n)) : null;
};
function mix(T) {
  const d = T.d;
  T.header();
  const rounds = d.targets.slice(0, D(T, [2, d.targets.length, d.targets.length]));
  const tol = D(T, [34, 24, 16]);
  const maxMiss = D(T, [5, 3, 2]);
  const maxDrops = d.maxDrops || 8;
  let r = 0, miss = 0, parts = {};
  const prog = el('div', { class: 'mg-progress' });
  const swatches = el('div', { class: 'mx-sw' });
  const tgt = el('div', { class: 'mx-c' }), mine = el('div', { class: 'mx-c' });
  swatches.append(el('div', {}, el('small', {}, '要調的顏色'), tgt), el('div', {}, el('small', {}, '你的調色盤'), mine));
  const label = el('div', { class: 'mg-q small' });
  const pigs = el('div', { class: 'mx-pigs' });
  const recipe = el('p', { class: 'muted small' });
  const row = el('div', { class: 'row-btns mx-row' },
    el('button', { class: 'btn', onclick: () => { parts = {}; T.sfx('tap'); draw(); } }, '倒掉重來'),
    el('button', { class: 'btn primary', onclick: () => check() }, '這個顏色可以'));
  T.body.append(prog, label, swatches, pigs, recipe, row);
  const rgb = c => c ? `rgb(${c.join(',')})` : 'transparent';
  const draw = () => {
    const rd = rounds[r];
    label.textContent = rd.name;
    tgt.style.background = rgb(mixRGB(d.pigments, rd.mix));
    mine.style.background = rgb(mixRGB(d.pigments, parts));
    mine.classList.toggle('empty', !Object.values(parts).some(Boolean));
    pigs.innerHTML = '';
    const total = Object.values(parts).reduce((s, v) => s + v, 0);
    for (const k in d.pigments) {
      const lim = d.limit && d.limit[k];
      const n = parts[k] || 0;
      pigs.appendChild(el('button', { class: 'mx-pig', disabled: total >= maxDrops || (lim != null && n >= lim), onclick: () => { parts[k] = n + 1; T.sfx('tap'); draw(); } },
        el('i', { style: { background: rgb(d.pigments[k]) } }), el('span', {}, k), n ? el('b', {}, '×' + n) : null));
    }
    recipe.textContent = (T.diff === 0 ? `提示：${rd.hint}` : rd.hint2 || '') + (d.limit ? `（${Object.entries(d.limit).map(([k, v]) => `${k}最多 ${v} 份`).join('、')}）` : '');
    prog.textContent = `第 ${r + 1} / ${rounds.length} 種顏色・放了 ${total} / ${maxDrops} 份・調錯 ${miss} 次（最多 ${maxMiss} 次）`;
  };
  const check = () => {
    const rd = rounds[r];
    const a = mixRGB(d.pigments, rd.mix), b = mixRGB(d.pigments, parts);
    if (!b) return;
    const dist = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (dist <= tol) {
      T.sfx('good'); r++; parts = {};
      if (r >= rounds.length) return T.finish(true, `${rounds.length} 種顏色都調好了・調錯 ${miss} 次`, miss === 0);
      return draw();
    }
    miss++; T.sfx('fail');
    mine.classList.remove('bad'); void mine.offsetWidth; mine.classList.add('bad');
    if (miss > maxMiss) return T.later(400, () => T.finish(false, `調錯 ${miss} 次`));
    draw();
    const hint = b[0] + b[1] + b[2] > a[0] + a[1] + a[2] + 40 ? '太淺了。' : b[0] + b[1] + b[2] < a[0] + a[1] + a[2] - 40 ? '太深了。' : '顏色不太對。';
    prog.textContent = hint + prog.textContent;
  };
  draw();
  T.solveFn = () => { while (r < rounds.length) { parts = { ...rounds[r].mix }; check(); } };
}

// ═════════ 記物：先看，再把漏掉的放回去 ═════════
function memo(T) {
  const d = T.d;
  T.header();
  const sec = D(T, [16, 11, 8]);
  const nMiss = D(T, [3, 4, 5]);
  const maxMiss = D(T, [4, 2, 1]);
  const layers = d.layers; // [{ name, items: [...] }]，由下往上
  const all = layers.flatMap((L, li) => L.items.map(t => ({ t, li })));
  const gone = shuffle(all).slice(0, nMiss);
  const decoys = shuffle(d.decoys || []).slice(0, D(T, [1, 2, 3]));
  let sel = null, miss = 0, put = 0;
  const prog = el('div', { class: 'mg-progress' });
  const pyre = el('div', { class: 'mm-pyre' });
  const pool = el('div', { class: 'cp-tiles' });
  T.body.append(prog, pyre);
  const drawPyre = (hide) => {
    pyre.innerHTML = '';
    [...layers].map((L, li) => [L, li]).reverse().forEach(([L, li]) => {
      const row = el('div', { class: 'mm-layer', style: { '--w': (100 - li * 9) + '%' }, 'data-li': li },
        el('small', {}, L.name),
        ...L.items.map(t => { const g = gone.find(x => x.t === t); return hide && g && !g.back ? el('i', { class: 'mm-blank', onclick: () => place(li) }, '□') : el('span', { class: g && g.back ? 'back' : '' }, t); }));
      pyre.appendChild(row);
    });
  };
  drawPyre(false);
  let left = sec;
  prog.textContent = `${d.look || '記住每一層放了什麼'}（${left} 秒）`;
  const tick = T.every(1000, () => { left--; prog.textContent = `${d.look || '記住每一層放了什麼'}（${left} 秒）`; if (left <= 0) phase2(); });
  const skip = el('button', { class: 'btn', onclick: () => phase2() }, '記好了');
  T.body.appendChild(skip);
  let p2 = false;
  function phase2() {
    if (p2) return; p2 = true;
    clearInterval(tick); skip.remove();
    pyre.classList.add('smoke');
    T.later(900, () => {
      pyre.classList.remove('smoke');
      drawPyre(true);
      T.body.append(el('p', { class: 'mg-q small' }, d.ask || '琪亞拉的速寫漏了幾樣。先點下面的東西，再點它在的那一層的空格。'), pool);
      drawPool();
    });
  }
  const drawPool = () => {
    pool.innerHTML = '';
    shuffle([...gone.filter(g => !g.back).map(g => g.t), ...decoys]).sort().forEach(t => pool.appendChild(el('button', { class: 'chip' + (sel === t ? ' on' : ''), onclick: () => { sel = sel === t ? null : t; drawPool(); } }, t)));
    prog.textContent = `放回 ${put} / ${gone.length} 樣・放錯 ${miss} 次（最多 ${maxMiss} 次）`;
  };
  const place = li => {
    if (!sel) return;
    const g = gone.find(x => x.t === sel && !x.back);
    if (g && g.li === li) { g.back = true; put++; T.sfx('item'); }
    else { miss++; T.sfx('fail'); }
    sel = null; drawPyre(true); drawPool();
    if (miss > maxMiss) return T.later(400, () => T.finish(false, `放錯 ${miss} 次`));
    if (put >= gone.length) T.later(500, () => T.finish(true, `都放回去了・放錯 ${miss} 次`, miss === 0));
  };
  T.solveFn = () => { phase2(); T.later(1000, () => { for (const g of gone) { sel = g.t; place(g.li); } }); };
}

// ═════════ 對照：點出被改掉的字 ═════════
function diffText(T) {
  const d = T.d;
  T.header();
  const rounds = d.rounds.slice(0, D(T, [2, d.rounds.length, d.rounds.length]));
  const maxMiss = D(T, [5, 3, 1]);
  let r = 0, miss = 0, found = 0;
  const prog = el('div', { class: 'mg-progress' });
  const orig = el('div', { class: 'df-orig' });
  const chg = el('div', { class: 'df-chg' });
  T.body.append(prog, el('small', { class: 'muted' }, d.origLabel || '他說過的話'), orig, el('small', { class: 'muted' }, d.chgLabel || '公證人唸的'), chg);
  const need = () => rounds[r].changed.filter(c => typeof c !== 'string').length;
  const draw = () => {
    const rd = rounds[r];
    orig.textContent = rd.orig;
    chg.innerHTML = '';
    rd.changed.forEach((c, i) => {
      const txt = typeof c === 'string' ? c : c.c;
      chg.appendChild(el('button', { class: 'df-chunk' + (c.hit ? ' hit' : '') + (c.bad ? ' bad' : ''), 'data-i': i, onclick: () => tap(i) }, txt));
    });
    prog.textContent = `第 ${r + 1} / ${rounds.length} 句・這一句還有 ${need() - found} 處被改過・點錯 ${miss} 次（最多 ${maxMiss} 次）`;
  };
  const tap = i => {
    const rd = rounds[r], c = rd.changed[i];
    if (typeof c !== 'string') {
      if (c.hit) return;
      rd.changed[i] = { ...c, hit: true }; found++; T.sfx('good');
    } else {
      miss++; T.sfx('fail');
      const b = chg.children[i]; b.classList.add('bad'); T.later(400, () => b.classList.remove('bad'));
      if (miss > maxMiss) return T.later(400, () => T.finish(false, `點錯 ${miss} 次`));
      prog.textContent = `那裡沒有被改過。・點錯 ${miss} 次（最多 ${maxMiss} 次）`;
      return;
    }
    draw();
    if (found >= need()) T.later(700, () => { r++; found = 0; if (r >= rounds.length) return T.finish(true, `找出所有被改的字・點錯 ${miss} 次`, miss === 0); draw(); });
  };
  draw();
  T.solveFn = async () => { while (r < rounds.length) { const rr = r; rounds[rr].changed.forEach((c, i) => { if (typeof c !== 'string' && !c.hit) tap(i); }); await wait(800); } };
}

// ═════════ 對話：讓指數待在中間 ═════════
function talk(T) {
  const d = T.d;
  T.header();
  const turns = D(T, [5, 6, 7]), need = D(T, [3, 4, 5]);
  const lo = d.band[0], hi = d.band[1];
  let v = d.start, turn = 0, inBand = 0, busy = false;
  const prog = el('div', { class: 'mg-progress' });
  const gauge = el('div', { class: 'tk-gauge' }, el('b', { style: { left: lo * 10 + '%', width: (hi - lo) * 10 + '%' } }), el('i'));
  const val = el('div', { class: 'tk-val' });
  const say = el('div', { class: 'tk-say' });
  const opts = el('div', { class: 'tk-opts' });
  T.body.append(prog, gauge, val, say, opts, el('p', { class: 'muted small' }, d.help || ''));
  const show = () => {
    gauge.lastChild.style.left = Math.max(0, Math.min(100, v * 10)) + '%';
    gauge.classList.toggle('in', v >= lo && v <= hi);
    val.textContent = `${d.meter || '痛苦指數'}：${v.toFixed(1)}`;
    prog.textContent = `第 ${Math.min(turn + 1, turns)} / ${turns} 句・待在中間 ${inBand} 句（要 ${need} 句）`;
  };
  const deal = () => {
    opts.innerHTML = '';
    shuffle(d.topics).slice(0, 3).forEach(tp => opts.appendChild(el('button', { class: 'btn tk-opt', onclick: () => pick(tp) },
      el('span', {}, tp.t), T.diff < 2 ? el('small', {}, tp.d[0] === tp.d[1] ? `${tp.d[0] >= 0 ? '+' : ''}${tp.d[0]}` : `${tp.d[0] >= 0 ? '+' : ''}${tp.d[0]} ～ ${tp.d[1] >= 0 ? '+' : ''}${tp.d[1]}`) : null)));
  };
  const pick = tp => {
    if (busy) return;
    busy = true;
    const delta = tp.d[0] + Math.random() * (tp.d[1] - tp.d[0]);
    v = Math.max(0, Math.min(10, v + delta - (d.drift || 0)));
    say.textContent = tp.reply || '';
    const ok = v >= lo && v <= hi;
    if (ok) inBand++;
    T.sfx(ok ? 'item' : 'fail');
    turn++; show();
    T.later(900, () => {
      busy = false;
      if (turn >= turns) return T.finish(inBand >= need, `待在中間 ${inBand} / ${turns} 句`, inBand === turns);
      deal();
    });
  };
  show(); deal();
  T.solveFn = () => T.finish(true, `待在中間 ${turns} / ${turns} 句`);
}

// ═════════ 抽屜：照線索找出對的抽屜 ═════════
function drawer(T) {
  const d = T.d;
  T.header();
  const tries = D(T, [3, 2, 1]);
  let used = 0, done = false;
  const prog = el('div', { class: 'mg-progress' });
  const clues = el('ul', { class: 'cp-clues' }, ...d.clues.slice(0, D(T, [d.clues.length, d.clues.length, d.clues.length - 1])).map(c => el('li', {}, c)));
  const grid = el('div', { class: 'dr-grid' });
  T.body.append(prog, clues, grid);
  const items = shuffle([d.answer, ...shuffle(d.decoys).slice(0, D(T, [8, 11, 15]))]);
  const draw = () => {
    grid.innerHTML = '';
    items.forEach(t => grid.appendChild(el('button', { class: 'dr-box', onclick: e => open(t, e.currentTarget) }, t)));
    prog.textContent = `還可以打開 ${tries - used} 次`;
  };
  const open = (t, b) => {
    if (done) return;
    used++;
    if (t === d.answer) { done = true; b.classList.add('right'); T.sfx('good'); return T.later(700, () => T.finish(true, `找到了・開了 ${used} 次`, used === 1)); }
    b.classList.add('wrong'); b.disabled = true; T.sfx('fail');
    if (used >= tries) { done = true; return T.later(700, () => T.finish(false, '沒有找到')); }
    prog.textContent = `${d.wrongText || '不是這一個。'}還可以打開 ${tries - used} 次`;
  };
  draw();
  T.solveFn = () => { const b = [...grid.children].find(x => x.textContent === d.answer); open(d.answer, b); };
}

// ═════════ 開關：按一格，它和上下左右都會翻面 ═════════
function lights(T) {
  const d = T.d;
  T.header();
  const n = D(T, [3, 4, 4]);
  const k = D(T, [3, 4, 6]);
  const g = Array.from({ length: n }, () => Array(n).fill(1));
  const presses = [];
  const flip = (x, y) => { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < n && b < n) g[b][a] ^= 1; } };
  while (presses.length < k) { const p = [rnd(n), rnd(n)]; if (presses.some(q => q[0] === p[0] && q[1] === p[1])) continue; presses.push(p); flip(...p); }
  const limit = D(T, [99, k * 4, k * 3]);
  let moves = 0, ended = false;
  const prog = el('div', { class: 'mg-progress' });
  const board = el('div', { class: 'lt-board', style: { gridTemplateColumns: `repeat(${n}, 1fr)` } });
  T.body.append(prog, board, el('p', { class: 'muted small' }, d.help || '點一格，它和上下左右的格子都會翻面（亮變暗、暗變亮）。把全部點亮。'));
  const draw = () => {
    board.innerHTML = '';
    g.forEach((row, y) => row.forEach((v, x) => board.appendChild(el('button', { class: 'lt-c' + (v ? ' on' : ''), 'data-x': x, 'data-y': y, onclick: () => tap(x, y) }))));
    prog.textContent = `亮了 ${g.flat().filter(Boolean).length} / ${n * n} 格・按了 ${moves} 次${limit < 99 ? `（最多 ${limit} 次）` : ''}`;
  };
  const tap = (x, y) => {
    if (ended) return;
    flip(x, y); moves++; T.sfx('tap'); draw();
    if (g.flat().every(Boolean)) { ended = true; board.classList.add('done'); T.sfx('good'); return T.later(800, () => T.finish(true, `全部打開了・按了 ${moves} 次`, moves <= k)); }
    if (moves >= limit) { ended = true; T.later(500, () => T.finish(false, `按了 ${moves} 次，還沒打開`)); }
  };
  draw();
  T.solveFn = () => { for (const p of presses) tap(...p); };
}

export const MINI2 = { 灼骨: burn, 排音: pitch, 解繩: ropes, 火候: kiln, 矛盾: contra, 數石: count, 消失點: vanish, 調色: mix, 記物: memo, 對照: diffText, 對話: talk, 抽屜: drawer, 開關: lights };
