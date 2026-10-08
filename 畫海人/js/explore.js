// 島嶼探索：六角格地圖、霧、補給、格子上的事件
import { ISLAND, TILE_INFO, ENCOUNTERS, EVENTS, RUIN, VILLAGE, BOSS_INTRO, BOSS_DOWN, ENDINGS, ITEMS } from './data.js';
import { heroStats, DIFF, save } from './state.js';
import { survey } from './survey.js';
import { el, $ } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const R = 40, W = Math.sqrt(3) * R;
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);

// 尖頂六角格、奇數列往右錯半格
export function neighbors(c, r) {
  const odd = r % 2 === 1;
  const d = odd ? [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]] : [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
  return d.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < ISLAND.cols && y < ISLAND.rows);
}
function cube(c, r) { const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; }
export function dist(a, b) { const [x1, y1, z1] = cube(...a), [x2, y2, z2] = cube(...b); return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2)); }

const WHISPERS = ['……不要回頭……', '……妳看得見我嗎……', '……燈，還亮著嗎……', '……我忘了我的名字……', '……往北，往北……', '……汐……汐……', '……船，回來了嗎……'];

export function newIsland() {
  const tiles = [];
  const fixedKeys = Object.keys(ISLAND.fixed);
  const free = [];
  for (let r = 0; r < ISLAND.rows; r++) for (let c = 0; c < ISLAND.cols; c++) {
    const edge = r === 0 || c === 0 || r === ISLAND.rows - 1 || c === ISLAND.cols - 1;
    const t = { c, r, kind: '空', land: edge ? '灘' : '林', seen: false, done: false, surveyed: false };
    const key = `${c},${r}`;
    if (c === ISLAND.start[0] && r === ISLAND.start[1]) { t.kind = '起'; t.done = true; }
    else if (fixedKeys.includes(key)) t.kind = ISLAND.fixed[key];
    else free.push(t);
    tiles.push(t);
  }
  // 中間挑三格當岩地（高地）
  shuffle(tiles.filter(t => t.land === '林')).slice(0, 3).forEach(t => { t.land = '岩'; });
  const bag = [];
  for (const k in ISLAND.pool) for (let i = 0; i < ISLAND.pool[k]; i++) bag.push(k);
  shuffle(free).forEach((t, i) => { t.kind = bag[i] || '空'; if (t.kind === '空') t.done = true; });
  const isl = { tiles, pos: [...ISLAND.start], steps: 0, lit: false, food: 0, events: shuffle(EVENTS.map((_, i) => i)), boss: false };
  reveal(isl, ISLAND.start, 1);
  // 燈塔的光，從一開始就看得見：這是這座島的終點
  tiles.find(t => t.kind === '王').seen = true;
  return isl;
}

function tileAt(isl, c, r) { return isl.tiles[r * ISLAND.cols + c]; }
function reveal(isl, p, rad) { for (const t of isl.tiles) if (dist([t.c, t.r], p) <= rad) t.seen = true; }
export function surveyPct(isl) { return Math.round(isl.tiles.filter(t => t.surveyed).length * 100 / isl.tiles.length); }

export class Explore {
  constructor(ctx) { this.ctx = ctx; }
  get g() { return this.ctx.g; }
  get isl() { return this.g.island; }

