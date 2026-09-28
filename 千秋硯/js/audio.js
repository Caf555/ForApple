// 音效與氛圍音樂：全部以 Web Audio 即時合成，不需要音檔
const PENTA = [0, 2, 4, 7, 9]; // 五聲音階

export class Audio {
  constructor(ctx) {
    this.ctx = ctx;
    this.ac = null;
    this.master = null;
    this.current = null;
    this.want = null;
  }

  get on() { return this.ctx.settings.sound; }

  unlock() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ac = new AC();
    this.master = this.ac.createGain();
    this.master.gain.value = this.ctx.settings.volume;
    this.master.connect(this.ac.destination);
    this.noiseBuf = this.makeNoise();
    if (this.want) this.music(this.want, true);
  }

  setVolume(v) { if (this.master) this.master.gain.value = v; }

  makeNoise() {
    const len = this.ac.sampleRate * 2;
    const b = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return b;
  }

  note(freq, t, dur, type = 'sine', gain = 0.12, dest) {
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise(t, dur, freq = 800, gain = 0.2, dest) {
    const s = this.ac.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  sfx(kind) {
    if (!this.on || !this.ac) return;
    const t = this.ac.currentTime;
    switch (kind) {
      case 'tap': this.note(1200, t, 0.05, 'sine', 0.03); break;
      case 'hit': this.noise(t, 0.12, 1400, 0.3); this.note(110, t, 0.12, 'triangle', 0.15); break;
      case 'crit': this.noise(t, 0.2, 2200, 0.35); this.note(90, t, 0.2, 'square', 0.08); break;
      case 'magic': { const o = this.ac.createOscillator(); const g = this.ac.createGain(); o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.3); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.4); break; }
      case 'heal': [0, 4, 7, 12].forEach((s, i) => this.note(523 * Math.pow(2, s / 12), t + i * 0.07, 0.3, 'sine', 0.08)); break;
      case 'seal': { const o = this.ac.createOscillator(); const g = this.ac.createGain(); o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.6); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.8); this.note(1568, t + 0.6, 1.2, 'sine', 0.06); break; }
      case 'fail': this.note(220, t, 0.25, 'triangle', 0.1); this.note(196, t + 0.12, 0.3, 'triangle', 0.1); break;
      case 'level': [0, 2, 4, 7, 9, 12].forEach((s, i) => this.note(440 * Math.pow(2, s / 12), t + i * 0.06, 0.4, 'triangle', 0.07)); break;
      case 'card': this.note(196, t, 2.5, 'sine', 0.08); this.note(293.7, t + 0.05, 2.5, 'sine', 0.05); break;
      case 'item': this.note(880, t, 0.15, 'sine', 0.06); this.note(1318, t + 0.08, 0.25, 'sine', 0.06); break;
      case 'win': [0, 4, 7, 12, 16].forEach((s, i) => this.note(392 * Math.pow(2, s / 12), t + i * 0.09, 0.5, 'triangle', 0.07)); break;
    }
  }

  music(name, force) {
    this.want = name;
    if (!this.ac) return;
    if (!force && this.current && this.current.name === name) return;
    this.stopMusic();
    if (!this.on || !name || name === '無') return;
    const bus = this.ac.createGain();
    bus.gain.value = 0.0001;
    bus.connect(this.master);
    bus.gain.exponentialRampToValueAtTime(0.9, this.ac.currentTime + 2);
    const cur = { name, bus, timers: [], nodes: [] };
    this.current = cur;
    const loop = (fn, ms) => { const tick = () => { if (this.current !== cur) return; fn(); cur.timers.push(setTimeout(tick, ms())); }; tick(); };
    const pad = (freqs, gain) => freqs.forEach(f => {
      const o = this.ac.createOscillator(); const g = this.ac.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = gain;
      const lfo = this.ac.createOscillator(); const lg = this.ac.createGain();
      lfo.frequency.value = 0.07 + Math.random() * 0.05; lg.gain.value = gain * 0.6;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(bus); o.start(); lfo.start();
      cur.nodes.push(o, lfo);
    });
    const waves = (gain) => {
      const s = this.ac.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = this.ac.createGain(); g.gain.value = gain;
      const lfo = this.ac.createOscillator(); const lg = this.ac.createGain();
      lfo.frequency.value = 0.12; lg.gain.value = gain * 0.9;
      lfo.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(bus); s.start(); lfo.start();
      cur.nodes.push(s, lfo);
    };
    const pluck = (base, gain, dur = 1.6) => {
      const s = PENTA[Math.floor(Math.random() * 5)] + 12 * Math.floor(Math.random() * 2);
      this.note(base * Math.pow(2, s / 12), this.ac.currentTime, dur, 'triangle', gain, bus);
    };
    switch (name) {
      case '府城夜':
        pad([110, 164.8], 0.03);
        loop(() => pluck(329.6, 0.035, 2.2), () => 2600 + Math.random() * 3000);
        break;
      case '海潮':
        waves(0.2); pad([98, 146.8], 0.02);
        loop(() => pluck(392, 0.025, 2.5), () => 4000 + Math.random() * 4000);
        break;
      case '書齋':
        pad([130.8, 196, 261.6], 0.025);
        loop(() => pluck(523.3, 0.03, 3), () => 3500 + Math.random() * 3500);
        break;
      case '緊張':
        pad([73.4, 77.8], 0.04);
        loop(() => { const t = this.ac.currentTime; this.note(55, t, 0.25, 'sine', 0.12, bus); this.note(55, t + 0.3, 0.25, 'sine', 0.08, bus); }, () => 1400);
        break;
      case '哀歌':
        pad([110, 130.8, 164.8], 0.025);
        loop(() => pluck(220, 0.04, 3.5), () => 2400 + Math.random() * 1500);
        break;
      case '戰鬥': {
        let beat = 0;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 4 === 0) this.noise(t, 0.15, 150, 0.25, bus);
          if (beat % 4 === 2) this.noise(t, 0.08, 2500, 0.08, bus);
          if (beat % 2 === 0) pluck(293.7, 0.05, 0.5);
          if (beat % 8 === 0) this.note(73.4, t, 1.2, 'sawtooth', 0.025, bus);
          beat++;
        }, () => 280);
        break;
      }
      case '首領': {
        let beat = 0;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 2 === 0) this.noise(t, 0.18, 120, 0.3, bus);
          if (beat % 4 === 3) this.noise(t, 0.08, 3000, 0.1, bus);
          pluck(beat % 8 < 4 ? 246.9 : 220, 0.045, 0.4);
          if (beat % 8 === 0) this.note(61.7, t, 1.8, 'sawtooth', 0.035, bus);
          beat++;
        }, () => 230);
        break;
      }
      default:
        pad([130.8, 196], 0.02);
    }
  }

  stopMusic() {
    const cur = this.current;
    if (!cur) return;
    this.current = null;
    cur.timers.forEach(clearTimeout);
    try {
      cur.bus.gain.cancelScheduledValues(this.ac.currentTime);
      cur.bus.gain.setValueAtTime(cur.bus.gain.value || 0.5, this.ac.currentTime);
      cur.bus.gain.exponentialRampToValueAtTime(0.0001, this.ac.currentTime + 0.8);
    } catch (e) { /* 忽略 */ }
    setTimeout(() => { cur.nodes.forEach(n => { try { n.stop(); } catch (e) { /* 已停止 */ } }); cur.bus.disconnect(); }, 1000);
  }

  // 朗讀模式
  speak(text, who) {
    if (!this.ctx.settings.tts || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[「」『』]/g, ''));
    u.lang = 'zh-TW';
    u.rate = 1.05;
    u.pitch = who === '蘅' || who === '蒂娃' ? 1.25 : who ? 0.9 : 1;
    speechSynthesis.speak(u);
  }
}
