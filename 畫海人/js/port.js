// 港口：碼頭（補給）、酒館（委託、流言、潮汐骰）、鐵匠（打造裝備）、船塢（改造船）、海圖（出航）、天文台（下一片海）、市場（行情、買賣素材、舶來品）、黑市（第三章：換貨、紅帆牌桌、走私）
import { ITEMS, MATS, EQUIPS, SLOTS, STAT_NAME, SHIP, COMMISSIONS, cargoMax, FACTIONS, REP_LEVELS, repLevel, repOn, againstOf, BLACK_MARKET, BLACK_POOL, IMPORTS, RUMOR_PRICE, HULL_BROKEN, hullOf, repairCost, PORT_EVENTS, PORT_EVENT_CHANCE, RUMOR_FOLKS, WHALE_CLUES, DICE_PLAYS, CARD_PLAYS, SMUGGLE_CARGO } from './data.js';
import { ISLANDS, ISLAND_ORDER, SEAS, SEA_EVENTS } from './islands.js';
import { diceGame, cardGame } from './gamble.js';
import { cargoUsed, save } from './state.js';
import { worldOf, surveyMax } from './explore.js';
import { el, $ } from './ui.js';

export const PRICES = { 糧: 2, 燈油: 6, 墨水: 5, 藥草: 8, 海靈露: 7, 醒神香: 20 };
const SUPPLY_TIP = { 糧: '每走一格吃 1 份。吃光了會又餓又累。', 燈油: '點燈時每走一格用 1 份：看得更遠，霧中不會打偏。', 墨水: '測繪要用 2 份。測繪過的地方，霧吞不回去。', 藥草: ITEMS.藥草.desc, 海靈露: ITEMS.海靈露.desc, 醒神香: ITEMS.醒神香.desc };
const JOBS_MAX = 2, BOARD_N = 4;
const FLAG_NAME = { 焰: '去過焰之群島', 北: '去過北霧海' };
// 市場收購素材的價錢（銀貝）
const MAT_PRICE = { 漂流木: 3, 霧苔: 3, 鹽晶: 4, 燈芯: 4, 珊瑚枝: 5, 鐘銅: 6, 褪色羽: 6, 鏽鐵: 7, 船帆布: 7, 夜光珠: 20, 銀貝殼: 8, 帳紙: 8, 鏡砂: 9, 測繩: 9, 墨魚墨: 9, 珍珠: 12, 閘石: 10, 白珊瑚: 12,
  紅赭土: 10, 舊帆布: 11, 火藥: 13, 鐵礦: 12, 礦工牌: 14, 炭: 11, 硫磺: 13, 熔岩玻璃: 18,
  霜晶: 14, 灰燈油: 15, 舊信紙: 13, 白狐毛: 16, 鏡冰: 17, 鯨油: 16, 凍木: 14, 古銅片: 20,
  褪色布: 16, 舊船票: 17, 白花瓣: 18, 潮痕石: 17, 祈願銅: 22, 石像灰: 18, 舊畫紙: 19, 墨漬: 20, 星石: 24, 空白的紙: 21 };

// 一個選項的好壞（流言用來猜哪個選項比較好）
const fxScore = fx => Object.entries(fx || {}).reduce((a, [k, v]) => a + (k === 'hp' ? v * 60 : k === '銀貝' ? v / 5 : k === '士氣' ? v / 2 : v), 0);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const statText = st => Object.entries(st).map(([k, v]) => `${STAT_NAME[k]}${v > 0 ? '+' : ''}${v}`).join(' ');
export const costText = c => Object.entries(c).map(([k, v]) => `${k} ${v}`).join('・');

export class Port {
  constructor(ctx) { this.ctx = ctx; }
  get g() { return this.ctx.g; }

  // unlock：要先完成哪座（或哪幾座）島；flag：還要先做過什麼事（例如去過天文台）
  unlocked(id) { const d = ISLANDS[id]; return (!d.flag || !!this.g.flags[d.flag]) && [].concat(d.unlock || []).every(u => worldOf(this.g, u).cleared); }
  lockText(id) { const d = ISLANDS[id], need = [].concat(d.unlock || []).filter(u => !worldOf(this.g, u).cleared); return need.length ? `完成「${need.join('」和「')}」以後，航線才會出現` : d.lockText || '航線還沒有出現'; }
  // 看得到的海域：第一片一定有；其他的，要有任何一座島開放了才會出現
  // 海圖上看得到嗎：隱藏島沒找到以前，連「？？？」都沒有
  shown(id) { return !ISLANDS[id].hidden || this.unlocked(id); }
  // 隱藏島：該找到了嗎（酒館的線索、市場的日誌、黑市的藏寶圖、船塢的破冰船首）
  newFind() {
    const g = this.g, f = g.flags;
    const ok = { 醉鯨礁: (g.clues || 0) >= WHALE_CLUES.length, 沉金船: !!f['線索:沉金船'], 紅帆藏寶島: [1, 2, 3].every(n => f['藏寶圖:' + n]), 冰下船塢: ((g.ship || {}).破冰船首 || 0) > 0 };
    return Object.keys(ok).find(id => ok[id] && !f['隱:' + id]);
  }
  get seas() { return SEAS.filter((sea, i) => !i || ISLAND_ORDER.some(id => ISLANDS[id].sea === sea && this.unlocked(id))); }
  get hasTavern() { return worldOf(this.g, '低語礁').cleared; }
  get hasYard() { return worldOf(this.g, '晨忘島').cleared; }
  get hasMarket() { return worldOf(this.g, '千帆市').cleared; }
  get hasBlack() { return worldOf(this.g, '紅帆港').cleared; }
  // 商會的聲望越高，市場收素材的價錢越好（每一級 +5%）
  get priceRate() { const g = this.g; return g.flags.焰 ? 1 + 0.05 * repLevel((g.rep || {}).商會 || 0) : 1; }
  rep(k) { return ((this.g.rep || {})[k]) || 0; }

