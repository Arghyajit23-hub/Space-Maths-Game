// ════════════════════════════════════════════════════════════════
//  RENDERER — draws a Game onto a 2D canvas in logical VIEW.W×VIEW.H units.
//  Nebula backgrounds are pre-rendered per theme; particles use additive
//  blending instead of shadowBlur for speed.
// ════════════════════════════════════════════════════════════════

import { CONFIG, VIEW } from '../config.js';
import { LAYOUT } from './game.js';

const FONT = "'Orbitron', 'Segoe UI Symbol', 'Segoe UI', sans-serif";
export const MULT_COLORS = ['#00e5ff', '#00e5ff', '#69f0ae', '#ffd740', '#ff6e40', '#e040fb'];

let reducedMotion = false;
export function setReducedMotion(v) { reducedMotion = v; }

const bgCache = new Map();
function nebula(hue, hue2) {
  const key = `${hue}-${hue2}-${VIEW.W}x${VIEW.H}`;
  if (bgCache.has(key)) return bgCache.get(key);
  const c = document.createElement('canvas'); c.width = VIEW.W; c.height = VIEW.H * 2;
  const g = c.getContext('2d');
  const base = g.createLinearGradient(0, 0, 0, c.height);
  base.addColorStop(0, `hsl(${hue}, 60%, 4%)`); base.addColorStop(0.5, `hsl(${hue2}, 50%, 3%)`); base.addColorStop(1, `hsl(${hue}, 60%, 4%)`);
  g.fillStyle = base; g.fillRect(0, 0, VIEW.W, c.height);
  const blobs = [[0.25, 0.2, 420, hue], [0.75, 0.45, 380, hue2], [0.4, 0.75, 460, hue], [0.8, 0.95, 340, hue2], [0.2, 1.3, 400, hue2], [0.7, 1.6, 420, hue], [0.25, 1.95, 360, hue]];
  for (const [x, y, r, h] of blobs) {
    const gr = g.createRadialGradient(x * VIEW.W, y * VIEW.H, 0, x * VIEW.W, y * VIEW.H, r);
    gr.addColorStop(0, `hsla(${h}, 70%, 35%, 0.16)`); gr.addColorStop(0.5, `hsla(${h}, 60%, 25%, 0.06)`); gr.addColorStop(1, 'transparent');
    g.fillStyle = gr; g.fillRect(0, 0, VIEW.W, c.height);
  }
  if (bgCache.size > 8) bgCache.clear();
  bgCache.set(key, c);
  return c;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Stars + nebula only (menus). */
export function renderBackdrop(ctx, game, now, theme = { hue: 225, hue2: 270 }) {
  const t = now / 1000;
  ctx.drawImage(nebula(theme.hue, theme.hue2), 0, -VIEW.H + ((t * 6) % VIEW.H), VIEW.W, VIEW.H * 2);
  drawStars(ctx, game, t, 0);
  drawEarth(ctx, VIEW.W / 2, VIEW.H - 150, t, 1);
}

function drawStars(ctx, game, t, warp) {
  const speed = 18 + warp * 900;
  ctx.fillStyle = '#cfd8ff';
  for (const s of game.stars) {
    s.y += s.z * speed * 0.016;
    if (s.y > VIEW.H) { s.y -= VIEW.H; s.x = Math.random() * VIEW.W; }
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + s.tw));
    if (warp > 0.05) {
      ctx.globalAlpha = 0.25 + 0.5 * warp;
      ctx.fillRect(s.x, s.y - s.z * warp * 60, s.z * 0.8, s.z * warp * 60);
    }
    ctx.globalAlpha = 0.2 + tw * 0.55 * (s.z / 3);
    ctx.fillRect(s.x, s.y, s.z * 0.9, s.z * 0.9);
  }
  ctx.globalAlpha = 1;
}

