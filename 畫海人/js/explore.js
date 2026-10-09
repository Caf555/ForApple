// 島嶼探索：六角格地圖、霧、補給、格子上的事件
import { ISLANDS, TILE_INFO } from './islands.js';
import { EQUIPS, MATS, PARTY_MAX, FACTIONS, repLevel, repOn, MIST_LAMP } from './data.js';
import { heroStats, makeHero, DIFF, save } from './state.js';
import { survey } from './survey.js';
import { playPuzzle } from './puzzle.js';
import { el, $ } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const R = 40, W = Math.sqrt(3) * R;
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
const pick = a => a[Math.floor(Math.random() * a.length)];

// 尖頂六角格、奇數列往右錯半格
export function neighbors(c, r, def) {
  const odd = r % 2 === 1;
  const d = odd ? [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]] : [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
  return d.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < def.cols && y < def.rows);
}
function cube(c, r) { const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; }
// 從 a 走到 b，再往同一個方向走一格（冰上滑行用）
function ahead(a, b) { const p = cube(...a), q = cube(...b), x = 2 * q[0] - p[0], r = 2 * q[1] - p[1]; return [x + (r - (r & 1)) / 2, r]; }
export function dist(a, b) { const [x1, y1, z1] = cube(...a), [x2, y2, z2] = cube(...b); return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2)); }

// 這座島留下來的紀錄（跨航行保存）
export function worldOf(g, id) { return g.world[id] || (g.world[id] = { cleared: false, good: false, best: 0, surveyed: [], visits: 0 }); }

// 這次上島的路線（紅岬：強攻或正門），沒有的話是 null
export function routeOf(g, id) { const R = ISLANDS[id].routes; return R && g.flags[R.key] ? R.opts[g.flags[R.key]] : null; }
// 看得見的範圍：礦坑很暗，少一格
export function sight(def, lit) { return Math.max(0, (lit ? 2 : 1) - (def.dark ? 1 : 0)); }

export function newIsland(g, id) {
  const def = ISLANDS[id], rec = worldOf(g, id), route = routeOf(g, id);
  const start = route ? route.start : def.start;
  const tiles = [];
  const free = [];
  const kept = new Set(rec.surveyed);
  for (let r = 0; r < def.rows; r++) for (let c = 0; c < def.cols; c++) {
    const edge = r === 0 || c === 0 || r === def.rows - 1 || c === def.cols - 1;
    const t = { c, r, kind: '空', land: edge ? '灘' : '林', seen: false, done: false, surveyed: false };
    const key = `${c},${r}`;
    if (c === start[0] && r === start[1]) { t.kind = '起'; t.done = true; }
    else if (def.fixed[key]) t.kind = def.fixed[key];
    else free.push(t);
    // 以前測繪過的地方，霧吞不回去
    if (kept.has(key)) { t.surveyed = true; t.seen = true; }
    tiles.push(t);
  }
  shuffle(tiles.filter(t => t.land === '林')).slice(0, def.rocks || 3).forEach(t => { t.land = '岩'; });
  const bag = [], pool = { ...def.pool };
  for (const k in (route && route.pool) || {}) pool[k] = Math.max(0, (pool[k] || 0) + route.pool[k]);
  // 母親的足跡：找到過就不會再出現
  if (g.flags['足跡:' + id]) delete pool.跡;
  // 公會的舊圖碎片：找到過就不會再出現
  if (g.flags['碎片:' + id]) delete pool.圖;
  for (const k in pool) for (let i = 0; i < pool[k]; i++) bag.push(k);
  shuffle(free).forEach((t, i) => { t.kind = bag[i] || '空'; if (t.kind === '空') t.done = true; });
  // 火山的地形：熱地（走上去會受傷）、噴氣口（每走三步噴一次）。登陸點、首領、村子、營地、測繪點不會是
  const open = shuffle(tiles.filter(t => !['起', '王', '村', '火', '測'].includes(t.kind) && dist([t.c, t.r], start) > 1));
  open.slice(0, def.hot || 0).forEach(t => { t.land = '熱'; });
  open.slice(def.hot || 0, (def.hot || 0) + (def.vents || 0)).forEach(t => { t.land = '噴'; });
  // 北霧海的冰面：只結在空地上，登陸點旁邊不會有
  const nIce = (def.ice || 0) + ((route && route.ice) || 0);
  shuffle(tiles.filter(t => t.kind === '空' && t.land !== '岩' && t.land !== '熱' && t.land !== '噴' && dist([t.c, t.r], start) > 1)).slice(0, nIce).forEach(t => { t.land = '冰'; });
  // 霧心的空白格：紙還沒畫到的地方。登陸點旁邊、村子、測繪點、首領、霧眼不會是；不會把路完全擋住
  if (def.blank) placeBlank(def, tiles, start, def.blank);
  const isl = { id, tiles, pos: [...start], start: [...start], steps: 0, lit: false, food: 0, events: shuffle(def.events.map((_, i) => i)), boss: false, key: false };
  // 已經完成過的島：首領不在了，門也開著；測繪過的測繪點不用再畫
  if (rec.cleared) { isl.boss = true; isl.key = true; const b = tiles.find(t => t.kind === '王'); b.done = true; }
  // 測繪點：周圍兩圈都已經畫進書裡，才算畫完；上次畫得不夠準的，這次可以重畫
  for (const t of tiles) if (t.kind === '測' && pointDone(tiles, t)) t.done = true;
  reveal(isl, start, Math.max(0, (g.ship && g.ship.船首像 ? 2 : 1) - (def.dark ? 1 : 0)));
  // 從正門進去：巡邏兵（妖物）在哪裡，一開始就看得到
  if (route && route.see) for (const t of tiles) if (t.kind === route.see) t.seen = true;
  // 首領的位置，從一開始就看得見：這是這座島的終點
  tiles.find(t => t.kind === '王').seen = true;
  rec.visits++;
  return isl;
}