  // ───────── 港口的每一天：每次回港，流言、行情、舶來品、黑市的貨、走私都會換 ─────────
  newDay() {
    const g = this.g, pick = a => a[Math.floor(Math.random() * a.length)];
    // 上一次回港的流感，到這次回港就好了
    for (const h of g.party) this.cure(h);
    const day = { n: ((g.port && g.port.n) || 0) + 1, dice: DICE_PLAYS, cards: CARD_PLAYS, streak: 0, heard: false, sold: [] };
    g.port = day;
    day.event = this.rollEvent();
    day.rumor = this.makeRumor();
    // 市場的行情：去得到的島出產的素材裡，抽 2 樣搶手、1 樣滯銷
    const mats = shuffle([...new Set(this.openIsles().flatMap(id => ISLANDS[id].mats))]);
    day.hot = mats.slice(0, 2); day.cold = mats.slice(2, 3);
    // 舶來品：1/3 的機會
    const imp = IMPORTS.map((it, i) => [it, i]).filter(([it]) => (!it.flag || g.flags[it.flag]) && !(it.kind === 'bp' && g.bps.includes(it.bp)) && !(it.kind === 'find' && g.flags['線索:' + it.find]));
    // 隱藏島的線索（舊航海日誌）還沒買到的話，有舶來品的時候一半是它
    const clue = imp.find(([it]) => it.kind === 'find');
    day.imp = imp.length && Math.random() < 1 / 3 ? (clue && Math.random() < 0.5 ? clue : pick(imp))[1] : -1;
    // 黑市的換貨：紅帆的聲望越高，越容易抽到好東西
    const lv = repLevel(this.rep('紅帆')), bag = [];
    BLACK_POOL.forEach((it, i) => { if (it.need <= lv && (!it.flag || g.flags[it.flag])) for (let k = 0; k <= it.need; k++) bag.push(i); });
    day.black = [...new Set(shuffle(bag))].slice(0, 2);
    // 走私：紅帆聲望到「認識」以後，一半的機會有一箱貨要送
    const isles = this.openIsles().filter(id => ISLANDS[id].sea !== '霧心' && !ISLANDS[id].hidden);
    day.smuggle = g.flags.焰 && lv >= 1 && !g.smuggle && isles.length && Math.random() < 0.5 ? pick(isles) : null;
    g.port = day;
    return day;
  }
  get day() { return this.g.port || this.newDay(); }
  // 今天的港口突發事件（沒有的話是 null）
  ev(id) { const e = this.day.event; return e && (!id || e.id === id) ? e : null; }
  // 港口流感：生病的隊友好起來，回到原本出戰或待命的樣子
  cure(h) { if (!h.sick) return; h.bench = h.sick.bench; delete h.sick; }

  // 每次回港：大約 1/3 的機會發生一件事（第一章不會；悠閒難度只有好事）
  rollEvent() {
    const g = this.g, pick = a => a[Math.floor(Math.random() * a.length)];
    if (!g.flags.第一章 || Math.random() >= PORT_EVENT_CHANCE) return null;
    const sickable = g.party.filter(h => h.key !== '墨里');
    const ids = Object.keys(PORT_EVENTS).filter(k => (g.diff !== '悠閒' || PORT_EVENTS[k].good)
      && (k !== '流感' || sickable.length) && (k !== '罷市' || this.hasMarket) && (k !== '臨檢' || this.hasBlack));
    const id = pick(ids), e = { id };
    if (id === '流感') { const h = pick(sickable); h.sick = { bench: !!h.bench }; h.bench = true; e.who = h.key; }
    if (id === '老客人') {
      const mats = [...new Set(this.openIsles().flatMap(k => ISLANDS[k].mats))], m = pick(mats);
      const who = (g.world.忘人港 || {}).good ? '海生' : g.flags.北 ? '老洛的老朋友' : '大副的老朋友';
      g.silver += 50; g.mats[m] = (g.mats[m] || 0) + 2;
      e.text = `${who}划著小船來到碼頭：「路過，順便來看看你們。」他留下了一個包袱：銀貝 50、${m} 2。`;
    }
    return e;
  }
  evText(e) { const d = PORT_EVENTS[e.id]; return (e.text || d.text).replace('{誰}', e.who || ''); }
  get rumorPrice() { return this.ev('祭典') ? 0 : RUMOR_PRICE; }
  openIsles() { return ISLAND_ORDER.filter(id => this.unlocked(id)); }

  // 流言：提示（某座島多一個寶箱）或預告（某片海會遇到的航海事件，和該怎麼選）
  makeRumor() {
    const g = this.g, pick = a => a[Math.floor(Math.random() * a.length)];
    const who = pick(RUMOR_FOLKS.filter(([, f]) => !f || g.flags[f]))[0];
    // 醉鯨的線索：到了珊瑚環礁以後，還沒湊齊的話，四成的流言是線索
    const n = g.clues || 0;
    if (g.flags.環礁 && n < WHALE_CLUES.length && Math.random() < 0.4)
      return { kind: 'clue', who, n: n + 1, text: WHALE_CLUES[n], note: `（這好像是一條線索。醉鯨的線索 ${n + 1}／${WHALE_CLUES.length}${n + 1 >= WHALE_CLUES.length ? '：湊齊了！回到港口看看海圖' : ''}）` };
    // 流言只預告簡單的事件（不是連續小故事、隊友事件、碰運氣或海上戰鬥）
    const plain = sea => SEA_EVENTS.filter(e => (e.sea || '淺灘') === sea && !e.chain && !e.need && !e.opts.some(o => o.fight || o.chance || o.need));
    const seas = [...new Set(this.openIsles().map(id => ISLANDS[id].sea))].filter(sea => plain(sea).length);
    if (seas.length && Math.random() < 0.5) {
      const sea = pick(seas), ev = pick(plain(sea));
      const best = ev.opts.reduce((a, o) => fxScore(o.fx) > fxScore(a.fx) ? o : a, ev.opts[0]);
      return { kind: 'sea', who, sea, title: ev.title, text: `「最近在${sea}，有人遇到了『${ev.title}』。我跟你說，遇到的話，「${best.label}」就對了。」`, note: `（下一次往${sea}出航，一定會遇到「${ev.title}」）` };
    }
    const id = pick(this.openIsles());
    const spot = pick(['一塊長得像鯨魚的石頭', '一棵被雷劈過的樹', '一間沒有屋頂的小屋', '一個沒人去的小海灣', '一條乾掉的小溪']);
    return { kind: 'chest', who, island: id, text: `「${id}上有${spot}，旁邊埋著一個沒人開過的箱子。是真的，我表哥親眼看到的。」`, note: `（下一次去${id}，島上會多一個寶箱）` };
  }

