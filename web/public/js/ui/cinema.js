// ════════════════════════════════════════════════════════════════
//  CINEMA — the opening as a short film, around the dreamspace.
//
//  'open' (after "WHO ARE YOU?" … "There you are."):
//    0 Title card        EARTH · 2047 / CRYO VAULT
//    1 Wide shot         perspective dolly into a vault of pods (3D)
//    2 Side dolly        along pod 07·114, feet → head: the sleeper
//    3 Insert            the pod screen: WAKE SEQUENCE · AUTHORISED: VYOM
//    4 Close-up          the face through the glass; frost melts, first breath
//    5 Extreme close-up  the eye dreaming (REM) → push in → the dream
//  'wake' (after Vyom's test, under the dream's shatter):
//    first person: light through closed lids, blinks, focus, the canopy
//    hisses open in steam, STASIS ENDED, white flash → the game.
//
//  playCinema(kind, { name }, onDone) · renderCinema(ctx, now) · cinemaKey(e)
//  All drawing is canvas + one vector illustration (cinema-art.js) that is
//  rasterised once per film. Letterbox bars, captions and SKIP are DOM.
// ════════════════════════════════════════════════════════════════

import { $ } from './dom.js';
import { esc } from '../core/util.js';
import { VIEW } from '../config.js';
import { Sound } from '../services/audio.js';
import { podSVG, faceFrontSVG, CANOPY, HAND, PANEL, FRONT_EYE, FRONT_MOUTH, FRONT_LENS } from './cinema-art.js';
import { drawShipShape } from '../game/render.js';

let C = null;
let reduced = false;
export function setCinemaReducedMotion(v) { reduced = !!v; }
export const cinemaActive = () => !!C;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeOut = p => 1 - Math.pow(1 - p, 3);
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const rand = (a, b) => a + Math.random() * (b - a);

// ── Glow sprites ──
const sprites = {};
function sprite(color) {
  if (sprites[color]) return sprites[color];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color); gr.addColorStop(0.35, color + '88'); gr.addColorStop(1, color + '00');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (sprites[color] = c);
}

// ════════════════════════════════════════════
//  Assets: the illustration rasterised whole and as close-up crops
// ════════════════════════════════════════════
const CROPS = {
  full: { vb: [0, 0, 1600, 900], px: 2400 },
  top: { vb: [0, 0, 512, 512], px: 1500 },          // the face seen from above (front portrait)
  eye: { vb: [128, 186, 140, 105], px: 1600 },      // left eye behind the lens
  face: { vb: [0, 0, 512, 512], px: 1100 },
};
const POD_SIZE = 'viewBox="0 0 1600 900" width="1600" height="900"';
const FACE_SIZE = 'viewBox="0 0 512 512" width="512" height="512"';
async function raster(svg, crop) {
  const [x, y, w, h] = crop.vb, W = crop.px, H = Math.round(W * h / w);
  const src = svg.replace(svg.includes(POD_SIZE) ? POD_SIZE : FACE_SIZE, `viewBox="${x} ${y} ${w} ${h}" width="${W}" height="${H}"`);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  await img.decode();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  c.getContext('2d').drawImage(img, 0, 0, W, H);
  return { canvas: c, x, y, w, h };
}

/** Procedural frost for a world rectangle, `scale` canvas px per world unit. */
function makeFrost(x0, y0, w, h, scale, density = 1, size = 1) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale); g.translate(-x0, -y0);
  g.fillStyle = 'rgba(225,232,255,0.07)'; g.fillRect(x0, y0, w, h);
  const edgeBias = () => { // more frost near the rim of the canopy
    const u = Math.random();
    return Math.random() < 0.55 ? { x: x0 + Math.random() * w, y: y0 + h - Math.pow(Math.random(), 2) * h * 0.6 } : { x: x0 + Math.random() * w, y: y0 + u * h };
  };
  for (let i = 0; i < 900 * density; i++) {
    const p = edgeBias(), r = rand(1, 9) * size;
    g.fillStyle = `rgba(235,240,255,${rand(0.02, 0.07).toFixed(3)})`;
    g.beginPath(); g.arc(p.x, p.y, r, 0, 6.283); g.fill();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 220 * density; i++) {
    const p = edgeBias(); let a = rand(0, 6.283);
    const len = rand(6, 26) * size, lw = rand(0.35, 0.9) * Math.max(0.35, size);
    g.strokeStyle = `rgba(245,248,255,${rand(0.18, 0.45).toFixed(3)})`; g.lineWidth = lw;
    const branch = (x, y, ang, l, depth) => {
      const x2 = x + Math.cos(ang) * l, y2 = y + Math.sin(ang) * l;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      if (depth <= 0) return;
      for (let k = 1; k <= 3; k++) {
        const f = k / 4, bx = x + (x2 - x) * f, by = y + (y2 - y) * f;
        branch(bx, by, ang + 1.05, l * 0.35, depth - 1); branch(bx, by, ang - 1.05, l * 0.35, depth - 1);
      }
    };
    branch(p.x, p.y, a, len, 1);
  }
  return { canvas: c, x: x0, y: y0, w, h, scratch: null };
}

/** Draw frost, optionally with a melted hole (radius r, world units) around (mx, my). */
function drawFrost(ctx, fr, alpha, mx, my, r, clip = CANOPY) {
  let src = fr.canvas;
  if (r > 0) {
    if (!fr.scratch) { fr.scratch = document.createElement('canvas'); fr.scratch.width = fr.canvas.width; fr.scratch.height = fr.canvas.height; }
    const s = fr.scratch, g = s.getContext('2d'), k = fr.canvas.width / fr.w;
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, s.width, s.height); g.drawImage(fr.canvas, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    const cx = (mx - fr.x) * k, cy = (my - fr.y) * k, rr = r * k;
    const gr = g.createRadialGradient(cx, cy, rr * 0.55, cx, cy, rr);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s.width, s.height);
    src = s;
  }
  ctx.save(); ctx.globalAlpha = alpha;
  if (clip) ctx.clip(new Path2D(clip));
  ctx.drawImage(src, fr.x, fr.y, fr.w, fr.h);
  ctx.restore();
}

// ════════════════════════════════════════════
//  Film frame (letterbox) and camera
// ════════════════════════════════════════════
function frameBox() {
  const W = VIEW.W, H = VIEW.H, r = W / H;
  const asp = r >= 1 ? clamp(Math.max(r, 2.1), 1, 2.39) : clamp(r, 0.8, 1);
  let fw = W, fh = W / asp;
  if (r >= 1) fh = Math.min(fh, H * 0.86);           // always leave room for captions
  if (fh > H) fh = H;
  fw = Math.min(W, fh * Math.max(asp, r >= 1 ? 2.1 : asp));
  return { W, H, fw, fh, fx: (W - fw) / 2, fy: (H - fh) / 2 };
}
/** Point the camera: world point (cx, cy) at frame centre, `visW` world units wide (cover). */
function camera(ctx, F, cx, cy, visW) {
  // Landscape: cover the frame. Portrait: show ~60% of the width so faces aren't cropped.
  const s = F.fw < F.fh * 1.2 ? F.fw / (visW * 0.6) : Math.max(F.fw / visW, F.fh / (visW * 0.5625));
  ctx.translate(F.fx + F.fw / 2, F.fy + F.fh / 2); ctx.scale(s, s); ctx.translate(-cx, -cy);
  return s;
}

