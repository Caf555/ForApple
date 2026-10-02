// 遊戲狀態、數值計算、存讀檔
import { CHARACTERS, ITEMS, SKILLS, CODEX, FORMATIONS } from './data.js';

export const SAVE_VERSION = 1;
const KEY = 'qqy.save.';
const SETTINGS_KEY = 'qqy.settings';

export const AXES = {
  // 作者寫法 → [軸, 方向]
  情: ['情理', -1], 理: ['情理', 1],
  柔: ['剛柔', -1], 剛: ['剛柔', 1],
  出世: ['出入', -1], 入世: ['出入', 1],
};

export function expToNext(lv) { return Math.round(15 * Math.pow(lv, 1.5)); }

export function bondLevel(points) {
  if (points >= 140) return 5;
  if (points >= 90) return 4;
  if (points >= 50) return 3;
  if (points >= 20) return 2;
  return 1;
}

export function newGame(name = '沈知墨') {
  const g = {
    v: SAVE_VERSION,
    player: { name, call: name.length === 3 ? name.slice(1) : name },
    scene: null, pc: 0,
    loc: { vol: '', place: '', year: '', theme: 'modern', music: '' },
    flags: {},
    bonds: {},
    mind: { 情理: 0, 剛柔: 0, 出入: 0 },
    party: [],       // 出戰隊伍（角色名）
    members: {},     // 角色名 → 角色狀態
    items: {},
    money: 0,
    codex: {},
    spirits: [],     // 硯池中的靈
    formation: '一字陣',
    formations: ['一字陣'],
    resume: {},      // 卷 → 下一個場景
    log: [],         // 最近的文字（讀檔時顯示）
    seen: {},        // 看過的場景
    playTime: 0,
  };
  return g;
}

export function makeMember(name, lv = 1) {
  const def = CHARACTERS[name];
  if (!def) throw new Error('沒有這個角色：' + name);
  const m = { name, lv, exp: 0, hp: 0, mp: 0, weapon: def.weapon, charm: def.charm, extraSkills: [] };
  const s = baseStats(m);
  m.hp = s.hp; m.mp = s.mp;
  return m;
}

export function baseStats(m) {
  const def = CHARACTERS[m.name];
  const s = {};
  for (const k in def.base) s[k] = Math.floor(def.base[k] + def.growth[k] * (m.lv - 1));
  return s;
}

export function memberStats(g, m) {
  const s = baseStats(m);
  for (const slot of ['weapon', 'charm']) {
    const it = m[slot] && ITEMS[m[slot]];
    if (it && it.stats) for (const k in it.stats) s[k] = (s[k] || 0) + it.stats[k];
  }
  return s;
}

export function weaponElement(m) {
  const it = m.weapon && ITEMS[m.weapon];
  return (it && it.element) || CHARACTERS[m.name].element || '無';
}

export function memberSkills(m) {
  const def = CHARACTERS[m.name];
  const list = def.skills.filter(([lv]) => m.lv >= lv).map(([, s]) => s);
  for (const s of m.extraSkills || []) if (!list.includes(s)) list.push(s);
  return list.filter(s => SKILLS[s]);
}

// 經驗：回傳升級訊息
export function gainExp(g, m, amount) {
  const msgs = [];
  m.exp += amount;
  while (m.exp >= expToNext(m.lv) && m.lv < 99) {
    m.exp -= expToNext(m.lv);
    const before = memberSkills(m);
    const old = baseStats(m);
    m.lv++;
    const now = baseStats(m);
    m.hp += now.hp - old.hp; m.mp += now.mp - old.mp;
    msgs.push(`${displayName(g, m.name)} 升到 ${m.lv} 級！`);
    for (const s of memberSkills(m)) if (!before.includes(s)) msgs.push(`${displayName(g, m.name)} 習得「${s}」`);
  }
  return msgs;
}

export function displayName(g, name) {
  if (name === '知墨') return g.player.call;
  return (g.names && g.names[name]) || name;
}

// ───────── 條件判斷 ─────────
export function mindSide(g, key) {
  const a = AXES[key];
  if (!a) return 0;
  return g.mind[a[0]] * a[1];
}

function cmp(a, op, b) {
  switch (op) {
    case '≥': case '>=': return a >= b;
    case '≤': case '<=': return a <= b;
    case '>': return a > b;
    case '<': return a < b;
    case '≠': case '!=': return a != b;
    case '=': return a == b;
    default: return !!a;
  }
}

