// ════════════════════════════════════════════════════════════════
//  AUDIO — procedural Web Audio (no files). Reused from v1, routed
//  through a master bus, with an intensity-aware soundtrack.
// ════════════════════════════════════════════════════════════════

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null, master = null, musicBus = null, musicOn = false, blipTimer = null;
let enabled = true;
let voice = true;
let intensity = 0;           // 0..1 — drives soundtrack tempo

function ensure() {
  if (!AudioCtx) return false;
  if (!ctx) {
    ctx = new AudioCtx();
    master = ctx.createGain(); master.gain.value = enabled ? 1 : 0; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

function tone(freq, dur, type = 'sine', vol = 0.1, delay = 0, slideTo = null) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur = 0.4, vol = 0.12, delay = 0, decay = 0.1) {
  if (!enabled || !ensure()) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(200, t + dur * decay * 8);
  src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur);
}

/** Filtered noise burst (dreamspace whispers and radio crackle). */
function fnoise(dur, vol, type, freq, delay = 0, q = 1) {
  if (!enabled || !ensure()) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

// ── Dreamspace ambience: a living drone with a heartbeat and distant whale-song ──
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
let dream = null;          // { bus, nodes, beatTimer, songTimer, bpm }
function lubDub(bus, vol = 1) {
  const t = ctx.currentTime;
  [0, 0.24].forEach((d, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(i ? 52 : 62, t + d); o.frequency.exponentialRampToValueAtTime(34, t + d + 0.18);
    g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime((i ? 0.22 : 0.32) * vol, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.26);
    o.connect(g).connect(bus); o.start(t + d); o.stop(t + d + 0.3);
  });
}
function dreamBeat() {
  if (!dream) return;
  if (dream.bpm <= 0) { dream.beatTimer = setTimeout(dreamBeat, 400); return; }   // the film keeps its own heartbeat
  const t = ctx.currentTime;
  [0, 0.24].forEach((d, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(i ? 52 : 62, t + d); o.frequency.exponentialRampToValueAtTime(34, t + d + 0.18);
    g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(i ? 0.22 : 0.32, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.26);
    o.connect(g).connect(dream.bus); o.start(t + d); o.stop(t + d + 0.3);
  });
  dream.beatTimer = setTimeout(dreamBeat, 60000 / dream.bpm);
}
function dreamSong() {
  if (!dream) return;
  const t = ctx.currentTime, f0 = 220 + Math.random() * 140, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (1.25 + Math.random() * 0.3), t + 1.4);
  o.frequency.linearRampToValueAtTime(f0 * 0.9, t + 3.2);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 1.2); g.gain.linearRampToValueAtTime(0.0001, t + 3.4);
  o.connect(g).connect(dream.bus); o.start(t); o.stop(t + 3.5);
  dream.songTimer = setTimeout(dreamSong, 6000 + Math.random() * 5000);
}

