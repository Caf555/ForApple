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
<linearGradient id="k-ember" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0606"/><stop offset=".55" stop-color="#3a1a14"/><stop offset=".72" stop-color="#8a3a22"/><stop offset="1" stop-color="#1c0c0a"/></linearGradient>
<linearGradient id="k-mine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050403"/><stop offset=".6" stop-color="#1a140e"/><stop offset="1" stop-color="#0a0806"/></linearGradient>
<radialGradient id="k-gr"><stop offset="0" stop-color="#ffe2b0"/><stop offset=".2" stop-color="#f08a4a" stop-opacity=".75"/><stop offset=".55" stop-color="#c0402a" stop-opacity=".22"/><stop offset="1" stop-color="#c0402a" stop-opacity="0"/></radialGradient>
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
  // 第二海域：環礁、雙影、潟湖、塔
  atoll: (x, y) => `<path d="M${x - 46} ${y} A46 34 0 1 1 ${x + 46} ${y} A46 34 0 1 1 ${x - 46} ${y} Z M${x - 30} ${y} A30 20 0 1 0 ${x + 30} ${y} A30 20 0 1 0 ${x - 30} ${y} Z" fill-rule="evenodd"/>`,
  twin: (x, y) => `<path d="${coast(x - 26, y, 22, 10, .3)}"/><path d="${coast(x + 30, y + 6, 22, 10, .3)}" fill="none" stroke-dasharray="4 3"/>`,
  lagoon: (x, y) => `<path d="M${x - 40} ${y} A40 30 0 1 1 ${x + 40} ${y} A40 30 0 1 1 ${x - 40} ${y} Z M${x - 26} ${y} A26 18 0 1 0 ${x + 26} ${y} A26 18 0 1 0 ${x - 26} ${y} Z" fill-rule="evenodd"/><path d="M${x + 34} ${y + 12} l8 4" stroke-width="3"/>`,
  tower: (x, y) => `<path d="${coast(x, y, 30, 12, .12)}"/><path d="M${x - 4} ${y + 2} v-24 h8 v24 z" fill="#efe6cf"/>`,
  ember: (x, y) => `<path d="${coast(x - 40, y + 10, 16, 9, .4)}"/><path d="${coast(x, y - 6, 20, 9, .4)}"/><path d="${coast(x + 38, y + 14, 14, 9, .4)}"/><path d="M${x - 4} ${y - 16} q-6 -14 2 -26 t0 -20" fill="none" stroke="#8a8a8a" stroke-width="3" stroke-opacity=".6"/>`,
  caldera: (x, y) => `<path d="M${x - 40} ${y} A40 30 0 1 1 ${x + 40} ${y} A40 30 0 1 1 ${x - 40} ${y} Z M${x - 24} ${y} A24 17 0 1 0 ${x + 24} ${y} A24 17 0 1 0 ${x - 24} ${y} Z" fill-rule="evenodd"/><path d="M${x + 22} ${y + 10} l18 14" stroke-width="3"/>`,
  mine: (x, y) => `<path d="${coast(x, y, 34, 12, .3)}"/><path d="M${x - 8} ${y + 4} q8 -14 16 0 z" fill="#2a1e12"/>`,
  forge: (x, y) => `<path d="${coast(x, y, 30, 12, .35)}"/><circle cx="${x}" cy="${y - 2}" r="5" fill="#c0402a"/>`,
  cape: (x, y) => `<path d="${coast(x, y, 38, 13, .3)}"/><path d="M${x - 10} ${y + 2} l10 -18 l10 18 z" fill="#a03a2c"/>`,
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
    const home = [70, 320], to = { reef: [270, 190], bell: [290, 160], bay: [280, 210], atoll: [270, 170], twin: [280, 180], lagoon: [270, 180], tower: [290, 170], ember: [270, 190] }[kind];
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
  bookmap(page) {
    if (page === '2') return SCENES.bookmap2();
    let s = '<rect width="400" height="400" fill="#0c0906"/><path d="M20 80 L196 96 L196 360 L24 340 Z" fill="url(#k-paper)"/><path d="M204 96 L380 80 L376 340 L204 360 Z" fill="url(#k-paper)"/><path d="M196 96 Q200 92 204 96 L204 360 Q200 364 196 360 Z" fill="#6a5636"/>';
    s += `<g fill="none" stroke="#3a2c1c" stroke-width="1.4">${SHAPES.reef(70, 150).replaceAll('<path', '<path pathLength="1" class="c-draw" style="animation-delay:.2s"')}${SHAPES.bell(130, 230).replaceAll('<path', '<path pathLength="1" class="c-draw" style="animation-delay:.8s"')}${SHAPES.bay(80, 300).replaceAll('<path', '<path pathLength="1" class="c-draw" style="animation-delay:1.4s"')}</g>`;
    s += rose(290, 220, 60, .25) + `<ellipse cx="290" cy="220" rx="70" ry="60" fill="url(#k-fg)"/>` + glow(290, 220, 50, false, 'c-fl');
    return s + pen(250, 380, 90, -60, 30) + vig();
  },

  // ═════ 第二海域 ═════
  observatory() {
    let s = sky('night') + stars(90, 260);
    s += '<path d="M60 400 L60 300 Q200 170 340 300 L340 400 Z" fill="' + INK + '"/><path d="M196 196 L280 150 L286 160 L204 206 Z" fill="#1a2a33"/>';
    s += '<path d="M120 400 L120 330 L280 330 L280 400 Z" fill="' + INK2 + '"/><rect x="190" y="350" width="20" height="50" fill="#e8c27a" opacity=".8"/>' + glow(200, 360, 40, true);
    s += '<path d="M284 154 L330 120" stroke="#dcb46a" stroke-opacity=".4" stroke-width="1" stroke-dasharray="2 3"/>' + glow(332, 118, 18, true, 'c-blink');
    return s + vig();
  },
  starchart() {
    let s = '<rect width="400" height="400" fill="#0a1420"/>' + stars(70, 400);
    const pts = [[70, 90], [130, 60], [210, 80], [300, 70], [340, 140], [260, 150], [180, 140], [110, 160]];
    s += `<path class="c-draw" pathLength="1" d="M${pts.map(p => p.join(' ')).join(' L')}" fill="none" stroke="#9fe3dc" stroke-opacity=".5" stroke-width="1"/>`;
    s += `<g fill="none" stroke="#dcb46a" stroke-width="1.6" class="c-lit" style="animation-delay:1.5s">${SHAPES.atoll(200, 270)}</g>` + glow(200, 270, 60, true, 'c-fl');
    return s + rose(200, 270, 110, .2) + vig();
  },
  marketlights() {
    let s = sky('dusk') + sea(250);
    for (let i = 0; i < 26; i++) { const x = 30 + i * 13 + rr(-4, 4), y = 252 + rr(-4, 6); s += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x)}" y2="${f1(y - rr(20, 50))}" stroke="${INK}" stroke-width="1.4"/>`; }
    s += `<path d="M20 262 L380 262 L376 274 L24 274 Z" fill="${INK}"/>`;
    for (let i = 0; i < 30; i++) s += glow(f1(rr(30, 370)), f1(rr(230, 262)), f1(rr(6, 12)), true, 'c-fl', f1(rr(0, 3)));
    return s + `<g opacity=".5">${fog(280, 4, .5)}</g>` + vig();
  },
  ledgers() {
    let s = sky('room');
    for (let r = 0; r < 7; r++) {
      s += `<rect x="0" y="${30 + r * 52}" width="400" height="4" fill="#1a120a"/>`;
      for (let x = 6; x < 396;) { const w = rr(10, 18), h = rr(36, 48); s += `<rect x="${f1(x)}" y="${f1(30 + r * 52 - h)}" width="${f1(w)}" height="${f1(h)}" fill="${['#3a2818', '#2c1e12', '#4a3420', '#efe6cf'][Math.floor(rr(0, 3.15))]}" opacity=".9"/>`; x += w + 1.5; }
    }
    return s + glow(200, 200, 140, true, 'c-fl') + vig();
  },
  market() {
    let s = sky('night') + stars(30, 120) + sea(250);
    for (let i = 0; i < 9; i++) { const x = 20 + i * 44, y = 290 + (i % 2) * 14; s += boat(x, y, .5, { sail: false, masts: 1 }); }
    s += `<path d="M0 230 Q100 200 200 226 T400 220" stroke="${INK}" fill="none" stroke-width="1"/><path d="M0 200 Q120 170 220 196 T400 186" stroke="${INK}" fill="none" stroke-width="1"/>`;
    for (let i = 0; i < 14; i++) { const t = i / 13; s += `<rect x="${f1(t * 400 - 4)}" y="${f1(222 - Math.sin(t * Math.PI) * 18 - 2)}" width="8" height="11" rx="3" fill="#d98a5f"/>` + glow(f1(t * 400), f1(226 - Math.sin(t * Math.PI) * 18), 16, true, 'c-fl', i * .3); }
    for (let i = 0; i < 10; i++) { const t = i / 9; s += `<rect x="${f1(t * 400 - 4)}" y="${f1(192 - Math.sin(t * Math.PI) * 22 - 2)}" width="8" height="11" rx="3" fill="#e8c27a"/>` + glow(f1(t * 400), f1(196 - Math.sin(t * Math.PI) * 22), 14, true, 'c-fl', i * .5); }
    return s + vig();
  },
  scale() {
    let s = sky('room') + glow(200, 120, 160, true, 'c-fl');
    s += '<rect x="196" y="120" width="8" height="200" fill="#2a2016"/><rect x="150" y="318" width="100" height="12" fill="#2a2016"/>';
    s += `<g class="c-tilt"><rect x="90" y="116" width="220" height="6" fill="#8a6a3a"/><path d="M100 122 L80 190 M100 122 L120 190 M300 122 L280 190 M300 122 L320 190" stroke="#8a6a3a"/><path d="M74 190 Q100 206 126 190 Z M274 190 Q300 206 326 190 Z" fill="#b8862e"/>${[0, 1, 2].map(i => `<ellipse cx="${292 + i * 7}" cy="${186 - i * 3}" rx="6" ry="4" fill="#e6eef0"/>`).join('')}</g>`;
    s += '<path d="M40 300 C60 260 80 240 100 236 L104 246 C90 254 76 272 70 300 Z" fill="#0d0a08"/><ellipse cx="102" cy="238" rx="10" ry="6" fill="#0d0a08"/>';
    return s + vig();
  },
  pawnshop() {
    let s = sky('night') + '<rect y="0" width="400" height="400" fill="#05090c" opacity=".5"/>';
    s += `<path d="M0 0 L130 120 L130 400 L0 400 Z" fill="${INK}"/><path d="M400 0 L270 120 L270 400 L400 400 Z" fill="${INK}"/>`;
    s += `<rect x="160" y="170" width="80" height="120" fill="${INK2}"/><rect x="186" y="220" width="28" height="70" fill="#2a2016"/>`;
    s += `<rect x="188" y="140" width="24" height="32" rx="8" fill="#b84a3a"/>` + glow(200, 156, 50, true, 'c-blink');
    s += `<path d="M196 150 h8 M200 146 v16 M195 158 h10" stroke="#2a0e08" stroke-width="2"/>`;
    for (let i = 0; i < 4; i++) s += glow(40 + i * 18, 160 + i * 30, 8, true, 'c-fl', i) + glow(360 - i * 18, 160 + i * 30, 8, true, 'c-fl', i + 1);
    return s + `<path d="M130 400 L170 290 L230 290 L270 400 Z" fill="#0a1218"/>` + fog(330, 4, .6) + vig();
  },
  pawnqueue() {
    let s = sky('fog') + '<rect y="290" width="400" height="110" fill="#0a161c"/>';
    s += `<rect x="290" y="150" width="110" height="146" fill="${INK2}"/><rect x="306" y="200" width="30" height="96" fill="#2a2016"/>` + glow(321, 230, 30, true);
    [[60, 300, 54], [110, 304, 58], [160, 300, 52], [210, 306, 60], [250, 302, 56]].forEach(([x, y, h], i) => { s += `<g opacity="${f1(1 - i * .14)}">${person(x, y, h, i < 2 ? '#3a4a52' : INK)}</g>`; });
    return s + fog(260, 6, .9) + vig();
  },
  surveyor() {
    let s = sky('dusk') + glow(320, 250, 120, true, 'c-fl') + sea(258) + isle(300, 260, 140, 26);
    s += boat(130, 290, 1.1, { sail: false });
    s += person(110, 284, 46, INK, `<path d="M118 262 L140 254" stroke="${INK}" stroke-width="3"/>`);
    s += `<rect x="134" y="246" width="34" height="24" fill="url(#k-paper)" transform="rotate(-12 151 258)"/><path d="M140 254 q8 -6 16 0 t10 4" stroke="#3a2c1c" fill="none" stroke-width=".8" transform="rotate(-12 151 258)"/>`;
    return s + vig();
  },
  halffog() {
    let s = sky('fog') + sea(270) + isle(200, 272, 300, 64);
    s += house(100, 256, 18, 16, true) + house(130, 244, 20, 18, true, 1) + house(256, 246, 20, 18, true, 2) + house(290, 258, 18, 14, true, .5);
    return s + `<g class="c-creep" style="animation-direction:reverse">${fog(230, 6, 1, '', 40).replace('<g class="c-drift"', '<g')}</g><rect x="200" y="0" width="200" height="400" fill="url(#k-fog)" opacity=".75" class="c-lit" style="animation-delay:.6s"/>` + vig();
  },
  twinvillage() {
    let s = sky('dawn') + sea(250);
    const side = (dx, flip) => { let t = isle(dx, 262, 160, 30); [0, 1, 2].forEach(i => { t += house(dx - 50 + i * 34 - (flip ? 4 : 0), 250 - (i % 2) * 8, 18, 16, true, i); }); t += person(dx + (flip ? -60 : 60), 262, 28); return t; };
    s += side(90, false) + side(310, true);
    s += `<path d="M180 250 L220 250" stroke="#dfeef0" stroke-opacity=".2" stroke-dasharray="3 4"/>`;
    return s + fog(270, 4, .5) + vig();
  },
  fogfigure() {
    let s = sky('fog') + sea(290, false) + fog(250, 7, 1);
    s += `<g opacity=".7">${person(200, 300, 90, '#2a3a42', '<line x1="226" y1="250" x2="262" y2="200" stroke="#2a3a42" stroke-width="3"/>')}</g>`;
    s += `<line x1="150" y1="304" x2="250" y2="304" stroke="#c4b18a" stroke-opacity=".5" stroke-dasharray="1 5" stroke-width="3"/>` + glow(262, 200, 18, true, 'c-blink');
    return s + fog(300, 5, .9, 'c-drift2') + vig();
  },
  lagoon() {
    let s = sky('dawn') + '<rect y="200" width="400" height="200" fill="#0b2232"/>';
    s += `<ellipse cx="200" cy="290" rx="190" ry="80" fill="${INK}"/><ellipse cx="200" cy="292" rx="150" ry="58" fill="#3a7a88" opacity=".8"/><ellipse cx="200" cy="292" rx="150" ry="58" fill="url(#k-gc)" opacity=".5"/>`;
    s += `<path d="M330 260 l30 10" stroke="#5a4630" stroke-width="6"/>`;
    return s + fog(240, 3, .4) + vig();
  },
  gates() {
    let s = sky('fog') + sea(270);
    s += `<rect x="0" y="230" width="150" height="70" fill="${INK2}"/><rect x="250" y="230" width="150" height="70" fill="${INK2}"/><rect x="150" y="210" width="100" height="16" fill="${INK}"/>`;
    for (let i = 0; i < 3; i++) s += `<rect x="${158 + i * 30}" y="226" width="22" height="74" fill="#1a2a33"/>`;
    s += person(60, 230, 30) + person(90, 230, 26) + person(330, 230, 30);
    s += '<path d="M140 210 L120 120" stroke="' + INK + '" stroke-width="3"/><path d="M120 120 L170 130" stroke="' + INK + '" stroke-width="2"/><rect x="164" y="128" width="12" height="26" fill="#efe6cf" opacity=".6"/>';
    return s + vig();
  },
  pearls() {
    let s = sky('cold') + sea(240, false);
    s += '<path d="M60 400 C100 300 160 280 200 284 C240 280 300 300 340 400 Z" fill="#0d0a08"/>';
    for (let i = 0; i < 9; i++) { const x = 150 + rr(0, 100), y = 280 + rr(-16, 10); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr(5, 8))}" fill="#e6eef0"/>` + glow(f1(x), f1(y), 18, false, 'c-fl', i * .4); }
    return s + vig();
  },
  ripples() {
    let s = sky('night') + stars(50, 200) + '<rect y="200" width="400" height="200" fill="#071722"/>';
    for (let i = 0; i < 4; i++) s += `<ellipse class="c-ring" style="animation-delay:-${i * .9}s;transform-box:fill-box;transform-origin:center" cx="200" cy="290" rx="20" ry="6" fill="none" stroke="#9fe3dc" stroke-opacity=".6"/>`;
    s += `<circle cx="200" cy="288" r="4" fill="#e6eef0"/>` + glow(200, 288, 30, false, 'c-fl');
    return s + vig();
  },
  coralshape() {
    let s = '<rect width="400" height="400" fill="#06141c"/>' + glow(200, 120, 200, false, 'c-fl');
    s += `<path d="M60 330 C70 280 120 260 160 266 C190 240 230 236 250 256 C300 250 340 280 350 330 Z" fill="#1a3a44"/>`;
    for (let i = 0; i < 14; i++) { const x = rr(70, 340), y = rr(270, 320); s += `<path d="M${f1(x)} ${f1(y)} l${f1(rr(-6, 6))} ${f1(-rr(12, 30))} m0 8 l${f1(rr(-8, 8))} -8" stroke="#2a5a62" stroke-width="2" fill="none"/>`; }
    s += `<circle cx="244" cy="246" r="14" fill="#1a3a44"/>`;
    for (let i = 0; i < 12; i++) s += `<circle class="c-fall" style="animation-delay:-${f1(rr(0, 6))}s" cx="${f1(rr(40, 360))}" cy="${f1(rr(20, 240))}" r="1.4" fill="#9fe3dc" opacity=".6"/>`;
    return s + vig();
  },
  whitetower() {
    let s = sky('dawn') + sea(300) + isle(200, 302, 360, 30);
    s += '<path d="M176 300 L182 90 L218 90 L224 300 Z" fill="#d9d4c6"/><path d="M174 90 L200 66 L226 90 Z" fill="#b8b2a2"/>';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 2; c++) s += `<rect x="${188 + c * 16}" y="${104 + r * 24}" width="8" height="12" fill="#5a6470"/>`;
    s += `<rect x="194" y="74" width="12" height="10" fill="#efe6cf"/>` + glow(200, 79, 30, false, 'c-fl');
    for (let i = 0; i < 6; i++) s += house(40 + i * 18, 296, 12, 12, false) + house(280 + i * 18, 296, 12, 12, false);
    return s + vig();
  },
  whitelines() {
    let s = sky('paper') + rose(310, 90, 50, .3);
    [[110, 150], [200, 120], [290, 170], [130, 270], [250, 280], [190, 200]].forEach(([x, y], i) => {
      s += `<path d="${coast(x, y, rr(18, 26), 9, .4)}" fill="#bfa77c" stroke="#3a2c1c" stroke-width="1.1"/>`;
      s += `<path class="c-draw" style="animation-delay:${f1(.3 + i * .35)}s" pathLength="1" d="${coast(x, y, 38, 14, .05)}" fill="none" stroke="#ffffff" stroke-width="1.6"/>`;
    });
    return s + vig();
  },
  greycoral() {
    let s = '<rect width="400" height="400" fill="#0c1a22"/><rect y="0" width="400" height="160" fill="#14283a"/>';
    for (let i = 0; i < 9; i++) { const x = 30 + i * 42, h = rr(70, 150); s += `<path d="M${x} 400 L${x} ${f1(400 - h)} M${x} ${f1(400 - h * .6)} l-14 -20 M${x} ${f1(400 - h * .8)} l12 -18 M${x - 14} ${f1(400 - h * .6 - 20)} l-4 -14" stroke="#c9ccc6" stroke-width="${f1(rr(4, 7))}" stroke-linecap="round" fill="none" opacity=".85"/>`; }
    return s + fog(200, 4, .4) + vig();
  },
  whitepage() {
    let s = sky('room') + '<rect x="70" y="280" width="260" height="12" fill="#2a1e12"/><rect x="90" y="292" width="10" height="108" fill="#2a1e12"/><rect x="300" y="292" width="10" height="108" fill="#2a1e12"/>';
    s += `<g class="c-lead"><rect x="150" y="190" width="100" height="74" fill="#f6f2e6" transform="rotate(-8 200 227)"/></g>` + glow(200, 226, 150, false, 'c-fl') + glow(200, 226, 60, false);
    return s + vig();
  },
  pagemsg() {
    let s = '<rect width="400" height="400" fill="#140f0a"/>' + `<rect x="60" y="60" width="280" height="280" fill="#f2ecdc" transform="rotate(3 200 200)"/>`;
    let d = 'M100 190'; for (let x = 100; x < 300; x += 12) d += ` q3 ${f1(rr(-4, 0))} 6 0 t6 0`;
    s += `<path class="c-draw" pathLength="1" d="${d}" stroke="#3a2c1c" fill="none" stroke-width="1.4" transform="rotate(3 200 200)"/>`;
    return s + starPen(320, 240, .7) + glow(200, 200, 90, true, 'c-lit') + vig();
  },
  redcoral() {
    let s = '<rect width="400" height="400" fill="#0c1a22"/><rect y="0" width="400" height="160" fill="#14283a"/>';
    for (let i = 0; i < 9; i++) { const x = 30 + i * 42, h = rr(70, 150); s += `<path d="M${x} 400 L${x} ${f1(400 - h)} M${x} ${f1(400 - h * .6)} l-14 -20 M${x} ${f1(400 - h * .8)} l12 -18" stroke="#c9ccc6" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/><path class="c-lit" style="animation-delay:${f1(.8 + i * .25)}s" d="M${x} 400 L${x} ${f1(400 - h * .35)}" stroke="#c0503e" stroke-width="5" stroke-linecap="round"/>`; }
    for (let i = 0; i < 5; i++) s += `<path class="c-sail" d="M${f1(rr(40, 300))} ${f1(rr(200, 320))} l12 -4 l-2 4 l2 4 z" fill="#d98a5f" opacity=".7"/>`;
    return s + vig();
  },
  redsail() {
    let s = sky('night') + stars(40, 180) + sea(262) + glow(330, 250, 90, true, 'c-fl');
    s += `<g class="c-sail" style="animation-direction:reverse"><g transform="translate(220 270) scale(1.1)"><path d="M-34 -2 L34 -2 Q30 10 20 12 L-24 12 Q-32 8 -34 -2 Z" fill="${INK}"/><line x1="0" y1="0" x2="0" y2="-60" stroke="${INK}" stroke-width="2"/><path d="M2 -58 Q30 -34 2 -6 Z" fill="#a03a2c"/><path d="M-2 -50 Q-22 -32 -2 -12 Z" fill="#7a2c20"/></g></g>`;
    s += `<path d="M300 250 q10 -30 0 -60 t6 -50" stroke="#5a5a5a" stroke-opacity=".4" stroke-width="10" fill="none" class="c-smoke"/>`;
    return s + vig();
  },
  bookmap2() {
    let s = '<rect width="400" height="400" fill="#0c0906"/><path d="M20 80 L196 96 L196 360 L24 340 Z" fill="url(#k-paper)"/><path d="M204 96 L380 80 L376 340 L204 360 Z" fill="url(#k-paper)"/><path d="M196 96 Q200 92 204 96 L204 360 Q200 364 196 360 Z" fill="#6a5636"/>';
    s += `<g fill="#bfa77c" stroke="#3a2c1c" stroke-width="1.2" opacity=".75">${SHAPES.reef(60, 140)}${SHAPES.bell(110, 210)}${SHAPES.bay(70, 290)}</g>`;
    s += `<g fill="none" stroke="#3a2c1c" stroke-width="1.4">${[SHAPES.atoll(280, 150), SHAPES.twin(250, 230), SHAPES.lagoon(320, 240), SHAPES.tower(290, 310)].map((p, i) => p.replaceAll('<path', `<path pathLength="1" class="c-draw" style="animation-delay:${f1(.2 + i * .6)}s"`)).join('')}</g>`;
    return s + pen(240, 390, 80, -70, 26) + vig();
  },
  // ═════ 第三海域 ═════
  southsmoke() {
    let s = sky('night') + stars(60, 230) + glow(310, 250, 110, true, 'c-fl') + sea(262);
    s += [280, 316, 350].map((x, i) => isle(x, 264, 44 - i * 6, 18 - i * 3) + `<path class="c-smoke" style="animation-delay:-${i}s" d="M${x} ${250 - i * 3} q10 -30 0 -60 t6 -50" stroke="#5a4a44" stroke-opacity=".45" stroke-width="${10 - i * 2}" fill="none"/>`).join('');
    s += '<path d="M0 400 L0 300 Q60 250 120 300 L120 400 Z" fill="' + INK + '"/><path d="M70 282 L150 236 L156 246 L78 292 Z" fill="#1a2a33"/>' + person(60, 300, 30);
    return s + vig();
  },
  redchart() {
    let s = '<rect width="400" height="400" fill="#120a0a"/>' + stars(60, 400).replaceAll('#dfeef0', '#f0c0a0');
    const pts = [[120, 120], [200, 90], [280, 130], [250, 210], [170, 230], [110, 300], [210, 320]];
    s += `<path class="c-draw" pathLength="1" d="M${pts.map(p => p.join(' ')).join(' L')}" fill="none" stroke="#f0a070" stroke-opacity=".55" stroke-width="1.2"/>`;
    pts.forEach(([x, y], i) => { s += `<circle cx="${x}" cy="${y}" r="${i === pts.length - 1 ? 7 : 4}" fill="#c0402a"/>` + glow(x, y, i === pts.length - 1 ? 40 : 18, true, 'c-fl', i * .4); });
    s += `<text x="218" y="352" font-size="34" font-family="serif" fill="#f0d49a" opacity=".8">七</text>`;
    return s + rose(200, 200, 150, .18) + vig();
  },
  redsails() {
    let s = sky('dusk') + sea(262);
    for (let i = 0; i < 9; i++) { const x = 30 + i * 44 + rr(-8, 8), y = 280 + (i % 3) * 14, k = rr(.45, .8); s += `<g transform="translate(${f1(x)} ${y}) scale(${f1(k)})"><path d="M-34 -2 L34 -2 Q30 10 20 12 L-24 12 Q-32 8 -34 -2 Z" fill="${INK}"/><line x1="0" y1="0" x2="0" y2="-56" stroke="${INK}" stroke-width="2"/><path d="M2 -54 Q30 -32 2 -6 Z" fill="#a03a2c"/><path d="M-2 -46 Q-22 -30 -2 -12 Z" fill="#7a2c20"/></g>`; }
    return s + `<g opacity=".5">${fog(300, 4, .5)}</g>` + vig();
  },
  embroidery() {
    let s = '<rect width="400" height="400" fill="#5a1a14"/>';
    for (let i = 0; i < 40; i++) s += `<line x1="0" y1="${i * 10}" x2="400" y2="${i * 10 + 4}" stroke="#7a2c20" stroke-opacity=".5"/>`;
    s += `<rect x="120" y="120" width="160" height="160" fill="none" stroke="#e6dbc0" stroke-width="2" stroke-dasharray="4 4"/>`;
    s += `<path class="c-draw" pathLength="1" d="M160 160 L240 160 M200 140 L200 260 M160 210 L240 210 M150 260 L250 260" stroke="#efe6cf" stroke-width="6" stroke-linecap="round" fill="none"/>`;
    s += `<line x1="250" y1="300" x2="320" y2="350" stroke="#c9ccc6" stroke-width="2"/><path d="M250 300 C230 280 260 250 240 230" stroke="#efe6cf" fill="none" stroke-width="1.2"/>`;
    return s + glow(200, 200, 150, true, 'c-fl') + vig();
  },
  caldera() {
    let s = sky('ember') + stars(20, 120);
    s += `<path d="M0 400 L0 220 Q60 160 120 200 L140 230 L260 230 L280 200 Q340 160 400 220 L400 400 Z" fill="${INK}"/>`;
    s += `<ellipse cx="200" cy="300" rx="170" ry="60" fill="#2a1410"/><ellipse cx="200" cy="300" rx="150" ry="48" fill="url(#k-sea)"/>`;
    for (let i = 0; i < 12; i++) { const x = 70 + rr(0, 260), y = 290 + rr(-26, 24), k = rr(.3, .5); s += `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(k)})"><path d="M-34 -2 L34 -2 Q30 10 20 12 L-24 12 Q-32 8 -34 -2 Z" fill="${INK}"/><line x1="0" y1="0" x2="0" y2="-56" stroke="${INK}" stroke-width="2"/><path d="M2 -54 Q30 -32 2 -6 Z" fill="#b04a34"/></g>`; }
    for (let i = 0; i < 10; i++) s += glow(f1(rr(60, 340)), f1(rr(270, 320)), 8, true, 'c-fl', i * .3);
    return s + vig();
  },
  warships() {
    let s = sky('dusk') + sea(258) + isle(330, 262, 140, 70) + `<path class="c-smoke" d="M330 196 q10 -30 0 -60 t6 -50" stroke="#5a4a44" stroke-opacity=".5" stroke-width="12" fill="none"/>`;
    s += [70, 140].map((x, i) => `<g transform="translate(${x} ${286 + i * 8}) scale(.7)"><path d="M-34 -2 L34 -2 Q30 10 20 12 L-24 12 Q-32 8 -34 -2 Z" fill="${INK}"/><line x1="0" y1="0" x2="0" y2="-56" stroke="${INK}" stroke-width="2"/><path d="M2 -54 Q30 -32 2 -6 Z" fill="#c9ccc6"/><circle cx="-14" cy="-40" r="5" fill="#c9ccc6"/></g>`).join('');
    s += `<line x1="210" y1="240" x2="210" y2="320" stroke="#c0402a" stroke-opacity=".5" stroke-dasharray="4 6" stroke-width="2"/>`;
    return s + fog(280, 4, .5) + vig();
  },
  sailloft() {
    let s = sky('room');
    for (let i = 0; i < 9; i++) { const x = 20 + i * 44, w = rr(30, 42), h = rr(150, 260); s += `<path d="M${f1(x)} 20 L${f1(x + w)} 20 L${f1(x + w - 4)} ${f1(20 + h)} Q${f1(x + w / 2)} ${f1(30 + h)} ${f1(x + 4)} ${f1(20 + h)} Z" fill="${['#8a2c20', '#a03a2c', '#6a2018'][i % 3]}" opacity="${f1(rr(.6, .95))}"/><text x="${f1(x + w - 12)}" y="${f1(20 + h - 12)}" font-size="9" fill="#efe6cf" opacity=".7" font-family="serif">${'潮沙燈汀岩鹽霧星月'[i]}</text>`; }
    s += `<rect y="20" width="400" height="6" fill="#1a120a"/>`;
    return s + glow(200, 300, 120, true, 'c-fl') + vig();
  },
  blanksail() {
    let s = sky('room') + '<rect width="400" height="400" fill="#05090c" opacity=".6"/>';
    s += `<g class="c-lead"><path d="M150 60 L250 60 Q262 180 240 300 Q200 316 160 300 Q138 180 150 60 Z" fill="#9a4a3c" opacity=".7"/><path d="M150 60 L250 60 Q262 180 240 300 Q200 316 160 300 Q138 180 150 60 Z" fill="url(#k-fg)"/></g>`;
    s += `<rect y="56" width="400" height="6" fill="#1a120a"/>` + person(80, 380, 60, INK) + person(330, 380, 56, INK);
    return s + fog(320, 5, .7) + vig();
  },
  mountainmaw() {
    let s = sky('ember') + stars(20, 140);
    s += `<path d="M0 400 L60 220 L140 120 L200 90 L270 130 L350 230 L400 300 L400 400 Z" fill="${INK}"/>`;
    s += `<path d="M168 250 Q200 196 232 250 L232 300 Q200 316 168 300 Z" fill="#000"/>` + glow(200, 280, 40, true, 'c-blink');
    s += `<path d="M120 400 L170 300 L230 300 L280 400" stroke="#3a2a1a" stroke-width="3" fill="none"/>`;
    return s + vig();
  },
  roster() {
    let s = sky('mine') + `<rect x="120" y="70" width="160" height="200" fill="#3a2818"/>`;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { const x = 136 + c * 24, y = 92 + r * 28, empty = r === 4 || (r === 5 && c < 3); s += `<circle cx="${x + 6}" cy="${y - 4}" r="1.6" fill="#8a7656"/>` + (empty ? '' : `<rect x="${x}" y="${y}" width="12" height="16" rx="2" fill="#b8862e"/>`); }
    s += person(80, 380, 70, INK) + person(320, 380, 64, INK) + glow(200, 170, 120, true, 'c-fl');
    return s + vig();
  },
  cavein() {
    let s = sky('mine');
    s += `<path d="M60 400 L100 140 L300 140 L340 400 Z" fill="#14100b"/><path d="M110 140 L290 140 L280 170 L120 170 Z" fill="#2a2016"/>`;
    for (let i = 0; i < 18; i++) { const x = rr(110, 290), y = rr(220, 360), r = rr(14, 34); s += `<path d="${coast(x, y, r, 7, .5)}" fill="${['#3a2c1c', '#2a2016', '#4a3a26'][i % 3]}"/>`; }
    for (let i = 0; i < 20; i++) s += `<circle class="c-fall" style="animation-delay:-${f1(rr(0, 3))}s" cx="${f1(rr(120, 280))}" cy="${f1(rr(160, 240))}" r="1.6" fill="#8a7656"/>`;
    return s + glow(200, 380, 60, true, 'c-fl') + vig();
  },
  knocking() {
    let s = sky('mine') + `<rect x="0" y="0" width="400" height="400" fill="#1a140e"/>`;
    for (let i = 0; i < 30; i++) s += `<path d="${coast(rr(0, 400), rr(0, 400), rr(20, 50), 7, .5)}" fill="none" stroke="#2a2016" stroke-width="2"/>`;
    for (let i = 0; i < 4; i++) s += `<circle class="c-ring" style="animation-delay:-${i * .9}s;transform-box:fill-box;transform-origin:center" cx="200" cy="200" r="16" fill="none" stroke="#f0d49a" stroke-width="1.4"/>`;
    return s + vig();
  },
  listenwall() {
    let s = sky('mine') + `<rect x="230" y="0" width="170" height="400" fill="#2a2016"/>`;
    s += `<g transform="translate(200 390)"><path d="M-40 0 L-36 -110 Q-30 -140 0 -144 Q20 -140 26 -120 L30 0 Z" fill="${INK}"/><circle cx="12" cy="-166" r="24" fill="${INK}"/></g>`;
    s += glow(150, 300, 30, true) + `<rect x="144" y="300" width="12" height="20" fill="#3a2818"/>`;
    s += `<path d="M190 218 Q210 210 230 220" stroke="#f0d49a" stroke-opacity=".25" fill="none" stroke-width="30"/>`;
    return s + vig();
  },
  forgeisle() {
    let s = sky('night') + stars(40, 200) + sea(270) + isle(200, 272, 260, 80, '#0a0606');
    s += glow(200, 214, 90, true, 'c-fl').replaceAll('k-gw', 'k-gr') + `<rect x="190" y="200" width="20" height="18" fill="#f08a4a"/>`;
    s += [120, 270, 300].map((x, i) => smoke(x, 250 - i * 6, i)).join('');
    return s + vig();
  },
  pens() {
    let s = sky('room') + `<rect x="40" y="250" width="320" height="20" fill="#2a2016"/>`;
    for (let i = 0; i < 7; i++) { const x = 80 + i * 40; s += `<line x1="${x}" y1="248" x2="${x + 6}" y2="160" stroke="#8a6a3a" stroke-width="3" stroke-linecap="round"/>` + glow(x + 6, 158, 18, true, 'c-fl', i * .3); }
    s += `<path d="M260 270 L340 270 L330 300 L270 300 Z" fill="#14100b"/>`;
    return s + vig();
  },
  oldsmith() {
    let s = sky('room') + glow(300, 240, 160, true, 'c-fl').replaceAll('k-gw', 'k-gr');
    s += `<path d="M270 400 L270 220 Q300 200 330 220 L330 400 Z" fill="#14100b"/><rect x="284" y="250" width="32" height="30" fill="#f08a4a"/>`;
    s += `<g transform="translate(150 390)"><path d="M-46 0 L-40 -100 Q-30 -130 0 -132 Q30 -130 40 -100 L46 0 Z" fill="${INK}"/><circle cx="0" cy="-150" r="22" fill="${INK}"/><path d="M-14 -160 Q0 -172 14 -160" stroke="#c9ccc6" stroke-width="3" fill="none"/></g>`;
    s += `<rect x="40" y="320" width="60" height="16" fill="#2a2016"/><rect x="58" y="336" width="24" height="64" fill="#2a2016"/>`;
    return s + vig();
  },
  coalline() {
    let s = sky('ember') + `<rect y="300" width="400" height="100" fill="#0a0606"/>` + glow(350, 260, 120, true, 'c-fl').replaceAll('k-gw', 'k-gr');
    s += `<path d="M320 300 L320 230 Q350 210 380 230 L380 300 Z" fill="${INK}"/>`;
    [[60, 52], [110, 56], [160, 50], [210, 54], [260, 50]].forEach(([x, h], i) => { s += person(x, 304, h) + `<rect x="${x + 8}" y="${304 - h * .45}" width="12" height="12" fill="#1a1410"/>`; });
    return s + vig();
  },
  penflame() {
    let s = '<rect width="400" height="400" fill="#0a0404"/>';
    for (let i = 0; i < 6; i++) s += `<path class="c-fl" style="animation-delay:-${i * .4}s" d="M${120 + i * 30} 400 Q${f1(100 + i * 34 + rr(-20, 20))} ${f1(260 - rr(0, 60))} ${f1(160 + i * 16)} ${f1(120 + rr(0, 60))} Q${f1(200 + rr(-20, 20))} 300 ${170 + i * 26} 400 Z" fill="${['#c0402a', '#f08a4a', '#8a2c1c'][i % 3]}" opacity=".6"/>`;
    s += `<g opacity=".75"><line x1="170" y1="300" x2="230" y2="140" stroke="#1a0a06" stroke-width="7" stroke-linecap="round"/></g>` + glow(230, 140, 50, true);
    return s + vig();
  },
  redcape() {
    let s = sky('dawn') + sea(270) + `<path d="M40 272 L80 220 L160 200 L200 140 L240 196 L330 220 L370 272 Z" fill="#5a2018"/><path d="M180 152 L200 140 L220 152 Z" fill="#3a1410"/>`;
    s += `<path d="M40 272 L370 272 L360 280 L50 280 Z" fill="#8a3a2a"/>`;
    return s + fog(260, 3, .4) + vig();
  },
  fort7() {
    let s = sky('fog') + `<rect y="300" width="400" height="100" fill="#0a161c"/>`;
    s += `<path d="M40 300 L40 150 L80 150 L80 130 L100 130 L100 150 L300 150 L300 130 L320 130 L320 150 L360 150 L360 300 Z" fill="#2a3036"/>`;
    s += `<text x="200" y="262" text-anchor="middle" font-size="110" font-family="serif" font-weight="900" fill="#c9ccc6" opacity=".85">七</text>`;
    s += [100, 300].map(x => `<rect x="${x - 6}" y="120" width="12" height="18" fill="#efe6cf"/>` + glow(x, 128, 22, true, 'c-blink')).join('');
    return s + vig();
  },
  numberqueue() {
    let s = sky('fog') + `<rect y="300" width="400" height="100" fill="#0a161c"/><rect x="300" y="160" width="100" height="140" fill="#2a3036"/>`;
    [[50, 54], [100, 58], [150, 52], [200, 56], [250, 50]].forEach(([x, h], i) => { s += person(x, 304, h, '#1a242a') + `<rect x="${x - 6}" y="${304 - h * .6}" width="12" height="8" fill="#c9ccc6"/>`; });
    return s + fog(280, 5, .8) + vig();
  },
  coldcrater() {
    let s = sky('cold') + stars(50, 160);
    s += `<path d="M0 400 L0 300 L120 200 L160 210 L240 210 L280 200 L400 300 L400 400 Z" fill="#14181c"/><ellipse cx="200" cy="212" rx="44" ry="10" fill="#05080a"/>`;
    s += `<line x1="200" y1="212" x2="200" y2="150" stroke="#3a4048" stroke-width="5"/><rect x="186" y="150" width="28" height="22" fill="#c9ccc6" opacity=".6"/>`;
    return s + vig();
  },
  onehand() {
    let s = '<rect width="400" height="400" fill="#140c0a"/>';
    s += `<rect x="60" y="80" width="280" height="200" fill="#8a2c20" transform="rotate(-3 200 180)"/><path d="M200 120 L150 220 L250 220 Z" fill="#3a1410" transform="rotate(-3 200 180)"/>`;
    s += `<path d="M200 220 q-10 -20 0 -40 t0 -30" stroke="#5a4a44" stroke-width="6" fill="none" transform="rotate(-3 200 180)"/>`;
    s += `<path d="M230 400 L246 300 Q250 270 262 260 L300 250 Q312 252 306 262 L270 280 L280 286 L318 270 Q330 270 322 282 L284 300 L266 400 Z" fill="#c8a080"/>`;
    return s + glow(200, 180, 140, true, 'c-fl') + vig();
  },
  volcanosmoke() {
    let s = sky('dawn') + sea(290) + `<path d="M60 292 L170 160 L230 160 L340 292 Z" fill="#3a1a14"/>`;
    s += `<path class="c-smoke" d="M200 160 q-16 -40 0 -80 t-6 -70" stroke="#e6e0d8" stroke-opacity=".5" stroke-width="22" fill="none" stroke-linecap="round"/>` + glow(200, 160, 50, true, 'c-fl').replaceAll('k-gw', 'k-gr');
    for (let i = 0; i < 12; i++) s += `<circle cx="${f1(rr(120, 280))}" cy="${f1(rr(200, 290))}" r="2" fill="#e0705c"/>`;
    return s + vig();
  },
  fleetfog() {
    let s = sky('fog') + sea(280);
    for (let i = 0; i < 8; i++) { const x = 40 + i * 44, y = 290 - i * 6, k = 1 - i * .08; s += `<g opacity="${f1(1 - i * .1)}" transform="translate(${x} ${y}) scale(${f1(k * .6)})"><path d="M-34 -2 L34 -2 Q30 10 20 12 L-24 12 Q-32 8 -34 -2 Z" fill="${INK}"/><line x1="0" y1="0" x2="0" y2="-56" stroke="${INK}" stroke-width="2"/><path d="M2 -54 Q30 -32 2 -6 Z" fill="#c9ccc6"/><path d="M14 -30 l4 -10" stroke="#b8862e" stroke-width="2"/></g>`; }
    return s + `<g class="c-creep">${fog(250, 7, 1, '', 50)}</g>` + vig();
  },
  rowback() {
    let s = sky('fog') + sea(270) + fog(240, 6, .9);
    s += `<g class="c-sail" style="animation-direction:reverse"><g transform="translate(200 300)"><path d="M-40 -2 L40 -2 Q34 10 24 12 L-28 12 Q-36 8 -40 -2 Z" fill="${INK}"/>${person(-12, -2, 30, INK)}${person(16, -2, 36, INK)}<line x1="22" y1="-16" x2="50" y2="14" stroke="${INK}" stroke-width="2.4"/></g></g>`;
    return s + glow(188, 276, 16, true, 'c-fl') + vig();
  },
  bookmap3() {
    let s = '<rect width="400" height="400" fill="#0c0906"/><path d="M20 80 L196 96 L196 360 L24 340 Z" fill="url(#k-paper)"/><path d="M204 96 L380 80 L376 340 L204 360 Z" fill="url(#k-paper)"/><path d="M196 96 Q200 92 204 96 L204 360 Q200 364 196 360 Z" fill="#6a5636"/>';
    s += `<g fill="#bfa77c" stroke="#3a2c1c" stroke-width="1.1" opacity=".7">${SHAPES.reef(50, 130)}${SHAPES.bell(90, 190)}${SHAPES.bay(60, 260)}${SHAPES.atoll(150, 140)}${SHAPES.lagoon(150, 250)}</g>`;
    s += `<g fill="none" stroke="#3a2c1c" stroke-width="1.4">${[SHAPES.caldera(260, 300), SHAPES.mine(320, 250), SHAPES.forge(250, 220), SHAPES.cape(330, 320)].map((p, i) => p.replaceAll('<path', `<path pathLength="1" class="c-draw" style="animation-delay:${f1(.2 + i * .6)}s"`)).join('')}</g>`;
    s += `<path class="c-draw" style="animation-delay:2.6s" pathLength="1" d="M330 300 C320 220 300 160 290 110" stroke="#7a2c1c" stroke-width="1.6" stroke-dasharray="3 3" fill="none"/>` + `<ellipse cx="290" cy="110" rx="40" ry="24" fill="url(#k-fg)"/>`;
    return s + pen(240, 390, 80, -70, 26) + vig();
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
