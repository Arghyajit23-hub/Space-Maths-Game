// ════════════════════════════════════════════════════════════════
//  RENDERER — draws a Game onto a 2D canvas in logical 1300×700 units.
//  Heavy gradients (nebula) are pre-rendered per sector; particles use
//  additive blending instead of shadowBlur for speed.
// ════════════════════════════════════════════════════════════════

import { CONFIG, sectorInfo } from '../config.js';
import { LAYOUT } from './game.js';

const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
const FONT = "'Orbitron', 'Segoe UI Symbol', 'Segoe UI', sans-serif";
const MULT_COLORS = ['#00e5ff', '#00e5ff', '#69f0ae', '#ffd740', '#ff6e40', '#e040fb'];

let bgCache = { sector: -1, canvas: null };

function nebula(sector) {
  if (bgCache.sector === sector) return bgCache.canvas;
  const c = document.createElement('canvas'); c.width = W; c.height = H * 2;
  const g = c.getContext('2d');
  const { hue, hue2 } = sectorInfo(sector);
  const base = g.createLinearGradient(0, 0, 0, c.height);
  base.addColorStop(0, `hsl(${hue}, 60%, 4%)`); base.addColorStop(0.5, `hsl(${hue2}, 50%, 3%)`); base.addColorStop(1, `hsl(${hue}, 60%, 4%)`);
  g.fillStyle = base; g.fillRect(0, 0, W, c.height);
  const blobs = [[0.25, 0.2, 420, hue], [0.75, 0.45, 380, hue2], [0.4, 0.75, 460, hue], [0.8, 0.95, 340, hue2], [0.2, 1.3, 400, hue2], [0.7, 1.6, 420, hue], [0.25, 1.95, 360, hue]];
  for (const [x, y, r, h] of blobs) {
    const gr = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
    gr.addColorStop(0, `hsla(${h}, 70%, 35%, 0.16)`); gr.addColorStop(0.5, `hsla(${h}, 60%, 25%, 0.06)`); gr.addColorStop(1, 'transparent');
    g.fillStyle = gr; g.fillRect(0, 0, W, c.height);
  }
  bgCache = { sector, canvas: c };
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function renderGame(ctx, game, now) {
  const t = now / 1000;
  const sector = game.state === 'idle' ? 1 : game.sector;
  ctx.save();
  if (game.shake) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);

  // ── Background (cached nebula scrolling slowly) ──
  const neb = nebula(sector);
  const scroll = (t * 6 + game.warp * t * 200) % H;
  ctx.drawImage(neb, 0, -H + scroll, W, H * 2);

  // ── Stars ──
  const speed = 18 + game.warp * 900;
  ctx.fillStyle = '#cfd8ff';
  for (const s of game.stars) {
    s.y += s.z * speed * 0.016;
    if (s.y > H) { s.y -= H; s.x = Math.random() * W; }
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + s.tw));
    if (game.warp > 0.05) {
      ctx.globalAlpha = 0.25 + 0.5 * game.warp;
      ctx.fillRect(s.x, s.y - s.z * game.warp * 60, s.z * 0.8, s.z * game.warp * 60);
    }
    ctx.globalAlpha = 0.2 + tw * 0.55 * (s.z / 3);
    ctx.fillRect(s.x, s.y, s.z * 0.9, s.z * 0.9);
  }
  ctx.globalAlpha = 1;

  if (game.state === 'idle') { ctx.restore(); return; }

  // ── Defense perimeter ──
  const maxP = game.threats.reduce((m, th) => (!th.dying && th.kind !== 'boss' ? Math.max(m, th.progress) : m), 0);
  const danger = Math.max(0, (maxP - 0.55) / 0.45);
  ctx.strokeStyle = `rgba(255, ${Math.round(80 + 140 * (1 - danger))}, ${Math.round(120 * (1 - danger))}, ${0.12 + danger * (0.35 + 0.25 * Math.sin(t * 14))})`;
  ctx.lineWidth = 2; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.moveTo(40, LAYOUT.IMPACT_Y); ctx.lineTo(W - 40, LAYOUT.IMPACT_Y); ctx.stroke();
  ctx.setLineDash([]);

  // ── Threats ──
  for (const th of game.threats) drawThreat(ctx, th, th === game.target, t);

  // ── Lasers ──
  ctx.globalCompositeOperation = 'lighter';
  for (const l of game.lasers) {
    const col = MULT_COLORS[Math.min(l.mult, MULT_COLORS.length - 1)];
    ctx.globalAlpha = l.life;
    ctx.strokeStyle = col; ctx.lineWidth = 10 * l.life; ctx.globalAlpha = l.life * 0.35;
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    ctx.globalAlpha = l.life; ctx.lineWidth = 3.5 * l.life;
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4 * l.life;
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
  }

  // ── Particles & shock rings (additive) ──
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

  // ── Player ship ──
  if (game.phase !== 'dying' || game.phaseT < 0.35) drawShip(ctx, game, t);

  // ── Popups ──
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of game.popups) {
    const a = Math.min(1, p.life * 2.5);
    const pop = p.big ? 1 + Math.max(0, p.life - 1.5) * 0.6 : 1;
    ctx.globalAlpha = a;
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

  // ── Screen overlays ──
  if (game.flash > 0) { ctx.fillStyle = `rgba(255, 20, 50, ${game.flash * 0.45})`; ctx.fillRect(0, 0, W, H); }
  if (game.healFlash > 0) { ctx.fillStyle = `rgba(80, 255, 170, ${game.healFlash * 0.12})`; ctx.fillRect(0, 0, W, H); }
  const crit = game.hull <= CONFIG.HULL_CRITICAL && game.phase !== 'dying';
  const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.72);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, crit ? `rgba(120, 0, 20, ${0.55 + 0.25 * Math.sin(t * 6)})` : 'rgba(0, 0, 8, 0.55)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

