// ════════════════════════════════════════════════════════════════
//  THE DREAMING MIND — the opening sequence.
//
//  1. The Void: black, one spark, a neural web grows, "WHO ARE YOU?"
//  2. The Dreaming Conversation: Vyom talks the player's mind back
//     online; every line changes the dreamspace (data/story.js DREAM).
//  3. The cognitive test: a real Flight School equation on the game's
//     own numpad. Correct → the web ignites and the dream shatters into
//     the HUD (main.js assembles it).
//
//  playDream({ name, pilots, test, onName(name) → { returning }, onDone({ skipped }) })
//  A returning pilot (onName says so) hears "There you are." and wakes at once.
//  interlude(resume): optional; called after "There you are." for new pilots
//  (main.js plays the cold-open film there), then resume() starts the talk.
//  renderDream(ctx, now)    — canvas layer while the dream is open
//  renderShatter(ctx, now)  — the dream breaking outward, drawn on top of
//                             whatever comes next (game or hub)
//  Pure canvas + DOM, no dependencies. Particle counts scale with screen
//  size; Reduced motion skips the shatter and the letter scatter.
// ════════════════════════════════════════════════════════════════

import { $ } from './dom.js';
import { esc } from '../core/util.js';
import { VIEW } from '../config.js';
import { DREAM, DREAM_TEST, fill } from '../data/story.js';
import { MathChallenges } from '../challenges/math.js';
import { Sound } from '../services/audio.js';

// Dreamspace palette (no cyan, no neon green)
const COL = {
  bg0: '#0a0020', bg1: '#1a0040', amber: '#e8a87c', amber2: '#d4956b', silver: '#d4e5f7',
  teal: '#0d7377', crimson: '#8b2252', violet: '#9b6dff', rose: '#e7b4a0',
};
const SYMBOLS = ['+', '−', '×', '÷', '=', 'π', '√', '∑', '∞', '²', '7', '3', '9', 'Δ', '%', '∫'];
const FRAGMENTS = ['Δv', 'x²', 'v = d/t', 'π', '∫', 'θ', 'a² + b²', '√2', 'F = ma', '∑', 'e', 'λ'];
const SHARD_KINDS = ['eq', 'earth', 'cockpit', 'stick'];
const SHARD_EQ = ['12 + 7', '9 × 6', '48 − 19', '½', '3²', '81 ÷ 9'];

let D = null;              // the open dream
let S = null;              // the shatter overlay (outlives D)
let reduced = false;
export function setDreamReducedMotion(v) { reduced = !!v; }
export const dreamActive = () => !!D;

const now = () => performance.now();
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// ── Tweens: every visual parameter glides to its target ──
function tween(key, to, ms = 1200) { D.tw[key] = { a: val(key), b: to, t0: now(), d: ms }; }
function val(key) {
  const t = D.tw[key]; if (!t) return 0;
  const p = t.d <= 0 ? 1 : clamp((now() - t.t0) / t.d, 0, 1);
  return t.a + (t.b - t.a) * ease(p);
}
function later(fn, ms) { const id = setTimeout(() => { if (D) fn(); }, ms); D.timers.push(id); return id; }

/** Where things sit, in logical field px. Portrait/narrow screens stack vertically. */
function layout() {
  const W = VIEW.W, H = VIEW.H, tall = VIEW.tall || W < 820, m = Math.min(W, H);
  return {
    W, H, tall, cx: W / 2, cy: H / 2,
    vx: tall ? W / 2 : W * 0.74, vy: tall ? H * 0.16 : H * 0.31, vr: m * (tall ? 0.12 : 0.105),
    ex: W / 2, ey: tall ? H * 0.9 : H * 0.85, er: m * (tall ? 0.09 : 0.075),
  };
}

// ── Glow sprites (pre-rendered once per colour, drawn with drawImage) ──
const sprites = {};
function sprite(color) {
  if (sprites[color]) return sprites[color];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.12, color); gr.addColorStop(0.4, color + '55'); gr.addColorStop(1, color + '00');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (sprites[color] = c);
}

// ── The world: neurons, links, plankton, memory shards ──
function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
function buildWorld() {
  const { W, H } = layout();
  const area = W * VIEW.k * H * VIEW.k;            // real screen pixels
  let n = Math.round(clamp(area / 9000, 46, 150));
  if (reduced) n = Math.round(n * 0.6);
  const colors = [COL.violet, COL.amber, COL.rose, COL.violet];
  const nodes = [{ x: 0.5, y: 0.5, s: 4, c: COL.rose, ph: 0, rank: 0 }];
  for (let i = 1; i < n; i++) {
    const spread = Math.random() < 0.7;
    const x = clamp(spread ? 0.5 + gauss() * 0.42 : Math.random(), 0.02, 0.98);
    const y = clamp(spread ? 0.5 + gauss() * 0.44 : Math.random(), 0.03, 0.97);
    const d = Math.hypot((x - 0.5) * W, (y - 0.5) * H) / Math.hypot(W / 2, H / 2);
    nodes.push({ x, y, s: rand(1.4, 3.6), c: colors[i % colors.length], ph: rand(0, 6.28), rank: d * 0.8 + Math.random() * 0.2 });
  }
  nodes.sort((a, b) => a.rank - b.rank);
  // Each neuron links to its 3 nearest neighbours; `k` decides when the link forms
  const pairs = [], seen = new Set();
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => [j, Math.hypot((a.x - b.x) * W, (a.y - b.y) * H)]).filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]).slice(0, 3);
    for (const [j] of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) { seen.add(key); pairs.push({ a: Math.min(i, j), b: Math.max(i, j), k: Math.random() }); }
    }
  });
  const pn = Math.round(clamp(area / 16000, 28, 90) * (reduced ? 0.6 : 1));
  const plankton = Array.from({ length: pn }, () => ({
    x: Math.random(), y: Math.random(), sp: rand(0.006, 0.022), s: rand(0.6, 1.8), sway: rand(0, 6.28),
    sym: Math.random() < 0.45 ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : null,
    or: rand(1.6, 4.6), oa: rand(0, 6.28), ow: rand(0.08, 0.22) * (Math.random() < 0.5 ? -1 : 1),
  }));
  // 21 cities on the visible hemisphere (fixed pattern)
  let seed = 2047; const lcg = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cities = Array.from({ length: 21 }, () => { const a = lcg() * 6.283, r = Math.sqrt(lcg()) * 0.78; return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.92, ph: lcg() * 6.28 }; });
  return { nodes, pairs, plankton, cities, signals: [], ripples: [], patterns: [], shards: [], cracks: [], litCount: 0 };
}

