// 時代桌遊（第四批）：放在各卷「走走」小地圖裡，純粹好玩，不影響劇情
// 寫法和 minigames.js 一樣：每一個玩法都是 T => void，T 是 debate.js 的 Translate
// 種類一覽：
//   博餅（運氣）：六顆骰子，看擲出幾個四點、有沒有順子；可以重擲兩次
//   羊趾骨（碰運氣）：四塊羊骨一直擲，分數越疊越高；兩塊以上擲出「犬」（一點）就全沒了
//   跑棋（跑道棋）：塞尼特、雙陸、帕托利共用；擲出點數，挑一顆棋子往前走，先全部走完的贏
//   押寶（押注）：皇冠與錨；押一個圖案，三顆骰子裡出現幾次就賠幾倍
import { el } from './ui.js';
import { rnd, shuffle, D } from './minigames.js';

export const TIPS4 = { 博餅: '擲骰比大小', 羊趾骨: '見好就收', 跑棋: '先把棋子走完', 押寶: '押一個圖案' };

// 骰子畫成點點（字型裡的 ⚀～⚅ 在手機上常常太小）
const PIP_AT = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const die = (v, cls = '') => el('span', { class: 'bg-die ' + cls + (v === 4 || v === 1 ? ' red' : ''), title: String(v) }, ...Array.from({ length: 9 }, (_, i) => el('i', { class: PIP_AT[v].includes(i) ? 'on' : '' })));

// ═════════ 博餅 ═════════
export function bobing(dice) {
  const c = [0, 0, 0, 0, 0, 0, 0]; dice.forEach(v => c[v]++);
  if (c[4] >= 4 || c.some(n => n >= 5)) return { name: '狀元', score: 32 };
  if (c.slice(1).every(n => n === 1)) return { name: '對堂', score: 16 };
  if (c[4] === 3) return { name: '三紅', score: 8 };
  if (c.some((n, i) => i !== 4 && n === 4)) return { name: '四進', score: 4 };
  if (c[4] === 2) return { name: '二舉', score: 2 };
  if (c[4] === 1) return { name: '一秀', score: 1 };
  return { name: '槓龜', score: 0 };
}
function bobingGame(T) {
  const d = T.d;
  T.header();
  const rounds = D(T, [4, 5, 6]);
  const players = [{ name: '你', total: 0, me: true }, ...d.rivals.map(n => ({ name: n, total: 0 }))];
  let round = 0, rerolls = 2, mine = null, busy = false;
  const prog = el('div', { class: 'mg-progress' });
  const table = el('div', { class: 'bg-table' });
  const bowl = el('div', { class: 'bg-bowl' });
  const res = el('div', { class: 'mg-q small' });
  const btnRoll = el('button', { class: 'btn primary', onclick: () => roll() }, '擲');
  const btnRe = el('button', { class: 'btn', onclick: () => reroll() }, '重擲');
  const btnOk = el('button', { class: 'btn', onclick: () => keep() }, '就這個');
  const row = el('div', { class: 'row-btns mx-row' }, btnRoll, btnRe, btnOk);
  T.body.append(prog, table, bowl, res, row, el('p', { class: 'muted small' }, '狀元（四個以上的四點，或五個一樣）32・對堂（一到六）16・三紅（三個四點）8・四進（四個一樣）4・二舉（兩個四點）2・一秀（一個四點）1'));
  const six = () => Array.from({ length: 6 }, () => 1 + rnd(6));
  const drawTable = () => {
    table.innerHTML = '';
    players.forEach(p => table.appendChild(el('div', { class: 'bg-seat' + (p.me ? ' me' : '') }, el('b', {}, p.name), el('span', {}, `${p.total} 分`), p.last ? el('small', {}, p.last) : null)));
    prog.textContent = `第 ${Math.min(round + 1, rounds)} / ${rounds} 輪・重擲還剩 ${rerolls} 次`;
    btnRoll.disabled = busy || !!mine; btnRe.disabled = busy || !mine || rerolls <= 0; btnOk.disabled = busy || !mine;
  };
  const showDice = (ds, cls) => { bowl.innerHTML = ''; ds.forEach(v => bowl.appendChild(die(v, cls))); };
  const roll = () => { mine = six(); T.sfx('tap'); showDice(mine, 'roll'); const b = bobing(mine); res.textContent = `${b.name}・${b.score} 分`; drawTable(); };
  const reroll = () => { if (rerolls <= 0) return; rerolls--; roll(); };
  const keep = async () => {
    busy = true; const b = bobing(mine); players[0].total += b.score; players[0].last = b.name; mine = null; drawTable();
    for (const p of players.slice(1)) {
      await new Promise(r => T.later(600, r));
      let ds = six(); if (bobing(ds).score === 0 && Math.random() < 0.5) ds = six();
      const pb = bobing(ds); p.total += pb.score; p.last = pb.name; showDice(ds, 'roll'); res.textContent = `${p.name}：${pb.name}・${pb.score} 分`; T.sfx(pb.score >= 8 ? 'good' : 'tap'); drawTable();
    }
    round++; busy = round >= rounds;
    if (round >= rounds) {
      drawTable();
      const best = Math.max(...players.map(p => p.total));
      const win = players[0].total >= best;
      return T.later(900, () => T.finish(win, `你 ${players[0].total} 分・` + players.slice(1).map(p => `${p.name} ${p.total} 分`).join('・'), win && players[0].total >= 32));
    }
    res.textContent = '換你擲了。'; drawTable();
  };
  drawTable();
  T.solveFn = () => T.finish(true, '你 40 分');
}

