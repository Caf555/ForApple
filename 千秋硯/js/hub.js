// 時之書齋（據點）與各種選單
import { VOLUMES, CODEX, ITEMS, RECIPES, SHOPS, TALKS, CHARACTERS, SKILLS, FORMATIONS, ENEMIES, STAT_NAMES, enemyCodexId } from './data.js';
import { memberStats, memberSkills, expToNext, bondLevel, displayName, addItem, addMember, removeMember, checkCond, saveSlot, loadSlot, slotInfo, exportCode, importCode, codexTitle, healAll } from './state.js';
import { el } from './ui.js';

const CATS = ['人物誌', '地理誌', '器物誌', '典故', '妖物誌'];

export class Hub {
  constructor(ctx) { this.ctx = ctx; this.root = document.getElementById('hub'); }
  get g() { return this.ctx.g; }
  get ui() { return this.ctx.ui; }

  // ───────── 書齋主畫面 ─────────
  render() {
    const g = this.g;
    const r = this.root; r.innerHTML = '';
    const total = Object.keys(g.flags).filter(k => k.startsWith('補史.')).length;
    r.appendChild(el('div', { class: 'hub-head' },
      el('h1', {}, '時之書齋'),
      el('p', {}, '書頁與書頁之間的縫隙。窗外是緩緩流動的墨色雲海。'),
      el('div', { class: 'hub-stat' }, `已修補的史頁：${total}　銀：${g.money}`)));
    const grid = el('div', { class: 'hub-grid' });
    const room = (name, sub, fn, open = true, badge) => grid.appendChild(el('button', { class: 'room' + (open ? '' : ' closed'), disabled: !open, onclick: () => { this.ctx.audio.sfx('tap'); fn(); } },
      el('b', {}, name), el('span', {}, open ? sub : '尚未開放'), badge ? el('i', { class: 'badge' }, badge) : null));
    room('書架', '選擇要進入的時代', () => this.shelf());
    room('書案', '存檔・讀檔', () => this.saveMenu());
    room('研墨室', '以硯池中的靈煉化', () => this.craft(), !!g.flags['開放.研墨室'], g.spirits.length ? String(g.spirits.length) : null);
    room('藏書閣', '史卷圖鑑', () => this.codex(), !!g.flags['開放.藏書閣']);
    const talks = this.availableTalks();
    room('茶室', '與夥伴夜話', () => this.teaRoom(), !!g.flags['開放.茶室'], talks.length ? '新' : null);
    room('隊伍', '陣法・裝備', () => this.party());
    r.appendChild(grid);
    r.appendChild(el('p', { class: 'hub-note' }, '在書齋裡，全隊的體與墨都會完全回復。'));
  }

  availableTalks() {
    const g = this.g;
    return TALKS.filter(t => !g.flags['夜話.' + t.id] && t.need.every(([k, a, b]) => k === '羈絆' ? bondLevel(g.bonds[a] || 0) >= b : !!g.flags[a]));
  }

  shelf() {
    const g = this.g;
    const api = this.ui.sheet('書架', body => {
      body.appendChild(el('p', { class: 'muted' }, '每一本書，都是一個時代。'));
      for (const v of VOLUMES) {
        const resume = g.resume[v.id];
        const done = g.flags['卷完.' + v.id];
        const started = !!resume || done;
        const card = el('div', { class: 'vol' + (v.ready ? '' : ' locked') },
          el('div', { class: 'vol-name' }, `${v.id}　${v.name}`),
          el('div', { class: 'vol-era' }, v.era),
          v.desc ? el('p', {}, v.desc) : null);
        if (v.ready) {
          if (resume && this.ctx.scenes[resume]) card.appendChild(el('button', { class: 'btn primary', onclick: () => { api.close(); this.ctx.enterVolume(v, resume); } }, '繼續'));
          else if (resume) card.appendChild(el('p', { class: 'muted' }, '下一回製作中，敬請期待。'));
          else if (!started) card.appendChild(el('button', { class: 'btn primary', onclick: () => { api.close(); this.ctx.enterVolume(v, v.start); } }, '進入'));
          if (done) card.appendChild(el('p', { class: 'muted' }, '已完成'));
        } else card.appendChild(el('p', { class: 'muted' }, '製作中'));
        body.appendChild(card);
      }
    });
  }

