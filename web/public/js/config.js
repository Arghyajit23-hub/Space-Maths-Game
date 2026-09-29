// ════════════════════════════════════════════════════════════════
//  BALANCE & TUNING — every gameplay number lives here and matches
//  docs/FLOWMAP.md. Tweak these to rebalance without touching logic.
// ════════════════════════════════════════════════════════════════

export const CONFIG = {
  WIDTH: 1300,
  HEIGHT: 700,

  // ── Ship & damage (FLOWMAP §2) ──
  HULL_MAX: 100,
  DAMAGE_IMPACT: 34,
  DAMAGE_WRONG: 8,
  DAMAGE_FRIENDLY: 12,
  DAMAGE_BOSS_IMPACT: 45,
  REPAIR_STREAK_AMOUNT: 15,
  REPAIR_SECTOR_CLEAR: 30,
  HULL_CRITICAL: 35,

  // ── Multiplier tiers: [minStreak, multiplier] ──
  MULTIPLIER_TIERS: [[0, 1], [5, 2], [10, 3], [20, 4], [35, 5]],

  // ── Scoring ──
  LEVEL_SCORE_BONUS: 0.25,
  FAST_RATIO: 0.35,
  FAST_BONUS: 0.5,
  CLUTCH_RATIO: 0.82,
  CLUTCH_BONUS: 25,
  SECTOR_CLEAR_BONUS: 500,
  BOSS_HIT_POINTS: 60,
  CLEAN_BREAK_MULT: 2,
  SWARM_MULT: 2.5,
  REVENANT_MULT: 1.5,

  // ── Threat behaviour (FLOWMAP §3) ──
  SPLIT_AT: 0.35,            // unsolved Splitters crack at this progress
  SPLIT_TIME_FACTOR: 0.75,
  CLOAK_REVEAL: 1.4,         // seconds a Cloaked problem stays readable
  SWARM_TIME_FACTOR: 1.2,
  ALLY_TIME: 9,              // seconds an ally takes to cross
  DEFER_SECONDS: 0.45,       // wait when an exact answer is also a prefix of another
  REVENANT_WAVE_AT: 0.4,     // fraction of sector-1 goal before the Revenant wave
  REVENANT_MIN: 2,

  // Global speed-up per difficulty level (multiplies time limits), floors at 0.5
  levelTimeFactor: level => Math.max(0.5, 1 - (level - 1) * 0.07),
  maxConcurrent: level => Math.min(1 + Math.ceil(level / 2), 4),
  spawnGapFactor: level => Math.max(0.42, 0.9 - level * 0.08),

  WARMUP_COUNT: 3,
  WARMUP_TIME_BONUS: 1.35,
  ASSIST_TIME_BONUS: 1.3,

  // ── Adaptive difficulty ("heat" ∈ [-1, 1]) ──
  HEAT: { fast: 0.09, correct: 0.03, wrong: -0.12, timeout: -0.18 },
  heatTimeFactor: heat => 1 - heat * 0.22,

  AUTO_WRONG_AT_LENGTH: true,

  MAX_PARTICLES: 450,
  MAX_DPR: 2,
};

export const THREAT_INFO = {
  rock:     { name: 'Asteroid' },
  saucer:   { name: 'Saucer' },
  splitter: { name: 'Splitter', tip: 'Solve it whole before it cracks for ×2!' },
  swarm:    { name: 'Swarm', tip: 'One answer destroys the whole swarm.' },
  cloaked:  { name: 'Cloaked', tip: 'Read fast — it hides its sum.' },
  beacon:   { name: 'Beacon', tip: 'Remember the code before it vanishes.' },
  shield:   { name: 'Shield bearer', tip: 'Needs two answers.' },
  mirror:   { name: 'Mirror', tip: 'Press 1 or 2.' },
  ally:     { name: 'Ally cargo', tip: 'Friendly! Do NOT answer green ships.' },
  revenant: { name: 'Revenant', tip: 'A question you missed before. Beat it now.' },
};

export function multiplierFor(streak) {
  let m = 1;
  for (const [min, mult] of CONFIG.MULTIPLIER_TIERS) if (streak >= min) m = mult;
  return m;
}

export function multiplierProgress(streak) {
  const t = CONFIG.MULTIPLIER_TIERS;
  for (let i = 0; i < t.length - 1; i++) if (streak < t[i + 1][0]) return (streak - t[i][0]) / (t[i + 1][0] - t[i][0]);
  return 1;
}
