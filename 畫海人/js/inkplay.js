// 《畫海人》第六頁・墨潮島的玩法：固定的地圖、五區、門、燈塔、小首領、連鎖的通關條件
// 資料在 js/inkisle.js；這裡讓 explore.js 呼叫（地圖怎麼長、哪裡走不過去、特別的格子做什麼）
import { ISLANDS, TILE_INFO } from './islands.js';
import { inkRegion, INK_REGIONS, INK_SPOTS, INK_LANDS, TIDE_EVERY } from './inkisle.js';
import { worldOf, dist, neighbors, tileAt, reveal, pointDone } from './explore.js';
import { playPuzzle } from './puzzle.js';
import { playTraining } from './training.js';
import { save } from './state.js';
import { el } from './ui.js';

const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
const pick = a => a[Math.floor(Math.random() * a.length)];
const key = t => `${t.c},${t.r}`;

// 這座島留下來的進度（下次來都還在）
export function inkRec(g, id) {
  const rec = worldOf(g, id);
  return rec.ink || (rec.ink = { key: 0, gates: {}, towers: {}, inks: {}, lamps: {}, ruins: {}, ore: 0, chisel: 0, wall: 0 });
}
export const inkCount = ink => Object.keys(ink.inks).length;
export const lampCount = ink => Object.keys(ink.lamps).length;
// 點亮的燈塔（可以從那裡登島）
export function litTowers(g, id) {
  const ink = inkRec(g, id);
  return Object.keys(INK_SPOTS).filter(k => INK_SPOTS[k].kind === '塔' && ink.towers[k]).map(k => ({ key: k, region: INK_SPOTS[k].region, name: INK_REGIONS[INK_SPOTS[k].region].name }));
}

// 環礁區的潮水：A、B 兩組輪流淹水
export function flooded(isl, t) {
  if (!t.tide) return false;
  const phase = Math.floor(isl.steps / TIDE_EVERY) % 2;
  return (phase === 0) === (t.tide === 'A');
}
// 走不過去的格子：墨水的河、淹水的潮
export function blocked(isl, t) { return t.land === '墨' || flooded(isl, t); }

// 看得多遠：北霧區比較暗
export function inkSight(isl, t, lit) {
  const R = INK_REGIONS[inkRegion(t.c, t.r)];
  return Math.max(0, (lit ? 2 : 1) - (R && R.dark ? 1 : 0));
}

// 一般戰鬥的妖物：被墨染過的那片海的妖物（變強 scale 倍）
export function regionOf(t) { return inkRegion(t.c, t.r); }
export function inkScale(t) { const R = INK_REGIONS[inkRegion(t.c, t.r)]; return R ? R.scale : 1; }
export function inkEncounter(t) { const R = INK_REGIONS[inkRegion(t.c, t.r)] || INK_REGIONS[5]; return pick(R.encounters); }

