// 劇本執行器：逐行播放劇本、處理選項、效果、戰鬥與演出指令
import { checkCond, condText, addItem, addCodex, addMember, removeMember, healAll, gainExp, AXES, displayName, saveSlot } from './state.js';
import { FORMATIONS } from './data.js';

export class Runner {
  constructor(ctx) {
    this.ctx = ctx;
    this.token = 0;
  }

  get g() { return this.ctx.g; }

  stop() { this.token++; this.ctx.ui.cancelWait(); }

  scene(id) { return this.ctx.scenes[id]; }

  async play(sceneId, pc = 0) {
    const my = ++this.token;
    const { ui } = this.ctx;
    ui.cancelWait();
    this.ctx.mode = 'story';
    this.ctx.showStory();
    let scene = this.scene(sceneId);
    if (!scene) { ui.toast(`找不到場景「${sceneId}」`); this.ctx.goHub(); return; }
    const alive = () => my === this.token;

    const jump = target => {
      const s = this.scene(target);
      if (!s) { ui.toast(`找不到場景「${target}」，先回到書齋。`); return false; }
      scene = s; pc = 0;
      return true;
    };

    while (alive()) {
      const g = this.g;
      g.scene = scene.id; g.pc = pc;
      if (pc === 0) {
        g.seen = g.seen || {};
        g.seen[scene.id] = 1;
        if (!scene.id.startsWith('夜話.')) saveSlot(g, 'auto');
      }
      if (pc >= scene.cmds.length) { this.ctx.goHub(); return; }
      const c = scene.cmds[pc];
      try {
        switch (c.t) {
          case 'text':
          case 'say': {
            this.pushLog(c);
            const mode = this.ctx.settings.readMode || 'page';
            let wait = true;
            if (mode === 'page') {
              this.pageLines = (this.pageLines || 0) + 1;
              this.pageChars = (this.pageChars || 0) + Array.from(c.text).length;
              wait = !this.nextIsText(scene, pc + 1) || this.pageLines >= 6 || this.pageChars >= 200;
            }
            ui.pageBreak = false;
            await ui.say({ who: c.who, text: c.text }, { wait, auto: mode === 'auto' });
            if (!alive()) return;
            if (wait) { this.pageLines = 0; this.pageChars = 0; }
            else if (ui.pageBreak) { this.pageLines = 1; this.pageChars = Array.from(c.text).length; }
            pc++;
            break;
          }
          case 'choice': {
            const group = [];
            let j = pc;
            while (j < scene.cmds.length && scene.cmds[j].t === 'choice') group.push(scene.cmds[j++]);
            // 劇情進度（旗標）不符的選項直接隱藏；能力、羈絆等條件不符則顯示為上鎖
            const shown = group.map(ch => {
              const ok = checkCond(g, ch.cond);
              const storyOnly = ch.cond && ch.cond.every(x => x.kind === '旗標');
              return { label: ch.label, enabled: ok, lock: ok ? null : '需要：' + condText(ch.cond), target: ch.target, hidden: !ok && storyOnly, seen: !!(g.seen && g.seen[ch.target]) };
            }).filter(x => !x.hidden);
            if (!shown.length) { ui.toast('沒有可選的選項（劇本條件有誤）', 'bad'); this.ctx.goHub(); return; }
            const idx = await ui.showChoices(shown);
            if (!alive()) return;
            this.pushLog({ t: 'text', text: '▸ ' + shown[idx].label });
            if (!jump(shown[idx].target)) { this.ctx.goHub(); return; }
            break;
          }
          case 'goto':
            if (!jump(c.target)) { this.ctx.goHub(); return; }
            break;
          case 'if':
            if (checkCond(g, c.cond)) { if (!jump(c.target)) { this.ctx.goHub(); return; } }
            else pc++;
            break;
          case 'fx':
            this.effect(c);
            pc++;
            break;
          case 'battle': {
            const canLose = !!(c.out && c.out.敗);
            const r = await this.ctx.battle.start(c.mode, c.id, canLose);
            if (!alive()) return;
            if (r === 'quit') return;
            this.ctx.showStory();
            this.ctx.audio.music(g.loc.music);
            const key = r === 'win' ? '勝' : r === 'lose' ? '敗' : '逃';
            const target = c.out && (c.out[key] || (key === '逃' ? c.out.勝 : null));
            if (target) { if (!jump(target)) { this.ctx.goHub(); return; } }
            else pc++;
            break;
          }
          case 'cmd': {
            const res = await this.command(c);
            if (!alive()) return;
            if (res === 'stop') return;
            if (typeof res === 'string' && res.startsWith('→')) { if (!jump(res.slice(1))) { this.ctx.goHub(); return; } }
            else pc++;
            break;
          }
          default: pc++;
        }
      } catch (err) {
        console.error(err);
        ui.toast('劇本執行錯誤：' + err.message, 'bad');
        pc++;
      }
    }
  }

