// 介面元件：文字框、選項、面板、提示
export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
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
    banner.onclick = () => this.viewImage('bg', name);
  }

  // 劇情插圖：放在文字流裡，點一下可以全螢幕檢視
  showCG(name, caption) {
    if (!this.hasImg('cg', name)) return Promise.resolve();
    const fig = el('figure', { class: 'line cg' });
    const img = this.pictureEl('cg', name, 'cg-img', 'min(688px, calc(100vw - 32px))');
    // 等待點擊繼續時，點圖就是「繼續」；讀過之後再點，才是全螢幕檢視
    img.addEventListener('click', e => {
      if (this.waiting && fig === this.story.lastElementChild) return;
      e.stopPropagation(); this.viewImage('cg', name);
    });
    fig.appendChild(img);
    if (caption) fig.appendChild(el('figcaption', {}, this.fmt(caption)));
    this.story.appendChild(fig);
    img.onload = () => this.scrollDown();
    this.scrollDown();
    return new Promise(resolve => {
      $('advance-hint').classList.add('show');
      this.waiting = () => { $('advance-hint').classList.remove('show'); this.waiting = null; this.skipPage = false; resolve(); };
    });
  }

  viewImage(kind, name) {
    const v = $('viewer');
    v.innerHTML = '';
    const img = el('img', { src: this.imgSrc(kind, name, 1600), alt: '' });
    img.onerror = () => { img.src = this.imgSrc(kind, name, 800); };
    v.append(img, el('div', { class: 'viewer-tip' }, '輕觸關閉'));
    v.classList.add('open');
    v.onclick = () => v.classList.remove('open');
  }

  setTheme(theme) {
    document.body.dataset.vtheme = theme || 'modern';
  }

  clearStory() { this.story.innerHTML = ''; }

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
      const shown = who === '知墨' ? this.ctx.g.player.call : who;
      const key = (this.ctx.g && this.ctx.g.portraits && this.ctx.g.portraits[who]) || who;
      name = el('div', { class: 'who', 'data-who': who },
        this.hasImg('char', key) ? el('img', { class: 'avatar', src: this.imgSrc('char', key), alt: '', decoding: 'async', onerror: e => e.target.remove() }) : null,
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
    this.scrollDown();
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
    if (this.typing) { clearTimeout(this.typing.timer); this.typing = null; }
    this.waiting = null;
    $('advance-hint').classList.remove('show');
    this.choices.innerHTML = '';
  }

  scrollDown() {
    requestAnimationFrame(() => { this.story.scrollTop = this.story.scrollHeight; });
  }

  // 選項：[{label, enabled, lock}] → Promise<index>
  showChoices(list) {
    this.choices.innerHTML = '';
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
    const close = () => { s.classList.remove('open'); setTimeout(() => s.remove(), 250); if (opts.onClose) opts.onClose(); };
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
