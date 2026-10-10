// 訓練：回復士氣的小遊戲（營地、航行中的甲板、通關後的小遊戲間）
// 划船比賽（阿潮帶）：跟著鼓點按「划」，節拍越來越快（節奏）
// 對招（葛蘿帶）：對手擺出上、中、下的架式，倒數結束前按出對應的擋法（反應）
// 合唱（小鈴帶）：音符往左跑，到中間的線時按「唱」（時機）
// 每個訓練都回傳 Promise<number>：0～1 的表現（按對的比例）；小遊戲間按 ✕ 不玩是 null
// 外框上掛著 solve()：只給自動試玩機器人用
import { el, $ } from './ui.js';
import { frame } from './puzzle.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const byDiff = (ctx, arr) => arr[{ 悠閒: 0, 標準: 1, 困難: 2 }[ctx.g && ctx.g.diff] ?? 1];

// 帶隊的人：本人不在隊上的話，換人帶
export const TRAININGS = {
  划船比賽: { lead: ['阿潮'], tip: '跟著鼓點划船' },
  對招: { lead: ['葛蘿', '阿潮'], tip: '看架式擋招' },
  合唱: { lead: ['小鈴', '蓮笙'], tip: '音符到線上時唱' },
};
export const TRAINING_KINDS = Object.keys(TRAININGS);

// 表現 → 士氣
export function trainingMorale(score) { return score >= 0.8 ? 15 : score >= 0.5 ? 10 : 4; }

function end(f, score, line, res) {
  f.msg.textContent = line;
  f.btns.append(el('button', { class: 'btn primary', onclick: () => { f.box.remove(); res(score); } }, '繼續'));
}
const grade = s => s >= 0.8 ? '很好' : s >= 0.5 ? '不錯' : '還要再練練';

export function playTraining(ctx, kind, lead) {
  const p = { 划船比賽: rowing, 對招: sparring, 合唱: chorus }[kind](ctx, lead);
  if (!ctx.practice) return p;
  const box = [...$('layer').querySelectorAll('.puzzle')].pop();
  const quit = new Promise(res => box.append(el('button', { class: 'icon pz-quit', 'aria-label': '不練了', onclick: () => { box.dispatchEvent(new Event('quit')); box.remove(); res(null); } }, '✕')));
  return Promise.race([p, quit]);
}

// ═════════ 划船比賽：跟著鼓點划 ═════════
function rowing(ctx, lead) {
  return new Promise(res => {
    const N = byDiff(ctx, [12, 16, 20]);
    const [gap0, gap1] = byDiff(ctx, [[820, 620], [720, 500], [640, 420]]);
    const win = byDiff(ctx, [170, 135, 105]);
    const f = frame('划船比賽', `${lead}敲著鼓：「鼓響的時候一起划！」鼓聲會越來越快。鼓圈縮到最小、鼓亮起來的時候，按「划！」。亂划會讓船慢下來。`);
    const lane = el('div', { class: 'tr-lane' });
    const boat = el('div', { class: 'tr-boat' }, '⛵');
    lane.append(boat, el('div', { class: 'tr-flag' }, '🚩'));
    const drum = el('div', { class: 'tr-drum' }, el('div', { class: 'tr-ring' }), el('span', {}, '鼓'));
    const ring = drum.firstChild;
    const btn = el('button', { class: 'btn primary pz-hit', onclick: () => tap() }, '划！');
    f.stage.append(lane, drum, btn);
    // 每一下鼓的時間
    const beats = [], hit = [];
    let t = 1600;
    for (let i = 0; i < N; i++) { beats.push(t); hit.push(false); t += gap0 + (gap1 - gap0) * i / (N - 1); }
    let t0 = 0, good = 0, raf = 0, over = false, last = -1;
    const status = () => { f.info.textContent = `划對了 ${good}／${N} 下`; boat.style.left = `${4 + 80 * good / N}%`; };
    const now = () => performance.now() - t0;
    const tick = () => {
      if (over || !f.box.isConnected) return;
      const ms = now();
      // 下一下鼓：鼓圈從大縮到小
      const i = beats.findIndex(b => b > ms - win);
      if (i < 0) { over = true; btn.remove(); ctx.audio.sfx(good / N >= 0.5 ? 'win' : 'fail'); return end(f, good / N, `船靠岸了！划對了 ${good}／${N} 下，${grade(good / N)}。`, res); }
      const prev = i > 0 ? beats[i - 1] : beats[i] - gap0, k = Math.max(0, Math.min(1, (beats[i] - ms) / (beats[i] - prev)));
      ring.style.transform = `scale(${1 + k * 1.4})`;
      // 鼓響
      const j = beats.findIndex(b => b <= ms && b > ms - 60);
      if (j >= 0 && j !== last) { last = j; drum.classList.remove('on'); void drum.offsetWidth; drum.classList.add('on'); ctx.audio.tone(0); }
      raf = requestAnimationFrame(tick);
    };
    const tap = () => {
      if (over) return;
      const ms = now(), i = beats.findIndex((b, k) => !hit[k] && Math.abs(b - ms) <= win);
      if (i >= 0) { hit[i] = true; good++; ctx.audio.sfx('tap'); boat.classList.remove('row'); void boat.offsetWidth; boat.classList.add('row'); f.msg.textContent = '划得好！'; }
      else { good = Math.max(0, good - 1); ctx.audio.sfx('fail'); f.msg.textContent = '亂划了！船晃了一下。'; }
      status();
    };
    f.box.solve = async () => { while (!over) { const ms = now(), i = beats.findIndex((b, k) => !hit[k] && Math.abs(b - ms) <= win / 3); if (i >= 0) tap(); await wait(8); } };
    f.box.addEventListener('quit', () => { over = true; cancelAnimationFrame(raf); });
    status();
    t0 = performance.now(); raf = requestAnimationFrame(tick);
  });
}