// ════════════════════════════════════════════
//  Entry
// ════════════════════════════════════════════
export function playCinema(kind, { name = '' } = {}, onDone) {
  stopCinema();
  C = { kind, name, onDone, t0: performance.now(), last: performance.now(), shot: -1, assets: null, ready: kind === 'wake',
    beatAt: 0, bpm: 0, fired: new Set(), dust: [], drips: [], puffs: [], steam: [], drops: [] };
  const root = $('cinemaScreen');
  root.innerHTML = `<div class="cn-bar top" id="cnTop"></div><div class="cn-bar bot" id="cnBot"><div class="cn-cap" id="cnCap"></div></div>
    <div class="cn-title" id="cnTitle"></div>
    <button class="cn-skip" id="cnSkip" type="button">SKIP →</button>`;
  $('cnSkip').onclick = e => { e.stopPropagation(); finish(); };
  setTimeout(() => C && $('cnSkip')?.classList.add('on'), 3000);
  for (let i = 0; i < 70; i++) C.dust.push({ x: rand(-3, 3), y: rand(-1.6, 1.2), z: rand(1, 9), s: rand(0.5, 1.6), ph: rand(0, 6.28) });
  C.shots = kind === 'open' ? OPEN : kind === 'launch' ? LAUNCH : WAKE;
  C.total = C.shots.reduce((s, x) => s + x.dur, 0);
  const film = C;
  if (kind === 'open') {
    Sound.dreamPulse(0);
    const svg = podSVG(name), asleep = faceFrontSVG({ eyes: 'closed', bg: 'pillow' });
    Promise.all([raster(svg, CROPS.full), raster(asleep, CROPS.top), raster(asleep, CROPS.eye)]).then(([full, top, eye]) => {
      if (C !== film) return;
      const glass = [190, 326, 1230, 196];
      C.assets = { full, top, eye,
        frostFull: makeFrost(...glass, 1.2, 1),
        frostTop: makeFrost(0, 0, 512, 512, 3, 1.5, 0.5),
        frostLens: makeFrost(FRONT_LENS.x, FRONT_LENS.y, FRONT_LENS.w, FRONT_LENS.h, 14, 0.5, 0.12) };
      C.ready = true;
    }).catch(() => { if (C === film) finish(); });
  } else if (kind === 'launch') {
    C.ready = false;
    raster(faceFrontSVG({ eyes: 'open', bg: 'none' }), CROPS.face).then(face => {
      if (C !== film) return;
      C.assets = { face }; C.ready = true;
    }).catch(() => { if (C === film) finish(); });
  }
}

export function stopCinema() { C = null; }

function finish() {
  if (!C) return;
  const done = C.onDone; C = null;
  done?.();
}

export function cinemaKey(e) {
  if (!C) return false;
  if (e.key === 'Escape' && $('cnSkip')?.classList.contains('on')) { e.preventDefault(); finish(); }
  return true;
}

function caption(text) {
  const el = $('cnCap'); if (!el || el.dataset.t === text) return;
  el.dataset.t = text; el.classList.remove('on'); void el.offsetWidth;
  el.innerHTML = text; if (text) el.classList.add('on');
}
function title(html) {
  const el = $('cnTitle'); if (!el || el.dataset.t === html) return;
  el.dataset.t = html; el.innerHTML = html;
}
function once(key, fn) { if (!C.fired.has(key)) { C.fired.add(key); fn(); } }

/** Heartbeat on the film's own clock (the monitor beeps with it). */
function heart(t) {
  if (C.bpm <= 0) return false;
  if (t >= C.beatAt) { C.beatAt = t + 60 / C.bpm; Sound.heartbeat(); if (C.kind === 'open') Sound.beep(); return true; }
  return false;
}

// ════════════════════════════════════════════
//  Render
// ════════════════════════════════════════════
export function renderCinema(ctx, now) {
  if (!C) return;
  const F = frameBox();
  const dt = Math.min(0.05, (now - C.last) / 1000); C.last = now;
  // Letterbox bars
  const top = $('cnTop'), bot = $('cnBot');
  if (top) { top.style.height = `${F.fy}px`; bot.style.height = `${F.H - F.fy - F.fh}px`; top.style.width = bot.style.width = `${F.W}px`; }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, F.W, F.H);
  // Hold on the title card until the art is ready
  if (!C.ready) C.t0 = now - Math.min(now - C.t0, (C.shots[0].dur - 0.6) * 1000);
  const t = (now - C.t0) / 1000;
  if (t >= C.total) return finish();
  let acc = 0, i = 0;
  while (i < C.shots.length - 1 && t >= acc + C.shots[i].dur) { acc += C.shots[i].dur; i++; }
  const shot = C.shots[i], st = t - acc, p = st / shot.dur;
  if (i !== C.shot) { C.shot = i; shot.enter?.(); }
  ctx.save();
  ctx.beginPath(); ctx.rect(F.fx, F.fy, F.fw, F.fh); ctx.clip();
  shot.draw(ctx, F, st, p, dt, t);
  ctx.restore();
  // Cuts: a short dip to black at shot edges
  const fade = Math.max(shot.fadeIn ? 1 - seg(st, 0, shot.fadeIn) : 0, shot.fadeOut ? seg(st, shot.dur - shot.fadeOut, shot.dur) : 0);
  if (fade > 0.001) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(F.fx, F.fy, F.fw, F.fh); }
  // Film grain + vignette
  vignette(ctx, F);
}

function vignette(ctx, F) {
  const g = ctx.createRadialGradient(F.fx + F.fw / 2, F.fy + F.fh / 2, Math.min(F.fw, F.fh) * 0.35, F.fx + F.fw / 2, F.fy + F.fh / 2, Math.hypot(F.fw, F.fh) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(F.fx, F.fy, F.fw, F.fh);
  if (reduced) return;
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let k = 0; k < 40; k++) ctx.fillRect(F.fx + Math.random() * F.fw, F.fy + Math.random() * F.fh, 1.5, 1.5);
}

