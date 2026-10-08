// 聲音：全部由程式即時合成（海浪、霧中的低語、筆畫聲、戰鬥）
export class Audio {
  constructor(ctx) { this.ctx = ctx; this.ac = null; this.cur = null; this.want = null; }
  get on() { return this.ctx.settings.sound; }

  unlock() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ac = new AC();
    this.master = this.ac.createGain(); this.master.gain.value = 0.6; this.master.connect(this.ac.destination);
    const len = this.ac.sampleRate * 2, b = this.ac.createBuffer(1, len, this.ac.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    this.noiseBuf = b;
    if (this.want) this.music(this.want, true);
  }

  note(f, t, dur, type = 'sine', gain = 0.1, dest) {
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(t, dur, freq = 800, gain = 0.2, dest, type = 'bandpass') {
    const s = this.ac.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = this.ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t); s.stop(t + dur + 0.05);
  }

  sfx(k) {
    if (!this.on || !this.ac) return;
    const t = this.ac.currentTime;
    switch (k) {
      case 'tap': this.note(1100, t, 0.05, 'sine', 0.03); break;
      case 'step': this.noise(t, 0.12, 400, 0.08); break;
      case 'pen': this.noise(t, 0.18, 2600, 0.06); this.noise(t + 0.09, 0.14, 1900, 0.04); break;
      case 'whisper': { this.noise(t, 1.2, 900, 0.05); this.note(220, t, 1.2, 'sine', 0.02); this.note(233, t, 1.2, 'sine', 0.02); break; }
      case 'hit': this.noise(t, 0.12, 1400, 0.28); this.note(110, t, 0.12, 'triangle', 0.14); break;
      case 'crit': this.noise(t, 0.2, 2400, 0.32); this.note(90, t, 0.2, 'square', 0.07); break;
      case 'magic': { const o = this.ac.createOscillator(), g = this.ac.createGain(); o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.3); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.4); break; }
      case 'heal': [0, 4, 7, 12].forEach((s, i) => this.note(523 * 2 ** (s / 12), t + i * 0.07, 0.3, 'sine', 0.07)); break;
      case 'item': this.note(880, t, 0.15, 'sine', 0.06); this.note(1318, t + 0.08, 0.25, 'sine', 0.06); break;
      case 'fail': this.note(220, t, 0.25, 'triangle', 0.09); this.note(196, t + 0.12, 0.3, 'triangle', 0.09); break;
      case 'win': [0, 3, 7, 10, 12].forEach((s, i) => this.note(392 * 2 ** (s / 12), t + i * 0.09, 0.5, 'triangle', 0.06)); break;
      case 'level': [0, 2, 4, 7, 9, 12].forEach((s, i) => this.note(440 * 2 ** (s / 12), t + i * 0.06, 0.4, 'triangle', 0.06)); break;
      case 'boss': this.note(55, t, 1.6, 'sawtooth', 0.05); this.note(82.4, t, 1.6, 'sine', 0.1); this.noise(t, 0.6, 120, 0.25); break;
      case 'tide': this.noise(t, 1.2, 500, 0.2, null, 'lowpass'); break;
      case 'down': [12, 7, 3, 0].forEach((s, i) => this.note(330 * 2 ** (s / 12), t + i * 0.06, 0.25, 'triangle', 0.05)); break;
    }
  }

  // 小遊戲的音階：第 i 個音（五聲音階）
  tone(i) {
    if (!this.on || !this.ac) return;
    const f = 440 * 2 ** ([0, 2, 4, 7, 9, 12, 14][i % 7] / 12);
    this.note(f, this.ac.currentTime, 0.4, 'sine', 0.08);
  }

  music(name, force) {
    this.want = name;
    if (!this.ac) return;
    if (!force && this.cur && this.cur.name === name) return;
    this.stop();
    if (!this.on || !name) return;
    const bus = this.ac.createGain(); bus.gain.value = 0.0001; bus.connect(this.master);
    bus.gain.exponentialRampToValueAtTime(0.8, this.ac.currentTime + 2);
    const cur = { name, bus, timers: [], nodes: [] };
    this.cur = cur;
    const loop = (fn, ms) => { const tick = () => { if (this.cur !== cur) return; fn(); cur.timers.push(setTimeout(tick, ms())); }; tick(); };
    const pad = (fs, gain) => fs.forEach(f => { const o = this.ac.createOscillator(), g = this.ac.createGain(), l = this.ac.createOscillator(), lg = this.ac.createGain(); o.frequency.value = f; g.gain.value = gain; l.frequency.value = 0.06 + Math.random() * 0.05; lg.gain.value = gain * 0.6; l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(bus); o.start(); l.start(); cur.nodes.push(o, l); });
    const sea = gain => { const s = this.ac.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 480; const g = this.ac.createGain(); g.gain.value = gain; const l = this.ac.createOscillator(), lg = this.ac.createGain(); l.frequency.value = 0.11; lg.gain.value = gain * 0.9; l.connect(lg); lg.connect(g.gain); s.connect(f); f.connect(g); g.connect(bus); s.start(); l.start(); cur.nodes.push(s, l); };
    const scale = [220, 246.9, 261.6, 293.7, 329.6, 349.2, 392, 440]; // A 小調：冷冷的、神祕的
    let beat = 0, idx = 3;
    switch (name) {
      case '標題': sea(0.12); pad([110, 164.8], 0.02);
        loop(() => { idx = Math.max(0, Math.min(7, idx + [-1, 1, -2, 2, 0][Math.floor(Math.random() * 5)])); this.note(scale[idx] * 2, this.ac.currentTime, 2.4, 'sine', 0.02, bus); }, () => 1800 + Math.random() * 1600); break;
      case '港口': sea(0.1); pad([130.8, 196], 0.018);
        loop(() => { idx = Math.max(0, Math.min(7, idx + [-1, 1, 0][Math.floor(Math.random() * 3)])); this.note(scale[idx] * 2, this.ac.currentTime, 1.4, 'triangle', 0.02, bus); }, () => 900 + Math.random() * 700); break;
      case '島': sea(0.08); pad([110, 116.5], 0.014);
        loop(() => { if (beat++ % 3 === 0) { idx = Math.max(0, Math.min(7, idx + [-1, 1, -2, 0][Math.floor(Math.random() * 4)])); this.note(scale[idx], this.ac.currentTime, 3, 'sine', 0.018, bus); } }, () => 900); break;
      case '戰鬥':
        loop(() => { const t = this.ac.currentTime; if (beat % 4 === 0) this.noise(t, 0.15, 150, 0.22, bus); if (beat % 4 === 2) this.noise(t, 0.08, 2600, 0.07, bus); if (beat % 2 === 0) this.note(scale[[0, 2, 4, 3][(beat / 2) % 4]] , t, 0.4, 'triangle', 0.04, bus); if (beat % 8 === 0) this.note(55, t, 1.2, 'sawtooth', 0.022, bus); beat++; }, () => 270); break;
      case '首領':
        loop(() => { const t = this.ac.currentTime; if (beat % 2 === 0) this.noise(t, 0.18, 120, 0.28, bus); this.note(beat % 8 < 4 ? 233.1 : 220, t, 0.35, 'triangle', 0.04, bus); if (beat % 8 === 0) this.note(58.3, t, 1.8, 'sawtooth', 0.03, bus); beat++; }, () => 230); break;
    }
  }

  stop() {
    const c = this.cur; if (!c) return; this.cur = null;
    c.timers.forEach(clearTimeout);
    try { c.bus.gain.cancelScheduledValues(this.ac.currentTime); c.bus.gain.setValueAtTime(c.bus.gain.value || 0.5, this.ac.currentTime); c.bus.gain.exponentialRampToValueAtTime(0.0001, this.ac.currentTime + 0.8); } catch (e) { /* 忽略 */ }
    setTimeout(() => { c.nodes.forEach(n => { try { n.stop(); } catch (e) { /* 已停止 */ } }); c.bus.disconnect(); }, 1000);
  }
}
