// ════════════════════════════════════════════════════════════════
//  STORY PLAYER — full-screen story panels with a typewriter effect.
//  Used for the opening sequence, chapter openings/endings and mission
//  briefings. The canvas behind it draws the panel's `art` (render.js).
//
//  playScene({ kicker, title, lines:[{who?, kicker?, text, art?}], art,
//              final?: { html, button }, onDone, onCancel?, name, sound })
//  Keys: Enter/Space/→ = next (or finish typing) · Esc = skip ahead
// ════════════════════════════════════════════════════════════════

import { $ } from './dom.js';
import { esc } from '../core/util.js';
import { CAST, fill } from '../data/story.js';

let scene = null;          // { opts, i, typing, timer, shown }
let reduced = false;
export function setStoryReducedMotion(v) { reduced = v; }

export const storyActive = () => !!scene;
/** Art key for the canvas behind the panel. */
export function storyArt() {
  if (!scene) return null;
  const line = scene.opts.lines[Math.min(scene.i, scene.opts.lines.length - 1)];
  return line?.art || scene.opts.art || 'earth';
}

export function playScene(opts) {
  stop();
  scene = { opts, i: 0, typing: false, timer: null };
  if (!opts.lines.length && opts.final) scene.i = 0;
  draw();
}

function stop() { if (!scene) return; if (scene.timer) clearInterval(scene.timer); scene.timer = null; scene.typing = false; }

function draw() {
  const { opts } = scene;
  const root = $('storyScreen');
  const onFinal = scene.i >= opts.lines.length;
  const line = onFinal ? null : opts.lines[scene.i];
  const who = line?.who ? CAST[line.who] : null;
  const total = opts.lines.length + (opts.final ? 1 : 0);
  const dots = Array.from({ length: total }, (_, k) => `<i class="${k === scene.i ? 'on' : k < scene.i ? 'done' : ''}"></i>`).join('');
  const kicker = line?.kicker || opts.kicker || '';
  const nextLabel = onFinal ? (opts.final.button || 'CONTINUE') : scene.i === opts.lines.length - 1 && !opts.final ? 'CONTINUE' : 'NEXT';

  root.innerHTML = `
    <div class="st-top">
      ${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ''}
      ${opts.title ? `<h2 class="st-title">${esc(opts.title)}</h2>` : ''}
    </div>
    <div class="st-panel glass ${who ? 'talk' : 'narrate'} ${onFinal ? 'final' : ''}" id="stPanel">
      ${who ? `<div class="st-who"><span class="st-face" style="--c:${who.color}">${who.glyph}</span>
        <div><b style="color:${who.color}">${esc(who.name)}</b><span>${esc(who.role)}</span></div></div>` : ''}
      ${onFinal ? `<div class="st-final">${opts.final.html}</div>` : `<p class="st-text" id="stText"></p>`}
      <div class="st-foot">
        <span class="st-dots">${dots}</span><span class="spacer"></span>
        ${!onFinal ? `<button class="btn ghost small" id="stSkip">SKIP <kbd>Esc</kbd></button>` : opts.onCancel ? `<button class="btn ghost small" id="stCancel">BACK <kbd>Esc</kbd></button>` : ''}
        <button class="btn primary small" id="stNext">${nextLabel} ▸ <kbd>Enter</kbd></button>
      </div>
    </div>`;
  root.classList.toggle('st-briefing', !!opts.final);
  $('stNext').onclick = e => { e.stopPropagation(); advance(); };
  if ($('stSkip')) $('stSkip').onclick = e => { e.stopPropagation(); skip(); };
  if ($('stCancel')) $('stCancel').onclick = e => { e.stopPropagation(); cancel(); };
  $('stPanel').onclick = e => { if (!e.target.closest('button')) advance(); };
  if (line) type(fill(line.text, opts.name));
}

function type(text) {
  const el = $('stText');
  scene.full = text;
  if (reduced) { el.textContent = text; scene.typing = false; return; }
  let n = 0; scene.typing = true;
  scene.timer = setInterval(() => {
    n = Math.min(text.length, n + 2);
    el.textContent = text.slice(0, n);
    if (n % 6 === 0) scene.opts.sound?.('key');
    if (n >= text.length) { clearInterval(scene.timer); scene.typing = false; }
  }, 22);
}

export function advance() {
  if (!scene) return;
  if (scene.typing) { stop(); const el = $('stText'); if (el) el.textContent = scene.full; return; }
  scene.opts.sound?.('click');
  scene.i++;
  const end = scene.opts.lines.length + (scene.opts.final ? 1 : 0);
  if (scene.i >= end) return finish();
  draw();
}

/** Esc: jump to the final card if there is one, otherwise end the scene. */
export function skip() {
  if (!scene) return;
  stop();
  if (scene.opts.final && scene.i < scene.opts.lines.length) { scene.i = scene.opts.lines.length; draw(); return; }
  if (scene.opts.final && scene.opts.onCancel) return cancel();
  finish();
}

function cancel() { const s = scene; stop(); scene = null; s.opts.onCancel?.(); }
function finish() { const s = scene; stop(); scene = null; s.opts.onDone?.(); }

/** Keyboard routing from main.js while a scene is open. Returns true if handled. */
export function storyKey(e) {
  if (!scene) return false;
  const k = e.key;
  if (k === 'Enter' || k === ' ' || k === 'ArrowRight') { e.preventDefault(); advance(); return true; }
  if (k === 'Escape') { e.preventDefault(); skip(); return true; }
  return true;
}
