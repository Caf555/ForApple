// 《畫海人》：標題 → 序章 → 港口 ⇄（航海 → 島嶼 → 回港）→ 第一章完 → 天文台 → 第二章 → 第二章完 → 天文台 → 第三章 → 第三章完 → 天文台 → 第四章 → 第四章完 → 天文台 → 第五章 → 霧心：最後的抉擇 → 結局 → 尾聲（之後可以繼續玩）
import { HEROES, ITEMS, MATS, EQUIPS, SLOTS, COMMISSIONS, PARTY_MAX, FACTIONS, REP_LEVELS, repLevel, repOn, MIST_ROUTE, WISHES, HULL_WEAR, HULL_WORN, hullOf } from './data.js';
import { ISLANDS, ISLAND_ORDER, SEAS, SEA_EVENTS, INTRO, PORT_SCENES, CHAPTERS, LATE_RECRUIT, OBSERVATORY, OBSERVATORY3, OBSERVATORY4, OBSERVATORY5, CINEMA, FINALE_ASK, ENDINGS, EPILOGUE, CREDITS } from './islands.js';
import { playCinema, loadPics } from './cinema.js';
import { newGame, makeHero, heroStats, expNeed, DIFF, save, load, clearSave, loadSettings, saveSettings, moraleTier, MORALE_TIERS, MORALE_HOME } from './state.js';
import { UI, el, $ } from './ui.js';
import { Audio } from './audio.js';
import { Battle } from './battle.js';
import { Explore, newIsland, worldOf, surveyMax, helpers } from './explore.js';
import { Port, statText } from './port.js';
import { playPuzzle, PUZZLE_TIPS } from './puzzle.js';
import { playTraining, trainingMorale, TRAININGS, TRAINING_KINDS } from './training.js';

export const VERSION = 'M5 第五海域 v0.3（完結）';

const ctx = { g: null, settings: loadSettings() };
ctx.saveSettings = () => saveSettings(ctx.settings);
ctx.ui = new UI(ctx);
ctx.audio = new Audio(ctx);
ctx.battle = new Battle(ctx);
ctx.explore = new Explore(ctx);
ctx.port = new Port(ctx);
window.__hhr = ctx; // 方便測試

document.addEventListener('pointerdown', () => ctx.audio.unlock(), { once: false });

// 劇情動畫：播過的記在設定裡（設定 → 回顧劇情 可以重看）
async function cinema(key) {
  const s = ctx.settings;
  s.seen = s.seen || [];
  if (!s.seen.includes(key)) { s.seen.push(key); ctx.saveSettings(); }
  await playCinema(ctx, CINEMA[key]);
}
ctx.cinema = cinema;

// 劇情台詞：need 隊伍裡有這個人才出現；flag「殘頁=父親」這種寫法，要選過那個選項才出現
const has = k => ctx.g.party.some(h => h.key === k);
const flagOk = f => { const [k, v] = f.split('='); return v === undefined ? !!ctx.g.flags[k] : ctx.g.flags[k] === v; };
const lines = arr => arr.map(L => typeof L === 'string' ? { text: L } : L).filter(L => (!L.need || has(L.need)) && (!L.flag || flagOk(L.flag)));
ctx.storyLines = lines;

// 出戰人數上限：港口流感的時候少一個
ctx.partyMax = () => PARTY_MAX - (ctx.g.party.some(h => h.sick) ? 1 : 0);

// 新隊友加入：等級跟出戰的人差不多，帶著自己的武器；出戰滿 4 人的話，先在船上待命
ctx.recruit = async key => {
  const g = ctx.g;
  if (g.party.some(h => h.key === key)) return;
  const team = g.party.filter(h => !h.bench);
  const lv = Math.max(1, Math.round(team.reduce((a, h) => a + h.lv, 0) / team.length));
  const h = makeHero(key, g.party.length, lv);
  const w = HEROES[key].weapon || (key === '小鈴' ? '貝殼琴' : null);
  if (w && EQUIPS[w]) { h.eq.武器 = w; if (!g.bps.includes(w)) g.bps.push(w); }
  const s = heroStats(h); h.hp = s.hp; h.mp = s.mp;
  if (g.party.filter(x => !x.bench).length >= ctx.partyMax()) h.bench = true;
  g.party.push(h);
  save(g);
  if (h.bench) await ctx.ui.alert('隊伍', [`出戰的人已經有 ${ctx.partyMax()} 個了，${key}先在船上待命。`, '打開「隊伍」，點「出戰／待命」就可以換人。']);
};

// ───────── 共用：效果、素材、圖紙、委託 ─────────
// 效果：糧、燈油、墨水、藥草…（數量）；素材（數量）；銀貝；hp（全隊比例）；士氣
// 訓練（營地、甲板）：隨機挑一種，帶隊的人不在隊上就換人帶；表現越好，士氣回得越多
ctx.train = async where => {
  const g = ctx.g, kind = TRAINING_KINDS[Math.floor(Math.random() * TRAINING_KINDS.length)];
  const lead = TRAININGS[kind].lead.find(k => g.party.some(h => h.key === k && !h.bench)) || TRAININGS[kind].lead.find(k => has(k)) || '阿潮';
  const score = await playTraining(ctx, kind, lead);
  const n = trainingMorale(score);
  g.morale = Math.min(100, g.morale + n);
  save(g);
  await ctx.ui.alert(`${where}・${kind}`, [score >= 0.8 ? '大家練得滿身大汗，笑得很開心。' : score >= 0.5 ? '練完以後，大家的肩膀都放鬆了一點。' : '練得亂七八糟，大家笑成一團。', `（士氣 +${n}，現在是 ${g.morale}・${moraleTier(g.morale).name}）`]);
};

