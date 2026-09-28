// 論辯戰與小遊戲
import { DEBATES, TRANSLATE, CODEX } from './data.js';
import { mindSide, bondLevel } from './state.js';
import { el } from './ui.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 立論 剋 讓步 剋 引證 剋 反詰 剋 立論
const BEATS = { 立論: '讓步', 讓步: '引證', 引證: '反詰', 反詰: '立論' };
const TELLS = {
  立論: '挺直了背，準備闡述自己的主張。',
  反詰: '瞇起眼睛，等著你先開口。',
  引證: '低頭翻找手邊的冊子。',
  讓步: '語氣軟了下來。',
};

export class Debate {
  constructor(ctx) { this.ctx = ctx; this.root = document.getElementById('debate'); }
  get g() { return this.ctx.g; }

  // 回傳 '說服' / '人心' / '和解' / '敗'
  start(id) {
    const d = DEBATES[id];
    if (!d) throw new Error('沒有這場論辯：' + id);
    this.d = d;
    this.foeBelief = d.foeBelief; this.myBelief = d.myBelief;
    this.crowd = 0; this.accord = 0; this.round = 0;
    const g = this.g;
    const volCodex = Object.keys(g.codex).filter(k => CODEX[k] && CODEX[k].fact !== '虛構').length;
    const deck = [];
    const add = (t, n) => { for (let i = 0; i < n; i++) deck.push(t); };
    add('立論', 3); add('反詰', 3); add('讓步', 2);
    add('引證', Math.min(3, 1 + Math.floor(volCodex / 3)));
    const empathy = mindSide(g, '情') >= 15 || bondLevel(g.bonds[d.foe] || 0) >= 2;
    if (empathy) add('共感', 2);
    this.deckBase = deck; this.deck = [];
    this.empathy = empathy;
    this.ctx.audio.music('緊張');
    return new Promise(resolve => { this.resolve = resolve; this.render(); this.nextRound(); });
  }

  draw() {
    if (!this.deck.length) this.deck = [...this.deckBase].sort(() => Math.random() - 0.5);
    return this.deck.pop();
  }

  foeCard() {
    const w = this.d.foeCards;
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return '立論';
  }

  render() {
    const r = this.root; r.innerHTML = '';
    const d = this.d;
    r.appendChild(el('div', { class: 'd-head' },
      el('div', { class: 'd-title' }, '論辯'),
      el('div', { class: 'd-topic' }, d.topic)));
    this.meters = el('div', { class: 'd-meters' });
    r.appendChild(this.meters);
    this.logEl = el('div', { class: 'd-log' });
    r.appendChild(this.logEl);
    this.tellEl = el('div', { class: 'd-tell' });
    r.appendChild(this.tellEl);
    this.hand = el('div', { class: 'd-hand' });
    r.appendChild(this.hand);
    r.appendChild(el('div', { class: 'd-legend' }, '立論 剋 讓步 剋 引證 剋 反詰 剋 立論', el('br'), '「共感」不分勝負，累積三次可達成和解。'));
    r.classList.add('open');
    if (!this.g.flags['教學.論辯']) {
      this.g.flags['教學.論辯'] = 1;
      this.ctx.ui.alert('論辯教學', [
        '不是所有衝突都要靠打鬥解決。論辯中，雙方每回合各出一張「論點卡」。',
        '卡片互相剋制：立論 剋 讓步、讓步 剋 引證、引證 剋 反詰、反詰 剋 立論。',
        '留意對手的神情提示，它透露了對方下一張卡的傾向（但不一定準）。',
        '把對方的「信念」降到零就能說服他；或是在回合結束時贏得旁人的「人心」。',
        '收集越多史卷條目，「引證」卡就越多。',
      ]);
    }
    this.renderMeters();
  }

