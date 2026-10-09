// 港口：碼頭（補給）、酒館（委託）、鐵匠（打造裝備）、船塢（改造船）、海圖（出航）、天文台（下一片海）、市場（賣素材）、黑市（第三章）
import { ITEMS, MATS, EQUIPS, SLOTS, STAT_NAME, SHIP, COMMISSIONS, cargoMax, FACTIONS, REP_LEVELS, repLevel, repOn, againstOf, BLACK_MARKET } from './data.js';
import { ISLANDS, ISLAND_ORDER, SEAS } from './islands.js';
import { cargoUsed, save } from './state.js';
import { worldOf, surveyMax } from './explore.js';
import { el, $ } from './ui.js';

export const PRICES = { 糧: 2, 燈油: 6, 墨水: 5, 藥草: 8, 海靈露: 7, 醒神香: 20 };
const SUPPLY_TIP = { 糧: '每走一格吃 1 份。吃光了會又餓又累。', 燈油: '點燈時每走一格用 1 份：看得更遠，霧中不會打偏。', 墨水: '測繪要用 2 份。測繪過的地方，霧吞不回去。', 藥草: ITEMS.藥草.desc, 海靈露: ITEMS.海靈露.desc, 醒神香: ITEMS.醒神香.desc };
const JOBS_MAX = 2;
// 市場收購素材的價錢（銀貝）
const MAT_PRICE = { 漂流木: 3, 霧苔: 3, 鹽晶: 4, 燈芯: 4, 珊瑚枝: 5, 鐘銅: 6, 褪色羽: 6, 鏽鐵: 7, 船帆布: 7, 夜光珠: 20, 銀貝殼: 8, 帳紙: 8, 鏡砂: 9, 測繩: 9, 墨魚墨: 9, 珍珠: 12, 閘石: 10, 白珊瑚: 12,
  紅赭土: 10, 舊帆布: 11, 火藥: 13, 鐵礦: 12, 礦工牌: 14, 炭: 11, 硫磺: 13, 熔岩玻璃: 18,
  霜晶: 14, 灰燈油: 15, 舊信紙: 13, 白狐毛: 16, 鏡冰: 17, 鯨油: 16, 凍木: 14, 古銅片: 20 };

export const statText = st => Object.entries(st).map(([k, v]) => `${STAT_NAME[k]}${v > 0 ? '+' : ''}${v}`).join(' ');
export const costText = c => Object.entries(c).map(([k, v]) => `${k} ${v}`).join('・');

export class Port {
  constructor(ctx) { this.ctx = ctx; }
  get g() { return this.ctx.g; }

  // unlock：要先完成哪座（或哪幾座）島；flag：還要先做過什麼事（例如去過天文台）
  unlocked(id) { const d = ISLANDS[id]; return (!d.flag || !!this.g.flags[d.flag]) && [].concat(d.unlock || []).every(u => worldOf(this.g, u).cleared); }
  lockText(id) { const d = ISLANDS[id], need = [].concat(d.unlock || []).filter(u => !worldOf(this.g, u).cleared); return need.length ? `完成「${need.join('」和「')}」以後，航線才會出現` : d.lockText || '航線還沒有出現'; }
  // 看得到的海域：第一片一定有；其他的，要有任何一座島開放了才會出現
  get seas() { return SEAS.filter((sea, i) => !i || ISLAND_ORDER.some(id => ISLANDS[id].sea === sea && this.unlocked(id))); }
  get hasTavern() { return worldOf(this.g, '低語礁').cleared; }
  get hasYard() { return worldOf(this.g, '晨忘島').cleared; }
  get hasMarket() { return worldOf(this.g, '千帆市').cleared; }
  get hasBlack() { return worldOf(this.g, '紅帆港').cleared; }
  // 商會的聲望越高，市場收素材的價錢越好（每一級 +5%）
  get priceRate() { const g = this.g; return g.flags.焰 ? 1 + 0.05 * repLevel((g.rep || {}).商會 || 0) : 1; }
  rep(k) { return ((this.g.rep || {})[k]) || 0; }