ctx.applyFx = fx => {
  const g = ctx.g;
  for (const [k, v] of Object.entries(fx || {})) {
    if (k === '銀貝') g.silver = Math.max(0, g.silver + v);
    else if (FACTIONS.includes(k)) ctx.addRep(k, v);
    else if (k === '士氣') g.morale = Math.max(0, Math.min(100, g.morale + v));
    else if (k === 'hp') for (const h of g.party) { const st = heroStats(h); if (h.hp > 0) h.hp = Math.max(1, Math.min(st.hp, h.hp + Math.round(st.hp * v))); }
    else if (MATS[k]) { if (v > 0) ctx.gainMat(k, v); else g.mats[k] = Math.max(0, (g.mats[k] || 0) + v); }
    else g.supply[k] = Math.max(0, (g.supply[k] || 0) + v);
  }
};
// 船況磨損：船身改造越好、難度越悠閒，磨損越少。回傳實際磨掉多少
ctx.wearHull = n => {
  const g = ctx.g, lv = (g.ship && g.ship.船身) || 0;
  const k = Math.max(1, Math.round(n * (1 - 0.25 * lv) * (g.diff === '悠閒' ? 0.5 : 1)));
  const before = hullOf(g); g.hull = Math.max(0, before - k);
  return before - g.hull;
};
ctx.fxText = fx => {
  const parts = Object.entries(fx || {}).filter(([k]) => !FACTIONS.includes(k) || repOn(ctx.g, k)).map(([k, v]) => k === 'hp' ? `全隊體力 ${v > 0 ? '+' : ''}${Math.round(v * 100)}%` : `${k}${FACTIONS.includes(k) ? '聲望' : ''} ${v > 0 ? '+' : ''}${v}`);
  return parts.length ? `（${parts.join('　')}）` : '';
};
// 勢力聲望：0～100，每 20 一級；升級或降級的時候提醒一下（商會、紅帆從第三章開始算，守霧人從第四章開始算）
ctx.addRep = (k, v) => {
  const g = ctx.g;
  if (!repOn(g, k)) return;
  g.rep = g.rep || { 商會: 0, 紅帆: 0 };
  const before = repLevel(g.rep[k]);
  g.rep[k] = Math.max(0, Math.min(100, (g.rep[k] || 0) + v));
  const after = repLevel(g.rep[k]);
  if (after !== before) ctx.ui.toast(`${k}對你們的態度變成「${REP_LEVELS[after]}」了。`);
};
ctx.gainMat = (k, n) => {
  const g = ctx.g;
  g.mats[k] = (g.mats[k] || 0) + n;
  if (g.trip) g.trip.mats[k] = (g.trip.mats[k] || 0) + n;
};
// 從清單裡挑一張還沒有的圖紙；都有了就回傳 null
ctx.newBlueprint = list => {
  const g = ctx.g, left = list.filter(n => !g.bps.includes(n));
  if (!left.length) return null;
  const n = left[Math.floor(Math.random() * left.length)];
  g.bps.push(n);
  if (g.trip) g.trip.bps.push(n);
  return n;
};
// 回傳這次有算到的委託編號（戰鬥結果顯示進度用）
ctx.onKill = key => {
  const g = ctx.g, hit = [];
  for (const id in g.jobs) { const c = COMMISSIONS.find(x => x.id === id); if (c && c.kind === 'kill' && c.target === key) { g.jobs[id]++; hit.push(id); } }
  return hit;
};

// ───────── 標題 ─────────
function title() {
  ctx.audio.music('標題');
  const s = $('screen'); s.innerHTML = ''; s.className = 'title';
  const saved = load();
  s.append(el('div', { class: 't-box' },
    el('div', { class: 't-rose', 'aria-hidden': 'true' }),
    el('h1', {}, '畫海人'),
    el('p', { class: 't-sub' }, '只有被畫進地圖的地方，才不會被霧忘記。'),
    el('div', { class: 'col' },
      saved ? el('button', { class: 'btn primary', onclick: () => resume(saved) }, '繼續航行') : null,
      el('button', { class: 'btn' + (saved ? '' : ' primary'), onclick: () => saved ? ctx.ui.confirm('新的航行', '重新開始的話，現在的存檔會被蓋掉。確定嗎？', '重新開始', '取消').then(ok => ok && pickDiff()) : pickDiff() }, '新的航行'),
      el('button', { class: 'btn', onclick: () => settingsSheet() }, '設定')),
    el('p', { class: 't-ver' }, VERSION + '　美術先用色塊和文字代替')));
}

function pickDiff() {
  const api = ctx.ui.sheet('選擇難度', body => {
    body.append(el('p', { class: 'muted' }, '之後隨時可以在選單裡改。'));
    for (const k of ['悠閒', '標準', '困難']) body.append(el('button', { class: 'btn wide' + (k === '標準' ? ' primary' : ''), onclick: () => { api.close(); start(k); } }, el('b', {}, k), el('small', {}, DIFF[k].label.split('：')[1])));
  });
}

async function start(diff) {
  clearSave();
  ctx.g = newGame(diff);
  ctx.audio.music('標題');
  if (!(ctx.settings.seen || []).includes('開場')) await cinema('開場');
  const picks = await ctx.ui.story(INTRO);
  ctx.g.attitude = picks[0];
  if (picks[0] === '大膽') ctx.g.morale += 8; else ctx.g.supply.燈油 += 2;
  ctx.g.phase = 'port';
  save(ctx.g);
  ctx.port.show();
}

function resume(g) {
  ctx.g = g;
  if (g.phase === 'island' && g.island) ctx.explore.show();
  else { g.phase = 'port'; ctx.port.show(); }
}

// ───────── 出航：航海事件 → 登島 ─────────
ctx.sail = async id => {
  const g = ctx.g, def = ISLANDS[id];
  ctx.audio.music('港口');
  // 第一次去這座島：先播這座島的故事
  if (!worldOf(g, id).visits && CINEMA[id]) await cinema(id);
  // 港口突發事件「暴風季」：多遇到一個航海事件（雙層帆不怕）
  const storm = ctx.port.ev('暴風季') && (g.ship.船帆 || 0) < 2 && def.seaEvents ? 1 : 0;
  let pool = seaPool(g, storm ? { ...def, seaEvents: def.seaEvents + storm } : def);
  // 酒館的流言說過的航海事件：這一趟一定會遇到
  if (g.forecast && g.forecast.sea === def.sea) {
    const ev = SEA_EVENTS.find(e => e.title === g.forecast.title && (e.sea || '淺灘') === def.sea);
    if (ev && pool.length && !pool.includes(ev)) pool[0] = ev;
    g.forecast = null;
  }
  // 守霧人信任你們以後：北霧海可以走祕密航道，不會遇到航海事件
  if (def.sea === '北霧海' && repOn(g, '守霧人') && repLevel(g.rep.守霧人 || 0) >= MIST_ROUTE) {
    const i = await ctx.ui.choose('守霧人的航道', ['守霧人的小舟在港口等著。「跟著我們的燈走，」他們說，「冰下的航道，海上的東西找不到你們。」'], [{ label: '走祕密航道（不會遇到航海事件）' }, { label: '走一般的航線' }]);
    if (i === 0) pool = [];
  }
  g.weather = null;
  for (const ev of pool) await seaEvent(ev);
  // 攻上島以前要選邊（紅岬）：選了就不能改
  const R = def.routes;
  if (R && !g.flags[R.key]) {
    const keys = Object.keys(R.opts);
    const ask = lines(R.ask).map(L => L.text);
    const short = o => Object.entries(o.need || {}).filter(([f, n]) => repLevel((g.rep || {})[f] || 0) < n);
    const i = await ctx.ui.choose(id, ask, keys.map(k => { const miss = short(R.opts[k]); return { label: R.opts[k].label + (miss.length ? `（要${miss.map(([f, n]) => `${f}的聲望到「${REP_LEVELS[n]}」`).join('、')}）` : ''), disabled: miss.length > 0 }; }));
    const o = R.opts[keys[i]];
    g.flags[R.key] = keys[i];
    ctx.applyFx(o.fx);
    for (const [k, v] of Object.entries(o.rep || {})) ctx.addRep(k, v);
    await ctx.ui.alert(id, [...o.line, ctx.fxText({ ...o.fx, ...o.rep })].filter(Boolean));
  }
  // 霧心：聲望到「信任」的勢力來幫忙
  if (def.help) {
    const h = helpers(g), say = [];
    if (h.includes('守霧人')) say.push('守霧人的灰燈小舟，一路陪你們開到白色的邊上。「霧心裡的霧，我們替你們看著。」（霧不會回來，低語都說真話）');
    if (h.includes('紅帆')) say.push('紅帆的船隊在外圍下了錨，炮口對著霧。「裡面的東西，我們先替你們轟一輪。」（妖物少 3 個）');
    if (h.includes('商會')) { say.push('商會的破冰船靠過來，船員把一箱一箱的補給搬上船。「會長說，這次不收錢。」（糧 +12、藥草 +4、海靈露 +3、醒神香 +1）'); ctx.applyFx({ 糧: 12, 藥草: 4, 海靈露: 3, 醒神香: 1 }); }
    const miss = FACTIONS.filter(f => !h.includes(f));
    if (miss.length) say.push(`（${miss.join('、')}的聲望到「信任」以上的話，也會來幫忙）`);
    if (!h.length) say.unshift('白色的邊上，只有你們的船。');
    await ctx.ui.alert('來幫忙的人', say);
  }
  // 黑市的走私：往目的地的路上，可能被商會的巡邏船臨檢
  if (g.smuggle && g.smuggle.island === id && Math.random() < (g.diff === '悠閒' ? 0.25 : 0.4)) await inspect(id);
  // 甲板上的訓練：每趟出航一次，可以跳過
  const d = await ctx.ui.choose('甲板上', ['離登島還有一段路。海風很穩，甲板上空出了一塊地方。', `（訓練可以提振士氣。現在的士氣：${g.morale}・${moraleTier(g.morale).name}）`], [{ label: '在甲板上訓練一下' }, { label: '直接準備登島' }]);
  if (d === 0) await ctx.train('甲板');
  // 拿過好結局的島：登島時多一段「之後的樣子」
  await ctx.ui.story(lines([...def.arrive, ...(worldOf(g, id).good && def.after ? def.after.arrive : [])]));
  const tip = g.tip && g.tip.island === id;
  ctx.wearHull(HULL_WEAR.land);
  g.island = newIsland(g, id);
  if (tip) await ctx.ui.alert('酒館的流言', ['{名}想起酒館裡聽到的話。島上那個地方……好像真的有一個箱子。', '（這一趟，島上多了一個寶箱）']);
  if (g.smuggle && g.smuggle.island === id) {
    const sm = g.smuggle; g.smuggle = null;
    g.silver += sm.pay; ctx.addRep('紅帆', 8); ctx.addRep('商會', -3);
    ctx.audio.sfx('item');
    await ctx.ui.alert('走私', ['碼頭邊有一個戴斗笠的人，什麼都沒說，扛起貨箱就走了。', '過了一會兒，船艙裡多了一個錢袋。', ctx.fxText({ 銀貝: sm.pay, 紅帆: 8, 商會: -3 })]);
  }
  g.phase = 'island';
  save(g);
  ctx.explore.show();
};

