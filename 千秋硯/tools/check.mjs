// 劇本檢查工具：node 千秋硯/tools/check.mjs
// 檢查所有劇本的語法、跳轉目標、道具、敵人、史卷等是否存在。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseScript, targetsOf } from '../js/script.js';
import * as D from '../js/data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mainSrc = readFileSync(join(root, 'js/main.js'), 'utf8');
const files = JSON.parse(mainSrc.match(/const CONTENT = (\[.*?\]);/)[1].replace(/'/g, '"'));

const errors = [];
const warns = [];

// 角色和敵人用到的技能，都要存在
// 程式語法：一個打錯的符號就會讓整個遊戲打不開
import { spawnSync } from 'node:child_process';
for (const f of readdirSync(join(root, 'js')).filter(f => f.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: readFileSync(join(root, 'js', f)) });
  if (r.status !== 0) errors.push(`js/${f} 有語法錯誤：` + (String(r.stderr).split('\n').find(l => l.startsWith('SyntaxError')) || '') + '\n' + String(r.stderr).split('\n').slice(0, 3).join('\n'));
}
// 敵人分工、叫幫手：名字都要存在
for (const r in D.ENEMY_ROLES) for (const n of D.ENEMY_ROLES[r]) if (!D.ENEMIES[n]) errors.push(`敵人分工「${r}」裡的「${n}」不存在`);
for (const [a, b] of Object.entries(D.SUMMONS)) { if (!D.ENEMIES[a]) errors.push(`叫幫手的「${a}」不存在`); if (!D.ENEMIES[b]) errors.push(`「${a}」叫來的「${b}」不存在`); }
for (const [n, c] of Object.entries(D.CHARACTERS)) for (const [, sk] of c.skills || []) if (!D.SKILLS[sk]) errors.push(`角色「${n}」的技能「${sk}」不存在`);
for (const [n, e] of Object.entries(D.ENEMIES)) for (const [sk] of e.skills || []) if (sk !== '攻擊' && !D.SKILLS[sk]) errors.push(`敵人「${n}」的技能「${sk}」不存在`);

// data.js 裡同一個表（角色、技能、敵人、道具……）不能有重複的名稱，否則後面的會悄悄蓋掉前面的
{
  const src = readFileSync(join(root, 'js/data.js'), 'utf8');
  let table = null, seen = null;
  src.split('\n').forEach((line, i) => {
    const m = line.match(/^export const (\w+) = \{/);
    if (m) { table = m[1]; seen = new Map(); return; }
    if (/^\};/.test(line)) { table = null; return; }
    if (!table) return;
    const k = line.match(/^  (?:'([^']+)'|([^\s:'{}\/]+)):\s/);
    if (!k) return;
    const key = k[1] || k[2];
    if (seen.has(key)) errors.push(`js/data.js 第 ${i + 1} 行：${table} 裡的「${key}」重複了（第 ${seen.get(key)} 行已經有了）`);
    else seen.set(key, i + 1);
  });
}
const scenes = {};
for (const f of files) {
  try {
    const r = parseScript(readFileSync(join(root, f), 'utf8'), f);
    for (const id in r.scenes) {
      if (scenes[id]) errors.push(`${f}：場景「${id}」與 ${scenes[id].file} 重複`);
      scenes[id] = r.scenes[id];
    }
  } catch (e) { errors.push(e.message); }
}

const at = (s, c) => `${s.file} 第 ${c.line} 行`;
const FX = ['旗標', '羈絆', '心印', '道具', '錢', '經驗', '史卷', '隊友', '封靈', '陣法', '技能', '補史', '回復'];
const CMDS = ['地點', '年代', '卷', '主題', '音樂', '章節', '清畫面', '提示', '回復', '存檔點', '教學', '取名', '回書齋', '進度', '開放', '卷完', '商店', '論辯', '小遊戲', '書齋', '試玩結束', '背景', '插圖', '立繪', '稱呼', '天氣', '震動', '閃白', '淡黑', '寫字'];
const MUSIC = ['府城夜', '海潮', '書齋', '緊張', '哀歌', '戰鬥', '首領', '殷商', '阿瑪納', '雅典', '羯陵伽', '舊府城', '長安', '西域', '佛羅倫斯', '墨西卡', '戰壕', '晴空', '歸墟', '無', ''];
const THEMES = ['modern', 'dayuan', 'muye', 'amarna', 'athens', 'kalinga', 'fifties', 'tang', 'steppe', 'florence', 'mexica', 'trench', 'sky', 'abyss', 'hub'];
// 生圖清單裡的圖名（用來檢查 @背景、@插圖、@立繪 有沒有打錯字）
import { readdirSync } from 'node:fs';
const imgNames = new Set();
try {
  for (const f of readdirSync(join(root, 'tools/生圖')).filter(f => f.startsWith('清單') && f.endsWith('.json'))) {
    for (const it of JSON.parse(readFileSync(join(root, 'tools/生圖', f), 'utf8')).items) {
      // 插圖、道具、背景等所有圖的名稱都不能重複（不同種類也不行），否則生圖與圖檔清單會互相覆蓋
      if (imgNames.has(it.name)) errors.push(`生圖清單 ${f}：圖名「${it.name}」重複了（插圖和道具也不能同名）`);
      imgNames.add(it.name);
    }
  }
} catch (e) { /* 沒有生圖清單 */ }
const allCodex = new Set([...Object.keys(D.CODEX), ...Object.keys(D.ENEMIES).map(D.enemyCodexId)]);
const reached = new Set();