  renderMeters() {
    const ui = this.ctx.ui;
    this.meters.innerHTML = '';
    const row = (label, v, max, cls) => el('div', { class: 'd-meter' }, el('span', {}, label), ui.bar(v, max, cls), el('b', {}, `${Math.max(0, v)}`));
    this.meters.append(...[
      row(`${this.d.foe}的信念`, this.foeBelief, this.d.foeBelief, 'hp'),
      row('你的信念', this.myBelief, this.d.myBelief, 'mp'),
      el('div', { class: 'd-crowd' }, el('span', {}, '人心'), el('div', { class: 'crowd-track' }, ...Array.from({ length: 11 }, (_, i) => el('i', { class: i - 5 === this.crowd ? 'on' : (i === 5 ? 'mid' : '') }))), el('b', {}, (this.crowd > 0 ? '+' : '') + this.crowd)),
      this.empathy ? el('div', { class: 'd-accord' }, '和解 ' + '●'.repeat(this.accord) + '○'.repeat(Math.max(0, 3 - this.accord))) : null,
      el('div', { class: 'd-round' }, `第 ${this.round} / ${this.d.rounds} 回合`)].filter(Boolean));
  }

  line(who, text, cls = '') {
    this.logEl.appendChild(el('div', { class: 'd-line ' + cls }, who ? el('b', {}, who + '：') : null, text));
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  nextRound() {
    this.round++;
    if (this.round > this.d.rounds) return this.finish(this.crowd >= 3 ? '人心' : '敗');
    this.renderMeters();
    this.foeNext = this.foeCard();
    const tell = Math.random() < 0.7 ? this.foeNext : pick(Object.keys(BEATS));
    this.tellEl.textContent = `${this.d.foe}${TELLS[tell]}`;
    this.hand.innerHTML = '';
    const cards = [this.draw(), this.draw(), this.draw(), this.draw()];
    cards.forEach(c => {
      const text = pick(this.d.lines.me[c] || ['……']);
      this.hand.appendChild(el('button', { class: 'd-card t-' + c, onclick: () => this.play(c, text) }, el('b', {}, c), el('span', {}, text)));
    });
  }

  async play(mine, text) {
    this.ctx.audio.sfx('tap');
    this.hand.innerHTML = '';
    const theirs = this.foeNext;
    const me = this.ctx.g.player.call;
    this.line(me, text, 'me');
    await sleep(500);
    this.line(this.d.foe, pick(this.d.lines.foe[theirs] || ['……']), 'foe');
    await sleep(400);

    if (mine === '共感') {
      this.accord++;
      this.foeBelief = Math.min(this.d.foeBelief, this.foeBelief + 2);
      this.myBelief = Math.min(this.d.myBelief, this.myBelief + 2);
      if (theirs === '立論' || theirs === '反詰') this.myBelief -= 2;
      this.line('', '兩人都沉默了一會兒。空氣裡有什麼東西鬆動了。', 'sys');
      this.ctx.audio.sfx('heal');
      if (this.accord >= 3) return this.finish('和解');
    } else if (mine === theirs) {
      this.foeBelief -= 1; this.myBelief -= 1;
      this.line('', '針鋒相對，誰也沒有占到上風。', 'sys');
    } else if (BEATS[mine] === theirs) {
      this.win(mine, true);
    } else if (BEATS[theirs] === mine) {
      this.win(theirs, false);
    } else {
      // 不相剋：各自生效一半
      if (mine === '讓步') this.myBelief += 1; else this.foeBelief -= 2;
      if (theirs === '讓步') this.foeBelief += 1; else this.myBelief -= 2;
      this.line('', '兩人各說各話。', 'sys');
    }
    this.renderMeters();
    await sleep(500);
    if (this.foeBelief <= 0) return this.finish('說服');
    if (this.myBelief <= 0) return this.finish('敗');
    this.nextRound();
  }

  win(card, mine) {
    const s = mine ? 1 : -1;
    this.ctx.audio.sfx(mine ? 'hit' : 'fail');
    if (card === '立論' || card === '反詰') {
      if (mine) this.foeBelief -= 4; else this.myBelief -= 4;
      this.line('', mine ? '你的話正中要害！' : '對方的話讓你一時語塞。', 'sys ' + (mine ? 'good' : 'bad'));
    } else if (card === '引證') {
      if (mine) this.foeBelief -= 3; else this.myBelief -= 3;
      this.crowd = Math.max(-5, Math.min(5, this.crowd + s));
      this.line('', mine ? '旁聽的人們點了點頭。' : '旁聽的人們看向對方。', 'sys ' + (mine ? 'good' : 'bad'));
    } else if (card === '讓步') {
      if (mine) this.myBelief = Math.min(this.d.myBelief, this.myBelief + 3); else this.foeBelief = Math.min(this.d.foeBelief, this.foeBelief + 3);
      this.crowd = Math.max(-5, Math.min(5, this.crowd + s));
      this.line('', mine ? '你的退讓反而讓人們更願意聽你說。' : '對方的退讓贏得了旁人的好感。', 'sys ' + (mine ? 'good' : 'bad'));
    }
  }

  async finish(result) {
    const msg = { 說服: `${this.d.foe}沉默了很久，終於點了點頭。`, 人心: '雖然沒能說服對方，但旁聽的人們站在你這一邊。', 和解: '沒有誰贏了誰。你們只是終於聽見了彼此。', 敗: '你找不到更好的話了。' }[result];
    this.tellEl.textContent = '';
    this.hand.innerHTML = '';
    this.line('', msg, 'sys end');
    await sleep(600);
    await this.ctx.ui.alert('論辯結束：' + result, msg, '繼續');
    this.root.classList.remove('open');
    this.resolve(result);
  }
}

// ───────── 小遊戲：譯字 ─────────
export class Translate {
  constructor(ctx) { this.ctx = ctx; this.root = document.getElementById('minigame'); }