// 走私的貨箱被臨檢：交出貨、塞錢、或打一仗
async function inspect(id) {
  const g = ctx.g, bribe = 40 + 20 * SEAS.indexOf(ISLANDS[id].sea);
  const i = await ctx.ui.choose('商會的巡邏船', ['一艘掛著銀貝旗的船靠了過來。「例行檢查。」船上的人說，「貨艙打開。」', '那箱貨，就放在最上面。'],
    [{ label: '交出貨箱（走私失敗，紅帆聲望 −5）' }, { label: `塞 ${bribe} 銀貝，請他們當作沒看見`, disabled: g.silver < bribe }, { label: '不讓他們上船（打一仗）' }]);
  if (i === 1) { g.silver -= bribe; await ctx.ui.alert('商會的巡邏船', ['帶頭的人掂了掂錢袋，揮揮手：「貨艙沒問題。走吧。」']); return; }
  if (i === 2) {
    const def = ISLANDS[id], foes = def.encounters[Math.floor(Math.random() * def.encounters.length)];
    await ctx.ui.alert('商會的巡邏船', ['巡邏船上的傭兵跳了過來。他們身後的霧裡，還跟著別的東西……']);
    const r = await ctx.battle.start({ enemies: foes, terrain: '潮間帶', lit: false, kind: '一般' });
    ctx.audio.music('港口');
    ctx.wearHull(r === 'win' ? HULL_WEAR.fight : HULL_WEAR.lost);
    if (r === 'win') { ctx.addRep('商會', -3); await ctx.ui.alert('商會的巡邏船', ['巡邏船掉頭跑了。貨箱還在。', ctx.fxText({ 商會: -3 })]); return; }
    for (const h of ctx.g.party) h.hp = Math.max(1, h.hp, Math.round(heroStats(h).hp * 0.3));
  }
  g.smuggle = null; ctx.addRep('紅帆', -5);
  await ctx.ui.alert('商會的巡邏船', ['貨箱被搬走了。', ctx.fxText({ 紅帆: -5 })]);
}

