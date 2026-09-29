// ════════════════════════════════════════════════════════════════
//  DIRECTOR — decides WHAT comes next and HOW FAST.
//   • threat type from the run's enemy mix at the current level
//   • a matching challenge (memory → Beacon, choice → Mirror, …)
//   • time limits: level × adaptive heat × ship/perk/crew modifiers
//   • Nemesis Mothership questions from the pilot's weakest skills
// ════════════════════════════════════════════════════════════════

import { CONFIG } from '../config.js';
import { RNG } from '../core/rng.js';
import { MathChallenges, LogicChallenges, generateSkill, SKILL, CHOICE_SKILLS, MEMORY_SKILL_IDS, ALL_SKILLS, SKILL_LABELS } from '../challenges/index.js';
import { fromSnapshot } from '../challenges/common.js';
import { SYSTEMS } from '../data/galaxy.js';

const NUMERIC_LOGIC = ['sequence', 'rounding'];

export class Director {
  constructor(run, mods, { assist = false, weakest = () => [] } = {}) {
    this.run = run;
    this.mods = mods;
    this.assist = assist;
    this.weakestFn = weakest;
    this.heat = 0;
    this.issued = 0;
    this.recentSkills = [];
  }

  levelFor(sector) { return this.run.level + (sector - 1) * (this.run.levelPerSector || 0); }
  get warmup() { return this.issued < CONFIG.WARMUP_COUNT && this.run.kind !== 'boss'; }

  theme(sector) {
    if (this.run.system) return SYSTEMS.find(s => s.id === this.run.system);
    const cycle = SYSTEMS.filter(s => !s.hidden);
    return cycle[(sector - 1) % cycle.length];
  }

  // ── Threat type ──────────────────────────────────
  nextKind(level) {
    const mix = { ...this.run.enemies(level) };
    if (this.warmup) return mix.rock ? 'rock' : Object.keys(mix)[0];
    return RNG.weighted(mix);
  }

  // ── Skill pools ──────────────────────────────────
  _allowed(filter) {
    const s = this.run.skills;
    return s ? s.filter(filter) : null;
  }

  _numeric(level) {
    const allowed = this._allowed(id => !CHOICE_SKILLS.includes(id) && !MEMORY_SKILL_IDS.includes(id));
    const ctx = { level, heat: this.heat, warmup: this.warmup, recentSkills: this.recentSkills };
    if (allowed && allowed.length) {
      const math = allowed.filter(id => SKILL[id] && MathChallenges.skills.some(k => k.id === id));
      const logic = allowed.filter(id => NUMERIC_LOGIC.includes(id));
      if (logic.length && (!math.length || RNG.chance(logic.length / allowed.length))) return LogicChallenges.generate(RNG.pick(logic), ctx);
      return MathChallenges.next({ ...ctx, skills: math });
    }
    if (!allowed && level >= 3 && RNG.chance(0.18)) return LogicChallenges.generate(RNG.pick(NUMERIC_LOGIC), ctx);
    return MathChallenges.next(ctx);
  }

  challengeFor(kind, level) {
    const ctx = { level, heat: this.heat };
    switch (kind) {
      case 'beacon': {
        const mem = this._allowed(id => MEMORY_SKILL_IDS.includes(id));
        const id = mem && mem.length ? RNG.pick(mem) : level >= 3 && RNG.chance(0.3) ? 'code_rev' : 'code';
        return generateSkill(id, ctx);
      }
      case 'mirror': {
        const ch = this._allowed(id => CHOICE_SKILLS.includes(id));
        return generateSkill(ch && ch.length ? RNG.pick(ch) : RNG.pick(CHOICE_SKILLS), ctx);
      }
      case 'splitter': return MathChallenges.splittable({ level });
      default: {
        const c = this._numeric(level);
        if (kind === 'cloaked') c.reveal = CONFIG.CLOAK_REVEAL;
        return c;
      }
    }
  }

  swarm(level) { return MathChallenges.swarm({ level }); }

  revenant(snap) { const c = fromSnapshot(snap.snap); c.revenantKey = snap.key; return c; }

  /** Seconds a challenge gets on the clock. */
  timeFor(c, level, kind) {
    let t = c.time * CONFIG.levelTimeFactor(level) * CONFIG.heatTimeFactor(this.heat) * this.mods.timeMult;
    if (c.choice || c.skill === 'sequence') t *= this.mods.choiceTimeMult;
    if (kind === 'swarm') t *= CONFIG.SWARM_TIME_FACTOR;
    if (this.warmup) t *= CONFIG.WARMUP_TIME_BONUS;
    if (this.assist) t *= CONFIG.ASSIST_TIME_BONUS;
    if (c.reveal) t = Math.max(t, this.revealFor(c) + 2.5);
    return Math.max(2.6, t);
  }

  revealFor(c) { return c.reveal ? c.reveal * this.mods.revealMult + this.mods.revealBonus : 0; }

  issue(c) {
    this.issued++;
    this.recentSkills.push(c.skill);
    if (this.recentSkills.length > 6) this.recentSkills.shift();
    return c;
  }

  spawnGap(level, lastAllowed) {
    if (this.warmup) return lastAllowed * 0.95;
    return lastAllowed * CONFIG.spawnGapFactor(level) * CONFIG.heatTimeFactor(this.heat);
  }

  maxConcurrent(level) {
    if (this.warmup) return 1;
    const base = CONFIG.maxConcurrent(level);
    return Math.max(1, this.heat < -0.4 ? base - 1 : base);
  }

  // ── Nemesis Mothership ───────────────────────────
  bossPool(level) {
    if (this.run.skills) return this.run.skills;
    return ALL_SKILLS.filter(s => (s.from || 1) <= level).map(s => s.id);
  }

  bossName(level) {
    if (this.run.bossName) return this.run.bossName;
    const weak = this.weakestFn(this.bossPool(level).filter(id => !MEMORY_SKILL_IDS.includes(id)), 1)[0];
    return weak ? `The ${SKILL_LABELS[weak]} Dreadnought` : 'The Dreadnought';
  }

  bossChallenge(level) {
    const pool = this.bossPool(level);
    const weak = this.weakestFn(pool, 3);
    const id = weak.length && RNG.chance(0.6) ? RNG.pick(weak) : RNG.pick(pool);
    const c = generateSkill(id, { level, heat: this.heat, warmup: false, skills: [id] });
    return this.issue(c);
  }

  /** Seeded runs (Daily): each event gets its own deterministic stream. */
  reseed(tag) { if (this.run.seed) RNG.seed(`${this.run.seed}:${tag}`); }

  report(result, ratio = 1) {
    if (this.run.seed) return;              // Daily: no adaptation — identical for everyone
    const H = CONFIG.HEAT;
    const d = result === 'correct' ? (ratio <= 0.45 ? H.fast : H.correct) : result === 'wrong' ? H.wrong : H.timeout;
    this.heat = Math.max(-1, Math.min(1, this.heat + d));
  }
}