export function renderGame(ctx, game, now) {
  const t = now / 1000;
  const theme = game.theme || { hue: 225, hue2: 270 };
  ctx.save();
  if (game.shake && !reducedMotion) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);

  const neb = nebula(theme.hue, theme.hue2);
  ctx.drawImage(neb, 0, -VIEW.H + ((t * 6 + game.warp * t * 200) % VIEW.H), VIEW.W, VIEW.H * 2);
  drawStars(ctx, game, t, game.warp);
  drawEarth(ctx, VIEW.W / 2, VIEW.shipY + 62, t, game.hull / Math.max(1, game.mods.hullMax));

  // ── Defense perimeter ──
  const maxP = game.threats.reduce((m, th) => (!th.dying && !th.ally && th.kind !== 'boss' ? Math.max(m, th.progress) : m), 0);
  const danger = Math.max(0, (maxP - 0.55) / 0.45);
  ctx.strokeStyle = `rgba(255, ${Math.round(80 + 140 * (1 - danger))}, ${Math.round(120 * (1 - danger))}, ${0.12 + danger * (0.35 + 0.25 * Math.sin(t * 14))})`;
  ctx.lineWidth = 2; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.moveTo(40, LAYOUT.IMPACT_Y); ctx.lineTo(VIEW.W - 40, LAYOUT.IMPACT_Y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(160,210,255,0.35)';
  ctx.fillText('DEFENSE LINE', 44 + VIEW.safe.l, LAYOUT.IMPACT_Y - 6);

  // ── Debris clusters: a faint tether shows which rocks share one answer ──
  const groups = new Map();
  for (const th of game.threats) if (th.group && !th.dying) (groups.get(th.group) || groups.set(th.group, []).get(th.group)).push(th);
  ctx.strokeStyle = 'rgba(178,255,89,0.25)'; ctx.lineWidth = 1.5;
  for (const g of groups.values()) if (g.length > 1) { ctx.beginPath(); g.forEach((m, i) => (i ? ctx.lineTo(m.x, m.y) : ctx.moveTo(m.x, m.y))); ctx.closePath(); ctx.stroke(); }

  // ── Threats ──
  for (const th of game.threats) drawThreat(ctx, th, th === game.target, t);

  // ── Lasers ──
  ctx.globalCompositeOperation = 'lighter';
  for (const l of game.lasers) {
    const col = l.mult === 0 ? '#ff5252' : MULT_COLORS[Math.min(l.mult, MULT_COLORS.length - 1)];
    ctx.strokeStyle = col; ctx.lineWidth = 10 * l.life; ctx.globalAlpha = l.life * 0.35;
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    ctx.globalAlpha = l.life; ctx.lineWidth = 3.5 * l.life;
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4 * l.life;
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
  }
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = `hsl(${p.hue}, 95%, ${p.light}%)`;
    const sz = p.size * (0.5 + p.life * 0.7);
    ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
  }
  for (const r of game.rings) {
    ctx.globalAlpha = Math.max(0, r.life) * 0.8;
    ctx.strokeStyle = r.color; ctx.lineWidth = (r.big ? 5 : 3) * r.life;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  if (game.phase !== 'dying' || game.phaseT < 0.35) drawShip(ctx, game, t);

  // ── Popups ──
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of game.popups) {
    ctx.globalAlpha = Math.min(1, p.life * 2.5);
    const pop = (p.big ? 1 + Math.max(0, p.life - 1.5) * 0.6 : 1) * (p.big ? Math.min(VIEW.ts, (VIEW.W - 40) / (p.size * p.text.length * 0.8)) : VIEW.ts);
    ctx.font = `900 ${p.size * pop}px ${FONT}`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,10,0.8)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    if (p.sub) {
      ctx.font = `700 ${Math.round(p.size * 0.5)}px ${FONT}`;
      ctx.strokeText(p.sub, p.x, p.y + p.size * 0.85);
      ctx.fillText(p.sub, p.x, p.y + p.size * 0.85);
    }
  }
  ctx.globalAlpha = 1;

  if (game.flash > 0) { ctx.fillStyle = `rgba(255, 20, 50, ${game.flash * (reducedMotion ? 0.2 : 0.45)})`; ctx.fillRect(0, 0, VIEW.W, VIEW.H); }
  if (game.healFlash > 0) { ctx.fillStyle = `rgba(80, 255, 170, ${game.healFlash * 0.12})`; ctx.fillRect(0, 0, VIEW.W, VIEW.H); }
  const crit = game.hull <= CONFIG.HULL_CRITICAL && game.phase !== 'dying';
  const vig = ctx.createRadialGradient(VIEW.W / 2, VIEW.H / 2, Math.min(VIEW.W, VIEW.H) * 0.52, VIEW.W / 2, VIEW.H / 2, Math.hypot(VIEW.W, VIEW.H) * 0.63);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, crit ? `rgba(120, 0, 20, ${0.55 + 0.25 * Math.sin(t * 6)})` : 'rgba(0, 0, 8, 0.55)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  ctx.restore();
}

// ── Threats ─────────────────────────────────────────────
function drawThreat(ctx, th, isTarget, t) {
  ctx.save();
  let alpha = 1, scale = 1;
  if (th.dying) { const k = Math.max(0, th.dieT / (th.kind === 'boss' ? 1.2 : 0.5)); alpha = k; scale = 1 + (1 - k) * 0.6; }
  ctx.globalAlpha = alpha;
  ctx.translate(th.x, th.y);

  if (th.kind === 'boss') drawBoss(ctx, th, t, scale);
  else {
    ctx.save(); ctx.scale(scale, scale);
    if (!th.dying) drawTrail(ctx, th, t, th.kind === 'revenant' ? 290 : th.kind === 'cloaked' ? 260 : th.kind === 'shield' ? 185 : 25);
    switch (th.kind) {
      case 'rock': th.mini && th.hue === 190 ? drawFracturing(ctx, th, t) : drawStony(ctx, th); break;
      case 'splitter': drawFracturing(ctx, th, t); break;
      case 'beacon': drawTagged(ctx, th, t); break;
      case 'mirror': drawTwin(ctx, th, t); break;
      case 'ally': drawAlly(ctx, th, t); break;
      case 'revenant': drawReturning(ctx, th, t); break;
      case 'cloaked': ctx.globalAlpha *= 0.55 + 0.3 * Math.sin(t * 5 + th.id); drawDark(ctx, th, t); break;
      case 'shield': drawIron(ctx, th, t); if (th.hp > 1) drawIceCrust(ctx, th, t); break;
      default: th.mini ? drawDebris(ctx, th, t) : drawIron(ctx, th, t);
    }
    ctx.restore();
  }

  if (!th.dying) {
    const p = th.kind === 'boss' ? Math.min(1, th.qElapsed / th.allowed) : th.progress;
    if (isTarget && th.kind !== 'boss') drawReticle(ctx, th, t, p);
    drawPlate(ctx, th, isTarget, p);
  }
  ctx.restore();
}

