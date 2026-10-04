// 介面元件：文字框、選項、面板、提示
import { CHARACTERS, CODEX } from './data.js';
import { displayName } from './state.js';
export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) e.style.setProperty(sk, v[sk]); else e.style[sk] = v[sk]; } }
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return e;
}

const $ = id => document.getElementById(id);
const SPEEDS = [0, 18, 38]; // 每字毫秒

export class UI {
  constructor(ctx) {
    this.ctx = ctx;
    this.story = $('story');
    this.choices = $('choices');
    this.waiting = null;
    this.typing = null;
    this.story.addEventListener('click', () => this.advance());
    this.portrait = $('portrait');
    this.ambientEl = $('ambient');
    // 半身像跟著劇情區的大小走（出現選項時劇情區會變矮）
    if (window.ResizeObserver) new ResizeObserver(() => this.placePortrait()).observe(this.story);
    $('advance-hint').addEventListener('click', () => this.advance());
    document.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (document.querySelector('.sheet.open, #battle.open, #debate.open, #minigame.open')) return;
        if (this.waiting || this.typing) { e.preventDefault(); this.advance(); }
      }
    });
  }

  get settings() { return this.ctx.settings; }

  applySettings() {
    const s = this.settings;
    document.documentElement.dataset.fs = s.fontSize;
    if (s.theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = s.theme;
  }

  setHeader(loc) {
    $('loc-vol').textContent = loc.vol || '';
    $('loc-place').textContent = [loc.place, loc.year].filter(Boolean).join('・');
    $('banner-year').textContent = loc.year || '';
    $('banner-place').textContent = loc.place || '';
  }

  // ───────── 圖片 ─────────
  // 圖片清單由 img/manifest.json 提供；沒有列在清單裡的圖不會被載入，畫面自動退回紋樣
  hasImg(kind, name) { const a = this.ctx.assets; return !!(name && a && a[kind] && a[kind].has(name)); }

  imgSrc(kind, name, w) {
    const base = `img/${kind}/${encodeURIComponent(name)}`;
    return w ? `${base}-${w}.webp` : `${base}.webp`;
  }

  // 角色要用哪一張頭像：劇本指定的年紀 → 同名的圖 → 第一張「名字_年紀」的圖
  charKey(who) {
    const set = this.ctx.g && this.ctx.g.portraits;
    if (set && set[who] && this.hasImg('char', set[who])) return set[who];
    if (this.hasImg('char', who)) return who;
    const a = this.ctx.assets && this.ctx.assets.char;
    if (a) for (const k of a) if (k.startsWith(who + '_')) return k;
    return who;
  }

  // 角色資料（給頭像放大時顯示）
  charInfo(who, key) {
    const c = CHARACTERS[who];
    const shown = who === '知墨' && this.ctx.g ? this.ctx.g.player.name : who;
    const cx = CODEX[who] || CODEX[key];
    return { title: shown, sub: c ? c.title : '', text: c ? c.desc : (cx ? cx.text : '') };
  }

  // 大圖（背景、插圖）提供 800 與 1600 兩種寬度，手機只下載需要的那一張
  pictureEl(kind, name, cls, sizes) {
    return el('img', {
      class: cls, alt: '', decoding: 'async', loading: 'lazy',
      src: this.imgSrc(kind, name, 800),
      srcset: `${this.imgSrc(kind, name, 800)} 800w, ${this.imgSrc(kind, name, 1600)} 1600w`,
      sizes: sizes || 'min(720px, 100vw)',
    });
  }

  setBanner(name) {
    const art = document.querySelector('#banner .banner-art');
    const banner = $('banner');
    art.querySelectorAll('img').forEach(i => i.remove());
    banner.classList.remove('has-img');
    banner.onclick = null;
    if (!this.hasImg('bg', name)) return;
    const img = this.pictureEl('bg', name, 'banner-img');
    img.loading = 'eager';
    img.onload = () => banner.classList.add('has-img');
    img.onerror = () => img.remove();
    art.appendChild(img);
    banner.onclick = () => this.viewImage('bg', name, { title: $('banner-place').textContent, sub: $('banner-year').textContent });
  }

  // 劇情插圖：放在文字流裡。點一下放大；再點一下關閉，並繼續劇情
  showCG(name, caption) {
    if (!this.hasImg('cg', name)) return Promise.resolve();
    const fig = el('figure', { class: 'line cg' });
    const img = this.pictureEl('cg', name, 'cg-img', 'min(688px, calc(100vw - 32px))');
    img.addEventListener('click', e => { e.stopPropagation(); this.viewImage('cg', name, caption ? { title: this.fmt(caption) } : null, () => this.continueStory()); });
    fig.append(img);
    if (caption) fig.appendChild(el('figcaption', {}, this.fmt(caption)));
    this.story.appendChild(fig);
    img.onload = () => this.scrollDown();
    this.scrollDown();
    return new Promise(resolve => {
      $('advance-hint').classList.add('show');
      this.waiting = () => { $('advance-hint').classList.remove('show'); this.waiting = null; this.skipPage = false; resolve(); };
    });
  }

  // 放大檢視：點一下關閉。info = { title, sub, text, lines }；onClose：關閉後要做的事
  viewImage(kind, name, info, onClose) {
    const v = $('viewer');
    v.innerHTML = '';
    v.dataset.kind = kind;
    const big = kind === 'bg' || kind === 'cg';
    const img = el('img', { src: big ? this.imgSrc(kind, name, 1600) : this.imgSrc(kind, name), alt: '' });
    if (big) img.onerror = () => { img.src = this.imgSrc(kind, name, 800); };
    v.appendChild(img);
    if (info && (info.title || info.text)) {
      v.appendChild(el('div', { class: 'viewer-info' },
        info.title ? el('b', {}, info.title) : null,
        info.sub ? el('span', {}, info.sub) : null,
        info.text ? el('p', {}, info.text) : null,
        ...(info.lines || []).map(l => el('p', { class: 'vi-line' }, l))));
    }
    v.appendChild(el('div', { class: 'viewer-tip' }, '輕觸關閉'));
    requestAnimationFrame(() => v.classList.add('open'));
    v.onclick = e => {
      e.stopPropagation();
      v.classList.remove('open');
      v.onclick = null;
      if (onClose) setTimeout(onClose, 50);
    };
  }

  // 手機的「返回」鍵：先關掉最上層的東西，真的沒東西可關才提示離開
  handleBack() {
    const v = $('viewer');
    if (v.classList.contains('open')) { v.click(); return true; }
    const sheets = [...document.querySelectorAll('#sheets .sheet.open')];
    const top = sheets[sheets.length - 1];
    if (top) { if (top._close) top._close(); return true; }
    if ($('battle').classList.contains('open')) {
      const back = $('battle').querySelector('.b-cmd .cmd.back');
      if (back) back.click(); else this.toast('戰鬥中無法離開');
      return true;
    }
    if ($('debate').classList.contains('open') || $('minigame').classList.contains('open')) { this.toast('請先完成眼前的事'); return true; }
    return false;
  }

  // 劇情中放大的圖關掉時，順便往下讀（避免一直點到同一張圖、卡住）
  continueStory() { if (this.waiting || this.typing) this.advance(); }

  setTheme(theme) {
    const t = theme || 'modern';
    if (this.curTheme && this.curTheme !== t && t !== 'hub' && document.body.dataset.mode === 'story') this.ink();
    this.curTheme = t;
    document.body.dataset.vtheme = t;
    this.setAmbient(t);
  }

  // ───────── 墨染轉場 ─────────
  ink() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    const o = $('ink');
    o.classList.remove('go'); void o.offsetWidth; o.classList.add('go');
    return new Promise(r => setTimeout(r, 650));
  }

  // ───────── 氛圍粒子 ─────────
  setAmbient(theme) {
    const box = this.ambientEl;
    if (!box) return;
    const kind = this.settings.ambient ? ({ dayuan: 'dust', muye: 'ember', amarna: 'sand', athens: 'leaf', kalinga: 'rain', fifties: 'dust', tang: 'petal', steppe: 'sand', florence: 'ember', mexica: 'petal', trench: 'rain', hub: 'ink', modern: 'glow' }[theme] || '') : '';
    if (box.dataset.kind === kind) return;
    box.dataset.kind = kind;
    box.innerHTML = '';
    if (!kind || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const n = kind === 'ember' ? 16 : 12;
    for (let i = 0; i < n; i++) {
      box.appendChild(el('i', { style: {
        left: (Math.random() * 100).toFixed(1) + '%',
        animationDelay: (-Math.random() * 14).toFixed(1) + 's',
        animationDuration: (9 + Math.random() * 9).toFixed(1) + 's',
        '--dx': ((Math.random() - 0.5) * 80).toFixed(0) + 'px',
        '--sz': (2 + Math.random() * (kind === 'ink' ? 5 : 3)).toFixed(1) + 'px',
      } }));
    }
  }

  // ───────── 對話半身像 ─────────
  showPortrait(who) {
    const p = this.portrait;
    if (!p) return;
    if (!this.settings.portrait || !who) { p.classList.add('dim'); if (!this.settings.portrait) p.classList.remove('on'); return; }
    const key = this.charKey(who);
    if (!this.hasImg('char', key)) { p.classList.remove('on'); return; }
    p.classList.remove('dim');
    if (p.dataset.key === key && p.classList.contains('on')) return;
    p.dataset.key = key;
    p.classList.remove('on');
    const img = new Image();
    img.onload = () => { if (p.dataset.key !== key) return; p.style.backgroundImage = `url("${img.src}")`; this.placePortrait(); p.classList.add('on'); };
    img.src = this.imgSrc('char', key);
  }

  hidePortrait() { if (this.portrait) { this.portrait.classList.remove('on'); delete this.portrait.dataset.key; } }

  placePortrait() {
    const p = this.portrait;
    if (!p) return;
    const r = this.story.getBoundingClientRect();
    const app = $('app').getBoundingClientRect();
    p.style.top = (r.top - app.top) + 'px';
    p.style.height = r.height + 'px';
  }

  vibrate(pattern) {
    if (this.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* 不支援就算了 */ } }
  }

  clearStory() { this.story.innerHTML = ''; this.pageStart = null; this.hidePortrait(); }

  // 文字替換：{名} → 玩家稱呼
  fmt(text) {
    const p = this.ctx.g ? this.ctx.g.player : { name: '沈知墨', call: '知墨' };
    return (text || '').replace(/\{名\}/g, p.call).replace(/\{姓名\}/g, p.name).replace(/\{暱\}/g, '阿' + p.call.slice(-1));
  }

  addStatic(line) {
    const p = this.makeLine(line);
    p.body.textContent = this.fmt(line.text);
    this.story.appendChild(p.wrap);
  }

  makeLine({ who, text, kind }) {
    const wrap = el('div', { class: 'line' + (who ? ' say' : ' narr') + (kind ? ' ' + kind : '') });
    let name = null;
    if (who) {
      const shown = displayName(this.ctx.g, who);
      const key = this.charKey(who);
      name = el('div', { class: 'who', 'data-who': who },
        this.hasImg('char', key) ? el('img', { class: 'avatar', src: this.imgSrc('char', key), alt: '', decoding: 'async', onerror: e => e.target.remove(),
          onclick: e => { e.stopPropagation(); this.viewImage('char', key, this.charInfo(who, key), () => this.continueStory()); } }) : null,
        shown);
      wrap.appendChild(name);
    }
    const body = el('div', { class: 'body' });
    wrap.appendChild(body);
    return { wrap, body };
  }

  // 顯示一行字，等待點擊
  // 顯示一行字。opts.wait=false：打完字就繼續（整頁模式）；opts.auto：打完字後自動繼續
  say(line, opts = {}) {
    const wait = opts.wait !== false;
    const text = this.fmt(line.text);
    const { wrap, body } = this.makeLine(line);
    this.story.appendChild(wrap);
    // 整頁模式：這一行放進來會讓這一頁超出畫面（第一行會被捲到上面去），就先在這裡換頁
    if (this.pageStart && this.settings.readMode !== 'line' && this.settings.readMode !== 'auto') {
      body.textContent = text;
      const over = wrap.offsetTop + wrap.offsetHeight - this.pageStart.offsetTop > this.story.clientHeight - 24;
      body.textContent = '';
      if (over) {
        wrap.style.display = 'none';
        this.pageBreak = true;
        return this.waitTap().then(() => { wrap.remove(); return this.say(line, opts); });
      }
    }
    if (!this.pageStart) this.pageStart = wrap;
    this.scrollDown();
    this.showPortrait(line.who);
    this.ctx.audio.speak(text, line.who);
    const ms = this.skipPage ? 0 : (SPEEDS[this.settings.speed] ?? 18);
    return new Promise(resolve => {
      const finish = () => {
        body.textContent = text;
        this.typing = null;
        this.scrollDown();
        if (!wait) { resolve(); return; }
        $('advance-hint').classList.add('show');
        this.waiting = () => {
          clearTimeout(this.autoTimer);
          $('advance-hint').classList.remove('show');
          this.waiting = null;
          this.skipPage = false;
          this.pageStart = null;
          resolve();
        };
        if (opts.auto) this.scheduleAuto(text);
      };
      if (!ms) { finish(); return; }
      let i = 0;
      const chars = Array.from(text);
      const tick = () => {
        if (!this.typing) return;
        i += 1;
        body.textContent = chars.slice(0, i).join('');
        if (i % 12 === 0) this.scrollDown();
        if (i >= chars.length) { finish(); return; }
        this.typing.timer = setTimeout(tick, ms);
      };
      this.typing = { finish, timer: setTimeout(tick, ms) };
    });
  }

  // 整頁模式換頁：顯示「點一下繼續」，等玩家點擊後開始新的一頁
  waitTap() {
    this.scrollDown();
    return new Promise(resolve => {
      $('advance-hint').classList.add('show');
      this.waiting = () => {
        $('advance-hint').classList.remove('show');
        this.waiting = null;
        this.skipPage = false;
        this.pageStart = null;
        resolve();
      };
    });
  }

  // 自動播放：依字數等待後自動翻頁；有選單打開時暫停
  scheduleAuto(text) {
    clearTimeout(this.autoTimer);
    const delay = 1100 + Array.from(text).length * 55;
    const tick = () => {
      if (!this.waiting) return;
      if (document.querySelector('.sheet.open')) { this.autoTimer = setTimeout(tick, 800); return; }
      this.waiting();
    };
    this.autoTimer = setTimeout(tick, delay);
  }

  advance() {
    if (this.typing) {
      clearTimeout(this.typing.timer);
      this.skipPage = true; // 整頁模式：點一下，這一頁剩下的字立刻顯示
      this.typing.finish();
      return;
    }
    if (this.waiting) { this.ctx.audio.sfx('tap'); this.ctx.audio.stopSpeak(); this.waiting(); }
  }

  cancelWait() {
    clearTimeout(this.autoTimer);
    this.skipPage = false;
    this.pageStart = null;
    if (this.typing) { clearTimeout(this.typing.timer); this.typing = null; }
    this.waiting = null;
    $('advance-hint').classList.remove('show');
    this.choices.innerHTML = '';
  }

  scrollDown() {
    requestAnimationFrame(() => {
      // 整頁模式：最多捲到這一頁的第一行，不讓它被捲出畫面
      const cap = this.pageStart && this.pageStart.isConnected ? Math.max(0, this.pageStart.offsetTop - 12) : Infinity;
      this.story.scrollTop = Math.min(this.story.scrollHeight, cap);
    });
  }

  // 選項：[{label, enabled, lock}] → Promise<index>
  showChoices(list) {
    this.choices.innerHTML = '';
    this.pageStart = null;
    return new Promise(resolve => {
      list.forEach((c, i) => {
        const b = el('button', { class: 'choice' + (c.enabled ? '' : ' locked') + (c.seen ? ' seen' : ''), disabled: !c.enabled },
          el('span', { class: 'mark' }, c.enabled ? '▸' : '🔒'),
          el('span', {}, this.fmt(c.label)),
          c.lock ? el('small', {}, c.lock) : null);
        b.addEventListener('click', () => {
          if (!c.enabled) return;
          this.ctx.audio.sfx('tap');
          this.choices.innerHTML = '';
          const echo = el('div', { class: 'line picked' }, '▸ ' + this.fmt(c.label));
          this.story.appendChild(echo);
          resolve(i);
        });
        this.choices.appendChild(b);
      });
      this.scrollDown();
    });
  }

  // 劇情進行中：以小字附在文字流裡；其他時候：浮動提示
  note(msg, kind = '') {
    const inStory = document.body.dataset.mode === 'story' && !document.querySelector('.overlay.open:not(#card)');
    if (!inStory) return this.toast(msg, kind);
    this.story.appendChild(el('div', { class: 'line note ' + kind }, msg));
    this.scrollDown();
  }

  toast(msg, kind = '') {
    const t = el('div', { class: 'toast ' + kind }, msg);
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
  }

  // 章節標題卡
  card(title, sub) {
    const c = $('card');
    c.innerHTML = '';
    c.appendChild(el('div', { class: 'card-title' }, title));
    if (sub) c.appendChild(el('div', { class: 'card-sub' }, sub));
    c.appendChild(el('div', { class: 'card-tap' }, '輕觸繼續'));
    this.ink();
    c.classList.add('open');
    this.ctx.audio.sfx('card');
    return new Promise(resolve => {
      const close = () => { c.classList.remove('open'); c.removeEventListener('click', close); setTimeout(resolve, 300); };
      setTimeout(() => c.addEventListener('click', close), 500);
    });
  }

  // 面板
  sheet(title, build, opts = {}) {
    const s = el('div', { class: 'sheet' });
    let closed = false;
    const close = () => { if (closed) return; closed = true; s.classList.remove('open'); if (s._dim) s._dim.remove(); setTimeout(() => s.remove(), 250); if (opts.onClose) opts.onClose(); };
    s._close = opts.noClose ? null : close;
    // dim：面板後面加一層暗幕，點暗處就關閉
    const dim = opts.dim ? el('div', { class: 'sheet-dim', onclick: close }) : null;
    if (dim) { $('sheets').appendChild(dim); s._dim = dim; }
    const body = el('div', { class: 'sheet-body' });
    s.appendChild(el('div', { class: 'sheet-head' },
      el('h2', {}, title),
      opts.noClose ? null : el('button', { class: 'icon-btn', 'aria-label': '關閉', onclick: close }, '✕')));
    s.appendChild(body);
    $('sheets').appendChild(s);
    const api = { el: s, body, close, rebuild: () => { body.innerHTML = ''; build(body, api); } };
    build(body, api);
    requestAnimationFrame(() => s.classList.add('open'));
    return api;
  }

  confirm(msg, yes = '確定', no = '取消') {
    return new Promise(resolve => {
      const api = this.sheet('確認', body => {
        body.appendChild(el('p', { class: 'dialog-text' }, msg));
        body.appendChild(el('div', { class: 'row-btns' },
          el('button', { class: 'btn', onclick: () => { api.close(); resolve(false); } }, no),
          el('button', { class: 'btn primary', onclick: () => { api.close(); resolve(true); } }, yes)));
      }, { noClose: true });
    });
  }

  alert(title, msg, btn = '知道了') {
    return new Promise(resolve => {
      const api = this.sheet(title, body => {
        (Array.isArray(msg) ? msg : [msg]).forEach(m => body.appendChild(el('p', { class: 'dialog-text' }, m)));
        body.appendChild(el('div', { class: 'row-btns' },
          el('button', { class: 'btn primary', onclick: () => { api.close(); resolve(); } }, btn)));
      }, { noClose: true });
    });
  }

  prompt(title, msg, def = '') {
    return new Promise(resolve => {
      let input;
      const api = this.sheet(title, body => {
        body.appendChild(el('p', { class: 'dialog-text' }, msg));
        input = el('input', { class: 'text-input', value: def, maxlength: 8 });
        body.appendChild(input);
        body.appendChild(el('div', { class: 'row-btns' },
          el('button', { class: 'btn primary', onclick: () => { api.close(); resolve(input.value.trim() || def); } }, '確定')));
      }, { noClose: true });
      setTimeout(() => input && input.focus(), 300);
    });
  }

  bar(value, max, cls = '') {
    const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
    return el('div', { class: 'bar ' + cls }, el('i', { style: { width: pct + '%' } }));
  }
}
