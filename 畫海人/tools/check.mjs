// 《畫海人》資料檢查：改了 js/data.js 或 js/islands.js 以後，執行 node 畫海人/tools/check.mjs
import { HEROES, SKILLS, ENEMIES, ITEMS, MATS, EQUIPS, SLOTS, STAT_NAME, SHIP, COMMISSIONS, ELEMENTS, FACTIONS, REP_LEVELS, BLACK_MARKET, BLACK_POOL, IMPORTS, WISHES, PORT_EVENTS } from '../js/data.js';
import { ISLANDS, TILE_INFO, SEA_EVENTS, PORT_SCENES, CHAPTER_END, CHAPTER2_END, CHAPTER3_END, CHAPTER4_END, CHAPTERS, LATE_RECRUIT, OBSERVATORY, OBSERVATORY3, OBSERVATORY4, OBSERVATORY5, INTRO, CINEMA, SEAS, ISLAND_ORDER, FINALE_ASK, ENDINGS, EPILOGUE } from '../js/islands.js';
import { PUZZLES } from '../js/puzzle.js';
import { DIFF } from '../js/state.js';
import { TRAININGS } from '../js/training.js';
import { ART_KEYS } from '../js/cinema.js';
import { readFileSync } from 'node:fs';

const errs = [];
const bad = m => errs.push(m);
const FX_OK = k => k === 'hp' || k === '士氣' || k === '銀貝' || ITEMS[k] || MATS[k] || FACTIONS.includes(k) || ['糧', '燈油', '墨水'].includes(k);

for (const [k, h] of Object.entries(HEROES)) {
  if (!ELEMENTS.includes(h.element)) bad(`角色 ${k} 的屬性「${h.element}」不存在`);
  for (const s of h.skills) if (!SKILLS[s]) bad(`角色 ${k} 的技能「${s}」不存在`);
}
for (const [k, s] of Object.entries(SKILLS)) if (s.element && !ELEMENTS.includes(s.element)) bad(`技能 ${k} 的屬性不存在`);
for (const [k, e] of Object.entries(ENEMIES)) {
  if (!ELEMENTS.includes(e.element)) bad(`敵人 ${k} 的屬性不存在`);
  for (const [s] of e.skills) if (!SKILLS[s]) bad(`敵人 ${k} 的招式「${s}」不存在`);
  if (e.big && !SKILLS[e.big]) bad(`敵人 ${k} 的大招「${e.big}」不存在`);
  if (e.rank === '首領' && (!e.big || !e.phase2)) bad(`首領 ${k} 缺少大招或第二階段`);
  for (const ph of [e.phase2, e.phase3].filter(Boolean)) { if (ph.element && !ELEMENTS.includes(ph.element)) bad(`首領 ${k} 變身後的屬性不存在`); for (const [s] of ph.skills || []) if (!SKILLS[s]) bad(`首領 ${k} 變身後的招式「${s}」不存在`); if (ph.big && !SKILLS[ph.big]) bad(`首領 ${k} 變身後的大招「${ph.big}」不存在`); }
  if (e.phase3 && !e.phase2) bad(`首領 ${k} 有第三階段卻沒有第二階段`);
  for (const [m] of e.drop || []) if (!MATS[m]) bad(`敵人 ${k} 掉落的素材「${m}」不存在`);
}
for (const [k, e] of Object.entries(EQUIPS)) {
  if (!SLOTS.includes(e.slot)) bad(`裝備 ${k} 的欄位「${e.slot}」不存在`);
  if (e.who && !HEROES[e.who]) bad(`裝備 ${k} 的使用者「${e.who}」不存在`);
  for (const s in e.stats) if (!STAT_NAME[s]) bad(`裝備 ${k} 的數值「${s}」不存在`);
  for (const m in e.cost) if (m !== '銀貝' && !MATS[m]) bad(`裝備 ${k} 需要的素材「${m}」不存在`);
}
for (const [k, d] of Object.entries(SHIP)) for (const l of d.levels) for (const m in l.cost) if (m !== '銀貝' && !MATS[m]) bad(`船塢 ${k} 需要的素材「${m}」不存在`);
// 船塢的改造：要到的章節只能是「焰」或「北」（船塢畫面認得的），而且後一級不能比前一級早開放
const YARD_FLAGS = ['焰', '北'];
for (const [k, d] of Object.entries(SHIP)) d.levels.forEach((l, i) => {
  if (l.flag && !YARD_FLAGS.includes(l.flag)) bad(`船塢 ${k}「${l.label}」：章節旗標「${l.flag}」船塢畫面不認得`);
  const prev = d.levels.slice(0, i).map(x => YARD_FLAGS.indexOf(x.flag)).reduce((a, b) => Math.max(a, b), -1);
  if (YARD_FLAGS.indexOf(l.flag) < prev) bad(`船塢 ${k}「${l.label}」比前一級還早開放`);
});
// 港口突發事件：都要有標題和說明（老客人的說明是當場寫的）
for (const [k, e] of Object.entries(PORT_EVENTS)) if (!e.title || (!e.text && k !== '老客人')) bad(`港口突發事件「${k}」缺少標題或說明`);