  // ───────── 茶室（夜話） ─────────
  teaRoom() {
    const g = this.g;
    const api = this.ui.sheet('茶室', body => {
      body.appendChild(el('p', { class: 'muted' }, '茶已經泡好了。'));
      for (const t of TALKS) {
        const seen = g.flags['夜話.' + t.id];
        const ok = t.need.every(([k, a, b]) => k === '羈絆' ? bondLevel(g.bonds[a] || 0) >= b : !!g.flags[a]);
        const req = t.need.map(([k, a, b]) => k === '羈絆' ? `${displayName(g, a)} 羈絆 ${b} 級` : '推進劇情').join('、');
        body.appendChild(el('div', { class: 'vol' + (ok ? '' : ' locked') },
          el('div', { class: 'vol-name' }, `${displayName(g, t.who)}・${ok || seen ? t.title : '？？？'}`),
          el('p', { class: 'muted' }, seen ? '已聊過' : ok ? '' : '需要：' + req),
          ok ? el('button', { class: 'btn' + (seen ? '' : ' primary'), onclick: () => { api.close(); g.flags['夜話.' + t.id] = 1; this.ctx.runner.play(t.scene); } }, seen ? '再聊一次' : '一起喝茶') : null));
      }
    });
  }

  // ───────── 研墨室（煉化） ─────────
  craft() {
    const g = this.g;
    const sel = { a: null, b: null, m: null };
    const api = this.ui.sheet('研墨室', (body, self) => {
      body.innerHTML = '';
      body.appendChild(el('p', { class: 'muted' }, '選兩個硯池中的靈，再加一件素材，研磨調和。'));
      const counts = {};
      g.spirits.forEach(s => counts[s] = (counts[s] || 0) + 1);
      const slot = (label, key, options, count) => {
        const row = el('div', { class: 'craft-slot' }, el('b', {}, label));
        const list = el('div', { class: 'chips' });
        if (!options.length) list.appendChild(el('span', { class: 'muted' }, '（沒有）'));
        options.forEach(o => {
          const used = key === 'b' && sel.a === o ? 1 : key === 'a' && sel.b === o ? 1 : 0;
          const left = count(o) - used;
          list.appendChild(el('button', { class: 'chip' + (sel[key] === o ? ' on' : ''), disabled: left <= 0 && sel[key] !== o, onclick: () => { sel[key] = sel[key] === o ? null : o; self.rebuild(); } }, `${o} ×${count(o)}`));
        });
        row.appendChild(list);
        return row;
      };
      const spiritNames = Object.keys(counts);
      body.appendChild(slot('靈・一', 'a', spiritNames, o => counts[o]));
      body.appendChild(slot('靈・二', 'b', spiritNames, o => counts[o]));
      const mats = Object.keys(g.items).filter(n => ITEMS[n] && ITEMS[n].type === 'material');
      body.appendChild(slot('素材', 'm', mats, o => g.items[o]));
      const ready = sel.a && sel.b && sel.m && (sel.a !== sel.b || counts[sel.a] >= 2);
      body.appendChild(el('button', { class: 'btn primary wide', disabled: !ready, onclick: () => this.doCraft(sel, self) }, '研墨煉化'));
      const known = RECIPES.filter(r => g.flags['配方.' + r.out]);
      if (known.length) {
        body.appendChild(el('h3', {}, '已知配方'));
        known.forEach(r => body.appendChild(el('div', { class: 'recipe' }, `${r.a} ＋ ${r.b} ＋ ${r.m} → ${r.out}`)));
      }
    });
  }

  doCraft(sel, self) {
    const g = this.g;
    const r = RECIPES.find(x => ((x.a === sel.a && x.b === sel.b) || (x.a === sel.b && x.b === sel.a)));
    if (!r) { this.ctx.audio.sfx('fail'); this.ui.toast('這兩種靈互相排斥，墨色一下子就散了。'); return; }
    if (r.m !== sel.m) { this.ctx.audio.sfx('fail'); this.ui.toast('墨色開始凝聚，卻差了一點什麼……' + r.hint); return; }
    const take = s => { const i = g.spirits.indexOf(s); if (i >= 0) g.spirits.splice(i, 1); };
    take(sel.a); take(sel.b);
    addItem(g, sel.m, -1);
    g.flags['配方.' + r.out] = 1;
    this.ctx.audio.sfx('seal');
    if (r.spirit) {
      addMember(g, r.out, Math.max(1, (g.members.知墨?.lv || 1) - 1));
      this.ui.alert('煉化成功', [`墨色旋轉、凝聚，化成了墨靈「${r.out}」！`, CHARACTERS[r.out].desc, '墨靈可以在「隊伍」中調整是否出戰。']);
    } else {
      addItem(g, r.out, r.n || 1);
      this.ui.alert('煉化成功', [`煉出了「${r.out}」${r.n > 1 ? ' ×' + r.n : ''}！`, ITEMS[r.out].desc]);
    }
    sel.a = sel.b = sel.m = null;
    self.rebuild();
  }