function placeBlank(def, tiles, start, n) {
  const at = (c, r) => tiles[r * def.cols + c];
  const can = tiles.filter(t => ['空', '寶', '怪', '？'].includes(t.kind) && !t.surveyed && !['岩', '冰', '熱', '噴'].includes(t.land) && dist([t.c, t.r], start) > 1);
  for (let k = n; k > 0; k--) for (let tries = 0; tries < 40; tries++) {
    const pick = new Set(shuffle(can).slice(0, k));
    // 不是空白的格子，從登陸點都要走得到
    const seen = new Set([start.join(',')]), q = [start];
    while (q.length) { const p = q.shift(); for (const [c, r] of neighbors(...p, def)) { const key = c + ',' + r; if (!seen.has(key) && !pick.has(at(c, r))) { seen.add(key); q.push([c, r]); } } }
    if (seen.size === tiles.length - pick.size) { for (const t of pick) { t.base = t.land; t.land = '白'; } return; }
  }
}

export function pointDone(tiles, t) { return tiles.every(x => x.surveyed || dist([x.c, x.r], [t.c, t.r]) > 2); }
function tileAt(isl, c, r) { return isl.tiles[r * ISLANDS[isl.id].cols + c]; }
function reveal(isl, p, rad) { for (const t of isl.tiles) if (dist([t.c, t.r], p) <= rad) t.seen = true; }
export function surveyPct(isl) { return Math.round(isl.tiles.filter(t => t.surveyed).length * 100 / isl.tiles.length); }
// 這座島最多畫得到多少：每個測繪點都畫到最準（周圍兩圈）的時候
export function surveyMax(id) {
  const def = ISLANDS[id], pts = Object.keys(def.fixed).filter(k => def.fixed[k] === '測').map(k => k.split(',').map(Number));
  let n = 0;
  for (let r = 0; r < def.rows; r++) for (let c = 0; c < def.cols; c++) if (pts.some(p => dist([c, r], p) <= 2)) n++;
  return Math.round(n * 100 / (def.cols * def.rows));
}

export class Explore {
  constructor(ctx) { this.ctx = ctx; }
  get g() { return this.ctx.g; }
  get isl() { return this.g.island; }
  get def() { return ISLANDS[this.isl.id]; }