// 建立這次上島的地圖：配置固定；門、燈塔、燈、小首領、遺跡的進度照存檔放好；妖物、寶箱、事件每次重新撒在各區
export function buildInk(g, id) {
  const def = ISLANDS[id], rec = worldOf(g, id), ink = inkRec(g, id);
  const kept = new Set(rec.surveyed);
  const tiles = [];
  for (let r = 0; r < def.rows; r++) for (let c = 0; c < def.cols; c++) {
    const k = `${c},${r}`, reg = inkRegion(c, r), sp = INK_SPOTS[k], land = INK_LANDS[k];
    const edge = r === 0 || c === 0 || r === def.rows - 1 || c === def.cols - 1;
    const t = { c, r, kind: '空', land: reg === 0 ? '墨' : edge ? '灘' : '林', seen: false, done: false, surveyed: false, region: reg };
    if (land === '潮A' || land === '潮B') { t.tide = land.slice(1); t.land = '灘'; }
    else if (land === '白') { t.base = t.land; t.land = '白'; }
    else if (land) t.land = land;
    if (sp) { t.kind = sp.kind; t.spot = k; t.land = t.land === '墨' ? '門' : t.land; }
    if (reg === 0) t.seen = true;
    if (kept.has(k)) { t.surveyed = true; t.seen = true; }
    tiles.push(t);
  }
  const at = (c, r) => tiles[r * def.cols + c];
  at(...def.start).kind = '起'; at(...def.start).done = true;
  // 存檔裡的進度
  for (const t of tiles) {
    const sp = INK_SPOTS[t.spot]; if (!sp) continue;
    if (sp.kind === '門' && ink.gates[sp.gate]) t.done = true;
    if (sp.kind === '塔' && ink.towers[t.spot]) { t.kind = '起'; t.tower = true; t.done = true; }
    if (sp.kind === '霸' && ink.inks[sp.region]) t.done = true;
    if (sp.kind === '燈' && ink.lamps[sp.lamp]) { t.done = true; t.seen = true; }
    if (sp.kind === '牆' && ink.wall) t.done = true;
    if (sp.kind === '礦' && ink.ore) t.done = true;
    if (sp.kind === '爐' && ink.chisel) t.done = true;
    if (sp.kind === '遺' && ink.ruins[sp.key]) t.done = true;
    if (sp.kind === '王' && rec.cleared) t.done = true;
  }
  // 各區隨機的格子：只撒在沒有固定東西、不是冰／潮的空地上（熱地、噴氣口、空白底下也可以藏東西）
  for (let reg = 1; reg <= 5; reg++) {
    const pool = { ...INK_REGIONS[reg].pool };
    if (ink.key && pool.眼) delete pool.眼;
    const bag = [];
    for (const k in pool) for (let i = 0; i < pool[k]; i++) bag.push(k);
    const free = shuffle(tiles.filter(t => t.region === reg && t.kind === '空' && !t.tide && t.land !== '冰'));
    free.forEach((t, i) => { t.kind = bag[i] || '空'; });
  }
  for (const t of tiles) if (t.kind === '空') t.done = true;
  // 從哪裡登島：登陸點，或是點亮過的燈塔
  const from = g.inkStart && ink.towers[g.inkStart] ? g.inkStart.split(',').map(Number) : def.start;
  g.inkStart = null;
  const isl = { id, big: true, tiles, pos: [...from], start: [...from], steps: 0, lit: false, food: 0, hunger: 0, events: shuffle(def.events.map((_, i) => i)), boss: false, key: false };
  isl.key = inkCount(ink) >= 4;
  if (rec.cleared) { isl.boss = true; isl.key = true; }
  for (const t of tiles) if (t.kind === '測' && pointDone(tiles, t)) t.done = true;
  isl.weather = g.weather || null; g.weather = null;
  if (isl.weather === '順風') isl.tailwind = 6;
  if (g.ship && g.ship.小艇) isl.tailwind = (isl.tailwind || 0) + 5;
  const fig = (g.ship && g.ship.船首像) || 0;
  reveal(isl, from, Math.max(1, 1 + fig + (isl.weather === '晴朗' ? 1 : isl.weather === '濃霧' ? -1 : 0)));
  // 首領的位置、門、燈塔，從一開始就看得見
  for (const t of tiles) if (['王', '門', '塔'].includes(t.kind) || t.tower) t.seen = true;
  rec.visits++;
  return isl;
}