// ═════════ 羊趾骨 ═════════
const BONE = [1, 3, 4, 6];
const BONE_NAME = { 1: '犬', 3: '三', 4: '四', 6: '六' };
function bonesGame(T) {
  const d = T.d;
  T.header();
  const goal = D(T, [30, 40, 50]);
  const me = { name: '你', score: 0 }, foe = { name: d.rival, score: 0 };
  let turnPts = 0, busy = false;
  const prog = el('div', { class: 'mg-progress' });
  const board = el('div', { class: 'bg-table' });
  const bowl = el('div', { class: 'bg-bowl' });
  const res = el('div', { class: 'mg-q small' });
  const btnRoll = el('button', { class: 'btn primary', onclick: () => throwIt() }, '擲');
  const btnKeep = el('button', { class: 'btn', onclick: () => bank() }, '收下');
  T.body.append(prog, board, bowl, res, el('div', { class: 'row-btns mx-row' }, btnRoll, btnKeep), el('p', { class: 'muted small' }, '四塊羊骨，每一塊會擲出 1（犬）、3、4、6。點數加起來，可以一直擲；收下才算分。兩塊以上是「犬」，這一輪全沒了。四塊都不一樣是「阿芙蘿黛蒂」，多加 10 分。'));
  const draw = () => {
    board.innerHTML = '';
    for (const p of [me, foe]) board.appendChild(el('div', { class: 'bg-seat' + (p === me ? ' me' : '') }, el('b', {}, p.name), el('span', {}, `${p.score} / ${goal}`)));
    prog.textContent = `這一輪：${turnPts} 分`;
    btnRoll.disabled = busy; btnKeep.disabled = busy || !turnPts;
  };
  const cast = () => Array.from({ length: 4 }, () => BONE[rnd(4)]);
  const judge = bs => { const dogs = bs.filter(v => v === 1).length; if (dogs >= 2) return { bust: true, txt: '犬擲！這一輪全沒了。' }; const venus = new Set(bs).size === 4; const s = bs.reduce((a, b) => a + b, 0) + (venus ? 10 : 0); return { s, txt: venus ? `阿芙蘿黛蒂！+${s}` : `+${s}` }; };
  const show = bs => { bowl.innerHTML = ''; bs.forEach(v => bowl.appendChild(el('span', { class: 'bg-bone' + (v === 1 ? ' dog' : '') }, BONE_NAME[v]))); };
  const throwIt = () => {
    const bs = cast(); show(bs); const j = judge(bs);
    if (j.bust) { turnPts = 0; res.textContent = j.txt; T.sfx('fail'); return foeTurn(); }
    turnPts += j.s; res.textContent = j.txt; T.sfx('tap');
    if (me.score + turnPts >= goal) return bank();
    draw();
  };
  const bank = () => { me.score += turnPts; turnPts = 0; T.sfx('item'); if (me.score >= goal) { busy = true; draw(); return T.later(600, () => T.finish(true, `你 ${me.score}・${foe.name} ${foe.score}`, foe.score === 0)); } foeTurn(); };
  const foeTurn = async () => {
    busy = true; draw();
    let pts = 0;
    for (;;) {
      await new Promise(r => T.later(700, r));
      const bs = cast(); show(bs); const j = judge(bs);
      if (j.bust) { pts = 0; res.textContent = `${foe.name}：${j.txt}`; T.sfx('fail'); break; }
      pts += j.s; res.textContent = `${foe.name}：${j.txt}（這一輪 ${pts}）`;
      if (pts >= 15 || foe.score + pts >= goal) { foe.score += pts; res.textContent = `${foe.name} 收下了 ${pts} 分。`; break; }
    }
    if (foe.score >= goal) { draw(); return T.later(800, () => T.finish(false, `你 ${me.score}・${foe.name} ${foe.score}`)); }
    await new Promise(r => T.later(700, r));
    busy = false; res.textContent = '換你了。'; draw();
  };
  draw();
  T.solveFn = () => T.finish(true, `你 ${goal}・${foe.name} 0`);
}

