// 港口的博奕：酒館的「潮汐骰」、黑市的「紅帆牌桌」
import { DICE_PLAYS, CARD_PLAYS, DICE_BETS, DICE_BET_BIG, CARD_BETS, BLACK_POOL } from './data.js';
import { save } from './state.js';
import { el } from './ui.js';

const FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const d6 = () => 1 + Math.floor(Math.random() * 6);

// 三顆骰子的牌型：三條＞順子＞對子＞散點（同牌型比點數）
export function diceHand(ds) {
  const s = [...ds].sort((a, b) => a - b);
  if (s[0] === s[2]) return { rank: 3, score: 300 + s[0], name: `三條（${s[0]}）` };
  if (s[1] === s[0] + 1 && s[2] === s[1] + 1) return { rank: 2, score: 200 + s[2], name: `順子（${s.join('')}）` };
  if (s[0] === s[1] || s[1] === s[2]) { const p = s[1], k = s[0] === s[1] ? s[2] : s[0]; return { rank: 1, score: 100 + p * 10 + k, name: `對子（${p}）` }; }
  return { rank: 0, score: s[0] + s[1] + s[2], name: `散點（${s[0] + s[1] + s[2]} 點）` };
}

// 漁夫怎麼重擲：三條、順子不動；對子重擲落單的那顆；散點留最大的一顆
function aiReroll(ds) {
  const h = diceHand(ds);
  if (h.rank >= 2) return ds;
  if (h.rank === 1) { const p = ds.find((x, i) => ds.indexOf(x) !== i); return ds.map(x => x === p ? x : d6()); }
  const hi = Math.max(...ds); let kept = false;
  return ds.map(x => { if (x === hi && !kept) { kept = true; return x; } return d6(); });
}

const diceRow = (ds, sel, onTap) => el('div', { class: 'dice' }, ...ds.map((v, i) => el('button', { class: 'die' + (sel && sel[i] ? ' sel' : ''), disabled: !onTap, 'aria-label': `${v} 點${sel && sel[i] ? '（要重擲）' : ''}`, onclick: onTap ? () => onTap(i) : null }, FACE[v])));

// 酒館：潮汐骰。onStreak：連贏三局時呼叫（漁夫偷偷說一則流言）
export function diceGame(ctx, onStreak, onClose) {
  const g = ctx.g, day = g.port;
  let st = { phase: 'bet' };
  // 重擲、漁夫擲骰、算輸贏（中途關掉視窗的話，就當作不重擲）
  const settle = api => {
    if (st.phase !== 'reroll') return;
    st.me = st.me.map((v, i) => st.sel[i] ? d6() : v);
    st.foe = aiReroll([d6(), d6(), d6()]);
    const a = diceHand(st.me), b = diceHand(st.foe);
    st.result = a.score > b.score ? 'win' : a.score < b.score ? 'lose' : 'tie';
    if (st.result === 'win') { st.pay = st.bet * (a.rank === 3 ? 4 : 2); g.silver += st.pay; day.streak = (day.streak || 0) + 1; ctx.audio.sfx('item'); }
    else if (st.result === 'tie') { g.silver += st.bet; day.streak = 0; }
    else day.streak = 0;
    st.phase = 'done'; save(g); if (api) api.rebuild();
  };
  ctx.ui.sheet('酒館・潮汐骰', (body, api) => {
    body.append(el('p', { class: 'muted' }, '老漁夫：「三顆骰子，擲一次，挑幾顆重擲一次。三條最大，再來是順子、對子，最後比點數。」'),
      el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), el('span', {}, `今天還能玩 ${day.dice} 局`), day.streak ? el('span', {}, `連贏 ${day.streak} 局`) : null));
    if (st.phase === 'bet') {
      if (day.dice <= 0) { body.append(el('p', { class: 'para' }, '老漁夫打了個哈欠：「今天就到這裡。下次回港再來。」')); return; }
      const bets = g.flags.焰 ? [...DICE_BETS, DICE_BET_BIG] : DICE_BETS;
      body.append(el('p', { class: 'para' }, '押多少？贏了拿回兩倍，擲出三條再加倍。平手退回押注。'),
        el('div', { class: 'btns' }, ...bets.map(b => el('button', { class: 'btn', disabled: g.silver < b, onclick: () => {
          g.silver -= b; day.dice--; ctx.audio.sfx('tap');
          st = { phase: 'reroll', bet: b, me: [d6(), d6(), d6()], sel: [false, false, false] };
          save(g); api.rebuild();
        } }, `押 ${b}`))));
      return;
    }
    if (st.phase === 'reroll') {
      body.append(el('h3', { class: 'sub-h' }, `你擲出了：${diceHand(st.me).name}`),
        diceRow(st.me, st.sel, i => { st.sel[i] = !st.sel[i]; api.rebuild(); }),
        el('p', { class: 'small muted' }, '點骰子選要重擲的（可以都不選）。'),
        el('div', { class: 'btns' },
          el('button', { class: 'btn primary', onclick: () => settle(api) }, st.sel.some(Boolean) ? `重擲 ${st.sel.filter(Boolean).length} 顆` : '不重擲，就這樣')));
      return;
    }
    // done
    const a = diceHand(st.me), b = diceHand(st.foe);
    body.append(el('h3', { class: 'sub-h' }, `你：${a.name}`), diceRow(st.me), el('h3', { class: 'sub-h' }, `老漁夫：${b.name}`), diceRow(st.foe),
      el('p', { class: 'para' }, st.result === 'win' ? `你贏了！拿回 ${st.pay} 銀貝。${a.rank === 3 ? '（三條，加倍！）' : ''}` : st.result === 'tie' ? '平手。押注退回來了。' : `你輸了。老漁夫把 ${st.bet} 銀貝收進口袋：「再來一局？」`));
    if (st.result === 'win' && day.streak >= 3) {
      day.streak = 0; save(g);
      body.append(el('p', { class: 'para' }, '老漁夫輸得臉都紅了，湊過來小聲說：「好啦好啦，我跟你說一件事……」'));
      const tip = onStreak();
      if (tip) body.append(...ctx.ui.paras(tip));
    }
    body.append(el('div', { class: 'btns' }, el('button', { class: 'btn primary', disabled: day.dice <= 0, onclick: () => { st = { phase: 'bet' }; api.rebuild(); } }, day.dice > 0 ? '再來一局' : '今天玩完了')));
  }, { onClose: () => { settle(null); onClose(); } });
}

