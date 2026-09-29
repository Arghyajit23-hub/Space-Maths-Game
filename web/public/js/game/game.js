// ════════════════════════════════════════════════════════════════
//  GAME — world simulation (no DOM, no drawing). FLOWMAP §2–3.
//
//  Threats descend toward the ship; their distance IS the timer.
//  Phases: intro → wave → (revenant wave) → bossWarn → boss →
//          draft (perk pick) → warp → wave … → victory | dying
//  UI talks to the game through `game.on.*` callbacks and
//  `type() / backspace() / submit() / choosePerk()`.
// ════════════════════════════════════════════════════════════════

import { CONFIG, THREAT_INFO } from '../config.js';
import { RNG } from '../core/rng.js';
import { isPrime, lerp } from '../core/util.js';
import { Director } from './director.js';
import { Session } from './session.js';
import { PERKS, PERK, baseMods } from '../data/perks.js';
import { SHIP, CREW_BY_ID } from '../data/ships.js';
import { Sound, speak } from '../services/audio.js';
import { explain } from '../challenges/common.js';

const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
const SHIP_Y = H - 140;
const IMPACT_Y = SHIP_Y - 58;
const rand = (a, b) => a + Math.random() * (b - a);
const noop = () => {};
let nextId = 1;

function rockShape() {
  const n = 9 + Math.floor(Math.random() * 4), pts = [];
  for (let i = 0; i < n; i++) pts.push([Math.cos((i / n) * Math.PI * 2), Math.sin((i / n) * Math.PI * 2), rand(0.72, 1.08)]);
  return { pts, craters: Array.from({ length: 3 }, () => [rand(-0.45, 0.45), rand(-0.45, 0.45), rand(0.12, 0.24)]) };
}

