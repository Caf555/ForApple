// 劇情動畫：一張圖配一兩句字，鏡頭慢慢推近，字一個一個浮現，自動換頁；右上角可以略過
// 圖：有生好的插圖（img/manifest.json 的 scene）就用插圖，沒有就用這裡程式畫的剪影場景
import { el, $ } from './ui.js';

// ───────── 剪影場景（畫布 400×400，重要的東西放在中間） ─────────
let seed = 1;
const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const rr = (a, b) => a + rnd() * (b - a);
const f1 = n => Math.round(n * 10) / 10;

const DEFS = `<defs>
<linearGradient id="k-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#01050a"/><stop offset=".62" stop-color="#0b2232"/><stop offset="1" stop-color="#123447"/></linearGradient>
<linearGradient id="k-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1c2c"/><stop offset=".55" stop-color="#3a4656"/><stop offset=".7" stop-color="#8a6a4a"/><stop offset="1" stop-color="#2a3440"/></linearGradient>
<linearGradient id="k-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14283a"/><stop offset=".6" stop-color="#5a7488"/><stop offset=".72" stop-color="#b9a48a"/><stop offset="1" stop-color="#3a5060"/></linearGradient>
<linearGradient id="k-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26363f"/><stop offset=".6" stop-color="#6c8088"/><stop offset="1" stop-color="#2e4048"/></linearGradient>
<linearGradient id="k-storm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05090c"/><stop offset=".6" stop-color="#1c2a2c"/><stop offset="1" stop-color="#0a1416"/></linearGradient>
<linearGradient id="k-room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0806"/><stop offset=".6" stop-color="#2a2016"/><stop offset="1" stop-color="#120d08"/></linearGradient>
<linearGradient id="k-cold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03080c"/><stop offset=".7" stop-color="#10222c"/><stop offset="1" stop-color="#081218"/></linearGradient>
<linearGradient id="k-paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9cba6"/><stop offset=".6" stop-color="#c4b18a"/><stop offset="1" stop-color="#9c8762"/></linearGradient>
<linearGradient id="k-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f2c3b"/><stop offset="1" stop-color="#02080c"/></linearGradient>
<linearGradient id="k-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f0d49a" stop-opacity=".55"/><stop offset="1" stop-color="#f0d49a" stop-opacity="0"/></linearGradient>
<radialGradient id="k-gw"><stop offset="0" stop-color="#fff2cf"/><stop offset=".18" stop-color="#f0d49a" stop-opacity=".75"/><stop offset=".5" stop-color="#dcb46a" stop-opacity=".22"/><stop offset="1" stop-color="#dcb46a" stop-opacity="0"/></radialGradient>
<radialGradient id="k-gc"><stop offset="0" stop-color="#e6fffb"/><stop offset=".2" stop-color="#9fe3dc" stop-opacity=".6"/><stop offset=".55" stop-color="#78d0c8" stop-opacity=".16"/><stop offset="1" stop-color="#78d0c8" stop-opacity="0"/></radialGradient>
<radialGradient id="k-fg"><stop offset="0" stop-color="#d6e4e8" stop-opacity=".55"/><stop offset=".6" stop-color="#b8ccd2" stop-opacity=".2"/><stop offset="1" stop-color="#b8ccd2" stop-opacity="0"/></radialGradient>
<radialGradient id="k-vig" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
</defs>`;

