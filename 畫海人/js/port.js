// 港口：碼頭（補給）、酒館（委託）、鐵匠（打造裝備）、船塢（改造船）、海圖（出航）
import { ITEMS, MATS, EQUIPS, SLOTS, STAT_NAME, SHIP, COMMISSIONS, cargoMax } from './data.js';
import { ISLANDS, ISLAND_ORDER } from './islands.js';
import { cargoUsed, save } from './state.js';
import { worldOf } from './explore.js';
import { el, $ } from './ui.js';

export const PRICES = { 糧: 2, 燈油: 6, 墨水: 5, 藥草: 8, 海靈露: 7, 醒神香: 20 };
const SUPPLY_TIP = { 糧: '每走一格吃 1 份。吃光了會又餓又累。', 燈油: '點燈時每走一格用 1 份：看得更遠，霧中不會打偏。', 墨水: '測繪要用 2 份。測繪過的地方，霧吞不回去。', 藥草: ITEMS.藥草.desc, 海靈露: ITEMS.海靈露.desc, 醒神香: ITEMS.醒神香.desc };
const JOBS_MAX = 2;

export const statText = st => Object.entries(st).map(([k, v]) => `${STAT_NAME[k]}${v > 0 ? '+' : ''}${v}`).join(' ');
export const costText = c => Object.entries(c).map(([k, v]) => `${k} ${v}`).join('・');

export class Port {
  constructor(ctx) { this.ctx = ctx; }
  get g() { return this.ctx.g; }

  unlocked(id) { const u = ISLANDS[id].unlock; return !u || worldOf(this.g, u).cleared; }
  get hasTavern() { return worldOf(this.g, '低語礁').cleared; }
  get hasYard() { return worldOf(this.g, '晨忘島').cleared; }

  // 付得起嗎？（銀貝與素材）
  canAfford(cost) { const g = this.g; return Object.entries(cost).every(([k, v]) => k === '銀貝' ? g.silver >= v : (g.mats[k] || 0) >= v); }
  pay(cost) { const g = this.g; for (const [k, v] of Object.entries(cost)) { if (k === '銀貝') g.silver -= v; else g.mats[k] -= v; } }

  show() {
    const g = this.g, ctx = this.ctx;
    ctx.audio.music('港口');
    const s = $('screen'); s.innerHTML = ''; s.className = 'port';
    const next = ISLAND_ORDER.find(id => this.unlocked(id) && !worldOf(g, id).cleared);
    const tip = next ? `下一個目的地：${next}（${ISLANDS[next].sub}）` : '淺灘的三座島都畫進書裡了。可以回去補完測繪、接委託、打造裝備。';
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
      el('div', { class: 'facs' },
        fac('碼頭', '買補給：糧、燈油、墨水、藥', () => this.dock()),
        fac('海圖', '選一座島，出航', () => this.chart()),
        fac('酒館', ready ? `有 ${ready} 個委託可以回報！` : `委託告示板（進行中 ${jobsN}/${JOBS_MAX}）`, () => this.tavern(), this.hasTavern, '完成低語礁以後開放'),
        fac('鐵匠', `用素材打造裝備（素材 ${matN} 個）`, () => this.smith(), this.hasTavern, '完成低語礁以後開放'),
        fac('船塢', '加大貨艙、補船帆、裝船首像', () => this.yard(), this.hasYard, '完成晨忘島以後開放')),
      el('div', { class: 'p-isles' }, ...ISLAND_ORDER.map(id => {
        const r = worldOf(g, id), on = this.unlocked(id);
        return el('div', { class: 'isle' + (r.cleared ? ' done' : '') + (on ? '' : ' locked') },
          el('b', {}, on ? id : '？？？'), el('small', {}, !on ? '還沒畫進海圖' : r.cleared ? `${r.good ? '★★' : '★'}　測繪 ${r.best}%` : '未完成'));
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
    const api = ctx.ui.sheet('海圖・淺灘', body => {
      body.append(el('p', { class: 'muted' }, '完成一座島，下一座島的航線就會畫進海圖。完成過的島也可以再去：測繪過的地方會留著，其他的東西每次都不一樣。'));
      for (const id of ISLAND_ORDER) {
        const d = ISLANDS[id], r = worldOf(g, id), on = this.unlocked(id);
        body.append(el('button', { class: 'btn wide chart-row', disabled: !on, onclick: () => { api.close(); this.sail(id); } },
          el('b', {}, on ? `${id}　${r.cleared ? (r.good ? '★★' : '★') : ''}` : '？？？'),
          el('small', {}, on ? `${d.sub}・${d.cols}×${d.rows} 格・大約要 ${d.food} 份糧・航海事件 ${d.seaEvents} 個` + (r.visits ? `・最好的測繪度 ${r.best}%` : '') : `完成「${d.unlock}」以後，航線才會出現`)));
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

  rewardText(r) { return Object.entries(r).map(([k, v]) => k === '圖紙' ? `圖紙「${v}」` : `${k} ${v}`).join('、'); }

  tavern() {
    const g = this.g, ctx = this.ctx;
    ctx.ui.sheet('酒館・告示板', (body, api) => {
      body.append(el('p', { class: 'muted' }, `鹽姨：「一次最多接 ${JOBS_MAX} 個。做完了回來找我，我再把報酬給你們。」`));
      const taken = COMMISSIONS.filter(c => g.jobs[c.id] !== undefined);
      if (taken.length) body.append(el('h3', { class: 'sub-h' }, '進行中'));
      for (const c of taken) {
        const st = this.jobState(c);
        body.append(el('div', { class: 'job on' + (st.ready ? ' ready' : '') },
          el('b', {}, c.title), el('small', {}, `${c.from}：${c.text}`), el('p', { class: 'small' }, st.text), el('p', { class: 'small muted' }, `報酬：${this.rewardText(c.reward)}`),
          el('div', { class: 'btns' },
            el('button', { class: 'btn small', onclick: () => { delete g.jobs[c.id]; save(g); api.rebuild(); } }, '放棄'),
            el('button', { class: 'btn small primary', disabled: !st.ready, onclick: () => { this.finishJob(c); api.rebuild(); } }, c.kind === 'bring' ? '交出素材' : '回報'))));
      }
      const open = COMMISSIONS.filter(c => g.jobs[c.id] === undefined && !g.jobsDone.includes(c.id) && this.unlocked(c.island)).slice(0, 3);
      body.append(el('h3', { class: 'sub-h' }, '告示板'));
      if (!open.length) body.append(el('p', { class: 'muted' }, '告示板上暫時沒有新的委託了。'));
      for (const c of open) {
        body.append(el('div', { class: 'job' },
          el('b', {}, c.title), el('small', {}, `${c.from}：${c.text}`), el('p', { class: 'small' }, this.jobState(c).text), el('p', { class: 'small muted' }, `報酬：${this.rewardText(c.reward)}`),
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