// 每張圖紙都要拿得到：一開始就會、島上的寶箱或首領、委託報酬
const bpFrom = new Set(Object.keys(EQUIPS).filter(k => EQUIPS[k].start));
for (const h of Object.values(HEROES)) if (h.weapon) { if (!EQUIPS[h.weapon]) bad(`隊友自己的武器「${h.weapon}」不存在`); bpFrom.add(h.weapon); }
for (const d of Object.values(ISLANDS)) { for (const b of d.bps) bpFrom.add(b); if (d.boss.bp) { if (!EQUIPS[d.boss.bp]) bad(`首領一定給的圖紙「${d.boss.bp}」不存在`); bpFrom.add(d.boss.bp); } }
for (const c of COMMISSIONS) if (c.reward.圖紙) bpFrom.add(c.reward.圖紙);
for (const it of BLACK_MARKET) if (it.kind === 'bp') { if (!EQUIPS[it.bp]) bad(`黑市的圖紙「${it.bp}」不存在`); bpFrom.add(it.bp); }
for (const it of BLACK_MARKET) {
  if (it.kind === 'mat' && !MATS[it.name]) bad(`黑市的素材「${it.name}」不存在`);
  if (it.kind === 'supply' && !ITEMS[it.name]) bad(`黑市的道具「${it.name}」不存在`);
  if (!(it.need >= 0 && it.need < REP_LEVELS.length)) bad(`黑市「${it.name}」需要的聲望等級不對`);
}
// 黑市的換貨、市場的舶來品：東西要存在，要到的章節要有這個旗標
const CH_FLAGS = ['第一章', '第二章', '第三章', '第四章', '環礁', '焰', '北', '霧心'];
for (const [where, list] of [['黑市的換貨', BLACK_POOL], ['市場的舶來品', IMPORTS]]) for (const it of list) {
  if (it.kind === 'bp') { if (!EQUIPS[it.bp]) bad(`${where}的圖紙「${it.bp}」不存在`); bpFrom.add(it.bp); }
  else if (it.kind === 'find') { if (!(ISLANDS[it.find] || {}).hidden) bad(`${where}的「${it.name}」要找的「${it.find}」不是隱藏島`); }
  else if (it.kind === 'mat' ? !MATS[it.name] : !ITEMS[it.name] && !['糧', '燈油', '墨水'].includes(it.name)) bad(`${where}的「${it.name}」不存在`);
  if (it.flag && !CH_FLAGS.includes(it.flag)) bad(`${where}的「${it.name}」：章節旗標「${it.flag}」不認得`);
  if (!(it.price > 0)) bad(`${where}的「${it.name}」沒有價錢`);
}
// 隱藏島：每座都要有一個找到的方法（酒館的線索、市場的日誌、黑市的藏寶圖、船塢的改造），找到的時候要有話說
const FIND_BY = { 醉鯨礁: '酒館', 紅帆藏寶島: '黑市' };
for (const it of IMPORTS) if (it.kind === 'find') FIND_BY[it.find] = '市場';
for (const d of Object.values(SHIP)) for (const l of d.levels) if (l.find) { if (!(ISLANDS[l.find] || {}).hidden) bad(`船塢「${l.label}」要找的「${l.find}」不是隱藏島`); FIND_BY[l.find] = '船塢'; }
if (BLACK_MARKET.filter(it => it.kind === 'map').map(it => it.n).sort().join() !== '1,2,3') bad('黑市的藏寶圖碎片要剛好 1、2、3 三片');
for (const [id, d] of Object.entries(ISLANDS)) if (d.hidden) {
  if (!FIND_BY[id]) bad(`隱藏島「${id}」沒有找到的方法`);
  if (d.flag !== '隱:' + id) bad(`隱藏島「${id}」的 flag 要寫成「隱:${id}」`);
  if (!(d.found || []).length) bad(`隱藏島「${id}」缺少找到時的文字`);
  for (const k in d.boss.gift || {}) if (!FX_OK(k)) bad(`隱藏島「${id}」首領給的「${k}」不認得`);
  if (ISLAND_ORDER.find(k => ISLANDS[k].sea === d.sea) === id) bad(`隱藏島「${id}」不能是${d.sea}的第一座島（海圖的海域標題會跟著不見）`);
}
for (const k of Object.keys(EQUIPS)) if (!bpFrom.has(k)) bad(`裝備 ${k} 的圖紙沒有地方拿得到`);
// 每種素材都要找得到
const matFrom = new Set();
for (const e of Object.values(ENEMIES)) for (const [m] of e.drop || []) matFrom.add(m);
for (const d of Object.values(ISLANDS)) for (const m of d.mats) matFrom.add(m);
for (const m of Object.keys(MATS)) if (!matFrom.has(m)) bad(`素材 ${m} 沒有地方拿得到`);

