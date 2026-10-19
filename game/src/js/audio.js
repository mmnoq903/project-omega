// audio.js — простые WebAudio SFX + речь RU/EN
export const Audio = {
  ctx: null, enabled: true, lang: 'ru', ambNode: null, ambGain: null, voices: [],
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    if (window.speechSynthesis) {
      const load = () => { this.voices = speechSynthesis.getVoices(); };
      load(); speechSynthesis.onvoiceschanged = load;
    }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setEnabled(b) { this.enabled = b; if (!b) this.stopAmbient(); },
  setLang(l) { this.lang = l; },
  _tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + dur);
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  },
  _noise(dur, vol = 0.15, lp = 1200) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    src.connect(f).connect(g).connect(this.ctx.destination); src.start();
  },
  sfx(name) {
    switch (name) {
      case 'step': this._noise(0.08, 0.06, 500); break;
      case 'click': this._tone(660, 0.05, 'square', 0.12); break;
      case 'key': this._tone(1400 + Math.random() * 400, 0.03, 'square', 0.05); break;
      case 'door': this._tone(120, 0.4, 'sawtooth', 0.18, 60); break;
      case 'usb': this._tone(300, 0.15, 'square', 0.12, 900); break;
      case 'alarm': this._tone(880, 0.25, 'sawtooth', 0.18, 440); break;
      case 'boot': this._tone(220, 0.6, 'sine', 0.15, 660); break;
      case 'ok': this._tone(520, 0.1, 'sine', 0.14, 1040); break;
      case 'bad': this._tone(200, 0.3, 'sawtooth', 0.16, 90); break;
      case 'msg': this._tone(1200, 0.06, 'sine', 0.1); setTimeout(() => this._tone(1600, 0.06, 'sine', 0.1), 70); break;
    }
  },
  ambient(name) {
    if (!this.enabled || !this.ctx) { this._pendAmb = name; return; }
    this.stopAmbient();
    this.resume();
    const g = this.ctx.createGain(); g.gain.value = 0.0;
    g.gain.linearRampToValueAtTime(name === 'bank' ? 0.04 : 0.06, this.ctx.currentTime + 2);
    // мягкий гул комнаты
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.value = name === 'bank' ? 70 : 54;
    const o2 = this.ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = name === 'bank' ? 141 : 110;
    const g2 = this.ctx.createGain(); g2.gain.value = 0.02;
    o.connect(g); o2.connect(g2).connect(g); g.connect(this.ctx.destination);
    o.start(); o2.start();
    this.ambNode = [o, o2]; this.ambGain = g;
  },
  stopAmbient() {
    if (this.ambNode) { try { this.ambNode.forEach(n => n.stop()); } catch (e) {} this.ambNode = null; }
  },
  speak(text, langOverride) {
    if (!this.enabled || !window.speechSynthesis || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const lang = (langOverride || this.lang) === 'en' ? 'en' : 'ru';
      u.lang = lang === 'en' ? 'en-US' : 'ru-RU';
      const v = this.voices.find(x => x.lang && x.lang.toLowerCase().startsWith(lang === 'en' ? 'en' : 'ru'));
      if (v) u.voice = v;
      u.rate = 1.0; u.pitch = lang === 'en' ? 0.9 : 0.95;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
};