// ═════════ 跑棋：塞尼特、雙陸、帕托利 ═════════
const THROWS = {
  // 塞尼特：四根擲棒，白面朝上的根數；全部黑面算 5
  sticks: () => { const w = Array.from({ length: 4 }, () => Math.random() < 0.5).filter(Boolean).length; return { n: w || 5, again: [1, 4, 5].includes(w || 5), show: `擲棒：${'▮'.repeat(w)}${'▯'.repeat(4 - w)}` }; },
  // 雙陸：兩顆骰子加起來；擲出一對可以再擲
  dice: () => { const a = 1 + rnd(6), b = 1 + rnd(6); return { n: a + b, again: a === b, show: `骰子：${a} 和 ${b}` }; },
  // 帕托利：五顆有記號的豆子，記號朝上的顆數；五顆全中算 10
  beans: () => { const k = Array.from({ length: 5 }, () => Math.random() < 0.5).filter(Boolean).length; return { n: k === 5 ? 10 : k, again: false, show: `豆子：${'●'.repeat(k)}${'○'.repeat(5 - k)}` }; },
};
function raceGame(T) {
  const d = T.d;
  T.header();
  const L = d.len, P = d.pieces;
  const pos = { me: Array(P).fill(0), foe: Array(P).fill(0) }; // 0 是還沒上場，L+1 是走完
  const safe = new Set(d.safe || []);
  const extra = new Set(d.extra || []);
  const smart = D(T, [0, 1, 2]);
  let turn = 'me', roll = null, busy = false;
  const prog = el('div', { class: 'mg-progress' });
  const track = el('div', { class: 'rc-track', style: { gridTemplateColumns: `repeat(${d.cols || 10}, 1fr)` } });
  const home = el('div', { class: 'rc-home' });
  const res = el('div', { class: 'mg-q small' });
  const btnRoll = el('button', { class: 'btn primary', onclick: () => doRoll() }, d.rollLabel || '擲');
  T.body.append(prog, home, track, res, btnRoll, el('p', { class: 'muted small' }, d.help || ''));
  const occ = (side, sq) => pos[side].filter(p => p === sq).length;
  const other = s => s === 'me' ? 'foe' : 'me';
  // 這一步合不合法：不能停在自己的棋子上；對手兩顆以上在一起（或在安全格）不能打
  const target = (side, i, n) => {
    const from = pos[side][i]; if (from > L) return null;
    const to = Math.min(L + 1, from + n);
    if (to <= L && occ(side, to)) return null;
    if (to <= L && occ(other(side), to) && (safe.has(to) || occ(other(side), to) >= 2 || (d.guard && (occ(other(side), to - 1) || occ(other(side), to + 1))))) return null;
    return to;
  };
  const moves = (side, n) => pos[side].map((p, i) => ({ i, to: target(side, i, n) })).filter(m => m.to != null);
  const apply = (side, m) => {
    const from = pos[side][m.i];
    pos[side][m.i] = m.to;
    const op = other(side);
    if (m.to <= L) { const k = pos[op].indexOf(m.to); if (k >= 0) { pos[op][k] = d.swap ? from : 0; T.sfx('hit'); return true; } }
    return false;
  };
  const done = side => pos[side].every(p => p > L);
  const sqLabel = sq => (d.names && d.names[sq]) || '';
  const draw = () => {
    track.innerHTML = '';
    const order = []; const cols = d.cols || 10;
    for (let r = 0; r < Math.ceil(L / cols); r++) { const row = []; for (let c = 0; c < cols; c++) { const sq = r * cols + c + 1; if (sq <= L) row.push(sq); } if (r % 2 && d.snake !== false) row.reverse(); order.push(...row); }
    for (const sq of order) {
      const mine = occ('me', sq), theirs = occ('foe', sq);
      const can = turn === 'me' && roll && !busy && moves('me', roll.n).some(m => pos.me[m.i] === sq);
      track.appendChild(el('button', { class: 'rc-sq' + (safe.has(sq) ? ' safe' : '') + (extra.has(sq) ? ' extra' : '') + (can ? ' can' : ''), 'data-sq': sq, disabled: !can, onclick: () => pick(sq) },
        el('small', {}, sqLabel(sq) || sq), mine ? el('i', { class: 'rc-me' }, mine > 1 ? '●●' : '●') : null, theirs ? el('i', { class: 'rc-foe' }, theirs > 1 ? '●●' : '●') : null));
    }
    home.innerHTML = '';
    const waitMe = pos.me.filter(p => p === 0).length, waitFoe = pos.foe.filter(p => p === 0).length;
    const canStart = turn === 'me' && roll && !busy && moves('me', roll.n).some(m => pos.me[m.i] === 0);
    home.append(
      el('button', { class: 'rc-start' + (canStart ? ' can' : ''), disabled: !canStart, onclick: () => pick(0) }, `你還沒上場：${waitMe}　走完：${pos.me.filter(p => p > L).length}`),
      el('div', { class: 'rc-start foe' }, `${d.rival}還沒上場：${waitFoe}　走完：${pos.foe.filter(p => p > L).length}`));
    btnRoll.disabled = turn !== 'me' || !!roll || busy;
    prog.textContent = turn === 'me' ? (roll ? `擲出 ${roll.n}：點一顆亮起來的棋子（或「還沒上場」）` : '換你擲。') : `${d.rival}在想……`;
  };
  const doRoll = () => {
    roll = THROWS[d.throw](); T.sfx('tap');
    res.textContent = `${roll.show}・走 ${roll.n} 格` + (roll.again ? '・可以再擲一次' : '');
    if (!moves('me', roll.n).length) { res.textContent += '・沒有棋子可以走'; roll = null; T.later(900, () => endTurn(false)); }
    draw();
  };
  const pick = sq => {
    if (!roll) return;
    const m = moves('me', roll.n).find(m => pos.me[m.i] === sq);
    if (!m) return;
    const hit = apply('me', m);
    const again = roll.again || extra.has(m.to);
    roll = null;
    res.textContent = (hit ? (d.swap ? '換位！' : '打回去了！') : '') + (m.to > L ? '一顆走完了！' : '');
    if (done('me')) { busy = true; draw(); return T.later(600, () => T.finish(true, `你先走完了`, pos.foe.every(p => p === 0))); }
    endTurn(again);
  };
  const endTurn = again => { if (again) { res.textContent += '再擲一次。'; turn = 'me'; draw(); return; } turn = 'foe'; draw(); T.later(700, foeTurn); };
  const foeTurn = async () => {
    busy = true;
    for (;;) {
      const r = THROWS[d.throw]();
      const ms = moves('foe', r.n);
      res.textContent = `${d.rival}：${r.show}・走 ${r.n} 格`;
      if (!ms.length) { res.textContent += '・沒有棋子可以走'; break; }
      const score = m => (m.to <= L && occ('me', m.to) ? 10 : 0) + (m.to > L ? 6 : 0) + (pos.foe[m.i] === 0 ? 2 : 0) + pos.foe[m.i] / L;
      const m = smart === 0 ? ms[rnd(ms.length)] : [...ms].sort((a, b) => score(b) - score(a))[smart === 1 && Math.random() < 0.3 ? Math.min(1, ms.length - 1) : 0];
      const hit = apply('foe', m);
      if (hit) res.textContent += d.swap ? '・換位！' : '・你的棋子被打回去了！';
      draw();
      if (done('foe')) { busy = false; return T.later(800, () => T.finish(false, `${d.rival}先走完了`)); }
      if (!(r.again || extra.has(m.to))) break;
      await new Promise(rs => T.later(800, rs));
    }
    await new Promise(rs => T.later(700, rs));
    busy = false; turn = 'me'; draw();
  };
  draw();
  T.solveFn = () => T.finish(true, '你先走完了');
}