export class Game {
  constructor() {
    this.on = { hud: noop, target: noop, input: noop, feedback: noop, banner: noop, over: noop, record: noop, draft: noop, tip: noop };
    this.state = 'idle';
    this.fieldMaxX = W - 150;
    this.stars = Array.from({ length: 220 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 2.6 + 0.4, tw: Math.random() * 6.28 }));
    this.reset({ run: { id: 'idle', kind: 'idle', level: 1, sectors: 1, enemies: () => ({ rock: 1 }), sectorKills: () => 1, bossHp: () => 1 } });
    this.state = 'idle';
  }

  // ── Setup ────────────────────────────────────────
  /**
   * opts = { run, ship, crew, trail, assist, revenants: [...due], ghost, personalBest, weakest(fn) }
   */
  reset(opts) {
    const run = opts.run;
    RNG.seed(run.seed ?? null);
    this.run = run;
    this.opts = opts;
    this.mods = baseMods();
    const ship = SHIP[opts.ship || 'interceptor'] || SHIP.interceptor;
    ship.apply(this.mods);
    if (opts.crew && CREW_BY_ID[opts.crew]) CREW_BY_ID[opts.crew].apply(this.mods);
    this.shipDef = ship;
    this.trail = opts.trailColor || ship.color;
    this.session = new Session(run);
    this.director = new Director(run, this.mods, { assist: !!opts.assist, weakest: opts.weakest || (() => []) });
    this.perkOffer = null;
    if (this.mods.phantom) this._applyPerk(RNG.pick(PERKS).id, true);
    this.hull = this.mods.hullMax;
    this.threats = []; this.particles = []; this.lasers = []; this.popups = []; this.rings = [];
    this.ship = { x: W / 2, y: H + 80, aim: -Math.PI / 2, hit: 0, recoil: 0 };
    this.target = null;
    this.input = '';
    this.deferT = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.spawnT = 0.6;
    this.sectorKills = 0;
    this.shake = 0; this.flash = 0; this.healFlash = 0; this.warp = 0;
    this.timeScale = 1;
    this.alarmT = 0;
    this.lastAllowed = 6;
    this.t = 0;
    this.timelineT = 0;
    this.revenantQueue = (opts.revenants || []).slice();
    this.revenantWave = false;
    this.recordAnnounced = false;
    this.personalBest = opts.personalBest || 0;
    this.ghost = opts.ghost || null;
    this.tipsShown = new Set();
    this.bossHits = 0;
    this.spawnIndex = 0;
    this._sectorReset();
  }

  _sectorReset() {
    this.deflectLeft = this.mods.deflector;
    this.steadyLeft = this.mods.steady;
    this.droneReady = this.mods.carrier;
    this.sectorHullStart = this.hull;
    this.sectorDamaged = false;
  }

  get sector() { return this.session.sector; }
  get level() { return this.director.levelFor(this.sector); }
  get sectorGoal() { return this.run.sectorKills(this.sector); }
  get boss() { return this.threats.find(t => t.kind === 'boss' && !t.dying) || null; }
  get theme() { return this.director.theme(this.sector); }
  get isLastSector() { return this.sector >= this.run.sectors; }

  start(opts) {
    this.reset(opts);
    this.state = 'play';
    this.on.banner(this.run.kind === 'endless' || this.run.kind === 'daily' ? `SECTOR 1` : this.run.id, this.run.kind === 'endless' ? 'Deep Space' : this.run.title, 'sector');
    if (this.run.kind === 'tutorial') this._tip('Type the answer shown on the asteroid — your laser fires by itself.', 'intro');
    this.on.hud(this);
    this.on.target(null);
    this.on.input('');
  }

  pause() { if (this.state === 'play') this.state = 'paused'; }
  resume() { if (this.state === 'paused') this.state = 'play'; }

  // ── Perks ────────────────────────────────────────
  _applyPerk(id, silent = false) {
    PERK[id].apply(this.mods);
    this.session.perks.push(id);
    if (id === 'glass') this.hull = Math.min(this.hull, this.mods.hullMax);
    if (!silent) this.on.hud(this);
  }

  _offerPerks() {
    // Seeded so the Daily Galaxy offers everyone the same choices
    this.director.reseed(`p${this.sector}`);
    this.perkOffer = RNG.shuffle(PERKS).slice(0, 3);
    this.popups = this.popups.filter(p => !p.big);
    this.phase = 'draft'; this.phaseT = 0;
    this.on.draft(this.perkOffer);
  }

  choosePerk(index) {
    if (this.phase !== 'draft' || !this.perkOffer) return;
    const p = this.perkOffer[index];
    if (!p) return;
    this._applyPerk(p.id);
    Sound.multUp(3);
    this.perkOffer = null;
    this.on.draft(null);
    this._beginWarp();
  }

  // ── Input ────────────────────────────────────────
  get acceptingInput() { return this.state === 'play' && ['wave', 'boss', 'bossWarn'].includes(this.phase); }

  type(ch) {
    if (!this.acceptingInput) return;
    if (ch === '-') { if (this.input === '') this.input = '-'; else return; }
    else if (this.input.length < 8) this.input += ch;
    Sound.key();
    this.on.input(this.input);
    this._evaluate(false);
  }

  backspace() {
    if (!this.acceptingInput || !this.input) return;
    this.input = this.input.slice(0, -1);
    this.deferT = 0;
    this.on.input(this.input);
  }

  clearInput() { this.input = ''; this.deferT = 0; this.on.input(''); }

  submit() {
    if (!this.acceptingInput || !this.input || this.input === '-') return;
    this._evaluate(true);
  }

  _live() { return this.threats.filter(t => !t.dying && !t.ally); }
  _allies() { return this.threats.filter(t => !t.dying && t.ally); }

  /** FLOWMAP §2 "Answer resolution" */
  _evaluate(forced) {
    this.deferT = 0;
    const input = this.input;
    if (!input || input === '-') return;
    const live = this._live(), allies = this._allies();
    const all = [...live, ...allies];
    if (!all.length) return;
    const exact = live.find(t => t.challenge.check(input) === 'correct');
    const allyExact = !exact && allies.find(t => t.challenge.check(input) === 'correct');
    const longer = all.some(t => t.challenge.answer !== input && t.challenge.check(input) === 'partial');
    if (exact || allyExact) {
      if (!forced && longer) { this.deferT = CONFIG.DEFER_SECONDS; return; }
      if (exact) this._hit(exact); else this._friendlyFire(allyExact);
      return;
    }
    const tgt = this.target || live[0] || allies[0];
    const fullLength = input.replace('-', '').length >= tgt.challenge.answer.replace('-', '').length;
    if (forced || (!longer && CONFIG.AUTO_WRONG_AT_LENGTH && fullLength)) this._miss(tgt);
  }

  // ── Outcomes ─────────────────────────────────────
  _hit(th) {
    const ch = th.challenge;
    const ratio = Math.min(1, th.qElapsed / th.allowed);
    const isBoss = th.kind === 'boss';
    const ans = Number(ch.answer);
    let special = 1, label = null;
    if (th.kind === 'splitter') { special = CONFIG.CLEAN_BREAK_MULT; label = 'CLEAN BREAK!'; this.session.cleanBreaks++; }
    if (th.group) { special = CONFIG.SWARM_MULT; label = 'SWARM CLEARED!'; this.session.swarms++; }
    if (th.kind === 'revenant') { special = CONFIG.REVENANT_MULT; label = 'REVENANT BANISHED'; this.session.revenantResults.push({ key: ch.revenantKey, beaten: true }); }
    const primeHit = this.mods.prime && !ch.choice && isPrime(ans);
    const res = this.session.onCorrect(ch, Math.round(th.qElapsed * 1000), ratio, {
      level: this.level, boss: isBoss, special: special * (primeHit ? 2 * this.mods.prime : 1),
      pointsMult: this.mods.pointsMult, streakGain: 1 + this.mods.overclock,
    });
    this.director.report('correct', ratio);

    // Laser + FX
    const s = this.ship;
    this.lasers.push({ x1: s.x, y1: s.y - 34, x2: th.x, y2: th.y, life: 1, mult: res.mult });
    s.recoil = 1; s.aim = Math.atan2(th.y - s.y, th.x - s.x);
    Sound.laser(res.mult); Sound.correct(res.mult);
    if (res.fast) Sound.fast();
    const sub = label || (res.fast ? 'BLAZING!' : res.clutch ? 'CLUTCH!' : primeHit ? 'PRIME!' : null);
    this.popups.push({ x: th.x, y: th.y - (th.size || 40) - 10, text: `+${res.points}`, sub, life: 1.2, color: res.fast || label ? '#ffd740' : '#69f0ae', size: 26 });

    // Perk side-effects
    let heal = this.mods.nano;
    if (primeHit) heal += 3 * this.mods.prime;
    if (this.mods.nine && ans !== 0 && ans % 9 === 0 && !ch.choice) heal += 4 * this.mods.nine;
    if (heal) this._repair(heal, null, true);

    if (isBoss) {
      this.bossHits++;
      const dmg = this.mods.gunner && this.bossHits % 5 === 0 ? 2 : 1;
      th.hp = Math.max(0, th.hp - dmg);
      th.hitFlash = 1;
      th.progress = Math.max(0, th.progress - 0.07);
      this._burst(th.x + rand(-40, 40), th.y + rand(-10, 20), 40, th.hue, 7);
      this.shake = Math.max(this.shake, 8);
      if (dmg > 1) this.popups.push({ x: th.x, y: th.y - 110, text: 'DOUBLE HIT', life: 1, color: '#ff6e40', size: 20 });
      if (th.hp <= 0) this._destroyBoss(th);
      else { this.director.reseed(`b${this.sector}-${this.bossHits}`); this._setChallenge(th, this.director.bossChallenge(this.level)); if (th === this.target) this.on.target(th.challenge, th); }
    } else if (th.kind === 'shield' && th.hp > 1) {
      th.hp--; th.hitFlash = 1;
      th.progress = Math.max(0, th.progress - 0.1);
      this.popups.push({ x: th.x, y: th.y + 50, text: 'SHIELD DOWN', life: 0.9, color: '#64ffda', size: 16 });
      this._setChallenge(th, this.director.issue(this.director.challengeFor('shield', this.level)));
      if (th === this.target) this.on.target(th.challenge, th);
    } else if (th.group) {
      for (const m of this.threats.filter(t => t.group === th.group && !t.dying)) {
        if (m !== th) this.lasers.push({ x1: s.x, y1: s.y - 34, x2: m.x, y2: m.y, life: 0.8, mult: res.mult });
        this._destroy(m);
      }
      this._countKill();
    } else {
      this._destroy(th);
      this._countKill();
    }

    // Echo / Chain Lightning: bonus kills
    const extra = [];
    if (this.mods.echo && !isBoss && !ch.choice && ans % 2 === 0) extra.push('ECHO');
    if (this.mods.chain && res.fast && !isBoss) extra.push('CHAIN');
    for (const tag of extra) {
      const victim = this._live().filter(t => t.kind !== 'boss' && !t.group && t.kind !== 'shield').sort((a, b) => b.progress - a.progress)[0];
      if (!victim) break;
      this.lasers.push({ x1: th.x, y1: th.y, x2: victim.x, y2: victim.y, life: 1, mult: 5 });
      this.popups.push({ x: victim.x, y: victim.y - 40, text: tag, life: 0.9, color: '#b388ff', size: 18 });
      this.session.addBonus(victim.challenge.value * 0.5);
      this._destroy(victim); this._countKill();
    }

    if (res.multUp) {
      Sound.multUp(res.mult);
      this.on.feedback('mult', { mult: res.mult });
      this.popups.push({ x: W / 2, y: H / 2 - 40, text: `×${res.mult} MULTIPLIER`, life: 1.6, color: '#00e5ff', size: 40, big: true });
    }
    const st = this.session.streak;
    if (st > 0 && Math.floor(st / this.mods.repairEvery) > Math.floor((st - 1 - this.mods.overclock) / this.mods.repairEvery) && this.hull < this.mods.hullMax) {
      this._repair(CONFIG.REPAIR_STREAK_AMOUNT, 'REPAIR DRONE');
    }
    if (!this.recordAnnounced && this.personalBest > 0 && this.session.score > this.personalBest) {
      this.recordAnnounced = true;
      Sound.record(); this.on.record();
      this.popups.push({ x: W / 2, y: H / 2 + 10, text: 'NEW PERSONAL BEST!', life: 2, color: '#ffd740', size: 34, big: true });
    }
    if (this.run.kind === 'tutorial' && this.session.kills === 1) this._tip('Great shot! Chain correct answers to build your ×multiplier.', 'kill1');

    this.on.feedback('correct', res);
    this.clearInput();
    this._retarget();
    this.on.hud(this);
  }

  _countKill() { this.session.kills++; this.sectorKills++; }

  _miss(th) {
    const keep = this.steadyLeft > 0 && this.session.streak > 0;
    if (keep) { this.steadyLeft--; this.popups.push({ x: this.ship.x, y: this.ship.y - 100, text: 'STEADY HANDS', life: 0.9, color: '#ea80fc', size: 16 }); }
    this.session.onWrong(th.challenge, { keepStreak: keep });
    this.director.report('wrong');
    Sound.wrong();
    this._damage(CONFIG.DAMAGE_WRONG * (1 + this.mods.overclock), false);
    this.popups.push({ x: this.ship.x, y: this.ship.y - 70, text: 'MISS', life: 0.8, color: '#ff5252', size: 22 });
    this.on.feedback('wrong', { input: this.input });
    if (this.run.kind === 'tutorial') this._tip('Missed — that costs a little hull. Backspace fixes typos before you finish.', 'miss');
    this.clearInput();
    this.on.hud(this);
  }

  _friendlyFire(th) {
    this.session.friendlyFire++;
    this.session.streak = 0;
    this.director.report('wrong');
    Sound.wrong();
    this.lasers.push({ x1: this.ship.x, y1: this.ship.y - 34, x2: th.x, y2: th.y, life: 1, mult: 0 });
    this._destroy(th);
    this._damage(CONFIG.DAMAGE_FRIENDLY, false);
    this.popups.push({ x: th.x, y: th.y - 40, text: 'FRIENDLY FIRE!', sub: 'Green ships are allies', life: 1.4, color: '#ff5252', size: 22 });
    this.on.feedback('friendly', {});
    this.clearInput();
    this._retarget();
    this.on.hud(this);
  }

  _impact(th) {
    const ch = th.challenge;
    const isBoss = th.kind === 'boss';
    const group = th.group ? this.threats.filter(t => t.group === th.group && !t.dying) : [th];
    this.session.onTimeout(ch);
    this.session.impacts++;
    this.director.report('timeout');
    const why = explain(ch);
    this.on.feedback('timeout', { explain: why });
    this.popups.push({ x: th.x, y: th.y - 40, text: why, life: 2.2, color: '#ff8a80', size: 20 });
    if (this.deflectLeft > 0 && !isBoss) {
      this.deflectLeft--;
      this.rings.push({ x: this.ship.x, y: this.ship.y, r: 40, life: 1, color: '#64ffda' });
      this.popups.push({ x: this.ship.x, y: this.ship.y - 90, text: 'DEFLECTED', life: 1, color: '#64ffda', size: 20 });
      Sound.repair();
    } else {
      Sound.impact();
      this._burst(th.x, th.y + 20, 50, 0, 8);
      this._damage(isBoss ? CONFIG.DAMAGE_BOSS_IMPACT : CONFIG.DAMAGE_IMPACT, true);
    }
    if (isBoss) {
      th.progress = 0.05;
      this._setChallenge(th, this.director.bossChallenge(this.level));
    } else {
      for (const m of group) { m.dying = true; m.dieT = 0.3; m.impacted = true; }
    }
    if (this.run.kind === 'tutorial') this._tip('Threats that reach your ship hit hard. The correct answer flashes — remember it!', 'impact');
    this.clearInput();
    this._retarget(true);
    this.on.hud(this);
  }

  _damage(amount, big) {
    if (this.phase === 'dying' || this.phase === 'victory') return;
    this.hull = Math.max(0, this.hull - amount);
    this.sectorDamaged = true;
    this.ship.hit = 1;
    this.shake = Math.max(this.shake, big ? 22 : 7);
    this.flash = Math.max(this.flash, big ? 0.55 : 0.22);
    if (this.hull <= 0) this._die();
  }

  _repair(amount, label, quiet = false) {
    const before = this.hull;
    this.hull = Math.min(this.mods.hullMax, this.hull + amount);
    if (this.hull === before) return;
    this.healFlash = quiet ? Math.max(this.healFlash, 0.4) : 1;
    if (!quiet) Sound.repair();
    this.popups.push({ x: this.ship.x + (quiet ? 60 : 0), y: this.ship.y - (quiet ? 50 : 90), text: `+${Math.round(this.hull - before)} HULL`, sub: label, life: quiet ? 0.9 : 1.6, color: '#69f0ae', size: quiet ? 15 : 22 });
    this.on.hud(this);
  }

  _destroy(th) {
    th.dying = true; th.dieT = 0.5;
    this._burst(th.x, th.y, th.mini ? 26 : 46, th.hue, 6);
    this.rings.push({ x: th.x, y: th.y, r: (th.size || 40) * 0.6, life: 1, color: `hsl(${th.hue},90%,70%)` });
    this.shake = Math.max(this.shake, 4);
    setTimeout(() => Sound.explode(false), 60);
  }

  _destroyBoss(th) {
    th.dying = true; th.dieT = 1.2;
    this.session.bossKills++;
    this.session.cur.boss = true;
    for (let i = 0; i < 6; i++) setTimeout(() => {
      this._burst(th.x + rand(-110, 110), th.y + rand(-30, 30), 50, th.hue + i * 20, 9);
      this.rings.push({ x: th.x, y: th.y, r: 30, life: 1, color: '#fff', big: true });
      Sound.explode(true);
    }, i * 140);
    this.shake = 26;
    this.clearInput();
    this.on.target(null);
    this.target = null;
    const bonus = CONFIG.SECTOR_CLEAR_BONUS * this.level;
    this.session.addBonus(bonus * this.mods.pointsMult);
    if (!this.sectorDamaged) this.session.flawlessSectors++;
    this.popups.push({ x: W / 2, y: H / 2 - 60, text: `${th.name.toUpperCase()} DESTROYED`, sub: `SECTOR BONUS +${Math.round(bonus * this.mods.pointsMult)}`, life: 2.4, color: '#ffd740', size: 32, big: true });
    this.phase = 'bossDown'; this.phaseT = 0;
  }

  _beginWarp() {
    this.phase = 'warp'; this.phaseT = 0; this._warpBannered = false;
    setTimeout(() => { if (this.state !== 'idle') Sound.levelUp(); }, 300);
  }

  _die() {
    this.phase = 'dying'; this.phaseT = 0;
    this.timeScale = 0.35;
    this.clearInput();
    this.on.target(null);
    Sound.gameOver(); Sound.stopMusic();
    for (let i = 0; i < 4; i++) setTimeout(() => {
      this._burst(this.ship.x + rand(-30, 30), this.ship.y + rand(-20, 20), 70, [340, 40, 200, 20][i], 10);
      this.rings.push({ x: this.ship.x, y: this.ship.y, r: 20, life: 1, color: '#ff4081', big: true });
    }, i * 120);
    this.shake = 30;
  }

  _tip(text, key) {
    if (this.tipsShown.has(key)) return;
    this.tipsShown.add(key);
    this.on.tip(text);
  }

  // ── Spawning ─────────────────────────────────────
  _setChallenge(th, c) {
    th.challenge = c;
    th.qElapsed = 0;
    th.allowed = th.kind === 'boss' ? this.director.timeFor(c, this.level, 'boss') : th.allowed;
    th.revealLeft = this.director.revealFor(c);
  }

  _lane() {
    let x, tries = 0;
    do { x = RNG.float(150, this.fieldMaxX); tries++; }
    while (tries < 14 && this.threats.some(t => !t.dying && !t.ally && Math.abs(t.x - x) < 190 && t.progress < 0.45));
    return x;
  }

  _makeThreat(kind, c, x, extra = {}) {
    const lvl = this.level;
    const allowed = this.director.timeFor(c, lvl, kind);
    const th = {
      id: nextId++, kind, challenge: c, x0: x, x, y: -60, progress: 0, rate: 1 / allowed, allowed,
      qElapsed: 0, ready: true, hp: 1, maxHp: 1,
      size: RNG.float(32, 44), hue: Math.floor(RNG.float(0, 360)),
      rot: rand(0, 6.28), spin: rand(-0.8, 0.8), wob: rand(0, 6.28),
      dying: false, dieT: 0, warned: false, revealLeft: this.director.revealFor(c), hitFlash: 0,
      ...extra,
    };
    if (kind === 'rock' || kind === 'splitter') { th.shape = rockShape(); th.hue = kind === 'rock' ? Math.floor(rand(15, 40)) : 190; }
    if (kind === 'shield') { th.hp = th.maxHp = 2; th.hue = 170; }
    if (kind === 'revenant') th.hue = 285;
    if (kind === 'mirror') th.hue = 200;
    if (kind === 'beacon') th.hue = 275;
    if (kind === 'cloaked') th.hue = 250;
    th.drift = Math.min(this.fieldMaxX, lerp(x, W / 2, RNG.float(0.15, 0.4))) - x;
    return th;
  }

  _spawn() {
    const lvl = this.level;
    this.director.reseed(`s${this.spawnIndex++}`);
    // Revenant wave (FLOWMAP §6)
    if (this.revenantWave && this.revenantQueue.length) {
      const rv = this.revenantQueue.shift();
      const c = this.director.issue(this.director.revenant(rv));
      const th = this._makeThreat('revenant', c, this._lane());
      this.threats.push(th); this.lastAllowed = th.allowed;
      this._retarget();
      return;
    }
    const kind = this.director.nextKind(lvl);
    if (kind === 'swarm') {
      const cs = this.director.swarm(lvl).map(c => this.director.issue(c));
      const x = Math.min(this.fieldMaxX - 60, Math.max(210, this._lane()));
      const group = nextId++;
      const offs = [[-70, 0], [70, 0], [0, -55]];
      cs.forEach((c, i) => {
        const th = this._makeThreat('saucer', c, x + offs[i][0], { group, mini: true, size: 24, hue: 95, yOff: offs[i][1] });
        this.threats.push(th);
      });
      // Share one clock
      const allowed = Math.max(...this.threats.filter(t => t.group === group).map(t => t.allowed));
      for (const t of this.threats.filter(t => t.group === group)) { t.allowed = allowed; t.rate = 1 / allowed; t.drift = 0; }
      this.lastAllowed = allowed;
      if (!this.tipsShown.has('swarm')) this._tip(THREAT_INFO.swarm.tip, 'swarm');
    } else if (kind === 'ally') {
      const c = this.director.challengeFor('ally', lvl);
      const fromLeft = RNG.chance(0.5);
      const th = this._makeThreat('ally', c, fromLeft ? -60 : W + 60, { ally: true, hue: 130, dir: fromLeft ? 1 : -1, laneY: RNG.float(110, 230) });
      th.allowed = CONFIG.ALLY_TIME; th.rate = 1 / CONFIG.ALLY_TIME;
      this.threats.push(th);
      this._tip(THREAT_INFO.ally.tip, 'ally');
      return; // allies don't consume the spawn slot
    } else {
      const c = this.director.issue(this.director.challengeFor(kind, lvl));
      const th = this._makeThreat(kind, c, this._lane());
      this.threats.push(th);
      this.lastAllowed = th.allowed;
      if (THREAT_INFO[kind]?.tip) this._tip(THREAT_INFO[kind].tip, kind);
    }
    this._retarget();
  }

  _crack(th) {
    // Splitter unsolved at SPLIT_AT → two fragments carrying the sub-problems
    th.dying = true; th.dieT = 0.25;
    this._burst(th.x, th.y, 30, 190, 4);
    Sound.explode(false);
    const p0 = th.progress;
    th.challenge.parts.forEach((part, i) => {
      const c = this.director.issue(part);
      const frag = this._makeThreat('rock', c, th.x + (i ? 60 : -60), { size: 26, mini: true, hue: 190 });
      frag.shape = rockShape();
      frag.progress = p0;
      const allowed = this.director.timeFor(c, this.level, 'rock') * CONFIG.SPLIT_TIME_FACTOR;
      frag.allowed = allowed; frag.rate = (1 - p0) / allowed; frag.drift = 0; frag.x0 = frag.x;
      this.threats.push(frag);
    });
    this.popups.push({ x: th.x, y: th.y - 40, text: 'CRACKED!', life: 0.8, color: '#80deea', size: 16 });
    this._retarget(true);
  }

  _spawnBoss() {
    const lvl = this.level;
    const hp = this.run.bossHp(this.sector);
    this.director.reseed(`b${this.sector}-start`);
    const c = this.director.bossChallenge(lvl);
    const name = this.director.bossName(lvl);
    this.session.bossName = name;
    const th = {
      id: nextId++, kind: 'boss', name, challenge: c, x0: W / 2, x: W / 2, y: -140, drift: 0,
      progress: 0, qElapsed: 0, ready: true, hp, maxHp: hp, allowed: this.director.timeFor(c, lvl, 'boss'),
      travel: Math.max(hp * 7 * CONFIG.levelTimeFactor(lvl) * this.mods.timeMult, 16), size: 120, hue: this.theme.hue2,
      rot: 0, spin: 0, wob: 0, dying: false, dieT: 0, hitFlash: 0, revealLeft: this.director.revealFor(c),
    };
    this.threats.push(th);
    this._retarget();
    this.on.hud(this);
    if (this.run.kind === 'tutorial') this._tip('MOTHERSHIP! Each answer damages it and knocks it back.', 'boss');
  }

  _retarget(force = false) {
    let best = null;
    for (const t of this._live()) if (!best || t.progress > best.progress) best = t;
    if (best !== this.target || force) { this.target = best; this.on.target(best ? best.challenge : null, best); }
  }

  // ── Update ───────────────────────────────────────
  update(rawDt) {
    if (this.state !== 'play') return;
    const dt = Math.min(rawDt, 0.05) * this.timeScale;
    this.t += dt; this.phaseT += dt;
    const s = this.ship;

    s.y = lerp(s.y, (this.phase === 'dying' ? s.y : SHIP_Y) + Math.sin(this.t * 2) * 3, Math.min(1, dt * 4));
    s.hit = Math.max(0, s.hit - dt * 2.5);
    s.recoil = Math.max(0, s.recoil - dt * 6);
    if (this.target) s.aim = lerp(s.aim, Math.atan2(this.target.y - s.y, this.target.x - s.x), Math.min(1, dt * 8));

    const active = !['intro', 'dying', 'draft', 'victory'].includes(this.phase);
    if (active) {
      this.session.survival += dt;
      this.timelineT += dt;
      if (this.timelineT >= 2) { this.timelineT -= 2; this.session.timeline.push(this.session.score); }
    }
    if (this.deferT > 0 && (this.deferT -= dt) <= 0) this._evaluate(true);

    switch (this.phase) {
      case 'intro':
        if (this.phaseT > 1.1) { this.phase = 'wave'; this.phaseT = 0; Sound.startMusic(); if (this.run.kind !== 'tutorial') speak('Shields up, pilot.'); }
        break;
      case 'wave': {
        const live = this.threats.filter(t => !t.dying && !t.ally);
        const groups = new Set(live.map(t => t.group || t.id)).size;
        const remaining = this.sectorGoal - this.sectorKills - groups;
        if (!this.revenantWave && this.sector === 1 && this.run.revenants !== false && this.revenantQueue.length >= CONFIG.REVENANT_MIN
            && this.sectorKills >= Math.ceil(this.sectorGoal * CONFIG.REVENANT_WAVE_AT)) {
          this.revenantWave = true;
          this.on.banner('REVENANT FLEET', 'Your past mistakes return', 'boss');
          Sound.bossWarn();
        }
        const revPending = this.revenantWave && this.revenantQueue.length > 0;
        this.spawnT -= dt;
        if ((remaining > 0 || revPending) && groups < this.director.maxConcurrent(this.level) && (this.spawnT <= 0 || groups === 0)) {
          this._spawn();
          this.spawnT = this.director.spawnGap(this.level, this.lastAllowed);
        }
        if (this.sectorKills >= this.sectorGoal && live.length === 0 && !revPending) {
          this.phase = 'bossWarn'; this.phaseT = 0;
          Sound.bossWarn();
          this.on.banner('WARNING', this.run.bossName ? this.run.bossName : 'Mothership inbound', 'boss');
          if (this.run.kind !== 'tutorial') speak('Warning. Mothership inbound.');
        }
        break;
      }
      case 'bossWarn':
        if (this.phaseT > 2.2) { this.phase = 'boss'; this.phaseT = 0; this._spawnBoss(); }
        break;
      case 'bossDown':
        if (this.phaseT > 1.3) {
          if (this.isLastSector) {
            this.phase = 'victory'; this.phaseT = 0; this.session.victory = true;
            Sound.record(); Sound.stopMusic();
            this.on.banner('MISSION COMPLETE', this.run.title, 'sector');
          } else if (this.run.perks) this._offerPerks();
          else this._beginWarp();
        }
        break;
      case 'draft': break;
      case 'warp':
        this.warp = Math.min(1, this.warp + dt * 0.9);
        if (this.phaseT > 1.0 && !this._warpBannered) {
          this._warpBannered = true;
          this.session.nextSector();
          this.sectorKills = 0;
          this.director.heat *= 0.5;
          this._repair(CONFIG.REPAIR_SECTOR_CLEAR, 'SECTOR CLEAR');
          this._sectorReset();
          this.on.banner(`SECTOR ${this.sector}`, this.run.kind === 'endless' || this.run.kind === 'daily' ? this.theme.name : this.run.title, 'sector');
          if (this.run.kind === 'endless') speak(`Sector ${this.sector}.`);
          this.on.hud(this);
        }
        if (this.phaseT > 2.8) { this.phase = 'wave'; this.phaseT = 0; this.spawnT = 0.4; }
        break;
      case 'victory':
        if (this.phaseT > 2.2) { this.state = 'over'; this.on.over(this.session.summary(), this.session, this); }
        break;
      case 'dying':
        this.ship.y += dt * 30;
        if (this.phaseT > 0.9) { this.state = 'over'; this.timeScale = 1; this.on.over(this.session.summary(), this.session, this); }
        break;
    }
    if (this.phase !== 'warp') this.warp = Math.max(0, this.warp - dt * 1.5);

    // Carrier drone
    if (this.droneReady && this.phase === 'wave') {
      const cands = this._live().filter(t => t.kind !== 'boss' && !t.group && t.kind !== 'shield' && t.progress > 0.3);
      if (cands.length >= 2) {
        const v = cands.sort((a, b) => a.challenge.value - b.challenge.value)[0];
        this.droneReady = false;
        this.lasers.push({ x1: this.ship.x + 40, y1: this.ship.y, x2: v.x, y2: v.y, life: 1, mult: 4 });
        this.popups.push({ x: v.x, y: v.y - 40, text: 'DRONE STRIKE', life: 1, color: '#b388ff', size: 16 });
        this._destroy(v); this._countKill(); this._retarget(); this.on.hud(this);
      }
    }

    // Threats
    const frozen = ['dying', 'draft', 'victory', 'bossDown'].includes(this.phase);
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const th = this.threats[i];
      if (th.dying) { th.dieT -= dt; if (th.dieT <= 0) this.threats.splice(i, 1); continue; }
      if (frozen) continue;
      th.qElapsed += dt;
      th.rot += th.spin * dt;
      th.wob += dt * 2;
      th.hitFlash = Math.max(0, (th.hitFlash || 0) - dt * 3);
      if (th.revealLeft > 0) th.revealLeft -= dt;
      if (th.kind === 'boss') {
        th.progress += dt / th.travel;
        th.enter = Math.min(1, (th.enter || 0) + dt * 0.8);
        const ease = 1 - Math.pow(1 - th.enter, 3);
        th.x = W / 2 + Math.sin(th.wob * 0.35) * 160;
        th.y = lerp(-140, lerp(170, IMPACT_Y - 80, th.progress), ease);
        if (th.progress >= 1) this._impact(th);
      } else if (th.ally) {
        th.progress += dt * th.rate;
        th.x = th.dir > 0 ? lerp(-60, W + 60, th.progress) : lerp(W + 60, -60, th.progress);
        th.y = th.laneY + Math.sin(th.wob) * 8;
        if (th.progress >= 1) this.threats.splice(i, 1);
      } else {
        th.progress += dt * th.rate;
        const p = th.progress;
        th.x = th.x0 + th.drift * p + (th.kind === 'saucer' || th.kind === 'revenant' ? Math.sin(th.wob) * 14 : 0);
        th.y = lerp(-50, IMPACT_Y, p) + (th.yOff || 0) * (1 - p);
        if (th.kind === 'splitter' && p >= CONFIG.SPLIT_AT && th.challenge.parts) { this._crack(th); continue; }
        if (th === this.target && p > 0.75 && !th.warned) { th.warned = true; Sound.alarm(); }
        if (p >= 1) { this._impact(th); if (this.phase === 'dying') break; }
      }
    }
    if (this.target && (this.target.dying || !this.threats.includes(this.target))) this._retarget();

    if (this.hull <= CONFIG.HULL_CRITICAL && this.phase !== 'dying') {
      this.alarmT -= dt;
      if (this.alarmT <= 0) { Sound.alarm(); this.alarmT = 2.4; }
    }
    const tp = this.target ? this.target.progress : 0;
    Sound.setIntensity(Math.min(1, (this.level - 1) * 0.15 + this.session.multiplier * 0.08 + tp * 0.3));

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

  /** Ghost race: score difference vs the best run at the same moment. */
  ghostDelta() {
    const g = this.ghost;
    if (!g || !g.timeline?.length) return null;
    const t = this.session.survival / 2;
    const i = Math.min(Math.floor(t), g.timeline.length - 1);
    const a = g.timeline[i] ?? 0, b = g.timeline[Math.min(i + 1, g.timeline.length - 1)] ?? a;
    const ghostScore = t >= g.timeline.length ? g.score : lerp(a, b, t - i);
    return Math.round(this.session.score - ghostScore);
  }

  _burst(x, y, n, hue, spread) {
    n = Math.min(n, Math.max(0, CONFIG.MAX_PARTICLES - this.particles.length));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = Math.random() * spread;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.014 + Math.random() * 0.028, size: 1.5 + Math.random() * 3.2, hue: hue + rand(-20, 20), light: rand(55, 80) });
    }
  }
}

export const LAYOUT = { SHIP_Y, IMPACT_Y };
