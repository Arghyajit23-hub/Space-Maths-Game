// ════════════════════════════════════════════════════════════════
//  BALANCE & TUNING — every gameplay number lives here.
//  Tweak these to rebalance without touching game logic.
// ════════════════════════════════════════════════════════════════

export const CONFIG = {
  // Logical canvas resolution (everything is drawn in these units)
  WIDTH: 1300,
  HEIGHT: 700,

  // ── Ship ──
  HULL_MAX: 100,
  DAMAGE_IMPACT: 34,        // threat reaches the ship (≈3 hits = destroyed)
  DAMAGE_WRONG: 8,          // wrong answer (discourages guessing, doesn't end runs)
  DAMAGE_BOSS_IMPACT: 45,
  REPAIR_STREAK_EVERY: 10,  // every N-streak a repair drone restores hull
  REPAIR_STREAK_AMOUNT: 15,
  REPAIR_SECTOR_CLEAR: 30,
  HULL_CRITICAL: 35,        // below this: alarms + red vignette

  // ── Streak multiplier tiers: [minStreak, multiplier] ──
  MULTIPLIER_TIERS: [[0, 1], [5, 2], [10, 3], [20, 4], [35, 5]],

  // ── Scoring ──
  SECTOR_SCORE_BONUS: 0.25, // +25% base points per sector past the first
  FAST_RATIO: 0.35,         // answered within 35% of the time → BLAZING bonus
  FAST_BONUS: 0.5,          // +50%
  CLUTCH_RATIO: 0.82,       // answered in the last 18% → CLUTCH bonus
  CLUTCH_BONUS: 25,
  SECTOR_CLEAR_BONUS: 500,  // × sector
  BOSS_HIT_POINTS: 60,      // per boss hit (× multiplier)

  // ── Sector structure ──
  sectorKills: sector => 8 + sector * 2,     // kills before the mothership arrives
  bossHp: sector => 3 + sector,
  // Global speed-up per sector (multiplies time limits). Floors at 0.5.
  sectorTimeFactor: sector => Math.max(0.5, 1 - (sector - 1) * 0.07),
  maxConcurrent: sector => Math.min(1 + Math.ceil(sector / 2), 4),
  // Seconds between spawns, as a fraction of the current time limit
  spawnGapFactor: sector => Math.max(0.42, 0.9 - sector * 0.08),

  // Warm-up: the very first threats of a run are slower & easier to hook players
  WARMUP_COUNT: 3,
  WARMUP_TIME_BONUS: 1.35,

  // ── Adaptive difficulty ("heat" ∈ [-1, 1]) ──
  // Keeps each player in flow: fast & accurate → faster threats, struggling → breathing room.
  HEAT: { fast: 0.09, correct: 0.03, wrong: -0.12, timeout: -0.18 },
  heatTimeFactor: heat => 1 - heat * 0.22,   // 0.78× (hot) … 1.22× (cold)

  // ── Input ──
  AUTO_FIRE: true,          // fire instantly when the typed answer is correct
  AUTO_WRONG_AT_LENGTH: true, // typing a wrong answer of full length counts as a miss

  // ── Performance ──
  MAX_PARTICLES: 450,
  MAX_DPR: 2,
};

export const SECTORS = [
  { name: 'Asteroid Belt', hue: 215, hue2: 260 },
  { name: 'Ion Nebula',    hue: 185, hue2: 290 },
  { name: 'Pulsar Fields', hue: 280, hue2: 330 },
  { name: 'Void Rift',     hue: 330, hue2: 20  },
  { name: 'Dark Star',     hue: 20,  hue2: 350 },
  { name: 'Quasar Core',   hue: 50,  hue2: 190 },
];

export function sectorInfo(n) {
  const base = SECTORS[(n - 1) % SECTORS.length];
  const loop = Math.floor((n - 1) / SECTORS.length);
  return { ...base, name: loop ? `${base.name} ${['', 'II', 'III', 'IV', 'V'][loop] || loop + 1}` : base.name };
}

export function multiplierFor(streak) {
  let m = 1;
  for (const [min, mult] of CONFIG.MULTIPLIER_TIERS) if (streak >= min) m = mult;
  return m;
}

// Progress (0..1) toward the next multiplier tier, for the HUD meter.
export function multiplierProgress(streak) {
  const tiers = CONFIG.MULTIPLIER_TIERS;
  for (let i = 0; i < tiers.length - 1; i++) {
    const [a] = tiers[i], [b] = tiers[i + 1];
    if (streak < b) return (streak - a) / (b - a);
  }
  return 1;
}
