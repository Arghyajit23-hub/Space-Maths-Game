// ════════════════════════════════════════════════════════════════
//  AUDIO — procedural Web Audio (no files). Reused from v1, routed
//  through a master bus, with an intensity-aware soundtrack.
// ════════════════════════════════════════════════════════════════

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null, master = null, musicBus = null, musicOn = false, blipTimer = null;
let enabled = true;
let intensity = 0;           // 0..1 — drives soundtrack tempo
try { enabled = localStorage.getItem('sm_sound') !== 'off'; } catch {}

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

export const Sound = {
  get enabled() { return enabled; },
  unlock() { ensure(); },
  toggle() {
    enabled = !enabled;
    try { localStorage.setItem('sm_sound', enabled ? 'on' : 'off'); } catch {}
    if (master) master.gain.value = enabled ? 1 : 0;
    return enabled;
  },
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
  if (!enabled || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02; u.pitch = 0.85; u.volume = 0.8;
    speechSynthesis.speak(u);
  } catch {}
}