// 現在的目標（地圖下方那一行）
export function inkGoal(g, isl) {
  const def = ISLANDS[isl.id], ink = inkRec(g, isl.id), n = inkCount(ink);
  if (isl.boss) return worldOf(g, isl.id).cleared && !isl.bossNow ? '墨潮島已經畫完了。可以繼續測繪、找素材，回到登陸點或點亮的燈塔返航。' : def.goal.done;
  const pillars = pillarState(isl);
  const inkText = `四色墨 ${n}／4（${['藍墨', '綠墨', '紅墨', '白墨'].filter((_, i) => ink.inks[i + 1]).join('、') || '還沒有'}）`;
  const step = !ink.key ? '淺灘區：找到「霧眼」，拿到潮門的鑰匙。'
    : !ink.gates[1] ? '潮門的鑰匙到手了。到淺灘區東邊的「門」去。'
    : pillars.done < pillars.all ? `環礁區：三根刻帳的石柱（測繪點）都要測繪，水門才會退開（${pillars.done}／${pillars.all}）。潮水每走 ${TIDE_EVERY} 步換一邊。`
    : !ink.gates[2] ? '石柱都畫進書裡了。到環礁區北邊的「門」去。'
    : !ink.chisel ? (ink.ore ? '焰區：墨鐵挖到了。帶到「爐」，打出破冰鑿。' : '焰區：在礦脈（「礦」）挖墨鐵，再到「爐」打出破冰鑿。')
    : !ink.gates[3] ? '破冰鑿打好了。到焰區西邊的「門」去。'
    : lampCount(ink) < 4 ? `北霧區：點亮四盞「燈」（${lampCount(ink)}／4）。有一盞在冰牆後面，要老洛出戰才開得了。`
    : !ink.gates[4] ? '四盞燈都亮了。到北霧區東邊、通往墨心的「門」去。'
    : n < 4 ? '墨心的門開了。四區的小首領「霸」身上各有一種墨，四色都拿到，才進得了墨心的正中間。'
    : '四色墨都拿到了。到墨心的正中間（「心」）。';
  return `${step}　${inkText}`;
}

// 環礁區的三根石柱：測繪過了沒
export function pillarState(isl) {
  const ps = isl.tiles.filter(t => t.spot && INK_SPOTS[t.spot].pillar);
  return { all: ps.length, done: ps.filter(t => t.surveyed).length };
}

// 格子的說明
export function inkTileInfo(t) {
  const sp = INK_SPOTS[t.spot];
  if (!sp || t.kind === '起') return null;
  const base = TILE_INFO[t.kind] || {};
  const name = sp.name || sp.title || base.name, tip = sp.tip || (sp.kind === '遺' ? sp.intro[0] : '') || base.tip;
  return name ? { name, tip: tip || '' } : null;
}