export const Sound = {
  get enabled() { return enabled; },
  unlock() { ensure(); },
  setEnabled(v) { enabled = !!v; if (master) master.gain.value = enabled ? 1 : 0; if (!enabled) this.stopMusic(); },
  setVoice(v) { voice = !!v; },
  setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); },

  key()      { tone(1400 + Math.random() * 200, 0.025, 'square', 0.012); },
  laser(mult = 1) { tone(1800 + mult * 150, 0.16, 'sawtooth', 0.06, 0, 120); },
  explode(big = false) { noise(big ? 0.9 : 0.45, big ? 0.22 : 0.14, 0.05); tone(big ? 55 : 80, big ? 0.6 : 0.3, 'sine', 0.14, 0.05); },
  correct(mult = 1) { const b = 520 * Math.pow(1.06, Math.min(mult - 1, 6) * 2); tone(b, 0.07, 'sine', 0.06); tone(b * 1.5, 0.12, 'sine', 0.06, 0.05); },
  fast()     { tone(1568, 0.08, 'triangle', 0.05, 0.08); tone(2093, 0.14, 'triangle', 0.05, 0.14); },
  wrong()    { tone(190, 0.22, 'sawtooth', 0.07, 0, 110); tone(140, 0.25, 'square', 0.04); },
  impact()   { tone(110, 0.5, 'sawtooth', 0.14, 0, 40); noise(0.7, 0.2, 0.02); },
  alarm()    { tone(880, 0.12, 'square', 0.035); tone(660, 0.12, 'square', 0.035, 0.14); },
  multUp(m)  { [0, 4, 7, 12].forEach((s, i) => tone(440 * Math.pow(2, (s + m * 2) / 12), 0.1, 'triangle', 0.06, i * 0.05)); },
  repair()   { [523, 659, 784].forEach((f, i) => tone(f, 0.18, 'sine', 0.05, i * 0.07)); },
  levelUp()  { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, i * 0.08)); },
  bossWarn() { for (let i = 0; i < 3; i++) tone(220, 0.35, 'sawtooth', 0.07, i * 0.45, 330); },
  record()   { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, i * 0.09)); },
  click()    { tone(600, 0.05, 'square', 0.03); tone(900, 0.07, 'sine', 0.03, 0.02); },
  gameOver() { tone(300, 1.2, 'sawtooth', 0.09, 0, 40); noise(1.4, 0.25, 0.1); },


  // ── Dreamspace (opening) ──
  dreamStart() {
    if (dream || !enabled || !ensure()) return;
    const bus = ctx.createGain(); bus.gain.setValueAtTime(0.0001, ctx.currentTime); bus.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 3); bus.connect(master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(bus);
    const nodes = [];
    [[55, 0.09], [82.4, 0.05], [110.3, 0.025]].forEach(([f, v]) => {
      const o = ctx.createOscillator(); o.frequency.value = f; const g = ctx.createGain(); g.gain.value = v;
      const l = ctx.createOscillator(); l.frequency.value = 0.07 + Math.random() * 0.08; const lg = ctx.createGain(); lg.gain.value = f * 0.012;
      l.connect(lg).connect(o.frequency); o.connect(g).connect(lp); o.start(); l.start(); nodes.push(o, l);
    });
    dream = { bus, nodes, bpm: 54, beatTimer: null, songTimer: null };
    dream.beatTimer = setTimeout(dreamBeat, 1400);
    dream.songTimer = setTimeout(dreamSong, 4000);
  },
  /** Heartbeat speed (beats per minute) — the awakening speeds it up. */
  dreamPulse(bpm) { if (dream) dream.bpm = bpm; },
  dreamStop(fade = 0.8) {
    if (!dream) return;
    const d = dream; dream = null;
    clearTimeout(d.beatTimer); clearTimeout(d.songTimer);
    const t = ctx.currentTime; d.bus.gain.cancelScheduledValues(t); d.bus.gain.setValueAtTime(d.bus.gain.value, t); d.bus.gain.linearRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => { d.nodes.forEach(n => { try { n.stop(); } catch {} }); try { d.bus.disconnect(); } catch {} }, fade * 1000 + 100);
  },
  /** A neural connection forming: a fingertip on a glass of water. */
  chime(step = Math.floor(Math.random() * PENTA.length)) {
    const f = 1046.5 * Math.pow(2, PENTA[step % PENTA.length] / 12);
    tone(f, 0.9, 'sine', 0.018); tone(f * 2.76, 0.35, 'sine', 0.005);
  },
  /** Vyom's signal: old-radio crackle over a warm hum. */
  crackle() { fnoise(0.18, 0.018, 'bandpass', 2400 + Math.random() * 1600, 0, 2.5); tone(118, 0.22, 'sine', 0.012); },
  /** The player's thought forming: an almost-subliminal exhale. */
  whisper() { fnoise(0.7, 0.012, 'highpass', 3200, 0, 0.6); },
  /** "Pay attention" — one clean bell note. */
  bell() { tone(880, 2.2, 'sine', 0.06); tone(1760, 1.4, 'sine', 0.02); tone(2637, 0.8, 'sine', 0.008); },
  // ── Cold-open film ──
  /** One heartbeat (lub-dub), on the film's own clock. */
  heartbeat() { if (enabled && ensure()) lubDub(master, 0.9); },
  /** Pod monitor beep. */
  beep() { tone(1318, 0.07, 'sine', 0.022); },
  /** Soft two-tone pod alarm. */
  alarmSoft() { tone(660, 0.22, 'triangle', 0.04); tone(880, 0.3, 'triangle', 0.04, 0.24); },
  /** Steam / pressure hiss. */
  hiss(dur = 1.5, vol = 0.05) { fnoise(dur, vol, 'highpass', 2600, 0, 0.7); },
  /** The canopy seal releasing. */
  clunk() { tone(70, 0.35, 'sine', 0.2); tone(140, 0.12, 'square', 0.03); fnoise(0.25, 0.08, 'lowpass', 600); },
  /** A rush of air (title, push into the eye). */
  whoosh(dur = 1.2, vol = 0.6) {
    if (!enabled || !ensure()) return;
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(2800, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06 * vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur + 0.05);
  },
  /** The first breath after seven years. */
  gasp() { fnoise(0.7, 0.05, 'bandpass', 1100, 0, 0.9); fnoise(0.5, 0.025, 'highpass', 3000, 0.05, 0.5); },

  /** Satisfying keypad tap inside the dream. */
  tap() { tone(1250, 0.05, 'sine', 0.035); tone(620, 0.04, 'triangle', 0.02); },
  /** The awakening: heartbeat races, chimes pile up, then everything stops. */
  crescendo(ms = 2200) {
    if (!enabled || !ensure()) return;
    Sound.dreamPulse(150);
    const n = 18;
    for (let i = 0; i < n; i++) setTimeout(() => Sound.chime(i), (ms * 0.85) * Math.pow(i / n, 0.7));
    tone(110, ms / 1000, 'sawtooth', 0.025, 0, 440);
    fnoise(ms / 1000, 0.03, 'bandpass', 900, 0, 0.8);
    setTimeout(() => Sound.dreamStop(0.08), ms);
  },

  startMusic() {
    if (musicOn || !ensure()) return;
    musicOn = true;
    musicBus = ctx.createGain(); musicBus.gain.value = 0.055; musicBus.connect(master);
    [55, 82.41].forEach(f => { const o = ctx.createOscillator(); o.frequency.value = f; o.connect(musicBus); o.start(); });
    [130.81, 155.56, 196].forEach(f => {
      const o = ctx.createOscillator(); o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.1; o.connect(g).connect(musicBus); o.start();
      const v = ctx.createOscillator(); v.frequency.value = 0.2 + Math.random() * 0.3;
      const vg = ctx.createGain(); vg.gain.value = 1.2; v.connect(vg).connect(o.frequency); v.start();
    });
    const notes = [523.25, 659.25, 783.99, 659.25, 523.25, 392, 466.16, 392];
    let i = 0;
    const blip = () => {
      if (!musicOn) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = notes[i++ % notes.length] * (intensity > 0.7 && i % 2 ? 2 : 1);
      g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.25);
      // Low pulse on the beat once things heat up
      if (intensity > 0.35 && i % 2 === 0) {
        const k = ctx.createOscillator(), kg = ctx.createGain();
        k.frequency.setValueAtTime(90, t); k.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        kg.gain.setValueAtTime(0.25 * intensity, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        k.connect(kg).connect(musicBus); k.start(t); k.stop(t + 0.2);
      }
      blipTimer = setTimeout(blip, 620 - intensity * 360);
    };
    blipTimer = setTimeout(blip, 600);
  },
  stopMusic() {
    musicOn = false; clearTimeout(blipTimer);
    if (musicBus && ctx) {
      const bus = musicBus; musicBus = null;
      bus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => { try { bus.disconnect(); } catch {} }, 700);
    }
  },
};

// ── Voice (Web Speech) — sparingly, only for big moments ──
export function speak(text) {
  if (!enabled || !voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02; u.pitch = 0.85; u.volume = 0.8;
    speechSynthesis.speak(u);
  } catch {}
}
