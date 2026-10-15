// 論辯戰與小遊戲
import { DEBATES, TRANSLATE, CODEX } from './data.js';
import { mindSide, bondLevel, addCollection } from './state.js';
import { MINI, DIFF_NAME } from './minigames.js';
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
    r.appendChild(el('div', { class: 'd-legend' }, '立論 剋 讓步 剋 引證 剋 反詰 剋 立論', el('br'), '「共感」不分勝負，累積三次可達成和解。回合用完時，人心 +2 以上或信念比對方剩得多，就算贏得人心。'));
    r.classList.add('open');
    if (!this.g.flags['教學.論辯']) {
      this.g.flags['教學.論辯'] = 1;
      this.ctx.ui.alert('論辯教學', [
        '不是所有衝突都要靠打鬥解決。論辯中，雙方每回合各出一張「論點卡」。',
        '卡片互相剋制：立論 剋 讓步、讓步 剋 引證、引證 剋 反詰、反詰 剋 立論。',
        '留意對手的神情提示，它透露了對方下一張卡的傾向（但不一定準）。',
        '把對方的「信念」降到零就能說服他。回合用完時，如果旁人的「人心」在 +2 以上，或你剩下的信念比對方多，就算贏得人心。',
        '輸掉一回合不代表輸掉整場論辯。看準對方的神情，下一回合再扳回來。',
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
    if (this.round > this.d.rounds) {
      // 回合用完：人心 +2 以上，或你剩下的信念比例比對方高，都算贏得人心
      const ahead = this.foeBelief / this.d.foeBelief < this.myBelief / this.d.myBelief;
      return this.finish(this.crowd >= 2 || ahead ? '人心' : '敗');
    }
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
    // 出牌後卡片區先清空，但保留原本的高度，畫面才不會上下跳
    this.hand.style.minHeight = this.hand.offsetHeight + 'px';
    this.hand.innerHTML = '';
    const theirs = this.foeNext;
    const me = this.ctx.g.player.call;
    this.line(me, text, 'me');
    await sleep(500);
    this.line(this.d.foe, pick(this.d.lines.foe[theirs] || ['……']), 'opp');
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
      if (mine) this.foeBelief -= 8; else this.myBelief -= 8;
      this.line('', mine ? '你的話正中要害！' : '對方的話讓你一時語塞。', 'sys ' + (mine ? 'good' : 'bad'));
    } else if (card === '引證') {
      if (mine) this.foeBelief -= 6; else this.myBelief -= 6;
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

// ───────── 小遊戲 ─────────
// 每個小遊戲都可以「跳過」（當作沒過，劇情照走）；設定裡也可以選「全部跳過」
// 動手玩的新玩法在 minigames.js；這裡留著原本的研墨、電碼、描字、修復、排序與問答
export class Translate {
  constructor(ctx) { this.ctx = ctx; this.root = document.getElementById('minigame'); this.stops = []; }

  // opts.practice：書齋小遊戲間的練習（不影響劇情）；opts.diff：指定難度（0 閱讀、1 普通、2 困難）
  start(id, opts = {}) {
    const d = TRANSLATE[id];
    if (!d) throw new Error('沒有這個小遊戲題組：' + id);
    this.id = id; this.d = d; this.practice = !!opts.practice;
    this.diff = opts.diff ?? ({ 閱讀: 0, 普通: 1, 困難: 2 }[this.ctx.settings.difficulty] ?? 1);
    if (!this.practice && this.ctx.settings.miniGames === 'skip') {
      this.ctx.ui.note(`跳過小遊戲「${d.title}」`);
      return Promise.resolve('敗');
    }
    return new Promise(resolve => {
      this.resolve = r => {
        this.cleanup();
        this.root.classList.remove('open');
        addCollection('小遊戲', id);
        resolve(r);
      };
      this.run();
    });
  }

  run() {
    const d = this.d;
    this.cleanup();
    this.i = 0; this.correct = 0; this.solveFn = null;
    if (MINI[d.kind]) MINI[d.kind](this);
    else if (d.kind === '研墨') this.renderInk();
    else if (d.kind === '電碼') this.renderMorse();
    else if (d.kind === '描字') this.renderTrace();
    else if (d.kind === '修復') this.renderPuzzle();
    else if (d.kind === '排序') this.renderOrder();
    else this.render();
  }

  // 計時器：小遊戲結束、跳過、重來時一起停掉
  later(ms, fn) { const t = setTimeout(fn, ms); this.stops.push(() => clearTimeout(t)); return t; }
  every(ms, fn) { const t = setInterval(fn, ms); this.stops.push(() => clearInterval(t)); return t; }
  frame(fn) {
    let alive = true;
    const loop = now => { if (!alive) return; fn(now); if (alive) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    this.stops.push(() => { alive = false; });
  }
  onStop(fn) { this.stops.push(fn); }
  cleanup() {
    cancelAnimationFrame(this.raf);
    const s = this.stops; this.stops = [];
    s.forEach(f => { try { f(); } catch (e) { /* 已經停了 */ } });
  }
  sfx(k) { this.ctx.audio.sfx(k); }
  tone(freq, dur, type = 'sine', gain = 0.1) {
    const a = this.ctx.audio;
    if (!a.on || !a.ac) return;
    a.note(freq, a.ac.currentTime + 0.01, dur, type, gain);
  }
  // 自動測試用：直接解開這一關
  solve() { if (this.solveFn) return this.solveFn(); if (this.body) this.finish(true, '過關（測試）'); }

  name(t) { return String(t).replace(/\{名\}/g, (this.ctx.g && this.ctx.g.name) || '知墨'); }

  header() {
    const r = this.root; r.innerHTML = '';
    r.classList.add('open');
    r.appendChild(el('div', { class: 'mg-top' },
      el('div', { class: 'mg-title' }, (this.d.label || this.d.kind) + '・' + this.d.title),
      el('button', { class: 'btn small mg-skip', onclick: () => this.skip() }, this.practice ? '離開' : '跳過')));
    if (this.practice) r.appendChild(el('p', { class: 'mg-rule' }, `練習・難度：${DIFF_NAME[this.diff]}`));
    if (this.d.intro) r.appendChild(el('p', { class: 'mg-intro' }, this.name(this.d.intro)));
    if (this.d.rule) r.appendChild(el('p', { class: 'mg-rule' }, this.d.rule));
    this.body = el('div', { class: 'mg-body' });
    r.appendChild(this.body);
  }

  async skip() {
    if (!this.practice && !(await this.ctx.ui.confirm('跳過這個小遊戲？\n劇情會照「沒有過關」的版本繼續。'))) return;
    this.resolve('敗');
  }

  finish(win, scoreText, perfect) {
    this.cleanup();
    if (win && perfect && this.diff >= 2) addCollection('小遊戲完美', this.id);
    this.body.innerHTML = '';
    this.root.querySelector('.mg-skip')?.remove();
    this.body.appendChild(el('div', { class: 'mg-word small' }, scoreText));
    if (win && perfect && this.diff >= 2) this.body.appendChild(el('div', { class: 'mg-seal' }, '完美'));
    if (win && this.d.note) this.body.appendChild(el('p', { class: 'mg-intro' }, this.name(this.d.note)));
    if (!win && this.d.noteLose) this.body.appendChild(el('p', { class: 'mg-intro' }, this.name(this.d.noteLose)));
    const btns = el('div', { class: 'row-btns mg-end' });
    if (!win || this.practice) btns.appendChild(el('button', { class: 'btn', onclick: () => this.run() }, '再試一次'));
    btns.appendChild(el('button', { class: 'btn primary', onclick: () => this.resolve(win ? '勝' : '敗') }, this.practice ? '離開' : win ? '過關' : '繼續'));
    this.body.appendChild(btns);
  }

  // ───────── 研墨：墨點轉進金色的區塊時，按「研」 ─────────
  renderInk() {
    const d = this.d;
    this.header();
    const total = d.total || 8, need = d.need || 5;
    let tries = 0, hits = 0, zoneW = d.zone || 70, zoneA = 40 + Math.random() * 280, angle = 0, last = performance.now();
    const speed = d.speed || 140; // 每秒幾度
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 200 200'); svg.setAttribute('class', 'mg-ink');
    const mk = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); svg.appendChild(n); return n; };
    mk('circle', { cx: 100, cy: 100, r: 88, class: 'ink-stone' });
    const pool = mk('circle', { cx: 100, cy: 100, r: 62, class: 'ink-pool' });
    const zone = mk('path', { class: 'ink-zone' });
    const dot = mk('circle', { r: 9, class: 'ink-dot' });
    const polar = (deg, r) => [100 + r * Math.cos((deg - 90) * Math.PI / 180), 100 + r * Math.sin((deg - 90) * Math.PI / 180)];
    const drawZone = () => {
      const [x1, y1] = polar(zoneA, 76), [x2, y2] = polar(zoneA + zoneW, 76);
      zone.setAttribute('d', `M ${x1} ${y1} A 76 76 0 ${zoneW > 180 ? 1 : 0} 1 ${x2} ${y2}`);
    };
    drawZone();
    const count = el('div', { class: 'mg-progress' }, `第 1 / ${total} 次　研好 0`);
    const btn = el('button', { class: 'btn primary mg-tap' }, '研');
    this.body.append(count, svg, btn);
    const tick = now => {
      angle = (angle + speed * (now - last) / 1000) % 360; last = now;
      const [x, y] = polar(angle, 76);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    const press = () => {
      if (tries >= total) return;
      tries++;
      const rel = (angle - zoneA + 360) % 360;
      const ok = rel <= zoneW;
      if (ok) {
        hits++;
        this.ctx.audio.sfx('ink');
        pool.style.fillOpacity = String(0.15 + 0.85 * hits / total);
        zoneW = Math.max(32, zoneW - 5);
      } else this.ctx.audio.sfx('fail');
      svg.classList.remove('hit', 'miss'); void svg.offsetWidth; svg.classList.add(ok ? 'hit' : 'miss');
      zoneA = Math.random() * 360; drawZone();
      count.textContent = `第 ${Math.min(tries + 1, total)} / ${total} 次　研好 ${hits}`;
      if (tries >= total) this.later(500, () => this.finish(hits >= need, `研好 ${hits} / ${total}`));
    };
    btn.onclick = press;
  }

  // ───────── 電碼：短按「·」，長按「−」 ─────────
  renderMorse() {
    const d = this.d;
    this.header();
    let i = 0, correct = 0, input = '', downAt = 0, timer = null;
    const word = el('div', { class: 'mg-q' });
    const target = el('div', { class: 'mg-morse-target' });
    const shown = el('div', { class: 'mg-morse-in' });
    const prog = el('div', { class: 'mg-progress' });
    const key = el('button', { class: 'btn primary mg-key' }, '按住電鍵');
    const show = () => {
      const it = d.items[i];
      prog.textContent = `${i + 1} / ${d.items.length}　打對 ${correct}`;
      word.textContent = it.w;
      target.textContent = d.hideCode || (d.hideOnHard && this.diff >= 2) ? '' : it.code.split('').join(' ');
      shown.textContent = input ? input.split('').join(' ') : '　';
    };
    const check = () => {
      const it = d.items[i];
      if (input.length < it.code.length) return;
      const ok = input === it.code;
      if (ok) correct++;
      this.ctx.audio.sfx(ok ? 'good' : 'fail');
      shown.classList.remove('right', 'wrong'); shown.classList.add(ok ? 'right' : 'wrong');
      key.disabled = true;
      this.later(800, () => {
        shown.classList.remove('right', 'wrong'); key.disabled = false;
        i++; input = '';
        if (i >= d.items.length) return this.finish(correct >= d.need, `打對 ${correct} / ${d.items.length}`);
        show();
      });
    };
    const down = e => { e.preventDefault(); if (key.disabled) return; downAt = performance.now(); this.ctx.audio.keyOn(); key.classList.add('down'); };
    const up = e => {
      e.preventDefault();
      if (!downAt) return;
      const ms = performance.now() - downAt; downAt = 0;
      this.ctx.audio.keyOff(); key.classList.remove('down');
      input += ms < 230 ? '·' : '−';
      show();
      clearTimeout(timer); timer = setTimeout(check, 50);
    };
    key.addEventListener('pointerdown', down);
    key.addEventListener('pointerup', up);
    key.addEventListener('pointerleave', e => { if (downAt) up(e); });
    key.addEventListener('contextmenu', e => e.preventDefault());
    // 鍵盤也能打：按住空白鍵或 Enter
    key.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && !downAt) down(e); });
    key.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') up(e); });
    const clear = el('button', { class: 'btn small', onclick: () => { input = ''; show(); } }, '重打這一個');
    this.body.append(prog, word, target, shown, key, clear, el('p', { class: 'muted small' }, '短短地按一下是「·」，按久一點（大約半秒）是「−」。'));
    if (d.table) this.body.appendChild(el('div', { class: 'mg-morse-table' }, ...Object.entries(d.table).map(([k, v]) => el('span', {}, el('b', {}, k), v))));
    show();
  }

  // ───────── 描字：照著淡淡的筆畫，一筆一筆描 ─────────
  renderTrace() {
    const d = this.d;
    this.header();
    const ns = 'http://www.w3.org/2000/svg';
    let gi = 0, si = 0, miss = 0;
    const prog = el('div', { class: 'mg-progress' });
    const label = el('div', { class: 'mg-q' });
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('class', 'mg-trace');
    const hint = el('p', { class: 'muted small' }, '從綠色的點開始，沿著發亮的那一筆畫下去。');
    const skip = el('button', { class: 'btn small', onclick: () => { miss++; this.ctx.audio.sfx('fail'); nextStroke(); } }, '這一筆跳過');
    this.body.append(prog, label, svg, hint, skip);
    let paths = [], live = null, pts = [];
    const mk = (tag, attrs, parent = svg) => { const n = document.createElementNS(ns, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };
    const mark = () => {
      const it = d.items[gi];
      prog.textContent = `第 ${gi + 1} / ${d.items.length} 個字・第 ${si + 1} / ${it.glyph.length} 筆` + (miss ? `・失誤 ${miss}` : '');
      paths.forEach((p, k) => p.setAttribute('class', k < si ? 'tr-done' : k === si ? 'tr-cur' : 'tr-guide'));
      svg.querySelectorAll('.tr-start').forEach(n => n.remove());
      const p = paths[si]; if (!p) return;
      const a = p.getPointAtLength(0);
      mk('circle', { cx: a.x, cy: a.y, r: 4.5, class: 'tr-start' });
    };
    const showGlyph = () => {
      const it = d.items[gi];
      svg.innerHTML = '';
      mk('rect', { x: 2, y: 2, width: 96, height: 96, rx: 6, class: 'tr-paper' });
      paths = it.glyph.map(p => mk('path', { d: p, class: 'tr-guide' }));
      label.textContent = it.w;
      si = 0; mark();
    };
    const nextStroke = () => {
      if (live) { live.remove(); live = null; }
      si++;
      if (si < paths.length) return mark();
      paths.forEach(p => p.setAttribute('class', 'tr-done'));
      svg.querySelectorAll('.tr-start').forEach(n => n.remove());
      svg.classList.add('glyph-done');
      skip.disabled = true;
      this.ctx.audio.sfx('good');
      this.later(900, () => {
        svg.classList.remove('glyph-done');
        skip.disabled = false;
        gi++;
        if (gi >= d.items.length) return this.finish(miss <= (d.maxMiss ?? d.items.length * 2), `描完 ${d.items.length} 個字・失誤 ${miss} 次`);
        showGlyph();
      });
    };
    const toSvg = e => { const m = svg.getScreenCTM().inverse(); const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return [p.x, p.y]; };
    // 判斷：這一筆有八成的長度被描到，而且畫的線大多在筆畫附近
    const judge = () => {
      const p = paths[si];
      const len = p.getTotalLength();
      const near = (x, y, r) => pts.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 <= r * r);
      if (len < 6) { const c = p.getPointAtLength(0); return near(c.x, c.y, 12); }
      const n = Math.max(8, Math.round(len / 5));
      let cover = 0;
      const samples = [];
      for (let k = 0; k <= n; k++) { const q = p.getPointAtLength(len * k / n); samples.push([q.x, q.y]); if (near(q.x, q.y, 11)) cover++; }
      const onPath = pts.filter(([a, b]) => samples.some(([x, y]) => (a - x) ** 2 + (b - y) ** 2 <= 14 * 14)).length;
      return cover / (n + 1) >= 0.7 && onPath / pts.length >= 0.7;
    };
    // 紙漿寫字：筆停太久，漿就乾了，這一筆要重寫
    let lastMove = 0;
    const dry = d.dry ? d.dry[this.diff] ?? d.dry[1] : 0;
    if (dry) this.every(80, () => {
      if (!live || performance.now() - lastMove < dry) return;
      miss++; this.ctx.audio.sfx('fail');
      live.setAttribute('class', 'tr-live bad');
      const l = live; live = null; pts = [];
      this.later(350, () => l.remove());
      hint.textContent = d.dryText || '停太久了，漿乾掉了。這一筆重新寫。';
      mark();
    });
    svg.addEventListener('pointerdown', e => {
      if (si >= paths.length) return;
      e.preventDefault();
      lastMove = performance.now();
      try { svg.setPointerCapture(e.pointerId); } catch (_) { /* 有些瀏覽器不支援 */ }
      pts = [toSvg(e)];
      if (live) live.remove();
      live = mk('polyline', { points: pts.map(p => p.join(',')).join(' '), class: 'tr-live' });
    });
    svg.addEventListener('pointermove', e => {
      if (!live) return;
      lastMove = performance.now();
      pts.push(toSvg(e));
      live.setAttribute('points', pts.map(p => p.join(',')).join(' '));
    });
    const up = () => {
      if (!live || !pts.length) return;
      if (judge()) { this.ctx.audio.sfx('ink'); nextStroke(); }
      else {
        miss++;
        this.ctx.audio.sfx('fail');
        live.setAttribute('class', 'tr-live bad');
        const l = live; live = null;
        setTimeout(() => l.remove(), 350);
        mark();
      }
      pts = [];
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    showGlyph();
  }

  // ───────── 修復：把碎片換回原來的位置 ─────────
  renderPuzzle() {
    const d = this.d;
    this.header();
    const ns = 'http://www.w3.org/2000/svg';
    const [W, H] = d.size || [300, 200];
    const cols = d.cols || 3, rows = d.rows || 2, N = cols * rows;
    const tw = W / cols, th = H / rows;
    // 整張圖只畫一次，每一塊碎片用不同的 viewBox 去看它
    const art = document.createElementNS(ns, 'g');
    const add = (tag, attrs, text) => { const n = document.createElementNS(ns, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; art.appendChild(n); };
    add('rect', { x: 0, y: 0, width: W, height: H, class: 'pz-bg' });
    for (const p of d.fills || []) add('path', { d: p, class: 'pz-fill' });
    for (const p of d.paths || []) add('path', { d: p });
    for (const [x, y, t, size] of d.texts || []) add('text', { x, y, 'font-size': size || 22 }, t);
    const fixed = o => o.filter((v, i) => v === i).length;
    let order;
    do { order = [...Array(N).keys()].sort(() => Math.random() - 0.5); } while (fixed(order) > Math.floor(N / 4));
    let sel = -1, moves = 0;
    const prog = el('div', { class: 'mg-progress' });
    const board = el('div', { class: 'pz-board', style: { gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, aspectRatio: `${W} / ${H}` } });
    this.body.append(prog, board, el('p', { class: 'muted small' }, '點一片，再點另一片，兩片就會交換位置。放對的碎片會亮起金邊。'));
    const draw = () => {
      board.innerHTML = '';
      order.forEach((piece, pos) => {
        const sv = document.createElementNS(ns, 'svg');
        sv.setAttribute('viewBox', `${(piece % cols) * tw} ${Math.floor(piece / cols) * th} ${tw} ${th}`);
        sv.setAttribute('preserveAspectRatio', 'none');
        sv.appendChild(art.cloneNode(true));
        board.appendChild(el('button', { class: 'pz-tile' + (piece === pos ? ' ok' : '') + (sel === pos ? ' sel' : ''), 'data-piece': piece, 'data-pos': pos, 'aria-label': `碎片 ${pos + 1}`, style: { '--rot': ((piece * 37) % 7 - 3) + 'deg' }, onclick: () => tap(pos) }, sv));
      });
      prog.textContent = `放對 ${fixed(order)} / ${N} 片・換了 ${moves} 次`;
    };
    const tap = pos => {
      if (board.classList.contains('done')) return;
      if (sel < 0) { sel = pos; this.ctx.audio.sfx('tap'); return draw(); }
      if (sel === pos) { sel = -1; return draw(); }
      [order[sel], order[pos]] = [order[pos], order[sel]];
      moves++;
      const good = order[sel] === sel || order[pos] === pos;
      sel = -1;
      this.ctx.audio.sfx(good ? 'ink' : 'tap');
      draw();
      if (order.every((v, i) => v === i)) {
        board.classList.add('done');
        this.ctx.audio.sfx('good');
        this.later(1100, () => this.finish(moves <= (d.maxMoves || N * 2), `拼好了・換了 ${moves} 次`));
      }
    };
    draw();
  }

  // ───────── 排序：照時間先後排好 ─────────
  renderOrder() {
    const d = this.d;
    this.header();
    const items = d.items.map((it, k) => ({ ...it, k }));
    const pool = [...items].sort(() => Math.random() - 0.5);
    if (pool.every((x, i) => x.k === i)) pool.reverse();
    const line = [];
    const prog = el('div', { class: 'mg-progress' });
    const lineBox = el('ol', { class: 'od-line' });
    const poolBox = el('div', { class: 'od-pool' });
    const ok = el('button', { class: 'btn primary', disabled: true, onclick: () => check() }, '確定');
    this.body.append(prog, lineBox, poolBox, ok);
    const draw = () => {
      prog.textContent = line.length < items.length ? `點選下面的卡片，照${d.by || '時間先後'}排好（${line.length} / ${items.length}）。點上面排好的卡片，可以拿回來。` : '排好了嗎？';
      lineBox.innerHTML = ''; poolBox.innerHTML = '';
      line.forEach((it, i) => lineBox.appendChild(el('li', {}, el('button', { class: 'od-card placed', 'data-k': it.k, onclick: () => { line.splice(i, 1); pool.push(it); this.ctx.audio.sfx('tap'); draw(); } }, it.t))));
      for (let i = line.length; i < items.length; i++) lineBox.appendChild(el('li', { class: 'empty' }, '　'));
      pool.forEach((it, i) => poolBox.appendChild(el('button', { class: 'od-card', 'data-k': it.k, onclick: () => { pool.splice(i, 1); line.push(it); this.ctx.audio.sfx('tap'); draw(); } }, it.t)));
      ok.disabled = line.length < items.length;
    };
    const check = () => {
      const right = line.filter((it, i) => it.k === i).length;
      this.ctx.audio.sfx(right === items.length ? 'good' : 'fail');
      lineBox.innerHTML = '';
      line.forEach((it, i) => lineBox.appendChild(el('li', { class: it.k === i ? 'right' : 'wrong' },
        el('div', { class: 'od-card shown' }, it.y ? el('b', {}, it.y) : null, it.t, it.k === i ? null : el('small', {}, `（應該排第 ${it.k + 1}）`)))));
      poolBox.remove();
      ok.remove();
      const win = right >= (d.need ?? items.length);
      this.body.appendChild(el('button', { class: 'btn primary', onclick: () => this.finish(win, `排對 ${right} / ${items.length}`) }, '繼續'));
    };
    draw();
  }

  render() {
    const r = this.root; r.innerHTML = '';
    r.classList.add('open');
    r.appendChild(el('div', { class: 'mg-top' },
      el('div', { class: 'mg-title' }, (this.d.kind || '譯字') + '・' + this.d.title),
      el('button', { class: 'btn small mg-skip', onclick: () => this.skip() }, this.practice ? '離開' : '跳過')));
    if (this.practice) r.appendChild(el('p', { class: 'mg-rule' }, `練習・難度：${DIFF_NAME[this.diff]}`));
    r.appendChild(el('p', { class: 'mg-intro' }, this.d.intro));
    r.appendChild(el('p', { class: 'mg-rule' }, `${this.d.rule || '選出每個荷蘭語單字的意思。'}答對 ${this.d.need} 題以上即過關。`));
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
    // 甲骨文等 Unicode 還沒有的字：用筆畫（SVG 路徑）畫出來
    if (it.glyph) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', it.view || '0 0 100 100'); svg.setAttribute('class', it.view ? 'mg-glyph mg-wide' : 'mg-glyph'); svg.setAttribute('aria-hidden', 'true');
      for (const d of it.glyph) {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);
      }
      // 透視：在圖上標出幾個候選點（甲、乙、丙、丁）
      for (const [x, y, t] of it.marks || []) {
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 2.6); c.setAttribute('class', 'mg-mark');
        svg.appendChild(c);
        const tx = document.createElementNS(ns, 'text');
        tx.setAttribute('x', x + 4); tx.setAttribute('y', y - 3); tx.textContent = t;
        svg.appendChild(tx);
      }
      this.body.appendChild(svg);
    }
    this.body.appendChild(el('div', { class: this.d.question ? 'mg-q' : 'mg-word' }, it.w));
    const opts = el('div', { class: 'mg-opts' });
    it.opts.forEach(o => {
      const b = el('button', { class: 'btn mg-opt', onclick: async () => {
        opts.querySelectorAll('button').forEach(x => x.disabled = true);
        const ok = o === it.a;
        if (ok) this.correct++;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) [...opts.children].find(x => x.textContent === it.a).classList.add('right');
        this.ctx.audio.sfx(ok ? 'item' : 'fail');
        this.later(700, () => { this.i++; this.q(); });
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
    this.root.querySelector('.mg-skip')?.remove();
    const btns = el('div', { class: 'row-btns mg-end' });
    if (!win || this.practice) btns.appendChild(el('button', { class: 'btn', onclick: () => this.run() }, '再試一次'));
    btns.appendChild(el('button', { class: 'btn primary', onclick: () => this.resolve(win ? '勝' : '敗') }, this.practice ? '離開' : win ? '過關' : '繼續'));
    this.body.appendChild(btns);
  }
}