// ───────── 航海事件 ─────────
// 每個事件的 id：海域＋標題（不同海域可以同名）
const seaId = ev => `${ev.sea || '淺灘'}:${ev.title}`;
const onDeck = k => ctx.g.party.some(h => h.key === k && !h.bench);
// 這一趟會遇到的事件：優先抽還沒看過的；連續小故事照順序、每趟最多一段；海上戰鬥、天氣每趟最多一個
function seaPool(g, def) {
  const sea = def.sea, seen = new Set(g.seaSeen || []), chain = g.seaChain || {};
  const ok = e => (e.sea || '淺灘') === sea && (!e.need || onDeck(e.need)) && (!e.chain || (chain[e.chain] || 0) === e.step - 1);
  let cand = SEA_EVENTS.filter(ok);
  // 這片海能遇到的都看過了：重新洗牌（連續小故事不算）
  if (cand.filter(e => !e.chain).every(e => seen.has(seaId(e)))) { g.seaSeen = (g.seaSeen || []).filter(id => !cand.some(e => seaId(e) === id)); seen.clear(); }
  const shuffled = cand.map(e => [(seen.has(seaId(e)) ? 1 : 0) + Math.random() * 0.9, e]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const out = [], kinds = new Set();
  // 連續小故事的下一段，先放進來
  const next = shuffled.find(e => e.chain);
  if (next && def.seaEvents) { out.push(next); kinds.add('chain'); }
  for (const e of shuffled) {
    if (out.length >= def.seaEvents) break;
    if (out.includes(e)) continue;
    const k = e.chain ? 'chain' : e.weather ? 'weather' : e.opts.some(o => o.fight) ? 'fight' : null;
    if (k && kinds.has(k)) continue;
    if (k) kinds.add(k);
    out.push(e);
  }
  return out.sort(() => Math.random() - 0.5);
}

// 碰運氣：士氣會影響成功率（高昂 +10%、低落 −10%、崩潰 −20%）
const luck = (o, m) => Math.max(0.05, Math.min(0.95, o.chance + (m >= 80 ? 0.1 : m < 20 ? -0.2 : m < 40 ? -0.1 : 0)));

async function seaEvent(ev) {
  const g = ctx.g;
  const opts = ev.opts.filter(o => !o.need || onDeck(o.need));
  const label = o => o.chance ? `${o.label}（成功 ${Math.round(luck(o, g.morale) * 100)}%）` : o.label;
  const i = await ctx.ui.choose(`航海・${ev.title}`, lines(ev.text).map(L => L.who ? `${L.who}：「${L.text}」` : L.text), opts.map(o => ({ label: label(o), disabled: !ctx.explore.canPay(o.fx) })));
  const o = opts[i];
  g.seaSeen = [...new Set([...(g.seaSeen || []), seaId(ev)])];
  if (ev.chain) g.seaChain = { ...(g.seaChain || {}), [ev.chain]: ev.step };
  let res = o, note = '', wear = 0;
  if (o.chance) { const win = Math.random() < luck(o, g.morale); res = { ...(win ? o.win : o.lose), fx: { ...(o.fx || {}), ...((win ? o.win : o.lose).fx || {}) } }; note = win ? '（成功了！）' : '（失敗了……）'; }
  if (o.fight) {
    ctx.applyFx(o.fx);
    await ctx.ui.alert(ev.title, [o.line]);
    const r = await ctx.battle.start({ enemies: o.fight, terrain: '潮間帶', kind: '一般' });
    ctx.audio.music('港口');
    wear = ctx.wearHull(r === 'win' ? HULL_WEAR.fight : HULL_WEAR.lost);
    if (r === 'win') res = o.win;
    else {
      // 打輸了：大家被拖回船上，剩一點點體力
      for (const h of g.party) h.hp = Math.max(1, Math.round(heroStats(h).hp * 0.3));
      g.morale = Math.max(0, g.morale - 10);
      res = { line: o.loseLine || '你們拚命把船開走，好不容易才甩掉它。大家都累壞了。', fx: {} };
    }
    note = '';
  }
  // 船況太差：壞事加重一半；補好的船帆：壞事減半，雙層帆只剩四分之一（自己選擇付出的不算）
  const fx = { ...(res.fx || {}) }, sail = g.ship.船帆 || 0, worn = hullOf(g) < HULL_WORN;
  const hurt = k => fx[k] < 0 && !(o.fx && o.fx[k] === fx[k]) && !o.label.includes(`${k} `) && !o.label.includes(`（${k}`);
  const bad = !o.fight && Object.keys(fx).some(hurt);
  if (bad) for (const k in fx) if (hurt(k)) {
    let v = fx[k];
    if (worn) v = k === 'hp' ? v * 1.5 : Math.floor(v * 1.5);
    if (sail) v = k === 'hp' ? v / (sail >= 2 ? 4 : 2) : Math.ceil(v / (sail >= 2 ? 4 : 2));
    fx[k] = v;
  }
  if (bad) wear = ctx.wearHull(HULL_WEAR.bad);
  ctx.applyFx(fx);
  if (o.weather || res.weather) g.weather = o.weather || res.weather;
  const good = ev.goodIsle && (g.world[ev.goodIsle] || {}).good && ev.goodLine;
  const W = { 晴朗: '（晴朗：登島時看得見的範圍多一圈）', 濃霧: '（濃霧：登島時看得見的範圍少一圈，可是霧眼的守門妖物比較弱）', 順風: '（順風：登島以後，前 6 步不吃糧）' };
  await ctx.ui.alert(ev.title, [note, ...lines([].concat(res.line || [])).map(L => L.who ? `${L.who}：「${L.text}」` : L.text), good, ctx.fxText(fx), bad && worn ? '（船破破爛爛的，損失更重了）' : '', bad && sail ? `（${sail >= 2 ? '雙層帆，讓損失只剩四分之一' : '補好的船帆，讓損失少了一半'}）` : '', wear ? `（船況 −${wear}，剩 ${hullOf(g)}）` : '', g.weather && (o.weather || res.weather) ? W[g.weather] : ''].filter(Boolean));
  save(g);
}

// ───────── 回港 ─────────
ctx.backToPort = async rep => {
  const g = ctx.g, def = ISLANDS[rep.island];
  g.phase = 'port'; g.island = null;
  // 回到家：全隊休息
  for (const h of g.party) { const s = heroStats(h); h.hp = s.hp; h.mp = s.mp; }
  // 回港：士氣至少拉回「平穩」的底（被迫返航的話，剩 30）
  g.morale = rep.forced ? 30 : Math.max(g.morale, MORALE_HOME);
  save(g);
  ctx.audio.music('港口');
  const t = g.trip || { mats: {}, silver: g.silver, bps: [] };
  const mats = Object.entries(t.mats).map(([k, n]) => `${k} ${n}`).join('、');
  // 回港就是新的一天：流言、行情、黑市的貨都換了
  ctx.port.newDay();
  const ready = Object.keys(g.jobs).filter(id => ctx.port.jobState(COMMISSIONS.find(c => c.id === id)).ready).length;
  await ctx.ui.alert(rep.ending ? def.endings[rep.ending].title : `回到鹽灣島`, [
    `${rep.island}的測繪度：${rep.pct}%（最好 ${worldOf(g, rep.island).best}%，這座島最高 ${surveyMax(rep.island)}%）`,
    `這趟賺到的銀貝：${Math.max(0, g.silver - t.silver)}`,
    mats ? `帶回來的素材：${mats}` : '這趟沒有帶回素材。',
    t.bps.length ? `找到的圖紙：${t.bps.join('、')}` : '',
    ready ? `酒館裡有 ${ready} 個委託可以回報。` : '',
    '（回到家，全隊的體力和靈都恢復了）',
  ].filter(Boolean), '回到港口');
  g.trip = null;
  // 沒在村子遇到的隊友，回港的時候追上來
  const late = rep.first && LATE_RECRUIT[rep.island];
  if (late && !has(late.key)) { await ctx.ui.story(lines(late.lines)); await ctx.recruit(late.key); }
  if (rep.first && PORT_SCENES[rep.island]) await ctx.ui.story(lines(PORT_SCENES[rep.island]));
  const ch = CHAPTERS.find(c => c.last === rep.island);
  if (rep.first && ch && !g.flags[ch.flag]) {
    g.flags[ch.flag] = 1; save(g);
    await ctx.ui.story(lines(ch.end));
    await cinema(ch.cine);
    // 母親的足跡全部找到：多一個畫面
    if (ch.bonus && ch.isles.every(k => !ISLANDS[k].trace || g.flags['足跡:' + k])) await cinema(ch.bonus);
    return chapterEnd(ch);
  }
  save(g);
  ctx.port.show();
};

// 天文台：每一章完成以後第一次去，播下一章的開場，海圖多一頁
ctx.observatory = async () => {
  const g = ctx.g;
  if (!g.flags.環礁) {
    await cinema('第二章');
    await ctx.ui.story(lines(OBSERVATORY));
    g.flags.環礁 = 1; save(g);
  } else if (g.flags.第二章 && !g.flags.焰) {
    await cinema('第三章');
    // 聲望從這裡開始算：殘頁交給會長的話，商會比較記得你們
    g.rep = { 商會: g.flags.殘頁 === '父親' ? 30 : 20, 紅帆: 20 };
    await ctx.ui.story(lines(OBSERVATORY3));
    g.flags.焰 = 1; save(g);
  } else if (g.flags.第三章 && !g.flags.北) {
    await cinema('第四章');
    g.rep = { ...(g.rep || { 商會: 0, 紅帆: 0 }), 守霧人: 10 };
    await ctx.ui.story(lines(OBSERVATORY4));
    g.flags.北 = 1; save(g);
  } else if (g.flags.第四章 && !g.flags.霧心) {
    await cinema('第五章');
    await ctx.ui.story(lines(OBSERVATORY5));
    await ctx.recruit('霧子');
    g.flags.霧心 = 1; save(g);
  } else if (g.flags.結局) {
    const seen = (g.endings || []).map(k => ENDINGS[k].title).join('、');
    const i = await ctx.ui.choose('天文台', ['老人把望遠鏡對著霧心。那裡，現在是一片很淡很淡的霧。', `看過的結局：${seen}（${(g.endings || []).length}/${Object.keys(ENDINGS).length}）`, '「想再做一次最後的抉擇嗎？」老人問，「書的最後一頁，隨時可以重新畫。」', '牆上掛著一路畫回來的遺跡謎題，每一個都可以再玩一次。'], [{ label: '回到霧心，重新做最後的抉擇' }, { label: '小遊戲間：挑一個遺跡謎題來玩' }, { label: '不用了' }]);
    if (i === 0) return lastChoice();
    if (i === 1) return minigames();
  } else {
    const where = g.flags.霧心 ? '霧心' : g.flags.北 ? '北霧海' : g.flags.焰 ? '焰之群島' : '環礁';
    await ctx.ui.alert('天文台', ['老人在擦望遠鏡。', `「往霧心的路，還很長。」他說，「先把${where}的每一座島，都好好畫進書裡吧。」`], '回到港口');
  }
  ctx.port.show();
};

// 小遊戲間（通關後）：每座島的遺跡謎題，挑一個玩。不拿獎勵、不改劇情；難度只算這一次
async function minigames(diff = ctx.g.diff) {
  const g = ctx.g;
  const list = ISLAND_ORDER.filter(id => ISLANDS[id].ruin && ISLANDS[id].ruin.game).map(id => ({ id, kind: ISLANDS[id].ruin.game.kind, sea: ISLANDS[id].sea }));
  const seas = [...new Set(list.map(x => x.sea))];
  const solved = x => (g.practice || {})[x.kind] || g.flags['謎:' + x.id];
  const pick = await new Promise(res => {
    const api = ctx.ui.sheet('小遊戲間', body => {
      body.append(el('p', { class: 'para' }, '一路畫回來的遺跡謎題，都掛在天文台的牆上。挑一個來玩吧。（不拿獎勵，也不影響劇情和存檔）'),
        el('div', { class: 'set-row' }, el('b', {}, '這次的難度'), el('div', { class: 'chips' }, ...['悠閒', '標準', '困難'].map(k => el('button', { class: 'chip btn-chip' + (diff === k ? ' on' : ''), onclick: () => { diff = k; api.rebuild(); } }, k)))));
      for (const sea of seas) body.append(el('h3', { class: 'pg-sea' }, sea), el('div', { class: 'pg-list' }, ...list.filter(x => x.sea === sea).map(x =>
        el('button', { class: 'pg-game' + (solved(x) ? ' done' : ''), onclick: () => { res(x); api.close(); } },
          el('b', {}, x.kind), el('small', {}, `${x.id}・${PUZZLE_TIPS[x.kind] || ''}${solved(x) ? '・✓' : ''}`)))));
      body.append(el('h3', { class: 'pg-sea' }, '訓練'), el('div', { class: 'pg-list' }, ...TRAINING_KINDS.map(k =>
        el('button', { class: 'pg-game' + ((g.practice || {})[k] ? ' done' : ''), onclick: () => { res({ kind: k, train: true }); api.close(); } },
          el('b', {}, k), el('small', {}, `${TRAININGS[k].lead[0]}・${TRAININGS[k].tip}${(g.practice || {})[k] ? '・✓' : ''}`)))));
    }, { onClose: () => res(null) });
  });
  if (!pick) return ctx.port.show();
  if (pick.train) {
    const T = TRAININGS[pick.kind], lead = T.lead.find(k => has(k)) || '阿潮';
    const score = await playTraining({ ...ctx, g: { ...g, diff }, practice: true }, pick.kind, lead);
    if (score >= 0.8) { g.practice = { ...(g.practice || {}), [pick.kind]: 1 }; save(g); }
    return minigames(diff);
  }
  const win = await playPuzzle({ ...ctx, g: { ...g, diff }, practice: true }, pick.kind, pick.id);
  if (win) { g.practice = { ...(g.practice || {}), [pick.kind]: 1 }; save(g); }
  return minigames(diff);
}

// ───────── 最後的抉擇與結局 ─────────
// 打倒公會長：記下霧心的紀錄，然後是最後的抉擇
ctx.finale = async (id, pct) => {
  const g = ctx.g, rec = worldOf(g, id);
  rec.cleared = true;
  if (pct >= 60) rec.good = true;
  if (has('嘎嘎')) g.flags.嘎嘎名字 = 1;
  if ((g.world.忘人港 || {}).good) g.flags.海生回家 = 1;
  g.phase = 'port'; g.island = null; g.trip = null;
  for (const h of g.party) { const s = heroStats(h); h.hp = s.hp; h.mp = s.mp; }
  save(g);
  await lastChoice();
};

// 留白（真結局）還差什麼：三方聲望都到「信任」、8 個隊友的心願都完成、每座島都畫到最多能畫的九成
export const TRUE_REP = 2, TRUE_SURVEY = 0.9;
function trueEndMissing(g) {
  const miss = [];
  const low = FACTIONS.filter(f => repLevel((g.rep || {})[f] || 0) < TRUE_REP);
  if (low.length) miss.push(`${low.map(f => `${f}（現在「${REP_LEVELS[repLevel((g.rep || {})[f] || 0)]}」）`).join('、')}的聲望，還沒到「${REP_LEVELS[TRUE_REP]}」。`);
  const wish = Object.keys(WISHES).filter(k => !wishDone(k));
  if (wish.length) miss.push(`還有隊友的心願沒有完成：${wish.join('、')}。（在「隊伍」裡看得到）`);
  const ids = Object.keys(ISLANDS), avg = ids.reduce((a, id) => a + Math.min(1, worldOf(g, id).best / surveyMax(id)), 0) / ids.length;
  if (avg < TRUE_SURVEY) miss.push(`全部 ${ids.length} 座島的測繪度，平均只畫到最多能畫的 ${Math.floor(avg * 100)}%，要到 ${TRUE_SURVEY * 100}%。`);
  return miss;
}
ctx.trueEndMissing = () => trueEndMissing(ctx.g);

async function lastChoice() {
  const g = ctx.g, h = helpers(g);
  for (const f of FACTIONS) g.flags['幫忙:' + f] = h.includes(f) ? 1 : 0;
  g.flags.最高聲望 = [...FACTIONS].sort((a, b) => ((g.rep || {})[b] || 0) - ((g.rep || {})[a] || 0))[0];
  ctx.audio.music('劇情');
  await ctx.ui.story(lines(FINALE_ASK));
  const keys = Object.keys(ENDINGS);
  let k;
  for (;;) {
    const miss = trueEndMissing(g);
    const i = await ctx.ui.choose('最後的抉擇', ['繪圖師之書的最後一頁，還是空白的。', '（選了以後就會看到結局。之後到天文台，可以重新選一次）'], keys.map(x => ({ label: ENDINGS[x].label + (ENDINGS[x].need && miss.length ? '（還差一些東西）' : '') })));
    k = keys[i];
    if (!ENDINGS[k].need || !miss.length) break;
    await ctx.ui.alert('留白', ['{名}拿起筆，停在正中間。可是，好像還少了什麼。', ...miss.map(m => '・' + m), '（完成以後，到港口的天文台，可以重新做一次最後的抉擇）']);
  }
  g.flags.結局 = k;
  g.endings = [...new Set([...(g.endings || []), k])];
  save(g);
  await ctx.ui.story(lines(ENDINGS[k].lines));
  await cinema(ENDINGS[k].cine);
  await ctx.ui.story(lines(EPILOGUE));
  await cinema('尾聲');
  credits(k);
}
ctx.lastChoice = lastChoice;

function credits(k) {
  const g = ctx.g;
  const min = Math.max(1, Math.round((Date.now() - g.stats.start) / 60000));
  ctx.audio.music('標題');
  const s = $('screen'); s.innerHTML = ''; s.className = 'result credits';
  s.append(el('div', { class: 't-box' },
    el('h2', {}, '全劇終'),
    el('p', { class: 't-sub' }, ENDINGS[k].title),
    el('ul', { class: 'res' }, ...CREDITS.map(([a, b]) => el('li', {}, a ? el('b', {}, a + '　') : null, ctx.ui.fmt(b)))),
    el('ul', { class: 'res' },
      el('li', {}, `看過的結局：${(g.endings || []).length}/${Object.keys(ENDINGS).length}`),
      el('li', {}, `走了 ${g.stats.steps} 格・戰鬥 ${g.stats.battles} 場・擊退 ${g.stats.kills} 隻`),
      el('li', {}, `委託完成 ${g.jobsDone.length} 個・圖紙 ${g.bps.length}/${Object.keys(EQUIPS).length} 張`),
      el('li', {}, `用時：約 ${min} 分鐘`)),
    el('p', { class: 'muted' }, '回到港口以後，可以繼續玩：接委託、補完測繪、完成心願。到天文台，可以重新做一次最後的抉擇，看看其他的結局，也可以在「小遊戲間」挑遺跡謎題來玩。'),
    el('div', { class: 'col' }, el('button', { class: 'btn primary', onclick: () => ctx.port.show() }, '回到港口'))));
}

function chapterEnd(ch = CHAPTERS[0]) {
  const g = ctx.g;
  const min = Math.max(1, Math.round((Date.now() - g.stats.start) / 60000));
  const stars = ch.isles.reduce((a, id) => { const r = worldOf(g, id); return a + (r.cleared ? 1 : 0) + (r.good ? 1 : 0); }, 0);
  ctx.audio.music('標題');
  const s = $('screen'); s.innerHTML = ''; s.className = 'result';
  s.append(el('div', { class: 't-box' },
    el('h2', {}, ch.title),
    el('div', { class: 'stars' }, '★'.repeat(stars) + '☆'.repeat(Math.max(0, ch.isles.length * 2 - stars))),
    el('ul', { class: 'res' },
      ...ch.isles.map(id => { const r = worldOf(g, id); return el('li', {}, `${id}：測繪 ${r.best}%${r.good ? '・最好的結局' : '（測繪 60% 以上再去一次，會有不一樣的結局）'}`); }),
      el('li', {}, `走了 ${g.stats.steps} 格・戰鬥 ${g.stats.battles} 場・擊退 ${g.stats.kills} 隻`),
      el('li', {}, `委託完成 ${g.jobsDone.length} 個・圖紙 ${g.bps.length}/${Object.keys(EQUIPS).length} 張`),
      el('li', {}, `用時：約 ${min} 分鐘`)),
    el('p', { class: 'muted' }, ch.next),
    el('div', { class: 'col' }, el('button', { class: 'btn primary', onclick: () => ctx.port.show() }, '回到港口'))));
}

// ───────── 選單、隊伍、設定 ─────────
function menu() {
  const api = ctx.ui.sheet('選單', body => {
    body.append(el('div', { class: 'col' },
      el('button', { class: 'btn', onclick: () => { api.close(); ctx.partySheet(); } }, '隊伍與裝備'),
      el('button', { class: 'btn', onclick: () => { api.close(); settingsSheet(); } }, '設定'),
      ctx.g && (ctx.g.heard || []).length ? el('button', { class: 'btn', onclick: () => { api.close(); heardSheet(); } }, '霧裡的低語') : null,
      el('button', { class: 'btn', onclick: () => { api.close(); help(); } }, '怎麼玩'),
      el('button', { class: 'btn', onclick: () => { api.close(); save(ctx.g); title(); } }, '回到標題（會自動存檔）')));
  });
}
ctx.menu = menu;

// 繪圖師之書的最後一頁：聽過的低語
function heardSheet() {
  ctx.ui.alert('霧裡的低語', ['繪圖師之書的最後一頁，記著霧裡聽過的聲音：', ...ctx.g.heard.map(t => '・' + t)], '闔上書');
}

function help() {
  ctx.ui.alert('怎麼玩', [
    '・港口：在「碼頭」買補給，在「海圖」選一座島出航。完成島嶼以後，酒館、鐵匠、船塢會陸續開放。',
    '・島上：點和你相鄰的格子前進。每走一格吃掉 1 份糧。霧裡看不見的格子，走過去才知道是什麼。點燈可以看得更遠，但會用掉燈油。',
    '・糧吃完了會「飢餓」：每走一格全隊掉體力、士氣 −4，戰鬥時攻擊 −20%。標準和困難會掉到倒下，斷糧以後再走 6 格就撐不住，船會被迫開回港口（測繪留著，可是不算返航結局，士氣剩 30，這趟賺的銀貝少一半）。悠閒只會掉到剩 1 點體力。找到糧就解除。',
    '・士氣分四段：高昂（80 以上：爆擊率 +5%、經驗 +10%）、平穩（40 以上）、低落（20 以上：營火只回復 40%）、崩潰（20 以下：再加上戰鬥一開始會有一個人發呆一回合，悠閒不會）。回港口時，士氣至少拉回 40。',
    '・航海事件：出航到登島之間會遇到。會先遇到還沒看過的事件；有些要某個隊友在隊上才會遇到。寫著「成功 %」的選項是碰運氣，士氣越高越容易成功；也可能遇到海上戰鬥、改變登島時的天氣（晴朗多看見一圈、濃霧少一圈但霧眼比較弱、順風前 6 步不吃糧）。每片海還有一段三次航行才看得完的小故事。',
    '・訓練：營地可以選「生火休息」（糧 2，回體力）或「一起訓練」（糧 1，回士氣），只能選一個；每趟出航在甲板上也可以免費訓練一次。表現很好士氣 +15、不錯 +10、失敗也有 +4。',
    '・村子的小店：存貨有限，每樣東西只能買幾份（悠閒最多、困難最少），每次登島會補貨。拿過好結局的島，村子每樣多留 1 份給你們。',
    '・到「測」的格子可以測繪（用 2 份墨水）：沿著海岸線描一遍。描得越準，畫進書裡的範圍越大。測繪過的格子，霧就吞不回去，下次再來也會留著；上次畫得不夠準的測繪點，下次來可以重畫補上。每座島能畫的範圍有上限（測繪點周圍兩圈），畫滿以後測繪點就不會再出現；島上畫面下方會寫出這座島最高能畫到多少，畫滿了狀態列會顯示「測繪滿」。',
    '・目標：找到「霧眼」，打倒守門的東西拿到鑰匙，再打倒島上的首領。之後回到登陸點就能返航；測繪度 60% 以上，結局會不一樣。還沒打倒首領也可以先回港。',
    '・素材：打倒妖物、打開寶箱會得到。帶回港口給鐵匠，照著圖紙打造裝備，再到「隊伍」裡穿上。用不到的素材，可以在「市場」賣掉。',
    '・打造和升級：每條裝備線前兩件可以從頭打，後面的要拿同一條線前面的裝備來升級。用前一件升級只要補原價的五成，前兩件七成，再更早的八成五。打的時候要玩「打鐵」（指針到金色區按「敲」，3 下中 2 下），船塢改造要玩「釘船板」（鐵鎚擺到釘子上按「釘」，4 根中 3 根）。全中會退 1 個素材；失敗可以付一半的銀貝再試一次，兩次都失敗退一半素材。不想玩可以在「設定」關掉，成功率固定八成。',
    '・隊伍：一次最多 4 個人出戰，其他人在船上待命。在「隊伍」裡點「出戰／待命」換人（{名}一定要出戰）。',
    '・委託：在酒館接下（最多 2 個），完成以後回酒館回報，拿報酬。',
    '・船塢：可以修船和改造船。船況會因為航海事件的壞結果、海上戰鬥和靠岸慢慢磨損；低於 50，壞事會更嚴重，低於 20 就不能出航。',
    '・港口突發事件（第二章開始）：回港的時候偶爾會發生一些事，例如流感（一位隊友這一趟不能出戰，可以用醒神香或請醫生治好）、暴風季、罷市、祭典。只影響這一次回港到下一趟出航。',
    '・回港就是新的一天：酒館有新的流言（請酒客喝一杯，聽寶箱的位置或航海事件的訣竅），也可以玩「潮汐骰」；市場的行情會變，偶爾有舶來品；黑市有新貨、「紅帆牌桌」和走私的差事。骰子和牌每次回港能玩的局數有限。',
    '・戰鬥分前後兩排。前排：近身攻擊 +15%，但敵人的近身攻擊只打前排。後排：前排還有人時受傷 −30%，近身攻擊威力減半，法術不受影響。',
    '・技能要花「靈」。防禦會回復一點靈；海靈露可以回復 15 點；營地休息、回港也會回復。',
    '・元素：潮剋焰、焰剋風、風剋石、石剋潮；星與影互剋。遺跡裡的文字，常常藏著首領的弱點。',
    '・焰之群島：發紅的格子是熱地，走上去全隊會掉一點血；礦坑很暗，看得見的範圍比較小；噴氣口每走三步噴一次火，發亮的時候不要踩上去。',
    '・聲望（第三章開始）：商會和紅帆會記得你們幫過誰。勢力委託、島上的選擇都會改變聲望；紅帆的聲望越高，「黑市」賣的東西越好，商會的聲望越高，「市場」收素材的價錢越好。',
    '・北霧海：淡藍色的格子結了冰，走上去會一直往同一個方向滑，滑到冰的盡頭才停（滑行不吃糧）。「聲」是霧裡的低語，可能是線索，也可能是陷阱；聽過的低語記在選單的「霧裡的低語」。「跡」是母親留下的星形記號，每座島一個。',
    '・霧心：白色的格子是「空白」，紙還沒畫到的地方。點它，花 1 份墨水畫成路，才走得過去；空白後面，有時候藏著寶箱，有時候藏著妖物。「圖」是公會長五十年前留下的舊圖碎片，每座島一張。',
    '・心願（第五章開始）：每個隊友都有一個心願，在「隊伍」裡看得到。大部分的心願，要在那個人的島上拿到好結局（測繪度 60% 以上返航）才會完成；沒完成的，可以回去那座島再玩一次。',
    '・霧心的最後一座島：商會、紅帆、守霧人的聲望到「信任」以上，就會來幫忙。打倒公會長以後，是最後的抉擇，有四種結局。「留白」要三方聲望都到「信任」、8 個隊友的心願都完成、全部的島平均畫到最多能畫的九成才選得到。看完結局可以繼續玩，到天文台可以重新選，也可以進「小遊戲間」，挑任何一座島的遺跡謎題來玩（可以選難度，不拿獎勵）。',
    '・守霧人（第四章開始）：聲望到「信任」，出航可以走祕密航道，不會遇到航海事件；到「夥伴」，點燈的時候用的是灰燈：霧不會回來，也聽得出低語是真是假。',
  ], '知道了');
}

ctx.partySheet = () => {
  const g = ctx.g;
  const refresh = () => { save(g); if (g.phase === 'island') ctx.explore.draw(); };
  ctx.ui.sheet('隊伍與裝備', (body, api) => {
    const mt = moraleTier(g.morale);
    body.append(el('p', { class: 'muted' }, `士氣 ${g.morale}・${mt.name}：越高，攻擊越痛、受到的傷害越少。打贏、營地休息、訓練會提高；有人倒下、斷糧會降低。`),
      el('p', { class: 'muted small' }, MORALE_TIERS.map(t => `${t.name}（${t.min}以上）：${t.tip}`).join('　')));
    const out = g.party.filter(x => !x.bench).length, max = ctx.partyMax(), sick = g.party.find(h => h.sick);
    if (g.party.length > PARTY_MAX || sick) body.append(el('p', { class: 'muted' }, `出戰 ${out}/${max} 人。待命的人不會上場，每場戰鬥拿一半的經驗；可以隨時換人。${sick ? `（${sick.key}生病了，這一趟不能出戰）` : ''}`));
    for (const h of g.party) {
      const d = HEROES[h.key], st = heroStats(h), name = ctx.ui.fmt(h.key === '墨里' ? '{名}' : h.key);
      body.append(el('div', { class: 'hero' + (h.bench ? ' bench' : '') },
        el('div', { class: 'h-top' }, el('span', { class: 'face', style: { background: d.color } }, name.slice(0, 1)),
          el('div', {}, el('b', {}, name), el('small', {}, `　${d.job}・Lv${h.lv}・${d.element}屬性`)),
          el('span', { class: 'grow' }),
          h.sick ? el('span', { class: 'chip' }, '生病') : g.party.length > PARTY_MAX && h.key !== '墨里' ? el('button', { class: 'btn small' + (h.bench ? '' : ' on'), disabled: h.bench && out >= max, onclick: () => { h.bench = !h.bench; refresh(); api.rebuild(); } }, h.bench ? '待命' : '出戰') : null,
          h.bench ? null : el('button', { class: 'btn small', onclick: () => { h.row = h.row === 'front' ? 'back' : 'front'; if (g.party.filter(x => !x.bench && x.row === h.row).length > 3) h.row = h.row === 'front' ? 'back' : 'front'; refresh(); api.rebuild(); } }, h.row === 'front' ? '前排' : '後排')),
        el('div', { class: 'h-bars' }, ctx.ui.bar(h.hp, st.hp, 'hp'), el('small', {}, `體 ${h.hp}/${st.hp}`), ctx.ui.bar(h.mp, st.mp, 'mp'), el('small', {}, `靈 ${h.mp}/${st.mp}`), ctx.ui.bar(h.exp, expNeed(h.lv), 'exp'), el('small', {}, `經驗 ${h.exp}/${expNeed(h.lv)}`)),
        el('p', { class: 'small stats' }, `攻 ${st.atk}・防 ${st.def}・法 ${st.mag}・速 ${st.spd}`),
        el('div', { class: 'eq' }, ...SLOTS.map(slot => el('button', { class: 'eq-slot', onclick: () => equipSheet(h, slot, api) },
          el('small', {}, slot), el('b', {}, h.eq[slot] || '—')))),
        el('p', { class: 'muted small' }, ctx.ui.fmt(d.desc)),
        el('p', { class: 'small' }, '技能：' + d.skills.join('、')),
        g.flags.霧心 && WISHES[h.key] ? el('p', { class: 'small wish' + (wishDone(h.key) ? ' done' : '') }, `心願：${WISHES[h.key].text}　` + (wishDone(h.key) ? '✓ 完成了' : WISHES[h.key].isle ? `（在「${WISHES[h.key].isle}」拿到好結局）` : `（${WISHES[h.key].hint || '第五章的最後揭曉'}）`)) : null,
        el('div', { class: 'chips' }, ...['藥草', '海靈露'].map(k => el('button', { class: 'chip btn-chip', disabled: !(g.supply[k] > 0) || h.hp <= 0 || (k === '藥草' ? h.hp >= st.hp : h.mp >= st.mp), onclick: () => {
          g.supply[k]--;
          if (k === '藥草') h.hp = Math.min(st.hp, h.hp + Math.round(st.hp * ITEMS.藥草.heal)); else h.mp = Math.min(st.mp, h.mp + ITEMS.海靈露.mp);
          ctx.audio.sfx('heal'); refresh(); api.rebuild();
        } }, `用${k}（剩 ${g.supply[k] || 0}）`)))));
    }
    body.append(el('p', { class: 'muted small' }, '點「前排／後排」可以調整站位。點裝備欄可以換裝備（在港口的鐵匠打造）。'));
  });
};

// 隊友的心願：那座島拿到好結局就算完成（嘎嘎：打倒公會長的時候在隊上）
function wishDone(key) { const w = WISHES[key]; return !!(w && has(key) && (w.flag ? ctx.g.flags[w.flag] : w.isle && (ctx.g.world[w.isle] || {}).good)); }
ctx.wishDone = wishDone;

// 換裝備：列出手上有、這個人能用的
function equipSheet(h, slot, parent) {
  const g = ctx.g;
  const api = ctx.ui.sheet(`${ctx.ui.fmt(h.key === '墨里' ? '{名}' : h.key)}・${slot}`, body => {
    const cur = h.eq[slot];
    body.append(el('p', { class: 'muted' }, cur ? `現在：${cur}（${statText(EQUIPS[cur].stats)}）` : '現在沒有裝備。'));
    const opts = Object.keys(g.gear).filter(n => g.gear[n] > 0 && EQUIPS[n].slot === slot && (!EQUIPS[n].who || EQUIPS[n].who === h.key));
    if (!opts.length) body.append(el('p', { class: 'para' }, '手上沒有可以換的裝備。到港口的「鐵匠」打造吧。'));
    for (const n of opts) body.append(el('button', { class: 'btn wide', onclick: () => {
      if (cur) g.gear[cur] = (g.gear[cur] || 0) + 1;
      g.gear[n]--; h.eq[slot] = n;
      const s = heroStats(h); h.hp = Math.min(h.hp, s.hp); h.mp = Math.min(h.mp, s.mp);
      ctx.audio.sfx('item'); save(g); api.close(); parent.rebuild(); if (g.phase === 'island') ctx.explore.draw();
    } }, el('b', {}, `${n}　×${g.gear[n]}`), el('small', {}, `${statText(EQUIPS[n].stats)}・${EQUIPS[n].desc}`)));
    if (cur) body.append(el('button', { class: 'btn', onclick: () => { g.gear[cur] = (g.gear[cur] || 0) + 1; delete h.eq[slot]; const s = heroStats(h); h.hp = Math.min(h.hp, s.hp); h.mp = Math.min(h.mp, s.mp); save(g); api.close(); parent.rebuild(); } }, '卸下'));
  });
}

function settingsSheet() {
  const s = ctx.settings;
  ctx.ui.sheet('設定', (body, api) => {
    const row = (label, cur, opts, set) => body.append(el('div', { class: 'set-row' }, el('b', {}, label), el('div', { class: 'chips' }, ...opts.map(([v, l]) => el('button', { class: 'chip btn-chip' + (cur === v ? ' on' : ''), onclick: () => { set(v); ctx.saveSettings(); api.rebuild(); } }, l)))));
    row('音效與音樂', s.sound, [[true, '開'], [false, '關']], v => { s.sound = v; if (v) { ctx.audio.unlock(); ctx.audio.music(ctx.audio.want, true); } else ctx.audio.stop(); });
    row('戰鬥速度', s.speed, [[1, '1×'], [2, '2×'], [3, '3×']], v => { s.speed = v; });
    row('自動戰鬥', s.auto, [[false, '關'], [true, '開']], v => { s.auto = v; });
    row('打造小遊戲', s.forgeGame !== false, [[true, '開'], [false, '關']], v => { s.forgeGame = v; });
    body.append(el('p', { class: 'muted small' }, '關掉以後，鐵匠打造和船塢改造不用玩小遊戲，成功率固定八成。'));
    if (ctx.g) row('難度', ctx.g.diff, ['悠閒', '標準', '困難'].map(k => [k, k]), v => { ctx.g.diff = v; save(ctx.g); });
    if (ctx.g) body.append(el('p', { class: 'muted small' }, DIFF[ctx.g.diff].label));
    const seen = Object.keys(CINEMA).filter(k => (s.seen || []).includes(k));
    body.append(el('div', { class: 'set-row' }, el('b', {}, '回顧劇情'), seen.length
      ? el('div', { class: 'chips' }, ...seen.map(k => el('button', { class: 'chip btn-chip', onclick: () => { api.close(); playCinema(ctx, CINEMA[k]); } }, CINEMA[k].name.split('・')[0])))
      : el('small', { class: 'muted' }, '看過的劇情動畫會出現在這裡')));
  });
}

// ───────── 啟動 ─────────
title();
loadPics();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