const INK = '#040b10', INK2 = '#08141b';
const sky = id => `<rect width="400" height="400" fill="url(#k-${id})"/>`;
const vig = () => `<rect width="400" height="400" fill="url(#k-vig)" pointer-events="none"/>`;
const stars = (n, maxY = 200) => { let s = ''; for (let i = 0; i < n; i++) s += `<circle class="c-tw" style="animation-delay:-${f1(rr(0, 4))}s" cx="${f1(rr(0, 400))}" cy="${f1(rr(0, maxY))}" r="${f1(rr(.4, 1.4))}" fill="#dfeef0" opacity="${f1(rr(.3, .9))}"/>`; return s; };
const sea = (y, glint = true) => {
  let s = `<rect y="${y}" width="400" height="${400 - y}" fill="url(#k-sea)"/>`;
  if (glint) { s += '<g class="c-wave" stroke="#78d0c8" fill="none">'; for (let i = 0; i < 7; i++) { const yy = y + 8 + i * i * 3.2, x = rr(-40, 300); s += `<path d="M${f1(x)} ${f1(yy)} q20 -3 40 0 t40 0" stroke-opacity="${f1(.06 + i * .015)}"/>`; } s += '</g>'; }
  return s;
};
const isle = (cx, y, w, h, fill = INK) => `<path d="M${cx - w / 2} ${y} C${cx - w / 3} ${y - h * .6} ${cx - w / 6} ${y - h} ${cx} ${y - h * .9} C${cx + w / 5} ${y - h * 1.05} ${cx + w / 3} ${y - h * .5} ${cx + w / 2} ${y} Z" fill="${fill}"/>`;
const glow = (x, y, r, warm = true, cls = 'c-fl', delay = 0) => `<g class="${cls}" style="animation-delay:-${delay}s"><circle cx="${x}" cy="${y}" r="${r}" fill="url(#k-${warm ? 'gw' : 'gc'})"/><circle cx="${x}" cy="${y}" r="${f1(Math.max(.8, r * .06))}" fill="${warm ? '#fff6dc' : '#effffd'}"/></g>`;
const fog = (y, n, op = 1, cls = 'c-drift', spread = 40) => { let s = `<g class="${cls}" opacity="${op}">`; for (let i = 0; i < n; i++) s += `<ellipse cx="${f1(rr(-80, 480))}" cy="${f1(y + rr(-spread, spread))}" rx="${f1(rr(80, 170))}" ry="${f1(rr(14, 36))}" fill="url(#k-fg)"/>`; return s + '</g>'; };
const person = (x, y, h, fill = INK, extra = '') => {
  const hr = h * .1, sw = h * .13, bw = h * .17;
  return `<g fill="${fill}"><circle cx="${x}" cy="${f1(y - h + hr)}" r="${f1(hr)}"/><path d="M${f1(x - sw)} ${f1(y - h + hr * 2.3)} Q${x} ${f1(y - h + hr * 1.8)} ${f1(x + sw)} ${f1(y - h + hr * 2.3)} L${f1(x + bw)} ${y} L${f1(x - bw)} ${y} Z"/>${extra}</g>`;
};
const house = (x, y, w, h, lit = true, d = 0) => `<g><rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${INK2}"/><path d="M${x - 3} ${y - h} L${x + w / 2} ${y - h - w * .45} L${x + w + 3} ${y - h} Z" fill="${INK}"/>${lit ? `<rect class="c-fl" style="animation-delay:-${d}s" x="${x + w * .35}" y="${y - h * .65}" width="${w * .3}" height="${h * .3}" fill="#e8c27a"/>` : ''}</g>`;
const smoke = (x, y, d = 0) => `<path class="c-smoke" style="animation-delay:-${d}s" d="M${x} ${y} q-6 -12 0 -24 t0 -24 t-4 -22" stroke="#c9d6da" stroke-opacity=".25" stroke-width="5" fill="none" stroke-linecap="round"/>`;
const boat = (x, y, s, { sail = true, lamp = false, masts = 1, flip = false } = {}) => {
  let m = '';
  for (let i = 0; i < masts; i++) { const mx = masts > 1 ? -12 + i * 24 : 0; m += `<line x1="${mx}" y1="0" x2="${mx}" y2="${-46 - i * 6}" stroke="${INK}" stroke-width="2"/>`; if (sail) m += `<path d="M${mx + 2} ${-44 - i * 6} Q${mx + 22} ${-26 - i * 3} ${mx + 2} -6 Z" fill="#2c3e48"/>`; }
  return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><path d="M-34 -2 L34 -2 Q30 10 20 12 L-24 12 Q-32 8 -34 -2 Z" fill="${INK}"/>${m}${lamp ? glow(26, -10, 22, true) : ''}</g>`;
};
const tower = (x, base, h, lit = true, beam = false) => {
  const w0 = 11, w1 = 7, top = base - h;
  return `<g>${beam ? `<path class="c-beam" d="M${x} ${top - 6} L${x + 260} ${top - 40} L${x + 260} ${top + 24} Z" fill="url(#k-beam)"/><path class="c-beam" style="animation-delay:-2s" d="M${x} ${top - 6} L${x - 220} ${top - 34} L${x - 220} ${top + 18} Z" fill="url(#k-beam)" opacity=".5"/>` : ''}
<path d="M${x - w0} ${base} L${x - w1} ${top} L${x + w1} ${top} L${x + w0} ${base} Z" fill="${INK2}"/>
<path d="M${x - w0 + 1} ${base - h * .35} L${x + w0 - 1} ${base - h * .35} L${x + w0 - 1.6} ${base - h * .45} L${x - w0 + 1.6} ${base - h * .45} Z" fill="#1a2a33"/>
<rect x="${x - 6}" y="${top - 12}" width="12" height="12" fill="${lit ? '#f0d49a' : '#1a2a33'}"/><path d="M${x - 9} ${top - 12} L${x} ${top - 21} L${x + 9} ${top - 12} Z" fill="${INK}"/><rect x="${x - 9}" y="${top}" width="18" height="2.4" fill="${INK}"/>
${lit ? glow(x, top - 6, 46, true, beam ? 'c-blink' : 'c-fl') : ''}</g>`;
};
const paper = (x, y, w, h, rot = 0, op = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#k-paper)" opacity="${op}" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"/>`;
const coast = (cx, cy, r, n = 9, jag = .3) => { let d = ''; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rad = r * (1 - jag / 2 + rnd() * jag); d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rad)} ${f1(cy + Math.sin(a) * rad * .72)} `; } return d + 'Z'; };
const rose = (x, y, r, op = .35) => `<g stroke="#5a4630" stroke-opacity="${op}" fill="none" stroke-width=".7"><circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${x}" cy="${y}" r="${r * .7}" stroke-dasharray="2 3"/><path d="M${x} ${y - r}V${y + r}M${x - r} ${y}H${x + r}M${x - r * .7} ${y - r * .7}L${x + r * .7} ${y + r * .7}M${x - r * .7} ${y + r * .7}L${x + r * .7} ${y - r * .7}"/></g>`;
const pen = (x, y, len, ang, tipGlow = 40) => { const a = ang * Math.PI / 180, tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len; return `<line x1="${x}" y1="${y}" x2="${f1(tx)}" y2="${f1(ty)}" stroke="#2a2016" stroke-width="5" stroke-linecap="round"/><line x1="${x}" y1="${y}" x2="${f1(tx)}" y2="${f1(ty)}" stroke="#8a6a3a" stroke-width="1.4" stroke-linecap="round"/>${glow(f1(tx), f1(ty), tipGlow, true)}`; };
const starPen = (x, y, s, cls = 'c-draw') => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#b8862e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path class="${cls}" pathLength="1" d="M0 40 L0 -2 M-5 40 L5 40 M-4 -2 L4 -2 L0 -10 Z"/><path class="${cls}" pathLength="1" style="animation-delay:.9s" d="M0 -30 L4 -20 L14 -19 L6 -12 L9 -2 L0 -8 L-9 -2 L-6 -12 L-14 -19 L-4 -20 Z"/></g>`;
const rain = () => { let s = '<g class="c-rain" stroke="#9fb4ba" stroke-opacity=".28" stroke-width="1">'; for (let i = 0; i < 70; i++) { const x = rr(-60, 440), y = rr(-60, 400); s += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x - 10)}" y2="${f1(y + 26)}"/>`; } return s + '</g>'; };
const rings = (x, y, n = 3) => { let s = ''; for (let i = 0; i < n; i++) s += `<circle class="c-ring" style="animation-delay:-${i * 1.2}s" cx="${x}" cy="${y}" r="14" fill="none" stroke="#f0d49a" stroke-width="1.2"/>`; return s; };
// 小島的形狀（海圖上用）：礁、鐘、灣
const SHAPES = {
  reef: (x, y) => `<path d="${coast(x, y, 30, 11, .5)}"/><path d="M${x + 10} ${y - 4} l3 -16 l3 16 z" fill="#5a4630"/>`,
  bell: (x, y) => `<path d="${coast(x, y, 38, 14, .22)}"/><path d="M${x - 4} ${y + 2} v-18 h8 v18 M${x - 7} ${y - 16} l7 -8 l7 8" />`,
  bay: (x, y) => `<path d="M${x - 40} ${y - 18} C${x - 30} ${y + 34} ${x + 30} ${y + 34} ${x + 40} ${y - 18} C${x + 26} ${y + 10} ${x - 26} ${y + 10} ${x - 40} ${y - 18} Z"/><path d="M${x - 8} ${y + 8} v-16 M${x + 6} ${y + 10} v-13 M${x - 1} ${y + 12} v-10"/>`,
};

