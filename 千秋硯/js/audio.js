// 音效與氛圍音樂：全部以 Web Audio 即時合成，不需要音檔
const PENTA = [0, 2, 4, 7, 9]; // 五聲音階
// 蘅的主題：一小段固定的旋律（[頻率, 拍數]，0 是休止）。在書齋、夜話、結局反覆出現
const HENG = [
  [440, 1], [523.3, 1], [587.3, 2], [659.3, 1], [587.3, 1], [523.3, 2], [440, 1], [392, 1], [440, 3], [0, 1],
  [587.3, 1], [659.3, 1], [784, 2], [659.3, 1], [587.3, 1], [523.3, 1], [440, 1], [587.3, 4], [0, 2],
];

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
    if (this.wantAmb) this.ambience(this.wantAmb);
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
      // 屬性打擊聲：疊在一般的打擊聲上面
      case 'el-金': this.note(2093, t, 0.35, 'square', 0.025); this.note(3136, t + 0.01, 0.25, 'sine', 0.03); break;
      case 'el-木': this.note(330, t, 0.08, 'triangle', 0.12); this.noise(t, 0.06, 900, 0.12); break;
      case 'el-水': { const o = this.ac.createOscillator(); const g = this.ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.18); g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.25); this.noise(t, 0.25, 600, 0.08); break; }
      case 'el-火': [0, 0.05, 0.11, 0.16].forEach(d => this.noise(t + d, 0.07, 3000 + Math.random() * 2000, 0.12)); this.noise(t, 0.35, 300, 0.1); break;
      case 'el-土': this.note(65, t, 0.3, 'sine', 0.22); this.noise(t, 0.2, 180, 0.2); break;
      case 'el-陰': this.note(155, t, 0.5, 'sine', 0.06); this.note(164.8, t, 0.5, 'sine', 0.06); break;
      case 'el-陽': [0, 7, 12].forEach((s2, i) => this.note(1046 * Math.pow(2, s2 / 12), t + i * 0.03, 0.4, 'sine', 0.03)); break;
      // 敵人倒下、首領的重音、蓄力、打斷
      case 'down': [12, 7, 3, 0].forEach((s2, i) => this.note(330 * Math.pow(2, s2 / 12), t + i * 0.06, 0.25, 'triangle', 0.05)); this.noise(t + 0.2, 0.4, 500, 0.06); break;
      case 'boss': this.note(55, t, 1.6, 'sawtooth', 0.05); this.note(82.4, t, 1.6, 'sine', 0.1); this.note(110, t + 0.02, 1.4, 'sine', 0.06); this.noise(t, 0.6, 120, 0.25); break;
      case 'charge': { const o = this.ac.createOscillator(); const g = this.ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(320, t + 1.1); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 1.25); break; }
      case 'break': this.noise(t, 0.25, 2500, 0.3); this.note(1568, t, 0.15, 'square', 0.04); this.note(784, t + 0.08, 0.3, 'triangle', 0.08); break;
      // 研墨：沙、沙、沙
      case 'ink': [0, 0.42, 0.84].forEach(d => { this.noise(t + d, 0.34, 1800, 0.07); this.noise(t + d + 0.05, 0.28, 700, 0.05); }); break;
      case 'tick': this.note(1760, t, 0.03, 'square', 0.03); break;
      case 'good': this.note(988, t, 0.12, 'sine', 0.06); this.note(1319, t + 0.06, 0.18, 'sine', 0.05); break;
    }
  }

  // 電碼的電鍵：按住時響，放開就停
  keyOn() {
    if (!this.on || !this.ac || this.keyOsc) return;
    const o = this.ac.createOscillator(); const g = this.ac.createGain();
    o.type = 'sine'; o.frequency.value = 680; g.gain.value = 0.06;
    o.connect(g); g.connect(this.master); o.start();
    this.keyOsc = o;
  }
  keyOff() { if (this.keyOsc) { try { this.keyOsc.stop(); } catch (e) { /* 已停止 */ } this.keyOsc = null; } }

  // 把蘅的主題吹一遍（像笛子，底下一個很淡的低八度）
  motif(bus, beat = 0.62, gain = 0.03, from = 0, to = HENG.length) {
    let t = this.ac.currentTime + 0.1;
    for (const [f, n] of HENG.slice(from, to)) {
      if (f) { this.note(f, t, n * beat * 1.15, 'sine', gain, bus); this.note(f * 2, t, n * beat * 0.6, 'sine', gain * 0.12, bus); this.note(f / 2, t, n * beat, 'triangle', gain * 0.25, bus); }
      t += n * beat;
    }
    return HENG.slice(from, to).reduce((s, [, n]) => s + n, 0) * beat;
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
      case '書齋': {
        pad([130.8, 196, 261.6], 0.025);
        // 大多是零星的撥弦；偶爾，會飄出蘅的主題的前半段
        let n = 0;
        loop(() => { if (n++ % 9 === 4) this.motif(bus, 0.7, 0.018, 0, 10); else pluck(523.3, 0.03, 3); }, () => (n % 9 === 5 ? 9000 : 3500 + Math.random() * 3500));
        break;
      }
      case '蘅': {
        pad([146.8, 220, 293.7], 0.018);
        loop(() => this.motif(bus, 0.62, 0.032), () => 28 * 620 + 3000);
        break;
      }
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
      case '殷商': {
        // 低沉的鼓、偶爾一聲像石磬或銅鐃的長音
        pad([98, 146.8], 0.022);
        let beat = 0;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 4 === 0) this.noise(t, 0.3, 90, 0.22, bus);
          if (beat % 8 === 6) this.noise(t, 0.15, 110, 0.12, bus);
          if (beat % 16 === 8) { this.note(587.3, t, 3.5, 'sine', 0.035, bus); this.note(880, t, 2.5, 'sine', 0.012, bus); }
          if (Math.random() < 0.18) pluck(293.7, 0.03, 2);
          beat++;
        }, () => 520);
        break;
      }
      case '阿瑪納': {
        // 豎琴般的分解和弦，加上叉鈴（sistrum）細細的沙沙聲
        pad([110, 164.8], 0.02);
        const harp = [220, 246.9, 277.2, 329.6, 370, 440, 493.9];
        let beat = 0;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 2 === 0) this.note(harp[(beat / 2) % harp.length], t, 2.4, 'triangle', 0.03, bus);
          if (beat % 8 === 4) { this.noise(t, 0.09, 5000, 0.05, bus); this.noise(t + 0.12, 0.07, 5000, 0.035, bus); }
          if (beat % 16 === 0) this.note(110, t, 3, 'sine', 0.05, bus);
          beat++;
        }, () => 430);
        break;
      }
      case '雅典': {
        // 雙管笛（aulos）般的長音旋律，配上七弦琴的撥奏
        pad([146.8, 220], 0.018);
        const dorian = [293.7, 329.6, 349.2, 392, 440, 493.9, 523.3, 587.3];
        let beat = 0, idx = 3;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 3 === 0) { idx = Math.max(0, Math.min(dorian.length - 1, idx + [-1, 1, -2, 2, 0][Math.floor(Math.random() * 5)])); this.note(dorian[idx], t, 1.3, 'sawtooth', 0.012, bus); this.note(dorian[idx] * 1.005, t, 1.3, 'square', 0.006, bus); }
          if (beat % 4 === 2) pluck(146.8, 0.03, 1.8);
          beat++;
        }, () => 400);
        break;
      }
      case '長安': {
        // 宮調五聲音階，像琵琶一樣的撥奏，配上一點點笛聲
        pad([130.8, 196], 0.016);
        const gong = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];
        let beat = 0, idx = 3;
        loop(() => {
          const t = this.ac.currentTime;
          idx = Math.max(0, Math.min(gong.length - 1, idx + [-1, 1, -1, 1, 2, -2, 0][Math.floor(Math.random() * 7)]));
          pluck(gong[idx], 0.03, 1.1);
          if (beat % 3 === 1 && Math.random() < 0.6) pluck(gong[idx], 0.018, 0.6);
          if (beat % 8 === 0) this.note(gong[Math.min(gong.length - 1, idx + 2)], t, 1.8, 'sine', 0.012, bus);
          beat++;
        }, () => 340);
        break;
      }
      case '舊府城': {
        // 慢慢的、有一點走音的舊歌：四七拔き的五聲音階，像收音機裡飄出來的
        pad([110, 164.8], 0.014);
        const yona = [220, 246.9, 277.2, 329.6, 370, 440, 493.9];
        let beat = 0, idx = 3;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 2 === 0) { idx = Math.max(0, Math.min(yona.length - 1, idx + [-1, 1, -1, 0, 2, -2][Math.floor(Math.random() * 6)])); this.note(yona[idx] * (1 + (Math.random() - 0.5) * 0.006), t, 1.2, 'triangle', 0.016, bus); }
          if (beat % 4 === 0) pluck(110, 0.025, 1.6);
          beat++;
        }, () => 520);
        break;
      }
      case '西域': {
        // 很空的草原：低低的持續音，偶爾一聲像胡笳的長音，和遠遠的駝鈴
        pad([110, 164.8], 0.018);
        const scale = [220, 246.9, 293.7, 329.6, 370, 440];
        let beat = 0, idx = 2;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 6 === 0) { idx = Math.max(0, Math.min(scale.length - 1, idx + [-1, 1, -2, 2, 0][Math.floor(Math.random() * 5)])); this.note(scale[idx], t, 2.6, 'sine', 0.016, bus); }
          if (beat % 6 === 3 && Math.random() < 0.5) this.note(scale[Math.max(0, idx - 1)], t, 1.6, 'triangle', 0.009, bus);
          if (beat % 12 === 7 || beat % 12 === 9) pluck(1318.5, 0.008, 0.25);
          beat++;
        }, () => 420);
        break;
      }
      case '佛羅倫斯': {
        // 魯特琴般的撥奏，配上教堂裡那種長長的和聲
        pad([196, 293.7, 392], 0.014);
        const scale = [293.7, 329.6, 349.2, 392, 440, 493.9, 523.3, 587.3];
        let beat = 0, idx = 3;
        loop(() => {
          const t = this.ac.currentTime;
          idx = Math.max(0, Math.min(scale.length - 1, idx + [-1, 1, -1, 1, 2, -2, 0][Math.floor(Math.random() * 7)]));
          pluck(scale[idx], 0.028, 1.2);
          if (beat % 2 === 1) pluck(scale[Math.max(0, idx - 2)], 0.016, 0.8);
          if (beat % 8 === 0) this.note(scale[0] / 2, t, 2.6, 'sine', 0.014, bus);
          beat++;
        }, () => 300);
        break;
      }
      case '墨西卡': {
        // 雙音的木頭鼓（兩個音輪流敲），配上陶笛般的五聲旋律
        pad([110, 164.8], 0.014);
        const scale = [440, 493.9, 554.4, 659.3, 740, 880];
        let beat = 0, idx = 2;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 4 === 0) pluck(98, 0.05, 0.4);
          if (beat % 4 === 2 || (beat % 8 === 7 && Math.random() < 0.6)) pluck(130.8, 0.04, 0.35);
          if (beat % 4 === 1 && Math.random() < 0.7) { idx = Math.max(0, Math.min(scale.length - 1, idx + [-1, 1, -2, 2, 0][Math.floor(Math.random() * 5)])); this.note(scale[idx], t, 0.7, 'sine', 0.018, bus); }
          beat++;
        }, () => 250);
        break;
      }
      case '歸墟': {
        // 很深的持續低音，偶爾一聲像鐘、又像水滴的單音，拖得很長
        pad([55, 82.4, 110], 0.016);
        const bells = [261.6, 293.7, 329.6, 392, 440, 523.3];
        let beat = 0;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 6 === 0 || Math.random() < 0.12) this.note(bells[Math.floor(Math.random() * bells.length)], t, 4, 'sine', 0.009, bus);
          beat++;
        }, () => 700);
        break;
      }
      case '晴空': {
        // 明亮、乾淨、像玻璃一樣的琶音，太完美了，反而有一點空
        pad([261.6, 392, 523.3], 0.012);
        const arp = [523.3, 659.3, 784, 1046.5, 784, 659.3];
        let beat = 0;
        loop(() => {
          const t = this.ac.currentTime;
          this.note(arp[beat % arp.length], t, 0.9, 'sine', 0.008, bus);
          if (beat % 12 === 0) this.note(196, t, 3, 'sine', 0.01, bus);
          beat++;
        }, () => 300);
        break;
      }
      case '戰壕': {
        // 很低的持續音，遠方像砲聲的悶響，偶爾一段小號般的短旋律
        pad([82.4, 123.5, 164.8], 0.016);
        const scale = [329.6, 392, 440, 493.9, 587.3];
        let beat = 0, idx = 2;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 16 === 5 || (beat % 16 === 13 && Math.random() < 0.5)) pluck(55, 0.06, 1.2);
          if (beat % 8 === 0 && Math.random() < 0.7) { idx = Math.max(0, Math.min(scale.length - 1, idx + [-1, 1, -2, 0][Math.floor(Math.random() * 4)])); this.note(scale[idx], t, 1.4, 'triangle', 0.012, bus); }
          beat++;
        }, () => 380);
        break;
      }
      case '羯陵伽': {
        // 坦普拉琴般持續的低音，五聲音階的旋律，和像手鼓一樣的撥奏
        pad([146.8, 220, 293.7], 0.016);
        const scale = [293.7, 329.6, 370, 440, 493.9, 587.3, 659.3];
        let beat = 0, idx = 2;
        loop(() => {
          const t = this.ac.currentTime;
          if (beat % 4 === 0 || (beat % 4 === 3 && Math.random() < 0.5)) { idx = Math.max(0, Math.min(scale.length - 1, idx + [-1, 1, -1, 2, 0, -2][Math.floor(Math.random() * 6)])); this.note(scale[idx], t, 0.9, 'triangle', 0.02, bus); }
          if (beat % 8 === 0 || beat % 8 === 3 || beat % 8 === 6) pluck(73.4, 0.05, 0.5);
          if (beat % 2 === 1) pluck(587.3, 0.012, 0.15);
          beat++;
        }, () => 260);
        break;
      }
      default:
        pad([130.8, 196], 0.02);
    }
  }

  // ───────── 環境聲：雨、風、火、鳥、蟬、紙、遠方的砲聲 ─────────
  ambience(kind) {
    this.wantAmb = kind;
    if (!this.ac) return;
    if (this.amb && this.amb.kind === kind) return;
    this.stopAmbience();
    if (!this.on || this.ctx.settings.ambSound === false || !kind) return;
    const bus = this.ac.createGain();
    bus.gain.value = 0.0001; bus.connect(this.master);
    bus.gain.exponentialRampToValueAtTime(0.7, this.ac.currentTime + 3);
    const cur = { kind, bus, timers: [], nodes: [] };
    this.amb = cur;
    const loop = (fn, ms) => { const tick = () => { if (this.amb !== cur) return; fn(); cur.timers.push(setTimeout(tick, ms())); }; cur.timers.push(setTimeout(tick, ms())); };
    const bed = (type, freq, gain, lfoRate = 0.1, q = 0.7) => {
      const s = this.ac.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = this.ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = this.ac.createGain(); g.gain.value = gain;
      const lfo = this.ac.createOscillator(); const lg = this.ac.createGain();
      lfo.frequency.value = lfoRate; lg.gain.value = gain * 0.5; lfo.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(bus); s.start(); lfo.start();
      cur.nodes.push(s, lfo);
      return f;
    };
    const t = () => this.ac.currentTime;
    for (const k of kind.split('+')) switch (k) {
      case 'rain':
        bed('highpass', 1600, 0.05, 0.08); bed('bandpass', 500, 0.03, 0.05);
        loop(() => this.noise(t(), 0.03, 3000 + Math.random() * 3000, 0.03 + Math.random() * 0.03, bus), () => 60 + Math.random() * 180);
        break;
      case 'wind': {
        const f = bed('lowpass', 420, 0.06, 0.07, 1.2);
        const lfo = this.ac.createOscillator(); const lg = this.ac.createGain();
        lfo.frequency.value = 0.05; lg.gain.value = 220; lfo.connect(lg); lg.connect(f.frequency); lfo.start(); cur.nodes.push(lfo);
        break;
      }
      case 'fire':
        bed('lowpass', 300, 0.03, 0.2);
        loop(() => { const n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) this.noise(t() + i * 0.03, 0.02, 2500 + Math.random() * 4000, 0.05 + Math.random() * 0.06, bus); }, () => 90 + Math.random() * 400);
        break;
      case 'birds':
        loop(() => {
          const t0 = t(), base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) { const o = this.ac.createOscillator(); const g = this.ac.createGain(); const s0 = t0 + i * 0.13; o.frequency.setValueAtTime(base, s0); o.frequency.exponentialRampToValueAtTime(base * 1.4, s0 + 0.07); g.gain.setValueAtTime(0.0001, s0); g.gain.exponentialRampToValueAtTime(0.012, s0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s0 + 0.1); o.connect(g); g.connect(bus); o.start(s0); o.stop(s0 + 0.12); }
        }, () => 2500 + Math.random() * 6000);
        break;
      case 'cicada': {
        const s = this.ac.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
        const f = this.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 6;
        const g = this.ac.createGain(); g.gain.value = 0;
        const am = this.ac.createOscillator(); const ag = this.ac.createGain(); am.frequency.value = 38; ag.gain.value = 0.03; am.connect(ag); ag.connect(g.gain);
        const sw = this.ac.createOscillator(); const sg = this.ac.createGain(); sw.frequency.value = 0.09; sg.gain.value = 0.02; sw.connect(sg); sg.connect(g.gain);
        s.connect(f); f.connect(g); g.connect(bus); s.start(); am.start(); sw.start();
        cur.nodes.push(s, am, sw);
        break;
      }
      case 'paper':
        loop(() => this.noise(t(), 0.25 + Math.random() * 0.3, 2400 + Math.random() * 1500, 0.015 + Math.random() * 0.015, bus), () => 1200 + Math.random() * 3500);
        break;
      case 'guns':
        loop(() => { const t0 = t(); this.noise(t0, 1.4, 70, 0.22, bus); this.note(42, t0, 1.2, 'sine', 0.1, bus); }, () => 6000 + Math.random() * 9000);
        break;
      case 'sea':
        bed('lowpass', 500, 0.12, 0.12);
        break;
    }
  }

  stopAmbience() {
    const cur = this.amb;
    if (!cur) return;
    this.amb = null;
    cur.timers.forEach(clearTimeout);
    try { cur.bus.gain.cancelScheduledValues(this.ac.currentTime); cur.bus.gain.setValueAtTime(cur.bus.gain.value || 0.5, this.ac.currentTime); cur.bus.gain.exponentialRampToValueAtTime(0.0001, this.ac.currentTime + 1.2); } catch (e) { /* 忽略 */ }
    setTimeout(() => { cur.nodes.forEach(n => { try { n.stop(); } catch (e) { /* 已停止 */ } }); cur.bus.disconnect(); }, 1400);
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

  stopSpeak() { if (window.speechSynthesis) speechSynthesis.cancel(); }

  // 朗讀模式
  speak(text, who) {
    if (!this.ctx.settings.tts || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.replace(/[「」『』]/g, ''));
    u.lang = 'zh-TW';
    u.rate = 1.05;
    u.pitch = who === '蘅' || who === '蒂娃' ? 1.25 : who ? 0.9 : 1;
    speechSynthesis.speak(u);
  }
}