// ════════════════════════════════════════════
//  OPEN — the cold open
// ════════════════════════════════════════════
const OPEN = [
  // 0 · Title card
  { dur: 4.2, fadeOut: 0.5,
    enter() { title('<div class="l1">EARTH · 2047</div><div class="l2">INTERCEPTOR CRYO VAULT · LUNAR GATEWAY</div>'); caption(''); Sound.whoosh(1.8, 0.4); },
    draw(ctx, F, st) {
      const g = ctx.createRadialGradient(F.fx + F.fw / 2, F.fy + F.fh * 0.6, 0, F.fx + F.fw / 2, F.fy + F.fh * 0.6, F.fw * 0.6);
      g.addColorStop(0, `rgba(40,16,70,${0.35 * seg(st, 0.5, 3)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(F.fx, F.fy, F.fw, F.fh);
    } },
  // 1 · Wide: the vault
  { dur: 7, fadeIn: 0.8, fadeOut: 0.35,
    enter() { title(''); caption('CRYO VAULT 7 · <b>1,204</b> INTERCEPTORS IN STASIS'); C.bpm = 7; C.beatAt = 0; },
    draw(ctx, F, st, p, dt, t) {
      heart(t);
      ctx.save(); camera(ctx, F, 800, 450, 1600);
      vault(ctx, lerp(-3.2, 0.9, ease(p)), lerp(-0.25, -0.05, ease(p)), Math.sin(st * 0.3) * 0.2, st, dt);
      ctx.restore();
    } },
  // 2 · Side dolly along pod 07·114
  { dur: 7.5, fadeIn: 0.35, fadeOut: 0.35,
    enter() { caption('POD 07·114 · IN STASIS <b>7 YEARS, 142 DAYS</b>'); C.bpm = 7; },
    draw(ctx, F, st, p, dt, t) {
      const beat = heart(t);
      const A = C.assets, cx = lerp(1160, 560, ease(p)), z = lerp(980, 900, p);
      ctx.save(); camera(ctx, F, cx, 470, z);
      bayWall(ctx, cx, st);
      ctx.drawImage(A.full.canvas, 0, 0, 1600, 900);
      hand(ctx, st > 4.6 && st < 5.6 ? Math.sin((st - 4.6) * Math.PI * 3) ** 2 * 0.7 : 0);
      drawFrost(ctx, A.frostFull, 0.92, 0, 0, 0);
      monitor(ctx, st, 7, 'STASIS', beat);
      podLights(ctx, st);
      crimson(ctx, st, 0, 0, 1600, 900);
      ctx.restore();
      bokehFront(ctx, F, st, cx);
    } },
  // 3 · Insert: the pod screen
  { dur: 3.8, fadeIn: 0.2, fadeOut: 0.3,
    enter() { caption(''); Sound.alarmSoft(); setTimeout(() => C && Sound.alarmSoft(), 900); C.bpm = 9; },
    draw(ctx, F, st, p, dt, t) { const beat = heart(t); screenInsert(ctx, F, st, p, beat); } },
  // 4 · Close-up from above: the face through the pod window; frost melts, first breath
  { dur: 7.2, fadeIn: 0.3, fadeOut: 0.3,
    enter() { caption('CORE TEMPERATURE RISING · <b>6°C → 31°C</b>'); C.bpm = 12; Sound.hiss(5, 0.025); },
    draw(ctx, F, st, p, dt, t) {
      C.bpm = lerp(12, 46, seg(st, 0.5, 6.5));
      heart(t);
      const A = C.assets;
      ctx.save(); camera(ctx, F, 256, lerp(282, 262, ease(p)), lerp(600, 470, ease(p)));
      ctx.drawImage(A.top.canvas, 0, 0, 512, 512);
      podWindow(ctx, st);
      const melt = seg(st, 0.8, 6.2);
      breathTop(ctx, st, dt, 4.3);
      drawFrost(ctx, A.frostTop, lerp(0.96, 0.4, melt), 256, 262, easeOut(melt) * 330, null);
      drips(ctx, st, dt, melt, 256, 262, easeOut(melt) * 300, 520);
      glassGlint(ctx, st, 0, 0, 512, 512);
      ctx.restore();
      if (st > 4.3) once('gasp', () => Sound.gasp());
    } },
  // 5 · Extreme close-up: the eye behind the lens dreams → push into the dream
  { dur: 5, fadeIn: 0.25,
    enter() { caption('NEURAL ACTIVITY <b>DETECTED</b>'); C.bpm = 52; },
    draw(ctx, F, st, p, dt, t) {
      heart(t);
      const A = C.assets, push = seg(st, 3.4, 5), E = FRONT_EYE;
      const visW = lerp(lerp(150, 118, seg(st, 0, 3.4)), 8, Math.pow(push, 2.2));
      const jx = Math.sin(st * 37) * 0.15 * (1 - push), jy = Math.cos(st * 29) * 0.1;
      ctx.save(); camera(ctx, F, E.x + jx, E.y + 1 + jy, visW);
      ctx.fillStyle = '#141026'; ctx.fillRect(100, 160, 200, 160);
      ctx.drawImage(A.eye.canvas, A.eye.x, A.eye.y, A.eye.w, A.eye.h);
      // REM: the eye moving under the closed lid
      const rx = E.x + Math.sin(st * 6.5) * 8 + Math.sin(st * 17) * 1.6;
      const g = ctx.createRadialGradient(rx, E.y - 1, 0, rx, E.y - 1, 12);
      g.addColorStop(0, 'rgba(255,214,186,0.42)'); g.addColorStop(1, 'rgba(255,214,186,0)');
      ctx.fillStyle = g; ctx.fillRect(E.x - 30, E.y - 16, 60, 30);
      // Frost on the lashes, then a meltwater drop from the corner of the eye
      const m = seg(st, 0, 3);
      ctx.fillStyle = `rgba(240,246,255,${(0.6 * (1 - m)).toFixed(3)})`;
      for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(E.x - 17 + k * 5, E.y + 8 + (k % 3), 0.5 + (k % 2) * 0.35, 0, 6.283); ctx.fill(); }
      if (m > 0.4) {
        const dy = Math.min(26, (st - 1.3) * 9), a = clamp(1.6 - st / 3, 0, 1);
        ctx.fillStyle = `rgba(220,235,255,${(0.6 * a).toFixed(3)})`;
        ctx.beginPath(); ctx.ellipse(E.x - 22, E.y + 4 + dy, 1.2, 1.8, 0, 0, 6.283); ctx.fill();
      }
      // Frost on the lens melting from the centre
      drawFrost(ctx, A.frostLens, 0.85 * (1 - seg(st, 2.4, 3.4)), E.x, E.y, easeOut(seg(st, 0, 3)) * 70, null);
      ctx.restore();
      if (push > 0) {
        once('dive', () => Sound.whoosh(1.4, 0.9));
        ctx.fillStyle = `rgba(0,0,0,${Math.pow(push, 1.5)})`; ctx.fillRect(F.fx, F.fy, F.fw, F.fh);
      }
    } },
];

// ── The vault: a real perspective projection, so the dolly has parallax ──
function vault(ctx, camZ, camY, camX, st, dt) {
  const VPX = 800, VPY = 380, FOC = 1050;
  const P = (x, y, z) => { const d = Math.max(0.05, z - camZ); return [VPX + (x - camX) * FOC / d, VPY + (y - camY) * FOC / d, FOC / d]; };
  const fogOf = z => clamp((z - camZ) / 30, 0, 0.92);
  ctx.fillStyle = '#06041a'; ctx.fillRect(-200, -200, 2000, 1300);
  const far = ctx.createRadialGradient(VPX, VPY, 0, VPX, VPY, 700);
  far.addColorStop(0, 'rgba(70,32,96,0.55)'); far.addColorStop(0.4, 'rgba(26,0,64,0.3)'); far.addColorStop(1, 'rgba(6,4,26,0)');
  ctx.fillStyle = far; ctx.fillRect(-200, -200, 2000, 1300);
  // Floor + ceiling grids
  ctx.lineWidth = 1.2;
  for (let x = -7; x <= 7; x += 1.4) {
    const a = P(x, 1.2, camZ + 0.4), b = P(x, 1.2, 46);
    ctx.strokeStyle = 'rgba(232,168,124,0.07)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const c = P(x, -1.9, camZ + 0.4), d = P(x, -1.9, 46);
    ctx.strokeStyle = 'rgba(212,229,247,0.04)'; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
  }
  for (let z = Math.ceil(camZ) + 1; z < 46; z += 2.2) {
    const f = 1 - fogOf(z);
    const a = P(-7, 1.2, z), b = P(7, 1.2, z);
    ctx.strokeStyle = `rgba(232,168,124,${(0.08 * f).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    // ceiling ribs
    const c = P(-7, -1.9, z), d = P(7, -1.9, z), e = P(-7, 1.2, z), g = P(7, 1.2, z);
    ctx.strokeStyle = `rgba(150,130,200,${(0.12 * f).toFixed(3)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.lineTo(g[0], g[1]); ctx.stroke();
    ctx.lineWidth = 1.2;
    // ceiling light strips
    for (const lx of [-1.3, 1.3]) {
      const q = [P(lx - 0.12, -1.88, z), P(lx + 0.12, -1.88, z), P(lx + 0.12, -1.88, z + 1.2), P(lx - 0.12, -1.88, z + 1.2)];
      ctx.fillStyle = `rgba(255,214,180,${(0.5 * f).toFixed(3)})`;
      ctx.beginPath(); q.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    }
  }
  // Pods, far to near
  const pods = [];
  for (let z = 4.6; z < 40; z += 3.4) for (const x of [-2.7, 0, 2.7]) pods.push({ x, z, hero: x === 0 && z === 4.6, k: (x * 7 + z * 13) % 5 });
  pods.sort((a, b) => b.z - a.z);
  for (const pod of pods) if (pod.z - camZ > 0.4) drawVaultPod(ctx, P, pod, fogOf(pod.z), st, camX);
  // Light beam onto the hero pod
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const t1 = P(-0.25, -1.88, 5.4), t2 = P(0.25, -1.88, 5.4), b1 = P(-0.95, 0.6, 5.6), b2 = P(0.95, 0.6, 5.6);
  const bg = ctx.createLinearGradient(0, t1[1], 0, b1[1]);
  bg.addColorStop(0, 'rgba(255,214,180,0.16)'); bg.addColorStop(1, 'rgba(232,168,124,0.03)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b1[0], b1[1]); ctx.closePath(); ctx.fill();
  // Dust in the beam
  const sp = sprite('#ffe2c8');
  for (const d of C.dust) {
    d.y += dt * 0.05; d.x += Math.sin(st * 0.5 + d.ph) * dt * 0.03; if (d.y > 1.2) d.y = -1.6;
    const [x, y, s] = P(d.x * 0.5, d.y, 5.5 + d.z * 0.25);
    const inBeam = Math.abs(d.x * 0.5) < 0.5 + (d.y + 1.9) * 0.2;
    ctx.globalAlpha = inBeam ? 0.7 : 0.15;
    const r = Math.max(1, s * 0.012 * d.s);
    ctx.drawImage(sp, x - r * 2, y - r * 2, r * 4, r * 4);
  }
  ctx.restore();
  crimson(ctx, st, -200, -200, 2000, 1300);
}

function drawVaultPod(ctx, P, pod, fog, st, camX) {
  const w = 1.15, L = 2.7, yb = 1.2, yt = 0.62, yr = 0.4, { x, z } = pod;
  const poly = (pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([a, b], k) => (k ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fill(); };
  ctx.save(); ctx.globalAlpha = 1 - fog;
  // floor shadow
  const sh = P(x, yb, z + L / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], w * 0.75 * sh[2], 0.18 * sh[2], 0, 0, 6.283); ctx.fill();
  // visible side
  const sideX = camX < x - w / 2 ? x - w / 2 : camX > x + w / 2 ? x + w / 2 : null;
  if (sideX !== null) poly([P(sideX, yt, z), P(sideX, yt, z + L), P(sideX, yb, z + L), P(sideX, yb, z)], '#1a1630');
  // glass top + dome
  const NL = P(x - w / 2, yt, z), NR = P(x + w / 2, yt, z), FL = P(x - w / 2, yt, z + L), FR = P(x + w / 2, yt, z + L);
  const NRL = P(x - w * 0.32, yr, z), NRR = P(x + w * 0.32, yr, z), FRL = P(x - w * 0.32, yr, z + L), FRR = P(x + w * 0.32, yr, z + L);
  poly([NL, FL, FRL, FRR, FR, NR, NRR, NRL], pod.hero ? 'rgba(90,50,70,0.9)' : 'rgba(40,36,72,0.85)');
  if (pod.hero) { // warm interior and a sleeper's silhouette
    const c = P(x, yt, z + L / 2);
    const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], w * c[2]);
    g.addColorStop(0, `rgba(232,168,124,${0.55 + 0.1 * Math.sin(st * 2)})`); g.addColorStop(1, 'rgba(232,168,124,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(NL[0], NL[1]); [FL, FRL, FRR, FR, NR, NRR, NRL].forEach(([a, b]) => ctx.lineTo(a, b)); ctx.closePath(); ctx.fill();
  }
  poly([NL, FL, FRL, FRR, FR, NR, NRR, NRL], 'rgba(220,228,255,0.13)');
  ctx.strokeStyle = 'rgba(231,226,245,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(NRL[0], NRL[1]); ctx.lineTo(FRL[0], FRL[1]); ctx.moveTo(NRR[0], NRR[1]); ctx.lineTo(FRR[0], FRR[1]); ctx.stroke();
  // front cap
  const A = P(x - w / 2, yt, z), B = P(x + w / 2, yt, z), Cc = P(x + w / 2, yb, z), D = P(x - w / 2, yb, z);
  const gf = ctx.createLinearGradient(0, A[1], 0, D[1]); gf.addColorStop(0, '#2e2a48'); gf.addColorStop(1, '#0d0b1c');
  poly([A, B, Cc, D], gf);
  poly([A, NRL, NRR, B], 'rgba(200,200,240,0.12)');
  ctx.strokeStyle = pod.hero ? 'rgba(232,168,124,0.9)' : 'rgba(232,168,124,0.25)'; ctx.lineWidth = Math.max(1, A[2] * 0.012);
  ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
  // status light
  const s = P(x, (yt + yb) / 2, z), r = Math.max(1.5, s[2] * 0.03);
  const blink = pod.hero ? 0.6 + 0.4 * Math.sin(st * 3) : pod.k === 0 ? (Math.sin(st * 2 + z) > 0.6 ? 1 : 0.2) : 0.45;
  ctx.globalAlpha = (1 - fog) * blink;
  ctx.drawImage(sprite(pod.hero ? '#ffcf9f' : pod.k === 0 ? '#c0306a' : '#8a6cd8'), s[0] - r * 2, s[1] - r * 2, r * 4, r * 4);
  ctx.restore();
}

/** A sweeping crimson warning light (additive). */
function crimson(ctx, st, x, y, w, h) {
  const a = Math.max(0, Math.sin(st * 1.6)) ** 3 * 0.16;
  if (a < 0.005) return;
  const cx = x + w * (0.5 + Math.cos(st * 1.6) * 0.6);
  const g = ctx.createRadialGradient(cx, y + h * 0.2, 0, cx, y + h * 0.2, w * 0.5);
  g.addColorStop(0, `rgba(139,34,82,${a})`); g.addColorStop(1, 'rgba(139,34,82,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}

/** Behind the pod: the vault wall with out-of-focus lights. */
function bayWall(ctx, cx, st) {
  const g = ctx.createLinearGradient(0, 100, 0, 900);
  g.addColorStop(0, '#0d0924'); g.addColorStop(0.55, '#1a1036'); g.addColorStop(1, '#07051a');
  ctx.fillStyle = g; ctx.fillRect(-400, -100, 2400, 1100);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const par = (cx - 860) * 0.45;   // parallax: the wall moves slower than the pod
  for (let k = 0; k < 14; k++) {
    const x = ((k * 173) % 2200) - 300 + par, y = 140 + ((k * 97) % 220), r = 26 + (k % 4) * 12;
    ctx.globalAlpha = 0.18 + 0.08 * Math.sin(st * 0.8 + k);
    ctx.drawImage(sprite(k % 3 ? '#e8a87c' : '#8a6cd8'), x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  // floor glow
  const f = ctx.createRadialGradient(800, 760, 0, 800, 760, 800);
  f.addColorStop(0, 'rgba(232,168,124,0.12)'); f.addColorStop(1, 'rgba(232,168,124,0)');
  ctx.fillStyle = f; ctx.fillRect(-400, 600, 2400, 400);
}

/** Foreground bokeh in screen space (depth of field). */
function bokehFront(ctx, F, st, cx) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) {
    const x = F.fx + (((k * 331 + (1300 - cx) * 1.6) % (F.fw + 400)) + F.fw + 400) % (F.fw + 400) - 200, y = F.fy + F.fh * (0.15 + ((k * 0.37) % 0.8));
    const r = F.fh * (0.08 + (k % 3) * 0.04);
    ctx.globalAlpha = 0.07;
    ctx.drawImage(sprite('#ffe2c8'), x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function podLights(ctx, st) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const a = 0.5 + 0.5 * Math.sin(st * 2.2);
  ctx.globalAlpha = a; ctx.drawImage(sprite('#ffcf9f'), 760 - 9, 461 - 9, 18, 18);       // wristband
  ctx.globalAlpha = 0.8; ctx.drawImage(sprite('#ffcf9f'), 1440 - 10, 560 - 10, 20, 20);
  ctx.restore();
}

/** The live heart monitor on the pod's side panel. */
function monitor(ctx, st, bpm, label, beat) {
  const { x, y, w, h } = PANEL;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = 'rgba(232,168,124,0.12)'; ctx.lineWidth = 0.6;
  for (let gx = x; gx < x + w; gx += 12) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
  const period = 60 / Math.max(1, bpm), head = (st % 2.4) / 2.4;
  ctx.strokeStyle = '#ffb48a'; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let k = 0; k <= 140; k++) {
    const u = k / 140, tt = st - (head - u + (u > head ? 1 : 0)) * 2.4;
    const ph = ((tt % period) + period) % period / period;
    const v = ph < 0.04 ? Math.sin(ph / 0.04 * Math.PI) * -18 : ph < 0.07 ? Math.sin((ph - 0.04) / 0.03 * Math.PI) * 6 : 0;
    const px = x + 8 + u * (w - 70), py = y + h * 0.55 + v;
    if (Math.abs(u - head) < 0.02) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(px, py); continue; }
    k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = '#ffd9b8'; ctx.font = '700 22px "Space Grotesk", sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(String(Math.round(bpm)), x + w - 10, y + 34);
  ctx.font = '500 9px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(232,168,124,0.8)';
  ctx.fillText('BPM', x + w - 10, y + 48); ctx.fillText(label, x + w - 10, y + 62);
  if (beat) { ctx.fillStyle = 'rgba(255,180,138,0.25)'; ctx.fillRect(x, y, w, h); }
  ctx.restore();
}

/** The hand on the blanket; `twitch` 0..1 curls the fingers. */
function hand(ctx, twitch) {
  const { x, y } = HAND;
  ctx.save(); ctx.translate(x, y);
  const skin = ctx.createLinearGradient(0, -10, 0, 12); skin.addColorStop(0, '#d79a76'); skin.addColorStop(1, '#7c4a36');
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.moveTo(-2, -9); ctx.quadraticCurveTo(14, -12, 26, -7); ctx.lineTo(28, 9); ctx.quadraticCurveTo(12, 13, -2, 11); ctx.closePath(); ctx.fill();
  ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const by = -5 + k * 4.2, curl = 0.35 + k * 0.06 + twitch * (0.5 + 0.2 * Math.sin(k * 2));
    ctx.strokeStyle = k === 0 ? '#d99c78' : '#b97b5d'; ctx.lineWidth = 3.8 - k * 0.3;
    ctx.beginPath(); ctx.moveTo(26, by);
    const l1 = 9 - k * 0.6, a1 = curl * 0.6, l2 = 7 - k * 0.5, a2 = curl * 1.4;
    const x1 = 26 + Math.cos(a1) * l1, y1 = by + Math.sin(a1) * l1;
    ctx.lineTo(x1, y1); ctx.lineTo(x1 + Math.cos(a2) * l2, y1 + Math.sin(a2) * l2); ctx.stroke();
  }
  ctx.strokeStyle = '#c4876a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(6, -8); ctx.quadraticCurveTo(16, -14, 22, -11); ctx.stroke();
  ctx.restore();
}

/** The pod window seen from above: a metal frame, and heating coils that glow as the pod warms. */
function podWindow(ctx, st) {
  ctx.save();
  ctx.fillStyle = '#100c22';
  ctx.beginPath(); ctx.rect(-400, -400, 1312, 1312);
  ctx.roundRect(8, 8, 496, 496, 70); ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(232,168,124,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(8, 8, 496, 496, 70); ctx.stroke();
  const a = seg(st, 0.2, 2.5) * (0.55 + 0.15 * Math.sin(st * 5));
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,150,90,${(a * 0.75).toFixed(3)})`; ctx.lineWidth = 2.5;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.roundRect(-4 - k * 7, -4 - k * 7, 520 + k * 14, 520 + k * 14, 78 + k * 6); ctx.stroke(); }
  ctx.restore();
}

/** A slow light glint across the glass. */
function glassGlint(ctx, st, x, y, w, h) {
  const u = ((st * 0.12) % 1.4) - 0.2;
  const gx = x + w * u;
  const g = ctx.createLinearGradient(gx - 60, y, gx + 60, y + h * 0.3);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}

/** Seen from above: each breath fogs the glass over the mouth, then clears. */
function breathTop(ctx, st, dt, from) {
  if (st < from) return;
  const period = 1.7, k = ((st - from) % period) / period;
  const r = 30 + k * 70, a = Math.sin(k * Math.PI) * 0.28;
  const g = ctx.createRadialGradient(FRONT_MOUTH.x, FRONT_MOUTH.y, 0, FRONT_MOUTH.x, FRONT_MOUTH.y, r);
  g.addColorStop(0, `rgba(235,240,255,${a.toFixed(3)})`); g.addColorStop(0.7, `rgba(235,240,255,${(a * 0.4).toFixed(3)})`); g.addColorStop(1, 'rgba(235,240,255,0)');
  ctx.fillStyle = g; ctx.fillRect(FRONT_MOUTH.x - r, FRONT_MOUTH.y - r, r * 2, r * 2);
}

/** Meltwater running down the glass from the edge of the clearing. */
function drips(ctx, st, dt, melt, cx, cy, R, maxY) {
  if (melt > 0.15 && melt < 0.98 && C.drips.length < 30 && Math.random() < dt * 6) {
    const a = rand(0, 6.283);
    C.drips.push({ x: cx + Math.cos(a) * R * 0.85, y: cy + Math.sin(a) * R * 0.85, v: rand(6, 16), len: 0 });
  }
  for (const d of C.drips) {
    d.y += d.v * dt; d.len = Math.min(26, d.len + d.v * dt);
    ctx.strokeStyle = 'rgba(220,232,255,0.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(d.x, d.y - d.len); ctx.lineTo(d.x, d.y); ctx.stroke();
    ctx.fillStyle = 'rgba(240,246,255,0.6)'; ctx.beginPath(); ctx.arc(d.x, d.y, 1.6, 0, 6.283); ctx.fill();
  }
  C.drips = C.drips.filter(d => d.y < maxY);
}

/** Insert: the pod's own screen fills the frame. */
function screenInsert(ctx, F, st, p, beat) {
  const { fx, fy, fw, fh } = F, cx = fx + fw / 2, cy = fy + fh / 2;
  const zoom = 1 + p * 0.06, u = Math.min(fw / 900, fh / 420) * zoom;
  ctx.fillStyle = '#120a24'; ctx.fillRect(fx, fy, fw, fh);
  // scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let y = fy; y < fy + fh; y += 3) ctx.fillRect(fx, y, fw, 1);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(u, u);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const type = (txt, from, speed = 28) => txt.slice(0, Math.max(0, Math.floor((st - from) * speed)));
  ctx.font = '500 20px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(232,168,124,0.7)';
  ctx.fillText(type('POD 07·114 · CRYO CONTROL', 0.1), -400, -130);
  const blink = Math.floor(st * 3) % 2 === 0;
  ctx.font = '700 56px "Space Grotesk", sans-serif'; ctx.fillStyle = blink || st > 1.6 ? '#ffd9b8' : 'rgba(255,217,184,0.4)';
  ctx.fillText(type('WAKE SEQUENCE', 0.35, 22), -400, -50);
  ctx.font = 'italic 600 34px "Cormorant Garamond", serif'; ctx.fillStyle = '#e8a87c';
  ctx.fillText(type('authorised by: Vyom', 1.2, 26), -400, 8);
  // progress
  const pr = seg(st, 1.8, 3.6);
  ctx.strokeStyle = 'rgba(232,168,124,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(-400, 50, 800, 22);
  const g = ctx.createLinearGradient(-400, 0, 400, 0); g.addColorStop(0, '#d4956b'); g.addColorStop(1, '#8b2252');
  ctx.fillStyle = g; ctx.fillRect(-397, 53, 794 * pr, 16);
  ctx.font = '500 16px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(232,168,124,0.8)';
  ctx.fillText(`THAWING · ${Math.round(pr * 100)}%`, -400, 104);
  ctx.textAlign = 'right'; ctx.fillStyle = beat ? '#fff' : '#ffb48a'; ctx.font = '700 40px "Space Grotesk", sans-serif';
  ctx.fillText(`${Math.round(C.bpm)} BPM`, 400, -130 + 30);
  ctx.restore();
  const a = Math.max(0, Math.sin(st * 6)) * 0.12;
  ctx.fillStyle = `rgba(139,34,82,${a})`; ctx.fillRect(fx, fy, fw, fh);
}

// ════════════════════════════════════════════
//  WAKE — first person, inside the pod
// ════════════════════════════════════════════
let pov = null;
function povCanvas(w, h) {
  if (!pov) pov = document.createElement('canvas');
  if (pov.width !== w || pov.height !== h) { pov.width = w; pov.height = h; }
  return pov;
}

const WAKE = [
  { dur: 7.4, fadeOut: 0.25,
    enter() {
      title(''); caption(''); C.bpm = 64; C.beatAt = 1.2;
      C.drops = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), r: rand(0.004, 0.014) }));
    },
    draw(ctx, F, st, p, dt, t) {
      heart(t);
      if (st > 1.1) once('gasp', () => Sound.gasp());
      if (st > 4.1) once('open', () => { Sound.clunk(); Sound.hiss(2.6, 0.07); });
      if (st > 4.4) caption('STASIS ENDED · <b>7 YEARS, 142 DAYS</b>');
      if (st > 5.5) caption(`INTERCEPTOR <b>${esc((C.name || '').toUpperCase())}</b> · REPORT TO LAUNCH`);
      // Focus: render the view small and scale it up while the eyes adjust
      const focus = seg(st, 1.2, 4.6);
      const q = reduced ? 1 : lerp(0.035, 1, easeOut(focus));
      const w = Math.max(24, Math.round(F.fw * q)), h = Math.max(14, Math.round(F.fh * q));
      const c = povCanvas(w, h), g = c.getContext('2d');
      g.setTransform(w / F.fw, 0, 0, h / F.fh, 0, 0);
      povScene(g, F.fw, F.fh, st, dt);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(c, 0, 0, w, h, F.fx, F.fy, F.fw, F.fh);
      // Eyelids
      const open = lids(st);
      eyelids(ctx, F, open, st);
      // White flash into the game
      const flash = seg(st, 6.7, 7.2);
      if (flash > 0) { ctx.fillStyle = `rgba(255,248,240,${flash})`; ctx.fillRect(F.fx, F.fy, F.fw, F.fh); }
    } },
];