const ids = new Set();
// 一般戰鬥會出現的敵人：跟 explore.js 一樣，依離登陸點的距離挑遇敵表的一段（登陸點可能有好幾個）
function hexDist(a, b) { const cube = (c, r) => { const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; }; const p = cube(...a), q = cube(...b); return Math.max(...p.map((v, i) => Math.abs(v - q[i]))); }
function reachableFoes(d) {
  const E = d.encounters, out = new Set();
  const starts = [d.start, ...Object.values((d.routes || {}).opts || {}).map(o => o.start).filter(Boolean)];
  for (const st of starts) for (let r = 0; r < d.rows; r++) for (let c = 0; c < d.cols; c++) {
    if ((c === st[0] && r === st[1]) || d.fixed[`${c},${r}`]) continue;
    const depth = hexDist([c, r], st);
    for (const g of E.slice(Math.min(E.length - 4, Math.max(0, (depth - 1) * 2)), Math.min(E.length, depth * 3 + 2))) g.forEach(e => out.add(e));
  }
  return out;
}
for (const c of COMMISSIONS) {
  if (ids.has(c.id)) bad(`委託編號 ${c.id} 重複`); ids.add(c.id);
  if (!ISLANDS[c.island]) bad(`委託 ${c.title} 的島「${c.island}」不存在`);
  if (c.kind === 'kill' && !ENEMIES[c.target]) bad(`委託 ${c.title} 的敵人「${c.target}」不存在`);
  if (c.kind === 'bring' && !MATS[c.target]) bad(`委託 ${c.title} 的素材「${c.target}」不存在`);
  if (!['kill', 'bring', 'survey'].includes(c.kind)) bad(`委託 ${c.title} 的種類不對`);
  for (const k in c.reward) if (k !== '銀貝' && k !== '圖紙' && !MATS[k]) bad(`委託 ${c.title} 的報酬「${k}」不存在`);
  if (c.reward.圖紙 && !EQUIPS[c.reward.圖紙]) bad(`委託 ${c.title} 的圖紙「${c.reward.圖紙}」不存在`);
  if (c.side && (!FACTIONS.includes(c.side) || !(c.rep > 0))) bad(`委託 ${c.title} 的勢力設定不對`);
  if (c.against && (!FACTIONS.includes(c.against) || c.against === c.side)) bad(`委託 ${c.title} 的對立勢力不對`);
  // 委託要做得到：擊退的敵人，在那座島的一般戰鬥裡遇得到；帶回的素材，那座島的敵人會掉或寶箱開得到
  const isl = ISLANDS[c.island];
  if (isl && c.kind === 'kill' && !reachableFoes(isl).has(c.target)) bad(`委託 ${c.title} 要擊退的「${c.target}」在${c.island}的一般戰鬥裡遇不到`);
  if (isl && c.kind === 'bring' && !(isl.mats || []).includes(c.target) && ![...reachableFoes(isl)].some(e => (ENEMIES[e].drop || []).some(([m]) => m === c.target))) bad(`委託 ${c.title} 要帶回的「${c.target}」在${c.island}拿不到`);
}