  // ───────── 商店 ─────────
  shop(id) {
    const d = SHOPS[id];
    const g = this.g;
    return new Promise(resolve => {
      this.ui.sheet(d.name, (body, self) => {
        body.innerHTML = '';
        body.appendChild(el('div', { class: 'hub-stat' }, `持有銀：${g.money}`));
        for (const n of d.items) {
          const it = ITEMS[n];
          body.appendChild(el('div', { class: 'shop-row' },
            el('div', {}, el('b', {}, n), el('small', {}, it.desc), g.items[n] ? el('small', { class: 'muted' }, `持有 ${g.items[n]}`) : null),
            el('button', { class: 'btn', disabled: g.money < it.price, onclick: () => { g.money -= it.price; addItem(g, n, 1); this.ctx.audio.sfx('item'); self.rebuild(); } }, `銀 ${it.price}`)));
        }
      }, { onClose: resolve });
    });
  }

  // ───────── 隊伍 ─────────
  party() {
    const g = this.g;
    this.ui.sheet('隊伍', (body, self) => {
      body.innerHTML = '';
      for (const n of g.party) body.appendChild(this.memberCard(n, self));
      const spirits = Object.keys(g.members).filter(n => CHARACTERS[n].spirit);
      if (spirits.length) {
        body.appendChild(el('h3', {}, '墨靈'));
        spirits.forEach(n => {
          const inParty = g.party.includes(n);
          body.appendChild(el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, n), el('small', {}, `Lv${g.members[n].lv}　${CHARACTERS[n].desc}`)),
            el('button', { class: 'btn', disabled: !inParty && g.party.length >= 4, onclick: () => { if (inParty) removeMember(g, n); else addMember(g, n); self.rebuild(); } }, inParty ? '休息' : '出戰')));
        });
      }
      body.appendChild(el('h3', {}, '陣法'));
      const chips = el('div', { class: 'chips' });
      g.formations.forEach(f => chips.appendChild(el('button', { class: 'chip' + (g.formation === f ? ' on' : ''), onclick: () => { g.formation = f; self.rebuild(); } }, f)));
      body.appendChild(chips);
      body.appendChild(el('p', { class: 'muted' }, FORMATIONS[g.formation].desc));
      body.appendChild(el('h3', {}, '心印'));
      const axis = (l, r, v) => el('div', { class: 'mind' }, el('span', {}, l), el('div', { class: 'mind-track' }, el('i', { style: { left: (50 + v / 2) + '%' } })), el('span', {}, r));
      body.append(axis('情', '理', g.mind.情理), axis('柔', '剛', g.mind.剛柔), axis('出世', '入世', g.mind.出入));
      const bonds = Object.keys(g.bonds).filter(n => n !== '知墨');
      if (bonds.length) {
        body.appendChild(el('h3', {}, '羈絆'));
        bonds.forEach(n => body.appendChild(el('div', { class: 'bond-row' }, el('span', {}, displayName(g, n)), el('span', { class: 'hearts' }, '◆'.repeat(bondLevel(g.bonds[n])) + '◇'.repeat(5 - bondLevel(g.bonds[n]))))));
      }
    });
  }

  memberCard(n, self) {
    const g = this.g;
    const m = g.members[n];
    const st = memberStats(g, m);
    const def = CHARACTERS[n];
    const card = el('div', { class: 'member' });
    card.appendChild(el('div', { class: 'm-head' }, el('b', {}, displayName(g, n)), el('span', {}, `${def.title}・Lv${m.lv}`), el('span', { class: 'elem e-' + def.element }, def.element)));
    card.appendChild(el('div', { class: 'm-bars' },
      el('div', {}, this.ui.bar(m.hp, st.hp, 'hp'), el('small', {}, `體 ${m.hp}/${st.hp}`)),
      el('div', {}, this.ui.bar(m.mp, st.mp, 'mp'), el('small', {}, `墨 ${m.mp}/${st.mp}`)),
      el('div', {}, this.ui.bar(m.exp, expToNext(m.lv), 'exp'), el('small', {}, `經驗 ${m.exp}/${expToNext(m.lv)}`))));
    const stats = el('div', { class: 'm-stats' });
    ['atk', 'def', 'mag', 'res', 'spd', 'luk'].forEach(k => stats.appendChild(el('span', {}, `${STAT_NAMES[k]} ${st[k]}`)));
    card.appendChild(stats);
    if (!def.spirit) {
      const eq = el('div', { class: 'm-equip' });
      for (const slot of ['weapon', 'charm']) {
        eq.appendChild(el('button', { class: 'chip', onclick: () => this.equip(n, slot, self) }, `${slot === 'weapon' ? '武器' : '飾品'}：${m[slot] || '（無）'}`));
      }
      card.appendChild(eq);
    }
    card.appendChild(el('div', { class: 'm-skills' }, '術法：' + (memberSkills(m).join('、') || '（無）')));
    return card;
  }

  equip(n, slot, parentSheet) {
    const g = this.g;
    const m = g.members[n];
    const api = this.ui.sheet(`${displayName(g, n)}・${slot === 'weapon' ? '武器' : '飾品'}`, body => {
      const opts = Object.keys(g.items).filter(i => ITEMS[i] && ITEMS[i].type === slot && (!ITEMS[i].who || ITEMS[i].who.includes(n)));
      if (m[slot] && slot === 'charm') body.appendChild(el('button', { class: 'btn wide', onclick: () => { addItem(g, m[slot], 1); m[slot] = null; api.close(); parentSheet.rebuild(); } }, '卸下'));
      if (!opts.length) body.appendChild(el('p', { class: 'muted' }, '沒有其他可以裝備的東西。'));
      opts.forEach(i => body.appendChild(el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, i), el('small', {}, ITEMS[i].desc)),
        el('button', { class: 'btn primary', onclick: () => { if (m[slot]) addItem(g, m[slot], 1); addItem(g, i, -1); m[slot] = i; api.close(); parentSheet.rebuild(); } }, '裝備'))));
    });
  }

  // ───────── 道具 ─────────
  items() {
    const g = this.g;
    const tabs = [['use', '消耗'], ['weapon', '武器'], ['charm', '飾品'], ['material', '素材'], ['key', '重要']];
    let tab = 'use';
    this.ui.sheet('道具', (body, self) => {
      body.innerHTML = '';
      body.appendChild(el('div', { class: 'hub-stat' }, `銀：${g.money}`));
      const bar = el('div', { class: 'tabs' });
      tabs.forEach(([k, l]) => bar.appendChild(el('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { tab = k; self.rebuild(); } }, l)));
      body.appendChild(bar);
      const list = Object.entries(g.items).filter(([n]) => ITEMS[n] && ITEMS[n].type === tab);
      if (!list.length) body.appendChild(el('p', { class: 'muted' }, '（空）'));
      list.forEach(([n, c]) => {
        const it = ITEMS[n];
        body.appendChild(el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, `${n} ×${c}`), el('small', {}, it.desc)),
          tab === 'use' && !it.revive ? el('button', { class: 'btn', onclick: () => this.useItem(n, self) }, '使用') : null));
      });
    });
  }

  useItem(n, parent) {
    const g = this.g;
    const it = ITEMS[n];
    const api = this.ui.sheet(`使用 ${n}`, body => {
      g.party.forEach(p => {
        const m = g.members[p]; const st = memberStats(g, m);
        body.appendChild(el('button', { class: 'btn wide', onclick: () => {
          if (it.heal) m.hp = Math.min(st.hp, m.hp + it.heal);
          if (it.mp) m.mp = Math.min(st.mp, m.mp + it.mp);
          addItem(g, n, -1);
          this.ctx.audio.sfx('heal');
          api.close(); parent.rebuild();
        } }, `${displayName(g, p)}　體 ${m.hp}/${st.hp}　墨 ${m.mp}/${st.mp}`));
      });
    });
  }

  // ───────── 史卷 ─────────
  codex() {
    const g = this.g;
    let cat = '人物誌';
    const all = () => {
      const list = Object.entries(CODEX).map(([id, c]) => ({ id, ...c }));
      for (const e in ENEMIES) list.push({ id: enemyCodexId(e), cat: '妖物誌', fact: '虛構', text: ENEMIES[e].desc, enemy: e });
      return list;
    };
    this.ui.sheet('史卷', (body, self) => {
      body.innerHTML = '';
      const entries = all();
      const got = entries.filter(e => g.codex[e.id]).length;
      body.appendChild(el('div', { class: 'hub-stat' }, `已收錄 ${got} / ${entries.length}`));
      const bar = el('div', { class: 'tabs' });
      CATS.forEach(c => bar.appendChild(el('button', { class: 'tab' + (cat === c ? ' on' : ''), onclick: () => { cat = c; self.rebuild(); } }, c)));
      body.appendChild(bar);
      entries.filter(e => e.cat === cat).forEach(e => {
        const has = g.codex[e.id];
        const item = el('details', { class: 'codex' + (has ? '' : ' locked') },
          el('summary', {}, has ? codexTitle(e.id) : '？？？', has ? el('span', { class: 'fact f-' + e.fact }, e.fact) : null),
          has ? el('p', {}, e.text) : null);
        if (has && e.enemy) {
          const d = ENEMIES[e.enemy];
          item.appendChild(el('p', { class: 'muted' }, `屬性 ${d.element}・${d.rank}・體 ${d.hp}`));
        }
        body.appendChild(item);
      });
      body.appendChild(el('p', { class: 'muted small' }, '「史實」：有文獻依據；「虛構」：本作創作；「史實改編」：以史實為基礎加以想像。'));
    });
  }

  // ───────── 硯池 ─────────
  spirits() {
    const g = this.g;
    this.ui.sheet('硯池', body => {
      body.appendChild(el('div', { class: 'hub-stat' }, `硯池中的靈：${g.spirits.length} / 30`));
      const counts = {};
      g.spirits.forEach(s => counts[s] = (counts[s] || 0) + 1);
      if (!g.spirits.length) body.appendChild(el('p', { class: 'muted' }, '硯池裡只有安靜的墨。戰鬥中使用知墨的「封靈」可以封印妖物。'));
      Object.entries(counts).forEach(([n, c]) => body.appendChild(el('div', { class: 'shop-row' }, el('div', {}, el('b', {}, `${n} ×${c}`), el('small', {}, ENEMIES[n] ? ENEMIES[n].desc : '')))));
      body.appendChild(el('p', { class: 'muted' }, this.ctx.mode === 'hub' && g.flags['開放.研墨室'] ? '可以到書齋的「研墨室」煉化。' : '回到時之書齋的「研墨室」才能煉化。'));
    });
  }

  // ───────── 存讀檔 ─────────
  saveMenu() {
    const g = this.g;
    const fmt = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const desc = info => info ? `${info.vol || ''} ${info.place || ''} ${info.year || ''}・Lv${info.lv}・${fmt(info.at)}` : '（空）';
    this.ui.sheet('存檔・讀檔', (body, self) => {
      body.innerHTML = '';
      const canSave = this.ctx.mode === 'story' || this.ctx.mode === 'hub';
      const auto = slotInfo('auto');
      body.appendChild(el('div', { class: 'save-row' }, el('div', {}, el('b', {}, '自動存檔'), el('small', {}, desc(auto))),
        el('button', { class: 'btn', disabled: !auto, onclick: () => this.ctx.loadFrom('auto') }, '讀取')));
      for (const s of [1, 2, 3]) {
        const info = slotInfo(s);
        body.appendChild(el('div', { class: 'save-row' }, el('div', {}, el('b', {}, `存檔 ${s}`), el('small', {}, desc(info))),
          el('div', { class: 'row-btns' },
            canSave ? el('button', { class: 'btn primary', onclick: async () => {
              if (info && !(await this.ui.confirm(`要覆蓋存檔 ${s} 嗎？`))) return;
              if (saveSlot(g, s)) { this.ui.toast('已存檔'); self.rebuild(); } else this.ui.toast('存檔失敗：瀏覽器不允許儲存', 'bad');
            } }, '存檔') : null,
            el('button', { class: 'btn', disabled: !info, onclick: () => this.ctx.loadFrom(s) }, '讀取'))));
      }
      body.appendChild(el('h3', {}, '存檔碼'));
      body.appendChild(el('p', { class: 'muted' }, '把目前進度轉成一串文字。複製起來保存，就算清除瀏覽器資料、換手機，也能貼上繼續玩。'));
      body.appendChild(el('div', { class: 'row-btns' },
        el('button', { class: 'btn', onclick: () => this.exportSheet() }, '產生存檔碼'),
        el('button', { class: 'btn', onclick: () => this.importSheet() }, '輸入存檔碼')));
    });
  }

  exportSheet() {
    const code = exportCode(this.g);
    this.ui.sheet('存檔碼', body => {
      const ta = el('textarea', { class: 'code-box', readonly: true });
      ta.value = code;
      body.appendChild(ta);
      body.appendChild(el('button', { class: 'btn primary wide', onclick: async () => {
        try { await navigator.clipboard.writeText(code); this.ui.toast('已複製到剪貼簿'); }
        catch (e) { ta.select(); this.ui.toast('請長按文字框手動複製'); }
      } }, '複製'));
    });
  }

  importSheet() {
    const api = this.ui.sheet('輸入存檔碼', body => {
      const ta = el('textarea', { class: 'code-box', placeholder: '把 QQY1: 開頭的存檔碼貼在這裡' });
      body.appendChild(ta);
      body.appendChild(el('button', { class: 'btn primary wide', onclick: () => {
        try { const g = importCode(ta.value); api.close(); this.ctx.loadGame(g); }
        catch (e) { this.ui.toast('讀取失敗：' + e.message, 'bad'); }
      } }, '讀取'));
    });
  }

  // ───────── 系統 ─────────
  system() {
    this.ui.sheet('系統', (body, self) => {
      body.appendChild(el('div', { class: 'col-btns' },
        el('button', { class: 'btn', onclick: () => this.saveMenu() }, '存檔・讀檔'),
        el('button', { class: 'btn', onclick: () => this.settings() }, '設定'),
        el('button', { class: 'btn', onclick: () => this.about() }, '關於本作'),
        el('button', { class: 'btn', onclick: async () => { if (await this.ui.confirm('回到標題畫面？未存檔的進度會保留在自動存檔中。')) { self.close(); this.ctx.toTitle(); } } }, '回到標題')));
    });
  }

  settings() {
    const s = this.ctx.settings;
    this.ui.sheet('設定', (body, self) => {
      body.innerHTML = '';
      const opt = (label, key, values, labels, after) => {
        const row = el('div', { class: 'set-row' }, el('b', {}, label));
        const chips = el('div', { class: 'chips' });
        values.forEach((v, i) => chips.appendChild(el('button', { class: 'chip' + (s[key] === v ? ' on' : ''), onclick: () => { s[key] = v; this.ctx.saveSettings(); this.ui.applySettings(); if (after) after(v); self.rebuild(); } }, labels[i])));
        row.appendChild(chips);
        body.appendChild(row);
      };
      opt('文字大小', 'fontSize', [0, 1, 2, 3], ['小', '中', '大', '特大']);
      opt('文字速度', 'speed', [2, 1, 0], ['慢', '快', '立即']);
      opt('外觀', 'theme', ['auto', 'dark', 'light'], ['跟隨系統', '墨夜', '宣紙']);
      opt('音效與音樂', 'sound', [true, false], ['開', '關'], v => { if (v) { this.ctx.audio.unlock(); this.ctx.audio.music(this.g ? this.g.loc.music : '書齋', true); } else this.ctx.audio.stopMusic(); });
      opt('音量', 'volume', [0.3, 0.6, 1], ['小', '中', '大'], v => this.ctx.audio.setVolume(v));
      opt('朗讀劇情', 'tts', [false, true], ['關', '開']);
      opt('難度', 'difficulty', ['閱讀', '普通', '困難'], ['閱讀', '普通', '困難']);
      opt('戰鬥速度', 'battleSpeed', [1, 2, 3], ['1×', '2×', '4×']);
      body.appendChild(el('p', { class: 'muted small' }, '「閱讀」難度：敵人很弱，並可隨時跳過戰鬥。難度不影響任何結局條件，隨時可以切換。朗讀使用手機內建的語音，效果依裝置而定。'));
    });
  }

  about() {
    this.ui.alert('關於《千秋硯》', [
      '試玩版 v0.2：序卷〈府城〉、卷一〈大員〉回一至回三。',
      '致敬《軒轅劍》與《仙劍奇俠傳》系列的文字角色扮演遊戲。',
      '本作以臺灣為立足點書寫世界史。史卷條目會標明「史實」與「虛構」；仍在延續的信仰不會被寫成法術。',
      '音樂與音效皆由程式即時合成。',
    ]);
  }

  async demoEnd() {
    await this.ui.alert('試玩版到此為止', [
      '感謝遊玩《千秋硯》試玩版。',
      '卷一〈大員〉的回四〈鹿耳門的潮〉、回五〈熱蘭遮的最後一夜〉製作中。',
      '你的存檔會保留，新章節推出後可以直接繼續。',
    ], '回到書齋');
    this.ctx.goHub();
  }
}
