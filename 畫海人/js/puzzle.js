// 遺跡小遊戲：每座島一種，跟島上的故事有關
// 低語礁「燈號」：照燈塔亮燈的順序點回去（記憶）
// 晨忘島「門牌」：翻開紙片，把名字和門配成一對（翻牌記憶）
// 沉船灣「航海圖」：把被打亂的航海圖碎片轉正（解謎）
// 千帆市「天秤」：典當品看不出多重，只看得到秤往哪邊歪；放砝碼讓兩邊一樣重（推理）
// 雙影嶼「對照」：登記冊上的圖和眼前的景色，找出不一樣的地方（找不同）
// 珠母潟湖「潮閘」：撥動分岔口的閘門，把潮水引到乾掉的珊瑚（路線推理）
// 帳房島「航線」：一筆畫連起所有浮標，每個只能經過一次（一筆畫）
// 紅帆港「旗語」：照旗語表，把桅杆上的旗子讀出來（讀密碼）
// 鐵喉礦坑「礦車」：推礦車，把每一台推到軌道終點的記號上（推箱子）
// 鍛火嶼「鍛火」：看準爐溫剛好的時候敲下去（抓時機）
// 紅岬「熔岩」：踩一塊石頭，它和上下左右的石頭會一起翻面，把全部踩成冷的（關燈遊戲）
// 灰燈渡「低語」：幾個聲音裡剛好一個在說謊，找出信要送到哪裡（推理）
// 鏡冰湖「冰滑」：推一下就一路滑到撞到東西才停，把小船滑進洞口（滑行）
// 斷桅灣「密碼鎖」：每猜一次，告訴你幾個數字和位置都對、幾個只有數字對（猜數字）
// 霧門「光路」：轉動冰稜鏡，讓光經過每一個燈座（折射光）
// 每個遊戲的外框上都掛著 solve()：只給自動試玩機器人用
// 每個小遊戲都回傳 Promise<boolean>：過關是 true
import { el, $ } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const wait = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const svgEl = (tag, a = {}) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); return n; };

// 依難度挑數字：[悠閒, 標準, 困難]
const byDiff = (ctx, arr) => arr[{ 悠閒: 0, 標準: 1, 困難: 2 }[ctx.g && ctx.g.diff] ?? 1];

// 共用的外框：標題、遊戲區、狀態、說明、按鈕
function frame(title, help) {
  const box = el('div', { class: 'survey puzzle' });
  const stage = el('div', { class: 'pz-stage' });
  const info = el('div', { class: 'sv-score' }, '');
  const msg = el('p', { class: 'sv-msg' }, help);
  const btns = el('div', { class: 'btns' });
  box.append(el('h2', {}, title), stage, info, msg, btns);
  $('layer').append(box);
  return { box, stage, info, msg, btns };
}
export const PUZZLES = ['燈號', '門牌', '航海圖', '天秤', '對照', '潮閘', '航線', '旗語', '礦車', '鍛火', '熔岩', '低語', '冰滑', '密碼鎖', '光路'];

// 遊戲結束：顯示結果，按下按鈕才關掉
function finish(f, win, line, res) {
  f.msg.textContent = line;
  f.btns.append(el('button', { class: 'btn primary', onclick: () => { f.box.remove(); res(win); } }, '繼續'));
}

export function playPuzzle(ctx, kind, place) {
  const game = { 燈號: lamps, 門牌: doors, 航海圖: chart, 天秤: balance, 對照: compare, 潮閘: sluice, 航線: route, 旗語: flags, 礦車: carts, 鍛火: forge, 熔岩: lava, 低語: whisper, 冰滑: iceSlide, 密碼鎖: lock, 光路: lightPath }[kind];
  return game(ctx, place);
}

// ═════════ 燈號：照順序點亮燈 ═════════
function lamps(ctx) {
  return new Promise(res => {
    const N = 5;
    const lens = byDiff(ctx, [[2, 3, 4], [3, 4, 5], [4, 5, 6]]);
    let chances = byDiff(ctx, [3, 2, 1]);
    const f = frame('燈號', '燈塔會照順序亮燈。看清楚以後，照同樣的順序點回去。');
    const row = el('div', { class: 'pz-lamps' });
    const bulbs = [...Array(N)].map((_, i) => el('button', { class: 'pz-lamp', 'aria-label': `第 ${i + 1} 盞燈`, disabled: true, onclick: () => press(i) }));
    row.append(...bulbs);
    f.stage.append(el('div', { class: 'pz-tower' }), row);
    const seq = [];
    let round = 0, step = 0, input = false;
    const lit = async (i, ms = 420) => { bulbs[i].classList.add('on'); ctx.audio.tone(i); await wait(ms); bulbs[i].classList.remove('on'); };
    const status = () => { f.info.textContent = `第 ${round + 1}／${lens.length} 輪　還可以錯 ${chances - 1} 次`; };
    const show = async () => {
      input = false; bulbs.forEach(b => (b.disabled = true));
      while (seq.length < lens[round]) seq.push(rnd(N));
      status();
      f.msg.textContent = '看清楚……';
      await wait(700);
      for (const i of seq) { await lit(i); await wait(180); }
      step = 0; input = true; bulbs.forEach(b => (b.disabled = false));
      f.msg.textContent = `換你了：照順序點 ${seq.length} 盞燈。`;
    };
    const press = async i => {
      if (!input) return;
      if (i !== seq[step]) {
        input = false; bulbs.forEach(b => (b.disabled = true));
        bulbs[i].classList.add('bad'); ctx.audio.sfx('fail');
        await wait(600); bulbs[i].classList.remove('bad');
        chances--;
        if (chances <= 0) return finish(f, false, '燈全熄了。霧裡傳來一聲很輕的嘆息。', res);
        f.msg.textContent = '順序不對。燈塔再亮一次……';
        await wait(500);
        return show();
      }
      lit(i, 260);
      step++;
      if (step < seq.length) return;
      input = false; bulbs.forEach(b => (b.disabled = true));
      round++;
      if (round >= lens.length) { f.info.textContent = '全部答對！'; ctx.audio.sfx('win'); return finish(f, true, '五盞燈一起亮了起來，照亮了石頭上的字。', res); }
      ctx.audio.sfx('item');
      f.msg.textContent = '答對了！下一輪，多一盞燈。';
      await wait(900);
      show();
    };
    f.box.solve = async () => { let last = -1; while (round < lens.length) { if (input && round !== last) { last = round; for (const i of seq) { await press(i); await wait(60); } } await wait(40); } };
    show();
  });
}

// ═════════ 門牌：名字和門配成一對 ═════════
const VILLAGERS = ['阿福', '秋娘', '石伯', '小梅', '老周', '阿蓮', '海生', '春嬸', '阿貴', '細妹'];
function doors(ctx) {
  return new Promise(res => {
    const pairs = byDiff(ctx, [4, 6, 8]);
    const limit = byDiff(ctx, [pairs * 3, pairs * 2 + 3, pairs * 2]);
    const names = shuffle([...VILLAGERS]).slice(0, pairs);
    const cards = shuffle(names.flatMap(n => [{ n, side: '名' }, { n, side: '門' }]));
    const f = frame('門牌', '翻開兩張紙片：把村人的名字和他家的門配成一對。翻的次數用完，鐘聲一響，大家又會忘記。');
    const grid = el('div', { class: 'pz-cards', style: { gridTemplateColumns: `repeat(4, 1fr)` } });
    let open = [], tries = 0, got = 0, busy = false;
    const status = () => { f.info.textContent = `配好 ${got}／${pairs}　還可以翻 ${limit - tries} 次`; };
    const nodes = cards.map(c => {
      const face = c.side === '名' ? el('span', { class: 'pz-face' }, el('small', {}, '名字'), c.n) : el('span', { class: 'pz-face door' }, el('small', {}, '的家'), c.n);
      const b = el('button', { class: 'pz-card', 'aria-label': '蓋著的紙片', onclick: () => flip(b, c) }, el('span', { class: 'pz-back' }, '？'), face);
      return b;
    });
    grid.append(...nodes);
    f.stage.append(grid);
    status();
    f.box.solve = async () => { for (const n of names) for (const side of ['名', '門']) { const k = cards.findIndex(c => c.n === n && c.side === side); while (busy) await wait(30); await flip(nodes[k], cards[k]); await wait(40); } };
    const flip = async (b, c) => {
      if (busy || b.classList.contains('up')) return;
      b.classList.add('up'); ctx.audio.sfx('tap');
      open.push([b, c]);
      if (open.length < 2) return;
      busy = true; tries++;
      const [[b1, c1], [b2, c2]] = open; open = [];
      if (c1.n === c2.n && c1.side !== c2.side) {
        got++; b1.classList.add('match'); b2.classList.add('match'); ctx.audio.sfx('item');
      } else {
        await wait(800); b1.classList.remove('up'); b2.classList.remove('up');
      }
      status(); busy = false;
      if (got === pairs) { ctx.audio.sfx('win'); return finish(f, true, '每一扇門，都找回了自己的名字。', res); }
      if (tries >= limit) {
        busy = true; ctx.audio.sfx('fail');
        nodes.forEach(n => n.classList.add('up'));
        return finish(f, false, '鐘聲響了。大家站在門口，又想不起來自己是誰。', res);
      }
    };
  });
}