const checkEvents = (where, list) => list.forEach(ev => ev.opts.forEach(o => { for (const k in o.fx) if (!FX_OK(k)) bad(`${where}・${ev.title}：效果「${k}」不認得`); }));
checkEvents('航海', SEA_EVENTS);
// 航海事件（第二批）：碰運氣要有成功和失敗、海上戰鬥的敵人要存在、天氣要認得、隊友要存在、連續小故事要從第 1 段連到最後、同海域不能同名
{
  const seen = new Set(), chains = {};
  for (const ev of SEA_EVENTS) {
    const sea = ev.sea || '淺灘', w = `航海・${sea}・${ev.title}`;
    if (!SEAS.includes(sea)) bad(`${w}：海域「${sea}」不存在`);
    if (seen.has(sea + ev.title)) bad(`${w}：同一片海有兩個同名的事件`); seen.add(sea + ev.title);
    if (ev.need && !HEROES[ev.need]) bad(`${w}：要的隊友「${ev.need}」不存在`);
    if (ev.goodIsle && !ISLANDS[ev.goodIsle]) bad(`${w}：島「${ev.goodIsle}」不存在`);
    if (ev.chain) (chains[sea + '・' + ev.chain] = chains[sea + '・' + ev.chain] || []).push(ev.step);
    if (ev.weather && !ev.opts.some(o => o.weather)) bad(`${w}：天氣事件沒有任何一個選項會改天氣`);
    if (!ev.opts.some(o => !o.need)) bad(`${w}：每個選項都要隊友，沒有人在的時候選不了`);
    for (const o of ev.opts) {
      if (o.need && !HEROES[o.need]) bad(`${w}：選項要的隊友「${o.need}」不存在`);
      if (o.weather && !['晴朗', '濃霧', '順風'].includes(o.weather)) bad(`${w}：天氣「${o.weather}」不認得`);
      if (o.chance && !(o.chance > 0 && o.chance < 1 && o.win && o.lose)) bad(`${w}：碰運氣的選項要有成功率、成功和失敗的結果`);
      if (o.fight) { for (const k of o.fight) if (!ENEMIES[k]) bad(`${w}：海上戰鬥的敵人「${k}」不存在`); if (!o.win) bad(`${w}：海上戰鬥要寫打贏的結果`); }
      for (const r of [o.win, o.lose]) if (r) for (const k in r.fx || {}) if (!FX_OK(k)) bad(`${w}：效果「${k}」不認得`);
      if (!o.chance && !o.fight && !o.line) bad(`${w}：選項「${o.label}」沒有結果的文字`);
    }
  }
  for (const [k, steps] of Object.entries(chains)) if (steps.slice().sort((a, b) => a - b).some((s, i) => s !== i + 1)) bad(`連續小故事「${k}」的段數不連續：${steps.join('、')}`);
}
for (const [id, d] of Object.entries(ISLANDS)) {
  const n = d.cols * d.rows;
  const fixed = Object.keys(d.fixed);
  const poolN = Object.values(d.pool).reduce((a, b) => a + b, 0);
  if (fixed.length + 1 + poolN > n) bad(`${id}：格子不夠放（${fixed.length + 1 + poolN} > ${n}）`);
  if (Object.values(d.fixed).filter(k => k === '王').length !== 1) bad(`${id}：要剛好一個首領格`);
  if (!d.pool.眼) bad(`${id}：沒有霧眼，拿不到鑰匙`);
  for (const k of [...Object.values(d.fixed), ...Object.keys(d.pool)]) if (!TILE_INFO[k]) bad(`${id}：格子種類「${k}」不存在`);
  for (const key of [...fixed, d.start.join(',')]) { const [c, r] = key.split(',').map(Number); if (c < 0 || r < 0 || c >= d.cols || r >= d.rows) bad(`${id}：座標 ${key} 超出地圖`); }
  if (fixed.includes(d.start.join(','))) bad(`${id}：登陸點和固定格子重疊`);
  for (const u of [].concat(d.unlock || [])) if (!ISLANDS[u]) bad(`${id}：解鎖條件「${u}」不存在`);
  if (!SEAS.includes(d.sea)) bad(`${id}：海域「${d.sea}」不存在`);
  if (SEA_EVENTS.filter(e => (e.sea || '淺灘') === d.sea).length < d.seaEvents) bad(`${id}：${d.sea}的航海事件不夠`);
  if (d.boss.pick && !d.boss.down.some(L => L.choice)) bad(`${id}：首領戰後要選擇，可是沒有選項`);
  for (const grp of [...d.encounters, d.elite.foes, d.boss.foes]) for (const e of grp) if (!ENEMIES[e]) bad(`${id}：敵人「${e}」不存在`);
  if (!ENEMIES[d.boss.foes[0]] || ENEMIES[d.boss.foes[0]].rank !== '首領') bad(`${id}：首領戰的第一個敵人要是首領`);
  if (d.encounters.length < 5) bad(`${id}：一般戰鬥的組合太少`);
  if (d.events.filter(e => !e.need).length < (d.pool['？'] || 0)) bad(`${id}：事件比事件格少（不算隊友事件）`);
  checkEvents(id, d.events);
  // 第三批劇情：隊友事件、營火夜談的隊友要存在；事件不能同名；每座島都要有重訪的「之後的樣子」
  for (const ev of d.events) { if (ev.need && !HEROES[ev.need]) bad(`${id}・${ev.title}：要的隊友「${ev.need}」不存在`); if (ev.opts.length < 2 || ev.opts.some(o => !o.label || !o.line)) bad(`${id}・${ev.title}：選項不完整`); }
  if (new Set(d.events.map(e => e.title)).size !== d.events.length) bad(`${id}：有兩個同名的事件`);
  if (d.events.filter(e => e.need).length < 2) bad(`${id}：隊友事件少於 2 個`);
  for (const c of d.camp) if (!Array.isArray(c) && c.need && !HEROES[c.need]) bad(`${id}：營火夜談要的隊友「${c.need}」不存在`);
  if (!d.after || !(d.after.arrive || []).length || !(d.after.village || []).length) bad(`${id}：缺少重訪好結局時「之後的樣子」（登島和村子）`);
  for (const L of (d.after || {}).arrive || []) if (L.who && !['阿潮', '蓮笙'].includes(L.who) && !L.need && HEROES[L.who]) bad(`${id}：重訪登島台詞「${L.who}」要加 need（可能不在隊上）`);
  for (const b of d.bps) if (!EQUIPS[b]) bad(`${id}：圖紙「${b}」不存在`);
  for (const m of d.mats) if (!MATS[m]) bad(`${id}：素材「${m}」不存在`);
  if (d.village) for (const k in d.village.shop) if (!FX_OK(k)) bad(`${id}：村子賣的「${k}」不認得`);
  // 村子限量：每個難度都要寫每樣東西可以買幾份，而且糧至少能買 1 份
  if (d.village) for (const [dk, D] of Object.entries(DIFF)) { for (const k in d.village.shop) if (typeof (D.stock || {})[k] !== 'number') bad(`${id}：難度「${dk}」沒寫村子的「${k}」可以買幾份`); if ('糧' in d.village.shop && !(D.stock.糧 >= 1)) bad(`難度「${dk}」：村子的糧至少要能買 1 份`); }
  if (d.village && d.village.recruit && !HEROES[d.village.recruit]) bad(`${id}：加入的隊友不存在`);
  const w = d.ruin.weak;
  const fr = Object.values(ISLANDS).filter(x => x.pool.圖).length;
  if (id === ISLAND_ORDER[0] && fr && fr !== 5) bad(`舊圖碎片要剛好 5 張（現在 ${fr} 張）`);
  if (w && (w.boss !== d.boss.foes[0] || (w.element && !ELEMENTS.includes(w.element)) || (w.who && !HEROES[w.who]))) bad(`${id}：遺跡的弱點設定不對`);
  const G = d.ruin.game;
  if (G) {
    if (!PUZZLES.includes(G.kind)) bad(`${id}：遺跡小遊戲「${G.kind}」不存在`);
    for (const k in G.reward) if (!FX_OK(k)) bad(`${id}：遺跡小遊戲的獎勵「${k}」不認得`);
  }
  if (!d.endings.good || !d.endings.plain) bad(`${id}：缺少結局`);
  // 北霧海：低語格要有低語（真的、假的都要有），足跡格要有文字
  const hasTile = t => Object.keys(d.pool).includes(t) || Object.values(d.fixed).includes(t) || Object.values(d.routes ? d.routes.opts : {}).some(o => (o.pool || {})[t] > 0);
  if (hasTile('聲') && !(d.murmurs && d.murmurs.some(m => m.truth) && d.murmurs.some(m => !m.truth))) bad(`${id}：有低語格，可是低語不夠（真的、假的都要有）`);
  if (hasTile('跡') && !(d.trace && d.trace.length)) bad(`${id}：有足跡格，可是沒有足跡的文字`);
  if (hasTile('圖') && !(d.fragment && d.fragment.length)) bad(`${id}：有舊圖碎片格，可是沒有碎片的文字`);
  // 霧心：空白格只能放在空地、寶箱、妖物、事件上，要留夠
  if (d.blank && (d.pool.寶 || 0) + (d.pool.怪 || 0) + (d.pool['？'] || 0) + (n - fixed.length - 1 - poolN) < d.blank * 2) bad(`${id}：空白格放不下`);
  if (d.ice && Object.keys(d.fixed).length + 1 + poolN + d.ice > n) bad(`${id}：冰面格放不下`);
  if (d.routes) for (const [k, o] of Object.entries(d.routes.opts)) {
    const [c, r] = o.start || d.start;
    if (c < 0 || r < 0 || c >= d.cols || r >= d.rows) bad(`${id}：路線「${k}」的登陸點超出地圖`);
    if (fixed.includes((o.start || d.start).join(','))) bad(`${id}：路線「${k}」的登陸點和固定格子重疊`);
    for (const t in o.pool || {}) if (!TILE_INFO[t]) bad(`${id}：路線「${k}」的格子種類「${t}」不存在`);
    for (const f in o.fx || {}) if (!FX_OK(f)) bad(`${id}：路線「${k}」的效果「${f}」不認得`);
    for (const f in o.rep || {}) if (!FACTIONS.includes(f)) bad(`${id}：路線「${k}」的勢力「${f}」不存在`);
    for (const f in o.need || {}) if (!FACTIONS.includes(f) || !(o.need[f] >= 0 && o.need[f] < REP_LEVELS.length)) bad(`${id}：路線「${k}」需要的聲望設定不對`);
  }
}
for (const k in PORT_SCENES) if (!ISLANDS[k]) bad(`回港劇情「${k}」對應的島不存在`);
const allLines = [...INTRO, ...CHAPTER_END, ...CHAPTER2_END, ...CHAPTER3_END, ...CHAPTER4_END, ...OBSERVATORY, ...OBSERVATORY3, ...OBSERVATORY4, ...OBSERVATORY5, ...Object.values(PORT_SCENES).flat(), ...Object.values(LATE_RECRUIT).flatMap(r => r.lines), ...FINALE_ASK, ...EPILOGUE, ...Object.values(ENDINGS).flatMap(e => e.lines), ...Object.values(ISLANDS).flatMap(d => [...d.arrive, ...d.endings.good.lines, ...d.endings.plain.lines].filter(L => typeof L === 'object'))];
for (const L of allLines) if (L.need && !HEROES[L.need]) bad(`劇情台詞的 need「${L.need}」不存在`);
// flag 寫成「殘頁=父親」的，要有首領戰的選項能選到
const picks = {};
for (const d of Object.values(ISLANDS)) if (d.boss.pick) picks[d.boss.pick] = d.boss.down.filter(L => L.choice).flatMap(L => L.choice.map(c => c[1]));
for (const d of Object.values(ISLANDS)) if (d.routes) picks[d.routes.key] = Object.keys(d.routes.opts);
picks.結局 = Object.keys(ENDINGS); picks.最高聲望 = FACTIONS;
// 結局：每個結局都要有動畫
for (const [k, e] of Object.entries(ENDINGS)) if (!CINEMA[e.cine]) bad(`結局「${k}」的動畫「${e.cine}」不存在`);
if (Object.values(ISLANDS).filter(d => d.boss.final).length !== 1) bad('要剛好一座島的首領是最後的首領（final）');
for (const L of allLines) if (L.flag && L.flag.includes('=')) { const [k, v] = L.flag.split('='); if (!picks[k] || !picks[k].includes(v)) bad(`劇情台詞的 flag「${L.flag}」沒有選項選得到`); }
for (const [k, r] of Object.entries(LATE_RECRUIT)) { if (!ISLANDS[k]) bad(`補加入的島「${k}」不存在`); if (!HEROES[r.key]) bad(`補加入的隊友「${r.key}」不存在`); }
for (const c of CHAPTERS) { if (!ISLANDS[c.last]) bad(`章節「${c.title}」的最後一座島不存在`); if (!CINEMA[c.cine]) bad(`章節「${c.title}」的結尾動畫不存在`); for (const i of c.isles) if (!ISLANDS[i]) bad(`章節「${c.title}」的島「${i}」不存在`); }

