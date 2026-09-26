// ════════════════════════════════════════════════════════════════
//  GAME — world simulation (no DOM, no drawing).
//
//  Threats descend toward the ship; their distance IS the timer.
//  Type the answer to any visible threat → laser. The most urgent threat
//  is auto-targeted and shown large in the console.
//  Each sector: N kills → Mothership boss → warp to the next sector.
//
//  UI talks to the game only through `game.on.*` callbacks and
//  `game.type() / backspace() / submit()`.
// ════════════════════════════════════════════════════════════════

import { CONFIG, sectorInfo } from '../config.js';
import { Director } from './director.js';
import { Session } from './session.js';
import { Sound, speak } from '../services/audio.js';

const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
const SHIP_Y = H - 140;
const IMPACT_Y = SHIP_Y - 58;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const noop = () => {};

let nextId = 1;

function rockShape() {
  const n = 9 + Math.floor(Math.random() * 4), pts = [];
  for (let i = 0; i < n; i++) pts.push([Math.cos((i / n) * Math.PI * 2), Math.sin((i / n) * Math.PI * 2), rand(0.72, 1.08)]);
  const craters = Array.from({ length: 3 }, () => [rand(-0.45, 0.45), rand(-0.45, 0.45), rand(0.12, 0.24)]);
  return { pts, craters };
}

