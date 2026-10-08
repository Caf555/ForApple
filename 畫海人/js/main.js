// 《畫海人》M1 雛形：標題 → 序章 → 港口 → 航海 → 低語礁 → 結算
import { INTRO, SEA_EVENTS, HEROES, ITEMS } from './data.js';
import { newGame, heroStats, expNeed, cargoUsed, DIFF, save, load, clearSave, loadSettings, saveSettings } from './state.js';
import { UI, el, $ } from './ui.js';
import { Audio } from './audio.js';
import { Battle } from './battle.js';
import { Explore, newIsland, surveyPct } from './explore.js';

export const VERSION = 'M1 雛形 v0.4';

const ctx = { g: null, settings: loadSettings() };
ctx.saveSettings = () => saveSettings(ctx.settings);
ctx.ui = new UI(ctx);
ctx.audio = new Audio(ctx);
ctx.battle = new Battle(ctx);
ctx.explore = new Explore(ctx);
window.__hhr = ctx; // 方便測試

document.addEventListener('pointerdown', () => ctx.audio.unlock(), { once: false });

const PRICES = { 糧: 2, 燈油: 6, 墨水: 5, 藥草: 8, 海靈露: 7, 醒神香: 20 };
const SUPPLY_TIP = { 糧: '每走一格吃 1 份。吃光了會又餓又累。', 燈油: '點燈時每走一格用 1 份：看得更遠，霧中不會打偏。', 墨水: '測繪要用 2 份。測繪過的地方，霧吞不回去。', 藥草: ITEMS.藥草.desc, 海靈露: ITEMS.海靈露.desc, 醒神香: ITEMS.醒神香.desc };

// 效果：糧、燈油、墨水、銀貝、藥草、醒神香（數量）；hp（全隊比例）；士氣
ctx.applyFx = fx => {
  const g = ctx.g;
  for (const [k, v] of Object.entries(fx || {})) {
    if (k === '銀貝') g.silver = Math.max(0, g.silver + v);
    else if (k === '士氣') g.morale = Math.max(0, Math.min(100, g.morale + v));
    else if (k === 'hp') for (const h of g.party) { const st = heroStats(h); if (h.hp > 0) h.hp = Math.max(1, Math.min(st.hp, h.hp + Math.round(st.hp * v))); }
    else g.supply[k] = Math.max(0, (g.supply[k] || 0) + v);
  }
};
ctx.fxText = fx => {
  const parts = Object.entries(fx || {}).map(([k, v]) => k === 'hp' ? `全隊體力 ${v > 0 ? '+' : ''}${Math.round(v * 100)}%` : `${k} ${v > 0 ? '+' : ''}${v}`);
  return parts.length ? `（${parts.join('　')}）` : '';
};

// ───────── 標題 ─────────
function title() {
  ctx.audio.music('標題');
  const s = $('screen'); s.innerHTML = ''; s.className = 'title';
  const saved = load();
  s.append(el('div', { class: 't-box' },
    el('h1', {}, '畫海人'),
    el('p', { class: 't-sub' }, '只有被畫進地圖的地方，才不會被霧忘記。'),
    el('div', { class: 'col' },
      saved && saved.phase !== 'done' ? el('button', { class: 'btn primary', onclick: () => resume(saved) }, '繼續航行') : null,
      el('button', { class: 'btn' + (saved && saved.phase !== 'done' ? '' : ' primary'), onclick: () => pickDiff() }, '新的航行'),
      el('button', { class: 'btn', onclick: () => settingsSheet() }, '設定')),
    el('p', { class: 't-ver' }, VERSION + '　這是試玩用的雛形：美術先用色塊和文字代替')));
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
  const picks = await ctx.ui.story(INTRO);
  ctx.g.attitude = picks[0];
  if (picks[0] === '大膽') ctx.g.morale += 8; else ctx.g.supply.燈油 += 2;
  ctx.g.phase = 'port';
  save(ctx.g);
  port();
}

function resume(g) {
  ctx.g = g;
  if (g.phase === 'port') port();
  else if (g.phase === 'island') ctx.explore.show();
  else title();
}

// ───────── 港口：買補給 ─────────
function port() {
  const g = ctx.g;
  ctx.audio.music('港口');
  const s = $('screen'); s.className = 'port';
  const draw = () => {
    s.innerHTML = '';
    const used = cargoUsed(g);
    s.append(el('div', { class: 'p-head' }, el('h2', {}, '鹽灣島・碼頭'), el('span', { class: 'grow' }), el('button', { class: 'icon', 'aria-label': '選單', onclick: () => menu() }, '☰')),
      el('p', { class: 'muted' }, '出航以前，用銀貝買補給。船的貨艙有上限。低語礁大約有 25 格，走完一輪大概要 20～30 份糧食。'),
      el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), el('span', {}, `貨艙 ${used} / ${g.cargo}`), ctx.ui.bar(used, g.cargo, 'cargo')));
    for (const k of Object.keys(PRICES)) {
      s.append(el('div', { class: 'shop-row big' },
        el('div', {}, el('b', {}, `${k}　×${g.supply[k] || 0}`), el('small', {}, SUPPLY_TIP[k])),
        el('div', { class: 'qty' },
          el('button', { class: 'btn small', disabled: !(g.supply[k] > 0), onclick: () => { g.supply[k]--; g.silver += PRICES[k]; draw(); } }, '−'),
          el('span', {}, `${PRICES[k]} 銀貝`),
          el('button', { class: 'btn small', disabled: g.silver < PRICES[k] || used >= g.cargo, onclick: () => { g.supply[k] = (g.supply[k] || 0) + 1; g.silver -= PRICES[k]; ctx.audio.sfx('tap'); draw(); } }, '＋'))));
    }
    s.append(el('div', { class: 'btns' }, el('button', { class: 'btn primary', onclick: () => sail() }, '出航：前往低語礁')));
  };
  draw();
}