for (const id in scenes) {
  const s = scenes[id];
  const last = s.cmds[s.cmds.length - 1];
  if (!last) { errors.push(`${s.file} 第 ${s.line} 行：場景「${id}」是空的`); continue; }
  const ends = ['goto', 'choice'].includes(last.t) || (last.t === 'cmd' && ['回書齋', '書齋', '試玩結束'].includes(last.name)) || (last.t === 'cmd' && last.out) || (last.t === 'battle' && last.out && last.out.勝);
  if (!ends) warns.push(`${s.file} 第 ${last.line} 行：場景「${id}」結尾沒有跳轉，播完會直接回到書齋`);

  for (const c of s.cmds) {
    for (const t of targetsOf(c)) {
      reached.add(t);
      if (!scenes[t]) {
        if (c.t === 'cmd' && ['回書齋', '試玩結束', '進度'].includes(c.name)) warns.push(`${at(s, c)}：續玩點「${t}」尚未製作`);
        else errors.push(`${at(s, c)}：找不到場景「${t}」`);
      }
    }
    if (c.t === 'cmd' && ['試玩結束', '進度'].includes(c.name) && c.arg && !scenes[c.arg]) {
      if (c.name === '進度') errors.push(`${at(s, c)}：進度場景「${c.arg}」不存在`);
      else warns.push(`${at(s, c)}：續玩點「${c.arg}」尚未製作`);
    }
    if (c.t === 'say' && c.text === '') warns.push(`${at(s, c)}：對白是空的`);
    if (c.t === 'battle') {
      if (c.mode === '戰鬥' && !D.ENCOUNTERS[c.id]) errors.push(`${at(s, c)}：沒有敵人組「${c.id}」`);
      if (c.mode === '隨機' && !D.POOLS[c.id]) errors.push(`${at(s, c)}：沒有遭遇池「${c.id}」`);
    }
    if (c.t === 'fx') {
      const [a0, a1] = c.args;
      if (!FX.includes(c.kind)) errors.push(`${at(s, c)}：不認識的效果「${c.kind}」`);
      if (c.kind === '道具' && !D.ITEMS[a0]) errors.push(`${at(s, c)}：沒有道具「${a0}」`);
      if (c.kind === '史卷' && !allCodex.has(a0)) errors.push(`${at(s, c)}：沒有史卷條目「${a0}」`);
      if ((c.kind === '隊友' || c.kind === '羈絆') && !D.CHARACTERS[a0]) errors.push(`${at(s, c)}：沒有角色「${a0}」`);
      if (c.kind === '封靈' && !D.ENEMIES[a0]) errors.push(`${at(s, c)}：沒有敵人「${a0}」`);
      if (c.kind === '陣法' && !D.FORMATIONS[a0]) errors.push(`${at(s, c)}：沒有陣法「${a0}」`);
      if (c.kind === '技能' && !D.SKILLS[a1]) errors.push(`${at(s, c)}：沒有技能「${a1}」`);
      if (c.kind === '心印' && !['情', '理', '剛', '柔', '出世', '入世'].includes(a0)) errors.push(`${at(s, c)}：心印軸「${a0}」應為 情/理/剛/柔/出世/入世`);
    }
    if (c.t === 'cmd') {
      if (!CMDS.includes(c.name)) errors.push(`${at(s, c)}：不認識的指令「@${c.name}」`);
      if (c.name === '天氣' && !['雨', '雪', '落花', '火星', '墨', '光', '落紙', '沙', '葉', '塵', '無', '預設'].includes(c.arg)) errors.push(`${at(s, c)}：天氣「${c.arg}」應為 雨／雪／落花／火星／墨／光／落紙／沙／葉／塵／無／預設`);
      if (c.name === '音樂' && !MUSIC.includes(c.arg)) errors.push(`${at(s, c)}：沒有音樂「${c.arg}」`);
      if (c.name === '主題' && !THEMES.includes(c.arg)) errors.push(`${at(s, c)}：沒有主題「${c.arg}」`);
      if (c.name === '商店' && !D.SHOPS[c.arg]) errors.push(`${at(s, c)}：沒有商店「${c.arg}」`);
      if (c.name === '論辯' && !D.DEBATES[c.arg]) errors.push(`${at(s, c)}：沒有論辯「${c.arg}」`);
      if (imgNames.size && (c.name === '背景' || c.name === '插圖') && c.arg && c.arg !== '無' && !imgNames.has(c.arg.split(/\s+/)[0])) warns.push(`${at(s, c)}：圖「${c.arg.split(/\s+/)[0]}」不在生圖清單裡`);
      if (imgNames.size && c.name === '立繪') { const k = c.arg.split(/\s+/)[1]; if (k && k !== '預設' && !imgNames.has(k) && !/_\d+$/.test(k)) warns.push(`${at(s, c)}：頭像「${k}」不在生圖清單裡`); }
      if (c.name === '小遊戲' && !D.TRANSLATE[c.arg.split(/\s+/)[1]]) errors.push(`${at(s, c)}：沒有小遊戲題組「${c.arg}」`);
      if (c.name === '小遊戲' && !['譯字', '牽星', '識字', '透視', '研墨', '電碼', '描字', '修復', '排序'].includes(c.arg.split(/\s+/)[0])) errors.push(`${at(s, c)}：小遊戲種類應為 譯字/牽星/識字/透視/研墨/電碼/描字/修復/排序`);
    }
  }
}