  // 整頁模式：往後看，下一個「會停下來」的指令是不是一般文字
  nextIsText(scene, pc, depth = 0) {
    const passive = ['地點', '年代', '音樂', '主題', '卷', '提示', '回復', '存檔點', '進度', '開放', '背景', '立繪'];
    for (let i = pc; i < scene.cmds.length; i++) {
      const c = scene.cmds[i];
      if (c.t === 'text' || c.t === 'say') return true;
      if (c.t === 'fx') continue;
      if (c.t === 'cmd' && passive.includes(c.name)) continue;
      if (c.t === 'goto' && depth < 3) {
        const s = this.scene(c.target);
        return s ? this.nextIsText(s, 0, depth + 1) : false;
      }
      return false;
    }
    return false;
  }

  // 目前所在的卷代號，例如「卷一・大員」→「卷一」
  volId() {
    const v = (this.g.loc.vol || '').split('・')[0];
    return /^(序卷|卷)/.test(v) ? v : (this.g.lastVol || '卷一');
  }

  pushLog(c) {
    const g = this.g;
    g.log.push({ who: c.who || null, text: c.text });
    if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
  }

  // ───────── 效果 ─────────
  effect(c) {
    const g = this.g;
    const { ui, audio } = this.ctx;
    const [a0, a1, a2, a3] = c.args;
    const n = (v, d = 1) => (v == null || v === '' ? d : +v);
    switch (c.kind) {
      case '旗標':
        if (c.sign > 0) g.flags[a0] = a1 == null ? 1 : (isNaN(+a1) ? a1 : +a1);
        else delete g.flags[a0];
        break;
      case '羈絆': {
        const v = n(a1) * c.sign;
        g.bonds[a0] = +((g.bonds[a0] || 0) + v).toFixed(1);
        if (v > 0) ui.note(`${displayName(g, a0)} 的羈絆加深了`, 'bond');
        break;
      }
      case '心印': {
        const ax = AXES[a0];
        if (!ax) throw new Error('心印軸名稱錯誤：' + a0);
        g.mind[ax[0]] = Math.max(-100, Math.min(100, g.mind[ax[0]] + n(a1) * c.sign * ax[1]));
        ui.note(`心印微微偏向「${a0}」`, 'mind');
        break;
      }
      case '道具': {
        const cnt = n(a1) * c.sign;
        addItem(g, a0, cnt);
        if (cnt > 0) { ui.note(`取得 ${a0}${cnt > 1 ? ' ×' + cnt : ''}`, 'item'); audio.sfx('item'); }
        break;
      }
      case '錢': {
        g.money = Math.max(0, g.money + n(a0) * c.sign);
        if (c.sign > 0) ui.note(`取得 銀 ${a0}`, 'item');
        break;
      }
      case '經驗': {
        const msgs = [];
        for (const p of g.party) msgs.push(...gainExp(g, g.members[p], n(a0)));
        ui.note(`全隊獲得經驗 ${a0}`);
        msgs.forEach((m, i) => setTimeout(() => ui.note(m, 'level'), 400 * (i + 1)));
        if (msgs.length) audio.sfx('level');
        break;
      }
      case '史卷':
        if (addCodex(g, a0)) ui.note(`史卷新增：${a0.replace(/^妖・/, '')}`, 'codex');
        break;
      case '隊友':
        if (c.sign > 0) {
          const lv = a1 === '等級' ? n(a2) : undefined;
          addMember(g, a0, lv);
          if (a3 === '無提示') break;
          ui.note(`${displayName(g, a0)} 加入了隊伍`, 'bond');
        } else {
          const was = g.party.includes(a0);
          removeMember(g, a0);
          if (was && a1 !== '無提示') ui.note(`${displayName(g, a0)} 離開了隊伍`);
        }
        break;
      case '封靈':
        if (g.spirits.length < 30) { g.spirits.push(a0); ui.note(`${a0} 被封入了硯池`, 'seal'); audio.sfx('seal'); }
        break;
      case '陣法':
        if (!FORMATIONS[a0]) throw new Error('沒有這個陣法：' + a0);
        if (!g.formations.includes(a0)) { g.formations.push(a0); ui.note(`習得陣法「${a0}」`, 'level'); }
        break;
      case '技能': {
        const m = g.members[a0];
        if (m && !m.extraSkills.includes(a1)) { m.extraSkills.push(a1); ui.note(`${displayName(g, a0)} 習得「${a1}」`, 'level'); audio.sfx('level'); }
        break;
      }
      case '補史':
        if (!g.flags['補史.' + a0]) { g.flags['補史.' + a0] = 1; ui.note('史冊上的一行字，恢復了顏色。', 'codex'); }
        break;
      case '回復':
        healAll(g);
        break;
      default:
        throw new Error('不認識的效果：' + c.kind);
    }
  }