/** Eyelid openness over time: closed, flutter, blink, blink, open. */
function lids(st) {
  const k = [[0, 0], [1.2, 0], [1.7, 0.28], [2.1, 0.22], [2.3, 0], [2.6, 0], [3.1, 0.62], [3.35, 0.62], [3.5, 0.05], [3.7, 0.05], [4.2, 1]];
  for (let i = 1; i < k.length; i++) if (st < k[i][0]) return lerp(k[i - 1][1], k[i][1], ease((st - k[i - 1][0]) / (k[i][0] - k[i - 1][0])));
  return 1;
}

function eyelids(ctx, F, open, st) {
  const { fx, fy, fw, fh } = F, cx = fx + fw / 2, cy = fy + fh / 2;
  if (open >= 0.999) return;
  // light through closed lids: a dim red-amber glow
  if (open < 0.02) {
    const glow = 0.25 + 0.2 * seg(st, 0, 1.2) + 0.06 * Math.sin(st * 2);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(fw, fh) * 0.55);
    g.addColorStop(0, `rgba(120,30,40,${glow})`); g.addColorStop(1, 'rgba(20,0,8,1)');
    ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fh);
    return;
  }
  const gap = open * fh * 0.62, curve = fh * 0.22;
  ctx.fillStyle = '#050003';
  ctx.beginPath();  // upper lid
  ctx.moveTo(fx, fy); ctx.lineTo(fx + fw, fy); ctx.lineTo(fx + fw, cy - gap * 0.5 + curve * (1 - open));
  ctx.quadraticCurveTo(cx, cy - gap - curve * open, fx, cy - gap * 0.5 + curve * (1 - open)); ctx.closePath(); ctx.fill();
  ctx.beginPath();  // lower lid
  ctx.moveTo(fx, fy + fh); ctx.lineTo(fx + fw, fy + fh); ctx.lineTo(fx + fw, cy + gap * 0.5 - curve * (1 - open) * 0.5);
  ctx.quadraticCurveTo(cx, cy + gap * 0.9 + curve * open * 0.5, fx, cy + gap * 0.5 - curve * (1 - open) * 0.5); ctx.closePath(); ctx.fill();
  // soft lid edges
  const e = ctx.createLinearGradient(0, cy - gap, 0, cy + gap);
  e.addColorStop(0, 'rgba(5,0,3,0.6)'); e.addColorStop(0.25, 'rgba(5,0,3,0)'); e.addColorStop(0.75, 'rgba(5,0,3,0)'); e.addColorStop(1, 'rgba(5,0,3,0.6)');
  ctx.fillStyle = e; ctx.fillRect(fx, cy - gap, fw, gap * 2);
}

