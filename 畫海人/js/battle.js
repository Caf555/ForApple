// 戰鬥：前後兩排、換位、元素、地形、士氣、首領蓄力與第二階段
import { HEROES, SKILLS, ENEMIES, ITEMS, elementMult, weaknessOf } from './data.js';
import { heroStats, gainExp, DIFF } from './state.js';
import { el, $ } from './ui.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);

export const TERRAIN = {
  霧中: '霧中：雙方命中率下降（點燈可以抵銷）',
  潮間帶: '潮間帶：每三回合漲潮一次，前排受到潮水傷害（潮屬性不受影響）',
  高地: '高地：我方的法術與遠程攻擊威力提高',
  林: '林間：敵人可能會偷襲',
};

export class Battle {
  constructor(ctx) { this.ctx = ctx; }
  get g() { return this.ctx.g; }

  // opt：{ enemies: [名稱], terrain, lit, kind: '一般'|'精英'|'首領' }
  start(opt) {
    this.opt = opt;
    return new Promise(res => { this.finish = res; this.run(); });
  }

  async run() {
    const g = this.g, diff = DIFF[g.diff] || DIFF.標準;
    this.round = 0; this.over = null; this.logLines = [];
    this.allies = g.party.map((h, i) => {
      const s = heroStats(h);
      return { side: 'ally', id: 'a' + i, key: h.key, name: this.ctx.ui.fmt(h.key === '墨里' ? '{名}' : h.key), ref: h, el: HEROES[h.key].element,
        st: s, maxhp: s.hp, hp: Math.min(h.hp, s.hp), maxmp: s.mp, mp: Math.min(h.mp, s.mp), row: h.row, alive: h.hp > 0, status: {}, fx: {} };
    });
    if (this.allies.every(a => !a.alive)) this.allies.forEach(a => { a.alive = true; a.hp = 1; });
    const count = {};
    this.foes = this.opt.enemies.map((k, i) => {
      const d = ENEMIES[k]; count[k] = (count[k] || 0) + 1;
      const dup = this.opt.enemies.filter(x => x === k).length > 1;
      const hp = Math.round(d.hp * diff.foe);
      return { side: 'foe', id: 'f' + i, key: k, name: k + (dup ? ' ' + '甲乙丙'[count[k] - 1] : ''), def: d, el: d.element,
        st: { atk: Math.round(d.atk * diff.foe), def: d.def, mag: Math.round(d.mag * diff.foe), spd: d.spd },
        maxhp: hp, hp, row: d.row, alive: true, status: {}, fx: {} };
    });
    this.render();
    $('battle').classList.add('open');
    const boss = this.opt.kind === '首領';
    this.ctx.audio.music(boss ? '首領' : '戰鬥');
    if (boss) { this.ctx.audio.sfx('boss'); this.quake(); }
    this.log(boss ? '燈塔的光，熄了一下。' : this.opt.kind === '精英' ? '霧最濃的地方，有東西睜開了眼睛。' : '霧裡有東西撲了過來！');
    if (this.opt.terrain && TERRAIN[this.opt.terrain] && !(this.opt.terrain === '霧中' && this.opt.lit)) this.log('（' + TERRAIN[this.opt.terrain] + '）');
    if (this.opt.terrain === '霧中' && this.opt.lit) this.log('（燈火照亮了霧：命中不受影響）');
    if (!this.ctx.settings.tutRows) {
      this.ctx.settings.tutRows = true; this.ctx.saveSettings();
      await this.ctx.ui.alert('前排與後排', [
        '戰場分成前排和後排，站的位置會大大影響戰鬥：',
        '・前排：近身攻擊威力 +15%。可是敵人的近身攻擊，只打得到前排。',
        '・後排：只要前排還有人，受到的傷害 −30%，近身攻擊也打不到你；但你自己的近身攻擊威力減半。法術不受影響。',
        '・所以：耐打的阿潮站前排擋著，墨里和蓮笙在後排用法術。敵人也一樣——後排的鹽靈、燈蛾，要用法術去打。',
        '・輪到自己時可以「換位」；漲潮時前排會被海水打到，可以先退到後排。',
      ], '開始戰鬥');
    }
    const ambush = this.opt.terrain === '林' && Math.random() < 0.35;
    if (ambush) this.log('偷襲！敵人先動手了。');

    while (!this.over) {
      this.round++;
      this.$round.textContent = `第 ${this.round} 回合`;
      const units = [...this.allies, ...this.foes].filter(u => u.alive);
      units.forEach(u => { u.order = u.st.spd * rnd(0.85, 1.15) + (ambush && this.round === 1 && u.side === 'foe' ? 1000 : 0); u.acted = false; });
      units.sort((a, b) => b.order - a.order);
      for (const u of units) {
        if (this.over) break;
        if (!u.alive) continue;
        await this.turn(u);
        this.check();
      }
      if (this.over) break;
      // 回合結束：漲潮、狀態倒數
      if (this.opt.terrain === '潮間帶' && this.round % 3 === 0) await this.tide();
      for (const u of [...this.allies, ...this.foes]) {
        for (const k in u.status) if (--u.status[k] <= 0) delete u.status[k];
        for (const k in u.fx) if (--u.fx[k] <= 0) delete u.fx[k];
      }
      this.renderAll();
      this.check();
    }
    // 同步回隊伍
    for (const a of this.allies) { a.ref.hp = a.alive ? a.hp : 0; a.ref.mp = a.mp; a.ref.row = a.row; }
    const result = this.over;
    if (result === 'win') await this.rewards();
    else if (result === 'lose') await sleep(600);
    $('battle').classList.remove('open');
    this.finish(result);
  }