const SCENES = {
  stars() {
    let s = sky('night') + stars(80, 230) + sea(250);
    [[40, 22, 7], [96, 30, 9], [150, 18, 6], [214, 34, 10], [270, 20, 7], [318, 28, 9], [372, 22, 6]].forEach(([x, w, h], i) => { s += isle(x, 250, w * 1.6, h) + glow(x + rr(-4, 4), 250 - h * .6, 14, true, 'c-fl', i * .7); });
    return s + fog(252, 6, .45) + vig();
  },
  fogrise() {
    let s = sky('night') + stars(40, 170) + sea(255) + isle(40, 255, 90, 18) + isle(370, 255, 80, 14);
    s += '<g class="c-rise">';
    for (let i = 0; i < 9; i++) s += `<ellipse cx="${f1(200 + rr(-12, 12))}" cy="${255 - i * 26}" rx="${36 + i * 16}" ry="${20 + i * 5}" fill="url(#k-fg)" opacity="${f1(1 - i * .07)}"/>`;
    return s + '</g>' + glow(200, 252, 70, false, 'c-fl') + fog(250, 5, .6) + vig();
  },
  fadeisle() {
    let s = sky('fog') + sea(262);
    s += '<g class="c-fade">' + isle(200, 262, 230, 64) + house(140, 236, 18, 16, true) + house(176, 222, 20, 18, true, 1) + house(222, 226, 18, 16, true, 2) + house(252, 240, 16, 14, true, .5) + smoke(186, 202) + '</g>';
    return s + fog(240, 7, .9) + fog(270, 6, .8, 'c-drift2') + vig();
  },
  guild() {
    let s = sky('room');
    for (let i = 0; i < 6; i++) s += paper(20 + i * 62, 50 + (i % 2) * 14, 48, 36, rr(-4, 4), .18);
    s += '<path d="M60 360 L340 360 L262 236 L138 236 Z" fill="#3a2c1c"/><path d="M78 352 L322 352 L256 244 L144 244 Z" fill="url(#k-paper)" opacity=".35"/>';
    [[150, 240, 30], [250, 240, 30], [118, 290, 44], [282, 290, 44], [84, 346, 60], [316, 346, 60]].forEach(([x, y, h], i) => { s += person(x + (x < 200 ? -26 : 26) * (h / 44), y + h * .3, h, '#0b0806'); s += glow(f1(x + (x < 200 ? 14 : -14) * h / 44), y + 4, 10 + h * .2, i % 2 === 0, 'c-fl', i * .4); });
    s += glow(200, 200, 70, true, 'c-fl') + glow(120, 214, 40, true, 'c-fl', 1) + glow(280, 214, 40, true, 'c-fl', 2);
    return s + vig();
  },
  maps() {
    let s = sky('cold');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const x = 8 + c * 66 + rr(-4, 4), y = 30 + r * 72 + rr(-4, 4); s += paper(x, y, 56, 58, rr(-5, 5), .55) + `<path d="${coast(x + 28, y + 30, rr(10, 18), 8, .5)}" fill="none" stroke="#5a4630" stroke-opacity=".6"/>`; }
    s += '<rect x="168" y="20" width="64" height="200" fill="#1c3a48"/><path d="M168 220 L200 246 L232 220 Z" fill="#1c3a48"/>' + `<g transform="translate(200 120) scale(1.4)"><path d="M0 -30 L4 -20 L14 -19 L6 -12 L9 -2 L0 -8 L-9 -2 L-6 -12 L-14 -19 L-4 -20 Z M0 -2 V40" fill="none" stroke="#dcb46a" stroke-width="2"/></g>`;
    s += '<rect y="330" width="400" height="70" fill="#050a0d"/>' + [60, 140, 260, 340].map((x, i) => `<rect x="${x - 3}" y="312" width="6" height="20" fill="#d9cba6"/>` + glow(x, 308, 30, true, 'c-fl', i * .6)).join('');
    return s + vig();
  },
  emptyhall() {
    let s = sky('cold') + '<path d="M170 60 L230 60 L230 240 L170 240 Z" fill="#6c8088" opacity=".55"/>' + `<ellipse cx="200" cy="230" rx="90" ry="40" fill="url(#k-fg)"/>`;
    for (let i = 0; i < 6; i++) s += paper(20 + i * 62, 50 + (i % 2) * 14, 48, 36, rr(-14, 14), .08);
    s += '<path d="M60 360 L340 360 L262 236 L138 236 Z" fill="#14100b"/>';
    for (let i = 0; i < 16; i++) s += paper(rr(30, 360), rr(300, 380), 18, 14, rr(-60, 60), .35);
    for (let i = 0; i < 7; i++) { const t = i / 6; s += `<ellipse cx="${f1(200 + (i % 2 ? 7 : -7) * (1 - t * .6))}" cy="${f1(392 - t * 150)}" rx="${f1(5 - t * 3)}" ry="${f1(2.6 - t * 1.4)}" fill="#020406" opacity=".8"/>`; }
    s += [120, 280].map(x => `<rect x="${x - 3}" y="214" width="6" height="16" fill="#3a3226"/>` + smoke(x, 212, x / 100)).join('');
    return s + fog(220, 4, .7) + vig();
  },
  chartfade() {
    let s = sky('paper') + rose(200, 200, 150, .3);
    const pts = [[80, 90], [180, 70], [300, 96], [60, 190], [150, 170], [260, 160], [340, 210], [100, 290], [210, 260], [300, 300], [170, 340]];
    pts.forEach(([x, y], i) => { s += `<g class="c-fade" style="animation-delay:${f1(.3 + i * .32)}s"><path d="${coast(x, y, rr(14, 26), 10, .45)}" fill="#bfa77c" stroke="#3a2c1c" stroke-width="1.2"/></g>`; });
    return s + `<g class="c-rise">${fog(200, 6, 1, '', 60)}</g>` + vig();
  },
  village() {
    let s = sky('dawn') + sea(278) + isle(220, 280, 300, 70, INK);
    s += house(130, 262, 20, 18, true) + house(158, 250, 22, 20, true, .7) + house(196, 236, 22, 20, true, 1.4) + house(232, 244, 20, 18, true, .3) + house(264, 256, 18, 16, true, 2) + house(296, 266, 18, 14, false);
    s += smoke(170, 230, 0) + smoke(206, 214, 1.5) + smoke(242, 222, 3) + '<path d="M330 276 L392 280 L392 284 L330 281 Z" fill="' + INK + '"/>' + boat(370, 284, .45, { sail: false });
    return s + `<g class="c-creep">${fog(250, 6, 1, '', 50)}${fog(300, 5, .9, '', 30)}</g>` + vig();
  },
  chest() {
    let s = sky('room') + stars(26, 400).replaceAll('#dfeef0', '#9fe3dc');
    s += '<path d="M90 260 L310 260 L300 370 L100 370 Z" fill="#2c1e12"/><path d="M90 260 L310 260 L330 160 L110 150 Z" fill="#3a2818"/><path d="M90 260 L310 260 L304 280 L96 280 Z" fill="#1a120a"/>';
    s += '<path d="M120 262 L198 250 L200 286 L124 296 Z" fill="#e6dbc0"/><path d="M198 250 L280 262 L276 296 L200 286 Z" fill="#d6c9a8"/><line x1="199" y1="250" x2="200" y2="286" stroke="#8a7656"/>';
    return s + pen(160, 300, 120, -20, 60) + vig();
  },
  girl() {
    let s = sky('fog') + sea(280) + fog(270, 6, .9) + glow(200, 262, 60, false, 'c-fl');
    s += '<path d="M150 400 L250 400 L214 286 L186 286 Z" fill="#0c171d"/>';
    for (let i = 0; i < 8; i++) { const t = i / 8; s += `<line x1="${f1(150 + 36 * t)}" y1="${f1(400 - 114 * t)}" x2="${f1(250 - 36 * t)}" y2="${f1(400 - 114 * t)}" stroke="#02070a" stroke-width="1.4"/>`; }
    // 背影：短髮、右邊一撮白髮、舊航海外套、斜背皮包、耳後的筆
    s += `<g transform="translate(200 396)">
<path d="M-30 0 L-34 -92 Q-36 -112 -22 -118 L22 -118 Q36 -112 34 -92 L30 0 Z" fill="#0d1e2a"/>
<path d="M-22 -118 Q0 -126 22 -118 L18 -126 Q0 -132 -18 -126 Z" fill="#0d1e2a"/>
<path d="M-12 -126 Q-14 -152 0 -154 Q14 -152 12 -126 Z" fill="#05090c"/>
<path d="M-14 -138 Q-16 -164 0 -166 Q16 -164 15 -138 Q12 -128 0 -129 Q-12 -128 -14 -138 Z" fill="#020406"/>
<path d="M8 -162 Q14 -152 12 -134" stroke="#e6eef0" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M-26 -116 L30 -40" stroke="#3a2818" stroke-width="4"/><rect x="18" y="-50" width="22" height="18" rx="3" fill="#3a2818"/>
<line x1="-14" y1="-146" x2="-22" y2="-160" stroke="#8a6a3a" stroke-width="2.2" stroke-linecap="round"/>${glow(-22, -160, 18, true)}
<path d="M-30 -60 L30 -60" stroke="#091520" stroke-width="2"/></g>`;
    return s + vig();
  },
  chart(kind = 'reef') {
    let s = sky('paper') + rose(310, 100, 60, .35);
    const home = [70, 320], to = { reef: [270, 190], bell: [290, 160], bay: [280, 210] }[kind];
    s += `<g fill="#bfa77c" stroke="#3a2c1c" stroke-width="1.3"><path d="${coast(home[0], home[1], 20, 9, .35)}"/>${SHAPES[kind](to[0], to[1])}</g>`;
    s += `<path class="c-draw" pathLength="1" d="M${home[0] + 18} ${home[1] - 10} C140 300 180 ${to[1] + 70} ${to[0] - 34} ${to[1] + 8}" fill="none" stroke="#7a2c1c" stroke-width="2" stroke-linecap="round"/>`;
    s += `<g class="c-pen">${glow(to[0] - 34, to[1] + 8, 26, true)}</g>`;
    for (let i = 0; i < 5; i++) s += `<path d="M${f1(rr(20, 380))} ${f1(rr(40, 380))} q8 -4 16 0 t16 0" stroke="#5a4630" stroke-opacity=".35" fill="none"/>`;
    return s + vig();
  },
  lhwarm() {
    let s = sky('dusk') + sea(272) + isle(290, 274, 170, 34) + tower(300, 248, 110, true, true);
    return s + person(262, 252, 30, INK) + person(276, 252, 18, INK) + fog(280, 3, .4) + vig();
  },
  boatfog() {
    let s = sky('fog') + sea(262) + tower(315, 260, 70, true) + boat(130, 280, .55, { sail: false });
    s += `<line x1="112" y1="276" x2="94" y2="290" stroke="${INK}" stroke-width="1.6"/>`;
    return s + `<g class="c-chase">${fog(250, 9, 1, '', 50)}</g>` + vig();
  },
  lamps() {
    let s = sky('cold') + '<rect x="160" y="40" width="80" height="80" rx="40" fill="#1a2c36"/>';
    let snow = '<g class="c-fall">'; for (let i = 0; i < 18; i++) snow += `<circle cx="${f1(rr(166, 234))}" cy="${f1(rr(44, 116))}" r="1" fill="#dfeef0" opacity=".7"/>`; s += snow + '</g><rect x="160" y="40" width="80" height="80" rx="40" fill="none" stroke="#0a141a" stroke-width="6"/>';
    for (let i = 0; i < 9; i++) { const t = i / 8, x = 200 + Math.sin(t * Math.PI * 2.2) * 120 * (1 - t * .3), y = 380 - t * 230; s += `<rect x="${f1(x - 26)}" y="${f1(y)}" width="52" height="8" fill="#0a141a"/><rect x="${f1(x - 3)}" y="${f1(y - 10)}" width="6" height="10" fill="#2a2016"/>` + `<g class="c-lit" style="animation-delay:${f1(.4 + (8 - i) * .4)}s">${glow(f1(x), f1(y - 13), 26, true, 'c-fl', i)}</g>`; }
    s += '<path d="M320 360 C310 320 292 300 262 304 L256 310 C284 312 298 332 300 360 Z" fill="#0d0a08"/><line x1="262" y1="306" x2="244" y2="316" stroke="#d9cba6" stroke-width="2"/>' + glow(242, 317, 20, true);
    return s + vig();
  },
  lhfog() {
    let s = sky('fog') + sea(272) + fog(250, 5, .7, 'c-drift2') + isle(200, 274, 120, 20) + tower(200, 262, 100, true, true);
    return s + fog(240, 7, 1) + fog(290, 5, .8, 'c-drift2') + vig();
  },
  bellvillage() {
    let s = sky('dawn') + sea(282) + isle(200, 284, 330, 60);
    s += house(100, 272, 18, 16, true) + house(126, 262, 20, 18, true, 1) + house(250, 260, 20, 18, true, 2) + house(280, 270, 18, 16, true, .4);
    s += '<path d="M186 262 L188 150 L212 150 L214 262 Z" fill="' + INK2 + '"/><path d="M182 150 L200 124 L218 150 Z" fill="' + INK + '"/><path d="M193 172 q7 -16 14 0 z" fill="#b8862e"/>' + glow(200, 166, 40, true) + rings(200, 166);
    s += `<g class="c-sail">${boat(90, 318, .42)}${boat(170, 336, .5)}${boat(270, 326, .44)}</g>`;
    return s + fog(300, 3, .3) + vig();
  },
  storm() {
    let s = sky('storm') + '<rect class="c-flash" width="400" height="400" fill="#dfeef0"/>';
    s += '<path d="M0 280 C60 220 120 300 180 250 C240 200 300 290 400 230 L400 400 L0 400 Z" fill="#071014"/><path d="M0 320 C80 290 140 340 220 300 C290 268 340 330 400 300 L400 400 L0 400 Z" fill="#03080a"/>';
    s += `<g transform="translate(232 262) rotate(160)"><path d="M-34 -2 L34 -2 Q30 10 20 12 L-24 12 Q-32 8 -34 -2 Z" fill="#020406"/></g>`;
    return s + rain() + vig();
  },
  doors() {
    let s = sky('dawn') + '<rect y="300" width="400" height="100" fill="#0a161c"/>';
    [[30, 0], [130, 1], [230, 2], [330, 3]].forEach(([x, i]) => {
      s += `<rect x="${x - 10}" y="170" width="90" height="132" fill="${INK2}"/><path d="M${x - 16} 170 L${x + 35} 132 L${x + 86} 170 Z" fill="${INK}"/><rect x="${x + 22}" y="232" width="26" height="70" fill="#1c2a30"/><rect x="${x + 25}" y="214" width="20" height="10" fill="#c4b18a" opacity=".7"/>`;
      s += person(x + 35 + (i % 2 ? 18 : -18), 330, 64 + (i % 3) * 6, '#03070a');
    });
    return s + fog(320, 7, .9) + vig();
  },
  belltower() {
    let s = sky('dawn') + glow(200, 170, 230, true, 'c-fl') + sea(300);
    s += '<path d="M168 300 L172 110 L228 110 L232 300 Z" fill="#02060a"/><path d="M162 110 L200 60 L238 110 Z" fill="#02060a"/><path d="M186 126 L186 160 Q200 150 214 160 L214 126 Q200 112 186 126 Z" fill="#c9a45c" opacity=".5"/><path d="M190 152 q10 -24 20 0 z" fill="#02060a"/>';
    return s + rings(200, 145, 4) + isle(200, 302, 360, 18, '#02060a') + vig();
  },
  pier() {
    let s = sky('dusk') + sea(258) + '<path d="M0 312 L150 300 L150 306 L0 322 Z" fill="' + INK + '"/>' + [20, 60, 100, 140].map(x => `<rect x="${x}" y="304" width="4" height="40" fill="${INK}"/>`).join('');
    s += person(132, 302, 26, INK, '<path d="M137 284 L146 270" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>');
    s += `<g class="c-sail">${boat(280, 282, .8, { lamp: true })}</g>`;
    [[230, 120], [262, 104], [300, 132]].forEach(([x, y]) => { s += `<path class="c-bird" d="M${x - 7} ${y} q7 -6 7 0 q0 -6 7 0" stroke="${INK}" stroke-width="1.6" fill="none"/>`; });
    return s + vig();
  },
  followlight() {
    let s = sky('fog') + sea(272) + fog(260, 5, .7, 'c-drift2');
    s += `<g class="c-sail">${boat(130, 292, .9, { masts: 2, lamp: false })}</g>` + `<g class="c-lead">${glow(300, 250, 50, true)}</g>`;
    return s + fog(250, 7, 1) + vig();
  },
  masts() {
    let s = sky('fog') + sea(292, false);
    for (let i = 0; i < 16; i++) { const x = rr(10, 390), h = rr(60, 190), a = rr(-14, 14), y = 300 + rr(0, 60); s += `<g transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})" stroke="${i % 3 ? INK2 : INK}"><line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x)}" y2="${f1(y - h)}" stroke-width="${f1(rr(1.5, 3.2))}"/><line x1="${f1(x - h * .18)}" y1="${f1(y - h * .7)}" x2="${f1(x + h * .18)}" y2="${f1(y - h * .72)}" stroke-width="1.4"/><line x1="${f1(x)}" y1="${f1(y - h)}" x2="${f1(x + h * .3)}" y2="${f1(y - 4)}" stroke-width=".6" opacity=".6"/></g>`; }
    return s + fog(260, 7, 1) + fog(320, 5, .9, 'c-drift2') + vig();
  },
  ship() {
    let s = sky('fog') + sea(280) + fog(250, 6, .8, 'c-part');
    s += boat(200, 284, 2.2, { masts: 2, sail: false }) + `<g stroke="${INK}" stroke-width="1"><line x1="174" y1="284" x2="174" y2="180"/><line x1="226" y1="284" x2="226" y2="168"/></g>` + glow(200, 266, 24, false, 'c-fl');
    return s + fog(300, 5, .6, 'c-part') + vig();
  },
  logbook() {
    let s = '<rect width="400" height="400" fill="#140f0a"/>' + paper(40, 20, 320, 370, -2, 1);
    for (let i = 0; i < 11; i++) { let d = `M70 ${60 + i * 22}`; for (let x = 70; x < 320 - (i === 10 ? 160 : rr(0, 50)); x += 12) d += ` q3 ${f1(rr(-4, 0))} 6 0 t6 0`; s += `<path d="${d}" stroke="#3a2c1c" stroke-opacity="${i > 7 ? .35 : .7}" fill="none" stroke-width="1.1"/>`; }
    s += '<ellipse cx="300" cy="120" rx="40" ry="26" fill="#8a7656" opacity=".18"/><ellipse cx="90" cy="300" rx="50" ry="30" fill="#8a7656" opacity=".14"/>';
    return s + starPen(200, 312, 1.4) + glow(200, 290, 70, true, 'c-lit') + vig();
  },
  intofog() {
    let s = sky('cold') + '<g class="c-spin" style="transform-origin:200px 200px">';
    for (let i = 0; i < 14; i++) { const a = i / 14 * 360; s += `<ellipse cx="200" cy="${f1(200 - 40 - i * 7)}" rx="${110 + i * 6}" ry="${16 + i}" fill="url(#k-fg)" transform="rotate(${f1(a)} 200 200)"/>`; }
    return s + '</g>' + glow(200, 200, 90, false) + glow(214, 190, 22, true, 'c-lead') + sea(300) + boat(196, 312, .5, { masts: 2 }) + vig();
  },
  lanterns() {
    let s = sky('night') + stars(60, 200) + sea(262) + isle(200, 264, 420, 44, INK);
    const xs = [40, 80, 120, 160, 200, 240, 280, 320, 360];
    xs.forEach((x, i) => { const y = 248 - Math.sin(i / 8 * Math.PI) * 18; s += house(x - 12, y + 8, 20, 18, true, i * .3) + glow(x, y - 20, 16, true, 'c-fl', i * .5); s += `<rect x="${x - 1.5}" y="268" width="3" height="${f1(rr(30, 70))}" fill="#f0d49a" opacity=".22" class="c-fl"/>`; });
    s += '<path d="M20 230 Q200 268 380 230" stroke="' + INK + '" fill="none"/>';
    return s + vig();
  },
  bookmap() {
    let s = '<rect width="400" height="400" fill="#0c0906"/><path d="M20 80 L196 96 L196 360 L24 340 Z" fill="url(#k-paper)"/><path d="M204 96 L380 80 L376 340 L204 360 Z" fill="url(#k-paper)"/><path d="M196 96 Q200 92 204 96 L204 360 Q200 364 196 360 Z" fill="#6a5636"/>';
    s += `<g fill="none" stroke="#3a2c1c" stroke-width="1.4">${SHAPES.reef(70, 150).replaceAll('<path', '<path pathLength="1" class="c-draw" style="animation-delay:.2s"')}${SHAPES.bell(130, 230).replaceAll('<path', '<path pathLength="1" class="c-draw" style="animation-delay:.8s"')}${SHAPES.bay(80, 300).replaceAll('<path', '<path pathLength="1" class="c-draw" style="animation-delay:1.4s"')}</g>`;
    s += rose(290, 220, 60, .25) + `<ellipse cx="290" cy="220" rx="70" ry="60" fill="url(#k-fg)"/>` + glow(290, 220, 50, false, 'c-fl');
    return s + pen(250, 380, 90, -60, 30) + vig();
  },
};
export const ART_KEYS = Object.keys(SCENES);