async function sail() {
  const g = ctx.g;
  if (g.supply.糧 < 10 && !(await new Promise(r => { const api = ctx.ui.sheet('確認', b => { b.append(el('p', { class: 'para' }, `糧食只有 ${g.supply.糧} 份，可能撐不完整座島。還是要出航嗎？`), el('div', { class: 'btns' }, el('button', { class: 'btn', onclick: () => { api.close(); r(false); } }, '再買一些'), el('button', { class: 'btn primary', onclick: () => { api.close(); r(true); } }, '出航'))); }, { noClose: true }); }))) return;
  ctx.audio.music('港口');
  const ev = SEA_EVENTS[Math.floor(Math.random() * SEA_EVENTS.length)];
  const i = await ctx.ui.choose(`航海・${ev.title}`, ev.text, ev.opts.map(o => ({ label: o.label, disabled: o.fx.燈油 < 0 && g.supply.燈油 < -o.fx.燈油 })));
  const o = ev.opts[i];
  ctx.applyFx(o.fx);
  await ctx.ui.alert(ev.title, [o.line, ctx.fxText(o.fx)].filter(Boolean));
  await ctx.ui.story([{ bg: 'fog', text: '霧散開了一點。眼前是一座黑色的礁島，島的另一頭，有一座燈塔。' }, { text: '燈，一明一滅。像是在叫誰回來。' }, { who: '蓮笙', text: '……霧在說話。它說，這座島，已經忘記自己五十年了。' }]);
  g.island = newIsland();
  g.phase = 'island';
  save(g);
  ctx.explore.show();
}