  pause(x = 1) { return sleep(480 * x / [1, 1.8, 3][(this.ctx.settings.speed || 2) - 1]); }

  check() {
    if (this.over) return;
    if (this.foes.every(f => !f.alive)) this.over = 'win';
    else if (this.allies.every(a => !a.alive)) this.over = 'lose';
  }

  // ───────── 一個人的回合 ─────────
  async turn(u) {
    u.defending = false;
    if (u.status.定身) { this.log(`${u.name} 動不了！`); this.float(u, '定身', 'st'); await this.pause(0.8); return; }
    if (u.status.迷惘 && Math.random() < 0.5) { this.log(`${u.name} 在霧裡迷了路，什麼都沒做。`); this.float(u, '迷惘', 'st'); await this.pause(0.8); return; }
    let act;
    if (u.side === 'foe') act = this.foeAI(u);
    else {
      this.highlight(u);
      act = this.ctx.settings.auto ? this.allyAI(u) : await this.choose(u);
      this.highlight(null);
    }
    if (act.type === 'flee') { this.log('撤退了。'); this.over = 'flee'; return; }
    await this.exec(u, act);
    await this.phaseCheck();
    this.renderAll();
  }

  foeAI(u) {
    const d = u.def;
    if (d.rank === '首領') {
      if (u.charging) { u.charging = false; return { type: 'skill', skill: d.big, big: true }; }
      u.n = (u.n || 0) + 1;
      if (u.n % 3 === 2) return { type: 'charge' };
    }
    const tot = d.skills.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * tot, name = '攻擊';
    for (const [n, w] of d.skills) { r -= w; if (r <= 0) { name = n; break; } }
    if (name === '守夜' && u.hp > u.maxhp * 0.6) name = '攻擊';
    return { type: 'skill', skill: name };
  }