// ═════════ 航海圖：把碎片轉正 ═════════
// 畫一張航海圖（100×100）：海岸、等深線、水深數字、航線、羅盤
function chartArt() {
  const g = svgEl('g');
  g.append(svgEl('rect', { x: 0, y: 0, width: 100, height: 100, class: 'pz-paper' }));
  for (let k = 0; k < 4; k++) {
    const y = 20 + k * 20 + rnd(6);
    g.append(svgEl('path', { d: `M 0 ${y} C 25 ${y - 8 - rnd(6)} 50 ${y + 8 + rnd(6)} 100 ${y - 4}`, class: 'pz-depth' }));
  }
  const cy = 30 + rnd(15);
  g.append(svgEl('path', { d: `M 0 0 L 0 ${cy + 20} C 20 ${cy + 10} 30 ${cy + 25} 48 ${cy} C 60 ${cy - 15} 75 ${cy + 5} 100 ${cy - 20} L 100 0 Z`, class: 'pz-land' }));
  g.append(svgEl('path', { d: `M 12 92 C 30 70 45 82 58 64 S 80 50 88 30`, class: 'pz-route' }));
  g.append(svgEl('circle', { cx: 88, cy: 30, r: 3, class: 'pz-x' }));
  const rose = svgEl('g', { transform: 'translate(22 72)', class: 'pz-rose' });
  rose.append(svgEl('path', { d: 'M 0 -10 L 3 0 L 0 10 L -3 0 Z' }), svgEl('path', { d: 'M -10 0 L 0 -2.5 L 10 0 L 0 2.5 Z', 'fill-opacity': '.5' }));
  const N = svgEl('text', { x: 0, y: -12, class: 'pz-num' }); N.textContent = '北';
  rose.append(N); g.append(rose);
  // 水深數字：每一塊都有幾個，轉歪了一眼就看得出來
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 2; k++) {
    const t = svgEl('text', { x: c * 25 + 4 + rnd(17), y: r * 25 + 8 + rnd(15), class: 'pz-num' });
    t.textContent = String(2 + rnd(30)); g.append(t);
  }
  return g;
}
function chart(ctx) {
  return new Promise(res => {
    const n = byDiff(ctx, [3, 3, 4]);
    const slack = byDiff(ctx, [14, 7, 5]);
    const art = chartArt();
    const rot = [...Array(n * n)].map(() => 1 + rnd(3));
    const need = rot.reduce((a, r) => a + (4 - r), 0);
    let left = need + slack;
    const f = frame('航海圖', '海燕號的航海圖被撕碎了。點一下碎片，它會轉 90 度。把每一塊都轉正，拼回完整的圖。');
    const grid = el('div', { class: 'pz-chart', style: { gridTemplateColumns: `repeat(${n}, 1fr)` } });
    const s = 100 / n;
    let over = false;
    const status = () => { f.info.textContent = `還沒轉正 ${rot.filter(r => r % 4).length} 塊　還可以轉 ${left} 次`; };
    const tiles = rot.map((_, i) => {
      const svg = svgEl('svg', { viewBox: `${(i % n) * s} ${Math.floor(i / n) * s} ${s} ${s}`, class: 'pz-piece' });
      svg.append(art.cloneNode(true));
      const b = el('button', { class: 'pz-tile', 'aria-label': `第 ${i + 1} 塊碎片`, onclick: () => turn(i) });
      b.append(svg);
      return b;
    });
    const paint = i => { tiles[i].style.transform = `rotate(${rot[i] * 90}deg)`; tiles[i].classList.toggle('ok', rot[i] % 4 === 0); };
    tiles.forEach((_, i) => paint(i));
    f.box.solve = async () => { for (let i = 0; i < rot.length; i++) while (rot[i] % 4 && !over) { turn(i); await wait(40); } };
    grid.append(...tiles);
    f.stage.append(grid);
    status();
    const turn = i => {
      if (over) return;
      rot[i]++; left--; paint(i); ctx.audio.sfx('pen');
      status();
      if (rot.every(r => r % 4 === 0)) {
        over = true; grid.classList.add('done'); ctx.audio.sfx('win');
        return finish(f, true, '航海圖拼好了。航線的盡頭，有一個用紅墨水畫的記號。', res);
      }
      if (left <= 0) {
        over = true; ctx.audio.sfx('fail');
        return finish(f, false, '碎片被海風吹亂了。只拼回了一點點。', res);
      }
    };
  });
}


// ═════════ 天秤：只看得到秤往哪邊歪 ═════════
function balance(ctx) {
  return new Promise(res => {
    const sets = [[1, 2, 4, 8], [1, 2, 3, 5, 8], [1, 2, 3, 6, 9, 12]];
    const rounds = byDiff(ctx, [2, 3, 3]);
    const slack = byDiff(ctx, [6, 3, 2]);
    const f = frame('天秤', '左邊的典當品看不出有多重，只看得到秤往哪邊歪。點下面的砝碼放到右邊（再點一次拿下來），讓兩邊一樣重。');
    const svg = svgEl('svg', { viewBox: '0 0 300 170', class: 'pz-scale' });
    svg.append(svgEl('rect', { x: 146, y: 40, width: 8, height: 120, class: 'pz-post' }), svgEl('rect', { x: 110, y: 156, width: 80, height: 8, class: 'pz-post' }));
    const beam = svgEl('g', { class: 'pz-beam' });
    beam.append(svgEl('rect', { x: 40, y: 38, width: 220, height: 6, rx: 3, class: 'pz-post' }));
    const pan = x => { const g2 = svgEl('g'); g2.append(svgEl('path', { d: `M${x} 44 L${x - 26} 104 M${x} 44 L${x + 26} 104`, class: 'pz-string' }), svgEl('path', { d: `M${x - 34} 104 Q${x} 124 ${x + 34} 104 Z`, class: 'pz-pan' })); return g2; };
    const lp = pan(60), rp = pan(240);
    const item = svgEl('g'); item.append(svgEl('rect', { x: 44, y: 82, width: 32, height: 24, rx: 4, class: 'pz-item' }));
    const q = svgEl('text', { x: 60, y: 100, class: 'pz-q' }); q.textContent = '？'; item.append(q);
    lp.append(item);
    const rtext = svgEl('text', { x: 240, y: 98, class: 'pz-q' }); rp.append(rtext);
    beam.append(lp, rp);
    svg.append(beam);
    const row = el('div', { class: 'pz-weights' });
    f.stage.append(svg, row);
    let round = 0, target = 0, ws = [], on = [], left = 0, over = false;
    const sum = () => ws.reduce((a, w, i) => a + (on[i] ? w : 0), 0);
    const paint = () => {
      const d = sum() - target, ang = d === 0 ? 0 : d > 0 ? 9 : -9;
      // 右邊比較重：順時針轉（右邊往下）；秤盤反方向轉回來，保持垂直
      beam.style.transform = `rotate(${ang}deg)`;
      lp.style.transform = `rotate(${-ang}deg)`; rp.style.transform = `rotate(${-ang}deg)`;
      rtext.textContent = sum() ? String(sum()) : '';
      [...row.children].forEach((b, i) => b.classList.toggle('on', !!on[i]));
      f.info.textContent = `第 ${round + 1}／${rounds} 件　還可以動 ${left} 次`;
    };
    const setup = () => {
      ws = sets[Math.min(round, sets.length - 1)];
      on = ws.map(() => false);
      // 典當品的重量：挑兩到四個砝碼加起來
      const k = 2 + rnd(Math.min(3, ws.length - 1));
      target = shuffle([...ws]).slice(0, k).reduce((a, b) => a + b, 0);
      left = ws.length * 2 + slack;
      row.innerHTML = '';
      ws.forEach((w, i) => row.append(el('button', { class: 'pz-weight', 'aria-label': `${w} 斤的砝碼`, onclick: () => tap(i) }, String(w))));
      f.msg.textContent = '秤往哪邊歪，就表示哪邊比較重。';
      paint();
    };
    const tap = async i => {
      if (over) return;
      on[i] = !on[i]; left--; ctx.audio.sfx('tap');
      paint();
      if (sum() === target) {
        over = true; ctx.audio.sfx('item');
        f.msg.textContent = `秤平了！典當品是 ${target} 斤。`;
        await wait(900);
        round++;
        if (round >= rounds) { ctx.audio.sfx('win'); return finish(f, true, '最後一件典當品秤平的時候，布掀開了：裡面是一束乾掉的花。', res); }
        over = false; setup(); return;
      }
      f.msg.textContent = sum() > target ? '右邊比較重。' : '左邊比較重。';
      if (left <= 0) { over = true; ctx.audio.sfx('fail'); return finish(f, false, '秤盤晃個不停，怎麼也平不下來。', res); }
    };
    f.box.solve = async () => {
      for (let m = 0; m < 1 << ws.length; m++) {
        if (ws.reduce((a, w, i) => a + (m >> i & 1 ? w : 0), 0) !== target) continue;
        for (let i = 0; i < ws.length; i++) if (!!(m >> i & 1) !== on[i]) { await tap(i); await wait(60); }
        return;
      }
    };
    setup();
  });
}

