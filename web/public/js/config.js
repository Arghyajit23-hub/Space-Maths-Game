// ════════════════════════════════════════════════════════════════
//  BALANCE & TUNING — every gameplay number lives here and matches
//  docs/FLOWMAP.md. Tweak these to rebalance without touching logic.
// ════════════════════════════════════════════════════════════════

export const CONFIG = {
  // Design reference size. The live play-field size is VIEW.W × VIEW.H (below),
  // which follows the screen's aspect ratio instead of letterboxing.
  WIDTH: 1300,
  HEIGHT: 700,
  MIN_VIEW_W: 620,   // the play-field is never narrower than this (logical px)
  MIN_VIEW_H: 700,   // …nor shorter than this

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

// ════════════════════════════════════════════════════════════════
//  VIEW — the live, screen-adaptive play-field (logical px).
//  One logical px = VIEW.k screen px. The field keeps at least
//  MIN_VIEW_W × MIN_VIEW_H logical px and grows along whichever axis
//  the screen has spare, so it always fills the window edge-to-edge.
// ════════════════════════════════════════════════════════════════
export const VIEW = {
  W: CONFIG.WIDTH, H: CONFIG.HEIGHT, k: 1, ts: 1,
  touch: false,
  tall: false,        // portrait: numpad docks at the bottom
  narrow: false,      // compact width: HUD/menus reflow
  safe: { t: 0, r: 0, b: 0, l: 0 },
  // Play-field geometry (derived in computeView)
  shipY: CONFIG.HEIGHT - 140,
  impactY: CONFIG.HEIGHT - 198,
  fieldMinX: 150,
  fieldMaxX: CONFIG.WIDTH - 150,
  top: 110,           // below the HUD: where allies fly and the boss parks
  numpad: { w: 0, h: 0 },
};

/** Recompute VIEW for a screen of vw × vh CSS px. Returns true if the logical size changed. */
export function computeView(vw, vh, touch = VIEW.touch, safe = VIEW.safe) {
  const k = Math.min(vw / CONFIG.MIN_VIEW_W, vh / CONFIG.MIN_VIEW_H);
  const W = Math.round(vw / k), H = Math.round(vh / k);
  const changed = W !== VIEW.W || H !== VIEW.H;
  Object.assign(VIEW, { W, H, k, touch });
  VIEW.safe = { t: safe.t / k, r: safe.r / k, b: safe.b / k, l: safe.l / k };
  VIEW.narrow = W < 1000;
  // On small physical screens, canvas text (threat plates, popups) is boosted so it stays readable
  VIEW.ts = Math.min(1.35, Math.max(1, 0.8 / k));
  VIEW.tall = H > W * 1.05;
  VIEW.top = (VIEW.narrow ? 150 : 110) + VIEW.safe.t;

  // Touch numpad: bottom dock on tall screens, right-hand column otherwise
  const s = VIEW.safe;
  if (!touch) VIEW.numpad = { w: 0, h: 0, dock: 'none' };
  else if (VIEW.tall) VIEW.numpad = { w: W, h: 4 * 74 + 3 * 8 + 16, dock: 'bottom' };
  else VIEW.numpad = { w: (VIEW.narrow ? 3 * 70 + 16 : 3 * 86 + 16) + 18 + s.r, h: 0, dock: 'side' };

  const bottomReserve = VIEW.numpad.h + (VIEW.numpad.dock === 'bottom' ? 86 : 0) + s.b;
  VIEW.shipY = H - bottomReserve - (VIEW.numpad.dock === 'bottom' ? 70 : 140);
  VIEW.impactY = VIEW.shipY - 58;
  const margin = VIEW.narrow ? 90 : 150;
  VIEW.fieldMinX = margin + s.l;
  VIEW.fieldMaxX = Math.max(VIEW.fieldMinX + 200, W - (VIEW.numpad.dock === 'side' ? VIEW.numpad.w + 80 : margin) - s.r);
  return changed;
}
