// 《畫海人》：標題 → 序章 → 港口 ⇄（航海 → 島嶼 → 回港）→ 第一章完 → 天文台 → 第二章 → 第二章完
import { HEROES, ITEMS, MATS, EQUIPS, SLOTS, COMMISSIONS, PARTY_MAX } from './data.js';
import { ISLANDS, SEA_EVENTS, INTRO, PORT_SCENES, CHAPTERS, LATE_RECRUIT, OBSERVATORY, CINEMA } from './islands.js';
import { playCinema, loadPics } from './cinema.js';
import { newGame, makeHero, heroStats, expNeed, DIFF, save, load, clearSave, loadSettings, saveSettings } from './state.js';
import { UI, el, $ } from './ui.js';
import { Audio } from './audio.js';
import { Battle } from './battle.js';
import { Explore, newIsland, worldOf } from './explore.js';
import { Port, statText } from './port.js';

export const VERSION = 'M3 第二海域 v0.1';

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

// 新隊友加入：等級跟大家差不多，帶著自己的武器；出戰滿 4 人的話，先在船上待命
ctx.recruit = async key => {
  const g = ctx.g;
  if (g.party.some(h => h.key === key)) return;
  const lv = Math.max(1, Math.round(g.party.reduce((a, h) => a + h.lv, 0) / g.party.length));
  const h = makeHero(key, g.party.length, lv);
  const w = HEROES[key].weapon || (key === '小鈴' ? '貝殼琴' : null);
  if (w && EQUIPS[w]) { h.eq.武器 = w; if (!g.bps.includes(w)) g.bps.push(w); }
  const s = heroStats(h); h.hp = s.hp; h.mp = s.mp;
  if (g.party.filter(x => !x.bench).length >= PARTY_MAX) h.bench = true;
  g.party.push(h);
  save(g);
  if (h.bench) await ctx.ui.alert('隊伍', [`出戰的人已經有 ${PARTY_MAX} 個了，${key}先在船上待命。`, '打開「隊伍」，點「出戰／待命」就可以換人。']);
};