// ═════════ 對照：找出不一樣的地方 ═════════
const THINGS = ['house', 'tree', 'boat', 'flag', 'rock', 'tower', 'bird', 'well'];
function thing(kind, x, y, v, ink) {
  const g = svgEl('g', { class: 'pz-thing' + (ink ? ' ink' : '') });
  const P = (d, cls = 'a') => g.append(svgEl('path', { d, class: cls }));
  switch (kind) {
    case 'house': P(`M${x - 18} ${y + 18} V${y - 4} L${x} ${y - 20} L${x + 18} ${y - 4} V${y + 18} Z`); if (v) P(`M${x - 5} ${y} h10 v10 h-10 Z`, 'lit'); break;
    case 'tree': P(`M${x - 2} ${y + 18} V${y + 4} h4 V${y + 18} Z`); P(`M${x} ${y - 22} L${x + 16} ${y + 6} H${x - 16} Z`, v ? 'b' : 'a'); break;
    case 'boat': P(`M${x - 22} ${y + 6} H${x + 22} L${x + 14} ${y + 16} H${x - 14} Z`); P(`M${x} ${y + 6} V${y - 22} L${x + (v ? -16 : 16)} ${y} H${x} Z`, 'b'); break;
    case 'flag': P(`M${x - 8} ${y + 20} V${y - 22} h3 V${y + 20} Z`); P(`M${x - 5} ${y - 22} h22 l-6 7 l6 7 h-22 Z`, v ? 'red' : 'b'); break;
    case 'rock': P(`M${x - 20} ${y + 16} Q${x - 16} ${y - 8} ${x - 2} ${y - 10} Q${x + 18} ${y - 6} ${x + 20} ${y + 16} Z`); if (v) P(`M${x - 6} ${y - 2} l8 6`, 'line'); break;
    case 'tower': P(`M${x - 8} ${y + 20} L${x - 5} ${y - 16} H${x + 5} L${x + 8} ${y + 20} Z`); P(`M${x - 6} ${y - 24} h12 v8 h-12 Z`, v ? 'lit' : 'b'); break;
    case 'bird': P(`M${x - 14} ${y} q7 -8 14 0 q7 -8 14 0`, 'line'); if (v) P(`M${x - 4} ${y + 12} q4 -5 8 0 q4 -5 8 0`, 'line'); break;
    case 'well': P(`M${x - 14} ${y + 18} V${y} H${x + 14} V${y + 18} Z`); P(`M${x - 16} ${y - 16} H${x + 16} L${x + 12} ${y - 22} H${x - 12} Z`, v ? 'red' : 'b'); P(`M${x - 12} ${y - 16} V${y} M${x + 12} ${y - 16} V${y}`, 'line'); break;
  }
  return g;
}
function compare(ctx) {
  return new Promise(res => {
    const C = 4, R = 3, K = byDiff(ctx, [3, 5, 6]);
    let miss = byDiff(ctx, [5, 3, 2]);
    // 原本的樣子（登記冊）
    const a = [...Array(C * R)].map(() => Math.random() < 0.72 ? { k: THINGS[rnd(THINGS.length)], v: rnd(2) } : null);
    const b = a.map(x => x && { ...x });
    const diffs = shuffle([...Array(C * R).keys()]).slice(0, K);
    for (const i of diffs) {
      const x = a[i];
      if (!x) b[i] = { k: THINGS[rnd(THINGS.length)], v: rnd(2) };          // 多了一樣東西
      else { const r = rnd(3); if (r === 0) b[i] = null; else if (r === 1) b[i] = { ...x, v: 1 - x.v }; else b[i] = { k: THINGS.filter(t => t !== x.k)[rnd(THINGS.length - 1)], v: x.v }; }
    }
    const f = frame('對照', '上面是商會登記冊上畫的，下面是眼前的景色。找出不一樣的地方，點下面那一張。');
    const draw = (list, ink) => {
      const svg = svgEl('svg', { viewBox: `0 0 ${C * 80} ${R * 60}`, class: 'pz-view' + (ink ? ' ink' : '') });
      svg.append(svgEl('rect', { x: 0, y: 0, width: C * 80, height: R * 60, class: 'pz-bg' }), svgEl('path', { d: `M0 ${R * 60 - 22} Q${C * 20} ${R * 60 - 34} ${C * 40} ${R * 60 - 24} T${C * 80} ${R * 60 - 26} V${R * 60} H0 Z`, class: 'pz-water' }));
      list.forEach((x, i) => { if (x) svg.append(thing(x.k, (i % C) * 80 + 40, Math.floor(i / C) * 60 + 30, x.v, ink)); });
      return svg;
    };
    const top = draw(a, true), bot = draw(b, false);
    const wrap = el('div', { class: 'pz-compare' }, el('small', {}, '登記冊'), top, el('small', {}, '眼前'), bot);
    f.stage.append(wrap);
    const found = new Set();
    let over = false;
    const status = () => { f.info.textContent = `找到 ${found.size}／${K}　還可以點錯 ${miss} 次`; };
    const mark = i => { for (const svg of [top, bot]) svg.append(svgEl('circle', { cx: (i % C) * 80 + 40, cy: Math.floor(i / C) * 60 + 30, r: 26, class: 'pz-found' })); };
    const tapCell = i => {
      if (over || found.has(i)) return;
      if (diffs.includes(i)) {
        found.add(i); mark(i); ctx.audio.sfx('item'); status();
        if (found.size === K) { over = true; ctx.audio.sfx('win'); return finish(f, true, '每一個不一樣的地方，都被圈出來了。石壁上的字，慢慢浮了出來。', res); }
        return;
      }
      miss--; ctx.audio.sfx('fail'); status();
      const x = (i % C) * 80 + 40, y = Math.floor(i / C) * 60 + 30;
      const bad = svgEl('path', { d: `M${x - 10} ${y - 10} L${x + 10} ${y + 10} M${x + 10} ${y - 10} L${x - 10} ${y + 10}`, class: 'pz-miss' });
      bot.append(bad); setTimeout(() => bad.remove(), 700);
      if (miss <= 0) { over = true; diffs.forEach(d => !found.has(d) && mark(d)); return finish(f, false, '眼睛花了。冊子上的線和眼前的海岸，混在一起分不清楚。', res); }
    };
    for (const svg of [top, bot]) svg.addEventListener('click', e => {
      const r = svg.getBoundingClientRect();
      const c = Math.min(C - 1, Math.floor((e.clientX - r.left) / r.width * C)), rr = Math.min(R - 1, Math.floor((e.clientY - r.top) / r.height * R));
      tapCell(rr * C + c);
    });
    f.box.solve = async () => { for (const d of diffs) { tapCell(d); await wait(80); } };
    status();
  });
}

// ═════════ 潮閘：把潮水引到珊瑚 ═════════
// 每一格是「閘門」（往左或往右分水，點一下換方向）或「水道」（直直往下）
function sluice(ctx) {
  return new Promise(res => {
    const C = 5, R = byDiff(ctx, [4, 5, 6]), rounds = byDiff(ctx, [2, 3, 3]);
    let tries = byDiff(ctx, [7, 5, 4]);
    const f = frame('潮閘', '潮水從上面流下來。點分岔口的閘門換方向（箭頭），把水引到下面乾掉的珊瑚。想好了，再按「開閘放水」。');
    const CW = 60, CH = 54, TOP = 34;
    const svg = svgEl('svg', { viewBox: `0 0 ${C * CW} ${TOP + R * CH + 46}`, class: 'pz-sluice' });
    f.stage.append(svg);
    const go = el('button', { class: 'btn primary', onclick: () => release() }, '開閘放水');
    f.btns.append(go);
    let round = 0, grid = [], start = 0, goal = 0, busy = false;
    // 水從 (r, c) 流到下一列的哪一欄；流出邊界就是 -1
    const flow = () => { let c = start; const path = [c]; for (let r = 0; r < R; r++) { const x = grid[r][c]; c += x.gate ? x.dir : 0; if (c < 0 || c >= C) { path.push(-1); return path; } path.push(c); } return path; };
    const setup = () => {
      start = rnd(C);
      grid = [...Array(R)].map(() => [...Array(C)].map(() => Math.random() < 0.6 ? { gate: true, dir: Math.random() < 0.5 ? -1 : 1 } : { gate: false }));
      // 先走出一條答案，再把閘門打亂
      let c = start;
      for (let r = 0; r < R; r++) {
        const opts = [0]; if (c > 0) opts.push(-1); if (c < C - 1) opts.push(1);
        const m = opts[rnd(opts.length)];
        grid[r][c] = m ? { gate: true, dir: m } : { gate: false };
        c += m;
      }
      goal = c;
      let n = 0;
      do { for (const row of grid) for (const x of row) if (x.gate && Math.random() < 0.5) x.dir = -x.dir; n++; } while (flow()[R] === goal && n < 50);
      paint();
      f.msg.textContent = '點閘門可以換方向。水流出邊界，或流到別的地方，都要重來。';
    };
    const cx = c => c * CW + CW / 2, cy = r => TOP + r * CH + CH / 2;
    const paint = (path) => {
      svg.innerHTML = '';
      svg.append(svgEl('rect', { x: 0, y: 0, width: C * CW, height: TOP + R * CH + 46, class: 'pz-bg' }));
      // 入口
      svg.append(svgEl('path', { d: `M${cx(start) - 14} 4 h28 v18 h-28 Z`, class: 'pz-inlet' }));
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const x = grid[r][c], g = svgEl('g', { class: 'pz-cell' + (x.gate ? ' gate' : '') });
        g.append(svgEl('rect', { x: c * CW + 4, y: TOP + r * CH + 4, width: CW - 8, height: CH - 8, rx: 6, class: 'pz-slot' }));
        if (x.gate) g.append(svgEl('path', { d: x.dir < 0 ? `M${cx(c) + 12} ${cy(r) - 10} L${cx(c) - 12} ${cy(r) + 10} M${cx(c) - 12} ${cy(r) + 10} l3 -11 M${cx(c) - 12} ${cy(r) + 10} l11 -2` : `M${cx(c) - 12} ${cy(r) - 10} L${cx(c) + 12} ${cy(r) + 10} M${cx(c) + 12} ${cy(r) + 10} l-3 -11 M${cx(c) + 12} ${cy(r) + 10} l-11 -2`, class: 'pz-arrow' }));
        else g.append(svgEl('path', { d: `M${cx(c)} ${cy(r) - 14} V${cy(r) + 14}`, class: 'pz-pipe' }));
        if (x.gate) g.addEventListener('click', () => { if (busy) return; x.dir = -x.dir; ctx.audio.sfx('tap'); paint(); });
        svg.append(g);
      }
      // 底下：一株乾掉的珊瑚，其他是霧
      for (let c = 0; c < C; c++) {
        const y = TOP + R * CH + 12;
        if (c === goal) svg.append(svgEl('path', { d: `M${cx(c)} ${y + 28} V${y + 6} M${cx(c)} ${y + 18} l-9 -10 M${cx(c)} ${y + 13} l8 -9`, class: 'pz-coral' + (path && path[R] === goal ? ' wet' : '') }));
        else svg.append(svgEl('ellipse', { cx: cx(c), cy: y + 18, rx: 20, ry: 8, class: 'pz-fog' }));
      }
      if (path) {
        let d = `M${cx(start)} 22`;
        for (let r = 0; r < R; r++) { d += ` L${cx(path[r])} ${cy(r)}`; const n = path[r + 1]; d += n < 0 ? ` L${cx(path[r]) + (grid[r][path[r]].dir * CW * .6)} ${cy(r) + CH * .4}` : ` L${cx(n)} ${cy(r) + CH}`; if (n < 0) break; }
        if (path[R] >= 0) d += ` L${cx(path[R])} ${TOP + R * CH + 30}`;
        svg.append(svgEl('path', { d, class: 'pz-water-line', pathLength: 1 }));
      }
      f.info.textContent = `第 ${round + 1}／${rounds} 株珊瑚　還可以放水 ${tries} 次`;
    };
    const release = async () => {
      if (busy) return;
      busy = true; tries--;
      const path = flow();
      paint(path); ctx.audio.sfx('tide');
      await wait(1300);
      if (path[R] === goal) {
        ctx.audio.sfx('item'); round++;
        if (round >= rounds) { go.remove(); ctx.audio.sfx('win'); return finish(f, true, '潮水流過最後一株珊瑚。乾掉的珊瑚，一下子紅了起來。', res); }
        f.msg.textContent = '珊瑚喝到水了！下一株。'; await wait(700); busy = false; return setup();
      }
      ctx.audio.sfx('fail');
      if (tries <= 0) { go.remove(); return finish(f, false, '潮水流進了霧裡，再也收不回來。', res); }
      f.msg.textContent = path[R] < 0 ? '水從旁邊漏出去了。再想想看。' : '水流到霧裡去了。再想想看。';
      busy = false; paint();
    };
    f.box.solve = async () => {
      // 從上往下找一組閘門的方向
      const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (grid[r][c].gate) cells.push(grid[r][c]);
      const dfs = (r, c) => { if (r === R) return c === goal; const x = grid[r][c]; if (!x.gate) return dfs(r + 1, c); for (const d of [x.dir, -x.dir]) { if (c + d < 0 || c + d >= C) continue; const old = x.dir; x.dir = d; if (dfs(r + 1, c + d)) return true; x.dir = old; } return false; };
      dfs(0, start); paint(); await wait(80); await release();
    };
    setup();
  });
}