  show() {
    this.ctx.audio.music('島');
    const s = $('screen'); s.innerHTML = ''; s.className = 'island';
    this.$status = el('div', { class: 'status' });
    this.$party = el('div', { class: 'partybar' });
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'hexmap');
    this.svg.setAttribute('viewBox', `-4 -4 ${ISLAND.cols * W + W / 2 + 8} ${ISLAND.rows * R * 1.5 + R / 2 + 8}`);
    this.$info = el('div', { class: 'info' });
    this.$lamp = el('button', { class: 'btn small', onclick: () => this.toggleLamp() }, '');
    s.append(
      el('div', { class: 'isl-head' }, el('b', {}, ISLAND.name), el('span', { class: 'grow' }), this.$lamp,
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

  draw() {
    const g = this.g, isl = this.isl, svg = this.svg;
    svg.innerHTML = '';
    const nb = neighbors(...isl.pos).map(p => p.join(','));
    for (const t of isl.tiles) {
      const x = t.c * W + (t.r % 2 ? W / 2 : 0) + W / 2, y = t.r * R * 1.5 + R;
      const pts = [...Array(6).keys()].map(i => { const a = Math.PI / 180 * (60 * i - 30); return `${(x + R * 0.96 * Math.cos(a)).toFixed(1)},${(y + R * 0.96 * Math.sin(a)).toFixed(1)}`; }).join(' ');
      const here = t.c === isl.pos[0] && t.r === isl.pos[1];
      const can = nb.includes(`${t.c},${t.r}`);
      const grp = document.createElementNS(NS, 'g');
      grp.setAttribute('class', 'hex' + (t.seen ? ' seen land-' + t.land : ' fog') + (t.surveyed ? ' surveyed' : '') + (here ? ' here' : '') + (can ? ' can' : ''));
      const poly = document.createElementNS(NS, 'polygon'); poly.setAttribute('points', pts); grp.append(poly);
      const label = here ? '' : !t.seen ? '' : t.done && t.kind !== '村' && t.kind !== '起' ? '·' : t.kind === '空' ? '' : t.kind === '王' ? (isl.key ? '燈' : '鎖') : t.kind;
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
    for (const h of g.party) {
      const st = heroStats(h);
      this.$party.append(el('div', { class: 'pm' + (h.hp <= 0 ? ' down' : '') }, el('b', {}, this.ctx.ui.fmt(h.key === '墨里' ? '{名}' : h.key), el('small', {}, ` Lv${h.lv}`)), this.ctx.ui.bar(h.hp, st.hp, 'hp'), this.ctx.ui.bar(h.mp, st.mp, 'mp')));
    }
    const cur = tileAt(isl, ...isl.pos);
    const info = TILE_INFO[cur.kind] || TILE_INFO.空;
    this.$info.innerHTML = '';
    const goal = isl.boss ? '燈守已經倒下。可以繼續測繪，或回到登陸點返航（測繪度 60% 以上，結局會不一樣）。'
      : isl.key ? '你們拿到了燈塔的鑰匙。準備好了，就前往燈塔（「燈」）。' : '目標：找到「霧眼」，打倒守門的東西拿到鑰匙，再打開燈塔（「鎖」）。';
    this.$info.append(el('p', { class: 'goal' }, goal),
      el('p', {}, cur.kind === '起' ? '船停在登陸點。點旁邊的格子前進；每走一格吃掉 1 份糧。' : info.name ? `${info.name}：${cur.done ? '已經處理過了。' : info.tip}` : '霧裡什麼都沒有。點旁邊的格子繼續前進。'),
      el('p', { class: 'muted' }, isl.lit ? '燈亮著：看得更遠、霧中不會打偏；每走一格用掉 1 份燈油。' : '點燈可以看得更遠（每走一格用 1 份燈油）。'));
    if (cur.kind === '村') this.$info.append(el('button', { class: 'btn small', onclick: () => this.village() }, '進村子'));
    if (cur.kind === '起' && isl.boss) this.$info.append(el('button', { class: 'btn primary small', onclick: () => this.sailHome() }, '返航'));
    if (cur.kind === '測' && cur.done && !cur.redo) this.$info.append(el('p', { class: 'muted' }, '這一區已經測繪過了。'));
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
      const back = isl.tiles.filter(x => x.seen && !x.surveyed && x.kind !== '起' && dist([x.c, x.r], isl.pos) >= 2);
      if (back.length) { const x = back[Math.floor(Math.random() * back.length)]; x.seen = false; this.ctx.ui.toast('霧，吞回了一格。只有測繪過的地方，才不會被吞掉。'); this.ctx.audio.sfx('whisper'); }
    }
    else if (!isl.lit && Math.random() < 0.18) { this.ctx.ui.toast(WHISPERS[Math.floor(Math.random() * WHISPERS.length)]); this.ctx.audio.sfx('whisper'); }
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
      if (i === 0) { g.party.forEach((h, k) => { [h.hp, h.mp] = snap[k]; }); g.morale = morale; g.supply = supply; continue; }
      g.party.forEach(h => { h.hp = Math.max(1, Math.round(heroStats(h).hp * 0.15)); });
      g.morale = Math.max(0, morale - 10);
      this.isl.pos = from;
      return false;
    }
  }

  async enter(t, from) {
    const g = this.g, ui = this.ctx.ui, isl = this.isl;
    switch (t.kind) {
      case '怪': {
        const depth = dist([t.c, t.r], ISLAND.start);
        const pool = ENCOUNTERS.slice(Math.min(ENCOUNTERS.length - 4, Math.max(0, (depth - 1) * 2)), Math.min(ENCOUNTERS.length, depth * 3 + 2));
        if (await this.fight(t, from, pool[Math.floor(Math.random() * pool.length)], '一般')) t.done = true;
        break;
      }
      case '眼':
        if (await this.fight(t, from, ['溺者之影', '鹽靈'], '精英')) {
          t.done = true; reveal(isl, [t.c, t.r], 2); isl.key = true;
          await ui.alert('霧眼', ['溺者之影沉回了水裡。周圍的霧，一口氣散開了。', '它沉下去的地方，留下一把生鏽的鑰匙。鑰匙上刻著一盞燈。', '（得到燈塔的鑰匙。燈塔的門打開了）']);
        }
        break;
      case '寶': {
        const loot = [() => { const n = 15 + Math.floor(Math.random() * 16); g.silver += n; return `銀貝 ${n}`; }, () => { g.supply.燈油 += 2; return '燈油 2'; }, () => { g.supply.墨水 += 2; return '墨水 2'; },
          () => { g.supply.藥草 += 2; return '藥草 2'; }, () => { g.supply.糧 += 4; return '糧 4'; }, () => { g.supply.海靈露 = (g.supply.海靈露 || 0) + 2; return '海靈露 2'; }, () => { g.supply.醒神香 += 1; return '醒神香 1'; }];
        const got = [loot[Math.floor(Math.random() * loot.length)](), loot[Math.floor(Math.random() * 6)]()];
        this.ctx.audio.sfx('item');
        await ui.alert('寶箱', [`箱子裡有：${got.join('、')}`]);
        t.done = true;
        break;
      }
      case '？': {
        const ev = EVENTS[isl.events.shift() ?? Math.floor(Math.random() * EVENTS.length)];
        const i = await ui.choose(ev.title, ev.text, ev.opts.map(o => ({ label: o.label, disabled: o.fx.墨水 < 0 && g.supply.墨水 < -o.fx.墨水 })));
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
          const talk = [
            ['阿潮看著火，很久都沒有說話。', '「我爸說，霧裡的東西，不會傷害記得它們的人。」', '「我一直想，那他為什麼沒有回來。」'],
            ['蓮笙把腳伸到火邊。她的腳上，有很多舊傷。', '「霧的聲音，晚上比較小聲。」她說，「它們也會累。」'],
            ['{名}翻開繪圖師之書。書上，低語礁的海岸線，正在一點一點長出來。', '蓮笙湊過來看：「……妳畫得很慢。」', '「畫錯了，它就會被忘記。」{名}說。'],
          ][Math.floor(Math.random() * 3)];
          await ui.alert('營火', [...talk, '（全隊回復了 60%，士氣 +10）']);
          t.done = true;
        }
        break;
      }
      case '村': await this.village(); break;
      case '遺':
        await ui.alert(RUIN.title, [...RUIN.text, RUIN.line]);
        g.flags.遺跡 = 1; t.done = true;
        break;
      case '測': {
        if (g.supply.墨水 < 2) { await ui.alert('測繪點', ['這裡看得見很長的一段海岸線。', '可是測繪要用 2 份墨水，你們的墨水不夠。（寶箱、事件、村子可能找得到）']); break; }
        const i = await ui.choose('測繪點', ['這裡看得見很長的一段海岸線。', '要在這裡測繪嗎？（墨水 2）測繪過的格子，霧就吞不回去。'], [{ label: '測繪' }, { label: '先不要' }]);
        if (i !== 0) break;
        g.supply.墨水 -= 2;
        const score = await survey(this.ctx, ISLAND.name);
        const rad = score >= 50 ? 1 : 0;
        for (const x of isl.tiles) if (dist([x.c, x.r], [t.c, t.r]) <= rad + (score >= 85 ? 1 : 0)) { x.surveyed = true; x.seen = true; }
        if (score >= 70) reveal(isl, [t.c, t.r], 2);
        t.done = true;
        await ui.alert('測繪完成', [`測繪得分：${score}`, score >= 85 ? '畫得非常準！周圍兩圈的土地，都被畫進了書裡。' : score >= 50 ? '周圍一圈的土地，被畫進了書裡。' : '畫得有點歪……只有這一格留在書裡。', `目前測繪度：${surveyPct(isl)}%`]);
        break;
      }
      case '王': {
        if (!isl.key) { await ui.alert('燈塔', ['燈塔的門鎖著。門上有一個鑰匙孔，形狀像一盞燈。', '霧裡的低語說：「鑰匙……在霧眼裡……」', '（先去找「霧眼」，打倒守門的東西）']); break; }
        const i = await ui.choose('燈塔', ['燈塔的燈，在霧裡一明一滅。鑰匙插進去，轉了一圈。', '裡面是這座島的首領。打倒它以後，還可以繼續探索。'], [{ label: '進入燈塔' }, { label: '再準備一下' }]);
        if (i !== 0) { isl.pos = from; break; }
        await ui.story(BOSS_INTRO.map(text => ({ text })));
        if (await this.fight(t, from, ['燈守', '燈蛾', '燈蛾'], '首領')) {
          t.done = true; isl.boss = true;
          await ui.story(BOSS_DOWN.map(text => ({ text })));
          await ui.alert('燈塔', ['燈塔的燈穩定下來了。', `現在可以繼續探索、測繪，回到登陸點（「起」）就能返航。目前測繪度 ${surveyPct(isl)}%：60% 以上，結局會不一樣。`]);
        }
        break;
      }
    }
  }