// 資料彼此的參照
for (const [k, e] of Object.entries(D.ENCOUNTERS)) e.enemies.forEach(n => { if (!D.ENEMIES[n]) errors.push(`敵人組 ${k}：沒有敵人「${n}」`); });
for (const [k, p] of Object.entries(D.POOLS)) p.forEach(n => { if (!D.ENCOUNTERS[n]) errors.push(`遭遇池 ${k}：沒有敵人組「${n}」`); });
for (const [k, e] of Object.entries(D.ENEMIES)) {
  e.skills.forEach(([n]) => { if (n !== '攻擊' && !D.SKILLS[n]) errors.push(`敵人 ${k}：沒有技能「${n}」`); });
  (e.drops || []).forEach(([n]) => { if (!D.ITEMS[n]) errors.push(`敵人 ${k}：掉落物「${n}」不存在`); });
}
for (const [k, c] of Object.entries(D.CHARACTERS)) {
  c.skills.forEach(([, n]) => { if (!D.SKILLS[n]) errors.push(`角色 ${k}：沒有技能「${n}」`); });
  if (c.weapon && !D.ITEMS[c.weapon]) errors.push(`角色 ${k}：沒有武器「${c.weapon}」`);
}
for (const r of D.RECIPES) {
  [r.a, r.b].forEach(n => { if (!D.ENEMIES[n]) errors.push(`配方：沒有靈「${n}」`); });
  if (!D.ITEMS[r.m]) errors.push(`配方：沒有素材「${r.m}」`);
  if (r.spirit ? !D.CHARACTERS[r.out] : !D.ITEMS[r.out]) errors.push(`配方：成果「${r.out}」不存在`);
}
for (const [k, sh] of Object.entries(D.SHOPS)) sh.items.forEach(n => { if (!D.ITEMS[n]) errors.push(`商店 ${k}：沒有道具「${n}」`); });
for (const t of D.TALKS) if (!scenes[t.scene]) errors.push(`夜話 ${t.id}：找不到場景「${t.scene}」`);
for (const v of D.VOLUMES) if (v.ready && !scenes[v.start]) errors.push(`${v.id}：找不到開始場景「${v.start}」`);

// 沒有任何地方跳進來的場景
const entries = new Set(['序.開始', ...D.TALKS.map(t => t.scene), ...D.VOLUMES.filter(v => v.ready).map(v => v.start)]);
for (const id in scenes) if (!reached.has(id) && !entries.has(id)) warns.push(`場景「${id}」沒有任何地方會跳到它`);

let chars = 0;
for (const f of files) chars += readFileSync(join(root, f), 'utf8').replace(/^\s*(\/\/|#|@|[+\-＋－]|⚔|◆|→).*$/gm, '').replace(/\s/g, '').length;

console.log(`檢查 ${files.length} 個劇本、${Object.keys(scenes).length} 個場景、約 ${chars.toLocaleString()} 字。`);
warns.forEach(w => console.log('⚠ ' + w));
errors.forEach(e => console.log('✗ ' + e));
if (errors.length) { console.log(`\n發現 ${errors.length} 個錯誤。`); process.exit(1); }
console.log('\n✓ 沒有錯誤。');