/** What the pilot sees lying in the pod: ceiling lights through wet glass, then the canopy opens. */
function povScene(g, w, h, st, dt) {
  const cx = w / 2, sharp = lerp(1, 0.4, easeOut(seg(st, 2.5, 5.2)));
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#120a2a'); bg.addColorStop(1, '#07051a');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // ceiling ribs converging upward
  g.strokeStyle = 'rgba(150,130,200,0.18)'; g.lineWidth = Math.max(1, w * 0.003);
  for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(cx + k * w * 0.16, h * 1.1); g.lineTo(cx + k * w * 0.04, -h * 0.1); g.stroke(); }
  for (let k = 0; k < 6; k++) { const y = h * (0.1 + k * 0.17); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  // light strips
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const sx of [-0.18, 0.18]) for (let k = 0; k < 5; k++) {
    const y = h * (0.12 + k * 0.2), x = cx + sx * w * (0.6 + k * 0.15), r = h * (0.08 + k * 0.02) * sharp;
    g.globalAlpha = 0.85; g.drawImage(sprite('#ffe2c8'), x - r, y - r, r * 2, r * 2);
  }
  // crimson beacon
  const a = Math.max(0, Math.sin(st * 1.8)) ** 2 * 0.5;
  g.globalAlpha = a; g.drawImage(sprite('#c0306a'), w * (0.5 + 0.45 * Math.cos(st * 1.8)) - h * 0.5, -h * 0.2, h, h);
  g.restore();
  // the canopy: wet glass that lifts away
  const lift = easeOut(seg(st, 4.1, 5.6));
  g.save();
  g.translate(0, -lift * h * 1.1); g.globalAlpha = 1 - lift * 0.6;
  g.fillStyle = 'rgba(200,210,240,0.10)'; g.fillRect(0, 0, w, h);
  for (const d of C.drops) {
    const x = d.x * w, y = d.y * h, r = d.r * w;
    g.fillStyle = 'rgba(230,238,255,0.18)'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, 6.283); g.fill();
  }
  // canopy frame edges
  g.fillStyle = '#0b0918';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(w * 0.1, h * 0.5, 0, h); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(w, 0); g.quadraticCurveTo(w * 0.9, h * 0.5, w, h); g.closePath(); g.fill();
  g.restore();
  // pod rim at the bottom edge (your own pod)
  g.fillStyle = '#0b0918'; g.beginPath(); g.moveTo(0, h); g.quadraticCurveTo(cx, h * 0.86, w, h); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(232,168,124,0.6)'; g.lineWidth = Math.max(1, w * 0.004); g.beginPath(); g.moveTo(0, h * 0.995); g.quadraticCurveTo(cx, h * 0.86, w, h * 0.995); g.stroke();
  // steam burst when the seal breaks
  if (st > 4.1 && C.steam.length < 50 && Math.random() < dt * 40) {
    const side = Math.random() < 0.5 ? 0 : 1;
    C.steam.push({ x: side ? w : 0, y: h * rand(0.3, 1), vx: (side ? -1 : 1) * rand(w * 0.15, w * 0.4), vy: -rand(h * 0.05, h * 0.25), r: h * 0.08, age: 0, life: rand(1.5, 2.6) });
  }
  for (const s of C.steam) {
    s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.97; s.r += h * 0.25 * dt;
    const al = Math.sin(clamp(s.age / s.life, 0, 1) * Math.PI) * 0.22;
    const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    gr.addColorStop(0, `rgba(235,238,250,${al.toFixed(3)})`); gr.addColorStop(1, 'rgba(235,238,250,0)');
    g.fillStyle = gr; g.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
  }
  C.steam = C.steam.filter(s => s.age < s.life);
}

