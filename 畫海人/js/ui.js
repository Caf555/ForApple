// 介面小工具：產生元素、面板、提示、劇情文字
export const $ = id => document.getElementById(id);

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'disabled') n.disabled = !!v;
    else n.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
  return n;
}

export class UI {
  constructor(ctx) { this.ctx = ctx; }

  fmt(t) { return String(t).replace(/\{名\}/g, (this.ctx.g && this.ctx.g.name) || '墨里'); }

  // 從下方滑上來的面板
  sheet(title, build, opts = {}) {
    const dim = el('div', { class: 'dim', onclick: () => { if (!opts.noClose) close(); } });
    const s = el('div', { class: 'sheet' });
    const body = el('div', { class: 'sheet-body' });
    let closed = false;
    const close = () => { if (closed) return; closed = true; s.classList.remove('open'); dim.remove(); setTimeout(() => s.remove(), 220); if (opts.onClose) opts.onClose(); };
    s.append(el('div', { class: 'sheet-head' }, el('h2', {}, title), opts.noClose ? null : el('button', { class: 'icon', 'aria-label': '關閉', onclick: close }, '✕')), body);
    $('layer').append(dim, s);
    const api = { body, close, rebuild: () => { body.innerHTML = ''; build(body, api); } };
    build(body, api);
    requestAnimationFrame(() => s.classList.add('open'));
    return api;
  }

  alert(title, lines, btn = '繼續') {
    return new Promise(res => {
      const api = this.sheet(title, body => {
        (Array.isArray(lines) ? lines : [lines]).forEach(t => body.append(el('p', { class: 'para' }, this.fmt(t))));
        body.append(el('div', { class: 'btns' }, el('button', { class: 'btn primary', onclick: () => { api.close(); res(); } }, btn)));
      }, { noClose: true });
    });
  }

  choose(title, lines, opts) {
    return new Promise(res => {
      const api = this.sheet(title, body => {
        lines.forEach(t => body.append(el('p', { class: 'para' }, this.fmt(t))));
        body.append(el('div', { class: 'col' }, ...opts.map((o, i) => el('button', { class: 'btn', disabled: o.disabled, onclick: () => { api.close(); res(i); } }, this.fmt(o.label)))));
      }, { noClose: true });
    });
  }

  toast(msg) {
    const t = el('div', { class: 'toast' }, this.fmt(msg));
    $('toasts').append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
  }

  // 劇情：一行一行點下去。行可以是字串、{ who, text }、{ bg }、{ choice: [[文字, 值], …] }
  story(lines) {
    return new Promise(res => {
      const box = el('div', { class: 'story' });
      const scroll = el('div', { class: 'story-lines' });
      const hint = el('div', { class: 'story-hint' }, '點一下繼續 ▼');
      box.append(scroll, hint);
      $('layer').append(box);
      let i = 0, waiting = null;
      const picks = [];
      const next = () => {
        if (waiting) return;
        if (i >= lines.length) { box.classList.add('out'); setTimeout(() => { box.remove(); res(picks); }, 300); return; }
        const L = typeof lines[i] === 'string' ? { text: lines[i] } : lines[i];
        i++;
        if (L.bg) box.dataset.bg = L.bg;
        if (L.choice) {
          hint.style.visibility = 'hidden';
          waiting = el('div', { class: 'story-choices' }, ...L.choice.map(([t, v]) => el('button', { class: 'btn', onclick: e => {
            e.stopPropagation();
            picks.push(v);
            waiting.remove(); waiting = null;
            scroll.append(el('p', { class: 'line picked' }, '▸ ' + this.fmt(t)));
            hint.style.visibility = '';
            this.ctx.audio.sfx('tap');
            next();
          } }, this.fmt(t))));
          box.append(waiting);
          return;
        }
        if (!L.text) return next();
        const p = el('p', { class: 'line' + (L.who ? ' say' : '') }, L.who ? el('b', {}, this.fmt(L.who)) : null, this.fmt(L.text));
        scroll.append(p);
        while (scroll.children.length > 7) scroll.firstChild.remove();
      };
      box.addEventListener('click', next);
      next();
    });
  }

  bar(v, max, cls = '') {
    return el('div', { class: 'bar ' + cls }, el('i', { style: { width: Math.max(0, Math.min(100, max ? v / max * 100 : 0)) + '%' } }));
  }
}