// ═════════ 航線：一筆畫連起所有浮標 ═════════
function hamPath(W, H) {
  // 隨機的一筆畫路線（每一格剛好經過一次）：越難走的格子越先走
  for (let tryN = 0; tryN < 200; tryN++) {
    const seen = new Set(), path = [];
    let c = [rnd(W), rnd(H)];
    const key = p => p[0] + ',' + p[1];
    const nb = p => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [p[0] + dx, p[1] + dy]).filter(q => q[0] >= 0 && q[1] >= 0 && q[0] < W && q[1] < H && !seen.has(key(q)));
    while (c) {
      seen.add(key(c)); path.push(c);
      const opts = shuffle(nb(c)).sort((p, q) => nb(p).length - nb(q).length);
      c = opts[0];
    }
    if (path.length === W * H) return path;
  }
  return null;
}
function route(ctx) {
  return new Promise(res => {
    const sizes = byDiff(ctx, [[[3, 4], [4, 4]], [[4, 4], [4, 5]], [[4, 5], [5, 5]]]);
    let fails = byDiff(ctx, [5, 3, 2]);
    const f = frame('航線', '從發光的浮標出發，沿著上下左右，一筆把每一個浮標都連起來。每個浮標只能經過一次。點最後一個浮標可以退一步。');
    const box = el('div', { class: 'pz-route' });
    f.stage.append(box);
    const redo = el('button', { class: 'btn', onclick: () => { if (!over && line.length > 1) giveUp('重新畫一次。'); } }, '重畫');
    f.btns.append(redo);
    let round = 0, W = 0, H = 0, cells = new Map(), line = [], over = false, total = 0;
    const key = p => p[0] + ',' + p[1];
    const status = () => { f.info.textContent = `第 ${round + 1}／${sizes.length} 張圖　連了 ${line.length}／${total} 個　還可以重來 ${fails} 次`; };
    const setup = () => {
      [W, H] = sizes[round];
      const path = hamPath(W, H);
      // 把最後幾格變成礁石，形狀比較不規則
      const cut = 1 + rnd(Math.min(3, Math.floor(W * H / 6)));
      const keep = path.slice(0, path.length - cut);
      total = keep.length;
      cells = new Map(keep.map(p => [key(p), p]));
      line = [keep[0]];
      box.style.gridTemplateColumns = `repeat(${W}, 1fr)`;
      box.style.aspectRatio = `${W} / ${H}`;
      draw();
    };
    const svg = svgEl('svg', { class: 'pz-route-lines' });
    const draw = () => {
      box.innerHTML = '';
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = '';
      if (line.length > 1) svg.append(svgEl('polyline', { points: line.map(p => `${p[0] + .5},${p[1] + .5}`).join(' '), class: 'pz-route-line' }));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = key([x, y]), here = cells.has(k), i = line.findIndex(p => key(p) === k);
        const b = el('button', { class: 'pz-buoy' + (here ? '' : ' reef') + (i >= 0 ? ' on' : '') + (i === 0 ? ' start' : '') + (i === line.length - 1 ? ' head' : ''), 'data-k': k, 'aria-label': here ? '浮標' : '礁石', disabled: !here || over });
        b.addEventListener('pointerdown', e => { e.preventDefault(); if (b.hasPointerCapture && b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId); dragging = true; step([x, y]); });
        box.append(b);
      }
      box.append(svg);
      status();
    };
    let dragging = false;
    box.addEventListener('pointermove', e => {
      if (!dragging) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (t && t.dataset && t.dataset.k) { const [x, y] = t.dataset.k.split(',').map(Number); step([x, y], true); }
    });
    box.addEventListener('pointerup', () => { dragging = false; });
    box.addEventListener('pointerleave', () => { dragging = false; });
    const step = (p, drag) => {
      if (over || !cells.has(key(p))) return;
      const last = line[line.length - 1], prev = line[line.length - 2];
      if (key(p) === key(last)) { if (!drag && line.length > 1) { line.pop(); draw(); } return; }
      if (prev && key(p) === key(prev)) { line.pop(); draw(); return; }
      if (line.some(q => key(q) === key(p))) return;
      if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) !== 1) return;
      line.push(p); ctx.audio.sfx('pen'); draw();
      if (line.length === total) return win();
      // 走不下去了：四周都是走過的或礁石
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [p[0] + dx, p[1] + dy]).filter(q => cells.has(key(q)) && !line.some(r => key(r) === key(q)));
      if (!nb.length) giveUp('走不下去了：四周的浮標都連過了。');
    };
    const giveUp = async why => {
      over = true; dragging = false; fails--; ctx.audio.sfx('fail'); status();
      if (fails <= 0) { draw(); return finish(f, false, '海風把墨跡吹散了。浮標還在原地，一個一個地晃。', res); }
      f.msg.textContent = why + '從發光的浮標重新開始。';
      await wait(900); over = false; line = [line[0]]; draw();
    };
    const win = async () => {
      over = true; ctx.audio.sfx('item');
      round++;
      if (round >= sizes.length) { redo.remove(); draw(); ctx.audio.sfx('win'); return finish(f, true, '最後一個浮標連上的時候，整片海面亮了起來，像一張剛畫好的海圖。', res); }
      f.msg.textContent = '連好了！下一張圖。';
      await wait(900); over = false; setup();
    };
    f.box.solve = async () => {
      // 從起點找一條經過所有浮標的路
      const start = line[0], seen = new Set([key(start)]), out = [start];
      const dfs = p => { if (out.length === total) return true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = [p[0] + dx, p[1] + dy]; if (!cells.has(key(q)) || seen.has(key(q))) continue; seen.add(key(q)); out.push(q); if (dfs(q)) return true; seen.delete(key(q)); out.pop(); } return false; };
      dfs(start);
      line = [start]; draw();
      for (const p of out.slice(1)) { step(p); await wait(30); }
    };
    setup();
  });
}


