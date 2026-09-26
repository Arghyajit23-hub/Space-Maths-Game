// ════════════════════════════════════════════════════════════════
//  SESSION — one run's score + cognitive telemetry.
//  Pure data, no rendering. Every answer is logged with its skill and
//  response time, which powers the debrief, profile and future reports.
// ════════════════════════════════════════════════════════════════

import { CONFIG, multiplierFor } from '../config.js';
import { SKILL_LABELS } from '../challenges/index.js';

export class Session {
  constructor(mode = 'math') {
    this.mode = mode;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correct = 0;
    this.wrong = 0;
    this.timeouts = 0;
    this.survival = 0;       // seconds of active play
    this.sector = 1;
    this.kills = 0;
    this.skills = {};        // skillId → { attempts, correct, wrong, timeouts, totalMs, fastest }
    this.log = [];           // [{ skill, result, ms, sector }]
  }

  get multiplier() { return multiplierFor(this.streak); }

  _skill(id) {
    return this.skills[id] || (this.skills[id] = { attempts: 0, correct: 0, wrong: 0, timeouts: 0, totalMs: 0, fastest: Infinity });
  }

  /**
   * Register a correct answer. Returns a breakdown for popups.
   * `ratio` = elapsed / allowed time (0 = instant, 1 = at the wire).
   */
  onCorrect(challenge, ms, ratio, { boss = false } = {}) {
    const prevMult = this.multiplier;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.correct++;
    const s = this._skill(challenge.skill);
    s.attempts++; s.correct++; s.totalMs += ms; s.fastest = Math.min(s.fastest, ms);
    this.log.push({ skill: challenge.skill, result: 'correct', ms, sector: this.sector });

    const mult = this.multiplier;
    const sectorBoost = 1 + (this.sector - 1) * CONFIG.SECTOR_SCORE_BONUS;
    let base = boss ? CONFIG.BOSS_HIT_POINTS + challenge.value * 0.5 : challenge.value;
    let points = base * sectorBoost;
    const fast = ratio <= CONFIG.FAST_RATIO;
    const clutch = ratio >= CONFIG.CLUTCH_RATIO;
    if (fast) points *= 1 + CONFIG.FAST_BONUS;
    points = Math.round(points * mult / 5) * 5;
    if (clutch) points += CONFIG.CLUTCH_BONUS * mult;
    this.score += points;
    return { points, fast, clutch, mult, multUp: mult > prevMult };
  }

  onWrong(challenge) {
    this.wrong++;
    const lost = this.streak;
    this.streak = 0;
    const s = this._skill(challenge.skill);
    s.wrong++;
    this.log.push({ skill: challenge.skill, result: 'wrong', ms: 0, sector: this.sector });
    return { lostStreak: lost };
  }

  onTimeout(challenge) {
    this.timeouts++;
    const lost = this.streak;
    this.streak = 0;
    const s = this._skill(challenge.skill);
    s.attempts++; s.timeouts++;
    this.log.push({ skill: challenge.skill, result: 'timeout', ms: 0, sector: this.sector });
    return { lostStreak: lost };
  }

  addBonus(points) { this.score += points; }

  get accuracy() {
    const total = this.correct + this.wrong + this.timeouts;
    return total ? Math.round((this.correct / total) * 100) : 0;
  }

  get avgMs() {
    const c = this.log.filter(l => l.result === 'correct');
    return c.length ? Math.round(c.reduce((a, l) => a + l.ms, 0) / c.length) : 0;
  }

  /** Strongest / weakest skills for the debrief (needs ≥2 attempts). */
  insights() {
    const rows = Object.entries(this.skills)
      .filter(([, s]) => s.attempts + s.wrong >= 2)
      .map(([id, s]) => {
        const acc = s.correct / Math.max(1, s.attempts + s.wrong);
        const avg = s.correct ? s.totalMs / s.correct : 99999;
        return { id, label: SKILL_LABELS[id] || id, acc, avg, s };
      });
    if (!rows.length) return { best: null, focus: null, rows };
    const scoreOf = r => r.acc * 2 - r.avg / 10000;
    const sorted = [...rows].sort((a, b) => scoreOf(b) - scoreOf(a));
    const best = sorted[0].acc >= 0.5 ? sorted[0] : null;
    const focus = sorted.length > 1 || !best ? sorted[sorted.length - 1] : null;
    return { best, focus: focus && (focus.acc < 0.9 || focus.avg > 5000) ? focus : null, rows: sorted };
  }

  summary() {
    const skills = {};
    for (const [id, s] of Object.entries(this.skills)) {
      skills[id] = { attempts: s.attempts + s.wrong, correct: s.correct, timeouts: s.timeouts, totalMs: s.totalMs };
    }
    return {
      mode: this.mode, score: this.score, sector: this.sector, kills: this.kills,
      accuracy: this.accuracy, avgMs: this.avgMs, bestStreak: this.bestStreak,
      survival: Math.round(this.survival), correct: this.correct, wrong: this.wrong,
      timeouts: this.timeouts, skills,
    };
  }
}