// ── Meteors ─────────────────────────────────────────────
// Every threat is a rock now; kinds differ by material, glow and markings.
function shapeOf(th) {
  if (th.shape) return th.shape;
  // Iron/dark/ice meteors spawn without a shape: build a stable one from the id
  let seed = (th.id * 9301 + 49297) % 233280;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const n = 10 + Math.floor(rnd() * 3), pts = [];
  for (let i = 0; i < n; i++) pts.push([Math.cos((i / n) * 6.283), Math.sin((i / n) * 6.283), 0.78 + rnd() * 0.28]);
  th.shape = { pts, craters: Array.from({ length: 3 }, () => [rnd() * 0.9 - 0.45, rnd() * 0.9 - 0.45, 0.1 + rnd() * 0.12]) };
  return th.shape;
}

function rockPath(ctx, th, r) {
  const sh = shapeOf(th);
  ctx.beginPath();
  sh.pts.forEach(([x, y, k], i) => (i ? ctx.lineTo(x * r * k, y * r * k) : ctx.moveTo(x * r * k, y * r * k)));
  ctx.closePath();
}

/** Atmospheric entry trail: points up-stream, hotter as the meteor falls. */
function drawTrail(ctx, th, t, hue = 25) {
  if (th.ally || reducedMotion && th.kind !== 'boss') return;
  const p = th.kind === 'boss' ? 0.6 : th.progress;
  const r = th.kind === 'boss' ? 90 : th.size;
  const len = r * (1.4 + p * 2.6) * (th.mini ? 0.8 : 1);
  // Velocity ≈ (drift, fall distance) per unit progress; the trail points the opposite way
  ctx.save();
  ctx.rotate(Math.atan2(-(th.drift || 0), VIEW.impactY + 50));
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  const heat = 0.25 + p * 0.55;
  g.addColorStop(0, `hsla(${hue}, 100%, ${70 + p * 20}%, ${heat})`);
  g.addColorStop(0.35, `hsla(${hue}, 95%, 55%, ${heat * 0.45})`);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  const w = r * (0.75 + 0.08 * Math.sin(t * 20 + th.id));
  ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, -len * 1.1, w, 0); ctx.arc(0, 0, w, 0, Math.PI); ctx.fill();
  ctx.restore();
}

function drawStony(ctx, th, light = 48, sat = 22) {
  const r = th.size;
  ctx.rotate(th.rot);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, `hsl(${th.hue}, ${sat}%, ${light}%)`); g.addColorStop(1, `hsl(${th.hue}, ${sat + 3}%, ${light * 0.33}%)`);
  ctx.fillStyle = g; rockPath(ctx, th, r); ctx.fill();
  ctx.strokeStyle = `hsla(${th.hue}, 40%, 70%, 0.35)`; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = `hsla(${th.hue}, 25%, 10%, 0.45)`;
  for (const [cx, cy, cr] of shapeOf(th).craters) { ctx.beginPath(); ctx.arc(cx * r, cy * r, cr * r, 0, 6.283); ctx.fill(); }
}