// 走上特別的格子。處理了就回傳 true；其他的交給 explore.js 原本的流程
export async function inkEnter(ex, t, from) {
  const g = ex.g, ctx = ex.ctx, ui = ctx.ui, isl = ex.isl, def = ex.def, ink = inkRec(g, isl.id), sp = INK_SPOTS[t.spot];
  const active = k => g.party.some(h => h.key === k && !h.bench);
  const back = () => { isl.pos = from; };
  const L = arr => ctx.storyLines(arr);
  switch (t.kind) {
    case '怪': {
      if (await ex.fight(t, from, inkEncounter(t), '一般', inkScale(t))) t.done = true;
      return true;
    }
    case '眼': {
      if (await ex.fight(t, from, def.elite.foes, '精英', inkScale(t))) {
        t.done = true; reveal(isl, [t.c, t.r], 2);
        if (!ink.key) { ink.key = 1; save(g); await ui.alert('霧眼', def.elite.lines); }
      }
      return true;
    }
    case '門': {
      const ok = [null, () => ink.key, () => { const p = pillarState(isl); return p.done >= p.all; }, () => ink.chisel, () => lampCount(ink) >= 4][sp.gate]();
      if (!ok) { await ui.alert(sp.name, sp.locked); back(); return true; }
      ink.gates[sp.gate] = 1; t.done = true; save(g);
      ctx.audio.sfx('level');
      await ui.alert(sp.name, sp.open);
      // 門的另一邊看得見一點
      for (const [c, r] of neighbors(t.c, t.r, def)) tileAt(isl, c, r).seen = true;
      return true;
    }
    case '塔': {
      const i = await ui.choose('燈塔', ['一座熄了的燈塔。爬上去，看得見整個' + INK_REGIONS[sp.region].name + '。', '點亮它要用 2 份燈油。點亮以後，這裡就是登陸點：下次出航，可以直接從這裡登島，也可以從這裡返航。'], [{ label: '點亮燈塔（燈油 2）', disabled: g.supply.燈油 < 2 }, { label: '先不要' }]);
      if (i !== 0) return true;
      g.supply.燈油 -= 2; ink.towers[t.spot] = 1; t.kind = '起'; t.tower = true; t.done = true; save(g);
      ctx.audio.sfx('level');
      for (const x of isl.tiles) if (x.region === sp.region && dist([x.c, x.r], [t.c, t.r]) <= 3) x.seen = true;
      await ui.alert('燈塔', ['燈塔亮了。燈光照亮了附近的路。', `（下次往墨潮島出航，可以從「${INK_REGIONS[sp.region].name}的燈塔」登島。在這裡也可以返航）`]);
      return true;
    }
    case '燈': {
      const i = await ui.choose('燈', ['一盞沒點的燈，燈罩上結了一層霜。', '點亮要用 1 份燈油。'], [{ label: '點亮（燈油 1）', disabled: g.supply.燈油 < 1 }, { label: '先不要' }]);
      if (i !== 0) return true;
      g.supply.燈油--; ink.lamps[sp.lamp] = 1; t.done = true; save(g);
      ctx.audio.sfx('pen'); reveal(isl, [t.c, t.r], 2);
      const n = lampCount(ink);
      await ui.alert('燈', [n >= 4 ? '第四盞燈也亮了。四盞燈的光，在黑暗裡連成了一條線，指向墨心的方向。' : '燈亮了。周圍亮了一圈。', `（北霧區的燈 ${n}／4）`, n === 1 ? '遠遠的南邊，好像有什麼東西的火，小了一點。' : ''].filter(Boolean));
      return true;
    }
    case '牆': {
      if (!active(sp.need)) { await ui.alert(sp.name, sp.locked); back(); return true; }
      ink.wall = 1; t.done = true; save(g);
      await ui.alert(sp.name, L(sp.open));
      return true;
    }
    case '礦': {
      ink.ore = 1; t.done = true; save(g);
      ctx.audio.sfx('item');
      await ui.alert(sp.name, ['你們用鎚子敲下了一大塊黑色的礦石。礦石很重，敲開來，裡面是亮亮的墨色。', '（得到「墨鐵」。帶到焰區的「爐」，打成破冰鑿）']);
      return true;
    }
    case '爐': {
      if (!ink.ore) { await ui.alert(sp.name, ['爐子的火還很旺，鐵砧上什麼都沒有。', '（先到礦脈挖墨鐵，再帶來這裡打）']); return true; }
      const i = await ui.choose(sp.name, ['把墨鐵放進爐子裡。墨鐵燒紅以後，要看準爐溫，一鎚一鎚敲成鑿子。'], [{ label: '打鐵' }, { label: '先不要' }]);
      if (i !== 0) return true;
      const win = await playPuzzle(ctx, '鍛火', isl.id);
      if (!win) { await ui.alert(sp.name, ['墨鐵打歪了。放回爐子裡燒一燒，可以再打一次。']); return true; }
      ink.chisel = 1; t.done = true; save(g);
      ctx.audio.sfx('level');
      await ui.alert(sp.name, ['鑿子打好了。黑黑的，敲在石頭上，會發出很清的聲音。', '（得到「破冰鑿」。到焰區西邊、通往北霧區的「門」去）']);
      return true;
    }
    case '霸': {
      if (sp.needLamp && !lampCount(ink)) { await ui.alert(sp.tip ? '這一區的小首領' : '小首領', sp.shield); back(); return true; }
      const i = await ui.choose('這一區的小首領', [sp.tip, ...(sp.needLamp ? sp.unshield : []), `牠身上有「${sp.ink}」。`], [{ label: '挑戰' }, { label: '再準備一下' }]);
      if (i !== 0) { back(); return true; }
      if (!(await ex.fight(t, from, sp.foes, '精英', inkScale(t)))) return true;
      ink.inks[sp.region] = 1; t.done = true;
      isl.key = inkCount(ink) >= 4;
      const bp = ctx.newBlueprint([sp.bp]);
      save(g);
      ctx.audio.sfx('level');
      await ui.alert(sp.ink, [...sp.lines.map(x => x.replace('{墨}', inkCount(ink))), bp ? `（得到圖紙「${bp}」。回港以後，可以請鐵匠打造）` : '', isl.key ? '四色墨都拿到了！墨心的正中間，打得開了。' : ''].filter(Boolean));
      return true;
    }
    case '遺': {
      if (!sp) return false;
      if (sp.need && !active(sp.need)) { await ui.alert(sp.title, sp.needText); return true; }
      const i = await ui.choose(sp.title, [...sp.intro, '解開的話，可以拿到一些東西。解不開也沒關係，下次再試。'], [{ label: '試試看' }, { label: '先不要' }]);
      if (i !== 0) return true;
      let win;
      if (sp.train) win = (await playTraining(ctx, sp.train, active('阿潮') ? '阿潮' : g.party.find(h => !h.bench).key)) >= 0.5;
      else win = await playPuzzle(ctx, sp.game, isl.id);
      if (!win) { await ui.alert(sp.title, ['沒有解開。下次再來，可以再試一次。']); return true; }
      ink.ruins[sp.key] = 1; t.done = true;
      ctx.applyFx(sp.reward); save(g);
      await ui.alert(sp.title, [...sp.text, '解開了！' + ctx.fxText(sp.reward)]);
      return true;
    }
  }
  return false;
}