// ── Threat drawing ─────────────────────────────────────
function drawThreat(ctx, th, isTarget, t) {
  ctx.save();
  let alpha = 1, scale = 1;
  if (th.dying) { const k = Math.max(0, th.dieT / (th.kind === 'boss' ? 1.2 : 0.5)); alpha = k; scale = 1 + (1 - k) * 0.6; }
  ctx.globalAlpha = alpha;
  ctx.translate(th.x, th.y);

  if (th.kind === 'boss') drawBoss(ctx, th, t, scale);
  else {
    ctx.save(); ctx.scale(scale, scale);
    if (th.kind === 'rock') drawRock(ctx, th); else drawSaucer(ctx, th, t);
    ctx.restore();
  }

  if (!th.dying) {
    const p = th.kind === 'boss' ? Math.min(1, th.qElapsed / th.challenge.allowed) : th.progress;
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

function drawBoss(ctx, th, t, scale) {
  const h = th.hue, flash = th.hitFlash || 0;
  ctx.save(); ctx.scale(scale, scale);
  const glow = ctx.createRadialGradient(0, 0, 40, 0, 0, 230);
  glow.addColorStop(0, `hsla(${h}, 90%, 50%, ${0.3 + flash * 0.4})`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 230, 0, 6.283); ctx.fill();
  // Hull
  ctx.fillStyle = flash > 0.3 ? '#fff' : `hsl(${h}, 30%, 14%)`;
  ctx.beginPath();
  ctx.moveTo(-190, 0); ctx.lineTo(-120, -38); ctx.lineTo(-40, -52); ctx.lineTo(40, -52); ctx.lineTo(120, -38); ctx.lineTo(190, 0);
  ctx.lineTo(140, 30); ctx.lineTo(60, 44); ctx.lineTo(-60, 44); ctx.lineTo(-140, 30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `hsla(${h}, 90%, 65%, 0.8)`; ctx.lineWidth = 2; ctx.stroke();
  // Core
  const pulse = 0.6 + 0.4 * Math.sin(t * 5);
  const core = ctx.createRadialGradient(0, 4, 2, 0, 4, 34);
  core.addColorStop(0, '#fff'); core.addColorStop(0.3, `hsla(${h}, 100%, 65%, ${pulse})`); core.addColorStop(1, 'transparent');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 4, 34, 0, 6.283); ctx.fill();
  // Running lights
  for (let i = -5; i <= 5; i++) {
    const on = Math.sin(t * 7 + i) > 0;
    ctx.fillStyle = on ? `hsl(${(h + 40) % 360}, 100%, 70%)` : 'rgba(255,255,255,0.1)';
    ctx.fillRect(i * 28 - 3, 26, 6, 4);
  }
  // Cannons
  ctx.fillStyle = `hsl(${h}, 25%, 22%)`;
  ctx.fillRect(-130, 20, 14, 26); ctx.fillRect(116, 20, 14, 26);
  ctx.restore();

  if (!th.dying) {
    // HP bar
    const bw = 240, bh = 8, y = -80;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, -bw / 2 - 2, y - 2, bw + 4, bh + 4, 4); ctx.fill();
    ctx.fillStyle = `hsl(${h}, 90%, 60%)`;
    const seg = bw / th.maxHp;
    for (let i = 0; i < th.hp; i++) ctx.fillRect(-bw / 2 + i * seg + 1, y, seg - 2, bh);
    ctx.font = `700 11px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('MOTHERSHIP', 0, y - 10);
  }
}

function drawReticle(ctx, th, t, p) {
  const r = th.kind === 'boss' ? 150 : th.size * 1.35;
  const col = p > 0.75 ? '#ff5252' : '#00e5ff';
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  // Countdown arc
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + (1 - p) * 6.283); ctx.stroke();
  ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
  ctx.globalAlpha = 1;
  // Rotating brackets
  ctx.save(); ctx.rotate(t * 0.8);
  const b = r + 9, c = 12;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(b, -c); ctx.lineTo(b, 0); ctx.lineTo(b - c, 0); ctx.stroke();
  }
  ctx.restore();
}

function drawPlate(ctx, th, isTarget, p) {
  const text = th.challenge.prompt;
  const fs = isTarget ? 24 : 17;
  ctx.font = `700 ${fs}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const pw = tw + (isTarget ? 30 : 20), ph = fs + (isTarget ? 16 : 10);
  const y = th.kind === 'boss' ? 70 : th.size + 14;
  const hot = p > 0.75;
  ctx.fillStyle = isTarget ? (hot ? 'rgba(60,0,10,0.88)' : 'rgba(0,18,34,0.88)') : 'rgba(0,6,16,0.7)';
  roundRect(ctx, -pw / 2, y, pw, ph, 6); ctx.fill();
  ctx.strokeStyle = isTarget ? (hot ? '#ff5252' : '#00e5ff') : 'rgba(160,200,255,0.25)';
  ctx.lineWidth = isTarget ? 2 : 1; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = isTarget ? '#fff' : 'rgba(220,235,255,0.75)';
  ctx.fillText(text, 0, y + ph / 2 + 1);
}

// ── Player ship ─────────────────────────────────────────
function drawShip(ctx, game, t) {
  const s = game.ship, mult = game.session.multiplier;
  const col = MULT_COLORS[Math.min(mult, MULT_COLORS.length - 1)];
  ctx.save();
  ctx.translate(s.x, s.y + s.recoil * 5);

  // Engine flame
  ctx.globalCompositeOperation = 'lighter';
  const fl = 18 + Math.random() * 8 + mult * 3;
  for (const ex of [-14, 14]) {
    const g = ctx.createLinearGradient(0, 18, 0, 18 + fl);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, col); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(ex - 6, 18); ctx.lineTo(ex + 6, 18); ctx.lineTo(ex, 18 + fl); ctx.closePath(); ctx.fill();
  }
  // Multiplier aura
  if (mult > 1) {
    const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 60 + mult * 6);
    aura.addColorStop(0, 'transparent'); aura.addColorStop(0.7, col + '22'); aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 60 + mult * 6, 0, 6.283); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // Hull
  ctx.fillStyle = '#1b2436';
  ctx.beginPath();
  ctx.moveTo(0, -40); ctx.lineTo(10, -14); ctx.lineTo(44, 10); ctx.lineTo(46, 22); ctx.lineTo(16, 16);
  ctx.lineTo(10, 22); ctx.lineTo(-10, 22); ctx.lineTo(-16, 16); ctx.lineTo(-46, 22); ctx.lineTo(-44, 10); ctx.lineTo(-10, -14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
  // Wing stripes
  ctx.strokeStyle = col; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40, 14); ctx.lineTo(-18, 6); ctx.moveTo(40, 14); ctx.lineTo(18, 6); ctx.stroke();
  ctx.globalAlpha = 1;
  // Canopy
  const cg = ctx.createLinearGradient(0, -26, 0, 0);
  cg.addColorStop(0, '#b3f5ff'); cg.addColorStop(1, '#1a5d7a');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(0, -10, 6, 14, 0, 0, 6.283); ctx.fill();
  // Turret (aims at target)
  ctx.save(); ctx.rotate(s.aim + Math.PI / 2);
  ctx.fillStyle = col; ctx.fillRect(-2, -46, 4, 14);
  ctx.restore();

  // Shield bubble on hit / heal
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