function art(key, arg) {
  seed = [...key + (arg || '')].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7) >>> 0 || 1;
  const body = SCENES[key] ? SCENES[key](arg) : SCENES.stars();
  return `<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${DEFS}${body}</svg>`;
}

// ───────── 播放 ─────────
let pics = null; // 已經生好的插圖名稱
export function loadPics() {
  if (pics) return Promise.resolve(pics);
  return fetch('img/manifest.json').then(r => r.ok ? r.json() : {}).then(m => (pics = new Set(m.scene || []))).catch(() => (pics = new Set()));
}

export async function playCinema(ctx, cine) {
  await loadPics();
  const frames = cine.frames;
  const prevMusic = ctx.audio.want;
  ctx.audio.music('劇情');
  return new Promise(res => {
    const box = el('div', { class: 'cine' });
    const stage = el('div', { class: 'cine-stage' });
    const text = el('p', { class: 'cine-text' });
    const big = el('div', { class: 'cine-title' });
    const bar = el('div', { class: 'cine-bar' }, ...frames.map(() => el('i')));
    const skip = el('button', { class: 'cine-skip', onclick: e => { e.stopPropagation(); end(); } }, '略過 ▸▸');
    box.append(stage, el('div', { class: 'cine-low' }, text), big, bar, skip);
    $('layer').append(box);
    let i = -1, timer = null, typing = false, over = false;
    const small = Math.min(innerWidth, innerHeight * 1.2) <= 520;

    const show = () => {
      i++;
      if (i >= frames.length) return end();
      const F = frames[i];
      [...bar.children].forEach((b, k) => b.className = k < i ? 'done' : k === i ? 'on' : '');
      const dur = Math.max(4.8, 2 + [...F.text].length * .12 + (F.title ? 2.4 : 0));
      const shot = el('div', { class: 'cine-shot cam-' + (F.cam || 'in'), style: { animationDuration: `1.2s, ${dur + 1.5}s` } });
      if (pics.has(F.img)) {
        const im = el('img', { src: encodeURI(`img/scene/${F.img}-${small ? 700 : 1200}.webp`), alt: '' });
        im.onerror = () => { im.remove(); shot.innerHTML = art(F.art, F.arg); };
        shot.append(im);
      } else shot.innerHTML = art(F.art, F.arg);
      stage.append(shot);
      const olds = [...stage.children].slice(0, -1);
      setTimeout(() => olds.forEach(o => o.remove()), 1300);
      // 字一個一個浮現
      text.innerHTML = '';
      text.classList.remove('all');
      [...ctx.ui.fmt(F.text)].forEach((c, k) => text.append(el('span', { style: { animationDelay: `${.5 + k * .055}s` } }, c)));
      typing = true;
      const typeEnd = setTimeout(() => { typing = false; }, 500 + [...F.text].length * 55);
      big.className = 'cine-title';
      big.textContent = '';
      if (F.title) setTimeout(() => { if (frames[i] === F && !over) { big.textContent = F.title; big.className = 'cine-title on' + (F.title.length > 4 ? ' long' : ''); } }, 1200 + [...F.text].length * 55);
      if (F.sfx) ctx.audio.sfx(F.sfx);
      clearTimeout(timer);
      timer = setTimeout(show, dur * 1000);
      box.onclick = () => {
        if (typing) { typing = false; clearTimeout(typeEnd); text.classList.add('all'); if (F.title) { big.textContent = F.title; big.className = 'cine-title on' + (F.title.length > 4 ? ' long' : ''); } return; }
        clearTimeout(timer); show();
      };
    };
    const end = () => {
      if (over) return; over = true;
      clearTimeout(timer);
      box.classList.add('out');
      ctx.audio.music(prevMusic);
      setTimeout(() => { box.remove(); res(); }, 600);
    };
    show();
  });
}