export class Game {
  constructor() {
    this.on = { hud: noop, target: noop, input: noop, feedback: noop, banner: noop, over: noop, record: noop };
    this.state = 'idle';
    this.fieldMaxX = W - 150;   // UI may shrink the playfield (e.g. touch numpad on the right)
    this.stars = Array.from({ length: 220 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 2.6 + 0.4, tw: Math.random() * 6.28 }));
    this.reset();
  }

  reset(opts = {}) {
    this.mode = opts.mode || 'math';
    this.session = new Session(this.mode);
    this.director = new Director(opts.mix || { math: 1 });
    this.personalBest = opts.personalBest || 0;
    this.recordAnnounced = false;
    this.hull = CONFIG.HULL_MAX;
    this.threats = [];
    this.particles = [];
    this.lasers = [];
    this.popups = [];
    this.rings = [];
    this.ship = { x: W / 2, y: H + 80, aim: -Math.PI / 2, hit: 0, recoil: 0, glow: 0 };
    this.target = null;
    this.input = '';
    this.phase = 'intro';       // intro | wave | bossWarn | boss | warp | dying
    this.phaseT = 0;
    this.spawnT = 0.6;
    this.sectorKills = 0;
    this.shake = 0; this.flash = 0; this.healFlash = 0; this.warp = 0;
    this.timeScale = 1;
    this.alarmT = 0;
    this.lastAllowed = 6;
    this.t = 0;
    this._warpBannered = false;
  }

  get sector() { return this.session.sector; }
  get sectorGoal() { return CONFIG.sectorKills(this.sector); }
  get boss() { return this.threats.find(t => t.kind === 'boss' && !t.dying) || null; }

  start(opts) {
    this.reset(opts);
    this.state = 'play';
    const info = sectorInfo(1);
    this.on.banner(`SECTOR 1`, info.name, 'sector');
    this.on.hud(this);
    this.on.target(null);
    this.on.input('');
  }

  pause()  { if (this.state === 'play') this.state = 'paused'; }
  resume() { if (this.state === 'paused') this.state = 'play'; }

  // ── Input ─────────────────────────────────────────────
  get acceptingInput() { return this.state === 'play' && (this.phase === 'wave' || this.phase === 'boss' || this.phase === 'bossWarn'); }

  type(ch) {
    if (!this.acceptingInput) return;
    if (ch === '-') { if (this.input === '') this.input = '-'; else return; }
    else if (this.input.length < 7) this.input += ch;
    Sound.key();
    this.on.input(this.input);
    this._evaluate(false);
  }

  backspace() {
    if (!this.acceptingInput || !this.input) return;
    this.input = this.input.slice(0, -1);
    this.on.input(this.input);
  }

  clearInput() { this.input = ''; this.on.input(''); }

  submit() {
    if (!this.acceptingInput || !this.input || this.input === '-') return;
    this._evaluate(true);
  }

  _live() { return this.threats.filter(t => !t.dying && t.ready); }

  _evaluate(forced) {
    const live = this._live();
    if (!live.length) return;
    let partial = false;
    for (const th of live) {
      const r = th.challenge.check(this.input);
      if (r === 'correct') { this._hit(th); return; }
      if (r === 'partial') partial = true;
    }
    const tgt = this.target || live[0];
    const fullLength = this.input.replace('-', '').length >= String(tgt.challenge.answer).replace('-', '').length;
    if (forced || (!partial && CONFIG.AUTO_WRONG_AT_LENGTH && fullLength)) this._miss(tgt);
  }

  // ── Outcomes ─────────────────────────────────────────
  _hit(th) {
    const ch = th.challenge;
    const elapsed = th.qElapsed;
    const ratio = Math.min(1, elapsed / ch.allowed);
    const isBoss = th.kind === 'boss';
    const res = this.session.onCorrect(ch, Math.round(elapsed * 1000), ratio, { boss: isBoss });
    this.director.report('correct', ratio);

    // Laser + FX
    const s = this.ship;
    this.lasers.push({ x1: s.x, y1: s.y - 34, x2: th.x, y2: th.y, life: 1, mult: res.mult });
    s.recoil = 1; s.aim = Math.atan2(th.y - s.y, th.x - s.x);
    Sound.laser(res.mult); Sound.correct(res.mult);
    if (res.fast) Sound.fast();

    const label = res.fast ? 'BLAZING!' : res.clutch ? 'CLUTCH!' : null;
    this.popups.push({ x: th.x, y: th.y - th.size - 10, text: `+${res.points}`, sub: label, life: 1.2, color: res.fast ? '#ffd740' : '#69f0ae', size: 26 });

    if (isBoss) {
      th.hp--;
      th.hitFlash = 1;
      th.progress = Math.max(0, th.progress - 0.07);   // knock the mothership back
      this._burst(th.x + rand(-40, 40), th.y + rand(-10, 20), 40, th.hue, 7);
      this.shake = Math.max(this.shake, 8);
      this.on.hud(this);
      if (th.hp <= 0) { this._destroyBoss(th); }
      else { th.challenge = this.director.nextChallenge(this.sector); th.qElapsed = 0; if (th === this.target) this.on.target(th.challenge, th); }
    } else {
      this._destroy(th);
      this.session.kills++;
      this.sectorKills++;
    }

    if (res.multUp) {
      Sound.multUp(res.mult);
      this.on.feedback('mult', { mult: res.mult });
      this.popups.push({ x: W / 2, y: H / 2 - 40, text: `×${res.mult} MULTIPLIER`, life: 1.6, color: '#00e5ff', size: 40, big: true });
    }
    if (this.session.streak > 0 && this.session.streak % CONFIG.REPAIR_STREAK_EVERY === 0 && this.hull < CONFIG.HULL_MAX) {
      this._repair(CONFIG.REPAIR_STREAK_AMOUNT, 'REPAIR DRONE');
    }
    if (!this.recordAnnounced && this.personalBest > 0 && this.session.score > this.personalBest) {
      this.recordAnnounced = true;
      Sound.record();
      this.on.record();
      this.popups.push({ x: W / 2, y: H / 2 + 10, text: 'NEW PERSONAL BEST!', life: 2, color: '#ffd740', size: 34, big: true });
    }

    this.on.feedback('correct', res);
    this.clearInput();
    this._retarget();
    this.on.hud(this);
  }

  _miss(th) {
    this.session.onWrong(th.challenge);
    this.director.report('wrong');
    Sound.wrong();
    this._damage(CONFIG.DAMAGE_WRONG, false);
    this.popups.push({ x: this.ship.x, y: this.ship.y - 70, text: 'MISS', life: 0.8, color: '#ff5252', size: 22 });
    this.on.feedback('wrong', { input: this.input });
    this.clearInput();
    this.on.hud(this);
  }

  _impact(th) {
    const ch = th.challenge;
    this.session.onTimeout(ch);
    this.director.report('timeout');
    Sound.impact();
    const isBoss = th.kind === 'boss';
    this.on.feedback('timeout', { prompt: ch.prompt, answer: ch.display });
    this.popups.push({ x: th.x, y: th.y - 40, text: `${ch.prompt} = ${ch.display}`, life: 2.2, color: '#ff8a80', size: 22 });
    this._burst(th.x, th.y + 20, 50, 0, 8);
    this._damage(isBoss ? CONFIG.DAMAGE_BOSS_IMPACT : CONFIG.DAMAGE_IMPACT, true);
    if (isBoss) {
      th.progress = 0.05;                 // repelled, but still coming
      th.challenge = this.director.nextChallenge(this.sector); th.qElapsed = 0;
    } else {
      th.dying = true; th.dieT = 0.3; th.impacted = true;
    }
    this.clearInput();
    this._retarget(true);
    this.on.hud(this);
  }

  _damage(amount, big) {
    if (this.phase === 'dying') return;
    this.hull = Math.max(0, this.hull - amount);
    this.ship.hit = 1;
    this.shake = Math.max(this.shake, big ? 22 : 7);
    this.flash = Math.max(this.flash, big ? 0.55 : 0.22);
    if (this.hull <= 0) this._die();
  }

  _repair(amount, label) {
    const before = this.hull;
    this.hull = Math.min(CONFIG.HULL_MAX, this.hull + amount);
    if (this.hull === before) return;
    this.healFlash = 1;
    Sound.repair();
    this.popups.push({ x: this.ship.x, y: this.ship.y - 90, text: `+${Math.round(this.hull - before)} HULL`, sub: label, life: 1.6, color: '#69f0ae', size: 22 });
    this.on.hud(this);
  }

  _destroy(th) {
    th.dying = true; th.dieT = 0.5;
    this._burst(th.x, th.y, 46, th.hue, 6);
    this.rings.push({ x: th.x, y: th.y, r: th.size * 0.6, life: 1, color: `hsl(${th.hue},90%,70%)` });
    this.shake = Math.max(this.shake, 4);
    setTimeout(() => Sound.explode(false), 60);
  }

  _destroyBoss(th) {
    th.dying = true; th.dieT = 1.2;
    for (let i = 0; i < 6; i++) setTimeout(() => {
      this._burst(th.x + rand(-110, 110), th.y + rand(-30, 30), 50, th.hue + i * 20, 9);
      this.rings.push({ x: th.x, y: th.y, r: 30, life: 1, color: '#fff', big: true });
      Sound.explode(true);
    }, i * 140);
    this.shake = 26;
    this.clearInput();
    this.on.target(null);
    this.target = null;
    const bonus = CONFIG.SECTOR_CLEAR_BONUS * this.sector;
    this.session.addBonus(bonus);
    this.popups.push({ x: W / 2, y: H / 2 - 60, text: 'MOTHERSHIP DESTROYED', sub: `SECTOR BONUS +${bonus}`, life: 2.4, color: '#ffd740', size: 38, big: true });
    this.phase = 'warp'; this.phaseT = 0;
    setTimeout(() => { if (this.state !== 'idle') Sound.levelUp(); }, 900);
  }

  _die() {
    this.phase = 'dying'; this.phaseT = 0;
    this.timeScale = 0.35;
    this.clearInput();
    this.on.target(null);
    Sound.gameOver();
    Sound.stopMusic();
    for (let i = 0; i < 4; i++) setTimeout(() => {
      this._burst(this.ship.x + rand(-30, 30), this.ship.y + rand(-20, 20), 70, [340, 40, 200, 20][i], 10);
      this.rings.push({ x: this.ship.x, y: this.ship.y, r: 20, life: 1, color: '#ff4081', big: true });
    }, i * 120);
    this.shake = 30;
  }

  // ── Spawning ─────────────────────────────────────────
  _spawn() {
    const ch = this.director.nextChallenge(this.sector);
    this.lastAllowed = ch.allowed;
    const saucer = Math.random() < Math.min(0.2 + this.sector * 0.1, 0.6);
    // Keep spawn lanes apart so labels never overlap
    let x, tries = 0;
    do { x = rand(150, this.fieldMaxX); tries++; }
    while (tries < 12 && this.threats.some(t => !t.dying && Math.abs(t.x - x) < 190 && t.progress < 0.45));
    const th = {
      id: nextId++, kind: saucer ? 'saucer' : 'rock', challenge: ch,
      x0: x, x, y: -60, progress: 0, qElapsed: 0, ready: true,
      size: saucer ? rand(34, 42) : rand(32, 46),
      hue: saucer ? Math.floor(rand(0, 360)) : Math.floor(rand(15, 40)),
      rot: rand(0, 6.28), spin: rand(-0.8, 0.8), wob: rand(0, 6.28),
      shape: saucer ? null : rockShape(),
      dying: false, dieT: 0, warned: false,
    };
    th.drift = Math.min(this.fieldMaxX, lerp(x, W / 2, rand(0.15, 0.4))) - x;
    this.threats.push(th);
    this._retarget();
  }

  _spawnBoss() {
    const hp = CONFIG.bossHp(this.sector);
    const ch = this.director.nextChallenge(this.sector);
    const avg = ch.allowed;
    const th = {
      id: nextId++, kind: 'boss', challenge: ch, x0: W / 2, x: W / 2, y: -140, drift: 0,
      progress: 0, qElapsed: 0, ready: true, hp, maxHp: hp,
      travel: Math.max(hp * avg * 0.95, 14), size: 120, hue: sectorInfo(this.sector).hue2,
      rot: 0, spin: 0, wob: 0, dying: false, dieT: 0, hitFlash: 0,
    };
    this.threats.push(th);
    this._retarget();
    this.on.hud(this);
  }

  _retarget(force = false) {
    const live = this._live();
    let best = null;
    for (const t of live) if (!best || t.progress > best.progress) best = t;
    if (best !== this.target || force) {
      this.target = best;
      this.on.target(best ? best.challenge : null, best);
    }
  }

  // ── Update ───────────────────────────────────────────
  update(rawDt) {
    if (this.state !== 'play') return;
    const dt = Math.min(rawDt, 0.05) * this.timeScale;
    this.t += dt;
    this.phaseT += dt;
    const s = this.ship;

    // Ship fly-in / idle bob
    const shipTargetY = this.phase === 'dying' ? s.y : SHIP_Y;
    s.y = lerp(s.y, shipTargetY + Math.sin(this.t * 2) * 3, Math.min(1, dt * 4));
    s.hit = Math.max(0, s.hit - dt * 2.5);
    s.recoil = Math.max(0, s.recoil - dt * 6);
    if (this.target) {
      const want = Math.atan2(this.target.y - s.y, this.target.x - s.x);
      s.aim = lerp(s.aim, want, Math.min(1, dt * 8));
    }

    if (this.phase !== 'dying' && this.phase !== 'intro') this.session.survival += dt;

    switch (this.phase) {
      case 'intro':
        if (this.phaseT > 1.1) { this.phase = 'wave'; this.phaseT = 0; Sound.startMusic(); speak('Shields up, pilot.'); }
        break;
      case 'wave': {
        const live = this.threats.filter(t => !t.dying);
        const remaining = this.sectorGoal - this.sectorKills - live.length;
        this.spawnT -= dt;
        if (remaining > 0 && live.length < this.director.maxConcurrent(this.sector) && (this.spawnT <= 0 || live.length === 0)) {
          this._spawn();
          this.spawnT = this.director.spawnGap(this.sector, this.lastAllowed);
        }
        if (this.sectorKills >= this.sectorGoal && live.length === 0) {
          this.phase = 'bossWarn'; this.phaseT = 0;
          Sound.bossWarn();
          this.on.banner('WARNING', 'Mothership inbound', 'boss');
          speak('Warning. Mothership inbound.');
        }
        break;
      }
      case 'bossWarn':
        if (this.phaseT > 2.2) { this.phase = 'boss'; this.phaseT = 0; this._spawnBoss(); }
        break;
      case 'boss':
        break;
      case 'warp':
        this.warp = Math.min(1, this.warp + dt * 0.9);
        if (this.phaseT > 1.4 && !this._warpBannered) {
          this._warpBannered = true;
          this.session.sector++;
          this.sectorKills = 0;
          this.director.heat *= 0.5;   // a fresh sector starts a little calmer
          const info = sectorInfo(this.sector);
          this.on.banner(`SECTOR ${this.sector}`, info.name, 'sector');
          speak(`Sector ${this.sector}. ${info.name}.`);
          this._repair(CONFIG.REPAIR_SECTOR_CLEAR, 'SECTOR CLEAR');
          this.on.hud(this);
        }
        if (this.phaseT > 3.2) { this.phase = 'wave'; this.phaseT = 0; this.spawnT = 0.4; this._warpBannered = false; }
        break;
      case 'dying':
        this.ship.y += dt * 30;
        if (this.phaseT > 0.9) { this.state = 'over'; this.timeScale = 1; this.on.over(this.session.summary(), this.session); }
        break;
    }
    if (this.phase !== 'warp') this.warp = Math.max(0, this.warp - dt * 1.5);

    // Threats
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const th = this.threats[i];
      if (th.dying) { th.dieT -= dt; if (th.dieT <= 0) this.threats.splice(i, 1); continue; }
      if (this.phase === 'dying') continue;
      th.qElapsed += dt;
      th.rot += th.spin * dt;
      th.wob += dt * 2;
      if (th.kind === 'boss') {
        th.hitFlash = Math.max(0, th.hitFlash - dt * 3);
        th.progress += dt / th.travel;
        th.enter = Math.min(1, (th.enter || 0) + dt * 0.8);
        const ease = 1 - Math.pow(1 - th.enter, 3);
        th.x = W / 2 + Math.sin(th.wob * 0.35) * 160;
        th.y = lerp(-140, lerp(170, IMPACT_Y - 80, th.progress), ease);
        if (th.progress >= 1) this._impact(th);
      } else {
        th.progress += dt / th.challenge.allowed;
        const p = th.progress;
        th.x = th.x0 + th.drift * p + (th.kind === 'saucer' ? Math.sin(th.wob) * 14 : 0);
        th.y = lerp(-50, IMPACT_Y, p);
        if (th === this.target && p > 0.75 && !th.warned) { th.warned = true; Sound.alarm(); }
        if (p >= 1) this._impact(th);
      }
    }
    if (this.target && (this.target.dying || !this.threats.includes(this.target))) this._retarget();

    // Low-hull alarm & music intensity
    if (this.hull <= CONFIG.HULL_CRITICAL && this.phase !== 'dying') {
      this.alarmT -= dt;
      if (this.alarmT <= 0) { Sound.alarm(); this.alarmT = 2.4; }
    }
    const tp = this.target ? this.target.progress : 0;
    Sound.setIntensity(Math.min(1, (this.sector - 1) * 0.15 + this.session.multiplier * 0.08 + tp * 0.3));

    // FX
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.vx *= 0.985; p.vy *= 0.985;
      p.life -= p.decay * dt * 60;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.lasers.length - 1; i >= 0; i--) if ((this.lasers[i].life -= dt * 4) <= 0) this.lasers.splice(i, 1);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.r += dt * (r.big ? 520 : 260); r.life -= dt * (r.big ? 1.4 : 2.2);
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]; p.life -= dt; p.y -= dt * (p.big ? 12 : 40);
      if (p.life <= 0) this.popups.splice(i, 1);
    }
    this.shake *= Math.pow(0.02, dt); if (this.shake < 0.3) this.shake = 0;
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.healFlash = Math.max(0, this.healFlash - dt * 1.5);
  }

  _burst(x, y, n, hue, spread) {
    const room = CONFIG.MAX_PARTICLES - this.particles.length;
    n = Math.min(n, Math.max(0, room));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = Math.random() * spread;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1,
        decay: 0.014 + Math.random() * 0.028, size: 1.5 + Math.random() * 3.2,
        hue: hue + rand(-20, 20), light: rand(55, 80),
      });
    }
  }
}

export const LAYOUT = { SHIP_Y, IMPACT_Y };
