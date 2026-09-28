// 戰鬥引擎：回合制、五行、合擊、陣法、封靈
import { ENEMIES, ENCOUNTERS, POOLS, SKILLS, COMBOS, FORMATIONS, STATUSES, ITEMS, CHARACTERS, elementMult, enemyCodexId } from './data.js';
import { memberStats, weaponElement, memberSkills, gainExp, bondLevel, displayName, addItem, addCodex } from './state.js';
import { el } from './ui.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const DIFF = {
  閱讀: { hp: 0.5, pow: 0.6 },
  普通: { hp: 1, pow: 1 },
  困難: { hp: 1.3, pow: 1.2 },
};

export class Battle {
  constructor(ctx) {
    this.ctx = ctx;
    this.root = document.getElementById('battle');
  }

  get g() { return this.ctx.g; }

  // 回傳 'win' / 'lose' / 'flee'
  async start(mode, id, canLose = false) {
    this.canLoseTo = canLose;
    let encId = id;
    if (mode === '隨機') {
      const pool = POOLS[id];
      if (!pool) throw new Error('沒有這個遭遇池：' + id);
      encId = pick(pool);
    }
    const enc = ENCOUNTERS[encId];
    if (!enc) throw new Error('沒有這個敵人組：' + encId);
    this.enc = enc; this.encId = encId;

    // 記下戰前狀態，供「重新挑戰」使用
    const snapshot = {};
    for (const n of this.g.party) { const m = this.g.members[n]; snapshot[n] = [m.hp, m.mp]; }

    for (;;) {
      const result = await this.fight();
      if (result !== 'lose' || this.canLoseTo) return result;
      const choice = await this.gameOver();
      if (choice === 'retry') {
        for (const n in snapshot) { const m = this.g.members[n]; [m.hp, m.mp] = snapshot[n]; }
        continue;
      }
      return 'quit';
    }
  }

  async fight() {
    const g = this.g;
    const s = this.ctx.settings;
    const diff = DIFF[s.difficulty] || DIFF.普通;
    const form = FORMATIONS[g.formation] || FORMATIONS.一字陣;
    this.round = 0;
    this.lastActions = {};
    this.auto = !!this.autoPref;
    this.repeatRound = false;
    this.over = null;

    // 我方
    this.allies = g.party.map((n, i) => {
      const m = g.members[n];
      const st = memberStats(g, m);
      for (const k in form.mods) st[k] = Math.round(st[k] * form.mods[k]);
      return {
        side: 'ally', id: 'a' + i, key: n, name: displayName(g, n), ref: m, st,
        maxhp: st.hp, maxmp: st.mp, hp: Math.min(m.hp, st.hp), mp: Math.min(m.mp, st.mp),
        el: CHARACTERS[n].element, atkEl: weaponElement(m), status: {}, buffs: [], alive: m.hp > 0,
      };
    });
    if (this.allies.every(a => !a.alive)) this.allies.forEach(a => { a.hp = 1; a.alive = true; });

    // 敵方
    const counts = {};
    this.foes = this.enc.enemies.map((k, i) => {
      const d = ENEMIES[k];
      counts[k] = (counts[k] || 0) + 1;
      const dup = this.enc.enemies.filter(x => x === k).length > 1;
      const hp = Math.round(d.hp * diff.hp);
      return {
        side: 'foe', id: 'f' + i, key: k, name: k + (dup ? ' ' + '甲乙丙丁'[counts[k] - 1] : ''), def: d,
        st: { atk: Math.round(d.atk * diff.pow), def: d.def, mag: Math.round(d.mag * diff.pow), res: d.res, spd: d.spd, luk: d.luk },
        maxhp: hp, hp, maxmp: 0, mp: 0, el: d.element, atkEl: d.element, status: {}, buffs: [], alive: true,
      };
    });

    this.render();
    this.root.classList.add('open');
    this.ctx.audio.music(this.enc.boss ? '首領' : '戰鬥');

    if (this.enc.tutorial === true && !g.flags['教學.戰鬥']) {
      g.flags['教學.戰鬥'] = 1;
      await this.ctx.ui.alert('戰鬥教學', [
        '輪到我方角色時，從下方選擇指令。敵人卡片上的字是它的五行屬性。',
        '五行相剋：金剋木、木剋土、土剋水、水剋火、火剋金。用剋制對方的屬性攻擊，傷害 ×1.5。',
        '知墨的「墨刃」是水屬性術法；褪墨鬼屬「陰」，沒有特別的弱點。',
        '想快一點？右上角可以開啟「自動」與調整速度。',
      ]);
    }
    if (this.enc.tutorial === 'seal' && !g.flags['教學.封靈']) {
      g.flags['教學.封靈'] = 1;
      await this.ctx.ui.alert('封靈教學', [
        '「封靈」是知墨的專屬指令：把被蝕扭曲的妖物封進千秋硯裡。',
        '敵人剩下的體越少，越容易封印成功。先把它打弱，再使用封靈。',
        '封入硯中的靈，之後可以在時之書齋的「研墨室」煉化成道具或夥伴。',
      ]);
    }

    this.log(this.enc.boss ? '強大的氣息逼近！' : '妖物出現了！');

    while (!this.over) {
      this.round++;
      this.repeatRound = false;
      this.renderRound();
      const units = [...this.allies, ...this.foes].filter(u => u.alive);
      units.forEach(u => { u.order = this.stat(u, 'spd') * rnd(0.9, 1.1); u.acted = false; });
      if (this.round === 1 && form.firstStrike) units.forEach(u => { if (u.side === 'ally') u.order += 1000; });
      units.sort((a, b) => b.order - a.order);
      for (const u of units) {
        if (this.over) break;
        if (!u.alive || u.acted) continue;
        await this.takeTurn(u);
        u.acted = true;
        this.checkEnd();
      }
    }

    const result = this.over;
    // 同步回角色資料
    for (const a of this.allies) { a.ref.hp = Math.max(a.alive ? a.hp : 0, 0); a.ref.mp = a.mp; }
    if (result === 'win') await this.rewards();
    if (result !== 'lose' || this.canLoseTo) for (const a of this.allies) if (a.ref.hp <= 0) a.ref.hp = 1;
    this.root.classList.remove('open');
    return result;
  }

