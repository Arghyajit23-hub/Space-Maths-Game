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

  // ── Defense perimeter ──
  const maxP = game.threats.reduce((m, th) => (!th.dying && !th.ally && th.kind !== 'boss' ? Math.max(m, th.progress) : m), 0);
  const danger = Math.max(0, (maxP - 0.55) / 0.45);
  ctx.strokeStyle = `rgba(255, ${Math.round(80 + 140 * (1 - danger))}, ${Math.round(120 * (1 - danger))}, ${0.12 + danger * (0.35 + 0.25 * Math.sin(t * 14))})`;
  ctx.lineWidth = 2; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.moveTo(40, LAYOUT.IMPACT_Y); ctx.lineTo(VIEW.W - 40, LAYOUT.IMPACT_Y); ctx.stroke();
  ctx.setLineDash([]);

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
    switch (th.kind) {
      case 'rock': drawRock(ctx, th); break;
      case 'splitter': drawCrystal(ctx, th, t); break;
      case 'beacon': drawBeacon(ctx, th, t); break;
      case 'mirror': drawMirror(ctx, th, t); break;
      case 'ally': drawAlly(ctx, th, t); break;
      case 'revenant': drawRevenant(ctx, th, t); break;
      case 'cloaked': ctx.globalAlpha *= 0.45 + 0.25 * Math.sin(t * 5 + th.id); drawSaucer(ctx, th, t); break;
      case 'shield': drawSaucer(ctx, th, t); if (th.hp > 1) drawShieldBubble(ctx, th, t); break;
      default: th.mini ? drawDrone(ctx, th, t) : drawSaucer(ctx, th, t);
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

function drawRock(ctx, th) {
  const r = th.size;
  ctx.rotate(th.rot);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, `hsl(${th.hue}, 22%, 48%)`); g.addColorStop(1, `hsl(${th.hue}, 25%, 16%)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  th.shape.pts.forEach(([x, y, k], i) => (i ? ctx.lineTo(x * r * k, y * r * k) : ctx.moveTo(x * r * k, y * r * k)));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `hsla(${th.hue}, 40%, 70%, 0.35)`; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = `hsla(${th.hue}, 25%, 10%, 0.45)`;
  for (const [cx, cy, cr] of th.shape.craters) { ctx.beginPath(); ctx.arc(cx * r, cy * r, cr * r, 0, 6.283); ctx.fill(); }
}

function drawCrystal(ctx, th, t) {
  const r = th.size + 6;
  ctx.rotate(Math.sin(t + th.id) * 0.2);
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, 'rgba(128,222,234,0.95)'); g.addColorStop(0.5, 'rgba(38,166,154,0.8)'); g.addColorStop(1, 'rgba(0,96,100,0.9)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.75, -r * 0.2); ctx.lineTo(r * 0.5, r * 0.8); ctx.lineTo(-r * 0.5, r * 0.8); ctx.lineTo(-r * 0.75, -r * 0.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e0f7fa'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.globalAlpha *= 0.5;
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r * 0.8); ctx.moveTo(-r * 0.75, -r * 0.2); ctx.lineTo(r * 0.5, r * 0.8); ctx.stroke();
  // Crack lines grow as it approaches the split point
  const crack = Math.min(1, th.progress / CONFIG.SPLIT_AT);
  if (crack > 0.4) {
    ctx.globalAlpha = (crack - 0.4) * 1.6; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, -r * 0.8); ctx.lineTo(4, -r * 0.2); ctx.lineTo(-3, r * 0.3); ctx.lineTo(2, r * 0.7 * crack); ctx.stroke();
  }
}

function drawSaucer(ctx, th, t) {
  const sz = th.size, h = th.hue;
  const glow = ctx.createRadialGradient(0, 0, sz * 0.3, 0, 0, sz * 1.6);
  glow.addColorStop(0, `hsla(${h}, 80%, 55%, 0.28)`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, sz * 1.6, 0, 6.283); ctx.fill();
  ctx.fillStyle = `hsl(${h}, 40%, 20%)`; ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.42, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = `hsla(${h}, 70%, 60%, 0.6)`; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = `hsla(${h}, 65%, 45%, 0.95)`; ctx.beginPath(); ctx.ellipse(0, -sz * 0.12, sz * 0.48, sz * 0.4, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = `hsla(${h}, 60%, 80%, 0.35)`; ctx.beginPath(); ctx.ellipse(-sz * 0.12, -sz * 0.32, sz * 0.14, sz * 0.1, -0.3, 0, 6.283); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.283 + t * 2, on = Math.sin(t * 6 + i * 1.5) > 0;
    ctx.fillStyle = on ? `hsl(${(h + 60) % 360}, 100%, 70%)` : `hsl(${h}, 30%, 25%)`;
    ctx.beginPath(); ctx.arc(Math.cos(a) * sz * 0.82, Math.sin(a) * sz * 0.28, 2.6, 0, 6.283); ctx.fill();
  }
}

function drawDrone(ctx, th, t) {
  const s = th.size;
  ctx.rotate(Math.sin(t * 3 + th.id) * 0.15);
  ctx.fillStyle = `hsl(${th.hue}, 70%, 30%)`;
  ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(s * 0.9, -s * 0.5); ctx.lineTo(0, -s * 0.15); ctx.lineTo(-s * 0.9, -s * 0.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `hsl(${th.hue}, 90%, 65%)`; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = `hsl(${th.hue}, 100%, ${60 + 20 * Math.sin(t * 8)}%)`;
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, 6.283); ctx.fill();
}

function drawShieldBubble(ctx, th, t) {
  ctx.strokeStyle = `rgba(100,255,218,${0.6 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283 + t * 0.5; const x = Math.cos(a) * th.size * 1.35, y = Math.sin(a) * th.size * 1.0; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(100,255,218,0.08)'; ctx.fill();
}

function drawBeacon(ctx, th, t) {
  const s = th.size, pulse = 0.5 + 0.5 * Math.sin(t * 6);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, s * 1.8);
  glow.addColorStop(0, `hsla(${th.hue}, 100%, 70%, ${0.25 + pulse * 0.25})`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, s * 1.8, 0, 6.283); ctx.fill();
  ctx.fillStyle = `hsl(${th.hue}, 40%, 18%)`;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `hsl(${th.hue}, 100%, 75%)`; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = th.revealLeft > 0 ? '#fff' : `hsl(${th.hue}, 60%, 40%)`;
  ctx.beginPath(); ctx.arc(0, 0, 6 + pulse * 3, 0, 6.283); ctx.fill();
  ctx.strokeStyle = `hsla(${th.hue}, 100%, 80%, ${1 - pulse})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, s * (0.8 + pulse), 0, 6.283); ctx.stroke();
}

function drawMirror(ctx, th, t) {
  const s = th.size;
  ctx.rotate(t * 0.8 + th.id);
  const g = ctx.createLinearGradient(-s, -s, s, s);
  g.addColorStop(0, '#e1f5fe'); g.addColorStop(0.45, '#4fc3f7'); g.addColorStop(0.55, '#01579b'); g.addColorStop(1, '#b3e5fc');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, s * 0.6); ctx.lineTo(-s * 0.85, s * 0.6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawAlly(ctx, th, t) {
  const s = th.size;
  ctx.scale(th.dir, 1);
  ctx.fillStyle = '#1b3a24';
  roundRect(ctx, -s * 1.1, -s * 0.35, s * 1.8, s * 0.7, 6); ctx.fill();
  ctx.strokeStyle = '#69f0ae'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#2e7d32'; ctx.fillRect(-s * 0.9, -s * 0.25, s * 0.5, s * 0.5); ctx.fillRect(-s * 0.3, -s * 0.25, s * 0.5, s * 0.5);
  ctx.fillStyle = '#b9f6ca'; ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.35); ctx.lineTo(s * 1.1, 0); ctx.lineTo(s * 0.7, s * 0.35); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(105,240,174,${0.4 + 0.3 * Math.random()})`;
  ctx.beginPath(); ctx.moveTo(-s * 1.1, -s * 0.2); ctx.lineTo(-s * 1.6, 0); ctx.lineTo(-s * 1.1, s * 0.2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function drawRevenant(ctx, th, t) {
  const s = th.size;
  ctx.globalAlpha *= 0.75 + 0.2 * Math.sin(t * 4 + th.id);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, s * 1.7);
  glow.addColorStop(0, 'rgba(224,64,251,0.35)'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, s * 1.7, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(74,20,90,0.9)';
  ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.8, Math.PI, 0);
  for (let i = 0; i <= 5; i++) ctx.lineTo(s * 0.8 - i * s * 0.32, s * 0.6 + (i % 2 ? -s * 0.2 : s * 0.1) + Math.sin(t * 6 + i) * 3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ea80fc'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-s * 0.28, -s * 0.15, 4, 0, 6.283); ctx.arc(s * 0.28, -s * 0.15, 4, 0, 6.283); ctx.fill();
}

function drawBoss(ctx, th, t, scale) {
  const h = th.hue, flash = th.hitFlash || 0;
  ctx.save(); ctx.scale(scale, scale);
  const glow = ctx.createRadialGradient(0, 0, 40, 0, 0, 230);
  glow.addColorStop(0, `hsla(${h}, 90%, 50%, ${0.3 + flash * 0.4})`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 230, 0, 6.283); ctx.fill();
  ctx.fillStyle = flash > 0.3 ? '#fff' : `hsl(${h}, 30%, 14%)`;
  ctx.beginPath();
  ctx.moveTo(-190, 0); ctx.lineTo(-120, -38); ctx.lineTo(-40, -52); ctx.lineTo(40, -52); ctx.lineTo(120, -38); ctx.lineTo(190, 0);
  ctx.lineTo(140, 30); ctx.lineTo(60, 44); ctx.lineTo(-60, 44); ctx.lineTo(-140, 30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `hsla(${h}, 90%, 65%, 0.8)`; ctx.lineWidth = 2; ctx.stroke();
  const pulse = 0.6 + 0.4 * Math.sin(t * 5);
  const core = ctx.createRadialGradient(0, 4, 2, 0, 4, 34);
  core.addColorStop(0, '#fff'); core.addColorStop(0.3, `hsla(${h}, 100%, 65%, ${pulse})`); core.addColorStop(1, 'transparent');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 4, 34, 0, 6.283); ctx.fill();
  for (let i = -5; i <= 5; i++) {
    ctx.fillStyle = Math.sin(t * 7 + i) > 0 ? `hsl(${(h + 40) % 360}, 100%, 70%)` : 'rgba(255,255,255,0.1)';
    ctx.fillRect(i * 28 - 3, 26, 6, 4);
  }
  ctx.fillStyle = `hsl(${h}, 25%, 22%)`;
  ctx.fillRect(-130, 20, 14, 26); ctx.fillRect(116, 20, 14, 26);
  ctx.restore();

  if (!th.dying) {
    const bw = 260, bh = 8, y = -82;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, -bw / 2 - 2, y - 2, bw + 4, bh + 4, 4); ctx.fill();
    ctx.fillStyle = `hsl(${h}, 90%, 60%)`;
    const seg = bw / th.maxHp;
    for (let i = 0; i < th.hp; i++) ctx.fillRect(-bw / 2 + i * seg + 1, y, seg - 2, bh);
    ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText((th.name || 'MOTHERSHIP').toUpperCase(), 0, y - 12);
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
  const y = th.kind === 'boss' ? 70 : th.kind === 'ally' ? th.size * 0.5 + 10 : th.size + 14;
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