  // 聽流言：記下來，出航或登島的時候才會用到
  hearRumor() {
    const g = this.g, r = this.day.rumor;
    this.day.heard = true;
    if (r.kind === 'sea') g.forecast = { sea: r.sea, title: r.title };
    else if (r.kind === 'clue') g.clues = Math.max(g.clues || 0, r.n);
    else g.tip = { island: r.island };
    save(g);
    return [{ who: r.who, text: r.text }, r.note];
  }

  // 付得起嗎？（銀貝與素材）
  canAfford(cost) { const g = this.g; return Object.entries(cost).every(([k, v]) => k === '銀貝' ? g.silver >= v : (g.mats[k] || 0) >= v); }
  pay(cost) { const g = this.g; for (const [k, v] of Object.entries(cost)) { if (k === '銀貝') g.silver -= v; else g.mats[k] -= v; } }

  show() {
    const g = this.g, ctx = this.ctx;
    ctx.audio.music('港口');
    const s = $('screen'); s.innerHTML = ''; s.className = 'port';
    const next = ISLAND_ORDER.find(id => !ISLANDS[id].hidden && this.unlocked(id) && !worldOf(g, id).cleared);
    const tip = next ? `下一個目的地：${next}（${ISLANDS[next].sub}）`
      : g.flags.第一章 && !g.flags.環礁 ? '淺灘的三座島都畫進書裡了。山丘上的「天文台」，門好像開了。'
      : g.flags.第二章 && !g.flags.焰 ? '環礁的四座島都畫進書裡了。天文台的老人說，往南看得到煙的地方，有下一片海。'
      : g.flags.第三章 && !g.flags.北 ? '焰之群島的四座島都畫進書裡了。天文台的老人，把望遠鏡轉向了北方。'
      : g.flags.第四章 && !g.flags.霧心 ? '北霧海的四座島都畫進書裡了。從霧門帶回來的劍客，在天文台醒了。'
      : g.flags.結局 ? '海圖的五頁都畫好了。可以繼續補完測繪、完成心願、接委託；到「天文台」，可以重新做一次最後的抉擇，也可以在「小遊戲間」挑遺跡謎題來玩。'
      : g.flags.霧心 ? '霧心的島都畫進海圖了。打倒公會長以前，可以回去補完測繪、完成隊友的心願、接委託、打造裝備。'
      : g.flags.第四章 ? '北霧海的四座島都畫進書裡了。可以回去補完測繪、接委託、打造裝備。'
      : g.flags.第三章 ? '焰之群島的四座島都畫進書裡了。可以回去補完測繪、接委託、打造裝備。'
      : g.flags.第二章 ? '環礁的四座島都畫進書裡了。可以回去補完測繪、接委託、打造裝備。'
      : '可以回去補完測繪、接委託、打造裝備。';
    const fac = (name, sub, fn, on = true, lockText) => el('button', { class: 'fac' + (on ? '' : ' locked'), disabled: !on, onclick: () => { ctx.audio.sfx('tap'); fn(); } },
      el('b', {}, name), el('small', {}, on ? sub : lockText));
    const jobsN = Object.keys(g.jobs).length;
    const ready = Object.keys(g.jobs).filter(id => this.jobState(COMMISSIONS.find(c => c.id === id)).ready).length;
    const matN = Object.values(g.mats).reduce((a, b) => a + b, 0);
    s.append(
      el('div', { class: 'p-head' }, el('h2', {}, '鹽灣島・港口'), el('span', { class: 'grow' }),
        el('button', { class: 'btn small', onclick: () => ctx.partySheet() }, '隊伍'),
        el('button', { class: 'icon', 'aria-label': '選單', onclick: () => ctx.menu() }, '☰')),
      el('p', { class: 'p-tip' }, tip),
      // 原生的 append 會把 null 印成「null」，沒有的東西要給空字串
      this.eventBox() || '',
      el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), el('span', {}, `貨艙 ${cargoUsed(g)} / ${cargoMax(g)}`), ctx.ui.bar(cargoUsed(g), cargoMax(g), 'cargo')),
      g.flags.焰 ? el('div', { class: 'p-rep' }, ...FACTIONS.filter(f => repOn(g, f)).map(f => el('span', {}, el('b', {}, f), `　${REP_LEVELS[repLevel(this.rep(f))]}`, ctx.ui.bar(this.rep(f), 100, 'rep')))) : '',
      el('div', { class: 'facs' },
        fac('碼頭', '買補給：糧、燈油、墨水、藥', () => this.dock()),
        fac('海圖', '選一座島，出航', () => this.chart()),
        fac('酒館', ready ? `有 ${ready} 個委託可以回報！` : `委託（進行中 ${jobsN}/${JOBS_MAX}）${this.day.heard ? '' : '・有新的流言'}`, () => this.tavern(), this.hasTavern, '完成低語礁以後開放'),
        fac('鐵匠', `用素材打造裝備（素材 ${matN} 個）`, () => this.smith(), this.hasTavern, '完成低語礁以後開放'),
        fac('船塢', `船況 ${hullOf(g)}／100${hullOf(g) < HULL_BROKEN ? '・要修了才能出航！' : hullOf(g) < 100 ? '・可以修船' : ''}`, () => this.yard(), this.hasYard, '完成晨忘島以後開放'),
        g.flags.第一章 ? fac('天文台', !g.flags.環礁 || (g.flags.第二章 && !g.flags.焰) || (g.flags.第三章 && !g.flags.北) || (g.flags.第四章 && !g.flags.霧心) ? '門開了！進去看看' : g.flags.結局 ? '重新抉擇・小遊戲間' : '星圖與往霧心的路', () => ctx.observatory()) : null,
        g.flags.第一章 ? fac('市場', `今天搶手：${this.day.hot.join('、') || '—'}${IMPORTS[this.day.imp] ? '・有舶來品！' : ''}`, () => this.market(), this.hasMarket && !this.ev('罷市'), this.hasMarket ? '商會罷市，今天不開門' : '完成千帆市以後開放') : null,
        g.flags.焰 ? fac('黑市', g.smuggle ? `走私中：貨箱要送到${g.smuggle.island}` : this.day.smuggle ? '有一箱貨要送・今天的新貨' : '今天的新貨・紅帆牌桌', () => this.blackMarket(), this.hasBlack && !this.ev('臨檢'), this.hasBlack ? '紅帆臨檢，今天不開門' : '完成紅帆港以後開放') : null),
      el('div', { class: 'p-isles' }, ...ISLAND_ORDER.filter(id => this.seas.includes(ISLANDS[id].sea) && this.shown(id)).map(id => {
        const r = worldOf(g, id), on = this.unlocked(id);
        return el('div', { class: 'isle' + (r.cleared ? ' done' : '') + (on ? '' : ' locked') },
          el('b', {}, on ? id : '？？？'), el('small', {}, !on ? '還沒畫進海圖' : r.cleared ? `${r.good ? '★★' : '★'}　測繪 ${r.best}%${r.best >= surveyMax(id) ? '・已畫滿' : ''}` : '未完成'));
      })));
    // 該找到的隱藏島：跳出來說海圖上多了一條航線
    const find = this.newFind();
    if (find) ctx.discover(find).then(() => this.show());
  }

  supplyPrice(k) { return k === '糧' && this.ev('豐收') ? 1 : PRICES[k]; }

  // 港口畫面上方：今天發生的事
  eventBox() {
    const g = this.g, ctx = this.ctx, e = this.ev();
    if (!e) return null;
    const d = PORT_EVENTS[e.id], sick = e.id === '流感' && g.party.find(h => h.key === e.who && h.sick);
    const fix = (label, ok, pay) => el('button', { class: 'btn small', disabled: !ok, onclick: () => { pay(); this.cure(sick); ctx.audio.sfx('item'); save(g); ctx.ui.toast(`${e.who}的燒退了，可以出戰了。`); this.show(); } }, label);
    return el('div', { class: 'job p-event' + (d.good ? ' ready' : '') }, el('b', {}, `港口消息：${d.title}`), el('small', {}, ctx.ui.fmt(this.evText(e))),
      e.id === '流感' && !sick ? el('p', { class: 'small' }, `${e.who}已經好了。`) : d.fix ? el('p', { class: 'small muted' }, d.fix.replace('{誰}', e.who || '')) : null,
      sick ? el('div', { class: 'btns' },
        fix(`用醒神香（有 ${g.supply.醒神香 || 0} 份）`, g.supply.醒神香 > 0, () => { g.supply.醒神香--; }),
        fix('請醫生 40 銀貝', g.silver >= 40, () => { g.silver -= 40; })) : null);
  }

  // ───────── 碼頭：補給 ─────────
  dock() {
    const g = this.g, ctx = this.ctx;
    ctx.ui.sheet('碼頭・補給', (body, api) => {
      const used = cargoUsed(g), max = cargoMax(g);
      body.append(el('p', { class: 'muted' }, '出航以前，用銀貝買補給。船的貨艙有上限（素材不佔貨艙）。'),
        el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), el('span', {}, `貨艙 ${used} / ${max}`), ctx.ui.bar(used, max, 'cargo')));
      for (const k of Object.keys(PRICES)) {
        body.append(el('div', { class: 'shop-row big' },
          el('div', {}, el('b', {}, `${k}　×${g.supply[k] || 0}`), el('small', {}, SUPPLY_TIP[k])),
          el('div', { class: 'qty' },
            el('button', { class: 'btn small', 'aria-label': '賣回一份', disabled: !(g.supply[k] > 0), onclick: () => { g.supply[k]--; g.silver += this.supplyPrice(k); api.rebuild(); } }, '−'),
            el('span', {}, `${this.supplyPrice(k)} 銀貝`),
            el('button', { class: 'btn small', 'aria-label': '買一份', disabled: g.silver < this.supplyPrice(k) || used >= max, onclick: () => { g.supply[k] = (g.supply[k] || 0) + 1; g.silver -= this.supplyPrice(k); ctx.audio.sfx('tap'); api.rebuild(); } }, '＋'))));
      }
    }, { onClose: () => { save(g); this.show(); } });
  }

  // ───────── 海圖：選島出航 ─────────
  chart() {
    const g = this.g, ctx = this.ctx;
    const api = ctx.ui.sheet('海圖', body => {
      body.append(el('p', { class: 'muted' }, '完成一座島，下一座島的航線就會畫進海圖。完成過的島也可以再去：測繪過的地方會留著，其他的東西每次都不一樣。'));
      for (const id of ISLAND_ORDER) {
        const d = ISLANDS[id], r = worldOf(g, id), on = this.unlocked(id);
        if (!this.seas.includes(d.sea) || !this.shown(id)) continue;
        if (ISLAND_ORDER.find(k => ISLANDS[k].sea === d.sea) === id) body.append(el('h3', { class: 'sub-h' }, d.sea));
        body.append(el('button', { class: 'btn wide chart-row', disabled: !on, onclick: () => { api.close(); this.sail(id); } },
          el('b', {}, on ? `${id}　${r.cleared ? (r.good ? '★★' : '★') : ''}` : '？？？'),
          el('small', {}, on ? `${d.hidden ? '隱藏的島・' : ''}${d.sub}・${d.cols}×${d.rows} 格・大約要 ${d.food} 份糧・航海事件 ${d.seaEvents} 個` + (r.visits ? `・最好的測繪度 ${r.best}%（最高 ${surveyMax(id)}%${r.best >= surveyMax(id) ? '，已畫滿' : ''}）` : `・測繪度最高 ${surveyMax(id)}%`) : this.lockText(id))));
      }
    });
  }

  async sail(id) {
    const g = this.g, ctx = this.ctx, d = ISLANDS[id];
    if (hullOf(g) < HULL_BROKEN) { await ctx.ui.alert('船況太差', [`船況只剩 ${hullOf(g)}，船底一直在進水。這樣出海太危險了。`, '先到「船塢」把船修好吧。']); return this.yard(); }
    const need = parseInt(d.food, 10);
    if (g.supply.糧 < need && !(await ctx.ui.confirm('確認', `糧食只有 ${g.supply.糧} 份。${id}大約要 ${d.food} 份，可能撐不完。還是要出航嗎？`, '出航', '再買一些'))) return this.dock();
    g.trip = { mats: {}, silver: g.silver, bps: [] };
    await ctx.sail(id);
  }

  // ───────── 酒館：委託 ─────────
  jobState(c) {
    const g = this.g;
    if (!c) return { text: '', ready: false };
    if (c.kind === 'kill') { const n = Math.min(c.n, g.jobs[c.id] || 0); return { text: `擊退 ${c.target}：${n}/${c.n}（${c.island}）`, ready: n >= c.n }; }
    if (c.kind === 'bring') { const n = Math.min(c.n, g.mats[c.target] || 0); return { text: `帶回 ${c.target}：${n}/${c.n}（${c.island}找得到）`, ready: n >= c.n }; }
    const best = worldOf(g, c.island).best; return { text: `${c.island}的測繪度：${best}%/${c.n}%`, ready: best >= c.n };
  }

  rewardText(r, c) { return Object.entries(r).map(([k, v]) => k === '圖紙' ? `圖紙「${v}」` : `${k} ${v}`).concat(c && c.side ? [`${c.side}聲望 +${c.rep}（${againstOf(c)} −5）`] : []).join('、'); }
  jobTitle(c) { return c.side ? `【${c.side}】${c.title}` : c.title; }

  tavern() {
    const g = this.g, ctx = this.ctx;
    const day = this.day;
    ctx.ui.sheet('酒館', (body, api) => {
      // 流言和潮汐骰
      const r = day.rumor;
      body.append(el('h3', { class: 'sub-h' }, '酒客的流言'),
        day.heard ? el('div', { class: 'job' }, el('b', {}, `${r.who}說`), el('small', {}, r.text), el('p', { class: 'small' }, r.note))
          : el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, `${r.who}好像知道些什麼`), el('small', {}, '請他喝一杯，就會說給你聽。每次回港都有新的流言。')),
            el('button', { class: 'btn small', disabled: g.silver < this.rumorPrice, onclick: async () => { g.silver -= this.rumorPrice; ctx.audio.sfx('tap'); const L = this.hearRumor(); api.rebuild(); await ctx.ui.alert('酒客的流言', L); } }, this.rumorPrice ? `請一杯 ${this.rumorPrice} 銀貝` : '祭典：免費')),
        el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, '潮汐骰'), el('small', {}, `跟老漁夫賭骰子。今天還能玩 ${day.dice} 局。連贏三局，他會偷偷告訴你一件事。`)),
          el('button', { class: 'btn small', onclick: () => { api.close(); diceGame(ctx, () => this.streakTip(), () => this.tavern()); } }, '坐下來')));
      body.append(el('h3', { class: 'sub-h' }, '委託'), el('p', { class: 'muted' }, `鹽姨：「一次最多接 ${JOBS_MAX} 個。做完了回來找我，我再把報酬給你們。」`), el('p', { class: 'small muted' }, '（擊退的委託：接下以後打倒的才算；打完仗會顯示進度）'));
      const taken = COMMISSIONS.filter(c => g.jobs[c.id] !== undefined);
      if (taken.length) body.append(el('h3', { class: 'sub-h' }, '進行中的委託'));
      for (const c of taken) {
        const st = this.jobState(c);
        body.append(el('div', { class: 'job on' + (st.ready ? ' ready' : '') },
          el('b', {}, this.jobTitle(c)), el('small', {}, `${c.from}：${c.text}`), el('p', { class: 'small' }, st.text), el('p', { class: 'small muted' }, `報酬：${this.rewardText(c.reward, c)}`),
          el('div', { class: 'btns' },
            el('button', { class: 'btn small', onclick: () => { delete g.jobs[c.id]; save(g); api.rebuild(); } }, '放棄'),
            el('button', { class: 'btn small primary', disabled: !st.ready, onclick: () => { this.finishJob(c); api.rebuild(); } }, c.kind === 'bring' ? '交出素材' : '回報'))));
      }
      const open = COMMISSIONS.filter(c => g.jobs[c.id] === undefined && !g.jobsDone.includes(c.id) && this.unlocked(c.island)).slice(0, BOARD_N);
      body.append(el('h3', { class: 'sub-h' }, '委託告示板'));
      if (!open.length) body.append(el('p', { class: 'muted' }, '告示板上暫時沒有新的委託了。'));
      for (const c of open) {
        body.append(el('div', { class: 'job' },
          el('b', {}, this.jobTitle(c)), el('small', {}, `${c.from}：${c.text}`), el('p', { class: 'small' }, this.jobState(c).text), el('p', { class: 'small muted' }, `報酬：${this.rewardText(c.reward, c)}`),
          el('div', { class: 'btns' }, el('button', { class: 'btn small', disabled: taken.length >= JOBS_MAX, onclick: () => { g.jobs[c.id] = 0; ctx.audio.sfx('tap'); save(g); api.rebuild(); } }, taken.length >= JOBS_MAX ? '接滿了' : '接下'))));
      }
    }, { onClose: () => this.show() });
  }

  // 潮汐骰連贏三局：今天的流言免費聽；已經聽過的話，漁夫塞一點錢給你
  streakTip() {
    if (!this.day.heard) return this.hearRumor();
    this.g.silver += 20; save(this.g);
    return ['「……啊，這件事你已經聽說了？那、那這個給你，別跟別人說我輸了。」（銀貝 +20）'];
  }

  finishJob(c) {
    const g = this.g, ctx = this.ctx;
    if (c.kind === 'bring') g.mats[c.target] -= c.n;
    delete g.jobs[c.id]; g.jobsDone.push(c.id);
    const got = [];
    for (const [k, v] of Object.entries(c.reward)) {
      if (k === '銀貝') { g.silver += v; got.push(`銀貝 ${v}`); }
      else if (k === '圖紙') { if (g.bps.includes(v)) { g.silver += 30; got.push('銀貝 30（圖紙已經有了）'); } else { g.bps.push(v); got.push(`圖紙「${v}」`); } }
      else { g.mats[k] = (g.mats[k] || 0) + v; got.push(`${k} ${v}`); }
    }
    if (c.side) {
      ctx.addRep(c.side, c.rep); got.push(`${c.side}聲望 +${c.rep}`);
      const other = againstOf(c); ctx.addRep(other, -5); got.push(`${other}聲望 −5`);
    }
    g.morale = Math.min(100, g.morale + 5);
    ctx.audio.sfx('item'); save(g);
    ctx.ui.toast(`委託完成：${got.join('、')}`);
  }

  // ───────── 鐵匠：打造 ─────────
  smith() {
    const g = this.g, ctx = this.ctx;
    ctx.ui.sheet('鐵匠・打造', (body, api) => {
      body.append(el('p', { class: 'muted' }, '石伯：「有圖紙，我才打得出來。圖紙在寶箱、首領和委託裡。打好的東西，到「隊伍」裡穿上。」'));
      const mats = Object.entries(g.mats).filter(([, n]) => n > 0);
      body.append(el('div', { class: 'matbox' }, el('b', {}, '素材'), mats.length ? el('div', { class: 'chips' }, ...mats.map(([k, n]) => el('span', { class: 'chip', title: MATS[k] }, `${k} ${n}`))) : el('small', { class: 'muted' }, '還沒有素材。打倒妖物、打開寶箱就會得到。')));
      for (const slot of SLOTS) {
        body.append(el('h3', { class: 'sub-h' }, slot));
        for (const name of g.bps.filter(n => EQUIPS[n].slot === slot)) {
          const e = EQUIPS[name], own = (g.gear[name] || 0) + g.party.filter(h => Object.values(h.eq).includes(name)).length;
          body.append(el('div', { class: 'shop-row' },
            el('div', {}, el('b', {}, name + (e.who ? `（${e.who}）` : '')), el('small', {}, `${statText(e.stats)}・${e.desc}`), el('small', { class: 'cost' + (this.canAfford(e.cost) ? '' : ' short') }, `需要：${costText(e.cost)}${own ? `・已經有 ${own} 件` : ''}`)),
            el('button', { class: 'btn small', disabled: !this.canAfford(e.cost), onclick: () => { this.pay(e.cost); g.gear[name] = (g.gear[name] || 0) + 1; ctx.audio.sfx('item'); save(g); ctx.ui.toast(`打好了「${name}」。到「隊伍」裡穿上吧。`); api.rebuild(); } }, '打造')));
        }
      }
      const unknown = Object.keys(EQUIPS).length - g.bps.length;
      if (unknown > 0) body.append(el('p', { class: 'muted small' }, `還有 ${unknown} 張圖紙沒有找到。`));
    }, { onClose: () => this.show() });
  }

  // ───────── 市場：今日行情、賣素材、買素材、舶來品 ─────────
  matPrice(k) { const d = this.day, t = (d.hot.includes(k) ? 2 : d.cold.includes(k) ? 0.5 : 1) * (this.ev('臨檢') ? 1.2 : 1); return Math.max(1, Math.round((MAT_PRICE[k] || 5) * this.priceRate * t)); }
  market(tab = '賣') {
    const g = this.g, ctx = this.ctx, day = this.day;
    ctx.ui.sheet('市場', (body, api) => {
      body.append(el('p', { class: 'muted' }, '費米：「素材拿來，我照千帆市的價錢收。……打造要用的，自己記得留著喔。」'),
        el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), this.priceRate > 1 ? el('span', {}, `商會「${REP_LEVELS[repLevel(this.rep('商會'))]}」：收購價 +${Math.round((this.priceRate - 1) * 100)}%`) : null),
        el('p', { class: 'small' }, `今天的行情：${day.hot.length ? `搶手 ${day.hot.join('、')}（收購價 ×2）` : ''}${day.cold.length ? `；滯銷 ${day.cold.join('、')}（收購價 ×½）` : ''}。每次回港都會變。`));
      // 舶來品
      const imp = IMPORTS[day.imp];
      if (imp) {
        const owned = imp.kind === 'bp' && g.bps.includes(imp.bp), sold = day.sold.includes('imp');
        body.append(el('div', { class: 'job ready' }, el('b', {}, `舶來品：${imp.name}`),
          el('small', {}, imp.kind === 'bp' ? `遠洋商船帶來的圖紙，只有這裡買得到。${EQUIPS[imp.bp].slot}・${statText(EQUIPS[imp.bp].stats)}` : imp.kind === 'find' ? '一本泡過水的舊日誌，封面印著商會的記號。賣的人說是從環礁的沙洲上撿到的。最後幾頁，好像畫著什麼……' : `遠洋商船帶來的稀有素材　×${imp.n}。${MATS[imp.name]}`),
          el('div', { class: 'btns' }, el('button', { class: 'btn small primary', disabled: owned || sold || g.silver < imp.price, onclick: () => {
            g.silver -= imp.price; day.sold.push('imp');
            if (imp.kind === 'bp') g.bps.push(imp.bp); else if (imp.kind === 'find') g.flags['線索:' + imp.find] = 1; else g.mats[imp.name] = (g.mats[imp.name] || 0) + imp.n;
            ctx.audio.sfx('item'); save(g); ctx.ui.toast(`買到了「${imp.name}」。`); api.rebuild();
          } }, owned ? '已經有了' : sold ? '買過了' : `${imp.price} 銀貝`))));
      }
      body.append(el('div', { class: 'btns' }, ...['賣', '買'].map(t => el('button', { class: 'btn small' + (tab === t ? ' primary' : ''), onclick: () => { tab = t; api.rebuild(); } }, t === '賣' ? '賣素材' : '買素材'))));
      if (tab === '賣') {
        const mats = Object.entries(g.mats).filter(([, n]) => n > 0).sort(([a], [b]) => (day.hot.includes(b) - day.hot.includes(a)));
        if (!mats.length) body.append(el('p', { class: 'para' }, '手上沒有素材。'));
        for (const [k, n] of mats) {
          const price = this.matPrice(k), tag = day.hot.includes(k) ? '（搶手）' : day.cold.includes(k) ? '（滯銷）' : '';
          body.append(el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, `${k}　×${n}${tag}`), el('small', {}, MATS[k])),
            el('button', { class: 'btn small', onclick: () => { g.mats[k]--; g.silver += price; ctx.audio.sfx('item'); save(g); api.rebuild(); } }, `賣 ${price} 銀貝`)));
        }
      } else {
        // 買素材：去過的島出產的才有，價錢是收購價的 3 倍（不算行情）
        body.append(el('p', { class: 'small muted' }, '只賣去過的島出產的素材。比較貴，缺一兩個做不出裝備的時候可以救急。'));
        const been = [...new Set(ISLAND_ORDER.filter(id => worldOf(g, id).visits).flatMap(id => ISLANDS[id].mats))];
        if (!been.length) body.append(el('p', { class: 'para' }, '還沒有去過任何一座島。'));
        for (const k of been) {
          const price = (MAT_PRICE[k] || 5) * 3;
          body.append(el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, `${k}　（有 ${g.mats[k] || 0} 個）`), el('small', {}, MATS[k])),
            el('button', { class: 'btn small', disabled: g.silver < price, onclick: () => { g.silver -= price; g.mats[k] = (g.mats[k] || 0) + 1; ctx.audio.sfx('item'); save(g); api.rebuild(); } }, `買 ${price} 銀貝`)));
        }
      }
    }, { onClose: () => this.show() });
  }

  // ───────── 黑市（紅帆港完成後）：紅帆的聲望越高，賣的東西越好 ─────────
  blackMarket() {
    const g = this.g, ctx = this.ctx, day = this.day;
    ctx.ui.sheet('黑市', (body, api) => {
      const lv = repLevel(this.rep('紅帆'));
      body.append(el('p', { class: 'muted' }, '葛蘿：「這裡不看銀貝，看你是誰。紅帆越信你，櫃子後面的東西就拿得越多。」'),
        el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), el('span', {}, `紅帆「${REP_LEVELS[lv]}」`), el('span', {}, `貨艙 ${cargoUsed(g)} / ${cargoMax(g)}`)));
      const row = (it, key) => {
        const locked = lv < it.need, owned = (it.kind === 'bp' && g.bps.includes(it.bp)) || (it.kind === 'map' && g.flags['藏寶圖:' + it.n]), sold = key && day.sold.includes(key);
        const price = this.ev('罷市') ? Math.round(it.price * 0.8) : it.price;
        const full = it.kind === 'supply' && cargoUsed(g) + it.n > cargoMax(g);
        const sub = it.kind === 'map' ? `一張很舊的藏寶圖的一角。三片湊齊，就知道紅帆的寶藏藏在哪裡（已經有 ${[1, 2, 3].filter(n => g.flags['藏寶圖:' + n]).length}／3 片）` : it.kind === 'bp' ? `${EQUIPS[it.bp].slot}・${statText(EQUIPS[it.bp].stats)}` : it.kind === 'mat' ? `${MATS[it.name]}　×${it.n}` : `${SUPPLY_TIP[it.name]}　×${it.n}`;
        return el('div', { class: 'shop-row' + (locked ? ' locked' : '') },
          el('div', {}, el('b', {}, locked ? '？？？' : it.name), el('small', {}, locked ? `紅帆的聲望到「${REP_LEVELS[it.need]}」才拿得出來` : sub)),
          el('button', { class: 'btn small', disabled: locked || owned || sold || full || g.silver < price, onclick: () => {
            g.silver -= price;
            if (key) day.sold.push(key);
            if (it.kind === 'bp') g.bps.push(it.bp);
            else if (it.kind === 'map') g.flags['藏寶圖:' + it.n] = 1;
            else if (it.kind === 'mat') g.mats[it.name] = (g.mats[it.name] || 0) + it.n;
            else g.supply[it.name] = (g.supply[it.name] || 0) + it.n;
            ctx.audio.sfx('item'); save(g); ctx.ui.toast(`買到了「${it.name}」。`); api.rebuild();
          } }, owned ? '已經有了' : sold ? '賣完了' : full ? '貨艙滿了' : `${price} 銀貝`));
      };
      if (day.black.length) body.append(el('h3', { class: 'sub-h' }, '今天櫃子後面的東西（每次回港換）'), ...day.black.map(i => row(BLACK_POOL[i], 'b' + i)));
      body.append(el('h3', { class: 'sub-h' }, '一直都有的貨'), ...BLACK_MARKET.map(it => row(it)));
      // 紅帆牌桌
      body.append(el('h3', { class: 'sub-h' }, '後面的房間'),
        el('div', { class: 'shop-row' + (lv < 1 ? ' locked' : '') }, el('div', {}, el('b', {}, '紅帆牌桌'), el('small', {}, lv < 1 ? '紅帆的聲望到「認識」，才讓你坐下' : `像 21 點的牌局，押得比酒館大。今天還能玩 ${day.cards} 局。`)),
          el('button', { class: 'btn small', disabled: lv < 1, onclick: () => { api.close(); cardGame(ctx, lv, () => this.blackMarket()); } }, '坐下來')));
      // 走私
      const sm = g.smuggle;
      if (sm) {
        body.append(el('div', { class: 'job on' }, el('b', {}, `走私：送一箱貨到${sm.island}`), el('small', {}, `貨箱佔貨艙 ${SMUGGLE_CARGO} 格。出航到${sm.island}的路上，可能會被商會的巡邏船臨檢。`),
          el('p', { class: 'small muted' }, `報酬：銀貝 ${sm.pay}、紅帆聲望 +8（商會 −3）`),
          el('div', { class: 'btns' }, el('button', { class: 'btn small', onclick: async () => {
            if (!(await ctx.ui.confirm('走私', '把貨箱丟掉？紅帆的聲望會 −3。', '丟掉', '留著'))) return api.rebuild();
            g.smuggle = null; ctx.addRep('紅帆', -3); save(g); api.rebuild();
          } }, '不送了'))));
      } else if (day.smuggle) {
        const id = day.smuggle, pay = this.smugglePay(id), full = cargoUsed(g) + SMUGGLE_CARGO > cargoMax(g);
        body.append(el('div', { class: 'job' }, el('b', {}, `走私：送一箱貨到${id}`), el('small', {}, `葛蘿的老部下：「箱子裡是什麼，別問。送到${id}的碼頭，自然有人來拿。路上要是遇到商會的巡邏船……你自己想辦法。」`),
          el('p', { class: 'small muted' }, `貨箱佔貨艙 ${SMUGGLE_CARGO} 格。報酬：銀貝 ${pay}、紅帆聲望 +8（商會 −3）`),
          el('div', { class: 'btns' }, el('button', { class: 'btn small', disabled: full, onclick: () => { g.smuggle = { island: id, pay }; day.smuggle = null; ctx.audio.sfx('tap'); save(g); api.rebuild(); } }, full ? '貨艙放不下' : '接下'))));
      }
    }, { onClose: () => this.show() });
  }
  smugglePay(id) { return 100 + 60 * SEAS.indexOf(ISLANDS[id].sea); }

  // ───────── 船塢：修船、改造 ─────────
  yard() {
    const g = this.g, ctx = this.ctx;
    ctx.ui.sheet('船塢', (body, api) => {
      const hull = hullOf(g), rc = repairCost(g);
      body.append(el('p', { class: 'muted' }, '大副：「船好，人才回得來。」'),
        el('h3', { class: 'sub-h' }, '修船'),
        el('div', { class: 'p-meter' }, el('span', {}, `船況 ${hull} / 100`), el('span', {}, hull < HULL_BROKEN ? '不修不能出航！' : hull < 50 ? '破破爛爛：航海事件的壞事會更嚴重' : hull < 100 ? '還撐得住' : '完好'), ctx.ui.bar(hull, 100, 'hull')),
        el('p', { class: 'small muted' }, g.flags.龍骨 ? '船裡裝著冰下船塢的「公會的龍骨」：船況不會再下降了。' : '航海事件的壞結果、海上戰鬥、每次靠岸，都會磨損船況。改造「船身」可以少磨損一些。'),
        rc.miss ? el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, `修到 100（+${rc.miss}）`), el('small', { class: 'cost' + (g.silver >= rc.silver ? '' : ' short') }, `需要：銀貝 ${rc.silver}${rc.wood ? `・漂流木 ${rc.wood}` : ''}`)),
          el('button', { class: 'btn small primary', disabled: g.silver < rc.silver, onclick: () => { g.silver -= rc.silver; if (rc.wood) g.mats.漂流木 -= rc.wood; g.hull = 100; ctx.audio.sfx('level'); save(g); api.rebuild(); } }, '修船')) : '',
        el('h3', { class: 'sub-h' }, '改造'));
      for (const [part, d] of Object.entries(SHIP)) {
        const lv = g.ship[part] || 0, nx = d.levels[lv], wait = nx && nx.flag && !g.flags[nx.flag];
        body.append(el('div', { class: 'shop-row' + (wait ? ' locked' : '') },
          el('div', {}, el('b', {}, `${part}　${lv ? '★'.repeat(lv) : '—'}`), el('small', {}, nx ? `${nx.label}：${nx.note}` : `已經改造到最好了（${d.levels[lv - 1].note}）`),
            nx ? el('small', { class: 'cost' + (!wait && this.canAfford(nx.cost) ? '' : ' short') }, wait ? `大副：「這個要等${FLAG_NAME[nx.flag]}，我才知道怎麼做。」` : `需要：${costText(nx.cost)}`) : null),
          nx ? el('button', { class: 'btn small', disabled: wait || !this.canAfford(nx.cost), onclick: () => { this.pay(nx.cost); g.ship[part] = lv + 1; ctx.audio.sfx('level'); save(g); api.rebuild(); } }, '改造') : null));
      }
    }, { onClose: () => this.show() });
  }
}
