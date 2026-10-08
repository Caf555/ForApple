// 遊戲狀態與存檔
import { HEROES, EQUIPS } from './data.js';

export const DIFF = {
  悠閒: { foe: 0.7, food: 0.5, fogBack: false, label: '悠閒：敵人較弱、補給消耗減半、霧不會回來' },
  標準: { foe: 1, food: 1, fogBack: true, label: '標準：照設計的平衡' },
  困難: { foe: 1.3, food: 1, fogBack: true, label: '困難：敵人更強，霧回來得更快' },
};

export function newGame(diff = '標準') {
  return {
    v: 2, diff, name: '墨里', attitude: null,
    silver: 100,
    supply: { 糧: 10, 燈油: 0, 墨水: 0, 藥草: 1, 海靈露: 1, 醒神香: 0 },
    mats: {}, gear: {}, bps: Object.keys(EQUIPS).filter(k => EQUIPS[k].start),
    ship: { 貨艙: 0, 船帆: 0, 船首像: 0 },
    party: ['墨里', '阿潮', '蓮笙'].map((k, i) => makeHero(k, i)),
    morale: 50, flags: {}, island: null, phase: 'intro',
    // 每座島留下來的紀錄：完成了沒、最好的結局、測繪過的格子
    world: {},
    // 酒館：接下的委託（id → 進度）、完成過的委託
    jobs: {}, jobsDone: [],
    stats: { steps: 0, battles: 0, kills: 0, start: Date.now() },
  };
}

export function makeHero(key, i, lv = 1) {
  const h = { key, lv, exp: 0, row: key === '阿潮' ? 'front' : 'back', slot: i, eq: {} };
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

export function cargoUsed(g) { return Object.values(g.supply).reduce((a, b) => a + b, 0); }

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