// 隊友的心願：隊友要存在；isle 要是一座島（null 是第五章最後才揭曉）
for (const [k, w] of Object.entries(WISHES)) { if (!HEROES[k]) bad(`心願的隊友「${k}」不存在`); if (w.isle && !ISLANDS[w.isle]) bad(`${k}的心願的島「${w.isle}」不存在`); }
for (const k of Object.keys(HEROES)) if (k !== '墨里' && !WISHES[k]) bad(`隊友 ${k} 沒有心願`);

// 劇情動畫：場景要畫得出來；插圖名稱要在生圖清單裡，而且不能重複
const picList = JSON.parse(readFileSync(new URL('./生圖/清單_劇情.json', import.meta.url), 'utf8')).items.map(it => it.name);
for (const n of new Set(picList)) if (picList.filter(x => x === n).length > 1) bad(`生圖清單裡的「${n}」重複了`);
const usedPics = [];
const EXTRA_CINE = ['開場', '第一章完', '第二章', '第二章完', '第三章', '第三章完', '第四章', '第四章完', '回來的腳印', '第五章', '尾聲', ...Object.values(ENDINGS).map(e => e.cine)];
for (const k of [...EXTRA_CINE, ...Object.keys(ISLANDS)]) if (!CINEMA[k]) bad(`缺少劇情動畫「${k}」`);
for (const [k, c] of Object.entries(CINEMA)) {
  if (!EXTRA_CINE.includes(k) && !ISLANDS[k]) bad(`劇情動畫「${k}」對應的島不存在`);
  for (const F of c.frames) {
    if (!ART_KEYS.includes(F.art)) bad(`劇情動畫「${k}」的場景「${F.art}」不存在`);
    if (!F.text) bad(`劇情動畫「${k}」有一張圖沒有文字`);
    if (!picList.includes(F.img)) bad(`劇情動畫「${k}」的插圖「${F.img}」不在生圖清單裡`);
    if (usedPics.includes(F.img)) bad(`劇情動畫的插圖「${F.img}」用了兩次`);
    usedPics.push(F.img);
  }
}
for (const n of picList) if (!usedPics.includes(n)) bad(`生圖清單裡的「${n}」沒有用到`);