  show() {
    const def = this.def;
    this.ctx.audio.music('島');
    const s = $('screen'); s.innerHTML = ''; s.className = 'island';
    this.$status = el('div', { class: 'status' });
    this.$party = el('div', { class: 'partybar' });
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'hexmap');
    this.svg.setAttribute('viewBox', `-4 -4 ${def.cols * W + W / 2 + 8} ${def.rows * R * 1.5 + R / 2 + 8}`);
    this.$info = el('div', { class: 'info' });
    this.$lamp = el('button', { class: 'btn small', onclick: () => this.toggleLamp() }, '');
    s.append(
      el('div', { class: 'isl-head' }, el('b', {}, this.isl.id), el('span', { class: 'grow' }), this.$lamp,
        el('button', { class: 'btn small', onclick: () => this.ctx.partySheet() }, '隊伍'),
        el('button', { class: 'icon', 'aria-label': '選單', onclick: () => this.ctx.menu() }, '☰')),
      this.$status, el('div', { class: 'mapwrap' }, this.svg), this.$info, this.$party);
    this.draw();
  }

  // 守霧人的聲望到「夥伴」：點的是灰燈，霧不會回來，也聽得出低語是真是假
  get grey() { return repOn(this.g, '守霧人') && repLevel(this.g.rep.守霧人 || 0) >= MIST_LAMP; }

  toggleLamp() {
    const isl = this.isl;
    if (!isl.lit && this.g.supply.燈油 <= 0) { this.ctx.ui.toast('沒有燈油了。'); return; }
    isl.lit = !isl.lit;
    this.ctx.audio.sfx('tap');
    if (isl.lit) reveal(isl, isl.pos, sight(this.def, true));
    this.draw();
  }

  tileInfo(t) {
    const def = this.def;
    if (t.kind === '王') return { name: def.boss.place, tip: def.boss.tip };
    if (t.kind === '眼') return { name: '霧眼', tip: def.eyeTip };
    return TILE_INFO[t.kind] || TILE_INFO.空;
  }

  draw() {
    const g = this.g, isl = this.isl, def = this.def, svg = this.svg;
    svg.innerHTML = '';
    const nb = neighbors(...isl.pos, def).map(p => p.join(','));
    for (const t of isl.tiles) {
      const x = t.c * W + (t.r % 2 ? W / 2 : 0) + W / 2, y = t.r * R * 1.5 + R;
      const pts = [...Array(6).keys()].map(i => { const a = Math.PI / 180 * (60 * i - 30); return `${(x + R * 0.96 * Math.cos(a)).toFixed(1)},${(y + R * 0.96 * Math.sin(a)).toFixed(1)}`; }).join(' ');
      const here = t.c === isl.pos[0] && t.r === isl.pos[1];
      const can = nb.includes(`${t.c},${t.r}`);
      const grp = document.createElementNS(NS, 'g');
      grp.setAttribute('class', 'hex' + (t.seen ? ' seen land-' + t.land : ' fog') + (t.surveyed ? ' surveyed' : '') + (here ? ' here' : '') + (can ? ' can' : ''));
      const poly = document.createElementNS(NS, 'polygon'); poly.setAttribute('points', pts); grp.append(poly);
      const vent = t.seen && t.land === '噴' && !here && (t.done || t.kind === '空') && t.kind !== '起' && t.kind !== '村';
      const label = here || vent ? '' : !t.seen || t.land === '白' ? '' : t.kind === '王' ? def.boss.label[isl.key ? 1 : 0] : t.done && t.kind !== '村' && t.kind !== '起' ? '·' : t.kind === '空' ? '' : t.kind;
      if (label) { const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', x); tx.setAttribute('y', y + 7); tx.setAttribute('class', 'k k-' + t.kind + (t.done ? ' done' : '')); tx.textContent = label; grp.append(tx); }
      if (vent) { const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', x); tx.setAttribute('y', y + 5); tx.setAttribute('class', 'vent'); tx.textContent = (isl.steps + 1) % 3 === 0 ? '噴！' : '煙'; grp.append(tx); }
      if (t.land === '噴' && (isl.steps + 1) % 3 === 0) grp.classList.add('erupt');
      if (here) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 15); c.setAttribute('class', 'me'); grp.append(c); const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', x); tx.setAttribute('y', y + 6); tx.setAttribute('class', 'me-t'); tx.textContent = this.ctx.ui.fmt('{名}').slice(0, 1); grp.append(tx); }
      grp.setAttribute('data-c', t.c); grp.setAttribute('data-r', t.r);
      if (can) grp.addEventListener('click', () => this.move(t));
      svg.append(grp);
    }
    // 狀態列
    const s = g.supply;
    this.$status.innerHTML = '';
    this.$status.append(...[['糧', s.糧], ['燈油', s.燈油], ['墨水', s.墨水], ['銀貝', g.silver], ['士氣', g.morale], [surveyPct(isl) >= surveyMax(isl.id) ? '測繪滿' : '測繪', surveyPct(isl) + '%']].map(([k, v]) =>
      el('span', { class: 'st' + (k === '糧' && v <= 3 ? ' low' : '') }, el('small', {}, k), el('b', {}, String(v)))));
    this.$lamp.textContent = isl.lit ? '熄燈' : this.grey ? '點灰燈' : '點燈';
    this.$lamp.classList.toggle('on', isl.lit);
    this.$party.innerHTML = '';
    const team = g.party.filter(h => !h.bench);
    this.$party.classList.toggle('four', team.length > 3);
    for (const h of team) {
      const st = heroStats(h);
      this.$party.append(el('div', { class: 'pm' + (h.hp <= 0 ? ' down' : '') }, el('b', {}, this.ctx.ui.fmt(h.key === '墨里' ? '{名}' : h.key), el('small', {}, ` Lv${h.lv}`)), this.ctx.ui.bar(h.hp, st.hp, 'hp'), this.ctx.ui.bar(h.mp, st.mp, 'mp')));
    }
    const cur = tileAt(isl, ...isl.pos);
    const info = this.tileInfo(cur);
    this.$info.innerHTML = '';
    const pct = surveyPct(isl), max = surveyMax(isl.id), full = pct >= max;
    const goal = isl.boss ? (worldOf(g, isl.id).cleared && !isl.bossNow ? `這座島已經完成了。${full ? '' : '可以繼續測繪、'}找素材，回到登陸點就能返航。` : def.goal.done) : isl.key ? def.goal.key : def.goal.none;
    this.$info.append(...[el('p', { class: 'goal' }, goal),
      el('p', {}, cur.kind === '起' ? '船停在登陸點。點旁邊的格子前進；每走一格吃掉 1 份糧。' : info.name ? `${info.name}：${cur.done ? '已經處理過了。' : info.tip}` : '霧裡什麼都沒有。點旁邊的格子繼續前進。'),
      el('p', { class: 'muted' }, full ? `測繪度 ${pct}%：這座島已經畫滿了（最高就是 ${max}%），測繪點不會再出現。` : `測繪度 ${pct}%，這座島最高可以畫到 ${max}%。`),
      el('p', { class: 'muted' }, (isl.lit ? '燈亮著：看得更遠、霧中不會打偏；每走一格用掉 1 份燈油。' : '點燈可以看得更遠（每走一格用 1 份燈油）。') + (def.dark ? def.darkTip || '這裡很暗，看得見的範圍比較小。' : '') + (isl.lit && this.grey ? '點的是守霧人的灰燈：霧不會回來，也聽得出低語是真是假。' : '')),
      def.ice ? el('p', { class: 'muted' }, '淡藍色的格子結了冰：走上去會一直往同一個方向滑，滑到冰的盡頭才停。滑行不吃糧。') : null,
      def.blank ? el('p', { class: 'muted' }, '白色的格子是「空白」：紙還沒畫到的地方。點它，花 1 份墨水畫成路，才走得過去。空白後面，有時候藏著東西。') : null,
      def.hot || def.vents ? el('p', { class: 'muted' }, (def.hot ? '發紅的格子是熱地：走上去，全隊會掉一點體力。' : '') + (def.vents ? `噴氣口每走三步噴一次火：寫著「噴！」的時候，下一步不要踩上去。` : '')) : null].filter(Boolean));
    if (cur.kind === '村') this.$info.append(el('button', { class: 'btn small', onclick: () => this.village() }, '進村子'));
    if (cur.kind === '起') this.$info.append(el('button', { class: 'btn small' + (isl.boss ? ' primary' : ''), onclick: () => this.sailHome(!isl.boss) }, isl.boss ? '返航' : '先回港口'));
  }

  async move(t) {
    const g = this.g, isl = this.isl, diff = DIFF[g.diff] || DIFF.標準;
    if (this.busy) return;
    // 空白格：花 1 份墨水，把它畫成路
    if (t.land === '白') {
      this.busy = true;
      const ok = g.supply.墨水 >= 1;
      const i = await this.ctx.ui.choose('空白', ['這一格什麼都沒有，像紙還沒畫到的地方。', ok ? '要用 1 份墨水，把它畫成路嗎？' : '要用墨水才能把它畫成路，可是你們的墨水用完了。'], [{ label: '畫成路（墨水 1）', disabled: !ok }, { label: '先不要' }]);
      this.busy = false;
      if (i !== 0) return;
      g.supply.墨水--; t.land = t.base || '林'; t.drawn = true; t.seen = true;
      this.ctx.audio.sfx('pen');
      this.ctx.ui.toast(t.kind === '空' ? '筆尖畫過的地方，變成了一條路。' : '畫出來的路上，好像有什麼東西……');
    }
    this.busy = true;
    let from = [...isl.pos];
    isl.pos = [t.c, t.r];
    isl.steps++; g.stats.steps++;
    this.ctx.audio.sfx('step');
    // 糧食
    isl.food += diff.food;
    while (isl.food >= 1) {
      isl.food -= 1;
      if (g.supply.糧 > 0) g.supply.糧--;
      else {
        for (const h of g.party) { const st = heroStats(h); if (h.hp > 0) h.hp = Math.max(1, h.hp - Math.round(st.hp * 0.08)); }
        g.morale = Math.max(0, g.morale - 4);
        this.ctx.ui.toast('沒有糧食了。大家又餓又累……');
      }
    }
    // 燈油
    if (isl.lit) { g.supply.燈油--; if (g.supply.燈油 <= 0) { g.supply.燈油 = 0; isl.lit = false; this.ctx.ui.toast('燈油用完了，燈熄了。'); } }
    const wasSeen = t.seen;
    reveal(isl, isl.pos, sight(this.def, isl.lit));
    // 冰面：一直往同一個方向滑，滑到不是冰的地方（或撞到岩石、地圖邊緣）才停。滑行不吃糧
    let slid = 0;
    while (t.land === '冰') {
      const [nc, nr] = ahead(from, [t.c, t.r]);
      if (nc < 0 || nr < 0 || nc >= this.def.cols || nr >= this.def.rows) break;
      const n = tileAt(isl, nc, nr);
      if (n.land === '岩' || n.land === '白') break;
      from = [t.c, t.r]; t = n; isl.pos = [t.c, t.r]; slid++;
      reveal(isl, isl.pos, sight(this.def, isl.lit));
    }
    if (slid) { this.ctx.ui.toast(`冰面好滑！一口氣滑了 ${slid} 格。`); this.ctx.audio.sfx('tide'); }
    // 火山的地形
    const burn = t.land === '熱' ? 0.06 : t.land === '噴' && isl.steps % 3 === 0 ? 0.15 : 0;
    if (burn) {
      for (const h of g.party) { const st = heroStats(h); if (h.hp > 0) h.hp = Math.max(1, h.hp - Math.round(st.hp * burn)); }
      this.ctx.ui.toast(t.land === '熱' ? '腳底下的石頭好燙！全隊受了一點傷。' : '噴氣口噴出了火！全隊被燙傷了。');
      this.ctx.audio.sfx('hit');
    }
    if (!wasSeen) this.ctx.audio.sfx('pen');
    // 霧會回來
    if (diff.fogBack && !(isl.lit && this.grey) && isl.steps % (g.diff === '困難' ? 5 : 7) === 0) {
      const back = isl.tiles.filter(x => x.seen && !x.surveyed && !x.drawn && x.kind !== '起' && x.kind !== '王' && dist([x.c, x.r], isl.pos) >= 2);
      if (back.length) { const x = pick(back); x.seen = false; this.ctx.ui.toast('霧，吞回了一格。只有測繪過的地方，才不會被吞掉。'); this.ctx.audio.sfx('whisper'); }
    }
    else if (!isl.lit && Math.random() < 0.18) { this.ctx.ui.toast(pick(this.def.whispers)); this.ctx.audio.sfx('whisper'); }
    this.draw();
    save(g);
    if (!t.done) await this.enter(t, from);
    else if (t.kind === '起' && isl.boss) await this.sailHome(true);
    this.busy = false;
    if (this.g && this.g.phase === 'island') { this.draw(); save(this.g); }
  }

  terrainOf(t) { return t.land === '灘' ? '潮間帶' : t.land === '岩' ? '高地' : this.isl.lit ? '林' : Math.random() < 0.5 ? '林' : '霧中'; }

  async fight(t, from, enemies, kind) {
    const g = this.g;
    const snap = g.party.map(h => [h.hp, h.mp]), morale = g.morale, supply = { ...g.supply };
    let lost = 0;
    for (;;) {
      g.stats.battles++;
      const r = await this.ctx.battle.start({ enemies, terrain: this.terrainOf(t), lit: this.isl.lit, kind });
      this.ctx.audio.music('島');
      if (r === 'win') return true;
      if (r === 'flee') { this.isl.pos = from; return false; }
      lost++;
      const weak = g.party.reduce((a, h) => a + snap[g.party.indexOf(h)][0] / heroStats(h).hp, 0) / g.party.length < 0.6;
      const tip = lost >= 2 || weak ? ['重新挑戰的話，大家會回到「這場戰鬥開始前」的樣子' + (weak ? '——可是那時候大家就已經很累了。' : '。'), '打不贏的時候，可以先退回去：在營火休息、用藥草和海靈露，或回到登陸點先回港口，打造更好的裝備再來。'] : [];
      const i = await this.ctx.ui.choose('被霧吞沒了……', ['眼前的一切，慢慢變白。', ...tip], [{ label: '重新挑戰這場戰鬥' }, { label: '退回上一格（全隊只剩一點點體力）' }]);
      if (i === 0) { g.party.forEach((h, k) => { if (snap[k]) [h.hp, h.mp] = snap[k]; }); g.morale = morale; g.supply = supply; continue; }
      g.party.forEach(h => { h.hp = Math.max(1, Math.round(heroStats(h).hp * 0.15)); });
      g.morale = Math.max(0, morale - 10);
      this.isl.pos = from;
      return false;
    }
  }

  // 有沒有足夠的東西付得起事件選項（負數的部分）
  canPay(fx) {
    const g = this.g;
    return Object.entries(fx || {}).every(([k, v]) => v >= 0 || k === 'hp' || k === '士氣' || FACTIONS.includes(k) || (k === '銀貝' ? g.silver >= -v : MATS[k] ? (g.mats[k] || 0) >= -v : (g.supply[k] || 0) >= -v));
  }

  // 寶箱：一樣補給、一些素材，有時候還有圖紙
  chest() {
    const g = this.g, def = this.def, got = [];
    const loot = [() => { const n = 15 + Math.floor(Math.random() * 16); g.silver += n; return `銀貝 ${n}`; }, () => { g.supply.燈油 += 2; return '燈油 2'; }, () => { g.supply.墨水 += 2; return '墨水 2'; },
      () => { g.supply.藥草 += 2; return '藥草 2'; }, () => { g.supply.糧 += 4; return '糧 4'; }, () => { g.supply.海靈露 = (g.supply.海靈露 || 0) + 2; return '海靈露 2'; }, () => { g.supply.醒神香 += 1; return '醒神香 1'; }];
    got.push(pick(loot)());
    const m = pick(def.mats), n = 1 + Math.floor(Math.random() * 2);
    this.ctx.gainMat(m, n); got.push(`${m} ${n}`);
    const bp = Math.random() < 0.35 && this.ctx.newBlueprint(def.bps);
    if (bp) got.push(`圖紙「${bp}」`);
    return got;
  }

  async enter(t, from) {
    const g = this.g, ui = this.ctx.ui, isl = this.isl, def = this.def;
    switch (t.kind) {
      case '怪': {
        const depth = dist([t.c, t.r], isl.start || def.start), E = def.encounters;
        const pool = E.slice(Math.min(E.length - 4, Math.max(0, (depth - 1) * 2)), Math.min(E.length, depth * 3 + 2));
        if (await this.fight(t, from, pick(pool), '一般')) t.done = true;
        break;
      }
      case '眼':
        if (await this.fight(t, from, def.elite.foes, '精英')) {
          t.done = true; reveal(isl, [t.c, t.r], 2);
          if (!isl.key) { isl.key = true; await ui.alert('霧眼', def.elite.lines); }
          else await ui.alert('霧眼', ['守門的東西沉回了霧裡。周圍的霧，一口氣散開了。']);
        }
        break;
      case '寶': {
        const got = this.chest();
        this.ctx.audio.sfx('item');
        await ui.alert('寶箱', [`箱子裡有：${got.join('、')}`]);
        t.done = true;
        break;
      }
      case '？': {
        const ev = def.events[isl.events.shift() ?? Math.floor(Math.random() * def.events.length)];
        const i = await ui.choose(ev.title, ev.text, ev.opts.map(o => ({ label: o.label, disabled: !this.canPay(o.fx) })));
        const o = ev.opts[i];
        this.ctx.applyFx(o.fx);
        await ui.alert(ev.title, [o.line, this.ctx.fxText(o.fx)].filter(Boolean));
        t.done = true;
        break;
      }
      case '火': {
        const i = await ui.choose('營地', ['一塊避風的岩石後面，有前人留下的火堆。', '生火要用掉 2 份糧食（煮一頓熱的）。'], [{ label: '生火休息（糧 2）', disabled: g.supply.糧 < 2 }, { label: '不休息，繼續走' }]);
        if (i === 0) {
          g.supply.糧 -= 2;
          for (const h of g.party) { const st = heroStats(h); h.hp = Math.max(h.hp, Math.min(st.hp, h.hp + Math.round(st.hp * 0.6))); h.mp = Math.min(st.mp, h.mp + Math.round(st.mp * 0.6)); }
          g.morale = Math.min(100, g.morale + 10);
          this.ctx.audio.sfx('heal');
          const has = k => g.party.some(h => h.key === k && !h.bench);
          const talks = def.camp.map(c => Array.isArray(c) ? { lines: c } : c).filter(c => !c.need || has(c.need));
          await ui.alert('營火', [...(talks.length ? pick(talks).lines : ['大家圍著火堆，安靜地吃完了一頓熱的。']), '（全隊回復了 60%，士氣 +10）']);
          t.done = true;
        }
        break;
      }
      case '村': await this.village(); break;
      case '聲': {
        // 霧中的低語：真的會指出寶箱或霧眼的位置，假的會把你們引進埋伏
        const route = routeOf(g, isl.id);
        const m = pick((def.murmurs || []).filter(x => !(route && route.truth) || x.truth));
        g.heard = g.heard || [];
        if (!g.heard.includes(m.text)) g.heard.push(m.text);
        const hint = isl.lit && this.grey ? (m.truth ? '灰燈的火很穩。這個聲音，說的是真話。' : '灰燈的火晃了一下。這個聲音，在說謊。') : '是真的線索，還是陷阱？';
        const i = await ui.choose('霧裡的低語', ['霧裡，有一個聲音在耳邊說：', m.text, hint], [{ label: '跟著聲音走' }, { label: '不理它' }]);
        if (i === 0 && m.truth) {
          const goal = isl.tiles.filter(x => !x.seen && !x.done && (x.kind === '寶' || x.kind === '眼')).sort((a, b) => dist([a.c, a.r], [t.c, t.r]) - dist([b.c, b.r], [t.c, t.r]))[0];
          if (goal) reveal(isl, [goal.c, goal.r], 1);
          const fx = pick([{ 燈油: 1 }, { 糧: 2 }, { 墨水: 1 }, { 藥草: 1 }]);
          this.ctx.applyFx(fx);
          this.ctx.audio.sfx('item');
          await ui.alert('霧裡的低語', [goal ? `聲音說的是真的。霧散開了一塊：那裡有${goal.kind === '寶' ? '一個寶箱' : '霧眼'}。` : '聲音說的是真的。', '路上撿到了一點東西。' + this.ctx.fxText(fx)]);
        } else if (i === 0) {
          await ui.alert('霧裡的低語', ['聲音越來越近……是陷阱！霧裡的東西撲了上來。']);
          if (!(await this.fight(t, from, pick(def.encounters.slice(-5)), '一般'))) break;
        } else await ui.alert('霧裡的低語', ['你們沒有理它。聲音在霧裡繞了幾圈，慢慢地消失了。', '（聽過的低語，記在選單的「霧裡的低語」）']);
        t.done = true;
        break;
      }
      case '跡': {
        // 母親的足跡：每座島一個，四個都找到，第四章的結尾會多一個畫面
        g.flags['足跡:' + isl.id] = 1;
        g.supply.墨水 += 2; g.morale = Math.min(100, g.morale + 8);
        this.ctx.audio.sfx('pen');
        await ui.story(this.ctx.storyLines(def.trace));
        const all = Object.keys(ISLANDS).filter(k => ISLANDS[k].trace), got = all.filter(k => g.flags['足跡:' + k]).length;
        await ui.alert('母親的足跡', [`找到了 ${got}／${all.length} 個星形的記號。（墨水 +2、士氣 +8）`, got >= all.length ? '母親留下的記號，全部都找到了。' : '其他的島上，可能還有。']);
        t.done = true;
        break;
      }
      case '圖': {
        // 公會的舊圖碎片：每座島一張，是五十年前公會長畫的
        g.flags['碎片:' + isl.id] = 1;
        g.supply.墨水 += 2; g.morale = Math.min(100, g.morale + 8);
        this.ctx.audio.sfx('pen');
        await ui.story(this.ctx.storyLines(def.fragment));
        const all = Object.keys(ISLANDS).filter(k => ISLANDS[k].fragment), got = all.filter(k => g.flags['碎片:' + k]).length;
        await ui.alert('公會的舊圖碎片', [`找到了 ${got} 張公會長留下的舊圖碎片。（墨水 +2、士氣 +8）`, '霧心的其他島上，可能還有。']);
        t.done = true;
        break;
      }
      case '遺': {
        // 遺跡小遊戲：解開了多拿獎勵；解不開也看得到字（首領弱點不會卡關）。解開過的，之後直接看字
        const R = def.ruin, G = R.game;
        if (G && !g.flags['謎:' + isl.id]) {
          const i = await ui.choose(R.title, [...G.intro, '解開的話，可以多拿到一些東西。解不開也沒關係，還是看得到字。'], [{ label: '試試看' }, { label: '先不要' }]);
          if (i !== 0) break;
          const win = await playPuzzle(this.ctx, G.kind, isl.id);
          if (win) { g.flags['謎:' + isl.id] = 1; this.ctx.applyFx(G.reward); }
          await ui.alert(R.title, [...R.text, R.line, win ? '解開了遺跡的謎題！' + this.ctx.fxText(G.reward) : '謎題沒有解開，沒拿到獎勵。字還是勉強看得出來。下次再來這座島，可以再試一次。']);
        } else await ui.alert(R.title, [...R.text, R.line]);
        g.flags['遺跡:' + isl.id] = 1; t.done = true;
        break;
      }
      case '測': {
        if (g.supply.墨水 < 2) { await ui.alert('測繪點', ['這裡看得見很長的一段海岸線。', '可是測繪要用 2 份墨水，你們的墨水不夠。（寶箱、事件、村子可能找得到）']); break; }
        const again = t.surveyed ? ['上次在這裡畫得不夠準，周圍還有沒畫進書裡的地方。這次可以重畫，畫得更準就能補上。'] : [];
        const i = await ui.choose('測繪點', ['這裡看得見很長的一段海岸線。', ...again, '要在這裡測繪嗎？（墨水 2）測繪過的格子，霧就吞不回去，下次再來也會留著。'], [{ label: '測繪' }, { label: '先不要' }]);
        if (i !== 0) break;
        g.supply.墨水 -= 2;
        const score = await survey(this.ctx, isl.id);
        const rad = (score >= 50 ? 1 : 0) + (score >= 85 ? 1 : 0);
        for (const x of isl.tiles) if (dist([x.c, x.r], [t.c, t.r]) <= rad) { x.surveyed = true; x.seen = true; }
        if (score >= 70) reveal(isl, [t.c, t.r], 2);
        t.done = true;
        this.record();
        await ui.alert('測繪完成', [`測繪得分：${score}`, score >= 85 ? '畫得非常準！周圍兩圈的土地，都被畫進了書裡。' : score >= 50 ? '周圍一圈的土地，被畫進了書裡。' : '畫得有點歪……只有這一格留在書裡。', `目前測繪度：${surveyPct(isl)}%`, surveyPct(isl) >= surveyMax(isl.id) ? `這座島已經畫到最完整了（最高 ${surveyMax(isl.id)}%），不用再測繪。` : `這座島最高可以畫到 ${surveyMax(isl.id)}%。`]);
        break;
      }
      case '王': {
        const B = def.boss;
        if (!isl.key) { await ui.alert(B.place, B.locked); isl.pos = from; break; }
        const i = await ui.choose(B.place, B.enter, [{ label: `進入${B.place}` }, { label: '再準備一下' }]);
        if (i !== 0) { isl.pos = from; break; }
        await ui.story(this.ctx.storyLines(B.intro));
        if (await this.fight(t, from, B.foes, '首領')) {
          t.done = true; isl.boss = true; isl.bossNow = true;
          const picks = await ui.story(this.ctx.storyLines(B.down));
          if (B.pick && picks.length) g.flags[B.pick] = picks[0];
          const bp = this.ctx.newBlueprint(def.bps);
          await ui.alert(B.place, [bp ? `（得到圖紙「${bp}」。回港以後，可以請鐵匠打造）` : '', '這座島的首領倒下了。', `現在可以繼續探索、測繪，回到登陸點（「起」）就能返航。目前測繪度 ${surveyPct(isl)}%：60% 以上，結局會不一樣。`].filter(Boolean));
        }
        break;
      }
    }
  }

  // 把測繪過的格子記下來，下次再來還會在
  record() {
    const rec = worldOf(this.g, this.isl.id);
    rec.surveyed = this.isl.tiles.filter(t => t.surveyed).map(t => `${t.c},${t.r}`);
    rec.best = Math.max(rec.best, surveyPct(this.isl));
  }

  async sailHome(ask) {
    const isl = this.isl, ui = this.ctx.ui, def = this.def, rec = worldOf(this.g, isl.id);
    const pct = surveyPct(isl);
    if (ask) {
      const lines = isl.boss
        ? ['船還在這裡等著。', `目前測繪度 ${pct}%${pct >= 60 || rec.good ? '' : '（60% 以上，結局會不一樣）'}。要返航嗎？`]
        : ['船還在這裡等著。', `${def.boss.place}裡的首領還沒有打倒。現在回港口的話，這次航行就先到這裡。`, '測繪過的地方會留在書裡；下次再來，島上其他的東西都會變。'];
      const i = await ui.choose('登陸點', lines, [{ label: isl.boss ? '返航' : '先回港口' }, { label: '再探索一下' }]);
      if (i !== 0) return;
    }
    this.record();
    let ending = null;
    // 第一次打倒首領，或是這次測繪度夠了、可以看到更好的結局
    if (isl.bossNow || (isl.boss && !rec.good && pct >= 60)) {
      const good = pct >= 60;
      ending = good ? 'good' : 'plain';
      await ui.story(this.ctx.storyLines(def.endings[ending].lines));
      const first = !rec.cleared;
      rec.cleared = true;
      if (good) rec.good = true;
      return this.ctx.backToPort({ island: isl.id, ending, first, pct });
    }
    this.ctx.backToPort({ island: isl.id, ending: null, first: false, pct });
  }

  async village() {
    const g = this.g, ui = this.ctx.ui, V = this.def.village;
    const t = tileAt(this.isl, ...this.isl.pos);
    if (!t.met) {
      t.met = true;
      await ui.alert(V.title, V.text);
      if (V.recruit && !g.party.some(h => h.key === V.recruit)) {
        await ui.story(V.recruitStory);
        await this.ctx.recruit(V.recruit);
        this.draw();
      }
    }
    ui.sheet('村子的小店', (body, api) => {
      body.append(el('p', { class: 'muted' }, `銀貝：${g.silver}`));
      for (const [k, [n, price]] of Object.entries(V.shop)) {
        body.append(el('div', { class: 'shop-row' }, el('span', {}, `${k} ×${n}`), el('button', { class: 'btn small', disabled: g.silver < price, onclick: () => { g.silver -= price; g.supply[k] = (g.supply[k] || 0) + n; this.ctx.audio.sfx('item'); api.rebuild(); this.draw(); } }, `${price} 銀貝`)));
      }
    });
  }
}