  // 付得起嗎？（銀貝與素材）
  canAfford(cost) { const g = this.g; return Object.entries(cost).every(([k, v]) => k === '銀貝' ? g.silver >= v : (g.mats[k] || 0) >= v); }
  pay(cost) { const g = this.g; for (const [k, v] of Object.entries(cost)) { if (k === '銀貝') g.silver -= v; else g.mats[k] -= v; } }

  show() {
    const g = this.g, ctx = this.ctx;
    ctx.audio.music('港口');
    const s = $('screen'); s.innerHTML = ''; s.className = 'port';
    const next = ISLAND_ORDER.find(id => this.unlocked(id) && !worldOf(g, id).cleared);
    const tip = next ? `下一個目的地：${next}（${ISLANDS[next].sub}）`
      : g.flags.第一章 && !g.flags.環礁 ? '淺灘的三座島都畫進書裡了。山丘上的「天文台」，門好像開了。'
      : g.flags.第二章 && !g.flags.焰 ? '環礁的四座島都畫進書裡了。天文台的老人說，往南看得到煙的地方，有下一片海。'
      : g.flags.第三章 && !g.flags.北 ? '焰之群島的四座島都畫進書裡了。天文台的老人，把望遠鏡轉向了北方。'
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
      el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), el('span', {}, `貨艙 ${cargoUsed(g)} / ${cargoMax(g)}`), ctx.ui.bar(cargoUsed(g), cargoMax(g), 'cargo')),
      g.flags.焰 ? el('div', { class: 'p-rep' }, ...FACTIONS.filter(f => repOn(g, f)).map(f => el('span', {}, el('b', {}, f), `　${REP_LEVELS[repLevel(this.rep(f))]}`, ctx.ui.bar(this.rep(f), 100, 'rep')))) : null,
      el('div', { class: 'facs' },
        fac('碼頭', '買補給：糧、燈油、墨水、藥', () => this.dock()),
        fac('海圖', '選一座島，出航', () => this.chart()),
        fac('酒館', ready ? `有 ${ready} 個委託可以回報！` : `委託告示板（進行中 ${jobsN}/${JOBS_MAX}）`, () => this.tavern(), this.hasTavern, '完成低語礁以後開放'),
        fac('鐵匠', `用素材打造裝備（素材 ${matN} 個）`, () => this.smith(), this.hasTavern, '完成低語礁以後開放'),
        fac('船塢', '加大貨艙、補船帆、裝船首像', () => this.yard(), this.hasYard, '完成晨忘島以後開放'),
        g.flags.第一章 ? fac('天文台', !g.flags.環礁 || (g.flags.第二章 && !g.flags.焰) || (g.flags.第三章 && !g.flags.北) ? '門開了！進去看看' : '星圖與往霧心的路', () => ctx.observatory()) : null,
        g.flags.第一章 ? fac('市場', '把素材賣成銀貝', () => this.market(), this.hasMarket, '完成千帆市以後開放') : null,
        g.flags.焰 ? fac('黑市', '紅帆的地下交易：火藥、稀有圖紙', () => this.blackMarket(), this.hasBlack, '完成紅帆港以後開放') : null),
      el('div', { class: 'p-isles' }, ...ISLAND_ORDER.filter(id => this.seas.includes(ISLANDS[id].sea)).map(id => {
        const r = worldOf(g, id), on = this.unlocked(id);
        return el('div', { class: 'isle' + (r.cleared ? ' done' : '') + (on ? '' : ' locked') },
          el('b', {}, on ? id : '？？？'), el('small', {}, !on ? '還沒畫進海圖' : r.cleared ? `${r.good ? '★★' : '★'}　測繪 ${r.best}%${r.best >= surveyMax(id) ? '・已畫滿' : ''}` : '未完成'));
      })));
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
            el('button', { class: 'btn small', 'aria-label': '賣回一份', disabled: !(g.supply[k] > 0), onclick: () => { g.supply[k]--; g.silver += PRICES[k]; api.rebuild(); } }, '−'),
            el('span', {}, `${PRICES[k]} 銀貝`),
            el('button', { class: 'btn small', 'aria-label': '買一份', disabled: g.silver < PRICES[k] || used >= max, onclick: () => { g.supply[k] = (g.supply[k] || 0) + 1; g.silver -= PRICES[k]; ctx.audio.sfx('tap'); api.rebuild(); } }, '＋'))));
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
        if (!this.seas.includes(d.sea)) continue;
        if (ISLAND_ORDER.find(k => ISLANDS[k].sea === d.sea) === id) body.append(el('h3', { class: 'sub-h' }, d.sea));
        body.append(el('button', { class: 'btn wide chart-row', disabled: !on, onclick: () => { api.close(); this.sail(id); } },
          el('b', {}, on ? `${id}　${r.cleared ? (r.good ? '★★' : '★') : ''}` : '？？？'),
          el('small', {}, on ? `${d.sub}・${d.cols}×${d.rows} 格・大約要 ${d.food} 份糧・航海事件 ${d.seaEvents} 個` + (r.visits ? `・最好的測繪度 ${r.best}%（最高 ${surveyMax(id)}%${r.best >= surveyMax(id) ? '，已畫滿' : ''}）` : `・測繪度最高 ${surveyMax(id)}%`) : this.lockText(id))));
      }
    });
  }

  async sail(id) {
    const g = this.g, ctx = this.ctx, d = ISLANDS[id];
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
    ctx.ui.sheet('酒館・告示板', (body, api) => {
      body.append(el('p', { class: 'muted' }, `鹽姨：「一次最多接 ${JOBS_MAX} 個。做完了回來找我，我再把報酬給你們。」`));
      const taken = COMMISSIONS.filter(c => g.jobs[c.id] !== undefined);
      if (taken.length) body.append(el('h3', { class: 'sub-h' }, '進行中'));
      for (const c of taken) {
        const st = this.jobState(c);
        body.append(el('div', { class: 'job on' + (st.ready ? ' ready' : '') },
          el('b', {}, this.jobTitle(c)), el('small', {}, `${c.from}：${c.text}`), el('p', { class: 'small' }, st.text), el('p', { class: 'small muted' }, `報酬：${this.rewardText(c.reward, c)}`),
          el('div', { class: 'btns' },
            el('button', { class: 'btn small', onclick: () => { delete g.jobs[c.id]; save(g); api.rebuild(); } }, '放棄'),
            el('button', { class: 'btn small primary', disabled: !st.ready, onclick: () => { this.finishJob(c); api.rebuild(); } }, c.kind === 'bring' ? '交出素材' : '回報'))));
      }
      const open = COMMISSIONS.filter(c => g.jobs[c.id] === undefined && !g.jobsDone.includes(c.id) && this.unlocked(c.island)).slice(0, 3);
      body.append(el('h3', { class: 'sub-h' }, '告示板'));
      if (!open.length) body.append(el('p', { class: 'muted' }, '告示板上暫時沒有新的委託了。'));
      for (const c of open) {
        body.append(el('div', { class: 'job' },
          el('b', {}, this.jobTitle(c)), el('small', {}, `${c.from}：${c.text}`), el('p', { class: 'small' }, this.jobState(c).text), el('p', { class: 'small muted' }, `報酬：${this.rewardText(c.reward, c)}`),
          el('div', { class: 'btns' }, el('button', { class: 'btn small', disabled: taken.length >= JOBS_MAX, onclick: () => { g.jobs[c.id] = 0; ctx.audio.sfx('tap'); save(g); api.rebuild(); } }, taken.length >= JOBS_MAX ? '接滿了' : '接下'))));
      }
    }, { onClose: () => this.show() });
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

  // ───────── 市場：賣素材 ─────────
  market() {
    const g = this.g, ctx = this.ctx;
    ctx.ui.sheet('市場・收購', (body, api) => {
      body.append(el('p', { class: 'muted' }, '費米：「素材拿來，我照千帆市的價錢收。……打造要用的，自己記得留著喔。」'));
      body.append(el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), this.priceRate > 1 ? el('span', {}, `商會「${REP_LEVELS[repLevel(this.rep('商會'))]}」：收購價 +${Math.round((this.priceRate - 1) * 100)}%`) : null));
      const mats = Object.entries(g.mats).filter(([, n]) => n > 0);
      if (!mats.length) body.append(el('p', { class: 'para' }, '手上沒有素材。'));
      for (const [k, n] of mats) {
        const price = Math.round((MAT_PRICE[k] || 5) * this.priceRate);
        body.append(el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, `${k}　×${n}`), el('small', {}, MATS[k])),
          el('button', { class: 'btn small', onclick: () => { g.mats[k]--; g.silver += price; ctx.audio.sfx('item'); save(g); api.rebuild(); } }, `賣 ${price} 銀貝`)));
      }
    }, { onClose: () => this.show() });
  }

  // ───────── 黑市（紅帆港完成後）：紅帆的聲望越高，賣的東西越好 ─────────
  blackMarket() {
    const g = this.g, ctx = this.ctx;
    ctx.ui.sheet('黑市', (body, api) => {
      const lv = repLevel(this.rep('紅帆'));
      body.append(el('p', { class: 'muted' }, '葛蘿：「這裡不看銀貝，看你是誰。紅帆越信你，櫃子後面的東西就拿得越多。」'),
        el('div', { class: 'p-meter' }, el('span', {}, `銀貝 ${g.silver}`), el('span', {}, `紅帆「${REP_LEVELS[lv]}」`)));
      for (const it of BLACK_MARKET) {
        const locked = lv < it.need, owned = it.kind === 'bp' && g.bps.includes(it.bp);
        const sub = it.kind === 'bp' ? `${EQUIPS[it.bp].slot}・${statText(EQUIPS[it.bp].stats)}` : it.kind === 'mat' ? `${MATS[it.name]}　×${it.n}` : `${ITEMS[it.name].desc}　×${it.n}`;
        body.append(el('div', { class: 'shop-row' + (locked ? ' locked' : '') },
          el('div', {}, el('b', {}, locked ? '？？？' : it.name), el('small', {}, locked ? `紅帆的聲望到「${REP_LEVELS[it.need]}」才拿得出來` : sub)),
          el('button', { class: 'btn small', disabled: locked || owned || g.silver < it.price, onclick: () => {
            g.silver -= it.price;
            if (it.kind === 'bp') g.bps.push(it.bp);
            else if (it.kind === 'mat') g.mats[it.name] = (g.mats[it.name] || 0) + it.n;
            else g.supply[it.name] = (g.supply[it.name] || 0) + it.n;
            ctx.audio.sfx('item'); save(g); ctx.ui.toast(`買到了「${it.name}」。`); api.rebuild();
          } }, owned ? '已經有了' : `${it.price} 銀貝`)));
      }
    }, { onClose: () => this.show() });
  }

  // ───────── 船塢 ─────────
  yard() {
    const g = this.g, ctx = this.ctx;
    ctx.ui.sheet('船塢・改造', (body, api) => {
      body.append(el('p', { class: 'muted' }, '大副：「船好，人才回得來。」'));
      for (const [part, d] of Object.entries(SHIP)) {
        const lv = g.ship[part] || 0, nx = d.levels[lv];
        body.append(el('div', { class: 'shop-row' },
          el('div', {}, el('b', {}, `${part}　${lv ? '★'.repeat(lv) : '—'}`), el('small', {}, nx ? `${nx.label}：${nx.note}` : `已經改造到最好了（${d.levels[lv - 1].note}）`), nx ? el('small', { class: 'cost' + (this.canAfford(nx.cost) ? '' : ' short') }, `需要：${costText(nx.cost)}`) : null),
          nx ? el('button', { class: 'btn small', disabled: !this.canAfford(nx.cost), onclick: () => { this.pay(nx.cost); g.ship[part] = lv + 1; ctx.audio.sfx('level'); save(g); api.rebuild(); } }, '改造') : null));
      }
    }, { onClose: () => this.show() });
  }
}