  stat(u, k) {
    let v = u.st[k] ?? 0;
    if (k === 'acc') v = 1;
    for (const b of u.buffs) if (b.stat === k) v *= b.mult;
    return v;
  }

  checkEnd() {
    if (this.foes.every(f => !f.alive)) this.over = 'win';
    else if (this.allies.every(a => !a.alive)) this.over = 'lose';
  }

  async takeTurn(u) {
    // 回合開始：狀態
    if (u.status.瘴毒) {
      const d = Math.max(1, Math.round(u.maxhp * 0.08));
      this.damage(u, d, '瘴毒');
      this.log(`${u.name} 受到瘴毒侵蝕，失去 ${d} 體。`);
      await this.pause(0.8);
      if (!u.alive) { this.checkEnd(); return; }
    }
    u.defending = false;
    if (u.status.定身) {
      this.log(`${u.name} 無法動彈！`);
      this.tick(u);
      await this.pause(0.8);
      return;
    }

    let act;
    if (u.side === 'foe') act = this.foeAI(u);
    else {
      this.highlight(u);
      if (this.auto) act = this.allyAI(u);
      else if (this.repeatRound && this.lastActions[u.key]) act = this.validRepeat(u, this.lastActions[u.key]) || await this.chooseAction(u);
      else act = await this.chooseAction(u);
      if (act.type === 'skip') { this.over = 'win'; this.skipped = true; return; }
      if (act.type !== 'flee') this.lastActions[u.key] = act;
    }
    await this.execute(u, act);
    this.tick(u);
    this.highlight(null);
    this.renderAll();
  }

  tick(u) {
    for (const k in u.status) { u.status[k]--; if (u.status[k] <= 0) delete u.status[k]; }
    u.buffs.forEach(b => b.turns--);
    u.buffs = u.buffs.filter(b => b.turns > 0);
  }

  pause(x = 1) {
    const sp = [1, 2, 4][this.ctx.settings.battleSpeed - 1] || 1;
    return sleep((520 * x) / sp);
  }

  // ───────── AI ─────────
  foeAI(u) {
    const list = u.def.skills;
    const total = list.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total, name = '攻擊';
    for (const [n, w] of list) { r -= w; if (r <= 0) { name = n; break; } }
    if (name === '回聲' && u.hp > u.maxhp * 0.6) name = '攻擊';
    const alive = this.allies.filter(a => a.alive);
    const target = pick(alive);
    if (name === '攻擊') return { type: 'attack', target };
    return { type: 'skill', skill: name, target };
  }