// ═════════ 對招：看架式擋招 ═════════
const STANCE = [['上', '舉刀過頭'], ['中', '刀尖平舉'], ['下', '刀壓得很低']];
function sparring(ctx, lead) {
  return new Promise(res => {
    const R = byDiff(ctx, [8, 10, 12]);
    const limit = byDiff(ctx, [1700, 1250, 950]);
    const f = frame('對招', `${lead}拿起木刀：「看我的架式。我舉高，你就擋上面。」對手擺好架式以後，在倒數結束前按出一樣的擋法。`);
    const foe = el('div', { class: 'tr-foe' }, el('b', {}, '……'), el('small', {}, '準備'));
    const bar = el('div', { class: 'tr-timer' }, el('div', {}));
    const fill = bar.firstChild;
    const row = el('div', { class: 'tr-guards' }, ...STANCE.map(([k], i) => el('button', { class: 'btn', onclick: () => guard(i) }, `擋${k}`)));
    f.stage.append(foe, bar, row);
    let round = 0, good = 0, want = -1, t1 = 0, raf = 0, over = false;
    const status = () => { f.info.textContent = `第 ${Math.min(round + 1, R)}／${R} 招　擋下 ${good} 招`; };
    const next = async () => {
      want = -1; foe.className = 'tr-foe'; foe.firstChild.textContent = '……'; foe.lastChild.textContent = '準備'; fill.style.width = '100%';
      if (round >= R) { over = true; row.remove(); ctx.audio.sfx(good / R >= 0.5 ? 'win' : 'fail'); return end(f, good / R, `${lead}放下木刀：「擋下了 ${good}／${R} 招。」${grade(good / R)}。`, res); }
      status();
      await wait(500 + rnd(700));
      if (over || !f.box.isConnected) return;
      want = rnd(3);
      foe.classList.add('show'); foe.firstChild.textContent = STANCE[want][0]; foe.lastChild.textContent = STANCE[want][1];
      ctx.audio.tone(want + 2);
      t1 = performance.now(); raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      if (over || want < 0 || !f.box.isConnected) return;
      const k = 1 - (performance.now() - t1) / limit;
      fill.style.width = `${Math.max(0, k) * 100}%`;
      if (k <= 0) return judge(false, '太慢了！木刀敲到了肩膀。');
      raf = requestAnimationFrame(tick);
    };
    const judge = async (ok, line) => {
      cancelAnimationFrame(raf); want = -1;
      if (ok) good++;
      foe.classList.add(ok ? 'good' : 'bad');
      ctx.audio.sfx(ok ? 'hit' : 'fail');
      f.msg.textContent = line;
      round++; status();
      await wait(500);
      next();
    };
    const guard = i => { if (over || want < 0) return; judge(i === want, i === want ? '擋住了！' : `擋錯了！那是「${STANCE[want][0]}」。`); };
    f.box.solve = async () => { while (!over) { if (want >= 0) guard(want); await wait(60); } };
    f.box.addEventListener('quit', () => { over = true; cancelAnimationFrame(raf); });
    next();
  });
}