// ════════════════════════════════════════════
//  LAUNCH — from the pod to the warship (after the wake, before Flight School)
//    1 Suit up     the pilot's face; the helmet visor drops, its HUD lights up
//    2 Hangar      from above: the pilot drops into the cockpit, the canopy
//                  slides shut, the engines spool
//    3 Launch      up the launch tube and out into space → the game
// ════════════════════════════════════════════
const LAUNCH = [
  { dur: 2.9, fadeOut: 0.2,
    enter() { title(''); caption('VYOM · <b>“Hangar three. Your ship is fuelled. Go.”</b>'); C.bpm = 0; Sound.crackle(); },
    draw(ctx, F, st, p) {
      const A = C.assets;
      ctx.save(); camera(ctx, F, 256, 250, lerp(560, 480, ease(p)));
      const bg = ctx.createLinearGradient(0, -200, 0, 700); bg.addColorStop(0, '#0d0924'); bg.addColorStop(1, '#1a1036');
      ctx.fillStyle = bg; ctx.fillRect(-900, -400, 2300, 1300);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 9; k++) { const x = -500 + k * 190, y = 60 + (k % 3) * 70, r = 60 + (k % 2) * 30; ctx.globalAlpha = 0.25; ctx.drawImage(sprite(k % 3 ? '#e8a87c' : '#8a6cd8'), x - r, y - r, r * 2, r * 2); }
      ctx.restore();
      ctx.drawImage(A.face.canvas, 0, 0, 512, 512);
      helmet(ctx, st);
      ctx.restore();
      if (st > 0.55) once('servo', () => Sound.whoosh(0.6, 0.35));
      if (st > 1.3) once('seal', () => Sound.clunk());
      const w = 1 - seg(st, 0, 0.6);   // out of the wake's white flash
      if (w > 0) { ctx.fillStyle = `rgba(255,248,240,${w})`; ctx.fillRect(F.fx, F.fy, F.fw, F.fh); }
    } },
  { dur: 3.1, fadeIn: 0.2, fadeOut: 0.15,
    enter() { caption(`HANGAR 3 · INTERCEPTOR <b>${esc((C.name || '').toUpperCase())}</b>`); },
    draw(ctx, F, st, p, dt) {
      ctx.save(); camera(ctx, F, 0, lerp(30, 4, ease(p)), lerp(430, 330, ease(p)));
      hangarFloor(ctx, st, 0);
      const k = 2.7, spool = seg(st, 2.1, 3.1);
      ctx.save(); ctx.scale(k, k);
      if (spool > 0) { ctx.globalAlpha = spool; drawShipShape(ctx, 'interceptor', '#00e5ff', '#ffb48a', 1 + spool * 3, st, true, false); ctx.globalAlpha = 1; }
      drawShipShape(ctx, 'interceptor', '#00e5ff', '#ffb48a', 1, st, false, false);
      // the pilot settles into the seat
      const sit = easeOut(seg(st, 0.1, 0.9)), img = C.assets.face.canvas;
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, -8, 7, 14, 0, 0, 6.283); ctx.clip();
      ctx.globalAlpha = sit; const sc = lerp(1.35, 1, sit);
      ctx.drawImage(img, 150 / 512 * img.width, 70 / 512 * img.height, 212 / 512 * img.width, 330 / 512 * img.height, -7 * sc, (-18 - 4) * sc + 4, 14 * sc, 21.8 * sc);
      ctx.restore();
      // canopy slides shut
      const open = 1 - ease(seg(st, 0.9, 1.7));
      ctx.save(); ctx.translate(0, -20 * open);
      const cg = ctx.createLinearGradient(0, -22, 0, 6); cg.addColorStop(0, 'rgba(179,245,255,0.5)'); cg.addColorStop(1, 'rgba(26,93,122,0.3)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(0, -8, 7.6, 14.6, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(232,240,255,0.7)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-2.5, -15, 1.4, 4, -0.3, 0, 6.283); ctx.fill();
      ctx.restore();
      ctx.restore();
      ctx.restore();
      if (st > 0.95) once('hiss', () => Sound.hiss(0.7, 0.06));
      if (st > 1.7) once('lock', () => Sound.clunk());
      if (st > 2.1) once('spool', () => Sound.whoosh(1.2, 0.5));
    } },
  { dur: 2.2,
    enter() { caption('LAUNCH'); C.streaks = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), v: rand(1.5, 3.5), l: rand(0.04, 0.12) })); Sound.whoosh(2, 1); Sound.clunk(); },
    draw(ctx, F, st, p, dt) {
      const { fx, fy, fw, fh } = F, cx = fx + fw / 2;
      const space = seg(st, 0.8, 1.3), shake = (1 - space) * 6 * (reduced ? 0 : 1);
      ctx.save(); ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      // tube → space
      ctx.fillStyle = '#100c22'; ctx.fillRect(fx, fy, fw, fh);
      if (space > 0) { ctx.fillStyle = `rgba(5,4,18,${space})`; ctx.fillRect(fx, fy, fw, fh); }
      const speed = lerp(3.2, 0.6, space);
      for (const s of C.streaks) {
        s.y += s.v * speed * dt; if (s.y > 1.1) { s.y = -0.1; s.x = Math.random(); }
        const x = fx + s.x * fw, y = fy + s.y * fh, len = s.l * fh * lerp(1, 0.15, space);
        ctx.strokeStyle = space < 0.5 ? `rgba(255,190,140,${(0.55 * (1 - space)).toFixed(3)})` : `rgba(230,236,255,${(0.7 * space).toFixed(3)})`;
        ctx.lineWidth = lerp(2, 1.2, space); ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y); ctx.stroke();
      }
      // tube walls
      if (space < 1) {
        ctx.fillStyle = `rgba(30,24,60,${(1 - space).toFixed(3)})`;
        ctx.fillRect(fx, fy, fw * 0.18, fh); ctx.fillRect(fx + fw * 0.82, fy, fw * 0.18, fh);
        ctx.fillStyle = `rgba(232,168,124,${(0.7 * (1 - space)).toFixed(3)})`;
        for (let k = 0; k < 8; k++) { const y = fy + ((k / 8 + st * 2.4) % 1) * fh; ctx.fillRect(fx + fw * 0.18 - 4, y, 4, fh * 0.05); ctx.fillRect(fx + fw * 0.82, y, 4, fh * 0.05); }
      }
      // Earth's limb rising below
      if (space > 0) {
        const r = fw * 1.2, ey = fy + fh + r - fh * 0.16 * space;
        const g = ctx.createRadialGradient(cx, ey, r * 0.96, cx, ey, r * 1.08);
        g.addColorStop(0, `rgba(30,95,140,${(0.9 * space).toFixed(3)})`); g.addColorStop(0.5, `rgba(120,170,230,${(0.5 * space).toFixed(3)})`); g.addColorStop(1, 'rgba(120,170,230,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, ey, r * 1.08, 0, 6.283); ctx.fill();
      }
      // the warship, climbing
      const k = fh / 300, sy = fy + fh * lerp(0.75, 0.45, easeOut(seg(st, 0, 1.2)));
      ctx.save(); ctx.translate(cx, sy); ctx.scale(k, k);
      drawShipShape(ctx, 'interceptor', '#00e5ff', '#ffb48a', 4, st, true);
      ctx.restore();
      ctx.restore();
      const flash = seg(st, 1.75, 2.2);
      if (flash > 0) { ctx.fillStyle = `rgba(255,248,240,${flash})`; ctx.fillRect(fx, fy, fw, fh); }
    } },
];