// 小地圖：整座島縮小，看得到哪裡去過、門和燈塔在哪裡
export function inkMinimap(ctx, isl) {
  const def = ISLANDS[isl.id], NS = 'http://www.w3.org/2000/svg', R = 10, W = Math.sqrt(3) * R;
  const ink = inkRec(ctx.g, isl.id);
  ctx.ui.sheet('墨潮島・小地圖', body => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `-2 -2 ${def.cols * W + W / 2 + 4} ${def.rows * R * 1.5 + R / 2 + 4}`);
    svg.setAttribute('class', 'minimap');
    for (const t of isl.tiles) {
      const x = t.c * W + (t.r % 2 ? W / 2 : 0) + W / 2, y = t.r * R * 1.5 + R;
      const pts = [...Array(6).keys()].map(i => { const a = Math.PI / 180 * (60 * i - 30); return `${(x + R * 0.98 * Math.cos(a)).toFixed(1)},${(y + R * 0.98 * Math.sin(a)).toFixed(1)}`; }).join(' ');
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'hex' + (t.seen ? ' seen land-' + t.land + (flooded(isl, t) ? ' flood' : '') : ' fog') + (t.surveyed ? ' surveyed' : ''));
      const p = document.createElementNS(NS, 'polygon'); p.setAttribute('points', pts); g.append(p);
      const here = t.c === isl.pos[0] && t.r === isl.pos[1];
      const mark = here ? '●' : t.seen && ['門', '塔', '霸', '燈', '王', '起', '村', '火', '測', '遺', '礦', '爐', '牆'].includes(t.kind) ? (t.kind === '王' ? '心' : t.kind) : '';
      if (mark) { const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', x); tx.setAttribute('y', y + 3.5); tx.setAttribute('class', 'mm-k' + (here ? ' me' : '') + (t.done && !here ? ' done' : '')); tx.textContent = mark; g.append(tx); }
      svg.append(g);
    }
    body.append(svg,
      el('p', { class: 'small muted' }, '●：你們在這裡。灰色的地方還沒去過；深色的是墨水的河。'),
      el('p', { class: 'small' }, `門 ${Object.keys(ink.gates).length}／4・燈塔 ${Object.keys(ink.towers).length}／4・北霧區的燈 ${lampCount(ink)}／4・四色墨 ${inkCount(ink)}／4`));
  });
}
