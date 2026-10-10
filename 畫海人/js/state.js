// 遊戲狀態與存檔
import { HEROES, EQUIPS, SMUGGLE_CARGO } from './data.js';

export const DIFF = {
  悠閒: { foe: 0.7, food: 0.5, fogBack: false, label: '悠閒：敵人較弱、補給消耗減半、霧不會回來',
    stock: { 糧: 5, 燈油: 3, 墨水: 3, 藥草: 3, 海靈露: 2, 醒神香: 2 }, starve: 0, daze: false },
  標準: { foe: 1, food: 1, fogBack: true, label: '標準：照設計的平衡',
    stock: { 糧: 3, 燈油: 2, 墨水: 2, 藥草: 2, 海靈露: 1, 醒神香: 1 }, starve: 6, daze: true },
  困難: { foe: 1.3, food: 1, fogBack: true, label: '困難：敵人更強，霧回來得更快，村子的東西更少',
    stock: { 糧: 2, 燈油: 1, 墨水: 1, 藥草: 1, 海靈露: 1, 醒神香: 0 }, starve: 6, daze: true },
};
// stock：村子小店每樣東西可以買幾份（每次登島補滿）
// starve：斷糧以後還撐得了幾格，再走一格就被迫返航（0 = 不會被迫返航，體力最低 1）
// daze：士氣「崩潰」時，戰鬥一開始會不會有人發呆

// 士氣分四段：高昂、平穩、低落、崩潰
export const MORALE_TIERS = [
  { min: 80, name: '高昂', cls: 'good', tip: '爆擊率 +5%、打贏的經驗 +10%' },
  { min: 40, name: '平穩', cls: '', tip: '沒有額外效果' },
  { min: 20, name: '低落', cls: 'low', tip: '營火只回復 40%' },
  { min: 0, name: '崩潰', cls: 'bad', tip: '營火只回復 40%；戰鬥一開始，會有一個人發呆一回合' },
];
export const moraleTier = m => MORALE_TIERS.find(t => m >= t.min) || MORALE_TIERS[3];
// 回港口的時候，士氣至少拉回這麼多
export const MORALE_HOME = 40;

export function newGame(diff = '標準') {
  return {
    v: 2, diff, name: '墨里', attitude: null,
    silver: 100,
    supply: { 糧: 10, 燈油: 0, 墨水: 0, 藥草: 1, 海靈露: 1, 醒神香: 0 },
    mats: {}, gear: {}, bps: Object.keys(EQUIPS).filter(k => EQUIPS[k].start),
    ship: { 貨艙: 0, 船帆: 0, 船首像: 0, 船身: 0, 小艇: 0 }, hull: 100,
    party: ['墨里', '阿潮', '蓮笙'].map((k, i) => makeHero(k, i)),
    morale: 50, flags: {}, island: null, phase: 'intro',
    // 勢力聲望（第三章開始）
    rep: { 商會: 0, 紅帆: 0 },
    // 每座島留下來的紀錄：完成了沒、最好的結局、測繪過的格子
    world: {},
    // 酒館：接下的委託（id → 進度）、完成過的委託
    jobs: {}, jobsDone: [],
    stats: { steps: 0, battles: 0, kills: 0, start: Date.now() },
  };
}

export function makeHero(key, i, lv = 1) {
  const h = { key, lv, exp: 0, row: ['阿潮', '葛蘿', '霧子', '嘎嘎'].includes(key) ? 'front' : 'back', slot: i, eq: {} };
  const s = heroStats(h); h.hp = s.hp; h.mp = s.mp;
  return h;
}

// 裝備加上去的數值
export function gearStats(h) {
  const t = { hp: 0, mp: 0, atk: 0, def: 0, mag: 0, spd: 0 };
  for (const name of Object.values(h.eq || {})) {
    const e = EQUIPS[name]; if (!e) continue;
    for (const k in e.stats) t[k] += e.stats[k];
  }
  return t;
}

export function heroStats(h) {
  const d = HEROES[h.key], m = 1 + 0.08 * (h.lv - 1), q = gearStats(h);
  const r = k => Math.round(d[k] * m) + q[k];
  return { hp: r('hp'), mp: Math.round(d.mp + 2 * (h.lv - 1)) + q.mp, atk: r('atk'), def: r('def'), mag: r('mag'), spd: Math.max(1, r('spd')) };
}

export const expNeed = lv => 30 * lv;

// 回傳升級訊息
export function gainExp(h, n) {
  const msgs = [];
  h.exp += n;
  while (h.exp >= expNeed(h.lv)) {
    h.exp -= expNeed(h.lv); h.lv++;
    const s = heroStats(h); h.hp = Math.min(s.hp, h.hp + Math.round(s.hp * 0.3)); h.mp = Math.min(s.mp, h.mp + 4);
    msgs.push(`${h.key} 升到 ${h.lv} 級！`);
  }
  return msgs;
}

// 補給，加上黑市走私的貨箱
export function cargoUsed(g) { return Object.values(g.supply).reduce((a, b) => a + b, 0) + (g.smuggle ? SMUGGLE_CARGO : 0); }

// 舊的存檔（M1 雛形）補上新的欄位
function migrate(d) {
  if (d.v === 1) {
    const n = newGame(d.diff);
    for (const k of ['mats', 'gear', 'bps', 'ship', 'world', 'jobs', 'jobsDone']) if (!d[k]) d[k] = n[k];
    d.party.forEach(h => { if (!h.eq) h.eq = {}; });
    if (d.flags && d.flags.遺跡) { d.flags['遺跡:低語礁'] = 1; delete d.flags.遺跡; }
    if (d.island && !d.island.id) d.island.id = '低語礁';
    delete d.cargo;
    if (d.phase === 'done') d.phase = 'port';
    d.v = 2;
  }
  // 新版本加的「一開始就會」的圖紙（例如費米的弓），舊存檔也補上
  for (const k of Object.keys(EQUIPS)) if (EQUIPS[k].start && !d.bps.includes(k)) d.bps.push(k);
  if (!d.rep) d.rep = { 商會: 0, 紅帆: 0 };
  return d;
}

const KEY = 'huahairen.save';
export function save(g) { try { localStorage.setItem(KEY, JSON.stringify(g)); return true; } catch (e) { return false; } }
export function load() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && (d.v === 1 || d.v === 2) ? migrate(d) : null; } catch (e) { return null; } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* 存不了就算了 */ } }

const SKEY = 'huahairen.settings';
export function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SKEY) || '{}') || {}; } catch (e) { /* 用預設 */ }
  return Object.assign({ sound: true, speed: 2, auto: false }, s);
}
export function saveSettings(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { /* 存不了就算了 */ } }