  start(id) {
    const d = TRANSLATE[id];
    if (!d) throw new Error('沒有這個小遊戲題組：' + id);
    this.d = d; this.i = 0; this.correct = 0;
    return new Promise(resolve => { this.resolve = resolve; this.render(); });
  }

  render() {
    const r = this.root; r.innerHTML = '';
    r.classList.add('open');
    r.appendChild(el('div', { class: 'mg-title' }, '譯字・' + this.d.title));
    r.appendChild(el('p', { class: 'mg-intro' }, this.d.intro));
    r.appendChild(el('p', { class: 'mg-rule' }, `選出每個荷蘭語單字的意思。答對 ${this.d.need} 題以上即過關。`));
    this.body = el('div', { class: 'mg-body' });
    r.appendChild(this.body);
    this.q();
  }

  q() {
    const d = this.d;
    if (this.i >= d.items.length) return this.end();
    const it = d.items[this.i];
    this.body.innerHTML = '';
    this.body.appendChild(el('div', { class: 'mg-progress' }, `${this.i + 1} / ${d.items.length}　答對 ${this.correct}`));
    this.body.appendChild(el('div', { class: 'mg-word' }, it.w));
    const opts = el('div', { class: 'mg-opts' });
    it.opts.forEach(o => {
      const b = el('button', { class: 'btn mg-opt', onclick: async () => {
        opts.querySelectorAll('button').forEach(x => x.disabled = true);
        const ok = o === it.a;
        if (ok) this.correct++;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) [...opts.children].find(x => x.textContent === it.a).classList.add('right');
        this.ctx.audio.sfx(ok ? 'item' : 'fail');
        await sleep(700);
        this.i++; this.q();
      } }, o);
      opts.appendChild(b);
    });
    this.body.appendChild(opts);
  }

  async end() {
    const win = this.correct >= this.d.need;
    this.body.innerHTML = '';
    this.body.appendChild(el('div', { class: 'mg-word small' }, `答對 ${this.correct} / ${this.d.items.length}`));
    if (win && this.d.note) this.body.appendChild(el('p', { class: 'mg-intro' }, this.d.note));
    this.body.appendChild(el('button', { class: 'btn primary', onclick: () => { this.root.classList.remove('open'); this.resolve(win ? '勝' : '敗'); } }, win ? '過關' : '再想想'));
  }
}