  allyAI(u) {
    const sk = HEROES[u.key].skills.filter(s => SKILLS[s].cost <= u.mp);
    const hurt = this.allies.filter(a => a.alive && a.hp < a.maxhp * 0.45);
    const heal = sk.find(s => SKILLS[s].type === 'heal');
    if (hurt.length && heal) return { type: 'skill', skill: heal, target: hurt.sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0] };
    const foes = this.foes.filter(f => f.alive);
    const charging = foes.find(f => f.charging);
    const tgt = charging || foes.sort((a, b) => a.hp - b.hp)[0];
    const dmg = sk.filter(s => ['phy', 'mag'].includes(SKILLS[s].type) && SKILLS[s].target === 'enemy');
    if (dmg.length && Math.random() < 0.6) {
      const best = dmg.map(s => ({ s, m: elementMult(SKILLS[s].element, tgt.el) })).sort((a, b) => b.m - a.m)[0].s;
      const t = SKILLS[best].type === 'phy' ? this.meleeTargets('foe').includes(tgt) ? tgt : this.meleeTargets('foe')[0] : tgt;
      return { type: 'skill', skill: best, target: t };
    }
    const mt = this.meleeTargets('foe');
    return { type: 'skill', skill: '攻擊', target: mt.includes(tgt) ? tgt : mt[0] };
  }

  // 近身只能打前排；前排都倒了，才打得到後排
  meleeTargets(side) {
    const pool = (side === 'foe' ? this.foes : this.allies).filter(x => x.alive);
    const front = pool.filter(x => x.row === 'front');
    return front.length ? front : pool;
  }

  // ───────── 玩家選指令 ─────────
  choose(u) {
    return new Promise(res => {
      this.resolve = act => { this.resolve = null; this.clearTarget(); this.idle(); res(act); };
      this.menu(u);
    });
  }

  menu(u) {
    const box = this.$cmd; box.innerHTML = '';
    const b = (label, fn, opts = {}) => el('button', { class: 'cmd' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled, onclick: () => { this.ctx.audio.sfx('tap'); fn(); } }, label);
    box.append(el('div', { class: 'cmd-who' }, `${u.name} 的行動` + (u.row === 'back' ? '（後排：近身攻擊威力減半）' : '')),
      el('div', { class: 'cmd-grid' },
        b('攻擊', () => this.pickTarget(u, '攻擊')),
        b('技能', () => this.skillMenu(u), { cls: 'accent' }),
        b(u.row === 'front' ? '退到後排' : '站到前排', () => this.resolve({ type: 'move' }), { disabled: !this.canMove(u) }),
        b('防禦', () => this.resolve({ type: 'defend' })),
        b('道具', () => this.itemMenu(u), { disabled: !Object.entries(this.g.supply).some(([k, n]) => ITEMS[k] && n > 0) }),
        b('撤退', () => this.resolve({ type: 'flee' }), { disabled: this.opt.kind !== '一般' })));
  }

  idle() {
    this.$cmd.innerHTML = '';
    this.$cmd.append(el('div', { class: 'cmd-wait' }, this.ctx.settings.auto ? '自動戰鬥中……（右上角可以關掉）' : '……'));
  }

  canMove(u) {
    const to = u.row === 'front' ? 'back' : 'front';
    return this.allies.filter(a => a.row === to).length < 3;
  }

  skillMenu(u) {
    const box = this.$cmd; box.innerHTML = '';
    box.append(el('div', { class: 'cmd-who' }, `${u.name}・技能（靈 ${u.mp}）`));
    const list = el('div', { class: 'cmd-list' });
    for (const s of HEROES[u.key].skills) {
      const sk = SKILLS[s];
      list.append(el('button', { class: 'cmd-row', disabled: sk.cost > u.mp, onclick: () => { this.ctx.audio.sfx('tap'); this.pickTarget(u, s); } },
        el('b', {}, s + (sk.element ? `〔${sk.element}〕` : '')), el('span', {}, `靈 ${sk.cost}`), el('small', {}, sk.desc)));
    }
    box.append(list, el('button', { class: 'cmd back', onclick: () => this.menu(u) }, '← 返回'));
  }

  itemMenu(u) {
    const box = this.$cmd; box.innerHTML = '';
    box.append(el('div', { class: 'cmd-who' }, '道具'));
    for (const [k, n] of Object.entries(this.g.supply)) {
      if (!ITEMS[k] || n <= 0) continue;
      box.append(el('button', { class: 'cmd-row', onclick: () => this.pickAlly(u, a => ITEMS[k].revive ? !a.alive : a.alive, t => this.resolve({ type: 'item', item: k, target: t })) },
        el('b', {}, k), el('span', {}, '×' + n), el('small', {}, ITEMS[k].desc)));
    }
    box.append(el('button', { class: 'cmd back', onclick: () => this.menu(u) }, '← 返回'));
  }

  pickTarget(u, skill) {
    const sk = SKILLS[skill];
    if (sk.target === 'enemy') {
      const pool = sk.type === 'phy' ? this.meleeTargets('foe') : this.foes.filter(f => f.alive);
      if (pool.length === 1) return this.resolve({ type: 'skill', skill, target: pool[0] });
      this.$cmd.innerHTML = '';
      this.$cmd.append(el('div', { class: 'cmd-who' }, sk.type === 'phy' ? '選一個前排的敵人' : '選一個敵人'), el('button', { class: 'cmd back', onclick: () => { this.clearTarget(); this.menu(u); } }, '← 返回'));
      for (const t of pool) { const n = this.nodes[t.id]; n.classList.add('pickable'); n.onclick = () => { this.ctx.audio.sfx('tap'); this.resolve({ type: 'skill', skill, target: t }); }; }
      for (const f of this.foes) if (f.alive && !pool.includes(f)) this.nodes[f.id].classList.add('nohit');
    } else if (sk.target === 'ally') this.pickAlly(u, a => a.alive, t => this.resolve({ type: 'skill', skill, target: t }));
    else this.resolve({ type: 'skill', skill });
  }

  pickAlly(u, ok, cb) {
    const pool = this.allies.filter(ok);
    if (!pool.length) { this.ctx.ui.toast('沒有可以選的對象'); return; }
    this.$cmd.innerHTML = '';
    this.$cmd.append(el('div', { class: 'cmd-who' }, '選一名同伴'), el('button', { class: 'cmd back', onclick: () => { this.clearTarget(); this.menu(u); } }, '← 返回'));
    for (const t of pool) { const n = this.nodes[t.id]; n.classList.add('pickable'); n.onclick = () => { this.ctx.audio.sfx('tap'); cb(t); }; }
  }

  clearTarget() { for (const id in this.nodes) { this.nodes[id].classList.remove('pickable', 'nohit'); this.nodes[id].onclick = null; } }

  // ───────── 執行 ─────────
  async exec(u, act) {
    const g = this.g;
    if (act.type === 'move') {
      u.row = u.row === 'front' ? 'back' : 'front';
      this.log(`${u.name} ${u.row === 'front' ? '站到了前排' : '退到了後排'}。`);
      this.renderRows(); await this.pause(0.6); return;
    }
    if (act.type === 'defend') { u.defending = true; u.mp = Math.min(u.maxmp, u.mp + 2); this.log(`${u.name} 擺好架式。`); await this.pause(0.5); return; }
    if (act.type === 'item') {
      const it = ITEMS[act.item], t = act.target;
      g.supply[act.item]--;
      if (it.revive && !t.alive) { t.alive = true; t.hp = Math.round(t.maxhp * it.revive); this.float(t, '醒來', 'heal'); }
      else if (it.heal) this.heal(t, Math.round(t.maxhp * it.heal));
      if (it.mp && t.alive) { const b = t.mp; t.mp = Math.min(t.maxmp, t.mp + it.mp); this.float(t, '+' + (t.mp - b) + ' 靈', 'mp'); }
      this.log(`${u.name} 用了${act.item}。`);
      this.ctx.audio.sfx('heal'); this.renderRows(); await this.pause(); return;
    }
    if (act.type === 'charge') {
      u.charging = true;
      this.log(`⚠ ${u.name} 正在蓄力……下一次會使出「${u.def.big}」！`);
      if (!this.hinted) { this.hinted = true; this.log('（用它怕的屬性打中，或打出爆擊，就能打斷它。也可以先「防禦」。）'); }
      this.float(u, '蓄力', 'warn'); this.flash(); this.ctx.audio.sfx('boss'); await this.pause(1.2); return;
    }
    const sk = SKILLS[act.skill];
    if (u.side === 'ally') u.mp = Math.max(0, u.mp - sk.cost);
    if (act.skill !== '攻擊') this.log(`${u.name} 使出「${act.skill}」！`);
    if (act.big) { this.quake(); this.ctx.audio.sfx('boss'); }
    const foesOf = u.side === 'ally' ? this.foes : this.allies;
    const friends = u.side === 'ally' ? this.allies : this.foes;
    let targets;
    switch (sk.target) {
      case 'enemy': {
        if (u.side === 'foe') {
          const taunt = this.allies.find(a => a.alive && a.fx.taunt);
          const alive = this.allies.filter(a => a.alive), front = this.meleeTargets('ally');
          const pool = sk.type === 'phy' || Math.random() < 0.6 ? front : alive;
          targets = [taunt && (sk.type !== 'phy' || pool.includes(taunt)) ? taunt : pick(pool)];
        } else {
          let t = act.target && act.target.alive ? act.target : null;
          const pool = sk.type === 'phy' ? this.meleeTargets('foe') : this.foes.filter(f => f.alive);
          if (!t || !pool.includes(t)) t = pool[0];
          targets = [t];
        }
        break;
      }
      case 'enemyFront': targets = this.meleeTargets(u.side === 'ally' ? 'foe' : 'ally'); break;
      case 'allies': targets = (sk.type === 'heal' ? friends : foesOf).filter(x => x.alive); break;
      case 'ally': targets = [act.target && act.target.alive ? act.target : u]; break;
      case 'front': targets = friends.filter(x => x.alive && x.row === 'front'); break;
      default: targets = [u];
    }
    if (act.skill === '攻擊') this.log(`${u.name} 攻擊！`);
    await this.pause(0.35);
    for (const t of targets) {
      if (!t) continue;
      if (sk.type === 'phy' || sk.type === 'mag') this.hit(u, t, sk, !!act.big);
      if (sk.type === 'heal') { const amt = Math.round(sk.power + (u.st.mag || 0) * 1.1); this.heal(t, amt); if (sk.cure) { t.status = {}; this.log(`${t.name} 身上的異常消失了。`); } this.ctx.audio.sfx('heal'); }
      if (sk.mark) { t.fx.mark = sk.mark; this.float(t, '標記', 'st'); this.log(`${t.name} 被畫上了記號。弱點是「${weaknessOf(t.el)}」。`); }
      if (sk.ward) { t.fx.ward = sk.ward; this.float(t, '結界', 'buff'); }
      if (sk.taunt) { t.fx.taunt = sk.taunt; this.float(t, '挑釁', 'buff'); }
      if (sk.def) { t.st.def = Math.round(t.st.def * 1.3); this.float(t, '硬化', 'buff'); }
      if (sk.status && t.alive && Math.random() < (sk.chance ?? 1) * (t.def && t.def.rank ? 0.5 : 1)) { t.status[sk.status] = 2; this.float(t, sk.status, 'st'); this.log(`${t.name} 陷入「${sk.status}」。`); }
    }
    this.renderAll();
    await this.pause();
  }

  hit(u, t, sk, big) {
    const fogMiss = this.opt.terrain === '霧中' && !this.opt.lit ? 0.18 : 0.04;
    if (Math.random() < fogMiss) { this.log(`${t.name} 閃開了。`); this.float(t, '落空', 'miss'); return; }
    const element = sk.element || (u.side === 'foe' ? u.el : null);
    let dmg = sk.type === 'phy' ? (u.st.atk * 2 - t.st.def) * sk.power : u.st.mag * 1.6 + sk.power - t.st.def * 0.6;
    if (u.side === 'foe') dmg *= 0.85;
    dmg = Math.max(dmg, 2);
    if (sk.type === 'phy' && u.row === 'back') dmg *= 0.5;
    const mult = elementMult(element, t.el);
    dmg *= mult * rnd(0.9, 1.1);
    if (t.fx.mark) dmg *= 1.3;
    if (t.fx.ward && t.row === 'front') dmg *= 0.6;
    if (t.defending) dmg *= 0.5;
    // 後排：有前排擋著的時候，受到的傷害 −30%
    const sheltered = t.row === 'back' && (t.side === 'ally' ? this.allies : this.foes).some(x => x.alive && x.row === 'front');
    if (sheltered) dmg *= 0.7;
    // 前排：近身攻擊 +15%（站在最前面，揮得最用力）
    if (sk.type === 'phy' && u.row === 'front') dmg *= 1.15;
    if (big) dmg *= 1.5;
    if (u.side === 'ally' && sk.type === 'mag' && this.opt.terrain === '高地') dmg *= 1.25;
    // 遺跡讀到的線索：星屬性會讓燈守想起一些事
    const remember = u.side === 'ally' && element === '星' && t.key === '燈守' && this.g.flags.遺跡;
    if (remember) dmg *= 1.4;
    const m = this.g.morale;
    dmg *= u.side === 'ally' ? 1 + (m - 50) / 250 : 1 - (m - 50) / 400;
    const crit = Math.random() < 0.06;
    if (crit) dmg *= 1.5;
    dmg = Math.max(1, Math.round(dmg));
    t.hp = Math.max(0, t.hp - dmg);
    const note = (mult >= 1.5 ? '（剋制！）' : mult > 1 ? '（星影相衝！）' : mult < 0.8 ? '（被剋……）' : '') + (sheltered ? '（後排 −30%）' : '') + (sk.type === 'phy' && u.row === 'back' ? '（後排近身，威力減半）' : '');
    this.log(`${crit ? '爆擊！' : ''}${t.name} 受到 ${dmg} 點傷害${note}`);
    this.float(t, String(dmg), crit ? 'crit' : mult >= 1.3 ? 'weak' : 'dmg');
    this.shake(t);
    this.ctx.audio.sfx(crit ? 'crit' : sk.type === 'mag' ? 'magic' : 'hit');
    if (t.charging && t.alive && (mult >= 1.3 || crit || remember)) {
      t.charging = false; t.status.定身 = 1;
      this.log(remember ? '燈守愣住了。「……星星？她最喜歡……」蓄力被打斷了！' : `「${t.def.big}」被打斷了！`);
      this.float(t, '打斷', 'warn');
    }
    if (t.side === 'foe' && t.def.rank === '首領' && !t.phase2 && t.hp > 0 && t.hp <= t.maxhp / 2) t.phaseDue = true;
    if (t.hp <= 0) {
      t.alive = false; t.status = {}; t.fx = {}; t.charging = false;
      this.log(`${t.name} ${t.side === 'foe' ? '消散在霧裡。' : '倒下了！'}`);
      if (t.side === 'ally') this.g.morale = Math.max(0, this.g.morale - 10);
      else this.ctx.audio.sfx('down');
    }
  }

  heal(t, n) {
    const b = t.hp; t.hp = Math.min(t.maxhp, t.hp + n);
    this.float(t, '+' + (t.hp - b), 'heal');
  }

  async phaseCheck() {
    for (const f of this.foes) {
      if (!f.phaseDue || !f.alive) continue;
      f.phaseDue = false; f.phase2 = true;
      const p = f.def.phase2;
      this.flash(); this.quake(); this.ctx.audio.sfx('boss');
      this.log(p.line);
      if (p.element) { f.el = p.element; this.log(`${f.name} 的屬性變成了「${p.element}」！`); }
      f.st.atk = Math.round(f.st.atk * 1.2); f.st.mag = Math.round(f.st.mag * 1.2);
      this.float(f, '變', 'warn');
      this.renderAll();
      await this.pause(1.4);
    }
  }

  async tide() {
    this.log('漲潮了！海水漫過了前排。');
    this.ctx.audio.sfx('tide'); this.flash();
    for (const u of [...this.allies, ...this.foes]) {
      if (!u.alive || u.row !== 'front' || u.el === '潮') continue;
      const d = Math.max(1, Math.round(u.maxhp * 0.08));
      u.hp = Math.max(0, u.hp - d); this.float(u, String(d), 'dmg');
      if (u.hp <= 0) { u.alive = false; this.log(`${u.name} 被潮水捲走了。`); }
    }
    this.renderAll();
    await this.pause(1);
  }

  async rewards() {
    const g = this.g;
    let exp = 0, silver = 0;
    for (const f of this.foes) { exp += f.def.exp; silver += f.def.silver; }
    g.silver += silver;
    g.stats.kills += this.foes.length;
    g.morale = Math.min(100, g.morale + ({ 首領: 15, 精英: 12 }[this.opt.kind] || 6));
    const msgs = [];
    for (const a of this.allies) msgs.push(...gainExp(a.ref, a.alive ? exp : Math.floor(exp / 2)));
    for (const a of this.allies) if (a.ref.hp <= 0) a.ref.hp = 1;
    this.ctx.audio.music(null);
    this.ctx.audio.sfx(msgs.length ? 'level' : 'win');
    await this.ctx.ui.alert('戰鬥勝利', [`經驗 ${exp}　銀貝 ${silver}　士氣 ${g.morale}`, ...msgs]);
  }

  // ───────── 畫面 ─────────
  render() {
    const r = $('battle'); r.innerHTML = '';
    this.nodes = {};
    const s = this.ctx.settings;
    const top = el('div', { class: 'b-top' },
      this.$round = el('b', {}, ''),
      el('span', { class: 'chip t' }, this.opt.terrain + (this.opt.terrain === '霧中' && this.opt.lit ? '（有燈）' : '')),
      this.$morale = el('span', { class: 'chip' }, ''),
      el('span', { class: 'grow' }),
      this.$auto = el('button', { class: 'chip btn-chip' + (s.auto ? ' on' : ''), onclick: () => { s.auto = !s.auto; this.ctx.saveSettings(); this.$auto.classList.toggle('on', s.auto); if (s.auto && this.resolve) { const u = this.allies.find(a => a.hl); if (u) this.resolve(this.allyAI(u)); } } }, '自動'),
      this.$speed = el('button', { class: 'chip btn-chip', onclick: () => { s.speed = s.speed % 3 + 1; this.ctx.saveSettings(); this.$speed.textContent = ['1×', '2×', '3×'][s.speed - 1]; } }, ['1×', '2×', '3×'][s.speed - 1]));
    this.$foeBack = el('div', { class: 'row foe back' }); this.$foeFront = el('div', { class: 'row foe front' });
    this.$allyFront = el('div', { class: 'row ally front' }); this.$allyBack = el('div', { class: 'row ally back' });
    for (const f of this.foes) this.nodes[f.id] = this.card(f);
    for (const a of this.allies) this.nodes[a.id] = this.card(a);
    this.$log = el('div', { class: 'b-log', 'aria-live': 'polite' });
    this.$cmd = el('div', { class: 'b-cmd' });
    this.idle();
    r.append(top,
      el('div', { class: 'field foes' }, el('div', { class: 'rlabel' }, '敵方後排　近身打不到・受傷 −30%'), this.$foeBack, el('div', { class: 'rlabel front' }, '敵方前排　近身攻擊只能打這一排'), this.$foeFront),
      this.$log,
      el('div', { class: 'field mine' }, el('div', { class: 'rlabel front' }, '我方前排　近身 +15%・敵人的近身攻擊只打這一排'), this.$allyFront, el('div', { class: 'rlabel' }, '我方後排　受傷 −30%・近身攻擊威力減半'), this.$allyBack),
      this.$cmd);
    this.renderRows();
  }

  card(u) {
    const ally = u.side === 'ally';
    const face = el('span', { class: 'face', style: { background: ally ? HEROES[u.key].color : 'var(--foe)' } }, u.name.slice(0, 1));
    return el('div', { class: 'unit ' + u.side + (u.def && u.def.rank ? ' rank' : '') },
      face, el('div', { class: 'u-main' },
        el('div', { class: 'u-name' }, el('span', { class: 'elem e-' + u.el }, u.el), u.name),
        el('div', { class: 'u-hp' }), ally ? el('div', { class: 'u-mp' }) : null, el('div', { class: 'u-st' })));
  }

  renderRows() {
    const put = (box, list) => { box.innerHTML = ''; list.forEach(u => box.append(this.nodes[u.id])); if (!list.length) box.append(el('div', { class: 'empty' }, '—')); };
    put(this.$foeBack, this.foes.filter(f => f.row === 'back'));
    put(this.$foeFront, this.foes.filter(f => f.row === 'front'));
    put(this.$allyFront, this.allies.filter(a => a.row === 'front'));
    put(this.$allyBack, this.allies.filter(a => a.row === 'back'));
    this.renderAll();
  }

  renderAll() {
    this.$morale.textContent = `士氣 ${this.g.morale}`;
    this.$morale.className = 'chip' + (this.g.morale >= 70 ? ' good' : this.g.morale < 30 ? ' bad' : '');
    for (const u of [...this.allies, ...this.foes]) {
      const n = this.nodes[u.id];
      n.classList.toggle('dead', !u.alive);
      n.classList.toggle('charging', !!u.charging && u.alive);
      n.querySelector('.elem').textContent = u.el; n.querySelector('.elem').className = 'elem e-' + u.el;
      const hp = n.querySelector('.u-hp'); hp.innerHTML = ''; hp.append(this.ctx.ui.bar(u.hp, u.maxhp, 'hp'), el('small', {}, `${u.hp}/${u.maxhp}`));
      const mp = n.querySelector('.u-mp'); if (mp) { mp.innerHTML = ''; mp.append(this.ctx.ui.bar(u.mp, u.maxmp, 'mp'), el('small', {}, `靈 ${u.mp}`)); }
      const tags = [...Object.keys(u.status), u.fx.mark ? '記號' : '', u.fx.ward ? '結界' : '', u.fx.taunt ? '挑釁' : '', u.defending ? '防禦' : ''].filter(Boolean);
      n.querySelector('.u-st').textContent = tags.join(' ');
    }
  }

  highlight(u) { for (const a of this.allies) { a.hl = a === u; this.nodes[a.id].classList.toggle('active', a === u); } }

  log(msg) {
    this.$log.append(el('div', {}, msg));
    while (this.$log.children.length > 12) this.$log.firstChild.remove();
    this.$log.scrollTop = this.$log.scrollHeight;
  }

  float(u, text, kind) {
    const n = this.nodes[u.id]; if (!n) return;
    const f = el('span', { class: 'float ' + kind }, text);
    n.append(f); setTimeout(() => f.remove(), 1000);
  }
  shake(u) { const n = this.nodes[u.id]; if (!n) return; n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); }
  flash() { const r = $('battle'); r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); }
  quake() { const r = $('battle'); r.classList.remove('quake'); void r.offsetWidth; r.classList.add('quake'); }
}