// ───────── 結算 ─────────
ctx.result = good => {
  const g = ctx.g, isl = g.island;
  g.phase = 'done';
  save(g);
  const min = Math.max(1, Math.round((Date.now() - g.stats.start) / 60000));
  const pct = surveyPct(isl);
  const stars = 1 + (good ? 1 : 0) + (pct >= 80 ? 1 : 0);
  ctx.audio.music('標題');
  const s = $('screen'); s.innerHTML = ''; s.className = 'result';
  s.append(el('div', { class: 't-box' },
    el('h2', {}, good ? '低語礁・燈守想起了名字' : '低語礁・燈還亮著'),
    el('div', { class: 'stars' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
    el('ul', { class: 'res' },
      el('li', {}, `測繪度：${pct}%` + (good ? '' : '（60% 以上會有不一樣的結局）')),
      el('li', {}, `走了 ${g.stats.steps} 格・戰鬥 ${g.stats.battles} 場・擊退 ${g.stats.kills} 隻`),
      el('li', {}, `用時：約 ${min} 分鐘`),
      el('li', {}, `剩下的補給：糧 ${g.supply.糧}・燈油 ${g.supply.燈油}・墨水 ${g.supply.墨水}・銀貝 ${g.silver}`)),
    el('p', { class: 'muted' }, '這是《畫海人》的第一座島。每次重新出航，島上的配置都會不一樣。'),
    el('div', { class: 'col' },
      el('button', { class: 'btn primary', onclick: () => start(g.diff) }, '再航行一次'),
      el('button', { class: 'btn', onclick: () => { clearSave(); title(); } }, '回到標題'))));
};

// ───────── 選單、隊伍、設定 ─────────
function menu() {
  const api = ctx.ui.sheet('選單', body => {
    body.append(el('div', { class: 'col' },
      el('button', { class: 'btn', onclick: () => { api.close(); ctx.partySheet(); } }, '隊伍'),
      el('button', { class: 'btn', onclick: () => { api.close(); settingsSheet(); } }, '設定'),
      el('button', { class: 'btn', onclick: () => { api.close(); help(); } }, '怎麼玩'),
      el('button', { class: 'btn', onclick: () => { api.close(); save(ctx.g); title(); } }, '回到標題（會自動存檔）')));
  });
}
ctx.menu = menu;

function help() {
  ctx.ui.alert('怎麼玩', [
    '・點地圖上和你相鄰的格子前進。每走一格吃掉 1 份糧。',
    '・霧裡看不見的格子，走過去才知道是什麼。點燈可以看得更遠，但會用掉燈油。',
    '・到「測」的格子可以測繪（用 2 份墨水）：沿著海岸線描一遍。測繪過的格子，霧就吞不回去；走太久，沒測繪的地方會被霧吞回去。',
    '・目標：找到「霧眼」，打倒守門的東西拿到燈塔的鑰匙，再打倒燈塔裡的燈守。之後可以繼續探索，回到登陸點就能返航。',
    '・戰鬥分前後兩排。前排：近身攻擊 +15%，但敵人的近身攻擊只打前排。後排：前排還有人時受傷 −30%，近身攻擊威力減半，法術不受影響。',
    '・技能要花「靈」。防禦會回復一點靈；海靈露可以回復 15 點；營地休息也會回復。',
    '・元素：潮剋焰、焰剋風、風剋石、石剋潮；星與影互剋。',
    '・燈塔裡是這座島的首領。測繪度越高，結局會不一樣。',
  ], '知道了');
}

ctx.partySheet = () => {
  const g = ctx.g;
  ctx.ui.sheet('隊伍', (body, api) => {
    body.append(el('p', { class: 'muted' }, `士氣 ${g.morale}：越高，攻擊越痛、受到的傷害越少。打贏、在營地休息會提高；有人倒下、斷糧會降低。`));
    for (const h of g.party) {
      const d = HEROES[h.key], st = heroStats(h);
      body.append(el('div', { class: 'hero' },
        el('div', { class: 'h-top' }, el('span', { class: 'face', style: { background: d.color } }, ctx.ui.fmt(h.key === '墨里' ? '{名}' : h.key).slice(0, 1)),
          el('div', {}, el('b', {}, ctx.ui.fmt(h.key === '墨里' ? '{名}' : h.key)), el('small', {}, `　${d.job}・Lv${h.lv}・${d.element}屬性`)),
          el('span', { class: 'grow' }),
          el('button', { class: 'btn small', onclick: () => { h.row = h.row === 'front' ? 'back' : 'front'; if (g.party.filter(x => x.row === h.row).length > 3) h.row = h.row === 'front' ? 'back' : 'front'; save(g); api.rebuild(); } }, h.row === 'front' ? '前排' : '後排')),
        el('div', { class: 'h-bars' }, ctx.ui.bar(h.hp, st.hp, 'hp'), el('small', {}, `體 ${h.hp}/${st.hp}`), ctx.ui.bar(h.mp, st.mp, 'mp'), el('small', {}, `靈 ${h.mp}/${st.mp}`), ctx.ui.bar(h.exp, expNeed(h.lv), 'exp'), el('small', {}, `經驗 ${h.exp}/${expNeed(h.lv)}`)),
        el('p', { class: 'muted small' }, ctx.ui.fmt(d.desc)),
        el('p', { class: 'small' }, '技能：' + d.skills.join('、')),
        el('div', { class: 'chips' }, ...['藥草', '海靈露'].map(k => el('button', { class: 'chip btn-chip', disabled: !(g.supply[k] > 0) || h.hp <= 0 || (k === '藥草' ? h.hp >= st.hp : h.mp >= st.mp), onclick: () => {
          g.supply[k]--;
          if (k === '藥草') h.hp = Math.min(st.hp, h.hp + Math.round(st.hp * ITEMS.藥草.heal)); else h.mp = Math.min(st.mp, h.mp + ITEMS.海靈露.mp);
          ctx.audio.sfx('heal'); save(g); api.rebuild(); if (g.phase === 'island') ctx.explore.draw();
        } }, `用${k}（剩 ${g.supply[k] || 0}）`)))));
    }
    body.append(el('p', { class: 'muted small' }, '點「前排／後排」可以調整站位。前排近身 +15%、會被近身攻擊；後排受傷 −30%、近身攻擊減半。'));
  });
};

function settingsSheet() {
  const s = ctx.settings;
  ctx.ui.sheet('設定', (body, api) => {
    const row = (label, cur, opts, set) => body.append(el('div', { class: 'set-row' }, el('b', {}, label), el('div', { class: 'chips' }, ...opts.map(([v, l]) => el('button', { class: 'chip btn-chip' + (cur === v ? ' on' : ''), onclick: () => { set(v); ctx.saveSettings(); api.rebuild(); } }, l)))));
    row('音效與音樂', s.sound, [[true, '開'], [false, '關']], v => { s.sound = v; if (v) { ctx.audio.unlock(); ctx.audio.music(ctx.audio.want, true); } else ctx.audio.stop(); });
    row('戰鬥速度', s.speed, [[1, '1×'], [2, '2×'], [3, '3×']], v => { s.speed = v; });
    row('自動戰鬥', s.auto, [[false, '關'], [true, '開']], v => { s.auto = v; });
    if (ctx.g) row('難度', ctx.g.diff, ['悠閒', '標準', '困難'].map(k => [k, k]), v => { ctx.g.diff = v; save(ctx.g); });
    if (ctx.g) body.append(el('p', { class: 'muted small' }, DIFF[ctx.g.diff].label));
  });
}

// ───────── 啟動 ─────────
title();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