// ═════════ 旗語：照旗語表讀出桅杆上的旗子 ═════════
const FLAG_CHARS = ['紅', '帆', '回', '家', '火', '山', '名', '字', '海', '島'];
const PHRASES = { 2: ['回家', '紅帆', '火山', '名字', '海島'], 4: ['紅帆回家', '海島名字', '火山回家', '紅帆海島', '回家名字'], 6: ['紅帆回家海島', '火山海島名字', '海島紅帆回家'] };
// 每一面旗子的樣子（寬 40、高 28）
function flagSvg(i, cls = 'pz-flag') {
  const R = '#b0473a', W = '#efe6cf', G = '#d9a84a', T = '#3f8f8a', K = '#1c2a30';
  const art = [
    `<rect width="40" height="28" fill="${R}"/>`,
    `<rect width="40" height="14" fill="${R}"/><rect y="14" width="40" height="14" fill="${W}"/>`,
    `<rect width="40" height="28" fill="${W}"/><rect x="5" y="5" width="30" height="18" fill="none" stroke="${R}" stroke-width="4"/>`,
    `<rect width="40" height="28" fill="${T}"/><rect x="17" width="6" height="28" fill="${W}"/><rect y="11" width="40" height="6" fill="${W}"/>`,
    `<rect width="40" height="28" fill="${G}"/><path d="M0 28 L40 0 L40 28 Z" fill="${R}"/>`,
    `<rect width="40" height="28" fill="${W}"/><path d="M8 24 L20 5 L32 24 Z" fill="${K}"/>`,
    `<rect width="40" height="28" fill="${K}"/><circle cx="20" cy="14" r="6" fill="${W}"/>`,
    `<rect width="20" height="28" fill="${G}"/><rect x="20" width="20" height="28" fill="${T}"/>`,
    `<rect width="40" height="28" fill="${T}"/><path d="M0 7 q10 -4 20 0 t20 0 M0 14 q10 -4 20 0 t20 0 M0 21 q10 -4 20 0 t20 0" stroke="${W}" stroke-width="2.4" fill="none"/>`,
    `<rect width="40" height="28" fill="${W}"/><circle cx="20" cy="14" r="8" fill="${T}"/>`,
  ][i];
  return `<svg class="${cls}" viewBox="0 0 40 28" aria-hidden="true"><rect width="40" height="28" fill="#000" opacity=".2"/>${art}<rect width="40" height="28" fill="none" stroke="#1c2a30" stroke-width="1"/></svg>`;
}
function flags(ctx) {
  return new Promise(res => {
    const lens = byDiff(ctx, [[2, 4], [2, 4, 4], [4, 4, 6]]);
    let chances = byDiff(ctx, [4, 3, 2]);
    const f = frame('旗語', '桅杆上掛著一串旗子。照下面的旗語表，從上到下一面一面讀出來：點表上對應的字。');
    const mast = el('div', { class: 'pz-mast' });
    const ans = el('div', { class: 'pz-answer' });
    const table = el('div', { class: 'pz-flagtable' });
    f.stage.append(el('div', { class: 'pz-flagwrap' }, mast, ans), el('small', { class: 'muted' }, '旗語表（點一下，就是讀出這個字）'), table);
    let round = 0, msg = [], got = 0, busy = false;
    const keys = FLAG_CHARS.map((c, i) => {
      const b = el('button', { class: 'pz-flagkey', 'aria-label': c, onclick: () => pick(i) });
      b.innerHTML = flagSvg(i); b.append(el('b', {}, c));
      return b;
    });
    table.append(...keys);
    const status = () => { f.info.textContent = `第 ${round + 1}／${lens.length} 串旗子　還可以讀錯 ${chances - 1} 次`; };
    const setup = () => {
      const pool = PHRASES[lens[round]];
      msg = [...pool[rnd(pool.length)]].map(c => FLAG_CHARS.indexOf(c));
      got = 0; mast.innerHTML = ''; ans.innerHTML = '';
      msg.forEach((i, k) => { const d = el('div', { class: 'pz-mflag' + (k === 0 ? ' now' : '') }); d.innerHTML = flagSvg(i); mast.append(d); ans.append(el('span', { class: 'pz-slotc' }, '？')); });
      status();
    };
    const pick = async i => {
      if (busy) return;
      if (i === msg[got]) {
        ctx.audio.sfx('tap');
        ans.children[got].textContent = FLAG_CHARS[i]; ans.children[got].classList.add('ok');
        mast.children[got].classList.remove('now'); mast.children[got].classList.add('read');
        got++;
        if (got < msg.length) { mast.children[got].classList.add('now'); return; }
        busy = true; ctx.audio.sfx('item');
        f.msg.textContent = `讀出來了：「${msg.map(k => FLAG_CHARS[k]).join('')}」`;
        await wait(1000);
        round++;
        if (round >= lens.length) { ctx.audio.sfx('win'); return finish(f, true, '最後一串旗子讀完的時候，桅杆上所有的旗子，一起被風吹了起來。', res); }
        busy = false; f.msg.textContent = '下一串旗子升上來了。'; setup(); return;
      }
      chances--; ctx.audio.sfx('fail');
      keys[i].classList.add('bad'); setTimeout(() => keys[i].classList.remove('bad'), 500);
      status();
      if (chances <= 0) { busy = true; return finish(f, false, '旗子被風吹亂了，再也看不清楚。', res); }
      f.msg.textContent = '不是這個字。看清楚旗子的顏色和花紋。';
    };
    f.box.solve = async () => { while (got < msg.length && !busy) { pick(msg[got]); await wait(60); } };
    setup();
  });
}

// ═════════ 礦車：把礦車推到記號上（推箱子） ═════════
// # 石壁　. 記號　$ 礦車　@ 礦工　* 停在記號上的礦車
const CART_LEVELS = {
  easy: [['#######', '#     #', '# $@. #', '#     #', '#######'], ['######', '#.   #', '# $$ #', '#. @ #', '######'], ['#######', '#.  ..#', '# $$$ #', '#  @  #', '#######']],
  hard: [['#######', '#. #  #', '# $   #', '#  #$.#', '# @   #', '#######'], ['######', '#    #', '#.##@#', '# $  #', '# $#.#', '#    #', '######'], ['#######', '#.    #', '#.#$# #', '#  $  #', '# #@# #', '#     #', '#######']],
};
function parseLevel(rows) {
  const H = rows.length, W = Math.max(...rows.map(r => r.length));
  const wall = new Set(), goals = new Set(), carts = []; let me = 0;
  rows.forEach((r, y) => [...r.padEnd(W, '#')].forEach((ch, x) => {
    const k = y * W + x;
    if (ch === '#') wall.add(k);
    if ('.*+'.includes(ch)) goals.add(k);
    if ('$*'.includes(ch)) carts.push(k);
    if ('@+'.includes(ch)) me = k;
  }));
  return { W, H, wall, goals, me, carts };
}
// 找最少步數的推法（給機器人用，也用來決定步數上限）
function solveCarts(L, me, carts) {
  const { W, wall, goals } = L, D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (m, c) => m + '|' + [...c].sort((a, b) => a - b).join(',');
  const q = [[me, carts, []]], seen = new Set([key(me, carts)]);
  while (q.length) {
    const [m, c, path] = q.shift();
    if (c.every(k => goals.has(k))) return path;
    for (const [dx, dy] of D) {
      const t = m + dx + dy * W;
      if (wall.has(t)) continue;
      let nc = c;
      if (c.includes(t)) { const b = t + dx + dy * W; if (wall.has(b) || c.includes(b)) continue; nc = c.map(k => k === t ? b : k); }
      const kk = key(t, nc); if (seen.has(kk)) continue; seen.add(kk);
      q.push([t, nc, [...path, [dx, dy]]]);
    }
  }
  return null;
}
function carts(ctx) {
  return new Promise(res => {
    const plan = byDiff(ctx, [['easy', 'easy'], ['easy', 'hard'], ['easy', 'hard', 'hard']]);
    let tries = byDiff(ctx, [4, 3, 2]);
    const f = frame('礦車', '用下面的方向鍵（或點礦工旁邊的格子）走路。走到礦車後面就會推它往前；礦車只能推，不能拉。把每一台礦車都推到白色記號上。');
    const grid = el('div', { class: 'pz-mine' });
    const pad = el('div', { class: 'pz-pad' });
    f.stage.append(grid, pad);
    const used = { easy: [], hard: [] };
    let round = 0, L = null, me = 0, cs = [], hist = [], moves = 0, limit = 0, busy = false;
    const redo = el('button', { class: 'btn', onclick: () => { if (!busy && hist.length) lose('重新來過。'); } }, '重來');
    const undo = el('button', { class: 'btn', onclick: () => { if (busy || !hist.length) return; [me, cs] = hist.pop(); ctx.audio.sfx('tap'); draw(); } }, '退一步');
    f.btns.append(undo, redo);
    const status = () => { f.info.textContent = `第 ${round + 1}／${plan.length} 段軌道　走了 ${moves}／${limit} 步　還可以重來 ${tries - 1} 次`; };
    const setup = () => {
      const pool = CART_LEVELS[plan[round]].map((_, i) => i).filter(i => !used[plan[round]].includes(i));
      const pickI = pool[rnd(pool.length)]; used[plan[round]].push(pickI);
      L = parseLevel(CART_LEVELS[plan[round]][pickI]);
      reset();
    };
    const reset = () => {
      me = L.me; cs = [...L.carts]; hist = []; moves = 0;
      limit = solveCarts(L, me, cs).length * 2 + 10;
      grid.style.gridTemplateColumns = `repeat(${L.W}, 1fr)`;
      draw();
    };
    const draw = () => {
      grid.innerHTML = '';
      for (let k = 0; k < L.W * L.H; k++) {
        const c = el('div', { class: 'pz-mc' + (L.wall.has(k) ? ' wall' : '') + (L.goals.has(k) ? ' goal' : '') + (cs.includes(k) ? ' cart' + (L.goals.has(k) ? ' in' : '') : '') + (k === me ? ' me' : '') });
        const d = k - me;
        if (!L.wall.has(k) && [1, -1, L.W, -L.W].includes(d) && !(Math.abs(d) === 1 && Math.floor(k / L.W) !== Math.floor(me / L.W))) c.addEventListener('click', () => step(d === 1 || d === -1 ? d : 0, d === L.W ? 1 : d === -L.W ? -1 : 0));
        grid.append(c);
      }
      status();
    };
    const step = async (dx, dy) => {
      if (busy) return;
      const t = me + dx + dy * L.W;
      if (L.wall.has(t)) return;
      const prev = [me, [...cs]];
      if (cs.includes(t)) {
        const b = t + dx + dy * L.W;
        if (L.wall.has(b) || cs.includes(b)) return;
        cs = cs.map(k => k === t ? b : k); ctx.audio.sfx('step');
      } else ctx.audio.sfx('tap');
      hist.push(prev); me = t; moves++;
      draw();
      if (cs.every(k => L.goals.has(k))) {
        busy = true; ctx.audio.sfx('item');
        round++;
        if (round >= plan.length) { undo.remove(); redo.remove(); ctx.audio.sfx('win'); return finish(f, true, '最後一台礦車停在記號上的時候，軌道盡頭的石壁，喀的一聲，裂開了一道縫。', res); }
        f.msg.textContent = '礦車都到了！下一段軌道。';
        await wait(900); busy = false; setup(); return;
      }
      if (moves >= limit) lose('力氣用完了，礦車推不動了。');
    };
    const lose = async why => {
      tries--; ctx.audio.sfx('fail');
      if (tries <= 0) { busy = true; undo.remove(); redo.remove(); status(); return finish(f, false, '礦車卡在軌道上，怎麼推都推不動了。', res); }
      busy = true; f.msg.textContent = why + '礦車回到了原來的地方。';
      await wait(700); busy = false; reset();
    };
    const dir = (label, dx, dy, area) => el('button', { class: 'btn pz-dir', style: { gridArea: area }, 'aria-label': label, onclick: () => step(dx, dy) }, label);
    pad.append(dir('↑', 0, -1, 'u'), dir('←', -1, 0, 'l'), dir('→', 1, 0, 'r'), dir('↓', 0, 1, 'd'));
    f.box.solve = async () => { const p = solveCarts(L, me, cs); for (const [dx, dy] of p || []) { await step(dx, dy); await wait(40); } };
    setup();
  });
}