// ═════════ 押寶：皇冠與錨 ═════════
const SYMS = ['皇冠', '錨', '紅心', '方塊', '梅花', '黑桃'];
const SYM_ICON = { 皇冠: '♛', 錨: '⚓', 紅心: '♥', 方塊: '♦', 梅花: '♣', 黑桃: '♠' };
function crownGame(T) {
  const d = T.d;
  T.header();
  const start = 10, rounds = D(T, [6, 8, 10]);
  let coins = start, r = 0, bet = 1, sym = null, busy = false;
  const prog = el('div', { class: 'mg-progress' });
  const cloth = el('div', { class: 'ca-cloth' });
  const bowl = el('div', { class: 'bg-bowl' });
  const res = el('div', { class: 'mg-q small' });
  const bets = el('div', { class: 'chips' });
  const btnRoll = el('button', { class: 'btn primary', onclick: () => play() }, '擲');
  T.body.append(prog, cloth, el('div', { class: 'set-row' }, el('b', {}, '押幾顆'), bets), bowl, res, btnRoll);
  const draw = () => {
    cloth.innerHTML = '';
    SYMS.forEach(s => cloth.appendChild(el('button', { class: 'ca-sym' + (sym === s ? ' on' : ''), onclick: () => { sym = s; T.sfx('tap'); draw(); } }, el('b', { class: s === '紅心' || s === '方塊' ? 'red' : '' }, SYM_ICON[s]), el('small', {}, s))));
    bets.innerHTML = '';
    [1, 2, 3].forEach(n => bets.appendChild(el('button', { class: 'chip' + (bet === n ? ' on' : ''), disabled: n > coins, onclick: () => { bet = n; draw(); } }, `${n} 顆`)));
    prog.textContent = `第 ${Math.min(r + 1, rounds)} / ${rounds} 局・手上有 ${coins} 顆${d.coin || '鈕扣'}（一開始 ${start} 顆）`;
    btnRoll.disabled = busy || !sym || bet > coins;
  };
  const play = () => {
    busy = true;
    const ds = Array.from({ length: 3 }, () => SYMS[rnd(6)]);
    bowl.innerHTML = ''; ds.forEach(s => bowl.appendChild(el('span', { class: 'bg-sym' + (s === '紅心' || s === '方塊' ? ' red' : '') }, SYM_ICON[s])));
    const hit = ds.filter(s => s === sym).length;
    if (hit) { coins += bet * hit; res.textContent = `出現 ${hit} 個${sym}！贏了 ${bet * hit} 顆。`; T.sfx('item'); }
    else { coins -= bet; res.textContent = `沒有${sym}。輸了 ${bet} 顆。`; T.sfx('fail'); }
    r++;
    if (bet > coins) bet = Math.max(1, coins);
    T.later(800, () => {
      busy = false;
      if (r >= rounds || coins <= 0) return T.finish(coins >= start, `最後手上有 ${coins} 顆${d.coin || '鈕扣'}`, coins >= start * 2);
      draw();
    });
    draw();
  };
  draw();
  T.solveFn = () => T.finish(true, `最後手上有 ${start + 2} 顆${d.coin || '鈕扣'}`);
}

export const MINI4 = { 博餅: bobingGame, 羊趾骨: bonesGame, 跑棋: raceGame, 押寶: crownGame };