// ═════════ 合唱：音符到線上時唱 ═════════
function chorus(ctx, lead) {
  return new Promise(res => {
    const N = byDiff(ctx, [12, 16, 20]);
    const speed = byDiff(ctx, [0.22, 0.28, 0.34]); // 每秒走多少（整條是 1）
    const win = byDiff(ctx, [0.07, 0.055, 0.042]);
    const LINE = 0.2;
    const f = frame('合唱', `${lead}起了個頭：「跟著我唱！」音符會從右邊跑過來，跑到金色的線上時，按「唱！」。太早或太晚，就走音了。`);
    const lane = el('div', { class: 'tr-staff' }, el('div', { class: 'tr-line' }));
    const btn = el('button', { class: 'btn primary pz-hit', onclick: () => tap() }, '唱！');
    f.stage.append(lane, btn);
    // 每個音符出現的時間（秒），間隔有長有短
    const notes = [];
    let at = 0.6;
    for (let i = 0; i < N; i++) { const n = el('div', { class: 'tr-note', style: { top: `${15 + rnd(4) * 18}%` } }, '♪'); lane.append(n); notes.push({ at, n, done: false }); at += [0.55, 0.8, 1.1][rnd(3)] / (speed / 0.22); }
    let t0 = 0, good = 0, raf = 0, over = false;
    const status = () => { f.info.textContent = `唱對了 ${good}／${N} 個音`; };
    const x = (o, s) => 1.05 - (s - o.at) * speed;
    const sec = () => (performance.now() - t0) / 1000;
    const tick = () => {
      if (over || !f.box.isConnected) return;
      const s = sec();
      for (const o of notes) {
        const p = x(o, s);
        o.n.style.left = `${p * 100}%`;
        o.n.style.display = p > 1.08 || p < -0.08 ? 'none' : '';
        if (!o.done && p < LINE - win * 2) { o.done = true; o.n.classList.add('bad'); f.msg.textContent = '漏掉了一個音。'; }
      }
      if (notes.every(o => o.done) && notes.every(o => x(o, s) < -0.05)) { over = true; btn.remove(); ctx.audio.sfx(good / N >= 0.5 ? 'win' : 'fail'); return end(f, good / N, `歌唱完了。唱對了 ${good}／${N} 個音，${grade(good / N)}。`, res); }
      raf = requestAnimationFrame(tick);
    };
    const tap = () => {
      if (over) return;
      const s = sec();
      // 最靠近線、還沒判定的音符；離線太遠的不算（亂按不會扣分，但按早了那個音就走音）
      const o = notes.filter(o => !o.done && Math.abs(x(o, s) - LINE) <= win * 3).sort((a, b) => Math.abs(x(a, s) - LINE) - Math.abs(x(b, s) - LINE))[0];
      if (!o) return;
      o.done = true;
      if (Math.abs(x(o, s) - LINE) <= win) { good++; o.n.classList.add('good'); ctx.audio.tone(notes.indexOf(o)); f.msg.textContent = '好聽！'; }
      else { o.n.classList.add('bad'); ctx.audio.sfx('fail'); f.msg.textContent = x(o, s) > LINE ? '太早了，走音了。' : '太晚了，走音了。'; }
      status();
    };
    f.box.solve = async () => { while (!over) { const s = sec(); if (notes.some(o => !o.done && Math.abs(x(o, s) - LINE) <= win / 3)) tap(); await wait(8); } };
    f.box.addEventListener('quit', () => { over = true; cancelAnimationFrame(raf); });
    status();
    t0 = performance.now(); raf = requestAnimationFrame(tick);
  });
}