// 台詞：混在文字裡的角色台詞 { who, need, text } 一定要有文字；need 要是存在的隊友
// （視窗會把它排成「名字：台詞」，不會再出現 [object Object]）
const walkLines = (v, where) => {
  if (Array.isArray(v)) {
    if (v.some(x => typeof x === 'string')) for (const x of v) if (x && typeof x === 'object' && !Array.isArray(x)) {
      if ((x.who || x.need) && (typeof x.text !== 'string' || !x.text)) bad(`${where} 有一句台詞沒有文字`);
      if (x.need && !HEROES[x.need]) bad(`${where} 的台詞要的隊友「${x.need}」不存在`);
    }
    v.forEach(x => walkLines(x, where));
  } else if (v && typeof v === 'object') for (const k in v) walkLines(v[k], where === '' ? k : where);
};
for (const [k, v] of Object.entries({ ISLANDS, SEA_EVENTS, PORT_SCENES, CHAPTERS, LATE_RECRUIT, ENDINGS, EPILOGUE, FINALE_ASK, OBSERVATORY, OBSERVATORY3, OBSERVATORY4, OBSERVATORY5 })) {
  if (k === 'ISLANDS') for (const [id, d] of Object.entries(v)) walkLines(d, `島「${id}」`); else walkLines(v, k);
}

// 訓練：帶隊的人要存在，名字不能和遺跡小遊戲重複
for (const [k, T] of Object.entries(TRAININGS)) { if (PUZZLES.includes(k)) bad(`訓練「${k}」和遺跡小遊戲同名`); for (const h of T.lead) if (!HEROES[h]) bad(`訓練「${k}」：帶隊的「${h}」不存在`); }

if (errs.length) { console.log('發現問題：\n' + errs.map(e => '・' + e).join('\n')); process.exit(1); }
console.log(`《畫海人》檢查通過：${Object.keys(ISLANDS).length} 座島、${Object.keys(ENEMIES).length} 種敵人、${Object.keys(EQUIPS).length} 件裝備、${COMMISSIONS.length} 個委託、${Object.keys(CINEMA).length} 段劇情動畫（${usedPics.length} 張圖）。`);
