// 遺跡小遊戲：每座島一種，跟島上的故事有關
// 低語礁「燈號」：照燈塔亮燈的順序點回去（記憶）
// 晨忘島「門牌」：翻開紙片，把名字和門配成一對（翻牌記憶）
// 沉船灣「航海圖」：把被打亂的航海圖碎片轉正（解謎）
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
// 遊戲結束：顯示結果，按下按鈕才關掉
function finish(f, win, line, res) {
  f.msg.textContent = line;
  f.btns.append(el('button', { class: 'btn primary', onclick: () => { f.box.remove(); res(win); } }, '繼續'));
}

export function playPuzzle(ctx, kind, place) {
  const game = { 燈號: lamps, 門牌: doors, 航海圖: chart }[kind];
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