/** Hangar floor from above: grid, launch pad with hazard ring, rails running up the tube. */
function hangarFloor(ctx, st) {
  ctx.fillStyle = '#14112a'; ctx.fillRect(-900, -900, 1800, 1800);
  ctx.strokeStyle = 'rgba(150,130,200,0.12)'; ctx.lineWidth = 1;
  for (let x = -880; x <= 880; x += 40) { ctx.beginPath(); ctx.moveTo(x, -900); ctx.lineTo(x, 900); ctx.stroke(); }
  for (let y = -880; y <= 880; y += 40) { ctx.beginPath(); ctx.moveTo(-900, y); ctx.lineTo(900, y); ctx.stroke(); }
  // rails up the launch tube
  for (const x of [-74, 74]) {
    ctx.fillStyle = '#231d44'; ctx.fillRect(x - 6, -900, 12, 1020);
    for (let y = -880; y < 110; y += 50) {
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(st * 6 - y * 0.02));
      ctx.fillStyle = `rgba(232,168,124,${a.toFixed(3)})`; ctx.fillRect(x - 2, y, 4, 14);
    }
  }
  // pad + hazard ring
  ctx.lineWidth = 10;
  for (let k = 0; k < 48; k++) {
    ctx.strokeStyle = k % 2 ? 'rgba(212,149,107,0.75)' : 'rgba(42,28,44,0.9)';
    ctx.beginPath(); ctx.arc(0, 0, 160, k / 48 * 6.283, (k + 1) / 48 * 6.283); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(232,168,124,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 148, 0, 6.283); ctx.stroke();
  crimson(ctx, st, -500, -500, 1000, 1000);
}