  async sailHome(ask) {
    const isl = this.isl, ui = this.ctx.ui;
    if (ask) {
      const i = await ui.choose('登陸點', ['船還在這裡等著。', `目前測繪度 ${surveyPct(isl)}%${surveyPct(isl) >= 60 ? '' : '（60% 以上，結局會不一樣）'}。要返航嗎？`], [{ label: '返航' }, { label: '再探索一下' }]);
      if (i !== 0) return;
    }
    const good = surveyPct(isl) >= 60;
    await ui.story(ENDINGS[good ? 'good' : 'plain'].map(text => ({ text })));
    this.ctx.result(good);
  }

  async village() {
    const g = this.g, ui = this.ctx.ui;
    const t = tileAt(this.isl, ...this.isl.pos);
    if (!t.met) { t.met = true; await ui.alert(VILLAGE.title, VILLAGE.text); }
    ui.sheet('村子的小店', (body, api) => {
      body.append(el('p', { class: 'muted' }, `銀貝：${g.silver}`));
      for (const [k, [n, price]] of Object.entries(VILLAGE.shop)) {
        body.append(el('div', { class: 'shop-row' }, el('span', {}, `${k} ×${n}`), el('button', { class: 'btn small', disabled: g.silver < price, onclick: () => { g.silver -= price; g.supply[k] = (g.supply[k] || 0) + n; this.ctx.audio.sfx('item'); api.rebuild(); this.draw(); } }, `${price} 銀貝`)));
      }
    });
  }
}

export { ITEMS };
