// 島嶼探索：六角格地圖、霧、補給、格子上的事件
import { ISLANDS, TILE_INFO } from './islands.js';
import { EQUIPS, MATS, PARTY_MAX } from './data.js';
import { heroStats, makeHero, DIFF, save } from './state.js';
import { survey } from './survey.js';
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
export function dist(a, b) { const [x1, y1, z1] = cube(...a), [x2, y2, z2] = cube(...b); return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2)); }

// 這座島留下來的紀錄（跨航行保存）
export function worldOf(g, id) { return g.world[id] || (g.world[id] = { cleared: false, good: false, best: 0, surveyed: [], visits: 0 }); }

export function newIsland(g, id) {
  const def = ISLANDS[id], rec = worldOf(g, id);
  const tiles = [];
  const free = [];
  const kept = new Set(rec.surveyed);
  for (let r = 0; r < def.rows; r++) for (let c = 0; c < def.cols; c++) {
    const edge = r === 0 || c === 0 || r === def.rows - 1 || c === def.cols - 1;
    const t = { c, r, kind: '空', land: edge ? '灘' : '林', seen: false, done: false, surveyed: false };
    const key = `${c},${r}`;
    if (c === def.start[0] && r === def.start[1]) { t.kind = '起'; t.done = true; }
    else if (def.fixed[key]) t.kind = def.fixed[key];
    else free.push(t);
    // 以前測繪過的地方，霧吞不回去
    if (kept.has(key)) { t.surveyed = true; t.seen = true; }
    tiles.push(t);
  }
  shuffle(tiles.filter(t => t.land === '林')).slice(0, def.rocks || 3).forEach(t => { t.land = '岩'; });
  const bag = [];
  for (const k in def.pool) for (let i = 0; i < def.pool[k]; i++) bag.push(k);
  shuffle(free).forEach((t, i) => { t.kind = bag[i] || '空'; if (t.kind === '空') t.done = true; });
  const isl = { id, tiles, pos: [...def.start], steps: 0, lit: false, food: 0, events: shuffle(def.events.map((_, i) => i)), boss: false, key: false };
  // 已經完成過的島：首領不在了，門也開著；測繪過的測繪點不用再畫
  if (rec.cleared) { isl.boss = true; isl.key = true; const b = tiles.find(t => t.kind === '王'); b.done = true; }
  for (const t of tiles) if (t.kind === '測' && t.surveyed) t.done = true;
  reveal(isl, def.start, g.ship && g.ship.船首像 ? 2 : 1);
  // 首領的位置，從一開始就看得見：這是這座島的終點
  tiles.find(t => t.kind === '王').seen = true;
  rec.visits++;
  return isl;
}