  allyAI(u) {
    const skills = memberSkills(u.ref).filter(s => SKILLS[s].cost <= u.mp && !(u.status.褪色 && SKILLS[s].type !== 'phy'));
    const hurt = this.allies.filter(a => a.alive && a.hp < a.maxhp * 0.4).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0];
    const heal = skills.find(s => SKILLS[s].type === 'heal');
    if (hurt && heal) return { type: 'skill', skill: heal, target: SKILLS[heal].target === 'allies' ? null : hurt };
    const foes = this.foes.filter(f => f.alive);
    const weakest = foes.sort((a, b) => a.hp - b.hp)[0];
    const dmg = skills.filter(s => ['mag', 'phy'].includes(SKILLS[s].type));
    if (dmg.length && Math.random() < 0.55) {
      const best = dmg.map(s => ({ s, m: elementMult(SKILLS[s].element, weakest.el) * (SKILLS[s].power || 1) })).sort((a, b) => b.m - a.m)[0].s;
      return { type: 'skill', skill: best, target: weakest };
    }
    return { type: 'attack', target: weakest };
  }

  validRepeat(u, act) {
    const a = { ...act };
    if (a.type === 'skill') { const sk = SKILLS[a.skill]; if (!sk || sk.cost > u.mp) return null; }
    if (a.type === 'item' && !this.g.items[a.item]) return null;
    if (a.target && !a.target.alive && a.type !== 'item') {
      const pool = a.target.side === 'foe' ? this.foes : this.allies;
      a.target = pool.find(x => x.alive);
      if (!a.target) return null;
    }
    return a;
  }

  // ───────── 玩家選指令 ─────────
  chooseAction(u) {
    return new Promise(resolve => {
      this.resolveAction = resolve;
      this.showMain(u);
    });
  }

  done(act) {
    const r = this.resolveAction;
    this.resolveAction = null;
    this.cmdBox.innerHTML = '';
    this.clearTargeting();
    if (r) r(act);
  }

  showMain(u) {
    const box = this.cmdBox;
    box.innerHTML = '';
    const g = this.g;
    const fade = !!u.status.褪色;
    const combos = this.availableCombos(u);
    const btn = (label, fn, opts = {}) => el('button', { class: 'cmd' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled, onclick: () => { this.ctx.audio.sfx('tap'); fn(); } }, label);
    box.appendChild(el('div', { class: 'cmd-who' }, `${u.name} 的行動`));
    const grid = el('div', { class: 'cmd-grid' });
    grid.append(...[
      btn('攻擊', () => this.pickTarget(u, 'foe', t => this.done({ type: 'attack', target: t }))),
      btn('術法', () => this.showSkills(u), { disabled: fade || !memberSkills(u.ref).length }),
      u.key === '知墨' ? btn('封靈', () => this.pickTarget(u, 'foe', t => this.done({ type: 'seal', target: t }), f => f.def.rank !== '首領'), { disabled: u.mp < 10, cls: 'accent' }) : null,
      combos.length ? btn('合擊', () => this.showCombos(u, combos), { cls: 'accent' }) : null,
      btn('道具', () => this.showItems(u)),
      btn('防禦', () => this.done({ type: 'defend' })),
      u.key === '知墨' ? btn('研墨', () => this.done({ type: 'grind' })) : null,
      btn('撤退', () => this.done({ type: 'flee' }), { disabled: !!this.enc.noFlee }),
    ].filter(Boolean));
    box.appendChild(grid);
    const extra = el('div', { class: 'cmd-extra' });
    if (Object.keys(this.lastActions).length) extra.appendChild(btn('↻ 照上回合', () => { this.repeatRound = true; const a = this.validRepeat(u, this.lastActions[u.key] || { type: 'attack', target: this.foes.find(f => f.alive) }); this.done(a || { type: 'attack', target: this.foes.find(f => f.alive) }); }, { cls: 'small' }));
    if (this.ctx.settings.difficulty === '閱讀') extra.appendChild(btn('跳過戰鬥', () => this.done({ type: 'skip' }), { cls: 'small' }));
    if (extra.children.length) box.appendChild(extra);
    if (fade) box.appendChild(el('div', { class: 'cmd-note' }, '褪色中：無法使用術法'));
  }

  back(u) { return el('button', { class: 'cmd back', onclick: () => { this.clearTargeting(); this.showMain(u); } }, '← 返回'); }

  showSkills(u) {
    const box = this.cmdBox; box.innerHTML = '';
    box.appendChild(el('div', { class: 'cmd-who' }, `${u.name}・術法（墨 ${u.mp}）`));
    const list = el('div', { class: 'cmd-list' });
    for (const s of memberSkills(u.ref)) {
      const sk = SKILLS[s];
      const ok = sk.cost <= u.mp;
      list.appendChild(el('button', { class: 'cmd-row', disabled: !ok, onclick: () => {
        this.ctx.audio.sfx('tap');
        const act = t => this.done({ type: 'skill', skill: s, target: t });
        if (sk.target === 'enemy') this.pickTarget(u, 'foe', act);
        else if (sk.target === 'ally') this.pickTarget(u, 'ally', act);
        else act(null);
      } }, el('b', {}, s + (sk.element ? `〔${sk.element}〕` : '')), el('span', { class: 'cost' }, `墨 ${sk.cost}`), el('small', {}, sk.desc)));
    }
    box.appendChild(list);
    box.appendChild(this.back(u));
  }

  availableCombos(u) {
    const g = this.g;
    return Object.entries(COMBOS).filter(([, c]) => {
      if (!c.members.includes(u.key)) return false;
      return c.members.every(n => {
        const a = this.allies.find(x => x.key === n);
        if (!a || !a.alive || a.status.定身 || a.status.失語 || a.mp < c.cost) return false;
        if (n === '知墨') return true;
        return bondLevel(g.bonds[n] || 0) >= c.bond;
      });
    });
  }

  showCombos(u, combos) {
    const box = this.cmdBox; box.innerHTML = '';
    box.appendChild(el('div', { class: 'cmd-who' }, '合擊'));
    const list = el('div', { class: 'cmd-list' });
    for (const [name, c] of combos) {
      list.appendChild(el('button', { class: 'cmd-row', onclick: () => {
        const act = t => this.done({ type: 'combo', combo: name, target: t });
        if (c.target === 'enemy') this.pickTarget(u, 'foe', act); else act(null);
      } }, el('b', {}, name), el('span', { class: 'cost' }, `各耗墨 ${c.cost}`), el('small', {}, `${c.members.map(n => displayName(this.g, n)).join('＋')}：${c.desc}`)));
    }
    box.appendChild(list);
    box.appendChild(this.back(u));
  }

  showItems(u) {
    const box = this.cmdBox; box.innerHTML = '';
    box.appendChild(el('div', { class: 'cmd-who' }, '道具'));
    const list = el('div', { class: 'cmd-list' });
    const items = Object.entries(this.g.items).filter(([n]) => ITEMS[n] && ITEMS[n].type === 'use');
    if (!items.length) list.appendChild(el('div', { class: 'cmd-note' }, '沒有可以使用的道具。'));
    for (const [n, c] of items) {
      const it = ITEMS[n];
      list.appendChild(el('button', { class: 'cmd-row', onclick: () => {
        this.pickTarget(u, 'ally', t => this.done({ type: 'item', item: n, target: t }), it.revive ? a => !a.alive : a => a.alive, true);
      } }, el('b', {}, n), el('span', { class: 'cost' }, '×' + c), el('small', {}, it.desc)));
    }
    box.appendChild(list);
    box.appendChild(this.back(u));
  }

  pickTarget(u, side, cb, filter = x => x.alive, allowDead = false) {
    const pool = side === 'foe' ? this.foes : this.allies;
    const valid = pool.filter(x => (allowDead || x.alive) && filter(x));
    if (!valid.length) { this.ctx.ui.toast('沒有可以選擇的目標'); return; }
    if (valid.length === 1 && side === 'foe') { cb(valid[0]); return; }
    this.cmdBox.innerHTML = '';
    this.cmdBox.appendChild(el('div', { class: 'cmd-who' }, side === 'foe' ? '選擇目標（點敵人卡片）' : '選擇對象（點隊伍列）'));
    this.cmdBox.appendChild(this.back(u));
    this.targeting = true;
    for (const t of valid) {
      const node = this.nodes[t.id];
      node.classList.add('targetable');
      node.onclick = () => { this.ctx.audio.sfx('tap'); this.clearTargeting(); cb(t); };
    }
  }

  clearTargeting() {
    this.targeting = false;
    for (const id in this.nodes) { this.nodes[id].classList.remove('targetable'); this.nodes[id].onclick = null; }
  }

  // ───────── 執行 ─────────
  async execute(u, act) {
    const g = this.g;
    switch (act.type) {
      case 'attack': {
        let t = act.target && act.target.alive ? act.target : this.randomFoeOf(u);
        if (u.status.迷惘 && Math.random() < 0.5) {
          t = pick([...this.allies, ...this.foes].filter(x => x.alive && x !== u));
          this.log(`${u.name} 陷入迷惘，搞錯了方向！`);
        }
        this.log(`${u.name} 攻擊！`);
        await this.pause(0.4);
        this.physHit(u, t, 1, u.atkEl);
        await this.pause();
        break;
      }
      case 'skill': {
        const sk = SKILLS[act.skill];
        if (u.side === 'ally' && sk.type !== 'phy' && u.status.褪色) { this.log(`${u.name} 的字褪色了，使不出術法！`); await this.pause(); break; }
        u.mp -= sk.cost;
        this.log(`${u.name} 使出「${act.skill}」！`);
        await this.pause(0.4);
        await this.applySkill(u, sk, act.target);
        await this.pause();
        break;
      }
      case 'combo': {
        const c = COMBOS[act.combo];
        c.members.forEach(n => { const a = this.allies.find(x => x.key === n); a.mp -= c.cost; a.acted = true; });
        this.log(`合擊——「${act.combo}」！`);
        this.flashScreen();
        await this.pause(0.6);
        await this.applySkill(u, { ...c, power: c.power }, act.target, c.members.map(n => this.allies.find(x => x.key === n)));
        if (c.cures) this.allies.forEach(a => { delete a.status.褪色; delete a.status.失語; delete a.status.瘴毒; delete a.status.迷惘; });
        await this.pause();
        break;
      }
      case 'seal': await this.seal(u, act.target); break;
      case 'item': {
        const it = ITEMS[act.item];
        const t = act.target;
        addItem(g, act.item, -1);
        this.log(`${u.name} 使用了${act.item}。`);
        if (it.revive && !t.alive) { t.alive = true; t.hp = Math.round(t.maxhp * it.revive); this.float(t, '復甦', 'heal'); }
        if (it.heal && t.alive) this.heal(t, it.heal);
        if (it.mp && t.alive) { t.mp = Math.min(t.maxmp, t.mp + it.mp); this.float(t, '+' + it.mp + ' 墨', 'mp'); }
        if (it.cures) it.cures.forEach(s => delete t.status[s]);
        this.ctx.audio.sfx('heal');
        await this.pause();
        break;
      }
      case 'defend':
        u.defending = true;
        u.mp = Math.min(u.maxmp, u.mp + Math.max(1, Math.round(u.maxmp * 0.05)));
        this.log(`${u.name} 擺出防禦的架式。`);
        await this.pause(0.6);
        break;
      case 'grind':
        this.log(`${u.name} 靜靜研墨，全隊的墨回復了。`);
        this.allies.filter(a => a.alive).forEach(a => { const n = Math.round(a.maxmp * 0.15); a.mp = Math.min(a.maxmp, a.mp + n); this.float(a, '+' + n + ' 墨', 'mp'); });
        this.ctx.audio.sfx('magic');
        await this.pause();
        break;
      case 'flee': {
        const mySpd = Math.max(...this.allies.filter(a => a.alive).map(a => this.stat(a, 'spd')));
        const theirSpd = Math.max(...this.foes.filter(f => f.alive).map(f => this.stat(f, 'spd')));
        const ok = Math.random() < 0.6 + (mySpd - theirSpd) * 0.03;
        this.log(ok ? '成功撤退了。' : '沒能逃掉！');
        await this.pause();
        if (ok) this.over = 'flee';
        break;
      }
    }
    this.renderAll();
  }

  randomFoeOf(u) {
    const pool = (u.side === 'ally' ? this.foes : this.allies).filter(x => x.alive);
    return pick(pool);
  }

  async applySkill(u, sk, target, members) {
    const foesOf = u.side === 'ally' ? this.foes : this.allies;
    const friendsOf = u.side === 'ally' ? this.allies : this.foes;
    let targets;
    switch (sk.target) {
      case 'enemy': targets = [target && target.alive ? target : this.randomFoeOf(u)]; break;
      case 'enemies': targets = foesOf.filter(x => x.alive); break;
      case 'ally': targets = [target || u]; break;
      case 'allies': targets = friendsOf.filter(x => x.alive); break;
      case 'self': targets = [u]; break;
      default: targets = [target];
    }
    const hits = sk.hits || 1;
    for (const t of targets) {
      if (!t) continue;
      for (let h = 0; h < hits; h++) {
        if (!t.alive && sk.type !== 'heal') break;
        if (sk.type === 'phy') {
          const atkUnit = members ? { ...u, st: { ...u.st, atk: members.reduce((s, m) => s + this.stat(m, 'atk'), 0) * 0.6 } , buffs: u.buffs } : u;
          this.physHit(atkUnit, t, sk.power, sk.element || u.atkEl, sk.crit, u);
        } else if (sk.type === 'mag') {
          const mag = members ? members.reduce((s, m) => s + this.stat(m, 'mag'), 0) * 0.7 : this.stat(u, 'mag');
          this.magHit(u, t, mag, sk.power, sk.element);
        } else if (sk.type === 'heal') {
          if (!t.alive) continue;
          const amt = Math.round((sk.power + this.stat(u, 'mag') * 1.2) * rnd(0.95, 1.05));
          this.heal(t, amt);
          this.ctx.audio.sfx('heal');
        } else if (sk.type === 'cure') {
          (sk.cures || []).forEach(s => delete t.status[s]);
          this.heal(t, Math.round(sk.power + this.stat(u, 'mag') * 0.5));
          this.log(`${t.name} 身上的異常消失了。`);
          this.ctx.audio.sfx('heal');
        }
        if (sk.buff) {
          t.buffs.push({ ...sk.buff });
          const up = sk.buff.mult > 1;
          this.float(t, (up ? '↑' : '↓') + ({ atk: '力', def: '守', res: '定', spd: '疾', mag: '神', acc: '準' }[sk.buff.stat] || ''), up ? 'buff' : 'debuff');
          if (sk.buff.stat === 'def' && !up) t.buffs.push({ stat: 'res', mult: sk.buff.mult, turns: sk.buff.turns });
        }
        if (sk.status && t.alive && Math.random() < (sk.chance ?? 1) * (t.def && t.def.rank === '首領' ? 0.5 : 1)) {
          t.status[sk.status] = STATUSES[sk.status].turns + 1;
          this.log(`${t.name} 陷入「${sk.status}」！`);
          this.float(t, sk.status, 'debuff');
        }
        if (hits > 1) await this.pause(0.3);
      }
    }
  }

  physHit(u, t, power, element, forceCrit, realUser) {
    const user = realUser || u;
    const hit = Math.min(1, Math.max(0.7, 0.95 + (this.stat(u, 'spd') - this.stat(t, 'spd')) * 0.005)) * this.stat(user, 'acc');
    if (Math.random() > hit) { this.log(`${t.name} 閃開了！`); this.float(t, '閃避', 'miss'); return; }
    let dmg = (this.stat(u, 'atk') * 2 - this.stat(t, 'def')) * power;
    this.finishHit(user, t, dmg, element, forceCrit);
  }

  magHit(u, t, mag, power, element) {
    let dmg = mag * 2 + power - this.stat(t, 'res');
    this.finishHit(u, t, dmg, element, false, true);
  }

  finishHit(u, t, dmg, element, forceCrit, magic) {
    const mult = elementMult(element, t.el);
    dmg *= mult * rnd(0.9, 1.1);
    const crit = forceCrit || Math.random() < 0.05 + (this.stat(u, 'luk') || 0) / 2000;
    if (crit) dmg *= 1.5;
    if (t.defending) dmg *= 0.5;
    dmg = Math.max(1, Math.round(dmg));
    this.damage(t, dmg);
    let note = '';
    if (mult >= 1.5) note = '（相剋！）';
    else if (mult > 1) note = '（陰陽相衝！）';
    else if (mult < 0.75) note = '（被剋……）';
    else if (mult < 1) note = '（同屬性）';
    this.log(`${crit ? '暴擊！' : ''}${t.name} 受到 ${dmg} 點傷害${note}`);
    this.float(t, String(dmg), crit ? 'crit' : 'dmg');
    this.ctx.audio.sfx(crit ? 'crit' : magic ? 'magic' : 'hit');
    if (!t.alive) this.log(`${t.name} ${t.side === 'foe' ? '潰散了。' : '倒下了！'}`);
  }

  damage(t, n) {
    t.hp = Math.max(0, t.hp - n);
    if (t.hp <= 0) { t.alive = false; t.status = {}; t.buffs = []; }
    const node = this.nodes && this.nodes[t.id];
    if (node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }
  }

  heal(t, n) {
    const before = t.hp;
    t.hp = Math.min(t.maxhp, t.hp + n);
    this.float(t, '+' + (t.hp - before), 'heal');
    this.log(`${t.name} 回復了 ${t.hp - before} 體。`);
  }

  async seal(u, t) {
    const g = this.g;
    if (!t || !t.alive) t = this.foes.find(f => f.alive && f.def.rank !== '首領');
    if (!t) return;
    u.mp -= 10;
    this.log(`${u.name} 舉起千秋硯——「封！」`);
    await this.pause(0.6);
    const base = t.def.rank === '精英' ? 0.6 : 0.9;
    let chance = base * (1 - t.hp / t.maxhp) + (this.stat(u, 'luk') / 5) / 100;
    if (this.enc.tutorial === 'seal') chance += 0.5;
    if (t.sealTried) chance *= 0.7;
    chance = Math.max(0.05, Math.min(0.98, chance));
    if (Math.random() < chance) {
      t.alive = false; t.hp = 0; t.sealed = true;
      this.ctx.audio.sfx('seal');
      this.float(t, '封', 'seal');
      if (g.spirits.length < 30) { g.spirits.push(t.key); this.log(`${t.name} 化為一縷墨煙，被吸進了硯池！`); }
      else this.log(`${t.name} 被封印了，但硯池已滿，靈消散了。`);
    } else {
      t.sealTried = true;
      this.ctx.audio.sfx('fail');
      this.log(`封靈失敗……${t.name} 掙脫了。（成功率約 ${Math.round(chance * 100)}%）`);
    }
    await this.pause();
  }

  flashScreen() {
    this.root.classList.remove('flash'); void this.root.offsetWidth; this.root.classList.add('flash');
  }

  // ───────── 獎勵 ─────────
  async rewards() {
    const g = this.g;
    if (this.skipped) { this.foes.forEach(f => f.alive = false); }
    let exp = 0, money = 0;
    const drops = [];
    const newCodex = [];
    for (const f of this.foes) {
      exp += f.def.exp; money += f.def.money;
      for (const [it, rate] of f.def.drops || []) if (Math.random() < rate) drops.push(it);
      const cid = enemyCodexId(f.key);
      if (addCodex(g, cid)) newCodex.push(f.key);
    }
    g.money += money;
    drops.forEach(d => addItem(g, d, 1));
    const msgs = [];
    for (const a of this.allies) {
      const got = a.alive ? exp : Math.floor(exp / 2);
      msgs.push(...gainExp(g, a.ref, got));
      const n = a.key;
      if (n !== '知墨' && !CHARACTERS[n].spirit) {
        const vk = '戰鬥羈絆.' + (g.loc.vol || '') + '.' + n;
        const cur = g.flags[vk] || 0;
        if (cur < 10) { g.flags[vk] = +(cur + 0.2).toFixed(1); g.bonds[n] = +((g.bonds[n] || 0) + 0.2).toFixed(1); }
      }
    }
    this.ctx.audio.music(null);
    this.ctx.audio.sfx(msgs.length ? 'level' : 'win');
    const lines = [`獲得經驗 ${exp}　銀 ${money}`];
    if (drops.length) lines.push('取得：' + drops.join('、'));
    if (newCodex.length) lines.push('史卷新增妖物誌：' + newCodex.join('、'));
    lines.push(...msgs);
    await this.ctx.ui.alert('戰鬥勝利', lines, '繼續');
  }

  async gameOver() {
    this.root.classList.remove('open');
    return new Promise(resolve => {
      const api = this.ctx.ui.sheet('字跡模糊了……', body => {
        body.appendChild(el('p', { class: 'dialog-text' }, '眼前的一切像被水浸過的墨跡，慢慢暈開。'));
        body.appendChild(el('div', { class: 'col-btns' },
          el('button', { class: 'btn primary', onclick: () => { api.close(); resolve('retry'); } }, '重新挑戰這場戰鬥'),
          el('button', { class: 'btn', onclick: () => { api.close(); this.ctx.loadAuto(); resolve('quit'); } }, '讀取自動存檔'),
          el('button', { class: 'btn', onclick: () => { api.close(); this.ctx.toTitle(); resolve('quit'); } }, '回到標題')));
      }, { noClose: true });
    });
  }

  // ───────── 畫面 ─────────
  render() {
    const r = this.root;
    r.innerHTML = '';
    this.nodes = {};
    const top = el('div', { class: 'b-top' },
      this.roundEl = el('span', { class: 'b-round' }),
      el('span', { class: 'b-form' }, this.g.formation),
      el('div', { class: 'b-toggles' },
        this.autoBtn = el('button', { class: 'chip' + (this.auto ? ' on' : ''), onclick: () => { this.auto = !this.auto; this.autoPref = this.auto; this.autoBtn.classList.toggle('on', this.auto); if (this.auto && this.resolveAction) { const u = this.allies.find(a => a.hl); if (u) this.done(this.allyAI(u)); } } }, '自動'),
        this.speedBtn = el('button', { class: 'chip', onclick: () => { const s = this.ctx.settings; s.battleSpeed = s.battleSpeed % 3 + 1; this.ctx.saveSettings(); this.speedBtn.textContent = ['1×', '2×', '4×'][s.battleSpeed - 1]; } }, ['1×', '2×', '4×'][this.ctx.settings.battleSpeed - 1])));
    const foes = el('div', { class: 'b-foes n' + this.foes.length });
    for (const f of this.foes) {
      const n = el('div', { class: 'foe-card rank-' + f.def.rank },
        el('div', { class: 'fc-name' }, f.name),
        el('div', { class: 'fc-meta' }, el('span', { class: 'elem e-' + f.el }, f.el), el('span', { class: 'rank' }, f.def.rank)),
        el('div', { class: 'fc-bar' }),
        el('div', { class: 'fc-status' }));
      this.nodes[f.id] = n;
      foes.appendChild(n);
    }
    this.logEl = el('div', { class: 'b-log' });
    const party = el('div', { class: 'b-party' });
    for (const a of this.allies) {
      const n = el('div', { class: 'ally-row' },
        el('div', { class: 'ar-name' }, a.name, el('small', {}, ' Lv' + a.ref.lv)),
        el('div', { class: 'ar-bars' }, el('div', { class: 'ar-hp' }), el('div', { class: 'ar-mp' })),
        el('div', { class: 'ar-status' }));
      this.nodes[a.id] = n;
      party.appendChild(n);
    }
    this.cmdBox = el('div', { class: 'b-cmd' });
    r.append(top, foes, this.logEl, party, this.cmdBox);
    this.renderAll();
  }

  renderRound() { if (this.roundEl) this.roundEl.textContent = `第 ${this.round} 回合`; }

  renderAll() {
    const ui = this.ctx.ui;
    for (const f of this.foes) {
      const n = this.nodes[f.id];
      n.classList.toggle('dead', !f.alive);
      n.classList.toggle('sealed', !!f.sealed);
      const bar = n.querySelector('.fc-bar'); bar.innerHTML = ''; bar.appendChild(ui.bar(f.hp, f.maxhp, 'hp'));
      n.querySelector('.fc-status').textContent = Object.keys(f.status).join(' ') + (f.buffs.length ? ' ' + f.buffs.map(b => (b.mult > 1 ? '↑' : '↓')).join('') : '');
    }
    for (const a of this.allies) {
      const n = this.nodes[a.id];
      n.classList.toggle('dead', !a.alive);
      const hp = n.querySelector('.ar-hp'); hp.innerHTML = '';
      hp.append(ui.bar(a.hp, a.maxhp, 'hp'), el('span', {}, `體 ${a.hp}/${a.maxhp}`));
      const mp = n.querySelector('.ar-mp'); mp.innerHTML = '';
      mp.append(ui.bar(a.mp, a.maxmp, 'mp'), el('span', {}, `墨 ${a.mp}/${a.maxmp}`));
      n.querySelector('.ar-status').textContent = Object.keys(a.status).join(' ') + (a.defending ? ' 防禦' : '');
    }
  }

  highlight(u) {
    for (const a of this.allies) { a.hl = a === u; this.nodes[a.id].classList.toggle('active', a === u); }
  }

  log(msg) {
    if (!this.logEl) return;
    this.logEl.appendChild(el('div', {}, msg));
    while (this.logEl.children.length > 30) this.logEl.firstChild.remove();
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  float(t, text, kind) {
    const node = this.nodes[t.id];
    if (!node) return;
    const f = el('span', { class: 'float ' + kind }, text);
    node.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }
}