export function checkCond(g, cond) {
  if (!cond) return true;
  return cond.every(c => {
    let v;
    switch (c.kind) {
      case '旗標': v = g.flags[c.args[0]]; if (!c.op) v = !!v; break;
      case '羈絆': v = bondLevel(g.bonds[c.args[0]] || 0); break;
      case '羈絆點': v = g.bonds[c.args[0]] || 0; break;
      case '心印': v = mindSide(g, c.args[0]); break;
      case '中庸': v = Object.values(g.mind).every(x => Math.abs(x) <= 30); break;
      case '道具': v = g.items[c.args[0]] || 0; if (!c.op) v = v > 0; break;
      case '史卷': v = !!g.codex[c.args[0]]; break;
      case '靈': v = g.spirits.includes(c.args[0]); break;
      case '隊友': v = g.party.includes(c.args[0]); break;
      case '錢': v = g.money; break;
      case '等級': v = g.members.知墨 ? g.members.知墨.lv : 1; break;
      default: v = false;
    }
    let r = c.op ? cmp(v, c.op, isNaN(+c.rhs) ? c.rhs : +c.rhs) : !!v;
    return c.neg ? !r : r;
  });
}

export function condText(cond) {
  if (!cond) return '';
  return cond.map(c => {
    const [a] = c.args;
    switch (c.kind) {
      case '中庸': return '中庸（三條心印軸都在 ±30 以內）';
      case '心印': return `心印偏「${a}」${c.rhs ? ' ' + c.rhs : ''}`;
      case '羈絆': return `${a === '知墨' ? '' : a}羈絆 ${c.rhs} 級`;
      case '史卷': return `史卷「${a}」`;
      case '道具': return `道具「${a}」`;
      case '靈': return `硯池中有「${a}」`;
      case '等級': return `等級 ${c.rhs}`;
      default: return c.raw;
    }
  }).join('、');
}

// ───────── 物品 ─────────
export function addItem(g, name, n = 1) {
  g.items[name] = (g.items[name] || 0) + n;
  if (g.items[name] <= 0) delete g.items[name];
}

export function addCodex(g, id) {
  if (g.codex[id]) return false;
  g.codex[id] = Date.now();
  return true;
}

export function addMember(g, name, lv) {
  if (!g.members[name]) g.members[name] = makeMember(name, lv || 1);
  else if (lv && g.members[name].lv < lv) {
    const m = g.members[name];
    m.lv = lv; m.exp = 0;
    const s = baseStats(m); m.hp = s.hp; m.mp = s.mp;
  }
  if (!g.party.includes(name)) {
    if (g.party.length >= 4) {
      // 擠掉墨靈
      const i = g.party.findIndex(p => CHARACTERS[p].spirit);
      if (i >= 0) g.party.splice(i, 1);
    }
    if (g.party.length < 4) g.party.push(name);
  }
}

export function removeMember(g, name) {
  g.party = g.party.filter(p => p !== name);
}

export function healAll(g) {
  for (const n in g.members) {
    const m = g.members[n];
    const s = memberStats(g, m);
    m.hp = s.hp; m.mp = s.mp;
  }
}

// ───────── 存讀檔 ─────────
export function saveSlot(g, slot) {
  const data = JSON.stringify({ ...g, savedAt: Date.now() });
  try { localStorage.setItem(KEY + slot, data); return true; } catch (e) { return false; }
}

export function loadSlot(slot) {
  try {
    const raw = localStorage.getItem(KEY + slot);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch (e) { return null; }
}

export function slotInfo(slot) {
  try {
    const raw = localStorage.getItem(KEY + slot);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { at: d.savedAt, vol: d.loc && d.loc.vol, place: d.loc && d.loc.place, year: d.loc && d.loc.year, lv: d.members && d.members.知墨 ? d.members.知墨.lv : 1 };
  } catch (e) { return null; }
}

export function migrate(d) {
  const base = newGame();
  const g = Object.assign(base, d);
  g.v = SAVE_VERSION;
  return g;
}

// 存檔碼：JSON → UTF-8 → base64
export function exportCode(g) {
  const json = JSON.stringify(g);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return 'QQY1:' + btoa(bin);
}

export function importCode(code) {
  code = (code || '').trim();
  if (!code.startsWith('QQY1:')) throw new Error('這不是《千秋硯》的存檔碼');
  const bin = atob(code.slice(5));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return migrate(JSON.parse(new TextDecoder().decode(bytes)));
}

// ───────── 設定 ─────────
export const DEFAULT_SETTINGS = {
  fontSize: 1,      // 0 小 1 中 2 大 3 特大
  speed: 1,         // 0 立即 1 快 2 普通
  readMode: 'page', // line 逐句 / page 整頁 / auto 自動播放
  theme: 'auto',    // auto / dark / light
  sound: true,
  volume: 0.6,
  difficulty: '普通',
  tts: false,
  battleSpeed: 1,
  portrait: true,   // 對話時淡淡浮現說話者的半身像
  ambient: true,    // 各卷的氛圍粒子（塵、火星……）
  vibrate: true,    // 暴擊、封靈時手機輕震（Android）
};

export function loadSettings() {
  try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch (e) { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* 無痕模式等情況 */ }
}

export function codexTitle(id) {
  return id.startsWith('妖・') ? id.slice(2) : id;
}

export function hasCodex(id) { return !!CODEX[id]; }
export { FORMATIONS };