// ───────── 共用：效果、素材、圖紙、委託 ─────────
// 效果：糧、燈油、墨水、藥草…（數量）；素材（數量）；銀貝；hp（全隊比例）；士氣
ctx.applyFx = fx => {
  const g = ctx.g;
  for (const [k, v] of Object.entries(fx || {})) {
    if (k === '銀貝') g.silver = Math.max(0, g.silver + v);
    else if (k === '士氣') g.morale = Math.max(0, Math.min(100, g.morale + v));
    else if (k === 'hp') for (const h of g.party) { const st = heroStats(h); if (h.hp > 0) h.hp = Math.max(1, Math.min(st.hp, h.hp + Math.round(st.hp * v))); }
    else if (MATS[k]) { if (v > 0) ctx.gainMat(k, v); else g.mats[k] = Math.max(0, (g.mats[k] || 0) + v); }
    else g.supply[k] = Math.max(0, (g.supply[k] || 0) + v);
  }
};
ctx.fxText = fx => {
  const parts = Object.entries(fx || {}).map(([k, v]) => k === 'hp' ? `全隊體力 ${v > 0 ? '+' : ''}${Math.round(v * 100)}%` : `${k} ${v > 0 ? '+' : ''}${v}`);
  return parts.length ? `（${parts.join('　')}）` : '';
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
ctx.onKill = key => {
  const g = ctx.g;
  for (const id in g.jobs) { const c = COMMISSIONS.find(x => x.id === id); if (c && c.kind === 'kill' && c.target === key) g.jobs[id]++; }
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
  const pool = SEA_EVENTS.filter(e => (e.sea || '淺灘') === def.sea).sort(() => Math.random() - 0.5).slice(0, def.seaEvents);
  for (const ev of pool) {
    const i = await ctx.ui.choose(`航海・${ev.title}`, ev.text, ev.opts.map(o => ({ label: o.label, disabled: !ctx.explore.canPay(o.fx) })));
    const o = ev.opts[i];
    // 補好的船帆：壞事減半
    const fx = { ...o.fx };
    if (g.ship.船帆) for (const k in fx) if (fx[k] < 0 && !o.label.includes(`${k} `) && !o.label.includes(`（${k}`)) fx[k] = k === 'hp' ? fx[k] / 2 : Math.ceil(fx[k] / 2);
    ctx.applyFx(fx);
    await ctx.ui.alert(ev.title, [o.line, ctx.fxText(fx), g.ship.船帆 && JSON.stringify(fx) !== JSON.stringify(o.fx) ? '（補好的船帆，讓損失少了一半）' : ''].filter(Boolean));
  }
  await ctx.ui.story(lines(def.arrive));
  g.island = newIsland(g, id);
  g.phase = 'island';
  save(g);
  ctx.explore.show();
};

// ───────── 回港 ─────────
ctx.backToPort = async rep => {
  const g = ctx.g, def = ISLANDS[rep.island];
  g.phase = 'port'; g.island = null;
  // 回到家：全隊休息
  for (const h of g.party) { const s = heroStats(h); h.hp = s.hp; h.mp = s.mp; }
  g.morale = Math.max(g.morale, 50);
  save(g);
  ctx.audio.music('港口');
  const t = g.trip || { mats: {}, silver: g.silver, bps: [] };
  const mats = Object.entries(t.mats).map(([k, n]) => `${k} ${n}`).join('、');
  const ready = Object.keys(g.jobs).filter(id => ctx.port.jobState(COMMISSIONS.find(c => c.id === id)).ready).length;
  await ctx.ui.alert(rep.ending ? def.endings[rep.ending].title : `回到鹽灣島`, [
    `${rep.island}的測繪度：${rep.pct}%（最好 ${worldOf(g, rep.island).best}%）`,
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
    return chapterEnd(ch);
  }
  save(g);
  ctx.port.show();
};

// 天文台：第一次去，播第二章的開場，海圖多一頁
ctx.observatory = async () => {
  const g = ctx.g;
  if (!g.flags.環礁) {
    await cinema('第二章');
    await ctx.ui.story(lines(OBSERVATORY));
    g.flags.環礁 = 1; save(g);
  } else {
    await ctx.ui.alert('天文台', ['老人在擦望遠鏡。', '「往霧心的路，還很長。」他說，「先把環礁的每一座島，都好好畫進書裡吧。」'], '回到港口');
  }
  ctx.port.show();
};

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
      el('button', { class: 'btn', onclick: () => { api.close(); help(); } }, '怎麼玩'),
      el('button', { class: 'btn', onclick: () => { api.close(); save(ctx.g); title(); } }, '回到標題（會自動存檔）')));
  });
}
ctx.menu = menu;

function help() {
  ctx.ui.alert('怎麼玩', [
    '・港口：在「碼頭」買補給，在「海圖」選一座島出航。完成島嶼以後，酒館、鐵匠、船塢會陸續開放。',
    '・島上：點和你相鄰的格子前進。每走一格吃掉 1 份糧。霧裡看不見的格子，走過去才知道是什麼。點燈可以看得更遠，但會用掉燈油。',
    '・到「測」的格子可以測繪（用 2 份墨水）：沿著海岸線描一遍。描得越準，畫進書裡的範圍越大。測繪過的格子，霧就吞不回去，下次再來也會留著；上次畫得不夠準的測繪點，下次來可以重畫補上。',
    '・目標：找到「霧眼」，打倒守門的東西拿到鑰匙，再打倒島上的首領。之後回到登陸點就能返航；測繪度 60% 以上，結局會不一樣。還沒打倒首領也可以先回港。',
    '・素材：打倒妖物、打開寶箱會得到。帶回港口給鐵匠，照著圖紙打造裝備，再到「隊伍」裡穿上。用不到的素材，可以在「市場」賣掉。',
    '・隊伍：一次最多 4 個人出戰，其他人在船上待命。在「隊伍」裡點「出戰／待命」換人（{名}一定要出戰）。',
    '・委託：在酒館接下（最多 2 個），完成以後回酒館回報，拿報酬。',
    '・戰鬥分前後兩排。前排：近身攻擊 +15%，但敵人的近身攻擊只打前排。後排：前排還有人時受傷 −30%，近身攻擊威力減半，法術不受影響。',
    '・技能要花「靈」。防禦會回復一點靈；海靈露可以回復 15 點；營地休息、回港也會回復。',
    '・元素：潮剋焰、焰剋風、風剋石、石剋潮；星與影互剋。遺跡裡的文字，常常藏著首領的弱點。',
  ], '知道了');
}