function tileAt(isl, c, r) { return isl.tiles[r * ISLANDS[isl.id].cols + c]; }
function reveal(isl, p, rad) { for (const t of isl.tiles) if (dist([t.c, t.r], p) <= rad) t.seen = true; }
export function surveyPct(isl) { return Math.round(isl.tiles.filter(t => t.surveyed).length * 100 / isl.tiles.length); }

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

  toggleLamp() {
    const isl = this.isl;
    if (!isl.lit && this.g.supply.燈油 <= 0) { this.ctx.ui.toast('沒有燈油了。'); return; }
    isl.lit = !isl.lit;
    this.ctx.audio.sfx('tap');
    if (isl.lit) reveal(isl, isl.pos, 2);
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
      const label = here ? '' : !t.seen ? '' : t.kind === '王' ? def.boss.label[isl.key ? 1 : 0] : t.done && t.kind !== '村' && t.kind !== '起' ? '·' : t.kind === '空' ? '' : t.kind;
      if (label) { const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', x); tx.setAttribute('y', y + 7); tx.setAttribute('class', 'k k-' + t.kind + (t.done ? ' done' : '')); tx.textContent = label; grp.append(tx); }
      if (here) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 15); c.setAttribute('class', 'me'); grp.append(c); const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', x); tx.setAttribute('y', y + 6); tx.setAttribute('class', 'me-t'); tx.textContent = this.ctx.ui.fmt('{名}').slice(0, 1); grp.append(tx); }
      grp.setAttribute('data-c', t.c); grp.setAttribute('data-r', t.r);
      if (can) grp.addEventListener('click', () => this.move(t));
      svg.append(grp);
    }
    // 狀態列
    const s = g.supply;
    this.$status.innerHTML = '';
    this.$status.append(...[['糧', s.糧], ['燈油', s.燈油], ['墨水', s.墨水], ['銀貝', g.silver], ['士氣', g.morale], ['測繪', surveyPct(isl) + '%']].map(([k, v]) =>
      el('span', { class: 'st' + (k === '糧' && v <= 3 ? ' low' : '') }, el('small', {}, k), el('b', {}, String(v)))));
    this.$lamp.textContent = isl.lit ? '熄燈' : '點燈';
    this.$lamp.classList.toggle('on', isl.lit);
    this.$party.innerHTML = '';
    this.$party.classList.toggle('four', g.party.length > 3);
    for (const h of g.party) {
      const st = heroStats(h);
      this.$party.append(el('div', { class: 'pm' + (h.hp <= 0 ? ' down' : '') }, el('b', {}, this.ctx.ui.fmt(h.key === '墨里' ? '{名}' : h.key), el('small', {}, ` Lv${h.lv}`)), this.ctx.ui.bar(h.hp, st.hp, 'hp'), this.ctx.ui.bar(h.mp, st.mp, 'mp')));
    }
    const cur = tileAt(isl, ...isl.pos);
    const info = this.tileInfo(cur);
    this.$info.innerHTML = '';
    const goal = isl.boss ? (worldOf(g, isl.id).cleared && !isl.bossNow ? `這座島已經完成了。可以繼續測繪、找素材，回到登陸點就能返航。` : def.goal.done) : isl.key ? def.goal.key : def.goal.none;
    this.$info.append(el('p', { class: 'goal' }, goal),
      el('p', {}, cur.kind === '起' ? '船停在登陸點。點旁邊的格子前進；每走一格吃掉 1 份糧。' : info.name ? `${info.name}：${cur.done ? '已經處理過了。' : info.tip}` : '霧裡什麼都沒有。點旁邊的格子繼續前進。'),
      el('p', { class: 'muted' }, isl.lit ? '燈亮著：看得更遠、霧中不會打偏；每走一格用掉 1 份燈油。' : '點燈可以看得更遠（每走一格用 1 份燈油）。'));
    if (cur.kind === '村') this.$info.append(el('button', { class: 'btn small', onclick: () => this.village() }, '進村子'));
    if (cur.kind === '起') this.$info.append(el('button', { class: 'btn small' + (isl.boss ? ' primary' : ''), onclick: () => this.sailHome(!isl.boss) }, isl.boss ? '返航' : '先回港口'));
  }

  async move(t) {
    const g = this.g, isl = this.isl, diff = DIFF[g.diff] || DIFF.標準;
    if (this.busy) return;
    this.busy = true;
    const from = [...isl.pos];
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
    reveal(isl, isl.pos, isl.lit ? 2 : 1);
    if (!wasSeen) this.ctx.audio.sfx('pen');
    // 霧會回來
    if (diff.fogBack && isl.steps % (g.diff === '困難' ? 5 : 7) === 0) {
      const back = isl.tiles.filter(x => x.seen && !x.surveyed && x.kind !== '起' && x.kind !== '王' && dist([x.c, x.r], isl.pos) >= 2);
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
    for (;;) {
      g.stats.battles++;
      const r = await this.ctx.battle.start({ enemies, terrain: this.terrainOf(t), lit: this.isl.lit, kind });
      this.ctx.audio.music('島');
      if (r === 'win') return true;
      if (r === 'flee') { this.isl.pos = from; return false; }
      const i = await this.ctx.ui.choose('被霧吞沒了……', ['眼前的一切，慢慢變白。'], [{ label: '重新挑戰這場戰鬥' }, { label: '退回上一格（全隊只剩一點點體力）' }]);
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
    return Object.entries(fx || {}).every(([k, v]) => v >= 0 || k === 'hp' || k === '士氣' || (k === '銀貝' ? g.silver >= -v : MATS[k] ? (g.mats[k] || 0) >= -v : (g.supply[k] || 0) >= -v));
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
        const depth = dist([t.c, t.r], def.start), E = def.encounters;
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
          const has = k => g.party.some(h => h.key === k);
          const talks = def.camp.map(c => Array.isArray(c) ? { lines: c } : c).filter(c => !c.need || has(c.need));
          await ui.alert('營火', [...pick(talks).lines, '（全隊回復了 60%，士氣 +10）']);
          t.done = true;
        }
        break;
      }
      case '村': await this.village(); break;
      case '遺':
        await ui.alert(def.ruin.title, [...def.ruin.text, def.ruin.line]);
        g.flags['遺跡:' + isl.id] = 1; t.done = true;
        break;
      case '測': {
        if (g.supply.墨水 < 2) { await ui.alert('測繪點', ['這裡看得見很長的一段海岸線。', '可是測繪要用 2 份墨水，你們的墨水不夠。（寶箱、事件、村子可能找得到）']); break; }
        const i = await ui.choose('測繪點', ['這裡看得見很長的一段海岸線。', '要在這裡測繪嗎？（墨水 2）測繪過的格子，霧就吞不回去，下次再來也會留著。'], [{ label: '測繪' }, { label: '先不要' }]);
        if (i !== 0) break;
        g.supply.墨水 -= 2;
        const score = await survey(this.ctx, isl.id);
        const rad = (score >= 50 ? 1 : 0) + (score >= 85 ? 1 : 0);
        for (const x of isl.tiles) if (dist([x.c, x.r], [t.c, t.r]) <= rad) { x.surveyed = true; x.seen = true; }
        if (score >= 70) reveal(isl, [t.c, t.r], 2);
        t.done = true;
        this.record();
        await ui.alert('測繪完成', [`測繪得分：${score}`, score >= 85 ? '畫得非常準！周圍兩圈的土地，都被畫進了書裡。' : score >= 50 ? '周圍一圈的土地，被畫進了書裡。' : '畫得有點歪……只有這一格留在書裡。', `目前測繪度：${surveyPct(isl)}%`]);
        break;
      }
      case '王': {
        const B = def.boss;
        if (!isl.key) { await ui.alert(B.place, B.locked); isl.pos = from; break; }
        const i = await ui.choose(B.place, B.enter, [{ label: `進入${B.place}` }, { label: '再準備一下' }]);
        if (i !== 0) { isl.pos = from; break; }
        await ui.story(B.intro.map(text => ({ text })));
        if (await this.fight(t, from, B.foes, '首領')) {
          t.done = true; isl.boss = true; isl.bossNow = true;
          await ui.story(B.down.map(text => ({ text })));
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
      await ui.story(def.endings[ending].lines.map(text => ({ text })));
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
      if (V.recruit && !g.party.some(h => h.key === V.recruit) && g.party.length < PARTY_MAX) {
        await ui.story(V.recruitStory);
        const lv = Math.max(1, Math.round(g.party.reduce((a, h) => a + h.lv, 0) / g.party.length));
        const h = makeHero(V.recruit, g.party.length, lv);
        if (EQUIPS.貝殼琴) h.eq.武器 = '貝殼琴'; // 她自己的琴
        const s = heroStats(h); h.hp = s.hp; h.mp = s.mp;
        g.party.push(h);
        save(g); this.draw();
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