// ═════════ 鍛火：看準爐溫敲下去 ═════════
function forge(ctx) {
  return new Promise(res => {
    const need = byDiff(ctx, [3, 4, 5]);
    let misses = byDiff(ctx, [3, 2, 2]);
    const w0 = byDiff(ctx, [0.28, 0.22, 0.17]), sp0 = byDiff(ctx, [0.5, 0.65, 0.8]);
    const f = frame('鍛火', '爐溫會一直上上下下。看準指針走到金色那一段（溫度剛好）的時候，按「敲！」。');
    const bar = el('div', { class: 'pz-heat' });
    const zone = el('div', { class: 'pz-zone' });
    const needle = el('div', { class: 'pz-needle' });
    bar.append(zone, needle);
    const iron = el('div', { class: 'pz-iron' });
    const hit = el('button', { class: 'btn primary pz-hit', onclick: () => strike() }, '敲！');
    f.stage.append(iron, bar, hit);
    let hits = 0, width = w0, speed = sp0, center = 0.5, t0 = performance.now(), pos = 0, busy = false, over = false, raf = 0;
    const status = () => { f.info.textContent = `敲好了 ${hits}／${need} 下　還可以敲歪 ${misses - 1} 次`; iron.style.setProperty('--done', hits / need); };
    const place = () => { center = width / 2 + 0.04 + Math.random() * (1 - width - 0.08); zone.style.left = `${(center - width / 2) * 100}%`; zone.style.width = `${width * 100}%`; };
    const tick = now => {
      if (over) return;
      const ph = ((now - t0) / 1000 * speed) % 2;
      pos = ph < 1 ? ph : 2 - ph;
      needle.style.left = `${pos * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    const strike = async () => {
      if (busy || over) return;
      busy = true;
      const ok = Math.abs(pos - center) <= width / 2;
      needle.classList.add(ok ? 'good' : 'bad');
      if (ok) {
        hits++; ctx.audio.sfx('hit'); iron.classList.remove('ring'); void iron.offsetWidth; iron.classList.add('ring');
        status();
        if (hits >= need) { over = true; cancelAnimationFrame(raf); hit.remove(); ctx.audio.sfx('win'); return finish(f, true, '最後一鎚落下，鐵發出很清很清的聲音。冷掉的鐵砧上，浮出了一行字。', res); }
        width = Math.max(0.08, width * 0.82); speed *= 1.12;
        f.msg.textContent = '敲得好！爐溫越來越難抓了。';
      } else {
        misses--; ctx.audio.sfx('fail'); status();
        if (misses <= 0) { over = true; cancelAnimationFrame(raf); hit.remove(); return finish(f, false, '鐵敲歪了，冷掉了。再也打不回原來的形狀。', res); }
        f.msg.textContent = pos < center ? '太冷了！等指針走到金色那一段。' : '太燙了！等指針走到金色那一段。';
      }
      await wait(450);
      needle.classList.remove('good', 'bad');
      place(); busy = false;
    };
    f.box.solve = async () => { while (!over) { if (!busy && Math.abs(pos - center) <= width / 3) await strike(); await wait(8); } };
    status(); place(); raf = requestAnimationFrame(tick);
  });
}

// ═════════ 熔岩：踩成冷的（關燈遊戲） ═════════
function lava(ctx) {
  return new Promise(res => {
    const plan = byDiff(ctx, [[3, 3], [3, 4], [4, 4]]);
    let tries = byDiff(ctx, [4, 3, 2]);
    const f = frame('熔岩', '紅色的石頭還很燙。踩一塊石頭，它和上下左右的石頭會一起翻面（燙的變冷、冷的變燙）。把全部的石頭都變成冷的（黑色）。');
    const grid = el('div', { class: 'pz-lava' });
    f.stage.append(grid);
    const redo = el('button', { class: 'btn', onclick: () => { if (!busy && steps) lose('重新來過。'); } }, '重來');
    f.btns.append(redo);
    let round = 0, N = 3, hot = [], start = [], gen = [], mine = [], steps = 0, limit = 0, busy = false;
    const flip = (b, i) => { const x = i % N, y = Math.floor(i / N); for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, c = y + dy; if (a >= 0 && c >= 0 && a < N && c < N) b[c * N + a] ^= 1; } };
    const status = () => { f.info.textContent = `第 ${round + 1}／${plan.length} 片熔岩田　踩了 ${steps}／${limit} 步　還可以重來 ${tries - 1} 次`; };
    const setup = () => {
      N = plan[round];
      const k = N === 3 ? 3 : 4 + rnd(2);
      gen = Array(N * N).fill(0);
      for (const i of shuffle([...Array(N * N).keys()]).slice(0, k)) gen[i] = 1;
      start = Array(N * N).fill(0);
      gen.forEach((v, i) => { if (v) flip(start, i); });
      limit = k * 3 + 6;
      reset();
    };
    const reset = () => { hot = [...start]; mine = Array(N * N).fill(0); steps = 0; draw(); };
    const draw = () => {
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
      hot.forEach((v, i) => grid.append(el('button', { class: 'pz-stone' + (v ? ' hot' : ''), 'aria-label': v ? '燙的石頭' : '冷的石頭', onclick: () => press(i) })));
      status();
    };
    const press = async i => {
      if (busy) return;
      flip(hot, i); mine[i] ^= 1; steps++; ctx.audio.sfx('step');
      draw();
      if (hot.every(v => !v)) {
        busy = true; ctx.audio.sfx('item');
        round++;
        if (round >= plan.length) { redo.remove(); ctx.audio.sfx('win'); return finish(f, true, '最後一塊石頭冷下來的時候，熔岩田的正中間，慢慢露出了一塊石碑。', res); }
        f.msg.textContent = '全部冷下來了！下一片熔岩田。';
        await wait(900); busy = false; setup(); return;
      }
      if (steps >= limit) lose('腳底太燙了，只好退回去。');
    };
    const lose = async why => {
      tries--; ctx.audio.sfx('fail');
      if (tries <= 0) { busy = true; redo.remove(); status(); return finish(f, false, '熔岩田又燙了起來，走不過去了。', res); }
      busy = true; f.msg.textContent = why + '石頭回到了一開始的樣子。';
      await wait(700); busy = false; reset();
    };
    // 解法：一開始產生熔岩田時踩過的格子，再扣掉玩家已經踩過的（踩兩次等於沒踩）
    f.box.solve = async () => { const sol = gen.map((v, i) => v ^ mine[i]); for (let i = 0; i < sol.length; i++) if (sol[i]) { await press(i); await wait(50); } };
    setup();
  });
}

// ═════════ 低語：幾個聲音裡，剛好有一個在說謊（推理） ═════════
const PLACES = ['東邊的棧橋', '西邊的棧橋', '北邊的燈', '南邊的燈', '守霧人的屋子'];
const VOICES = ['低沉的聲音', '小孩的聲音', '沙啞的聲音', '溫柔的聲音'];
const sayText = s => s.t === 'is' ? `信要送到『${PLACES[s.x]}』。` : s.t === 'not' ? `信不是送到『${PLACES[s.x]}』。` : `不是『${PLACES[s.x]}』，就是『${PLACES[s.y]}』。`;
const sayTrue = (s, a) => s.t === 'is' ? a === s.x : s.t === 'not' ? a !== s.x : a === s.x || a === s.y;
// 剛好一句是假話的地點（答案唯一才拿來出題）
const liarAnswers = (says, n) => [...Array(n).keys()].filter(a => says.filter(s => !sayTrue(s, a)).length === 1);
function makeWhisper(n, v) {
  for (let tries = 0; tries < 2000; tries++) {
    const ans = rnd(n), liar = rnd(v), says = [];
    for (let i = 0; i < v; i++) {
      const want = i !== liar;
      for (let k = 0; k < 50; k++) {
        const t = ['is', 'not', 'not', 'or'][rnd(4)], x = rnd(n); let y = rnd(n); if (y === x) y = (x + 1) % n;
        const s = { t, x, y };
        if (sayTrue(s, ans) === want) { says.push(s); break; }
      }
    }
    if (says.length === v && liarAnswers(says, n).length === 1) return { ans, liar, says };
  }
  return null;
}
function whisper(ctx) {
  return new Promise(res => {
    const plan = byDiff(ctx, [[[3, 3], [3, 3]], [[4, 3], [4, 4]], [[4, 4], [5, 4], [5, 4]]]);
    let tries = byDiff(ctx, [3, 2, 2]);
    const f = frame('低語', '霧裡有幾個聲音，告訴你信要送到哪裡。其中剛好有一個聲音在說謊，其他的都是真話。想一想，信要送到哪裡？');
    const list = el('div', { class: 'pz-voices' });
    const picks = el('div', { class: 'pz-places' });
    f.stage.append(list, picks);
    let round = 0, Q = null, busy = false;
    const status = () => { f.info.textContent = `第 ${round + 1}／${plan.length} 封信　還可以猜錯 ${tries - 1} 次`; };
    const setup = () => {
      const [n, v] = plan[round];
      Q = makeWhisper(n, v);
      list.innerHTML = ''; picks.innerHTML = '';
      Q.says.forEach((s, i) => list.append(el('div', { class: 'pz-voice' }, el('b', {}, VOICES[i]), el('span', {}, '「' + sayText(s) + '」'))));
      for (let a = 0; a < n; a++) picks.append(el('button', { class: 'btn pz-place', onclick: () => pick(a) }, PLACES[a]));
      status();
    };
    const pick = async a => {
      if (busy) return;
      busy = true;
      const btn = picks.children[a];
      if (a === Q.ans) {
        btn.classList.add('ok'); ctx.audio.sfx('item');
        list.children[Q.liar].classList.add('liar');
        round++;
        if (round >= plan.length) { ctx.audio.sfx('win'); return finish(f, true, '最後一封信送到的時候，霧裡的聲音都安靜了下來。有一個聲音，小聲地說：「謝謝。」', res); }
        f.msg.textContent = `說謊的是「${VOICES[Q.liar]}」。信送到了！下一封。`;
        await wait(1200); busy = false; setup(); return;
      }
      btn.classList.add('bad'); tries--; ctx.audio.sfx('fail'); status();
      if (tries <= 0) { list.children[Q.liar].classList.add('liar'); return finish(f, false, `信送錯地方了。說謊的是「${VOICES[Q.liar]}」……霧裡的聲音，越來越遠。`, res); }
      f.msg.textContent = '不是這裡。想想看：如果這裡是對的，有幾個聲音在說謊？';
      busy = false;
    };
    f.box.solve = async () => { while (round < plan.length && Q) { while (busy) await wait(40); if (round >= plan.length) break; await pick(liarAnswers(Q.says, plan[round][0])[0]); await wait(60); } };
    setup();
  });
}

// ═════════ 冰滑：推一下，滑到撞到東西才停（滑行） ═════════
const D4 = [[0, -1, '↑', 'u'], [-1, 0, '←', 'l'], [1, 0, '→', 'r'], [0, 1, '↓', 'd']];
function slideTo(W, H, rock, hole, p, dx, dy) {
  let x = p % W, y = Math.floor(p / W);
  for (;;) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || rock.has(ny * W + nx)) break;
    x = nx; y = ny;
    if (y * W + x === hole) break;
  }
  return y * W + x;
}
function solveSlide(W, H, rock, hole, from) {
  const prev = new Map([[from, null]]), q = [from];
  while (q.length) {
    const p = q.shift();
    if (p === hole) { const path = []; let k = p; while (prev.get(k)) { path.unshift(prev.get(k)[1]); k = prev.get(k)[0]; } return path; }
    for (const d of D4) { const t = slideTo(W, H, rock, hole, p, d[0], d[1]); if (!prev.has(t)) { prev.set(t, [p, d]); q.push(t); } }
  }
  return null;
}
function iceSlide(ctx) {
  return new Promise(res => {
    const plan = byDiff(ctx, [[[6, 3], [6, 4]], [[7, 4], [7, 5]], [[7, 5], [8, 6], [8, 6]]]);
    let tries = byDiff(ctx, [4, 3, 2]);
    const f = frame('冰滑', '冰面很滑。小船推一下，就會一直滑，撞到冰柱或湖岸才停。把小船滑進湖心的洞口（發光的圓圈）。滑過洞口的時候，船會掉進去。');
    const grid = el('div', { class: 'pz-ice' });
    const pad = el('div', { class: 'pz-pad' });
    f.stage.append(grid, pad);
    const redo = el('button', { class: 'btn', onclick: () => { if (!busy && moves) lose('重新來過。'); } }, '重來');
    f.btns.append(redo);
    let round = 0, W = 6, H = 6, rock = new Set(), hole = 0, start = 0, me = 0, moves = 0, limit = 0, busy = false;
    const status = () => { f.info.textContent = `第 ${round + 1}／${plan.length} 片冰面　推了 ${moves}／${limit} 次　還可以重來 ${tries - 1} 次`; };
    const setup = () => {
      const [n, need] = plan[round]; W = H = n;
      for (let t = 0; t < 3000; t++) {
        rock = new Set(shuffle([...Array(W * H).keys()]).slice(0, Math.round(W * H * .16)));
        const free = [...Array(W * H).keys()].filter(k => !rock.has(k));
        hole = free[rnd(free.length)]; start = free[rnd(free.length)];
        if (hole === start) continue;
        const p = solveSlide(W, H, rock, hole, start);
        if (p && p.length >= need && p.length <= need + 2) { limit = p.length + byDiff(ctx, [4, 3, 2]); break; }
      }
      reset();
    };
    const reset = () => { me = start; moves = 0; draw(); };
    const draw = () => {
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = `repeat(${W}, 1fr)`;
      for (let k = 0; k < W * H; k++) grid.append(el('div', { class: 'pz-ic' + (rock.has(k) ? ' rock' : '') + (k === hole ? ' hole' : '') + (k === me ? ' me' : '') }));
      status();
    };
    const push = async (dx, dy) => {
      if (busy) return;
      const t = slideTo(W, H, rock, hole, me, dx, dy);
      if (t === me) return;
      me = t; moves++; ctx.audio.sfx('step'); draw();
      if (me === hole) {
        busy = true; ctx.audio.sfx('item');
        round++;
        if (round >= plan.length) { redo.remove(); ctx.audio.sfx('win'); return finish(f, true, '小船滑進洞口的那一刻，冰下傳來一聲很低很低的鐘響。洞口的冰，融化了一圈。', res); }
        f.msg.textContent = '滑進去了！下一片冰面。';
        await wait(900); busy = false; setup(); return;
      }
      if (moves >= limit) lose('推太多次，冰面裂開了。');
    };
    const lose = async why => {
      tries--; ctx.audio.sfx('fail');
      if (tries <= 0) { busy = true; redo.remove(); status(); return finish(f, false, '冰面裂得太厲害，小船推不過去了。', res); }
      busy = true; f.msg.textContent = why + '小船回到了一開始的地方。';
      await wait(700); busy = false; reset();
    };
    pad.append(...D4.map(([dx, dy, label, area]) => el('button', { class: 'btn pz-dir', style: { gridArea: area }, 'aria-label': label, onclick: () => push(dx, dy) }, label)));
    f.box.solve = async () => { while (round < plan.length) { while (busy) await wait(40); if (round >= plan.length) break; const r0 = round; for (const d of solveSlide(W, H, rock, hole, me) || []) { await push(d[0], d[1]); await wait(60); } while (round === r0 && busy) await wait(40); } };
    setup();
  });
}

// ═════════ 密碼鎖：猜公會長航海箱的密碼（猜數字） ═════════
const perms = (pool, k) => k === 0 ? [[]] : pool.flatMap(d => perms(pool.filter(x => x !== d), k - 1).map(r => [d, ...r]));
const score = (code, g) => { let a = 0, b = 0; g.forEach((d, i) => { if (code[i] === d) a++; else if (code.includes(d)) b++; }); return [a, b]; };
function lock(ctx) {
  return new Promise(res => {
    const [K, D, maxTry] = byDiff(ctx, [[3, 5, 10], [4, 6, 8], [4, 7, 9]]);
    const f = frame('密碼鎖', `公會長的航海箱上有 ${K} 格密碼，每格是 1～${D} 的數字，數字不會重複。每猜一次，鎖會告訴你：●＝數字對、位置也對；○＝數字對、可是位置不對。`);
    const all = perms([...Array(D)].map((_, i) => i + 1), K);
    const code = all[rnd(all.length)];
    const hist = el('div', { class: 'pz-hist' });
    const slots = el('div', { class: 'pz-code' });
    const keys = el('div', { class: 'pz-keys' });
    f.stage.append(hist, slots, keys);
    let cur = [], used = 0, over = false;
    const status = () => { f.info.textContent = `猜了 ${used}／${maxTry} 次`; };
    const draw = () => {
      slots.innerHTML = '';
      for (let i = 0; i < K; i++) slots.append(el('span', { class: 'pz-digit' + (cur[i] ? ' on' : '') }, cur[i] ? String(cur[i]) : '·'));
      [...keys.querySelectorAll('.pz-key')].forEach((b, i) => { b.disabled = over || cur.includes(i + 1) || cur.length >= K; });
      send.disabled = over || cur.length < K;
      status();
    };
    const press = d => { if (over || cur.length >= K || cur.includes(d)) return; cur.push(d); ctx.audio.tone(d); draw(); };
    const back = el('button', { class: 'btn', onclick: () => { if (!over) { cur.pop(); draw(); } } }, '退一格');
    const send = el('button', { class: 'btn primary', onclick: () => guess() }, '轉動');
    for (let d = 1; d <= D; d++) keys.append(el('button', { class: 'btn pz-key', onclick: () => press(d) }, String(d)));
    f.btns.append(back, send);
    const tried = [];
    const guess = () => {
      if (over || cur.length < K) return;
      const g = [...cur], [a, b] = score(code, g);
      used++; tried.push([g, a, b]); cur = [];
      hist.prepend(el('div', { class: 'pz-row' }, el('span', { class: 'pz-g' }, g.join(' ')), el('span', { class: 'pz-ab' }, '●'.repeat(a) + '○'.repeat(b) + '－'.repeat(K - a - b))));
      if (a === K) { over = true; back.remove(); send.remove(); ctx.audio.sfx('win'); draw(); return finish(f, true, '喀。航海箱打開了。裡面是一疊用繩子綁好的票：每一張上面，都畫著一支筆。', res); }
      ctx.audio.sfx(a ? 'step' : 'tap');
      if (used >= maxTry) { over = true; back.remove(); send.remove(); ctx.audio.sfx('fail'); draw(); return finish(f, false, `鎖卡住了，再也轉不動。密碼是 ${code.join(' ')}。`, res); }
      f.msg.textContent = a + b === 0 ? '這幾個數字都不在密碼裡。' : '看看●和○，再想想下一次要怎麼排。';
      draw();
    };
    // 機器人：每次都猜一個「和之前所有結果都對得上」的密碼
    f.box.solve = async () => { while (!over) { const ok = all.filter(c => tried.every(([g, a, b]) => { const [x, y] = score(c, g); return x === a && y === b; })); cur = []; for (const d of ok[0]) { press(d); await wait(30); } guess(); await wait(80); } };
    draw();
  });
}

// ═════════ 光路：轉動冰稜鏡，把灰燈的光引進每一個燈座（折射光） ═════════
const BOUNCE = { '/': { r: 'u', u: 'r', l: 'd', d: 'l' }, '\\': { r: 'd', d: 'r', l: 'u', u: 'l' } };
const STEP = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] };
function traceBeam(N, mir, sy) {
  let x = -1, y = sy, dir = 'r';
  const path = [], seen = new Set();
  for (;;) {
    x += STEP[dir][0]; y += STEP[dir][1];
    if (x < 0 || y < 0 || x >= N || y >= N) break;
    const k = y * N + x, s = k + dir;
    if (seen.has(s)) break; seen.add(s);
    path.push([x, y, dir]);
    if (mir[k]) dir = BOUNCE[mir[k]][dir];
  }
  return path;
}
function lightPath(ctx) {
  return new Promise(res => {
    const plan = byDiff(ctx, [[[5, 2, 2], [5, 2, 2]], [[5, 3, 3], [6, 3, 3]], [[6, 3, 4], [6, 4, 4], [7, 4, 4]]]);
    let tries = byDiff(ctx, [4, 3, 2]);
    const f = frame('光路', '左邊的灰燈會射出一道光。點一下冰稜鏡，它會轉個方向（／和＼互換），光碰到它就會轉彎。讓光經過每一個燈座。');
    const box = el('div', { class: 'pz-light' });
    f.stage.append(box);
    const redo = el('button', { class: 'btn', onclick: () => { if (!busy && taps) lose('重新來過。'); } }, '重來');
    f.btns.append(redo);
    let round = 0, N = 5, sy = 0, sol = [], startMir = [], mir = [], cups = [], taps = 0, limit = 0, busy = false;
    const status = () => { f.info.textContent = `第 ${round + 1}／${plan.length} 道門　轉了 ${taps}／${limit} 次　還可以重來 ${tries - 1} 次`; };
    const lit = () => { const p = traceBeam(N, mir, sy); return cups.filter(k => p.some(([x, y]) => y * N + x === k)); };
    const setup = () => {
      const [n, nc, needM] = plan[round]; N = n;
      for (let t = 0; t < 5000; t++) {
        sy = rnd(N);
        sol = Array(N * N).fill(null);
        for (let k = 0; k < N * N; k++) if (Math.random() < .3) sol[k] = Math.random() < .5 ? '/' : '\\';
        const p = traceBeam(N, sol, sy);
        const hitM = p.filter(([x, y]) => sol[y * N + x]).length;
        const empty = p.filter(([x, y]) => !sol[y * N + x]).map(([x, y]) => y * N + x);
        if (hitM < needM || empty.length < nc + 2) continue;
        cups = [empty[empty.length - 1], ...shuffle(empty.slice(1, -1)).slice(0, nc - 1)];
        startMir = sol.map(m => m && Math.random() < .55 ? (m === '/' ? '\\' : '/') : m);
        mir = startMir;
        const diff = sol.filter((m, k) => m !== startMir[k]).length;
        if (diff < 2 || lit().length === cups.length) continue;
        limit = diff + byDiff(ctx, [6, 4, 3]);
        break;
      }
      reset();
    };
    const reset = () => { mir = [...startMir]; taps = 0; draw(); };
    const draw = () => {
      const C = 40, Wd = N * C + 40;
      const svg = svgEl('svg', { viewBox: `-40 0 ${Wd} ${N * C}`, class: 'pz-lsvg' });
      for (let k = 0; k < N * N; k++) {
        const x = k % N, y = Math.floor(k / N);
        const g = svgEl('g', { class: 'pz-lc' + (mir[k] ? ' m' : '') });
        g.append(svgEl('rect', { x: x * C + 1, y: y * C + 1, width: C - 2, height: C - 2, rx: 5 }));
        if (mir[k]) g.append(svgEl('line', mir[k] === '/' ? { x1: x * C + 8, y1: y * C + C - 8, x2: x * C + C - 8, y2: y * C + 8 } : { x1: x * C + 8, y1: y * C + 8, x2: x * C + C - 8, y2: y * C + C - 8 }));
        if (cups.includes(k)) g.append(svgEl('circle', { class: 'cup', cx: x * C + C / 2, cy: y * C + C / 2, r: 9 }));
        if (mir[k]) g.addEventListener('click', () => turn(k));
        svg.append(g);
      }
      const p = traceBeam(N, mir, sy);
      const pts = [[-20, sy * C + C / 2], ...p.map(([x, y]) => [x * C + C / 2, y * C + C / 2])];
      const last = p[p.length - 1];
      if (last) { const [dx, dy] = STEP[mir[last[1] * N + last[0]] ? BOUNCE[mir[last[1] * N + last[0]]][last[2]] : last[2]]; pts.push([last[0] * C + C / 2 + dx * C / 2, last[1] * C + C / 2 + dy * C / 2]); }
      svg.append(svgEl('polyline', { class: 'pz-beam', points: pts.map(q => q.join(',')).join(' ') }));
      const on = lit();
      for (const k of on) svg.append(svgEl('circle', { class: 'cup on', cx: (k % N) * C + C / 2, cy: Math.floor(k / N) * C + C / 2, r: 9 }));
      svg.append(svgEl('circle', { class: 'pz-src', cx: -20, cy: sy * C + C / 2, r: 11 }));
      box.innerHTML = ''; box.append(svg);
      status();
      return on.length;
    };
    const turn = async k => {
      if (busy || !mir[k]) return;
      mir[k] = mir[k] === '/' ? '\\' : '/'; taps++; ctx.audio.sfx('tap');
      if (draw() === cups.length) {
        busy = true; ctx.audio.sfx('item');
        round++;
        if (round >= plan.length) { redo.remove(); ctx.audio.sfx('win'); return finish(f, true, '最後一個燈座亮起來的時候，冰做的門，從裡面透出了一點點光。', res); }
        f.msg.textContent = '每個燈座都亮了！下一道門。';
        await wait(900); busy = false; setup(); return;
      }
      if (taps >= limit) lose('冰稜鏡轉太多次，裂開了。');
    };
    const lose = async why => {
      tries--; ctx.audio.sfx('fail');
      if (tries <= 0) { busy = true; redo.remove(); status(); return finish(f, false, '冰稜鏡全都裂了，光再也照不進門裡。', res); }
      busy = true; f.msg.textContent = why + '冰稜鏡回到了一開始的方向。';
      await wait(700); busy = false; reset();
    };
    f.box.solve = async () => { while (round < plan.length) { while (busy) await wait(40); if (round >= plan.length) break; const r0 = round; for (let k = 0; k < N * N && round === r0; k++) if (mir[k] && mir[k] !== sol[k]) { await turn(k); await wait(60); } while (round === r0 && busy) await wait(40); if (round === r0) break; } };
    setup();
  });
}