/** The helmet closes around the pilot's head; its visor HUD lights up. */
function helmet(ctx, st) {
  const v = ease(seg(st, 0.5, 1.3)), on = seg(st, 1.4, 2.0);
  if (v <= 0) return;
  ctx.save(); ctx.translate(0, -560 * (1 - v));
  // shell
  ctx.lineWidth = 34; ctx.strokeStyle = '#2b2740';
  ctx.beginPath(); ctx.ellipse(256, 262, 212, 238, 0, 0, 6.283); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(232,168,124,0.7)';
  ctx.beginPath(); ctx.ellipse(256, 262, 196, 222, 0, 0, 6.283); ctx.stroke();
  // visor glass
  const g = ctx.createLinearGradient(80, 60, 430, 460);
  g.addColorStop(0, 'rgba(155,109,255,0.16)'); g.addColorStop(0.5, 'rgba(232,168,124,0.08)'); g.addColorStop(1, 'rgba(139,34,82,0.14)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(256, 262, 195, 221, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.ellipse(170, 150, 40, 110, -0.5, 0, 6.283); ctx.fill();
  // visor HUD
  if (on > 0) {
    ctx.globalAlpha = on;
    ctx.strokeStyle = '#e8a87c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(256, 262, 178, Math.PI * 1.05, Math.PI * 1.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(256, 262, 178, Math.PI * 1.7, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = '#ffd9b8'; ctx.font = '600 13px "Space Grotesk", sans-serif'; ctx.textAlign = 'left';
    ctx.font = '600 12px "Space Grotesk", sans-serif';
    ctx.fillText('PILOT LINK', 150, 336); ctx.fillText(`SYNC ${Math.round(on * 100)}%`, 150, 352);
    ctx.textAlign = 'right'; ctx.fillText((C.name || '').toUpperCase().slice(0, 10), 362, 336); ctx.fillText('O₂ 100%', 362, 352);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