// 黑市：紅帆牌桌（像 21 點）。牌是 1～10 點，人頭牌（舵、錨、帆）算 10 點
const SUITS = ['潮', '焰', '霧', '星'], HEADS = ['舵', '錨', '帆'];
function draw() {
  const r = Math.floor(Math.random() * 13);
  const suit = SUITS[Math.floor(Math.random() * 4)];
  return r < 10 ? { v: r + 1, label: `${suit}${r + 1}` } : { v: 10, label: `${suit}${HEADS[r - 10]}` };
}
const total = cs => cs.reduce((a, c) => a + c.v, 0);
const cardRow = cs => el('div', { class: 'cards' }, ...cs.map(c => el('span', { class: 'card' }, c.label)));

export function cardGame(ctx, lv, onClose) {
  const g = ctx.g, day = g.port;
  let st = { phase: 'bet' };
  // 莊家抽牌、算輸贏（中途關掉視窗的話，就當作不抽了）
  const finish = api => {
    if (st.phase !== 'play') return;
    while (total(st.foe) < 17) st.foe.push(draw());
    const a = total(st.me), b = total(st.foe);
    st.result = a > 21 ? 'lose' : b > 21 || a > b ? 'win' : a === b ? 'tie' : 'lose';
    if (st.result === 'win') {
      g.silver += st.bet * 2; ctx.audio.sfx('item');
      if (a === 21) {
        const pool = BLACK_POOL.filter(it => it.kind === 'mat' && it.need <= lv && (!it.flag || g.flags[it.flag]));
        const it = pool[Math.floor(Math.random() * pool.length)];
        if (it) { ctx.gainMat(it.name, it.n); st.prize = `${it.name} ${it.n}`; }
      }
    } else if (st.result === 'tie') g.silver += st.bet;
    st.phase = 'done'; save(g); if (api) api.rebuild();
  };
  ctx.ui.sheet('黑市・紅帆牌桌', (body, api) => {
    body.append(el('p', { class: 'muted' }, '葛蘿的老部下洗著牌：「點數加起來越接近 21 越好，超過 21 就爆了。莊家不到 17 一定要再抽。剛好 21 點贏的話，櫃子後面的東西送你一樣。」'),
      el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), el('span', {}, `今天還能玩 ${day.cards} 局`)));
    if (st.phase === 'bet') {
      if (day.cards <= 0) { body.append(el('p', { class: 'para' }, '「今天的桌子收了。下次回港再來。」')); return; }
      body.append(el('p', { class: 'para' }, '押多少？贏了拿回兩倍，平手退回押注。'),
        el('div', { class: 'btns' }, ...CARD_BETS.map(b => el('button', { class: 'btn', disabled: g.silver < b, onclick: () => {
          g.silver -= b; day.cards--; ctx.audio.sfx('tap');
          st = { phase: 'play', bet: b, me: [draw(), draw()], foe: [draw(), draw()] };
          save(g); api.rebuild();
        } }, `押 ${b}`))));
      return;
    }
    const a = total(st.me);
    body.append(el('h3', { class: 'sub-h' }, `你的牌：${a} 點${a > 21 ? '（爆了）' : ''}`), cardRow(st.me),
      el('h3', { class: 'sub-h' }, st.phase === 'play' ? `莊家：${st.foe[0].label} 和一張蓋著的牌` : `莊家：${total(st.foe)} 點${total(st.foe) > 21 ? '（爆了）' : ''}`),
      st.phase === 'play' ? cardRow([st.foe[0], { label: '？' }]) : cardRow(st.foe));
    if (st.phase === 'play') {
      body.append(el('div', { class: 'btns' },
        el('button', { class: 'btn', onclick: () => { st.me.push(draw()); ctx.audio.sfx('tap'); if (total(st.me) >= 21) finish(api); else api.rebuild(); } }, '再抽一張'),
        el('button', { class: 'btn primary', onclick: () => finish(api) }, '不抽了')));
      return;
    }
    body.append(el('p', { class: 'para' }, st.result === 'win' ? `你贏了！拿回 ${st.bet * 2} 銀貝。${st.prize ? `剛好 21 點，老部下從櫃子後面拿出了：${st.prize}。` : ''}` : st.result === 'tie' ? '平手。押注退回來了。' : `你輸了 ${st.bet} 銀貝。「紅帆的桌子，可不是誰都贏得了。」`),
      el('div', { class: 'btns' }, el('button', { class: 'btn primary', disabled: day.cards <= 0, onclick: () => { st = { phase: 'bet' }; api.rebuild(); } }, day.cards > 0 ? '再來一局' : '今天玩完了')));
  }, { onClose: () => { finish(null); onClose(); } });
}
