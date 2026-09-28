// 遊戲入口
import { parseScript } from './script.js';
import { newGame, loadSlot, slotInfo, loadSettings, saveSettings, healAll, saveSlot } from './state.js';
import { CHARACTERS } from './data.js';
import { UI, el } from './ui.js';
import { Audio } from './audio.js';
import { Battle } from './battle.js';
import { Debate, Translate } from './debate.js';
import { Runner } from './runner.js';
import { Hub } from './hub.js';

export const VERSION = '試玩版 v0.1';
const CONTENT = ['content/序卷.txt', 'content/卷一_大員.txt', 'content/夜話.txt'];

const $ = id => document.getElementById(id);

const ctx = {
  g: null,
  settings: loadSettings(),
  scenes: {},
  mode: 'title',
  saveSettings() { saveSettings(ctx.settings); },
};
ctx.ui = new UI(ctx);
ctx.audio = new Audio(ctx);
ctx.battle = new Battle(ctx);
ctx.debate = new Debate(ctx);
ctx.translate = new Translate(ctx);
ctx.runner = new Runner(ctx);
ctx.hub = new Hub(ctx);

ctx.showStory = () => {
  document.body.dataset.mode = 'story';
  ctx.mode = 'story';
};

ctx.goHub = () => {
  ctx.runner.stop();
  const g = ctx.g;
  ctx.mode = 'hub';
  document.body.dataset.mode = 'hub';
  g.scene = null; g.pc = 0;
  g.loc = { ...g.loc, vol: '時之書齋', place: '', year: '', theme: 'hub', music: '書齋' };
  // 在地夥伴留在他們的時代
  g.party = g.party.filter(n => n === '知墨' || n === '蘅' || (ctx.g.members[n] && isSpirit(n)));
  healAll(g);
  ctx.ui.setHeader(g.loc);
  ctx.ui.setTheme('hub');
  ctx.audio.music('書齋');
  ctx.hub.render();
  saveSlot(g, 'auto');
};

function isSpirit(n) { return !!(CHARACTERS[n] && CHARACTERS[n].spirit); }

ctx.enterVolume = (v, scene) => {
  const g = ctx.g;
  g.loc = { vol: `${v.id}・${v.name}`, place: '', year: '', theme: v.theme, music: '' };
  ctx.ui.setTheme(v.theme);
  ctx.ui.setHeader(g.loc);
  ctx.ui.clearStory();
  ctx.runner.play(scene);
};

ctx.loadGame = g => {
  closeAllSheets();
  ctx.g = g;
  $('title').classList.remove('open');
  ctx.ui.clearStory();
  if (!g.scene || !ctx.scenes[g.scene]) { ctx.goHub(); return; }
  ctx.ui.setTheme(g.loc.theme);
  ctx.ui.setHeader(g.loc);
  ctx.audio.music(g.loc.music);
  (g.log || []).slice(-8).forEach(l => ctx.ui.addStatic(l));
  if (g.log && g.log.length) ctx.ui.story.appendChild(el('div', { class: 'line sys' }, '— 讀取存檔 —'));
  ctx.runner.play(g.scene, g.pc);
};

ctx.loadFrom = slot => {
  const g = loadSlot(slot);
  if (!g) { ctx.ui.toast('這個存檔無法讀取', 'bad'); return; }
  ctx.loadGame(g);
};

ctx.loadAuto = () => ctx.loadFrom('auto');

ctx.toTitle = () => {
  ctx.runner.stop();
  closeAllSheets();
  ['battle', 'debate', 'minigame'].forEach(id => $(id).classList.remove('open'));
  ctx.mode = 'title';
  document.body.dataset.mode = 'title';
  ctx.audio.music('書齋');
  showTitle();
};

function closeAllSheets() { document.querySelectorAll('.sheet').forEach(s => s.remove()); }

async function newJourney() {
  if (slotInfo('auto') && !(await ctx.ui.confirm('開始新的旅程會覆蓋自動存檔（手動存檔不受影響）。確定嗎？'))) return;
  ctx.g = newGame();
  $('title').classList.remove('open');
  ctx.ui.clearStory();
  ctx.runner.play('序.開始');
}

function showTitle() {
  const t = $('title');
  t.innerHTML = '';
  const auto = slotInfo('auto');
  t.append(
    el('div', { class: 't-seal' }, '硯'),
    el('h1', { class: 't-name' }, '千秋硯'),
    el('p', { class: 't-sub' }, '紙會老，字會淡，可是寫字的人曾經在這裡。'),
    el('div', { class: 't-btns' },
      auto ? el('button', { class: 'btn primary', onclick: () => ctx.loadFrom('auto') }, '繼續旅程') : null,
      el('button', { class: 'btn' + (auto ? '' : ' primary'), onclick: newJourney }, '新的旅程'),
      el('button', { class: 'btn', onclick: () => { ctx.g = ctx.g || newGame(); ctx.hub.saveMenu(); } }, '讀取存檔'),
      el('button', { class: 'btn', onclick: () => ctx.hub.settings() }, '設定')),
    el('p', { class: 't-ver' }, VERSION + '・序卷＋卷一（回一、回二）'));
  t.classList.add('open');
}

// 底部導覽列
function bindNav() {
  const need = fn => () => { if (!ctx.g || ctx.mode === 'title') return; ctx.audio.sfx('tap'); fn(); };
  $('nav-party').onclick = need(() => ctx.hub.party());
  $('nav-items').onclick = need(() => ctx.hub.items());
  $('nav-codex').onclick = need(() => ctx.hub.codex());
  $('nav-spirit').onclick = need(() => ctx.hub.spirits());
  $('nav-sys').onclick = need(() => ctx.hub.system());
  $('btn-menu').onclick = need(() => ctx.hub.system());
}

async function loadContent() {
  for (const file of CONTENT) {
    const res = await fetch(file, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`無法載入 ${file}`);
    const { scenes } = parseScript(await res.text(), file);
    for (const id in scenes) {
      if (ctx.scenes[id]) throw new Error(`場景「${id}」在多個檔案中重複`);
      ctx.scenes[id] = scenes[id];
    }
  }
}

async function boot() {
  ctx.ui.applySettings();
  bindNav();
  // 第一次觸碰時啟動音訊（瀏覽器規定）
  const unlock = () => { if (ctx.settings.sound) ctx.audio.unlock(); };
  document.addEventListener('pointerdown', unlock, { once: false });
  try {
    await loadContent();
  } catch (e) {
    $('title').innerHTML = '';
    $('title').append(el('h1', { class: 't-name' }, '千秋硯'), el('p', { class: 't-sub' }, '載入失敗：' + e.message), el('p', { class: 't-ver' }, '請透過網址（例如 GitHub Pages）開啟本遊戲，而不是直接開啟檔案。'));
    $('title').classList.add('open');
    return;
  }
  document.body.dataset.mode = 'title';
  showTitle();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.__qqy = ctx; // 方便除錯
}

boot();