  // ───────── 演出與系統指令 ─────────
  async command(c) {
    const g = this.g;
    const { ui, audio } = this.ctx;
    const arg = c.arg;
    switch (c.name) {
      case '地點': g.loc.place = arg; ui.setHeader(g.loc); return;
      case '年代': g.loc.year = arg; ui.setHeader(g.loc); return;
      case '卷': g.loc.vol = arg; if (/^(序卷|卷)/.test(arg)) g.lastVol = arg.split('・')[0]; ui.setHeader(g.loc); return;
      case '主題': g.loc.theme = arg; ui.setTheme(arg); return;
      case '背景': g.loc.bg = arg === '無' ? '' : arg; ui.setBanner(g.loc.bg); return;
      case '插圖': {
        const [name, ...cap] = arg.split(/\s+/);
        await ui.showCG(name, cap.join(' '));
        return;
      }
      case '稱呼': {
        // 劇情中暫時改變角色顯示的名字（例如改名之前）：@稱呼 角色 名字／@稱呼 角色 預設
        const [who, shown] = arg.split(/\s+/);
        g.names = g.names || {};
        if (!shown || shown === '預設') delete g.names[who]; else g.names[who] = shown;
        return;
      }
      case '立繪': {
        const [who, key] = arg.split(/\s+/);
        g.portraits = g.portraits || {};
        if (!key || key === '預設') delete g.portraits[who]; else g.portraits[who] = key;
        return;
      }
      case '音樂': g.loc.music = arg; audio.music(arg); return;
      case '章節': {
        const [t, s] = arg.split('｜');
        ui.clearStory();
        await ui.card(t, s);
        return;
      }
      case '清畫面': ui.clearStory(); return;
      case '提示': ui.note(arg); return;
      case '回復': healAll(g); ui.note('全隊的體與墨都回復了', 'heal'); audio.sfx('heal'); return;
      case '存檔點': saveSlot(g, 'auto'); ui.note('已自動存檔'); return;
      case '教學': await ui.alert('提示', arg.split('／')); return;
      case '取名': {
        const name = await ui.prompt('主角的名字', '請輸入主角的姓名（預設：沈知墨）。對白中會以名字的後兩字稱呼他。', g.player.name);
        g.player.name = name;
        g.player.call = name.length === 3 ? name.slice(1) : name;
        return;
      }
      case '回書齋': {
        if (arg) g.resume[this.volId()] = arg;
        this.ctx.goHub();
        return 'stop';
      }
      case '進度': g.resume[this.volId()] = arg; return;
      case '開放': g.flags['開放.' + arg] = 1; ui.note(`時之書齋：「${arg}」開放了`, 'codex'); return;
      case '卷完': g.flags['卷完.' + arg] = 1; delete g.resume[arg]; return;
      case '商店': await this.ctx.hub.shop(arg); return;
      case '論辯': {
        const r = await this.ctx.debate.start(arg);
        this.ctx.audio.music(g.loc.music);
        const t = c.out && (c.out[r] || (r === '人心' && c.out.說服) || c.out.敗);
        return t ? '→' + t : undefined;
      }
      case '小遊戲': {
        const [kind, id] = arg.split(/\s+/);
        if (!['譯字', '牽星', '識字', '透視'].includes(kind)) throw new Error('不認識的小遊戲：' + kind);
        const r = await this.ctx.translate.start(id);
        const t = c.out && c.out[r];
        return t ? '→' + t : undefined;
      }
      case '書齋': this.ctx.goHub(); return 'stop';
      case '試玩結束':
        if (arg) g.resume[this.volId()] = arg;
        await this.ctx.hub.demoEnd();
        return 'stop';
      default:
        throw new Error('不認識的指令：@' + c.name);
    }
  }
}