function drawIron(ctx, th, t) {
  const r = th.size;
  ctx.rotate(th.rot);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r * 1.15);
  g.addColorStop(0, '#d7dee8'); g.addColorStop(0.35, '#7d8796'); g.addColorStop(1, '#22272f');
  ctx.fillStyle = g; rockPath(ctx, th, r); ctx.fill();
  ctx.strokeStyle = 'rgba(200,215,235,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = 'rgba(15,18,24,0.45)';
  for (const [cx, cy, cr] of shapeOf(th).craters) { ctx.beginPath(); ctx.arc(cx * r, cy * r, cr * r * 0.8, 0, 6.283); ctx.fill(); }
  // glowing leading edge from re-entry heat
  ctx.rotate(-th.rot);
  ctx.globalCompositeOperation = 'lighter';
  const hot = ctx.createRadialGradient(0, r * 0.55, 0, 0, r * 0.55, r * 0.9);
  hot.addColorStop(0, `rgba(255,150,60,${0.25 + 0.4 * th.progress})`); hot.addColorStop(1, 'transparent');
  ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(0, r * 0.55, r * 0.9, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function drawDark(ctx, th, t) {
  const r = th.size;
  ctx.rotate(th.rot);
  ctx.fillStyle = '#0d0b16'; rockPath(ctx, th, r); ctx.fill();
  ctx.strokeStyle = `rgba(179,136,255,${0.35 + 0.25 * Math.sin(t * 4 + th.id)})`; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawIceCrust(ctx, th, t) {
  const r = th.size * 1.32;
  ctx.save();
  ctx.rotate(th.rot * 0.5);
  ctx.globalAlpha *= 0.85;
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 2, 0, 0, r);
  g.addColorStop(0, 'rgba(225,250,255,0.55)'); g.addColorStop(0.7, 'rgba(128,222,234,0.22)'); g.addColorStop(1, 'rgba(100,255,218,0.4)');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283; const k = 0.9 + 0.1 * Math.sin(i * 2.3); i ? ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k) : ctx.moveTo(Math.cos(a) * r * k, Math.sin(a) * r * k); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `rgba(178,255,255,${0.6 + 0.3 * Math.sin(t * 5)})`; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function drawFracturing(ctx, th, t) {
  drawStony(ctx, { ...th, hue: 195 }, 52, 30);
  const r = th.size;
  const crack = Math.min(1, th.progress / CONFIG.SPLIT_AT);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(128,222,234,${0.35 + crack * 0.65})`; ctx.lineWidth = 1.5 + crack * 2;
  ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.85); ctx.lineTo(r * 0.12, -r * 0.2); ctx.lineTo(-r * 0.08, r * 0.3); ctx.lineTo(r * 0.05, r * (0.3 + 0.5 * crack));
  ctx.moveTo(r * 0.12, -r * 0.2); ctx.lineTo(r * 0.6 * crack, r * 0.05); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

function drawDebris(ctx, th, t) {
  const r = th.size;
  ctx.rotate(th.rot * 1.6);
  ctx.fillStyle = `hsl(${th.hue}, 25%, 30%)`; rockPath(ctx, th, r); ctx.fill();
  ctx.strokeStyle = `hsla(${th.hue}, 90%, 65%, 0.8)`; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawTagged(ctx, th, t) {
  drawStony(ctx, { ...th, hue: 270 }, 42, 15);
  ctx.rotate(-th.rot);
  const s = th.size, pulse = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.strokeStyle = `hsla(${th.hue}, 100%, 80%, ${1 - pulse})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, s * (0.9 + pulse), 0, 6.283); ctx.stroke();
  ctx.fillStyle = th.revealLeft > 0 ? '#fff' : `hsl(${th.hue}, 60%, 45%)`;
  ctx.beginPath(); ctx.arc(s * 0.35, -s * 0.35, 4 + pulse * 2, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s * 0.35, -s * 0.35); ctx.lineTo(s * 0.55, -s * 0.75); ctx.stroke();
}

function drawTwin(ctx, th, t) {
  const s = th.size;
  ctx.rotate(t * 0.6 + th.id);
  for (const [dx, k, l] of [[-s * 0.45, 0.62, 55], [s * 0.5, 0.52, 42]]) {
    ctx.save(); ctx.translate(dx, 0);
    const g = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 2, 0, 0, s * k);
    g.addColorStop(0, `hsl(205, 30%, ${l}%)`); g.addColorStop(1, 'hsl(215, 35%, 14%)');
    ctx.fillStyle = g; rockPath(ctx, th, s * k); ctx.fill();
    ctx.strokeStyle = 'rgba(179,229,252,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
}

function drawReturning(ctx, th, t) {
  const s = th.size;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 2; i >= 1; i--) {
    ctx.globalAlpha = 0.12 * i;
    ctx.fillStyle = '#e040fb';
    ctx.save(); ctx.translate(0, -i * 14); rockPath(ctx, th, s * (1 - i * 0.1)); ctx.fill(); ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.rotate(th.rot);
  const g = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 2, 0, 0, s * 1.1);
  g.addColorStop(0, '#ce93d8'); g.addColorStop(1, '#2a0d36');
  ctx.fillStyle = g; rockPath(ctx, th, s); ctx.fill();
  ctx.strokeStyle = '#ea80fc'; ctx.lineWidth = 1.8; ctx.stroke();
}

