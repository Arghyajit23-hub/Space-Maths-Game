// ════════════════════════════════════════════════════════════════
//  SESSION — one run's score and cognitive telemetry. Pure data.
//  Every answer is logged with skill + response time: this feeds the
//  debrief, Brain Map, Revenant Fleet, achievements and reports.
// ════════════════════════════════════════════════════════════════

import { CONFIG, multiplierFor } from '../config.js';
import { SKILL_LABELS } from '../challenges/index.js';
import { snapshot } from '../challenges/common.js';

export class Session {
  constructor(run) {
    this.run = run;
    this.kind = run.kind;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correct = 0;
    this.wrong = 0;
    this.timeouts = 0;
    this.impacts = 0;
    this.friendlyFire = 0;
    this.survival = 0;
    this.sector = 1;
    this.kills = 0;
    this.bossKills = 0;
    this.blazing = 0;
    this.clutch = 0;
    this.swarms = 0;
    this.cleanBreaks = 0;
    this.flawlessSectors = 0;
    this.sectors = [];                 // per-sector { correct, attempts, boss }
    this.skills = {};
    this.log = [];
    this.missed = [];                  // snapshots → Revenant Fleet
    this.revenantResults = [];         // { key, beaten }
    this.timeline = [];                // score every 2 s → ghost
    this.perks = [];
    this.victory = false;
    this.bossName = null;
    this._sector();
  }

  _sector() { this.sectors.push({ correct: 0, attempts: 0, boss: false }); }
  get cur() { return this.sectors[this.sectors.length - 1]; }
  nextSector() { this.sector++; this._sector(); }

  get multiplier() { return multiplierFor(this.streak); }

  _skill(id) {
    return this.skills[id] || (this.skills[id] = { attempts: 0, correct: 0, wrong: 0, timeouts: 0, totalMs: 0 });
  }

  /**
   * opts: { level, boss, special (×), pointsMult, streakGain, forceFast }
   * returns { points, fast, clutch, mult, multUp }
   */
  onCorrect(ch, ms, ratio, opts = {}) {
    const { level = 1, boss = false, special = 1, pointsMult = 1, streakGain = 1 } = opts;
    const prevMult = this.multiplier;
    this.streak += streakGain;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.correct++;
    this.cur.correct++; this.cur.attempts++;
    const s = this._skill(ch.skill);
    s.attempts++; s.correct++; s.totalMs += ms;
    this.log.push({ skill: ch.skill, result: 'correct', ms, sector: this.sector });

    const mult = this.multiplier;
    const base = boss ? CONFIG.BOSS_HIT_POINTS + ch.value * 0.5 : ch.value;
    let points = base * (1 + (level - 1) * CONFIG.LEVEL_SCORE_BONUS) * special * pointsMult;
    const fast = ratio <= CONFIG.FAST_RATIO;
    const clutch = !fast && ratio >= CONFIG.CLUTCH_RATIO;
    if (fast) { points *= 1 + CONFIG.FAST_BONUS; this.blazing++; }
    points = Math.round((points * mult) / 5) * 5;
    if (clutch) { points += CONFIG.CLUTCH_BONUS * mult; this.clutch++; }
    this.score += points;
    return { points, fast, clutch, mult, multUp: mult > prevMult };
  }

  onWrong(ch, { keepStreak = false } = {}) {
    this.wrong++;
    this.cur.attempts++;
    if (!keepStreak) this.streak = 0;
    this._skill(ch.skill).wrong++;
    this.log.push({ skill: ch.skill, result: 'wrong', ms: 0, sector: this.sector });
    this._remember(ch);
  }

  onTimeout(ch) {
    this.timeouts++;
    this.cur.attempts++;
    this.streak = 0;
    const s = this._skill(ch.skill); s.attempts++; s.timeouts++;
    this.log.push({ skill: ch.skill, result: 'timeout', ms: 0, sector: this.sector });
    this._remember(ch);
  }

  _remember(ch) {
    if (ch.revenantKey) { this.revenantResults.push({ key: ch.revenantKey, beaten: false }); return; }
    if (!this.missed.some(m => m.prompt === ch.prompt)) this.missed.push(snapshot(ch));
  }

  addBonus(points) { this.score += Math.round(points); }

  get accuracy() {
    const total = this.correct + this.wrong + this.timeouts;
    return total ? Math.round((this.correct / total) * 100) : 0;
  }

  get avgMs() {
    const c = this.log.filter(l => l.result === 'correct');
    return c.length ? Math.round(c.reduce((a, l) => a + l.ms, 0) / c.length) : 0;
  }

  insights() {
    const rows = Object.entries(this.skills)
      .filter(([, s]) => s.attempts + s.wrong >= 2)
      .map(([id, s]) => {
        const acc = s.correct / Math.max(1, s.attempts + s.wrong);
        const avg = s.correct ? s.totalMs / s.correct : 99999;
        return { id, label: SKILL_LABELS[id] || id, acc, avg };
      });
    if (!rows.length) return { best: null, focus: null };
    const score = r => r.acc * 2 - r.avg / 10000;
    const sorted = [...rows].sort((a, b) => score(b) - score(a));
    const best = sorted[0].acc >= 0.5 ? sorted[0] : null;
    const last = sorted[sorted.length - 1];
    const focus = (sorted.length > 1 || !best) && (last.acc < 0.9 || last.avg > 5000) ? last : null;
    return { best, focus };
  }

  /** Emoji grid for sharing (Daily Galaxy) */
  shareRows() {
    return this.sectors.filter(s => s.attempts > 0).map(s => {
      const acc = s.correct / s.attempts;
      return (acc >= 0.9 ? '🟩' : acc >= 0.7 ? '🟨' : '🟥') + (s.boss ? '💥' : '');
    });
  }

  summary() {
    const skills = {};
    for (const [id, s] of Object.entries(this.skills)) {
      skills[id] = { attempts: s.attempts + s.wrong, correct: s.correct, timeouts: s.timeouts, totalMs: s.totalMs };
    }
    return {
      runId: this.run.id, kind: this.kind, title: this.run.title, victory: this.victory,
      score: this.score, sector: this.sector, kills: this.kills, bossKills: this.bossKills,
      accuracy: this.accuracy, avgMs: this.avgMs, bestStreak: this.bestStreak,
      survival: Math.round(this.survival), correct: this.correct, wrong: this.wrong, timeouts: this.timeouts,
      impacts: this.impacts, friendlyFire: this.friendlyFire, blazing: this.blazing, clutch: this.clutch,
      swarms: this.swarms, cleanBreaks: this.cleanBreaks, flawlessSectors: this.flawlessSectors,
      skills, missed: this.missed, revenantResults: this.revenantResults, timeline: this.timeline,
      perks: this.perks, shareRows: this.shareRows(), bossName: this.bossName,
    };
  }
}
