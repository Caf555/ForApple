// 時之書齋（據點）與各種選單
import { VOLUMES, CODEX, ITEMS, RECIPES, SHOPS, TALKS, CHARACTERS, SKILLS, FORMATIONS, ENEMIES, STAT_NAMES, enemyCodexId } from './data.js';
import { histDone, histTotal, histRate, goodEnds, wavers, collection, memberStats, memberSkills, expToNext, bondLevel, displayName, addItem, addMember, removeMember, checkCond, saveSlot, loadSlot, slotInfo, exportCode, importCode, codexTitle, healAll } from './state.js';
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
    r.appendChild(el('div', { class: 'hub-head' },
      el('h1', {}, '時之書齋'),
      el('p', {}, '書頁與書頁之間的縫隙。窗外是緩緩流動的墨色雲海。'),
      el('div', { class: 'hub-stat' }, `已修補的史頁：${histDone(g)}／${histTotal()}（${histRate(g)}%）　銀：${g.money}`)));
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
    room('手冊', '祖父的手冊・旅程', () => this.journal());
    r.appendChild(grid);
    r.appendChild(el('p', { class: 'hub-note' }, '在書齋裡，全隊的體與墨都會完全回復。'));
  }

  // ───────── 祖父的手冊：旅程進度（結局的條件） ─────────
  journal() {
    const g = this.g;
    const VOLS = [['卷一', 'v1', '石頭'], ['卷二', 'v2', '十七'], ['卷三', 'v3', '摩斯'], ['卷四', 'v4', '尼科'], ['卷五', 'v5', '瓦蘇'],
      ['卷六', 'v6', '宋楮'], ['卷七', 'v7', '盧卡'], ['卷八', 'v8', '奇瑪'], ['卷九', 'v9', '弗里茨'], ['卷十', 'v10', '程晴']];
    const finale = !!g.flags['卷完.卷十'];
    this.ui.sheet('祖父的手冊', body => {
      body.appendChild(el('p', { class: 'muted' }, '手冊的每一頁，都記著一段旅程。有些選擇，會在很久以後，才聽見回聲。'));
      const stat = (label, value, note) => el('div', { class: 'jr-stat' }, el('b', {}, label), el('span', {}, value), note ? el('small', {}, note) : null);
      const bond = bondLevel(g.bonds['蘅'] || 0);
      body.appendChild(el('div', { class: 'jr-stats' },
        stat('史冊修復', `${histDone(g)}／${histTotal()}`, `${histRate(g)}%`),
        stat('與蘅的羈絆', '●'.repeat(bond) + '○'.repeat(5 - bond), `${bond} 級`),
        stat('無名客善終', `${goodEnds(g)} 卷`, ''),
        stat('書記動搖', `${wavers(g)} 次`, '')));
      body.appendChild(el('h3', { class: 'jr-h' }, '無名客'));
      const tbl = el('div', { class: 'jr-list' });
      for (const [vid, v, who] of VOLS) {
        const done = g.flags['卷完.' + vid];
        const r = g.flags[v + '.無名客'];
        const mark = !done ? '—' : r === '善' ? '善終' : r === '苦' ? '遺憾' : '—';
        const wav = g.flags[v + '.書記動搖'] ? '書記動搖' : '';
        const n = (g.choices && g.choices[vid] || []).length;
        tbl.appendChild(el(n ? 'button' : 'div', { class: 'jr-row' + (r === '善' ? ' good' : r === '苦' ? ' bad' : '') + (n ? ' tap' : ''), onclick: n ? () => this.choiceSheet(vid) : null },
          el('span', { class: 'jr-vol' }, vid), el('span', { class: 'jr-who' }, done ? who : '？'), el('span', { class: 'jr-res' }, mark), el('small', {}, wav + (n ? (wav ? '・' : '') + `${n} 個選擇 ›` : ''))));
      }
      body.appendChild(tbl);
      const cl = collection();
      const ends = [['一', '記得一切'], ['二', '溫柔的遺忘'], ['三', '補史人的代價'], ['真', '千秋']];
      const seenN = ends.filter(([k]) => cl.結局 && cl.結局[k]).length;
      const namelessN = VOLS.reduce((s, [, v]) => s + ['善', '苦'].filter(x => cl.無名客 && cl.無名客[v.slice(1) + '.' + x]).length, 0);
      body.appendChild(el('h3', { class: 'jr-h' }, '收藏'));
      body.appendChild(el('div', { class: 'jr-ends' }, ...ends.map(([k, name]) => {
        const seen = cl.結局 && cl.結局[k];
        return el('div', { class: 'jr-end' + (seen ? ' seen' : '') }, el('b', {}, k === '真' ? '真結局' : `結局${k}`), el('span', {}, seen ? `〈${name}〉` : '？？？'));
      })));
      body.appendChild(el('p', { class: 'muted small' }, `看過的結局 ${seenN} / 4・無名客的結局 ${namelessN} / 20（每一卷都有兩種）。收藏記在這台裝置上，換存檔也會保留。`));
      if (finale) {
        const ok = b => b ? '✓' : '　';
        body.appendChild(el('h3', { class: 'jr-h' }, '終卷'));
        const lines = [
          [ok(bond >= 5), '與蘅的羈絆 5 級'],
          [ok(goodEnds(g) >= 7), '無名客在 7 卷以上善終'],
          [ok(wavers(g) >= 5), '無面書記動搖 5 次以上（祖父才想得起來）'],
          [ok(histRate(g) >= 90), '史冊修復率 90% 以上'],
        ];
        if (g.flags['終.祖父']) lines.push([ok(g.flags['終.祖父'] === '想起'), '祖父想起了父親的名字']);
        if (g.flags['終.論辯']) lines.push([ok(g.flags['終.論辯'] === '勝'), '用話語說服了安寧']);
        body.appendChild(el('div', { class: 'jr-list' }, ...lines.map(([m, t]) => el('div', { class: 'jr-row' + (m === '✓' ? ' good' : '') }, el('span', { class: 'jr-vol' }, m), el('span', {}, t)))));
        if (g.flags['結局']) body.appendChild(el('p', { class: 'muted' }, `你看過的結局：${{ 一: '一、記得一切', 二: '二、溫柔的遺忘', 三: '三、補史人的代價', 真: '真結局〈千秋〉' }[g.flags['結局']] || ''}`));
      } else {
        body.appendChild(el('p', { class: 'muted small' }, '走完卷十以後，這裡會出現更多的頁。'));
      }
    });
  }

  // 這一卷做過的選擇
  choiceSheet(vid) {
    const list = (this.g.choices && this.g.choices[vid]) || [];
    this.ui.sheet(`${vid}・你的選擇`, body => {
      if (!list.length) body.appendChild(el('p', { class: 'muted' }, '這一卷還沒有記下的選擇。'));
      body.appendChild(el('ol', { class: 'jr-choices' }, ...list.map(x => el('li', {}, x.c))));
      body.appendChild(el('p', { class: 'muted small' }, '只記下會影響後面劇情的選擇。想換一個選擇的話，可以從書架「重玩」那一回。'));
    });
  }

  availableTalks() {
    const g = this.g;
    return TALKS.filter(t => !g.flags['夜話.' + t.id] && t.need.every(([k, a, b]) => k === '羈絆' ? bondLevel(g.bonds[a] || 0) >= b : !!g.flags[a]));
  }

  // ───────── 書架：三千年的時間軸 ─────────
  shelf() {
    const g = this.g;
    if (!this.shelfMode) this.shelfMode = 'time';
    const api = this.ui.sheet('書架', (body, self) => {
      body.innerHTML = '';
      const doneN = VOLUMES.filter(v => g.flags['卷完.' + v.id]).length;
      body.appendChild(el('div', { class: 'tl-head' },
        el('div', {}, el('b', {}, `走過 ${doneN} / ${VOLUMES.length} 個時代`), this.ui.bar(doneN, VOLUMES.length, 'exp')),
        el('div', { class: 'chips' }, ...[['time', '依年代'], ['vol', '依卷數']].map(([k, l]) =>
          el('button', { class: 'chip' + (this.shelfMode === k ? ' on' : ''), onclick: () => { this.shelfMode = k; self.rebuild(); } }, l)))));
      const list = this.shelfMode === 'time' ? [...VOLUMES].sort((a, b) => a.year - b.year) : VOLUMES;
      const line = el('div', { class: 'timeline' + (this.shelfMode === 'time' ? '' : ' plain') });
      for (const v of list) {
        const resume = g.resume[v.id];
        const done = g.flags['卷完.' + v.id];
        const open = v.ready && (!v.need || g.flags[v.need]);
        const here = g.lastVol === v.id && !done;
        const card = el('div', { class: 'vol' + (open ? '' : ' locked') },
          el('div', { class: 'vol-name' }, `${v.id}　${v.name}`),
          el('div', { class: 'vol-era' }, v.era),
          v.desc ? el('p', {}, v.desc) : null);
        if (v.ready && v.need && !g.flags[v.need]) card.appendChild(el('p', { class: 'muted' }, v.needText || '尚未開放'));
        else if (v.ready) {
          const btns = el('div', { class: 'row-btns' });
          if (resume && this.ctx.scenes[resume]) btns.appendChild(el('button', { class: 'btn primary', onclick: () => { api.close(); this.ctx.enterVolume(v, resume); } }, '繼續'));
          else if (resume) card.appendChild(el('p', { class: 'muted' }, '下一回製作中，敬請期待。'));
          else if (!resume && !done) btns.appendChild(el('button', { class: 'btn primary', onclick: () => { api.close(); this.ctx.enterVolume(v, v.start); } }, '進入'));
          if (done) btns.appendChild(el('button', { class: 'btn', onclick: () => this.replay(v, api) }, '重玩某一回'));
          if (btns.children.length) card.appendChild(btns);
          if (done) card.appendChild(el('p', { class: 'muted small' }, '已完成'));
        } else card.appendChild(el('p', { class: 'muted' }, '製作中'));
        line.appendChild(el('div', { class: 'tl-item' + (done ? ' done' : here ? ' here' : open ? ' open' : '') },
          el('div', { class: 'tl-year' }, v.yearText), el('i', { class: 'tl-dot' }), card));
      }
      body.appendChild(line);
    });
  }

  // 重玩：選一回，從那一回的開頭再走一次（隊伍換成那一回的成員）
  replay(v, shelfApi) {
    const g = this.g;
    const prefix = v.start.replace(/\.(\d+\.)?開始$/, '');
    const starts = Object.keys(this.ctx.scenes).filter(id => id === v.start || new RegExp('^' + prefix.replace('.', '\\.') + '\\.\\d+\\.開始$').test(id))
      .sort((a, b) => (+(a.match(/\.(\d+)\.開始$/) || [0, 0])[1]) - (+(b.match(/\.(\d+)\.開始$/) || [0, 0])[1]));
    const title = id => {
      const c = this.ctx.scenes[id].cmds.find(x => x.t === 'cmd' && x.name === '章節');
      return c ? c.arg.split('｜')[1] || c.arg : id;
    };
    const api = this.ui.sheet(`${v.id}〈${v.name}〉・重玩`, body => {
      body.appendChild(el('p', { class: 'muted' }, '從那一回的開頭再走一次。新的選擇會蓋掉原本的選擇，結局的條件也可能跟著改變。建議先到「書案」另存一個存檔。'));
      for (const id of starts) {
        body.appendChild(el('button', { class: 'btn wide', onclick: async () => {
          if (!(await this.ui.confirm(`重玩「${title(id)}」？隊伍會換成那一回的成員。`))) return;
          api.close(); shelfApi.close();
          this.replayParty(v, id);
          this.ctx.enterVolume(v, id);
        } }, title(id)));
      }
    });
  }

  // 依劇本推算：走到這一回的開頭時，隊伍裡應該有誰
  replayParty(v, startId) {
    const g = this.g;
    const scenes = Object.values(this.ctx.scenes);
    const file = this.ctx.scenes[v.start].file;
    const until = this.ctx.scenes[startId].line;
    let party = ['知墨', '蘅'];
    const lvs = {};
    for (const s of scenes.filter(s => s.file === file && s.line < until).sort((a, b) => a.line - b.line)) {
      for (const c of s.cmds) {
        if (c.t !== 'fx' || c.kind !== '隊友') continue;
        const [n, k, lv] = c.args;
        if (c.sign > 0) { if (!party.includes(n)) party.push(n); if (k === '等級') lvs[n] = +lv; }
        else party = party.filter(x => x !== n);
      }
    }
    const top = Math.max(...Object.values(g.members).map(m => m.lv), 1);
    for (const n of party) if (!g.members[n] && CHARACTERS[n]) addMember(g, n, Math.max(lvs[n] || 1, top - 2));
    const spirits = g.party.filter(n => CHARACTERS[n] && CHARACTERS[n].spirit);
    g.party = party.filter(n => g.members[n]).slice(0, 4);
    for (const s of spirits) if (g.party.length < 4) g.party.push(s);
    healAll(g);
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
  // 道具圖示：有生成的圖就用圖，沒有就用「一個字＋墨圈」
  itemIcon(n, cls = 'it-icon') {
    const ui = this.ui;
    const it = ITEMS[n] || {};
    if (ui.hasImg('item', n)) return el('img', { class: cls, src: ui.imgSrc('item', n), alt: '', loading: 'lazy' });
    return el('span', { class: cls + ' glyph t-' + (it.type || 'key') }, Array.from(n)[0]);
  }

  items() {
    const g = this.g;
    const tabs = [['use', '消耗'], ['equip', '裝備'], ['material', '素材'], ['key', '重要']];
    const inTab = (t, it) => t === 'equip' ? (it.type === 'weapon' || it.type === 'charm') : it.type === t;
    let tab = 'use';
    this.ui.sheet('道具', (body, self) => {
      body.innerHTML = '';
      body.appendChild(el('div', { class: 'hub-stat' }, `銀：${g.money}`));
      const bar = el('div', { class: 'tabs' });
      tabs.forEach(([k, l]) => {
        const c = Object.keys(g.items).filter(n => ITEMS[n] && inTab(k, ITEMS[n])).length;
        bar.appendChild(el('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { tab = k; self.rebuild(); } }, l, c ? el('small', {}, ' ' + c) : null));
      });
      body.appendChild(bar);
      const list = Object.entries(g.items).filter(([n]) => ITEMS[n] && inTab(tab, ITEMS[n]));
      if (tab === 'equip') {
        // 身上裝備中的也列出來
        for (const p of g.party) for (const slot of ['weapon', 'charm']) { const w = g.members[p][slot]; if (w && ITEMS[w]) list.push([w, 0, p]); }
      }
      if (!list.length) body.appendChild(el('p', { class: 'muted' }, '（空）'));
      const grid = el('div', { class: 'it-grid' });
      list.forEach(([n, c, wearer]) => {
        grid.appendChild(el('button', { class: 'it-card' + (wearer ? ' worn' : ''), onclick: () => this.itemDetail(n, self) },
          this.itemIcon(n),
          el('b', {}, n),
          el('small', {}, wearer ? `${displayName(g, wearer)} 裝備中` : `×${c}`)));
      });
      body.appendChild(grid);
    });
  }

  itemDetail(n, parent) {
    const g = this.g;
    const it = ITEMS[n];
    const TYPE = { use: '消耗品', weapon: '武器', charm: '飾品', material: '素材', key: '重要物品' };
    const api = this.ui.sheet(n, (body, self) => {
      body.innerHTML = '';
      const icon = this.itemIcon(n, 'it-big');
      if (this.ui.hasImg('item', n)) icon.addEventListener('click', () => this.ui.viewImage('item', n, { title: n, sub: TYPE[it.type], text: it.desc }));
      body.appendChild(el('div', { class: 'it-head' }, icon,
        el('div', {}, el('div', { class: 'muted small' }, TYPE[it.type] + (g.items[n] ? `・持有 ${g.items[n]}` : '')),
          it.element ? el('span', { class: 'elem e-' + it.element }, it.element) : null,
          it.stats ? el('div', { class: 'it-stats' }, Object.entries(it.stats).map(([k, v]) => `${STAT_NAMES[k]} +${v}`).join('　')) : null)));
      body.appendChild(el('p', { class: 'dialog-text' }, it.desc));
      if (it.type === 'use' && g.items[n]) {
        if (it.revive) body.appendChild(el('p', { class: 'muted' }, '只能在戰鬥中使用。'));
        else g.party.forEach(p => {
          const m = g.members[p]; const st = memberStats(g, m);
          body.appendChild(el('button', { class: 'btn wide', onclick: () => {
            if (it.heal) m.hp = Math.min(st.hp, m.hp + it.heal);
            if (it.mp) m.mp = Math.min(st.mp, m.mp + it.mp);
            addItem(g, n, -1);
            this.ctx.audio.sfx('heal');
            if (!g.items[n]) api.close(); else self.rebuild();
            parent.rebuild();
          } }, `給 ${displayName(g, p)}　體 ${m.hp}/${st.hp}　墨 ${m.mp}/${st.mp}`));
        });
      }
      if ((it.type === 'weapon' || it.type === 'charm') && g.items[n]) {
        body.appendChild(el('h3', {}, '裝備給'));
        const who = g.party.filter(p => !CHARACTERS[p].spirit && (!it.who || it.who.includes(p)));
        if (!who.length) body.appendChild(el('p', { class: 'muted' }, '隊伍裡沒有人能裝備它。'));
        who.forEach(p => {
          const m = g.members[p];
          const before = memberStats(g, m);
          const old = m[it.type];
          m[it.type] = n; const after = memberStats(g, m); m[it.type] = old;
          const diff = ['atk', 'def', 'mag', 'res', 'spd', 'luk'].filter(k => after[k] !== before[k])
            .map(k => el('span', { class: after[k] > before[k] ? 'up' : 'down' }, `${STAT_NAMES[k]} ${before[k]}→${after[k]}`));
          body.appendChild(el('button', { class: 'btn wide eq-btn', onclick: () => {
            if (old) addItem(g, old, 1);
            addItem(g, n, -1); m[it.type] = n;
            this.ctx.audio.sfx('item');
            api.close(); parent.rebuild();
          } }, el('b', {}, displayName(g, p)), el('small', {}, `目前：${old || '（無）'}`), el('div', { class: 'eq-diff' }, diff.length ? diff : '數值不變')));
        });
      }
    });
  }

  useItem(n, parent) { this.itemDetail(n, parent); }

  // ───────── 史卷（藏書閣） ─────────
  // 條目的圖：人物用頭像、妖物用敵人圖、地點用場景圖、器物用道具圖
  codexImg(e) {
    const ui = this.ui;
    const ALIAS = {
      楊范登堡: ['char', '楊'], 陳阿順: ['char', '阿順'], 貞人箙: ['char', '箙'],
      熱蘭遮城: ['bg', '熱蘭遮城內'], 大員: ['bg', '大員沙洲'], 赤崁: ['bg', '赤崁街市'], 鹿耳門: ['bg', '鹿耳門星夜'], 神農街: ['bg', '神農街夜'],
      洹水: ['bg', '洹水岸邊'], 歷史文物陳列館: ['bg', '南港陳列館'], 殷墟發掘: ['bg', '南港陳列館'], 烏特勒支堡: ['bg', '圍城大員'],
      赫克托號: ['cg', '海翁'], 郭懷一事件: ['bg', '甘蔗田大火'], 甘蔗與糖: ['bg', '赤崁甘蔗田'], 唐人移民: ['bg', '臺江岸邊'],
      無面書記: ['char', '無面書記'], 刺竹: ['bg', '刺竹林'], 甲骨文: ['item', '卜骨'], 西拉雅語的復振: ['item', '新港文書'],
    };
    if (e.enemy) return ui.hasImg('enemy', e.enemy) ? ['enemy', e.enemy] : null;
    const tries = [];
    if (ALIAS[e.id]) tries.push(ALIAS[e.id][0] === 'char' ? ['char', ui.charKey(ALIAS[e.id][1])] : ALIAS[e.id]);
    tries.push(['char', ui.charKey(e.id)], ['bg', e.id], ['item', e.id], ['cg', e.id]);
    return tries.find(([k, n]) => ui.hasImg(k, n)) || null;
  }

  static COLLECT = [
    [0.25, '還魂墨', 2], [0.5, '藏書票', 1], [0.75, '丹墨', 3], [1, '千秋書籤', 1],
  ];

  codex() {
    const g = this.g;
    const ui = this.ui;
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
      const ratio = got / entries.length;
      body.appendChild(el('div', { class: 'cx-progress' },
        el('div', { class: 'hub-stat' }, `已收錄 ${got} / ${entries.length}（${Math.floor(ratio * 100)}%）`),
        ui.bar(got, entries.length, 'exp')));
      // 收藏獎勵
      const rw = el('div', { class: 'cx-rewards' });
      Hub.COLLECT.forEach(([r, item, n], i) => {
        const key = '收藏獎.' + i;
        const ok = ratio >= r;
        rw.appendChild(el('button', { class: 'chip' + (g.flags[key] ? ' on' : ''), disabled: !ok || g.flags[key], onclick: () => {
          g.flags[key] = 1; addItem(g, item, n); this.ctx.audio.sfx('item');
          ui.toast(`收藏獎勵：${item}${n > 1 ? ' ×' + n : ''}`); self.rebuild();
        } }, `${Math.round(r * 100)}%　${g.flags[key] ? '已領取' : item + (n > 1 ? '×' + n : '')}`));
      });
      body.appendChild(rw);
      const bar = el('div', { class: 'tabs' });
      CATS.forEach(c => {
        const list = entries.filter(e => e.cat === c);
        bar.appendChild(el('button', { class: 'tab' + (cat === c ? ' on' : ''), onclick: () => { cat = c; self.rebuild(); } }, c, el('small', {}, ` ${list.filter(e => g.codex[e.id]).length}/${list.length}`)));
      });
      body.appendChild(bar);
      const grid = el('div', { class: 'cx-grid' });
      entries.filter(e => e.cat === cat).forEach(e => {
        const has = g.codex[e.id];
        const pic = has ? this.codexImg(e) : null;
        const title = has ? codexTitle(e.id) : '？？？';
        const card = el('button', { class: 'cx-card' + (has ? '' : ' locked') + (pic ? ' k-' + pic[0] : ''), disabled: !has },
          pic ? el('img', { src: pic[0] === 'bg' || pic[0] === 'cg' ? ui.imgSrc(pic[0], pic[1], 800) : ui.imgSrc(pic[0], pic[1]), alt: '', loading: 'lazy' })
            : el('span', { class: 'cx-blank' }, has ? Array.from(title)[0] : '？'),
          el('b', {}, title),
          has ? el('span', { class: 'fact f-' + e.fact }, e.fact) : null);
        if (has) card.onclick = () => {
          const lines = [];
          if (e.enemy) { const d = ENEMIES[e.enemy]; lines.push(`${d.element}屬性・${d.rank}・體 ${d.hp}`); }
          const info = { title, sub: `${e.cat}・${e.fact}`, text: e.text, lines };
          if (pic) ui.viewImage(pic[0], pic[1], info);
          else ui.alert(title, [info.sub, e.text, ...lines]);
        };
        grid.appendChild(card);
      });
      body.appendChild(grid);
      body.appendChild(el('p', { class: 'muted small' }, '「史實」：有文獻依據；「虛構」：本作創作；「史實改編」：以史實為基礎加以想像。點卡片可以放大閱讀。'));
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
      opt('閱讀方式', 'readMode', ['line', 'page', 'auto'], ['逐句點擊', '整頁', '自動播放']);
      opt('文字速度', 'speed', [2, 1, 0], ['慢', '快', '立即']);
      opt('外觀', 'theme', ['auto', 'dark', 'light'], ['跟隨系統', '墨夜', '宣紙']);
      opt('音效與音樂', 'sound', [true, false], ['開', '關'], v => { if (v) { this.ctx.audio.unlock(); this.ctx.audio.music(this.g ? this.g.loc.music : '書齋', true); } else { this.ctx.audio.stopMusic(); this.ctx.audio.stopAmbience(); } });
      opt('音量', 'volume', [0.3, 0.6, 1], ['小', '中', '大'], v => this.ctx.audio.setVolume(v));
      opt('朗讀劇情', 'tts', [false, true], ['關', '開']);
      opt('難度', 'difficulty', ['閱讀', '普通', '困難'], ['閱讀', '普通', '困難']);
      opt('戰鬥速度', 'battleSpeed', [1, 2, 3], ['1×', '2×', '4×']);
      opt('對話半身像', 'portrait', [true, false], ['開', '關'], v => { if (!v) this.ui.hidePortrait(); });
      opt('氛圍效果', 'ambient', [true, false], ['開', '關'], () => this.ui.setAmbient(this.ui.curTheme));
      opt('環境聲', 'ambSound', [true, false], ['開', '關'], v => { if (!v) this.ctx.audio.stopAmbience(); else { this.ctx.audio.amb = null; this.ui.setAmbient(this.ui.curTheme); } });
      opt('震動', 'vibrate', [true, false], ['開', '關'], v => { if (v) this.ui.vibrate(30); });
      opt('限時抉擇', 'timedChoice', [true, false], ['開', '關']);
      body.appendChild(el('p', { class: 'muted small' }, '閱讀方式——逐句點擊：每句都要點一下。整頁：一次跑完一頁（遇到選項或最多約六句），點一下再跑下一頁；打字中點一下可以立刻顯示整頁。自動播放：依字數停留後自動往下，打開選單時會暫停。'));
      body.appendChild(el('p', { class: 'muted small' }, '限時抉擇：少數緊張的時刻，選項會倒數計時；時間到了，會替你選「遲疑」的那一個。關掉就不會倒數。對話半身像：說話的角色會淡淡地出現在文字後面。氛圍效果：各卷的飄塵、火星等。環境聲：雨聲、風聲、火堆、鳥叫、蟬聲、戰壕遠方的砲聲。震動：暴擊與封靈時手機輕震（僅 Android 支援）。點任何圖片都可以放大，再點一下關閉。'));
      body.appendChild(el('p', { class: 'muted small' }, '「閱讀」難度：敵人很弱，並可隨時跳過戰鬥。難度不影響任何結局條件，隨時可以切換。朗讀使用手機內建的語音，效果依裝置而定。'));
    });
  }

  about() {
    this.ui.alert('關於《千秋硯》', [
      '試玩版 v1.1：序卷〈府城〉、卷一〈大員〉全五回、卷二〈牧野〉全五回、卷三〈阿瑪納〉全五回、卷四〈雅典〉回一。',
      '致敬《軒轅劍》與《仙劍奇俠傳》系列的文字角色扮演遊戲。',
      '本作以臺灣為立足點書寫世界史。史卷條目會標明「史實」與「虛構」；仍在延續的信仰不會被寫成法術。',
      '音樂與音效皆由程式即時合成。',
    ]);
  }

  async demoEnd() {
    const g = this.g;
    const vol = VOLUMES.find(v => v.id === g.lastVol);
    const done = vol && g.flags['卷完.' + vol.id];
    const todo = VOLUMES.filter(v => !g.flags['卷完.' + v.id]);
    if (done && vol.id === '終卷') {
      await this.ui.alert('《千秋硯》全劇終', [
        '謝謝你陪知墨與蘅，走過三千年。',
        todo.length ? `還沒走過的時代：${todo.map(v => `${v.id}〈${v.name}〉`).join('、')}。書架上的每一本書，都可以再打開。` : '書架上的每一本書，都可以再打開。換一個選擇，也許會遇見不一樣的結局。',
        '你的存檔會保留。茶室裡，也許有人在等你。',
      ], '回到書齋');
      this.ctx.goHub();
      return;
    }
    const picks = done && g.choices && g.choices[vol.id] || [];
    await this.ui.alert(done ? `${vol.id}〈${vol.name}〉完` : '試玩版到此為止', done ? [
      `感謝你陪知墨與蘅走完${vol.id}〈${vol.name}〉。`,
      picks.length ? '這一卷，你選擇了：\n' + picks.map(x => '・' + x.c).join('\n') : '',
      todo.length ? `接下來還有：${todo.map(v => `${v.id}〈${v.name}〉`).join('、')}。${todo.some(v => v.ready) ? '可以從書架進入。' : '製作中。'}` : '',
      '你的存檔會保留。茶室裡，也許有人在等你。',
    ].filter(Boolean) : [
      '感謝遊玩《千秋硯》試玩版。',
      '下一回製作中。你的存檔會保留，新章節推出後可以直接繼續。',
    ], '回到書齋');
    this.ctx.goHub();
  }

}
