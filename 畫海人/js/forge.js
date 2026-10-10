// 打造小遊戲：鐵匠的「打鐵」、船塢的「釘船板」
// 打鐵：指針在刻度尺上來回跑，停在金色區按「敲」；3 下中 2 下就成功
// 釘船板：鐵鎚像鐘擺一樣擺，擺到亮著的釘子上方按「釘」；4 根中 3 根就成功
// 回傳 Promise<{ ok, perfect }>；外框上掛著 solve()：只給自動試玩機器人用
import { el } from './ui.js';
import { frame } from './puzzle.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const byDiff = (ctx, arr) => arr[{ 悠閒: 0, 標準: 1, 困難: 2 }[ctx.g && ctx.g.diff] ?? 1];

// tier：0～1，越後期的東西越難；retry：再試一次，師傅幫你扶著（金色區比較寬）
export function playForge(ctx, kind, { name, tier = 0, retry = false }) {
  return (kind === '船塢' ? nailing : smithing)(ctx, name, tier, retry);
}

function done(f, ok, perfect, line, res) {
  f.msg.textContent = line;
  f.btns.append(el('button', { class: 'btn primary', onclick: () => { f.box.remove(); res({ ok, perfect }); } }, '繼續'));
}

// ═════════ 打鐵 ═════════
function smithing(ctx, name, tier, retry) {
  return new Promise(res => {
    const N = 3, NEED = 2;
    const width = byDiff(ctx, [28, 22, 18]) - tier * 6 + (retry ? 6 : 0);   // 金色區寬度（%）
    const speed = byDiff(ctx, [55, 65, 80]) + tier * 30;                    // 指針速度（%／秒）
    const f = frame(`打鐵・${name}`, `石伯：「鐵燒紅了。指針跑到金色的地方，就按「敲」！」敲 ${N} 下，中 ${NEED} 下以上就打得成。${retry ? '這次石伯幫你扶著，金色的地方寬一點。' : ''}`);
    const metal = el('div', { class: 'fg-metal' });
    const anvil = el('div', { class: 'fg-anvil' }, metal);
    const zone = el('div', { class: 'fg-zone' });
    const needle = el('div', { class: 'fg-needle' });
    const gauge = el('div', { class: 'fg-gauge' }, zone, needle);
    const marks = el('div', { class: 'fg-marks' }, ...Array.from({ length: N }, () => el('span', {}, '○')));
    const btn = el('button', { class: 'btn primary pz-hit', onclick: () => tap() }, '敲！');
    f.stage.append(anvil, gauge, marks, btn);
    let pos = 0, dir = 1, z0 = 0, n = 0, good = 0, over = false, pause = false, last = performance.now();
    const place = () => { z0 = 8 + Math.random() * (84 - width); zone.style.left = z0 + '%'; zone.style.width = width + '%'; };
    const status = () => { f.info.textContent = `敲了 ${n}／${N} 下，中了 ${good} 下`; };
    place(); status();
    const tick = t => {
      if (over || !f.box.isConnected) return;
      const dt = Math.min(50, t - last) / 1000; last = t;
      if (!pause) {
        pos += dir * speed * dt;
        if (pos >= 100) { pos = 100; dir = -1; } else if (pos <= 0) { pos = 0; dir = 1; }
        needle.style.left = pos + '%';
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const tap = async () => {
      if (over || pause) return;
      const hit = pos >= z0 && pos <= z0 + width;
      marks.children[n].textContent = hit ? '●' : '×';
      marks.children[n].className = hit ? 'hit' : 'miss';
      n++; if (hit) good++;
      metal.className = 'fg-metal s' + n + (hit ? '' : ' bad');
      anvil.classList.remove('bang'); void anvil.offsetWidth; anvil.classList.add('bang');
      ctx.audio.sfx(hit ? 'tap' : 'fail');
      f.msg.textContent = hit ? '鏘！敲得正好。' : '敲歪了，火花噴了出來。';
      status();
      if (n >= N) {
        over = true; btn.remove();
        const ok = good >= NEED, perfect = good === N;
        ctx.audio.sfx(ok ? 'win' : 'fail');
        return done(f, ok, perfect, ok ? (perfect ? `三下全中！「${name}」打得又漂亮又結實。石伯：「精工！用剩的素材還你。」` : `「${name}」打好了！`) : `只中了 ${good} 下……這塊鐵打壞了。`, res);
      }
      pause = true; await wait(450); pause = false; place();
    };
    f.box.solve = async () => { while (!over) { if (!pause && pos > z0 + width * 0.3 && pos < z0 + width * 0.7) await tap(); await wait(8); } };
  });
}

// ═════════ 釘船板 ═════════
function nailing(ctx, name, tier, retry) {
  return new Promise(res => {
    const N = 4, NEED = 3, SPOTS = [18, 39, 61, 82];
    const width = byDiff(ctx, [20, 16, 14]) - tier * 2 + (retry ? 4 : 0);    // 釘子周圍算中的範圍（%）
    const period = (byDiff(ctx, [3400, 3000, 2600]) - tier * 300) * (retry ? 1.15 : 1);   // 鐘擺來回一次（毫秒）
    const f = frame(`釘船板・${name}`, `大副：「鐵鎚擺到亮著的釘子上面，就按「釘」！」釘 ${N} 根，中 ${NEED} 根以上就改造成功。${retry ? '這次大副幫你扶著，鐵鎚擺得慢一點。' : ''}`);
    const nails = SPOTS.map(x => el('div', { class: 'ng-nail', style: `left:${x}%` }));
    const hammer = el('div', { class: 'ng-hammer' }, '🔨');
    const board = el('div', { class: 'ng-board' }, ...nails, hammer);
    const btn = el('button', { class: 'btn primary pz-hit', onclick: () => tap() }, '釘！');
    f.stage.append(board, btn);
    let x = 50, n = 0, good = 0, over = false, pause = false, t0 = performance.now();
    const status = () => {
      f.info.textContent = `釘了 ${n}／${N} 根，中了 ${good} 根`;
      nails.forEach((e, i) => e.classList.toggle('now', i === n));
    };
    status();
    const tick = t => {
      if (over || !f.box.isConnected) return;
      if (!pause) {
        const ph = ((t - t0) % period) / period * Math.PI * 2;
        x = 50 + 44 * Math.sin(ph);
        hammer.style.left = x + '%';
        hammer.style.transform = `translateX(-50%) rotate(${-25 * Math.cos(ph)}deg)`;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const tap = async () => {
      if (over || pause) return;
      const hit = Math.abs(x - SPOTS[n]) <= width / 2;
      nails[n].classList.remove('now'); nails[n].classList.add(hit ? 'hit' : 'miss');
      n++; if (hit) good++;
      board.classList.remove('bang'); void board.offsetWidth; board.classList.add('bang');
      ctx.audio.sfx(hit ? 'tap' : 'fail');
      f.msg.textContent = hit ? '咚！釘子整根沒進木頭裡。' : '釘歪了，釘子彎掉了。';
      status();
      if (n >= N) {
        over = true; btn.remove();
        const ok = good >= NEED, perfect = good === N;
        ctx.audio.sfx(ok ? 'win' : 'fail');
        return done(f, ok, perfect, ok ? (perfect ? `四根全中！大副：「漂亮。剩下的料還你。」「${name}」改造好了。` : `「${name}」改造好了！`) : `只中了 ${good} 根……船板裂開了。`, res);
      }
      pause = true; await wait(450); t0 = performance.now() - Math.random() * period; pause = false;
    };
    f.box.solve = async () => { while (!over) { if (!pause && Math.abs(x - SPOTS[n]) <= width / 4) await tap(); await wait(8); } };
  });
}