function drawAlly(ctx, th, t) {
  const s = th.size;
  ctx.scale(th.dir, 1);
  ctx.fillStyle = '#1b3a24';
  roundRect(ctx, -s * 1.1, -s * 0.35, s * 1.8, s * 0.7, 6); ctx.fill();
  ctx.strokeStyle = '#69f0ae'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#2e7d32'; ctx.fillRect(-s * 0.9, -s * 0.25, s * 0.5, s * 0.5); ctx.fillRect(-s * 0.3, -s * 0.25, s * 0.5, s * 0.5);
  ctx.fillStyle = '#b9f6ca'; ctx.font = `700 ${Math.round(s * 0.32)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('▤', -s * 0.65, 1); ctx.fillText('▤', -s * 0.05, 1);
  ctx.fillStyle = '#b9f6ca'; ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.35); ctx.lineTo(s * 1.1, 0); ctx.lineTo(s * 0.7, s * 0.35); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(105,240,174,${0.4 + 0.3 * Math.random()})`;
  ctx.beginPath(); ctx.moveTo(-s * 1.1, -s * 0.2); ctx.lineTo(-s * 1.6, 0); ctx.lineTo(-s * 1.1, s * 0.2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

const BOSS_R = 95;
function drawBoss(ctx, th, t, scale) {
  const h = th.hue, flash = th.hitFlash || 0, dmg = 1 - th.hp / th.maxHp;
  ctx.save(); ctx.scale(scale, scale);
  drawTrail(ctx, th, t, 18);
  const glow = ctx.createRadialGradient(0, 0, BOSS_R * 0.6, 0, 0, BOSS_R * 2.1);
  glow.addColorStop(0, `hsla(${h}, 90%, 50%, ${0.22 + flash * 0.4})`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, BOSS_R * 2.1, 0, 6.283); ctx.fill();
  if (!th.shape) { th.size = BOSS_R; shapeOf(th); }
  ctx.save(); ctx.rotate(t * 0.08);
  const g = ctx.createRadialGradient(-BOSS_R * 0.35, -BOSS_R * 0.35, 6, 0, 0, BOSS_R * 1.1);
  g.addColorStop(0, flash > 0.3 ? '#fff' : '#8d7f73'); g.addColorStop(0.5, '#4a3f38'); g.addColorStop(1, '#14100e');
  ctx.fillStyle = g; rockPath(ctx, th, BOSS_R); ctx.fill();
  ctx.strokeStyle = `hsla(${h}, 70%, 60%, 0.55)`; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(10,8,6,0.45)';
  for (const [cx, cy, cr] of shapeOf(th).craters) { ctx.beginPath(); ctx.arc(cx * BOSS_R, cy * BOSS_R, cr * BOSS_R, 0, 6.283); ctx.fill(); }
  // Molten cracks spread as the planet-killer takes damage
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,${120 + 80 * Math.sin(t * 6)},40,${0.25 + dmg * 0.75})`; ctx.lineWidth = 2 + dmg * 3;
  const L = BOSS_R * (0.35 + dmg * 0.6);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.257 + 0.4;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * L * 0.5 + Math.sin(i) * 8, Math.sin(a) * L * 0.5); ctx.lineTo(Math.cos(a + 0.2) * L, Math.sin(a + 0.2) * L); ctx.stroke();
  }
  const core = ctx.createRadialGradient(0, 0, 2, 0, 0, 22 + dmg * 22);
  core.addColorStop(0, `rgba(255,220,150,${0.3 + dmg * 0.6})`); core.addColorStop(1, 'transparent');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, 44, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  ctx.restore();

  if (!th.dying) {
    const bw = 240, bh = 8, y = -BOSS_R - 34;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, -bw / 2 - 2, y - 2, bw + 4, bh + 4, 4); ctx.fill();
    ctx.fillStyle = `hsl(${h}, 90%, 60%)`;
    const seg = bw / th.maxHp;
    for (let i = 0; i < th.hp; i++) ctx.fillRect(-bw / 2 + i * seg + 1, y, seg - 2, bh);
    ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText((th.name || 'PLANET-KILLER').toUpperCase(), 0, y - 12);
  }
}

function drawReticle(ctx, th, t, p) {
  const r = th.size * 1.35 + (th.kind === 'splitter' ? 8 : 0);
  const col = p > 0.75 ? '#ff5252' : '#00e5ff';
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + (1 - p) * 6.283); ctx.stroke();
  ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.save(); ctx.rotate(reducedMotion ? 0 : t * 0.8);
  const b = r + 9, c = 12;
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(b, -c); ctx.lineTo(b, 0); ctx.lineTo(b - c, 0); ctx.stroke(); }
  ctx.restore();
}

/** What the plate shows right now (memory threats hide their text). */
export function plateText(th) {
  const c = th.challenge;
  if (c.reveal && th.revealLeft <= 0) {
    return c.mode === 'memory' ? c.prompt.replace(/\d/g, '▮') : '? ? ?';
  }
  return c.prompt;
}

function drawPlate(ctx, th, isTarget, p) {
  const text = plateText(th);
  const mini = th.mini && !isTarget;
  const fs = Math.round((isTarget ? 24 : mini ? 14 : 17) * VIEW.ts);
  ctx.font = `700 ${fs}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const pw = tw + (isTarget ? 30 : 20), ph = fs + (isTarget ? 16 : 10);
  const y = th.kind === 'boss' ? BOSS_R + 10 : th.kind === 'ally' ? th.size * 0.5 + 10 : th.size + 14;
  const hot = p > 0.75 && !th.ally;
  let border = isTarget ? (hot ? '#ff5252' : '#00e5ff') : 'rgba(160,200,255,0.25)';
  let bg = isTarget ? (hot ? 'rgba(60,0,10,0.88)' : 'rgba(0,18,34,0.88)') : 'rgba(0,6,16,0.7)';
  if (th.ally) { border = '#69f0ae'; bg = 'rgba(0,40,16,0.85)'; }
  if (th.kind === 'revenant') border = isTarget ? '#ea80fc' : 'rgba(234,128,252,0.5)';
  ctx.fillStyle = bg;
  roundRect(ctx, -pw / 2, y, pw, ph, 6); ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = isTarget || th.ally ? 2 : 1; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = th.ally ? '#b9f6ca' : isTarget ? '#fff' : 'rgba(220,235,255,0.8)';
  ctx.fillText(text, 0, y + ph / 2 + 1);
  // Caption above the plate
  const cap = th.ally ? 'ALLY · DO NOT FIRE' : th.kind === 'revenant' ? 'REVENANT' : th.kind === 'shield' && th.hp > 1 ? 'SHIELDED ×2' : th.challenge.label;
  if (cap) {
    ctx.font = `700 ${Math.round(10 * VIEW.ts)}px ${FONT}`;
    ctx.fillStyle = th.ally ? '#69f0ae' : th.kind === 'revenant' ? '#ea80fc' : th.kind === 'shield' ? '#64ffda' : '#ffd740';
    ctx.fillText(cap, 0, y + ph + 10 * VIEW.ts);
  }
}

// ── Player ship ─────────────────────────────────────────
const HULLS = {
  interceptor: [[0, -40], [10, -14], [44, 10], [46, 22], [16, 16], [10, 22], [-10, 22], [-16, 16], [-46, 22], [-44, 10], [-10, -14]],
  scout: [[0, -46], [8, -10], [30, 14], [30, 22], [10, 18], [6, 22], [-6, 22], [-10, 18], [-30, 22], [-30, 14], [-8, -10]],
  gunship: [[0, -34], [16, -20], [52, 0], [54, 22], [22, 20], [14, 24], [-14, 24], [-22, 20], [-54, 22], [-52, 0], [-16, -20]],
  carrier: [[0, -36], [22, -24], [48, -4], [50, 24], [24, 24], [-24, 24], [-50, 24], [-48, -4], [-22, -24]],
  phantom: [[0, -44], [6, -6], [50, 18], [18, 12], [0, 22], [-18, 12], [-50, 18], [-6, -6]],
};

export function drawShipShape(ctx, shape, color, trail, mult = 1, t = 0, flame = true) {
  if (flame) {
    ctx.globalCompositeOperation = 'lighter';
    const fl = 18 + Math.random() * 8 + mult * 3;
    for (const ex of shape === 'phantom' ? [0] : [-14, 14]) {
      const g = ctx.createLinearGradient(0, 18, 0, 18 + fl);
      g.addColorStop(0, '#fff'); g.addColorStop(0.3, trail); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ex - 6, 18); ctx.lineTo(ex + 6, 18); ctx.lineTo(ex, 18 + fl); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = '#1b2436';
  ctx.beginPath();
  (HULLS[shape] || HULLS.interceptor).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
  if (shape === 'gunship') { ctx.fillStyle = color; ctx.fillRect(-40, -8, 4, 16); ctx.fillRect(36, -8, 4, 16); }
  if (shape === 'carrier') { ctx.strokeStyle = color; ctx.globalAlpha = 0.6; ctx.strokeRect(-18, -6, 36, 20); ctx.globalAlpha = 1; }
  ctx.strokeStyle = color; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-36, 14); ctx.lineTo(-16, 6); ctx.moveTo(36, 14); ctx.lineTo(16, 6); ctx.stroke();
  ctx.globalAlpha = 1;
  const cg = ctx.createLinearGradient(0, -26, 0, 0);
  cg.addColorStop(0, '#b3f5ff'); cg.addColorStop(1, '#1a5d7a');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(0, -10, 6, 14, 0, 0, 6.283); ctx.fill();
}

function drawShip(ctx, game, t) {
  const s = game.ship, mult = game.session.multiplier;
  const col = MULT_COLORS[Math.min(mult, MULT_COLORS.length - 1)];
  ctx.save();
  ctx.translate(s.x, s.y + s.recoil * 5);
  if (mult > 1) {
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 60 + mult * 6);
    aura.addColorStop(0, 'transparent'); aura.addColorStop(0.7, col + '22'); aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 60 + mult * 6, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  drawShipShape(ctx, game.shipDef.shape, mult > 1 ? col : game.shipDef.color, game.trail, mult, t);
  ctx.save(); ctx.rotate(s.aim + Math.PI / 2);
  ctx.fillStyle = col; ctx.fillRect(-2, -46, 4, 14);
  ctx.restore();
  if (s.hit > 0 || game.healFlash > 0) {
    const hit = s.hit > game.healFlash;
    ctx.globalAlpha = Math.max(s.hit, game.healFlash) * 0.8;
    ctx.strokeStyle = hit ? '#ff4081' : '#69f0ae'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -2, 62, 50, 0, 0, 6.283); ctx.stroke();
    ctx.fillStyle = hit ? 'rgba(255,64,129,0.12)' : 'rgba(105,240,174,0.1)'; ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ── Earth & story art ───────────────────────────────────
let cityCache = null;
function cityLights(R) {
  if (cityCache && cityCache.R === R) return cityCache.pts;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts = [];
  // Clustered "metro areas" spread along the visible limb
  for (let c = 0; c < 26; c++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 1.5, d = 14 + rnd() * 150;
    const n = 4 + Math.floor(rnd() * 9);
    for (let i = 0; i < n; i++) pts.push({ a: a + (rnd() - 0.5) * 0.03, d: d + (rnd() - 0.5) * 18, s: 0.8 + rnd() * 1.6, f: rnd() * 6.28, k: rnd() });
  }
  cityCache = { R, pts };
  return pts;
}

/** Night-side Earth seen from orbit: limb at y = top, city lights dim with `lights` (0..1). */
export function drawEarth(ctx, cx, top, t, lights = 1, R = Math.max(VIEW.W * 1.15, 1500)) {
  const cy = top + R;
  ctx.save();
  // Atmosphere glow
  const atm = ctx.createRadialGradient(cx, cy, R * 0.985, cx, cy, R + 70);
  atm.addColorStop(0, 'rgba(80,170,255,0.55)'); atm.addColorStop(0.25, 'rgba(60,140,255,0.22)'); atm.addColorStop(1, 'transparent');
  ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R + 70, Math.PI, 0); ctx.fill();
  // Planet body
  const body = ctx.createLinearGradient(0, top, 0, top + 260);
  body.addColorStop(0, '#0d2c55'); body.addColorStop(0.25, '#071a33'); body.addColorStop(1, '#020812');
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(140,210,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  // City lights (fewer and dimmer as the line takes damage)
  ctx.globalCompositeOperation = 'lighter';
  for (const p of cityLights(R)) {
    if (p.k > lights) continue;
    const x = cx + Math.cos(p.a) * (R - p.d), y = cy + Math.sin(p.a) * (R - p.d);
    if (x < -10 || x > VIEW.W + 10) continue;
    const tw = 0.6 + 0.4 * Math.sin(t * 2 + p.f);
    ctx.fillStyle = `rgba(255,${190 + Math.round(40 * p.k)},110,${(0.35 + 0.5 * tw) * (0.4 + 0.6 * lights)})`;
    ctx.fillRect(x, y, p.s, p.s);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function streak(ctx, x, y, len, ang, alpha, hue = 30, w = 2) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, 0, -len, 0);
  g.addColorStop(0, `hsla(${hue},100%,85%,${alpha})`); g.addColorStop(1, 'transparent');
  ctx.strokeStyle = g; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-len, 0); ctx.stroke();
  ctx.fillStyle = `hsla(${hue},100%,90%,${alpha})`; ctx.beginPath(); ctx.arc(0, 0, w * 1.4, 0, 6.283); ctx.fill();
  ctx.restore();
}

/** Falling meteors on fixed lanes, looping (story art). */
function meteorShower(ctx, t, n, speed, hue, big = false) {
  const W = VIEW.W, H = VIEW.H;
  for (let i = 0; i < n; i++) {
    const lane = (i * 0.618) % 1, sp = speed * (0.6 + (i % 5) * 0.12);
    const k = ((t * sp * 0.06 + i * 0.37) % 1.4) - 0.2;
    const x = lane * (W + 400) - 200 + k * W * 0.35, y = k * H * 0.9;
    const sz = big ? 3 + (i % 4) : 1.5 + (i % 3) * 0.6;
    streak(ctx, x, y, 40 + sz * 22, Math.atan2(H * 0.9, W * 0.35), 0.75, hue, sz);
  }
}

/** Background art for story panels. Panels cover the lower part of the screen. */
export function renderStoryArt(ctx, game, now, art) {
  const t = now / 1000, W = VIEW.W, H = VIEW.H;
  const theme = { earth: [215, 250], moon: [225, 270], swarm: [20, 280], fleet: [205, 245], supply: [35, 330], storm: [40, 300], iron: [330, 20], core: [0, 270], stars: [230, 280] }[art] || [225, 270];
  ctx.drawImage(nebula(theme[0], theme[1]), 0, -H + ((t * 6) % H), W, H * 2);
  drawStars(ctx, game, t, art === 'fleet' ? 0.15 : 0);
  const earthTop = H * (VIEW.tall ? 0.62 : 0.7);
  switch (art) {
    case 'earth':
      meteorShower(ctx, t, 4, 1, 30);
      drawEarth(ctx, W / 2, H * (VIEW.tall ? 0.42 : 0.36), t, 1);
      break;
    case 'moon': {
      const r = Math.min(W, H) * 0.2, mx = W * (VIEW.tall ? 0.62 : 0.74), my = H * (VIEW.tall ? 0.2 : 0.26);
      const g = ctx.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.1, mx, my, r);
      g.addColorStop(0, '#d8d8de'); g.addColorStop(1, '#4a4a55');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, r, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(40,40,50,0.35)';
      for (const [dx, dy, cr] of [[-0.3, -0.1, 0.18], [0.25, 0.3, 0.12], [0.1, -0.4, 0.09], [-0.1, 0.45, 0.1]]) { ctx.beginPath(); ctx.arc(mx + dx * r, my + dy * r, cr * r, 0, 6.283); ctx.fill(); }
      // Observatory dish on the limb, pinging
      const dx = mx - r * 0.72, dy = my - r * 0.69;
      ctx.strokeStyle = '#e0f7fa'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(dx, dy - 10, 14, Math.PI * 0.85, Math.PI * 1.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx, dy - 10); ctx.lineTo(dx + 4, dy + 6); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.6 + i / 3) % 1);
        ctx.strokeStyle = `rgba(0,229,255,${1 - k})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dx - 8, dy - 18, 20 + k * 220, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
      }
      meteorShower(ctx, t, 6, 0.6, 25);
      break;
    }
    case 'swarm':
      meteorShower(ctx, t, 26, 1.6, 25, true);
      drawEarth(ctx, W / 2, earthTop + 40, t, 1);
      break;
    case 'fleet':
      drawEarth(ctx, W / 2, earthTop, t, 1);
      for (const [dx, dy, d] of [[0, 0, 0], [-120, 70, 0.4], [120, 70, 0.8], [-240, 140, 1.2], [240, 140, 1.6]]) {
        ctx.save(); ctx.translate(W / 2 + dx, H * (VIEW.tall ? 0.22 : 0.16) + dy + Math.sin(t * 1.5 + d) * 6);
        drawShipShape(ctx, 'interceptor', '#00e5ff', '#00e5ff', 1, t); ctx.restore();
      }
      break;
    case 'supply': {
      drawEarth(ctx, W / 2, earthTop, t, 0.55);
      // A rack of shells emptying one by one
      const n = 14, cw = Math.min(46, (W - 120) / n), x0 = W / 2 - (n * cw) / 2, y0 = H * 0.24;
      const left = n - Math.floor((t * 1.2) % (n + 4));
      for (let i = 0; i < n; i++) {
        const on = i < left;
        ctx.fillStyle = on ? '#ffd740' : 'rgba(255,255,255,0.08)';
        roundRect(ctx, x0 + i * cw + 6, y0, cw - 12, 70, 6); ctx.fill();
        ctx.fillStyle = on ? '#ff8f00' : 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.moveTo(x0 + i * cw + 6, y0); ctx.lineTo(x0 + i * cw + cw / 2, y0 - 22); ctx.lineTo(x0 + i * cw + cw - 6, y0); ctx.fill();
      }
      ctx.font = `700 14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,215,64,0.8)';
      ctx.fillText('MUNITIONS RESERVE', W / 2, y0 + 100);
      break;
    }
    case 'storm': {
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.max(W, H) * 0.8);
      g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(0.15, 'rgba(255,170,60,0.35)'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const y = ((i * 97 + t * 160) % H);
        ctx.fillStyle = `rgba(200,180,255,${0.05 + 0.08 * Math.random()})`;
        ctx.fillRect(0, y, W, 1 + Math.random() * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      drawEarth(ctx, W / 2, earthTop + 30, t, 0.7);
      break;
    }
    case 'iron': {
      const fake = { id: 4242, size: Math.min(W, H) * 0.2, rot: t * 0.15, progress: 0.5, hue: 0 };
      ctx.save(); ctx.translate(W / 2, H * 0.32); drawIron(ctx, fake, t); ctx.restore();
      meteorShower(ctx, t, 6, 0.8, 25);
      drawEarth(ctx, W / 2, earthTop + 50, t, 0.8);
      break;
    }
    case 'core': {
      const cx = W / 2, cy = H * 0.3, r = Math.min(W, H) * 0.12;
      for (let i = 0; i < 40; i++) {
        const a = t * (0.2 + (i % 5) * 0.05) + i * 2.4, d = r * (1.6 + (i % 7) * 0.35);
        ctx.fillStyle = `hsla(${20 + (i % 3) * 10},40%,${35 + (i % 4) * 8}%,0.9)`;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.45, 2 + (i % 4), 0, 6.283); ctx.fill();
      }
      const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.2);
      g.addColorStop(0, 'rgba(255,90,40,0.6)'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#120a08'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
      ctx.strokeStyle = `rgba(255,120,60,${0.5 + 0.3 * Math.sin(t * 3)})`; ctx.lineWidth = 3; ctx.stroke();
      drawEarth(ctx, W / 2, earthTop + 50, t, 0.9);
      break;
    }
    case 'stars':
      meteorShower(ctx, t, 34, 1.2, 50);
      drawEarth(ctx, W / 2, earthTop - 20, t, 1);
      break;
    default:
      drawEarth(ctx, W / 2, earthTop, t, 1);
  }
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.65);
  vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,8,0.6)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
}
