// 遊戲狀態與存檔
import { HEROES } from './data.js';

export const DIFF = {
  悠閒: { foe: 0.7, food: 0.5, fogBack: false, label: '悠閒：敵人較弱、補給消耗減半、霧不會回來' },
  標準: { foe: 1, food: 1, fogBack: true, label: '標準：照設計的平衡' },
  困難: { foe: 1.3, food: 1, fogBack: true, label: '困難：敵人更強，霧回來得更快' },
};

export function newGame(diff = '標準') {
  return {
    v: 1, diff, name: '墨里', attitude: null,
    silver: 100, cargo: 40,
    supply: { 糧: 10, 燈油: 0, 墨水: 0, 藥草: 1, 海靈露: 1, 醒神香: 0 },
    party: ['墨里', '阿潮', '蓮笙'].map((k, i) => makeHero(k, i)),
    morale: 50, flags: {}, island: null, phase: 'intro',
    stats: { steps: 0, battles: 0, kills: 0, start: Date.now() },
  };
}

function makeHero(key, i) {
  const h = { key, lv: 1, exp: 0, row: key === '阿潮' ? 'front' : 'back', slot: i };
  const s = heroStats(h); h.hp = s.hp; h.mp = s.mp;
  return h;
}

export function heroStats(h) {
  const d = HEROES[h.key], m = 1 + 0.08 * (h.lv - 1);
  const r = k => Math.round(d[k] * m);
  return { hp: r('hp'), mp: Math.round(d.mp + 2 * (h.lv - 1)), atk: r('atk'), def: r('def'), mag: r('mag'), spd: r('spd') };
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

const KEY = 'huahairen.save';
export function save(g) { try { localStorage.setItem(KEY, JSON.stringify(g)); return true; } catch (e) { return false; } }
export function load() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && d.v === 1 ? d : null; } catch (e) { return null; } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* 存不了就算了 */ } }

const SKEY = 'huahairen.settings';
export function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SKEY) || '{}') || {}; } catch (e) { /* 用預設 */ }
  return Object.assign({ sound: true, speed: 2, auto: false }, s);
}
export function saveSettings(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { /* 存不了就算了 */ } }