ctx.partySheet = () => {
  const g = ctx.g;
  const refresh = () => { save(g); if (g.phase === 'island') ctx.explore.draw(); };
  ctx.ui.sheet('隊伍與裝備', (body, api) => {
    body.append(el('p', { class: 'muted' }, `士氣 ${g.morale}：越高，攻擊越痛、受到的傷害越少。打贏、在營地休息會提高；有人倒下、斷糧會降低。`));
    const out = g.party.filter(x => !x.bench).length;
    if (g.party.length > PARTY_MAX) body.append(el('p', { class: 'muted' }, `出戰 ${out}/${PARTY_MAX} 人。待命的人不會上場，也拿不到經驗；可以隨時換人。`));
    for (const h of g.party) {
      const d = HEROES[h.key], st = heroStats(h), name = ctx.ui.fmt(h.key === '墨里' ? '{名}' : h.key);
      body.append(el('div', { class: 'hero' + (h.bench ? ' bench' : '') },
        el('div', { class: 'h-top' }, el('span', { class: 'face', style: { background: d.color } }, name.slice(0, 1)),
          el('div', {}, el('b', {}, name), el('small', {}, `　${d.job}・Lv${h.lv}・${d.element}屬性`)),
          el('span', { class: 'grow' }),
          g.party.length > PARTY_MAX && h.key !== '墨里' ? el('button', { class: 'btn small' + (h.bench ? '' : ' on'), disabled: h.bench && out >= PARTY_MAX, onclick: () => { h.bench = !h.bench; refresh(); api.rebuild(); } }, h.bench ? '待命' : '出戰') : null,
          h.bench ? null : el('button', { class: 'btn small', onclick: () => { h.row = h.row === 'front' ? 'back' : 'front'; if (g.party.filter(x => !x.bench && x.row === h.row).length > 3) h.row = h.row === 'front' ? 'back' : 'front'; refresh(); api.rebuild(); } }, h.row === 'front' ? '前排' : '後排')),
        el('div', { class: 'h-bars' }, ctx.ui.bar(h.hp, st.hp, 'hp'), el('small', {}, `體 ${h.hp}/${st.hp}`), ctx.ui.bar(h.mp, st.mp, 'mp'), el('small', {}, `靈 ${h.mp}/${st.mp}`), ctx.ui.bar(h.exp, expNeed(h.lv), 'exp'), el('small', {}, `經驗 ${h.exp}/${expNeed(h.lv)}`)),
        el('p', { class: 'small stats' }, `攻 ${st.atk}・防 ${st.def}・法 ${st.mag}・速 ${st.spd}`),
        el('div', { class: 'eq' }, ...SLOTS.map(slot => el('button', { class: 'eq-slot', onclick: () => equipSheet(h, slot, api) },
          el('small', {}, slot), el('b', {}, h.eq[slot] || '—')))),
        el('p', { class: 'muted small' }, ctx.ui.fmt(d.desc)),
        el('p', { class: 'small' }, '技能：' + d.skills.join('、')),
        el('div', { class: 'chips' }, ...['藥草', '海靈露'].map(k => el('button', { class: 'chip btn-chip', disabled: !(g.supply[k] > 0) || h.hp <= 0 || (k === '藥草' ? h.hp >= st.hp : h.mp >= st.mp), onclick: () => {
          g.supply[k]--;
          if (k === '藥草') h.hp = Math.min(st.hp, h.hp + Math.round(st.hp * ITEMS.藥草.heal)); else h.mp = Math.min(st.mp, h.mp + ITEMS.海靈露.mp);
          ctx.audio.sfx('heal'); refresh(); api.rebuild();
        } }, `用${k}（剩 ${g.supply[k] || 0}）`)))));
    }
    body.append(el('p', { class: 'muted small' }, '點「前排／後排」可以調整站位。點裝備欄可以換裝備（在港口的鐵匠打造）。'));
  });
};

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
