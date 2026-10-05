/*
 * VeloraAudio - realistic, fully procedural sound engine for the Velora showroom.
 *
 * Everything is synthesised with the Web Audio API (no downloads needed), but any
 * file listed in SAMPLE_FILES that exists in /public/sounds/ is loaded automatically
 * and replaces the synthesised version, so you can drop in recordings from
 * Freesound / Pixabay / Mixkit etc. See public/sounds/README.md.
 */

export const SAMPLE_FILES = {
  ambient: '/sounds/ambient.mp3',
  'engine-start': '/sounds/wings_of_freedom-ferrari-sound-430458.mp3',
  'engine-idle': '/sounds/engine-idle.mp3',
  seat: '/sounds/assemble.mp3',
  unseat: '/sounds/disassemble.mp3',
  explode: '/sounds/ncprime-winds-sound-effects-304060.mp3',
  'lights-on': '/sounds/lights-on.mp3',
};

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const FLOOR = 0.0001;

export class VeloraAudio {
  constructor(context) {
    this.ctx = context;
    this.samples = {};
    this.ambientNodes = null;
    this.ambientTimer = 0;
    this.engine = null;
    this.engineStartTimer = 0;
    this.engineIdleTimer = 0;
    this.motion = null;
    this.lastHit = {};

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;
    this.master = context.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(compressor);
    compressor.connect(context.destination);

    // Garage-sized reverb used by every effect (concrete walls = long, bright tail).
    this.reverb = context.createConvolver();
    this.reverb.buffer = this.makeImpulse(1.9, 2.4);
    this.reverbReturn = context.createGain();
    this.reverbReturn.gain.value = 0.34;
    this.reverb.connect(this.reverbReturn);
    this.reverbReturn.connect(this.master);

    this.out = this.makeBus(1, 0.38);
    this.engineOut = this.makeBus(1, 0.12);
    this.ambientOut = this.makeBus(1, 0.0);
    this.farOut = context.createBiquadFilter(); // "from across the workshop" filter
    this.farOut.type = 'lowpass';
    this.farOut.frequency.value = 1500;
    const farGain = context.createGain();
    farGain.gain.value = 0.55;
    this.farOut.connect(farGain);
    farGain.connect(this.makeBus(1, 0.7));

    this.white = this.makeNoise('white', 4);
    this.brown = this.makeNoise('brown', 6);
    this.loadSamples();
  }

  /* ------------------------------------------------------------------ utils */

  makeBus(level, reverbSend) {
    const bus = this.ctx.createGain();
    bus.gain.value = level;
    bus.connect(this.master);
    if (reverbSend > 0) {
      const send = this.ctx.createGain();
      send.gain.value = reverbSend;
      bus.connect(send);
      send.connect(this.reverb);
    }
    return bus;
  }

  makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = this.ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      let smooth = 0;
      for (let index = 0; index < length; index += 1) {
        const white = Math.random() * 2 - 1;
        smooth += (white - smooth) * (0.35 + 0.65 * (index / length)); // darker tail
        data[index] = smooth * Math.pow(1 - index / length, decay);
      }
    }
    return buffer;
  }

  makeNoise(kind, seconds) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * white) / 1.02;
        data[index] = last * 3.5;
      } else {
        data[index] = white;
      }
    }
    return buffer;
  }

  noiseSource(kind = 'white') {
    const source = this.ctx.createBufferSource();
    source.buffer = kind === 'brown' ? this.brown : this.white;
    source.loop = true;
    return source;
  }

  startNoise(source, when, duration) {
    const buffer = source.buffer;
    const offset = Math.random() * Math.max(0.1, buffer.duration - duration - 0.1);
    source.start(when, offset);
    if (duration) source.stop(when + duration + 0.05);
  }

  async loadSamples() {
    await Promise.all(Object.entries(SAMPLE_FILES).map(async ([name, url]) => {
      try {
        const response = await fetch(url);
        const type = response.headers.get('content-type') || '';
        if (!response.ok || !/audio|ogg|mpeg|wav|octet/i.test(type)) return;
        const data = await response.arrayBuffer();
        this.samples[name] = await this.ctx.decodeAudioData(data);
      } catch {
        /* no sample supplied - synthesised sound is used */
      }
    }));
    if (this.ambientNodes && this.samples.ambient && !this.ambientNodes.sample) this.attachAmbientSample();
  }

  playSample(name, { volume = 1, rate = 1, dest = this.out, loop = false } = {}) {
    const buffer = this.samples[name];
    if (!buffer) return null;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(dest);
    source.start();
    return { source, gain };
  }

  /* -------------------------------------------------------------- primitives */

  tone(t, { f0, f1 = f0, dur = 0.1, vol = 0.1, type = 'sine', attack = 0.004, dest = this.out }) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    gain.gain.setValueAtTime(FLOOR, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noiseBurst(t, { dur = 0.1, vol = 0.1, type = 'bandpass', f0 = 1500, f1 = f0, q = 1, attack = 0.003, dest = this.out, kind = 'white' }) {
    const source = this.noiseSource(kind);
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gain.gain.setValueAtTime(FLOOR, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    this.startNoise(source, t, dur);
  }

  /** Struck metal: inharmonic partials with independent decays + a bright transient. */
  clank(t, { base = 420, vol = 0.18, decay = 0.35, dest = this.out } = {}) {
    const ratios = [1, 2.32, 4.25, 6.63, 9.38, 12.9];
    const levels = [1, 0.62, 0.42, 0.28, 0.16, 0.09];
    ratios.forEach((ratio, index) => {
      const jitter = rand(0.985, 1.015);
      this.tone(t, {
        f0: base * ratio * jitter,
        dur: decay / (1 + index * 0.55),
        vol: vol * levels[index] * 0.6,
        attack: 0.0015,
        dest,
      });
    });
    this.noiseBurst(t, { dur: 0.028, vol: vol * 0.9, type: 'highpass', f0: 2600, attack: 0.001, dest });
    this.tone(t, { f0: base * 0.5, f1: base * 0.32, dur: decay * 0.5, vol: vol * 0.55, attack: 0.001, dest });
  }

  thud(t, { f = 80, vol = 0.3, dur = 0.28, dest = this.out } = {}) {
    this.tone(t, { f0: f * 1.8, f1: f * 0.55, dur, vol, attack: 0.002, dest });
    this.noiseBurst(t, { dur: dur * 0.6, vol: vol * 0.55, type: 'lowpass', f0: 520, f1: 120, attack: 0.002, dest });
  }

  click(t, { vol = 0.12, pitch = 1, dest = this.out } = {}) {
    this.noiseBurst(t, { dur: 0.014, vol, type: 'highpass', f0: 3200 * pitch, attack: 0.0008, dest });
    this.tone(t, { f0: 2100 * pitch, f1: 950 * pitch, dur: 0.02, vol: vol * 0.7, type: 'square', attack: 0.0008, dest });
    this.tone(t + 0.004, { f0: 640 * pitch, f1: 380 * pitch, dur: 0.035, vol: vol * 0.55, attack: 0.001, dest });
  }

  hiss(t, { dur = 0.4, vol = 0.1, f = 5200, dest = this.out } = {}) {
    this.noiseBurst(t, { dur, vol, type: 'highpass', f0: f, f1: f * 0.7, q: 0.6, attack: 0.012, dest });
    this.noiseBurst(t, { dur: dur * 0.8, vol: vol * 0.5, type: 'bandpass', f0: f * 0.45, q: 0.9, attack: 0.015, dest });
  }

  whoosh(t, { dur = 0.5, vol = 0.07, f0 = 400, f1 = 2200, dest = this.out } = {}) {
    const source = this.noiseSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(FLOOR, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    this.startNoise(source, t, dur);
  }

  /** Ratchet wrench: pawl ticks that slow down as the fastener seats. */
  ratchet(t, { count = 8, interval = 0.045, vol = 0.1, pitch = 1, slow = 1.12, dest = this.out } = {}) {
    let time = t;
    let gap = interval;
    for (let index = 0; index < count; index += 1) {
      this.click(time, { vol: vol * rand(0.8, 1.1), pitch: pitch * rand(0.94, 1.08), dest });
      time += gap;
      gap *= slow;
    }
    return time - t;
  }

  /** Pneumatic impact wrench: motor whine + hammering pulses. */
  impactWrench(t, { dur = 0.55, vol = 0.12, reverse = false, dest = this.out } = {}) {
    const start = reverse ? 420 : 300;
    const end = reverse ? 300 : 460;
    this.tone(t, { f0: start, f1: end, dur, vol: vol * 0.55, type: 'sawtooth', attack: 0.03, dest });
    this.noiseBurst(t, { dur, vol: vol * 0.35, type: 'bandpass', f0: 1800, f1: 2600, q: 2, attack: 0.03, dest });
    let hit = t + 0.06;
    const step = 0.034;
    while (hit < t + dur) {
      this.noiseBurst(hit, { dur: 0.03, vol: vol * rand(0.85, 1.15), type: 'bandpass', f0: rand(1900, 2500), q: 1.5, attack: 0.001, dest });
      this.tone(hit, { f0: rand(480, 560), f1: 300, dur: 0.045, vol: vol * 0.8, type: 'square', attack: 0.001, dest });
      hit += step * rand(0.92, 1.08);
    }
    // spin-down tail
    this.tone(t + dur, { f0: end, f1: end * 0.5, dur: 0.18, vol: vol * 0.4, type: 'sawtooth', attack: 0.005, dest });
    return dur + 0.2;
  }

  servo(t, { dur = 0.4, f0 = 180, f1 = 420, vol = 0.04, dest = this.out } = {}) {
    this.tone(t, { f0, f1, dur, vol, type: 'sawtooth', attack: dur * 0.3, dest });
    this.tone(t, { f0: f0 * 2.01, f1: f1 * 2.01, dur, vol: vol * 0.5, type: 'triangle', attack: dur * 0.3, dest });
  }

  glassThunk(t, vol = 0.14) {
    this.tone(t, { f0: 1050, f1: 900, dur: 0.12, vol: vol * 0.7, attack: 0.001 });
    this.tone(t, { f0: 2480, f1: 2300, dur: 0.07, vol: vol * 0.4, attack: 0.001 });
    this.thud(t, { f: 120, vol: vol * 0.8, dur: 0.14 });
    this.hiss(t + 0.02, { dur: 0.25, vol: vol * 0.45, f: 3500 }); // suction seal
  }

  rubberThump(t, vol = 0.22) {
    this.thud(t, { f: 62, vol, dur: 0.4 });
    this.noiseBurst(t, { dur: 0.22, vol: vol * 0.4, type: 'lowpass', f0: 900, f1: 200, attack: 0.004 });
    this.hiss(t + 0.08, { dur: 0.45, vol: vol * 0.35, f: 4200 });
  }

  /* ------------------------------------------------------------- one-shots */

  throttle(kind, gap) {
    const now = performance.now();
    if (now - (this.lastHit[kind] || 0) < gap) return false;
    this.lastHit[kind] = now;
    return true;
  }

  sfx(kind, detail = {}) {
    const t = this.ctx.currentTime + 0.01;
    const part = detail.part || 'body';

    if (kind === 'seat') {
      if (this.samples.seat) { this.playSample('seat', { rate: rand(0.96, 1.05) }); return; }
      this.seatSound(t, part);
      return;
    }
    if (kind === 'unseat') {
      if (this.samples.unseat) { this.playSample('unseat', { rate: rand(0.96, 1.05) }); return; }
      this.unseatSound(t, part);
      return;
    }
    if (kind === 'explode') {
      if (this.samples.explode) { this.playSample('explode', { volume: 0.72 }); return; }
      this.hiss(t, { dur: 0.9, vol: 0.2, f: 3800 });
      this.thud(t, { f: 55, vol: 0.34, dur: 0.6 });
      this.whoosh(t, { dur: 0.9, vol: 0.11, f0: 250, f1: 1800 });
      this.clank(t + 0.05, { base: 190, vol: 0.2, decay: 0.7 });
      this.impactWrench(t + 0.12, { dur: 0.5, vol: 0.1, reverse: true });
      return;
    }
    if (kind === 'assemble-start') {
      this.hiss(t, { dur: 0.5, vol: 0.12, f: 4600 });
      this.servo(t, { dur: 0.5, f0: 120, f1: 300, vol: 0.05 });
      this.click(t + 0.02, { vol: 0.12, pitch: 0.8 });
      return;
    }
    if (kind === 'lights-on') {
      if (this.samples['lights-on']) { this.playSample('lights-on'); return; }
      this.click(t, { vol: 0.2, pitch: 0.6 });
      this.click(t + 0.06, { vol: 0.14, pitch: 0.75 });
      this.thud(t + 0.02, { f: 130, vol: 0.12, dur: 0.12 });
      this.tone(t + 0.08, { f0: 3200, f1: 3000, dur: 0.18, vol: 0.025 });
      return;
    }
    if (kind === 'select' || kind === 'click') {
      if (!this.throttle('click', 40)) return;
      this.click(t, { vol: kind === 'select' ? 0.14 : 0.09, pitch: kind === 'select' ? 1.15 : 0.9 });
      this.tone(t, { f0: kind === 'select' ? 880 : 620, f1: 430, dur: 0.09, vol: 0.05, type: 'triangle' });
      return;
    }
    if (kind === 'scrub') {
      if (!this.throttle('scrub', 70)) return;
      this.ratchet(t, { count: 3, interval: 0.03, vol: 0.06, pitch: 1.1 });
      return;
    }
    if (kind === 'orbit') {
      if (!this.throttle('orbit', 120)) return;
      this.whoosh(t, { dur: 0.22, vol: 0.025, f0: 300, f1: 900 });
    }
  }

  seatSound(t, part) {
    switch (part) {
      case 'chassis':
        this.thud(t, { f: 48, vol: 0.4, dur: 0.6 });
        this.clank(t, { base: 150, vol: 0.26, decay: 0.8 });
        this.hiss(t + 0.05, { dur: 0.45, vol: 0.12 });
        this.ratchet(t + 0.2, { count: 6, interval: 0.05, vol: 0.09, pitch: 0.8 });
        break;
      case 'engine':
        this.clank(t, { base: 130, vol: 0.3, decay: 0.9 });
        this.thud(t, { f: 52, vol: 0.38, dur: 0.5 });
        this.ratchet(t - 0.24, { count: 9, interval: 0.025, vol: 0.07, slow: 1.04 }); // chain hoist
        this.impactWrench(t + 0.12, { dur: 0.55, vol: 0.12 });
        this.clank(t + 0.75, { base: 520, vol: 0.12, decay: 0.3 });
        break;
      case 'wheels':
        this.rubberThump(t, 0.26);
        this.impactWrench(t + 0.14, { dur: 0.4, vol: 0.1 });
        this.clank(t + 0.56, { base: 360, vol: 0.12, decay: 0.28 });
        break;
      case 'rims':
        this.clank(t, { base: 700, vol: 0.2, decay: 0.55 });
        this.impactWrench(t + 0.1, { dur: 0.5, vol: 0.12 });
        this.clank(t + 0.66, { base: 880, vol: 0.1, decay: 0.3 });
        this.click(t + 0.7, { vol: 0.1, pitch: 0.9 });
        break;
      case 'brakes':
        this.clank(t, { base: 640, vol: 0.14, decay: 0.3 });
        this.click(t + 0.08, { vol: 0.14, pitch: 0.8 });
        this.ratchet(t + 0.14, { count: 6, interval: 0.04, vol: 0.09, pitch: 1.2 });
        this.hiss(t + 0.34, { dur: 0.2, vol: 0.06 });
        break;
      case 'interior':
        this.thud(t, { f: 95, vol: 0.2, dur: 0.22 });
        this.noiseBurst(t, { dur: 0.18, vol: 0.06, type: 'bandpass', f0: 1400, q: 0.7 }); // leather rub
        this.click(t + 0.1, { vol: 0.12, pitch: 0.9 });
        this.click(t + 0.17, { vol: 0.1, pitch: 1.05 });
        this.ratchet(t + 0.22, { count: 5, interval: 0.045, vol: 0.07 });
        break;
      case 'glass':
        this.glassThunk(t, 0.16);
        this.click(t + 0.18, { vol: 0.1 });
        break;
      case 'headlights':
      case 'taillights':
        this.click(t, { vol: 0.16, pitch: 1.1 });
        this.click(t + 0.05, { vol: 0.13, pitch: 0.9 });
        this.clank(t + 0.02, { base: 980, vol: 0.07, decay: 0.16 });
        this.tone(t + 0.1, { f0: 2400, f1: 2400, dur: 0.12, vol: 0.02 });
        break;
      case 'grilles':
        this.click(t, { vol: 0.13, pitch: 1.2 });
        this.click(t + 0.045, { vol: 0.11, pitch: 1.4 });
        this.click(t + 0.09, { vol: 0.1, pitch: 1.3 });
        this.thud(t, { f: 160, vol: 0.1, dur: 0.1 });
        break;
      case 'chrome':
        this.clank(t, { base: 1250, vol: 0.1, decay: 0.45 });
        this.click(t + 0.03, { vol: 0.1, pitch: 1.3 });
        break;
      default: // body panels, mirrors, covers
        this.thud(t, { f: 70, vol: 0.34, dur: 0.38 });
        this.clank(t, { base: 280, vol: 0.2, decay: 0.55 });
        this.click(t + 0.12, { vol: 0.12, pitch: 0.8 });
        this.click(t + 0.19, { vol: 0.12, pitch: 0.9 });
        this.ratchet(t + 0.24, { count: 5, interval: 0.04, vol: 0.08, pitch: 0.9 });
        break;
    }
  }

  unseatSound(t, part) {
    const heavy = ['chassis', 'engine', 'body'].includes(part);
    this.hiss(t, { dur: heavy ? 0.5 : 0.3, vol: heavy ? 0.13 : 0.09, f: 4800 }); // pneumatic release
    this.impactWrench(t + 0.03, { dur: heavy ? 0.5 : 0.34, vol: 0.1, reverse: true }); // bolts coming out
    this.click(t + 0.0, { vol: 0.14, pitch: 0.85 });
    const after = t + (heavy ? 0.52 : 0.36);
    this.clank(after, { base: heavy ? 210 : part === 'glass' ? 1000 : 540, vol: heavy ? 0.2 : 0.12, decay: heavy ? 0.6 : 0.3 });
    this.whoosh(after, { dur: 0.55, vol: 0.06, f0: 220, f1: 1400 });
    if (part === 'wheels') this.rubberThump(after, 0.12);
  }

  /* --------------------------------------------------------------- motion */

  /** Soft servo / winch loop while the assembly line is moving parts. */
  setMotion(active) {
    const t = this.ctx.currentTime;
    if (!this.motion) {
      if (!active) return;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 96;
      osc2.type = 'triangle';
      osc2.frequency.value = 196;
      filter.type = 'bandpass';
      filter.frequency.value = 520;
      filter.Q.value = 2.2;
      lfo.frequency.value = 0.6;
      lfoGain.gain.value = 120;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      const noise = this.noiseSource('brown');
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.value = 0.25;
      noise.connect(noiseGain);
      noiseGain.connect(filter);
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.out);
      osc.start();
      osc2.start();
      lfo.start();
      noise.start();
      this.motion = { gain, osc, osc2, lfo, noise };
    }
    const { gain, osc, osc2 } = this.motion;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(active ? 0.05 : 0, t, active ? 0.25 : 0.4);
    osc.frequency.setTargetAtTime(active ? rand(95, 140) : 80, t, 0.5);
    osc2.frequency.setTargetAtTime(active ? rand(190, 280) : 160, t, 0.5);
  }

  /* -------------------------------------------------------------- ambience */

  startAmbient() {
    if (this.ambientNodes) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(1, t + 2.5);
    master.connect(this.ambientOut);
    const sources = [];
    const nodes = { master, sources };

    // 1. low HVAC / room rumble
    const rumble = this.noiseSource('brown');
    const rumbleFilter = ctx.createBiquadFilter();
    const rumbleGain = ctx.createGain();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 340;
    rumbleGain.gain.value = 0.2;
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(master);
    rumble.start();
    sources.push(rumble);

    // 2. ventilation air, slowly breathing
    const air = this.noiseSource();
    const airFilter = ctx.createBiquadFilter();
    const airGain = ctx.createGain();
    const airLfo = ctx.createOscillator();
    const airLfoGain = ctx.createGain();
    airFilter.type = 'bandpass';
    airFilter.frequency.value = 1100;
    airFilter.Q.value = 0.45;
    airGain.gain.value = 0.014;
    airLfo.frequency.value = 0.09;
    airLfoGain.gain.value = 0.006;
    airLfo.connect(airLfoGain);
    airLfoGain.connect(airGain.gain);
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(master);
    air.start();
    airLfo.start();
    sources.push(air, airLfo);

    // 3. fluorescent ballast hum (120 Hz + harmonics) - matches the garage lights
    [120, 240, 360, 480].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = index === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = frequency + rand(-0.15, 0.15);
      gain.gain.value = [0.0075, 0.005, 0.0032, 0.0018][index];
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      sources.push(osc);
    });

    // 4. slow cinematic pad so the room has a "musical" floor
    const padFilter = ctx.createBiquadFilter();
    const padGain = ctx.createGain();
    const padLfo = ctx.createOscillator();
    const padLfoGain = ctx.createGain();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 520;
    padFilter.Q.value = 0.8;
    padGain.gain.value = 0.045;
    padLfo.frequency.value = 0.07;
    padLfoGain.gain.value = 220;
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padFilter.frequency);
    [55, 82.41, 110, 138.59, 164.81].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = index % 2 ? 'triangle' : 'sine';
      osc.frequency.value = frequency;
      osc.detune.value = rand(-9, 9);
      gain.gain.value = 0.22 - index * 0.025;
      osc.connect(gain);
      gain.connect(padFilter);
      osc.start();
      sources.push(osc);
    });
    padFilter.connect(padGain);
    padGain.connect(master);
    padLfo.start();
    sources.push(padLfo);

    this.ambientNodes = nodes;
    if (this.samples.ambient) this.attachAmbientSample();

    // light switch + ballast "tink" as the lights come up
    this.click(t + 0.2, { vol: 0.12, pitch: 0.55 });
    this.thud(t + 0.22, { f: 90, vol: 0.14, dur: 0.18 });
    [0.5, 0.62, 0.74].forEach((delay) => this.tone(t + delay, { f0: 3400, f1: 3100, dur: 0.05, vol: 0.012 }));

    const schedule = () => {
      this.ambientTimer = window.setTimeout(() => {
        if (!this.ambientNodes) return;
        this.workshopEvent();
        schedule();
      }, rand(3200, 8800));
    };
    schedule();
  }

  attachAmbientSample() {
    if (!this.ambientNodes || this.ambientNodes.sample) return;
    this.ambientNodes.sample = this.playSample('ambient', { volume: 0.5, loop: true, dest: this.ambientNodes.master });
  }

  /** Occasional far-off workshop sounds so the bed never feels like a loop. */
  workshopEvent() {
    const t = this.ctx.currentTime + 0.02;
    const far = this.farOut;
    const roll = Math.random();
    if (roll < 0.28) {
      this.clank(t, { base: rand(500, 1400), vol: 0.05, decay: 0.5, dest: far });
    } else if (roll < 0.5) {
      this.tone(t, { f0: rand(1500, 2100), f1: rand(650, 900), dur: 0.07, vol: 0.035, dest: this.out }); // water drip
      this.tone(t + 0.016, { f0: rand(2600, 3200), f1: 1400, dur: 0.04, vol: 0.012, dest: this.out });
    } else if (roll < 0.7) {
      this.impactWrench(t, { dur: rand(0.4, 0.9), vol: 0.07, dest: far });
    } else if (roll < 0.85) {
      this.ratchet(t, { count: 7, interval: 0.05, vol: 0.05, dest: far });
    } else if (roll < 0.94) {
      this.hiss(t, { dur: 0.6, vol: 0.05, f: 4000, dest: far });
    } else {
      this.thud(t, { f: 60, vol: 0.08, dur: 0.3, dest: far }); // distant door
      this.clank(t + 0.12, { base: 300, vol: 0.05, decay: 0.6, dest: far });
    }
  }

  stopAmbient(fade = 0.6) {
    window.clearTimeout(this.ambientTimer);
    const nodes = this.ambientNodes;
    this.ambientNodes = null;
    if (!nodes) return;
    const t = this.ctx.currentTime;
    nodes.master.gain.cancelScheduledValues(t);
    nodes.master.gain.setTargetAtTime(0, t, fade / 3);
    window.setTimeout(() => {
      nodes.sources.forEach((source) => { try { source.stop(); } catch { /* already stopped */ } });
      try { nodes.sample?.source.stop(); } catch { /* already stopped */ }
      nodes.master.disconnect();
    }, fade * 1000 + 300);
  }

  /* ----------------------------------------------------------------- engine */

  makeEngineWave() {
    const size = 72;
    const real = new Float32Array(size);
    const imag = new Float32Array(size);
    for (let n = 1; n < size; n += 1) {
      let amp = 1 / Math.pow(n, 0.88);
      if (n % 2 === 0) amp *= 1.28; // V12 firing-order even-harmonic bark
      if (n >= 3 && n <= 9) amp *= 1.3;
      if (n === 6 || n === 12) amp *= 1.45; // 6 firings per crank turn
      real[n] = amp * 0.35 * Math.cos(n * 1.7);
      imag[n] = amp * Math.sin(n * 0.35 + 1);
    }
    return this.ctx.createPeriodicWave(real, imag);
  }

  buildEngine() {
    const ctx = this.ctx;
    const wave = this.makeEngineWave();
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(this.engineOut);

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const sub = ctx.createOscillator();
    oscA.setPeriodicWave(wave);
    oscB.setPeriodicWave(wave);
    sub.type = 'sine';

    const lope = ctx.createOscillator(); // idle "lope" / cylinder imbalance
    const lopeGain = ctx.createGain();
    lope.frequency.value = 4.1;
    lopeGain.gain.value = 12;
    lope.connect(lopeGain);
    lopeGain.connect(oscA.detune);
    lopeGain.connect(oscB.detune);
    lope.start();

    const mix = ctx.createGain();
    mix.gain.value = 0.7;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.55;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let index = 0; index < curve.length; index += 1) {
      const x = (index / (curve.length - 1)) * 2 - 1;
      curve[index] = Math.tanh(x * 2.6) / Math.tanh(2.6);
    }
    shaper.curve = curve;
    shaper.oversample = '2x';

    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 210;
    body.gain.value = 7;
    body.Q.value = 1.1;
    const exhaust = ctx.createBiquadFilter();
    exhaust.type = 'peaking';
    exhaust.frequency.value = 520;
    exhaust.gain.value = 6;
    exhaust.Q.value = 1.4;
    const bark = ctx.createBiquadFilter();
    bark.type = 'peaking';
    bark.frequency.value = 1250;
    bark.gain.value = 5;
    bark.Q.value = 2;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 600;
    lowpass.Q.value = 0.7;

    oscA.connect(mix);
    oscB.connect(mix);
    sub.connect(subGain);
    mix.connect(shaper);
    subGain.connect(shaper);
    shaper.connect(body);
    body.connect(exhaust);
    exhaust.connect(bark);
    bark.connect(lowpass);
    lowpass.connect(bus);

    // intake / combustion roar
    const intake = this.noiseSource();
    const intakeFilter = ctx.createBiquadFilter();
    const intakeGain = ctx.createGain();
    intakeFilter.type = 'bandpass';
    intakeFilter.frequency.value = 700;
    intakeFilter.Q.value = 0.8;
    intakeGain.gain.value = 0;
    intake.connect(intakeFilter);
    intakeFilter.connect(intakeGain);
    intakeGain.connect(bus);

    // valvetrain / gear whine
    const whine = ctx.createOscillator();
    const whineGain = ctx.createGain();
    whine.type = 'sine';
    whineGain.gain.value = 0;
    whine.connect(whineGain);
    whineGain.connect(bus);

    // starter motor
    const starter = ctx.createOscillator();
    const starterFilter = ctx.createBiquadFilter();
    const starterGain = ctx.createGain();
    starter.type = 'sawtooth';
    starterFilter.type = 'bandpass';
    starterFilter.frequency.value = 900;
    starterFilter.Q.value = 3;
    starterGain.gain.value = 0;
    starter.connect(starterFilter);
    starterFilter.connect(starterGain);
    starterGain.connect(this.engineOut);

    [oscA, oscB, sub, whine, starter].forEach((osc) => osc.start());
    intake.start();

    return {
      bus, oscA, oscB, sub, lope, lopeGain, lowpass, body, exhaust, bark,
      intake, intakeFilter, intakeGain, whine, whineGain, starter, starterFilter, starterGain,
      timeline: [],
    };
  }

  /** Schedule one automation point: engine state at time t. */
  enginePoint(t, rpm, load = 0, starter = 0) {
    const e = this.engine;
    if (!e) return;
    const f = Math.max(7, (rpm / 60) * 6);
    const level = rpm < 1 ? 0 : 0.1 + 0.2 * Math.min(1, rpm / 4500) + load * 0.14;
    const first = e.timeline.length === 0;
    const ramp = (param, value) => {
      const safe = Math.max(FLOOR, value);
      if (first) param.setValueAtTime(safe, t);
      else param.linearRampToValueAtTime(safe, t);
    };
    ramp(e.oscA.frequency, f);
    ramp(e.oscB.frequency, f * 1.0035);
    ramp(e.sub.frequency, f / 2);
    ramp(e.lowpass.frequency, Math.min(9000, 380 + rpm * 1.15 + load * 1700));
    ramp(e.body.frequency, 170 + rpm * 0.03);
    ramp(e.exhaust.frequency, 420 + rpm * 0.1);
    ramp(e.bus.gain, level);
    ramp(e.lopeGain.gain, rpm < 1400 ? 14 : 3);
    ramp(e.intakeFilter.frequency, 500 + rpm * 0.55);
    ramp(e.intakeGain.gain, rpm < 1 ? FLOOR : 0.012 + load * 0.05 + (rpm / 9000) * 0.03);
    ramp(e.whine.frequency, Math.max(40, f * 12));
    ramp(e.whineGain.gain, rpm < 1 ? FLOOR : 0.0015 + (rpm / 9000) * 0.007);
    ramp(e.starter.frequency, 150 + rpm * 0.95);
    ramp(e.starterFilter.frequency, 600 + rpm * 2);
    ramp(e.starterGain.gain, starter);
    e.timeline.push({ t, rpm });
  }

  engineRpmAt(time) {
    const line = this.engine?.timeline || [];
    if (!line.length) return 0;
    if (time <= line[0].t) return line[0].rpm;
    for (let index = 1; index < line.length; index += 1) {
      if (time <= line[index].t) {
        const a = line[index - 1];
        const b = line[index];
        return a.rpm + ((time - a.t) / Math.max(0.001, b.t - a.t)) * (b.rpm - a.rpm);
      }
    }
    return line[line.length - 1].rpm;
  }

  exhaustPop(t, vol = 0.12) {
    this.noiseBurst(t, { dur: 0.07, vol, type: 'bandpass', f0: rand(900, 1500), q: 1.2, attack: 0.001, dest: this.engineOut });
    this.tone(t, { f0: 150, f1: 70, dur: 0.07, vol: vol * 0.9, attack: 0.001, dest: this.engineOut });
  }

  /** Key on -> fuel pump -> starter crank -> fire -> cold-start flare -> settle to idle. */
  engineStart() {
    if (this.engine) this.engineStop(0);
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.08;

    // ignition + headlight relay + dash power-up
    this.sfx('lights-on');
    this.click(t0, { vol: 0.16, pitch: 0.7 });
    this.tone(t0 + 0.12, { f0: 130, f1: 150, dur: 0.85, vol: 0.04, type: 'sawtooth', attack: 0.25 }); // fuel pump prime
    this.tone(t0 + 0.12, { f0: 262, f1: 300, dur: 0.85, vol: 0.016, attack: 0.25 });

    if (this.samples['engine-start']) {
      const startSample = this.playSample('engine-start', { volume: 1.35, dest: this.engineOut });
      this.engine = { sample: startSample };
      this.engineStartTimer = window.setTimeout(() => {
        if (this.engine?.sample !== startSample) return;
        if (this.samples['engine-idle']) {
          this.engine = { sample: this.playSample('engine-idle', { loop: true, dest: this.engineOut }) };
          return;
        }
        this.engine = this.buildEngine();
        const idleTime = ctx.currentTime + 0.04;
        this.enginePoint(idleTime, 960, 0.05);
        this.idleStart = idleTime;
        this.scheduleEngineIdle();
      }, this.samples['engine-start'].duration * 1000);
      return;
    }

    this.engine = this.buildEngine();
    const crank = t0 + 0.98;
    const fire = crank + 1.35;
    this.enginePoint(crank - 0.02, 0, 0, 0);
    this.enginePoint(crank + 0.08, 95, 0, 0.06);
    this.enginePoint(crank + 0.45, 205, 0, 0.085);
    this.enginePoint(crank + 0.75, 190, 0, 0.08); // compression stumble
    this.enginePoint(crank + 1.0, 232, 0, 0.09);
    this.enginePoint(fire - 0.05, 242, 0, 0.09);
    // first combustion strokes catching
    [crank + 0.86, crank + 1.04, crank + 1.17, fire - 0.06].forEach((time, index) => this.exhaustPop(time, 0.05 + index * 0.025));
    // light off the starter, engine takes over and flares
    this.enginePoint(fire, 300, 0.4, 0.0001);
    this.enginePoint(fire + 0.1, 2500, 1, 0.0001);
    this.enginePoint(fire + 0.36, 4700, 1, 0.0001);
    this.enginePoint(fire + 0.62, 4300, 0.9, 0.0001);
    this.enginePoint(fire + 0.95, 2400, 0.3, 0.0001);
    this.enginePoint(fire + 1.4, 1900, 0.2, 0.0001);
    this.enginePoint(fire + 2.3, 1250, 0.1, 0.0001);
    this.enginePoint(fire + 3.3, 960, 0.05, 0.0001);
    // the bang when it lights + deceleration crackle
    this.thud(fire, { f: 52, vol: 0.34, dur: 0.5, dest: this.engineOut });
    this.noiseBurst(fire, { dur: 0.35, vol: 0.2, type: 'lowpass', f0: 2600, f1: 300, attack: 0.002, dest: this.engineOut });
    this.clank(fire + 0.02, { base: 95, vol: 0.12, decay: 0.7, dest: this.engineOut });
    [0.98, 1.08, 1.2, 1.36, 1.55].forEach((delay, index) => this.exhaustPop(fire + delay, 0.11 - index * 0.012));

    this.idleStart = fire + 3.3;
    this.scheduleEngineIdle();
  }

  scheduleEngineIdle() {
    const ctx = this.ctx;
    window.clearInterval(this.engineIdleTimer);
    this.engineIdleTimer = window.setInterval(() => {
      const e = this.engine;
      if (!e || !e.timeline) return;
      const now = ctx.currentTime;
      if (now < this.idleStart - 0.2) return;
      const next = now + 0.5;
      this.enginePoint(next, 960 + rand(-35, 35), 0.05);
      e.timeline = e.timeline.filter((point) => point.t > now - 2);
    }, 450);
  }

  /** Rev the engine up and let it fall back - used for extra life on interaction. */
  engineBlip() {
    const e = this.engine;
    if (!e?.timeline) return;
    const now = this.ctx.currentTime + 0.05;
    const base = this.engineRpmAt(now);
    if (base < 600) return;
    this.enginePoint(now, base, 0.1);
    this.enginePoint(now + 0.22, 4100, 1);
    this.enginePoint(now + 0.5, 3600, 0.8);
    this.enginePoint(now + 1.2, 1000, 0.1);
    this.exhaustPop(now + 0.85, 0.07);
    this.exhaustPop(now + 0.97, 0.05);
  }

  engineStop(fade = 0.9) {
    window.clearTimeout(this.engineStartTimer);
    this.engineStartTimer = 0;
    window.clearInterval(this.engineIdleTimer);
    const e = this.engine;
    this.engine = null;
    if (!e) return;
    if (e.sample) {
      try { e.sample.source.stop(); } catch { /* already stopped */ }
      return;
    }
    const t = this.ctx.currentTime;
    const rpm = Math.max(0, this.engineRpmAtFrom(e, t));
    [e.oscA.frequency, e.oscB.frequency, e.sub.frequency, e.lowpass.frequency, e.bus.gain,
      e.intakeGain.gain, e.whineGain.gain, e.starterGain.gain].forEach((param) => param.cancelScheduledValues(t));
    const f = Math.max(7, (rpm / 60) * 6);
    if (fade > 0.05 && rpm > 300) {
      // key off: rpm sags, a last shudder, then silence
      e.oscA.frequency.setValueAtTime(f, t);
      e.oscA.frequency.exponentialRampToValueAtTime(7, t + fade);
      e.oscB.frequency.setValueAtTime(f * 1.0035, t);
      e.oscB.frequency.exponentialRampToValueAtTime(7, t + fade);
      e.sub.frequency.setValueAtTime(f / 2, t);
      e.sub.frequency.exponentialRampToValueAtTime(4, t + fade);
      e.bus.gain.setValueAtTime(Math.max(0.05, e.bus.gain.value), t);
      e.bus.gain.linearRampToValueAtTime(FLOOR, t + fade);
      this.exhaustPop(t + 0.05, 0.06);
      this.thud(t + fade * 0.85, { f: 60, vol: 0.1, dur: 0.2, dest: this.engineOut });
    } else {
      e.bus.gain.setValueAtTime(0, t);
    }
    e.starterGain.gain.setValueAtTime(0, t);
    e.intakeGain.gain.setTargetAtTime(0, t, 0.1);
    e.whineGain.gain.setTargetAtTime(0, t, 0.1);
    window.setTimeout(() => {
      [e.oscA, e.oscB, e.sub, e.lope, e.whine, e.starter, e.intake].forEach((node) => {
        try { node.stop(); } catch { /* already stopped */ }
      });
      e.bus.disconnect();
      e.starterGain.disconnect();
    }, (fade + 0.3) * 1000);
  }

  engineRpmAtFrom(engine, time) {
    const line = engine.timeline || [];
    if (!line.length) return 0;
    if (time <= line[0].t) return line[0].rpm;
    for (let index = 1; index < line.length; index += 1) {
      if (time <= line[index].t) {
        const a = line[index - 1];
        const b = line[index];
        return a.rpm + ((time - a.t) / Math.max(0.001, b.t - a.t)) * (b.rpm - a.rpm);
      }
    }
    return line[line.length - 1].rpm;
  }

  /* ---------------------------------------------------------------- teardown */

  silence() {
    this.engineStop(0);
    this.stopAmbient(0.3);
    this.setMotion(false);
  }

  dispose() {
    this.silence();
    window.setTimeout(() => { this.ctx.close?.().catch(() => {}); }, 700);
  }
}
