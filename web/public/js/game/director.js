// ════════════════════════════════════════════════════════════════
//  DIRECTOR — difficulty & pacing.
//
//  Two layers:
//   1. Sector progression (content unlocks, global speed-up, more
//      simultaneous threats) — the "journey".
//   2. Adaptive heat ∈ [-1, 1] — nudges time limits and hard-variant
//      frequency so every player stays in the flow zone.
// ════════════════════════════════════════════════════════════════

import { CONFIG } from '../config.js';
import { pickSource } from '../challenges/index.js';

export class Director {
  constructor(mix = { math: 1 }) {
    this.mix = mix;
    this.heat = 0;
    this.issued = 0;
    this.recentSkills = [];
  }

  get warmup() { return this.issued < CONFIG.WARMUP_COUNT; }

  /** Seconds a challenge gets on the clock. */
  timeFor(challenge, sector) {
    let t = challenge.time * CONFIG.sectorTimeFactor(sector) * CONFIG.heatTimeFactor(this.heat);
    if (this.warmup) t *= CONFIG.WARMUP_TIME_BONUS;
    return Math.max(2.6, t);
  }

  nextChallenge(sector) {
    const src = pickSource(this.mix);
    const c = src.next({ sector, heat: this.heat, warmup: this.warmup, recentSkills: this.recentSkills });
    c.allowed = this.timeFor(c, sector);
    this.issued++;
    this.recentSkills.push(c.skill);
    if (this.recentSkills.length > 6) this.recentSkills.shift();
    return c;
  }

  spawnGap(sector, lastAllowed) {
    if (this.warmup) return lastAllowed * 0.95;
    return lastAllowed * CONFIG.spawnGapFactor(sector) * CONFIG.heatTimeFactor(this.heat);
  }

  maxConcurrent(sector) {
    const base = CONFIG.maxConcurrent(sector);
    if (this.warmup) return 1;
    // Struggling players get one fewer simultaneous threat
    return Math.max(1, this.heat < -0.4 ? base - 1 : base);
  }

  report(result, ratio = 1) {
    const H = CONFIG.HEAT;
    let d = 0;
    if (result === 'correct') d = ratio <= 0.45 ? H.fast : H.correct;
    else if (result === 'wrong') d = H.wrong;
    else if (result === 'timeout') d = H.timeout;
    this.heat = Math.max(-1, Math.min(1, this.heat + d));
  }
}