// ════════════════════════════════════════════
//  Public entry
// ════════════════════════════════════════════
export function playDream(opts) {
  endDream();
  D = {
    opts, stage: 'void', tw: {}, timers: [], t0: now(), last: now(), name: (opts.name || '').slice(0, 16),
    world: null, line: -1, forming: false, formEnd: 0, autoT: null, spoke: { you: false, vyom: false },
    glitchT: 0, breathT: -9999, symPulseT: -9999, citiesT: -9999, eyesT: 0, lastChime: 0, rot: 0,
    challenge: null, input: '', pad: null, phase: 0,
  };
  D.world = buildWorld();
  const root = $('dreamScreen');
  root.innerHTML = `
    <div class="dr-void" id="drVoid">
      <div class="dr-q" id="drQ" aria-label="Who are you?"></div>
      <form class="dr-name" id="drNameForm" autocomplete="off">
        <input id="drName" type="text" maxlength="16" spellcheck="false" autocomplete="off" aria-label="Your name" value="${esc(D.name)}">
        <button type="submit" id="drNameGo" class="dr-go" aria-label="That's me">↵</button>
      </form>
      <div class="dr-pilots" id="drPilots">${(opts.pilots || []).slice(0, 6).map(n => `<button type="button" data-pilot="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <div class="dr-whisper" id="drWhisper"></div>
    </div>
    <div class="dr-talk hidden" id="drTalk">
      <div class="dr-line you" id="drYou"><div class="dr-who">${esc(D.name)}</div><p></p></div>
      <div class="dr-line vyom" id="drVyom"><div class="dr-who">Vyom</div><p></p></div>
    </div>
    <div class="dr-test hidden" id="drTest">
      <div class="dr-eq" id="drEq"></div>
      <div class="dr-ans" id="drAns"><span id="drAnsVal"></span><i></i></div>
      <div class="dr-hint" id="drHint"></div>
    </div>
    <button class="dr-skip" id="drSkip" type="button">SKIP →</button>`;
  root.classList.remove('testing', 'waking');
  $('drNameForm').onsubmit = e => { e.preventDefault(); submitName(); };
  $('drName').addEventListener('input', onNameInput);
  root.querySelectorAll('[data-pilot]').forEach(b => b.onclick = e => { e.stopPropagation(); $('drName').value = b.dataset.pilot; submitName(); });
  $('drSkip').onclick = e => { e.stopPropagation(); skip(); };
  root.onpointerdown = e => {
    if (e.target.closest('button, input, form, #numpad')) return;
    if (D?.stage === 'talk') advance();
  };
  Sound.dreamStart();
  startVoid();
}

export function endDream() {
  if (!D) return;
  D.timers.forEach(clearTimeout);
  restorePad();
  D = null;
}

// ════════════════════════════════════════════
//  Screen 1 — The Void
// ════════════════════════════════════════════
function startVoid() {
  tween('dark', 1, 0); tween('lit', 0, 0); tween('conn', 0, 0); tween('glow', 0.5, 0);
  later(() => { tween('lit', 0.55, 4800); tween('conn', 0.4, 6000); tween('dark', 0.82, 5000); }, 1400);
  later(() => form($('drQ'), 'WHO ARE YOU?', 1900, { spaced: true }), 2600);
  later(() => {
    $('drNameForm').classList.add('on');
    $('drPilots').classList.add('on');
    const inp = $('drName'); inp.focus({ preventScroll: true });
    if (inp.value) inp.setSelectionRange(inp.value.length, inp.value.length);
    $('drNameGo').classList.toggle('ready', !!inp.value.trim());
  }, 4400);
}

function onNameInput() {
  const v = $('drName').value;
  $('drNameGo').classList.toggle('ready', !!v.trim());
  D.world.ripples.push({ t0: now() });
  Sound.chime(v.length);
}

function submitName() {
  if (!D || D.stage !== 'void') return;
  const inp = $('drName'), name = inp.value.trim().slice(0, 16);
  if (!name) { inp.focus(); $('drNameForm').classList.remove('nudge'); void inp.offsetWidth; $('drNameForm').classList.add('nudge'); return; }
  D.stage = 'absorb'; D.name = name;
  inp.blur(); inp.readOnly = true;
  const { returning = false } = D.opts.onName?.(name) || {};
  $('drYou').querySelector('.dr-who').textContent = name;
  $('drNameForm').classList.add('absorb');
  $('drPilots').classList.remove('on');
  $('drQ').classList.add('fade');
  tween('pull', 1, 1300); tween('conn', 0.85, 1100); tween('glow', 1, 1100);
  for (let i = 0; i < 6; i++) later(() => Sound.chime(7 - i), i * 110);
  later(() => { Sound.whisper(); form($('drWhisper'), 'There you are.', 1500); }, 1500);
  if (returning) { later(() => { $('drVoid').classList.add('gone'); wake(true); }, 3600); return; }
  later(() => {
    $('drVoid').classList.add('gone');
    if (D.opts.interlude) {
      D.stage = 'film';
      D.opts.interlude(() => {
        if (!D) return;
        tween('pull', 0, 0); tween('dark', 1, 0); D.world.ripples.push({ t0: now() });
        Sound.dreamPulse(54);
        startTalk();
      });
      return;
    }
    tween('pull', 0, 1800); D.world.ripples.push({ t0: now() });
    startTalk();
  }, 4300);
}

// ════════════════════════════════════════════
//  Screen 2 — The Dreaming Conversation
// ════════════════════════════════════════════
const PHASES = {
  1: { dark: 0.42, lit: 0.42, conn: 0.06, glow: 0.45, vyom: 0.38, sym: 0, earth: 0, shards: 0, orbit: 0 },
  2: { dark: 0.16, lit: 0.78, conn: 0.5, glow: 0.65, vyom: 0.72, sym: 0.5, earth: 0.15, shards: 0.6, orbit: 0 },
  3: { dark: 0, lit: 1, conn: 0.72, glow: 0.8, vyom: 0.92, sym: 0.75, earth: 1, shards: 0.85, orbit: 0.75 },
  4: { dark: 0, lit: 1, conn: 0.8, glow: 0.85, vyom: 1, sym: 0.75, earth: 1, shards: 0.5, orbit: 0.9 },
};
function setPhase(n) {
  if (D.phase === n) return;
  D.phase = n;
  const ms = n === 1 ? 2200 : 3200;
  for (const [k, v] of Object.entries(PHASES[n])) tween(k, v, ms);
}

function startTalk() {
  D.stage = 'talk';
  $('drTalk').classList.remove('hidden');
  setPhase(1);
  later(() => $('drSkip').classList.add('on'), 3000);
  later(() => nextLine(), 900);
}

function nextLine() {
  clearTimeout(D.autoT);
  D.line++;
  if (D.line >= DREAM.length) return D.opts.test === false ? wake(false) : startTest();
  const line = DREAM[D.line];
  if (line.phase) setPhase(line.phase);
  if (line.fx === 'flicker') { D.glitchT = now() + 900; }
  if (line.fx === 'threads') tween('conn', 0.38, 3500);
  if (line.fx === 'symbols') D.symPulseT = now();
  if (line.fx === 'cities') { D.citiesT = now(); tween('cities', 1, 1600); }
  D.breathT = now();
  say(line.who, fill(line.text, D.name));
}

/** Form a line in the speaker's slot; the other speaker's line dims. */
function say(who, text, after) {
  const slot = $(who === 'vyom' ? 'drVyom' : 'drYou'), other = $(who === 'vyom' ? 'drYou' : 'drVyom');
  slot.classList.add('on'); slot.classList.remove('old');
  if (D.spoke[who === 'vyom' ? 'you' : 'vyom']) other.classList.add('old');
  D.spoke[who] = true;
  const dur = clamp(text.length * 26, 1500, 3000);
  form(slot.querySelector('p'), text, dur, { glitch: who === 'vyom' && Math.random() < 0.55 });
  if (who === 'vyom') {
    Sound.crackle();
    const n = Math.floor(dur / 650);
    for (let i = 1; i < n; i++) later(() => D.forming && Sound.crackle(), i * 650);
  } else Sound.whisper();
  D.forming = true; D.formEnd = now() + dur;
  clearTimeout(D.autoT);
  D.autoT = later(() => { D.forming = false; D.autoT = later(after || nextLine, after ? 1300 : 2000); }, dur);
}

/** Tap / Enter: finish forming the current line, or move on. */
function advance() {
  if (!D || D.stage !== 'talk') return;
  if (D.forming) {
    D.forming = false;
    document.querySelectorAll('#drTalk .forming').forEach(el => el.classList.replace('forming', 'formed'));
    clearTimeout(D.autoT); D.autoT = later(nextLine, 2000);
    return;
  }
  nextLine();
}

function skip() {
  if (!D || D.stage === 'wake' || D.stage === 'void' || D.stage === 'absorb') return;
  wake(true);
}

// ════════════════════════════════════════════
//  Phase 4 — The bridge: the cognitive test
// ════════════════════════════════════════════
function startTest() {
  D.stage = 'test';
  D.challenge = MathChallenges.next({ level: 1, skills: ['add', 'sub'], warmup: true });
  D.input = '';
  const root = $('dreamScreen');
  root.classList.add('testing');
  $('drTest').classList.remove('hidden');
  $('drYou').classList.add('old');
  form($('drEq'), D.challenge.prompt, 1100, {});
  paintAnswer();
  $('drHint').textContent = document.body.classList.contains('touch') ? 'tap the answer, then ✓' : 'type the answer, then Enter';
  Sound.bell();
  D.world.ripples.push({ t0: now() });
  // The game's own numpad, moved into the dream and made translucent
  const pad = $('numpad');
  D.pad = { el: pad, parent: pad.parentNode, next: pad.nextSibling };
  root.appendChild(pad);
  pad.classList.remove('hidden'); pad.classList.add('dream');
  pad.querySelector('.fire').textContent = '✓';
}

function restorePad() {
  if (!D?.pad) return;
  const { el, parent, next } = D.pad;
  el.classList.remove('dream'); el.classList.add('hidden');
  el.querySelector('.fire').textContent = 'FIRE';
  parent.insertBefore(el, next);
  D.pad = null;
}

function paintAnswer() { const v = $('drAnsVal'); if (v) v.textContent = D.input.replace('-', '−'); }

/** Keypad input from the numpad or the keyboard during the test. */
export function dreamPad(k) {
  if (!D || D.stage !== 'test') return;
  if (k === 'enter') return submitAnswer();
  if (k === 'del') D.input = D.input.slice(0, -1);
  else if (k === '-') { if (!D.input) D.input = '-'; }
  else if (D.input.replace('-', '').length < 6) D.input += k;
  Sound.tap();
  D.world.ripples.push({ t0: now() });
  paintAnswer();
}

function submitAnswer() {
  if (!D.input || D.input === '-') return;
  const ok = D.challenge.check(D.input) === 'correct';
  if (ok) {
    D.stage = 'wake';
    $('drAns').classList.add('ok');
    tween('glow', 1, 400);
    restorePad();
    // A beat of silence first, then relief
    clearTimeout(D.autoT);
    const slot = $('drVyom').querySelector('p'); slot.innerHTML = '';
    later(() => say('vyom', DREAM_TEST.right, () => wake(false)), 700);
  } else {
    $('drAns').classList.remove('bad'); void $('drAns').offsetWidth; $('drAns').classList.add('bad');
    D.input = ''; paintAnswer();
    D.glitchT = now() + 300;
    say('vyom', DREAM_TEST.wrong, () => {});
  }
}

// ════════════════════════════════════════════
//  Screen 3 — The Awakening
// ════════════════════════════════════════════
function wake(skipped) {
  D.stage = 'wake';
  clearTimeout(D.autoT);
  restorePad();
  const root = $('dreamScreen');
  root.classList.add('waking');
  $('drSkip').classList.remove('on');
  const fast = skipped || reduced;
  tween('ignite', 1, fast ? 300 : 600); tween('lit', 1, 400); tween('conn', 1, 600); tween('dark', 0, 400);
  Sound.crescendo(fast ? 1100 : 2200);
  if (!reduced) later(() => { buildCracks(); tween('crack', 1, fast ? 450 : 900); }, fast ? 250 : 900);
  later(() => {
    const done = D.opts.onDone;
    if (!reduced) startShatter();
    root.classList.remove('waking', 'testing');
    endDream();
    done?.({ skipped });
  }, fast ? 1150 : 2200);
}

function buildCracks() {
  const { W, H, cx, cy } = layout(), reach = Math.hypot(W, H) * 0.6, cracks = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    let a = (i / n) * 6.283 + rand(-0.25, 0.25), x = cx, y = cy;
    const pts = [[x, y]];
    const steps = 7;
    for (let s = 0; s < steps; s++) { a += rand(-0.35, 0.35); const len = reach / steps * rand(0.7, 1.3); x += Math.cos(a) * len; y += Math.sin(a) * len; pts.push([x, y]); }
    cracks.push(pts);
    if (Math.random() < 0.6) { // a branch
      const from = pts[2 + Math.floor(Math.random() * 3)]; let bx = from[0], by = from[1], ba = a + rand(0.6, 1.2) * (Math.random() < 0.5 ? -1 : 1);
      const bp = [[bx, by]]; for (let s = 0; s < 3; s++) { bx += Math.cos(ba) * reach / 9; by += Math.sin(ba) * reach / 9; ba += rand(-0.3, 0.3); bp.push([bx, by]); }
      cracks.push(bp);
    }
  }
  D.world.cracks = cracks;
}

// The dream fractures outward from the centre. Shards are slices of a
// snapshot of the last dream frame, drawn on top of the next screen.
function startShatter() {
  const canvas = $('canvas'), { W, H, cx, cy } = layout();
  const snap = document.createElement('canvas'); snap.width = canvas.width; snap.height = canvas.height;
  snap.getContext('2d').drawImage(canvas, 0, 0);
  const R = Math.hypot(W, H), n = 12, shards = [];
  const angles = Array.from({ length: n }, (_, i) => (i / n) * 6.283 + rand(-0.15, 0.15));
  for (let i = 0; i < n; i++) {
    const a0 = angles[i], a1 = angles[(i + 1) % n] + (i === n - 1 ? 6.283 : 0);
    const mid = rand(0.22, 0.4) * R;
    const p = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    const am = (a0 + a1) / 2;
    shards.push({ poly: [[cx, cy], p(a0, mid), p(a1, mid)], a: am, d: rand(0.25, 0.45) * R, rot: rand(-0.5, 0.5) });
    shards.push({ poly: [p(a0, mid), p(a0, R), p(a1, R), p(a1, mid)], a: am, d: rand(0.35, 0.6) * R, rot: rand(-0.35, 0.35) });
  }
  S = { snap, shards, t0: now(), dur: 1300, cx, cy, W, H };
}

export function renderShatter(ctx, t) {
  if (!S) return;
  const p = clamp((t - S.t0) / S.dur, 0, 1);
  if (p >= 1) { S = null; return; }
  const e = 1 - Math.pow(1 - p, 3);
  ctx.save();
  for (const s of S.shards) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - Math.pow(p, 1.4));
    ctx.translate(Math.cos(s.a) * s.d * e, Math.sin(s.a) * s.d * e);
    ctx.translate(S.cx, S.cy); ctx.rotate(s.rot * e); ctx.scale(1 + e * 0.15, 1 + e * 0.15); ctx.translate(-S.cx, -S.cy);
    ctx.beginPath(); s.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.save(); ctx.clip(); ctx.drawImage(S.snap, 0, 0, S.W, S.H); ctx.restore();
    ctx.strokeStyle = `rgba(255,240,225,${0.7 * (1 - p)})`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  // White light breaking through the gaps
  if (p < 0.35) {
    const g = ctx.createRadialGradient(S.cx, S.cy, 0, S.cx, S.cy, Math.hypot(S.W, S.H) * 0.5);
    g.addColorStop(0, `rgba(255,248,240,${0.55 * (1 - p / 0.35)})`); g.addColorStop(1, 'rgba(255,248,240,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, S.W, S.H);
  }
  ctx.restore();
}

// ════════════════════════════════════════════
//  Keyboard (routed from main.js)
// ════════════════════════════════════════════
export function dreamKey(e) {
  if (!D) return false;
  const k = e.key;
  if (D.stage === 'void' || D.stage === 'absorb') return true;   // the name field handles itself
  if (D.stage === 'talk') {
    if (k === 'Enter' || k === ' ' || k === 'ArrowRight') { e.preventDefault(); advance(); }
    else if (k === 'Escape') { e.preventDefault(); skip(); }
    return true;
  }
  if (D.stage === 'test') {
    if (k >= '0' && k <= '9') { e.preventDefault(); dreamPad(k); }
    else if (k === '-' || k === 'Subtract') { e.preventDefault(); dreamPad('-'); }
    else if (k === 'Backspace') { e.preventDefault(); dreamPad('del'); }
    else if (k === 'Enter') { e.preventDefault(); dreamPad('enter'); }
    else if (k === 'Escape') { e.preventDefault(); skip(); }
  }
  return true;
}

// ════════════════════════════════════════════
//  Text formation: letters coalesce like particles, then snap into focus
// ════════════════════════════════════════════
function form(el, text, dur, { glitch = false, spaced = false } = {}) {
  if (!el) return;
  el.classList.remove('formed'); el.classList.add('forming');
  const chars = [...text], len = chars.length || 1, spread = Math.max(0, dur - 650);
  const scatter = reduced ? 0 : spaced ? 26 : 14;
  let i = 0, html = '';
  for (const word of text.split(' ')) {
    let w = '';
    for (const ch of word) {
      const dx = rand(-scatter, scatter).toFixed(1), dy = rand(-scatter, scatter).toFixed(1);
      w += `<span class="dc" style="--dx:${dx}px;--dy:${dy}px;--t:${Math.round((i / len) * spread)}ms">${esc(ch)}</span>`;
      i++;
    }
    html += `<span class="dw">${w}</span> `;
    i++;
  }
  el.innerHTML = html.trimEnd();
  const id = setTimeout(() => el.classList.replace('forming', 'formed'), dur + 50);
  D?.timers.push(id);
  // Vyom's signal degrades: one word stutters and scrambles, then corrects
  if (glitch && !reduced) {
    const words = [...el.querySelectorAll('.dw')].filter(w => w.textContent.length >= 4);
    if (!words.length) return;
    const w = words[Math.floor(Math.random() * words.length)];
    const letters = [...w.querySelectorAll('.dc')], orig = letters.map(l => l.textContent);
    const at = Math.round((Array.prototype.indexOf.call(el.querySelectorAll('.dc'), letters[0]) / len) * spread) + 500;
    const t1 = setTimeout(() => {
      if (!D) return;
      D.glitchT = now() + 380;
      w.classList.add('glitch');
      let n = 0;
      const iv = setInterval(() => {
        letters.forEach((l, j) => { l.textContent = n < 5 && Math.random() < 0.6 ? String.fromCharCode(33 + Math.floor(Math.random() * 60)) : orig[j]; });
        if (++n > 5) { clearInterval(iv); w.classList.remove('glitch'); }
      }, 65);
    }, at);
    D?.timers.push(t1);
  }
}

// ════════════════════════════════════════════
//  Canvas: the dreamspace
// ════════════════════════════════════════════
export function renderDream(ctx, t) {
  if (!D) return;
  const dt = Math.min(0.05, (t - D.last) / 1000); D.last = t;
  const L = layout(), { W, H, cx, cy } = L, w = D.world;
  const lit = val('lit'), conn = val('conn'), glow = val('glow'), pull = val('pull'), ignite = val('ignite');
  const sym = val('sym'), earth = val('earth'), vy = val('vyom'), orbit = val('orbit'), dark = val('dark');

  // Background: the space between neurons
  const bg = ctx.createRadialGradient(cx, cy * 0.9, 0, cx, cy, Math.hypot(W, H) * 0.62);
  bg.addColorStop(0, COL.bg1); bg.addColorStop(1, COL.bg0);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (dark > 0.001) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, W, H); }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Plankton + floating maths symbols (drift upward; later they orbit Earth)
  const symScale = 1 + Math.max(0, 1 - (t - D.symPulseT) / 1800) * 0.9;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of w.plankton) {
    p.y -= p.sp * dt; if (p.y < -0.03) { p.y = 1.03; p.x = Math.random(); }
    p.oa += p.ow * dt;
    let x = (p.x + Math.sin(t / 2400 + p.sway) * 0.008) * W, y = p.y * H;
    if (p.sym && orbit > 0.01) {
      const ox = L.ex + Math.cos(p.oa) * L.er * p.or, oy = L.ey - L.er * 0.4 + Math.sin(p.oa) * L.er * p.or * 0.32;
      x += (ox - x) * orbit; y += (oy - y) * orbit;
    }
    if (p.sym) {
      const a = sym * (0.25 + 0.2 * Math.sin(t / 900 + p.sway));
      if (a > 0.01) { ctx.fillStyle = `rgba(232,168,124,${a.toFixed(3)})`; ctx.font = `${Math.round((11 + p.s * 7) * symScale)}px Manrope, sans-serif`; ctx.fillText(p.sym, x, y); }
    } else {
      const a = (0.12 + 0.5 * Math.max(lit, 0.15)) * (0.5 + 0.5 * Math.sin(t / 700 + p.sway));
      ctx.fillStyle = `rgba(212,229,247,${(a * 0.5).toFixed(3)})`; ctx.fillRect(x, y, p.s, p.s);
    }
  }
  drawPatterns(ctx, t, W, H, Math.max(sym, lit * 0.4));

  // Earth (a memory of it) and its 21 cities
  if (earth > 0.01) drawEarth(ctx, t, L, earth);

  // Neural web
  const visible = Math.max(1, Math.floor(lit * w.nodes.length));
  if (visible > w.litCount) { if (t - D.lastChime > 160 && D.stage !== 'wake') { Sound.chime(visible); D.lastChime = t; } }
  w.litCount = visible;
  const pos = w.nodes.map((n, i) => {
    let x = n.x * W + Math.sin(t / 3100 + n.ph) * 6, y = n.y * H + Math.cos(t / 2700 + n.ph) * 6;
    if (pull > 0.001) { const k = pull * (i === 0 ? 1 : 0.9); x += (cx - x) * k + Math.cos(n.ph) * 34 * pull; y += (cy - y) * k + Math.sin(n.ph) * 22 * pull; }
    return [x, y];
  });
  // Ripples (each typed letter / tap): rings that brighten neurons they cross
  w.ripples = w.ripples.filter(r => t - r.t0 < 1600);
  const boost = new Float32Array(w.nodes.length);
  for (const r of w.ripples) {
    const rad = Math.max(0, t - r.t0) * 0.7, fade = Math.min(1, 1 - (t - r.t0) / 1600);
    ctx.strokeStyle = `rgba(231,180,160,${(0.18 * fade).toFixed(3)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.stroke();
    for (let i = 0; i < visible; i++) { const d = Math.abs(Math.hypot(pos[i][0] - cx, pos[i][1] - cy) - rad); if (d < 50) boost[i] += (1 - d / 50) * fade; }
  }
  // Links
  const glitching = t < D.glitchT;
  const linkA = clamp(0.25 + glow * 0.45 + ignite * 0.6, 0, 1) * (glitching ? rand(0.4, 1) : 1);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = `rgba(13,115,119,${linkA.toFixed(3)})`;
  ctx.beginPath();
  const live = [];
  for (const pr of w.pairs) {
    if (pr.b >= visible || pr.k > conn) continue;
    live.push(pr);
    ctx.moveTo(pos[pr.a][0], pos[pr.a][1]); ctx.lineTo(pos[pr.b][0], pos[pr.b][1]);
  }
  ctx.stroke();
  if (ignite > 0.01) {
    ctx.strokeStyle = `rgba(232,168,124,${(ignite * 0.55).toFixed(3)})`; ctx.lineWidth = 1.6; ctx.stroke();
  }
  // Signals racing along the links
  if (live.length && Math.random() < 0.05 + conn * 0.15 + ignite) w.signals.push({ pr: live[Math.floor(Math.random() * live.length)], t0: t, d: rand(700, 1300) });
  w.signals = w.signals.filter(s => t - s.t0 < s.d && s.pr.b < visible);
  const amberSprite = sprite(COL.amber);
  for (const s of w.signals) {
    const q = (t - s.t0) / s.d, a = pos[s.pr.a], b = pos[s.pr.b];
    const sz = 10;
    ctx.globalAlpha = 0.8 * Math.sin(q * Math.PI);
    ctx.drawImage(amberSprite, a[0] + (b[0] - a[0]) * q - sz / 2, a[1] + (b[1] - a[1]) * q - sz / 2, sz, sz);
  }
  // Neurons
  for (let i = 0; i < visible; i++) {
    const n = w.nodes[i], tw = 0.6 + 0.4 * Math.sin(t / 600 + n.ph);
    let size = n.s * (2.6 + boost[i] * 2.2 + ignite * 1.5) * (0.85 + 0.3 * tw);
    if (i === 0) size *= 1.5 + 0.5 * Math.sin(t / 380);
    ctx.globalAlpha = clamp((0.45 + glow * 0.4) * tw + boost[i] * 0.5 + ignite * 0.5, 0, 1) * (glitching ? rand(0.5, 1) : 1);
    ctx.drawImage(sprite(n.c), pos[i][0] - size * 2, pos[i][1] - size * 2, size * 4, size * 4);
  }
  // The first spark, alone in the dark
  if (lit < 0.03) {
    const s = 10 + 6 * Math.sin(t / 420);
    ctx.globalAlpha = 0.9; ctx.drawImage(sprite(COL.rose), cx - s * 2, cy - s * 2, s * 4, s * 4);
  }
  ctx.globalAlpha = 1;

  // Memory fragments drifting past
  drawShards(ctx, t, dt, L, val('shards'));

  // Vyom: a lantern made of mathematics
  if (vy > 0.01) drawVyom(ctx, t, dt, L, vy, glitching);

  // Cracks of white light (the awakening)
  const crack = val('crack');
  if (crack > 0.001 && w.cracks.length) {
    ctx.lineCap = 'round';
    for (const pass of [[9, 0.12], [2.2, 0.85]]) {
      ctx.lineWidth = pass[0]; ctx.strokeStyle = `rgba(255,248,240,${pass[1]})`;
      ctx.beginPath();
      for (const pts of w.cracks) {
        const segs = (pts.length - 1) * crack;
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let s = 1; s <= Math.ceil(segs); s++) {
          const f = Math.min(1, segs - (s - 1)), [x0, y0] = pts[s - 1], [x1, y1] = pts[s];
          ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
        }
      }
      ctx.stroke();
    }
  }
  if (ignite > 0.01) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.55);
    g.addColorStop(0, `rgba(255,226,196,${(ignite * 0.32).toFixed(3)})`); g.addColorStop(1, 'rgba(232,168,124,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // Breath between exchanges: the dreaming mind inhales
  const b = (t - D.breathT) / 800;
  if (b >= 0 && b < 1) { ctx.fillStyle = `rgba(0,0,0,${(0.05 * Math.sin(b * Math.PI)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}

function drawPatterns(ctx, t, W, H, level) {
  const w = D.world;
  if (level > 0.25 && Math.random() < 0.006 && w.patterns.length < 2) {
    w.patterns.push({ kind: ['tri', 'spiral', 'hex'][Math.floor(Math.random() * 3)], x: rand(0.12, 0.88) * W, y: rand(0.15, 0.8) * H, r: rand(26, 60), t0: t, rot: rand(0, 6.28) });
  }
  w.patterns = w.patterns.filter(p => t - p.t0 < 2600);
  for (const p of w.patterns) {
    const q = (t - p.t0) / 2600, a = Math.sin(q * Math.PI) * 0.22 * level;
    ctx.strokeStyle = `rgba(231,180,160,${a.toFixed(3)})`; ctx.lineWidth = 1;
    ctx.beginPath();
    if (p.kind === 'spiral') {
      for (let s = 0; s < 60; s++) { const an = p.rot + s * 0.25, r = p.r * s / 60; const x = p.x + Math.cos(an) * r, y = p.y + Math.sin(an) * r; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    } else {
      const k = p.kind === 'tri' ? 3 : 6;
      for (let s = 0; s <= k; s++) { const an = p.rot + (s / k) * 6.283; const x = p.x + Math.cos(an) * p.r, y = p.y + Math.sin(an) * p.r; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    }
    ctx.stroke();
  }
}

function drawEarth(ctx, t, L, a) {
  const { ex, ey, er } = L;
  let flick = 1;
  const ct = t - D.citiesT;
  if (ct >= 0 && ct < 900) flick = 0.55 + 0.45 * Math.abs(Math.sin(ct / 60));
  const al = a * flick;
  const atm = ctx.createRadialGradient(ex, ey, er * 0.9, ex, ey, er * 1.7);
  atm.addColorStop(0, `rgba(231,180,160,${(0.16 * al).toFixed(3)})`); atm.addColorStop(1, 'rgba(231,180,160,0)');
  ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(ex, ey, er * 1.7, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const body = ctx.createRadialGradient(ex - er * 0.35, ey - er * 0.4, er * 0.1, ex, ey, er);
  body.addColorStop(0, `rgba(30,95,110,${(0.75 * al).toFixed(3)})`); body.addColorStop(0.65, `rgba(22,30,80,${(0.8 * al).toFixed(3)})`); body.addColorStop(1, `rgba(12,0,36,${(0.85 * al).toFixed(3)})`);
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(231,180,160,${(0.45 * al).toFixed(3)})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(ex, ey, er, -2.6, -0.9); ctx.stroke();
  const cities = val('cities');
  if (cities > 0.01) {
    const sp = sprite('#ffd9b8');
    D.world.cities.forEach((c, i) => {
      const appear = clamp((ct - i * 70) / 300, 0, 1);
      if (appear <= 0) return;
      const tw = 0.6 + 0.4 * Math.sin(t / 340 + c.ph), s = er * 0.11 * (0.8 + 0.4 * tw);
      ctx.globalAlpha = cities * appear * tw * flick;
      ctx.drawImage(sp, ex + c.x * er - s, ey + c.y * er - s, s * 2, s * 2);
    });
    ctx.globalAlpha = 1;
  }
}

function drawShards(ctx, t, dt, L, level) {
  const w = D.world, { W, H } = L;
  if (level > 0.3 && Math.random() < dt * 0.6 * level && w.shards.length < 5) {
    const fromLeft = Math.random() < 0.5, sz = rand(46, 78);
    w.shards.push({ x: fromLeft ? -sz : W + sz, y: rand(0.12, 0.75) * H, vx: (fromLeft ? 1 : -1) * rand(22, 46), vy: rand(-8, 8), rot: rand(-0.4, 0.4), vr: rand(-0.12, 0.12),
      w: sz, h: sz * rand(0.7, 1), kind: SHARD_KINDS[Math.floor(Math.random() * SHARD_KINDS.length)], eq: SHARD_EQ[Math.floor(Math.random() * SHARD_EQ.length)], t0: t, life: rand(9000, 13000) });
  }
  w.shards = w.shards.filter(s => t - s.t0 < s.life);
  for (const s of w.shards) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
    const q = (t - s.t0) / s.life, a = Math.sin(q * Math.PI) * 0.8 * Math.max(level, 0.3);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.beginPath(); ctx.moveTo(-s.w / 2, -s.h / 2 + 6); ctx.lineTo(s.w / 2 - 8, -s.h / 2); ctx.lineTo(s.w / 2, s.h / 2 - 5); ctx.lineTo(-s.w / 2 + 6, s.h / 2); ctx.closePath();
    ctx.fillStyle = `rgba(212,229,247,${(0.05 * a).toFixed(3)})`; ctx.fill();
    ctx.strokeStyle = `rgba(212,229,247,${(0.3 * a).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = ctx.fillStyle = `rgba(212,229,247,${(0.55 * a).toFixed(3)})`;
    const r = s.w * 0.26;
    ctx.beginPath();
    if (s.kind === 'eq') { ctx.font = `600 ${Math.round(s.w * 0.2)}px Manrope, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.eq, 0, 0); }
    else if (s.kind === 'earth') { ctx.arc(0, 0, r, 0, 6.283); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -r * 0.5, r, 0); ctx.moveTo(-r * 0.8, r * 0.45); ctx.quadraticCurveTo(0, r * 0.1, r * 0.8, r * 0.45); ctx.stroke(); }
    else if (s.kind === 'cockpit') { ctx.arc(0, r * 1.2, r * 1.7, -2.6, -0.54); ctx.moveTo(-r * 1.2, r * 0.3); ctx.lineTo(r * 1.2, r * 0.1); ctx.moveTo(0, -r * 0.2); ctx.arc(0, -r * 0.2, r * 0.25, 0, 6.283); ctx.stroke(); }
    else { ctx.moveTo(0, r * 1.1); ctx.lineTo(0, -r * 0.6); ctx.moveTo(-r * 0.7, r * 1.1); ctx.lineTo(r * 0.7, r * 1.1); ctx.moveTo(r * 0.28, -r * 0.6); ctx.arc(0, -r * 0.6, r * 0.28, 0, 6.283); ctx.stroke(); }
    ctx.restore();
  }
}

// Icosahedron: 12 vertices, 20 faces
const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_V = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]].map(v => { const l = Math.hypot(...v); return v.map(c => c / l); });
const ICO_F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];

function project(v, ax, ay, r, x0, y0) {
  let [x, y, z] = v;
  let c = Math.cos(ay), s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(ax); s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c];
  const p = 1 / (1 - z * 0.25);
  return [x0 + x * r * p, y0 + y * r * p, z];
}

function drawVyom(ctx, t, dt, L, vis, glitching) {
  D.rot += dt;
  let { vx, vy, vr } = L;
  const flick = D.phase <= 1 ? 0.6 + 0.4 * Math.abs(Math.sin(t / 170) * Math.sin(t / 530)) : 1;
  let a = vis * flick;
  if (glitching) { vx += rand(-7, 7); a *= rand(0.35, 1); }
  // Warm halo
  const halo = ctx.createRadialGradient(vx, vy, 0, vx, vy, vr * 2.2);
  halo.addColorStop(0, `rgba(232,168,124,${(0.22 * a).toFixed(3)})`); halo.addColorStop(1, 'rgba(232,168,124,0)');
  ctx.fillStyle = halo; ctx.fillRect(vx - vr * 2.2, vy - vr * 2.2, vr * 4.4, vr * 4.4);
  const ax = D.rot * 0.31, ay = D.rot * 0.22;
  for (const [scale, sign, alpha] of [[1, 1, 1], [0.46, -1.6, 0.6]]) {
    const pts = ICO_V.map(v => project(v, ax * sign, ay * sign, vr * scale, vx, vy));
    const faces = ICO_F.map(f => ({ f, z: (pts[f[0]][2] + pts[f[1]][2] + pts[f[2]][2]) / 3 })).sort((p, q) => p.z - q.z);
    faces.forEach(({ f, z }, i) => {
      const front = z > 0;
      ctx.beginPath(); ctx.moveTo(pts[f[0]][0], pts[f[0]][1]); ctx.lineTo(pts[f[1]][0], pts[f[1]][1]); ctx.lineTo(pts[f[2]][0], pts[f[2]][1]); ctx.closePath();
      if (front) { ctx.fillStyle = `rgba(212,149,107,${((0.05 + 0.04 * Math.sin(t / 900 + i)) * a * alpha).toFixed(3)})`; ctx.fill(); }
      ctx.strokeStyle = `rgba(232,168,124,${((front ? 0.55 : 0.16) * a * alpha).toFixed(3)})`; ctx.lineWidth = front ? 1.3 : 0.8; ctx.stroke();
    });
    // Equation fragments flicker on the front faces of the outer shell
    if (scale === 1) {
      const slot = Math.floor(t / 2600);
      ctx.font = `500 ${Math.round(vr * 0.15)}px "Cormorant Garamond", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      faces.filter(x => x.z > 0.35).slice(-4).forEach(({ f }, i) => {
        const cx = (pts[f[0]][0] + pts[f[1]][0] + pts[f[2]][0]) / 3, cy = (pts[f[0]][1] + pts[f[1]][1] + pts[f[2]][1]) / 3;
        const ph = ((t % 2600) / 2600);
        ctx.fillStyle = `rgba(255,214,180,${(0.5 * a * Math.sin(ph * Math.PI)).toFixed(3)})`;
        ctx.fillText(FRAGMENTS[(slot * 3 + i * 5 + f[0]) % FRAGMENTS.length], cx, cy);
      });
    }
  }
  // Almost human, for a moment: the suggestion of eyes
  if (t > D.eyesT + 9000) D.eyesT = t + rand(0, 4000);
  const e = (t - D.eyesT) / 1400;
  if (e > 0 && e < 1 && vis > 0.6) {
    ctx.globalAlpha = Math.sin(e * Math.PI) * 0.75 * a;
    const s = vr * 0.16, sp = sprite(COL.amber);
    ctx.drawImage(sp, vx - vr * 0.22 - s, vy - vr * 0.08 - s, s * 2, s * 2);
    ctx.drawImage(sp, vx + vr * 0.22 - s, vy - vr * 0.08 - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }
}

/** Small amber polyhedron icon (HUD + supply drop). */
export function vyomIcon(cls = '') {
  return `<span class="vyom-icon ${cls}" aria-hidden="true"><svg viewBox="-12 -12 24 24"><path d="M0-10 8.7-5V5L0 10-8.7 5V-5ZM0-10V-3.3L8.7-5M0-3.3-8.7-5M0-3.3 5.2 5.6H-5.2ZM-8.7 5-5.2 5.6 0 10 5.2 5.6 8.7 5M-8.7-5-5.2 5.6M8.7-5 5.2 5.6"/></svg></span>`;
}
