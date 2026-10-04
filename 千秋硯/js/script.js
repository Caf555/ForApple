// 劇本解析器：把中文劇本語法轉成遊戲可執行的指令。
// 不依賴瀏覽器，可在 Node 中執行（見 tools/check.mjs）。

const OUTCOME_KEYS = ['勝', '敗', '說服', '人心', '和解'];

export class ScriptError extends Error {
  constructor(file, line, msg) {
    super(`${file} 第 ${line} 行：${msg}`);
    this.file = file; this.line = line;
  }
}

// 把「→ 勝：A　敗：B」拆成 { 勝: 'A', 敗: 'B' }；若只有「→ A」則回傳字串 A
function parseTarget(s) {
  s = s.trim();
  if (!s.includes('：') && !s.includes(':')) return s;
  const out = {};
  const re = /(\S+?)[：:]\s*(\S+)/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[2];
  return out;
}

function splitArrow(s) {
  const i = s.indexOf('→');
  if (i < 0) return [s.trim(), null];
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}

// 條件：以「且」連接的子句
export function parseCondition(s) {
  s = s.trim();
  if (!s) return null;
  return s.split(/\s*且\s*/).map(clause => {
    let neg = false;
    let c = clause.trim();
    if (c.startsWith('非 ') || c.startsWith('非')) { neg = true; c = c.replace(/^非\s*/, ''); }
    const m = c.match(/^(.*?)\s*(≥|≤|>=|<=|≠|!=|=|>|<)\s*(\S+)$/);
    let lhs = c, op = null, rhs = null;
    if (m) { lhs = m[1]; op = m[2]; rhs = m[3]; }
    const parts = lhs.split(/\s+/);
    return { neg, kind: parts[0], args: parts.slice(1), op, rhs, raw: clause.trim() };
  });
}

export function parseScript(text, file = '劇本') {
  const scenes = {};
  const order = [];
  let cur = null;
  const lines = text.replace(/\r/g, '').split('\n');

  const push = (cmd, ln) => {
    if (!cur) throw new ScriptError(file, ln, '指令必須寫在「# 場景名稱」之後');
    cmd.line = ln;
    cur.cmds.push(cmd);
  };

  lines.forEach((raw, idx) => {
    const ln = idx + 1;
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;

    if (line.startsWith('#')) {
      const id = line.replace(/^#+/, '').trim();
      if (!id) throw new ScriptError(file, ln, '場景缺少名稱');
      if (scenes[id]) throw new ScriptError(file, ln, `場景「${id}」重複了`);
      cur = { id, cmds: [], file, line: ln };
      scenes[id] = cur; order.push(id);
      return;
    }

    // 對白
    let m = line.match(/^【(.+?)】\s*(.*)$/);
    if (m) {
      // 【蘅｜笑】：說話的人＋表情（有「蘅_笑」這張圖就換成它，沒有就用平常的頭像）
      const [who, face] = m[1].split('｜').map(x => x.trim());
      push(who === '旁白' ? { t: 'text', text: m[2] } : { t: 'say', who, face: face || undefined, text: m[2] }, ln);
      return;
    }

    // 選項
    if (line.startsWith('？') || line.startsWith('?')) {
      let body = line.slice(1).trim();
      let cond = null;
      m = body.match(/^［(.+?)］\s*(.*)$/) || body.match(/^\[(.+?)\]\s*(.*)$/);
      if (m) { cond = parseCondition(m[1]); body = m[2]; }
      const [label, target] = splitArrow(body);
      if (!target) throw new ScriptError(file, ln, '選項缺少「→ 目標場景」');
      push({ t: 'choice', label, target, cond }, ln);
      return;
    }

    // 跳轉
    if (line.startsWith('→')) {
      push({ t: 'goto', target: line.slice(1).trim() }, ln);
      return;
    }

    // 條件跳轉
    if (line.startsWith('◆')) {
      const body = line.slice(1).trim().replace(/^若\s*/, '');
      const [c, target] = splitArrow(body);
      if (!target) throw new ScriptError(file, ln, '條件跳轉缺少「→ 目標場景」');
      push({ t: 'if', cond: parseCondition(c), target }, ln);
      return;
    }

    // 戰鬥
    if (line.startsWith('⚔')) {
      const [left, right] = splitArrow(line.slice(1).trim());
      const parts = left.split(/\s+/);
      const mode = parts[0];
      if (mode !== '戰鬥' && mode !== '隨機') throw new ScriptError(file, ln, '戰鬥指令應為「⚔ 戰鬥 名稱」或「⚔ 隨機 名稱」');
      if (!parts[1]) throw new ScriptError(file, ln, '戰鬥缺少敵人組名稱');
      push({ t: 'battle', mode, id: parts[1], out: right ? parseTarget(right) : {} }, ln);
      return;
    }

    // 效果
    if (line.startsWith('＋') || line.startsWith('－') || line.startsWith('+') || line.startsWith('-')) {
      const sign = (line[0] === '＋' || line[0] === '+') ? 1 : -1;
      const parts = line.slice(1).trim().split(/\s+/);
      push({ t: 'fx', sign, kind: parts[0], args: parts.slice(1) }, ln);
      return;
    }

    // 演出與系統指令
    if (line.startsWith('@') || line.startsWith('＠')) {
      const body = line.slice(1).trim();
      const [left, right] = splitArrow(body);
      const sp = left.search(/\s/);
      const name = sp < 0 ? left : left.slice(0, sp);
      const arg = sp < 0 ? '' : left.slice(sp + 1).trim();
      push({ t: 'cmd', name, arg, out: right ? parseTarget(right) : null }, ln);
      return;
    }

    // 其他：旁白
    push({ t: 'text', text: line }, ln);
  });

  return { scenes, order };
}

// 收集一個指令會跳往的所有場景（供檢查工具使用）
export function targetsOf(cmd) {
  const t = [];
  const add = v => { if (!v) return; if (typeof v === 'string') t.push(v); else Object.values(v).forEach(x => t.push(x)); };
  if (cmd.t === 'choice' || cmd.t === 'goto' || cmd.t === 'if') add(cmd.target);
  if (cmd.t === 'battle') add(cmd.out);
  if (cmd.t === 'cmd') {
    add(cmd.out);
    if (cmd.name === '回書齋' && cmd.arg) t.push(cmd.arg);
  }
  return t;
}

export { OUTCOME_KEYS };
