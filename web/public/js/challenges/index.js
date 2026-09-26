// ════════════════════════════════════════════════════════════════
//  CHALLENGE REGISTRY
//
//  The game engine never knows *what* kind of challenge it is running.
//  It asks a challenge source for the next challenge, shows `prompt`,
//  feeds the player's input to `check()`, and reports the outcome.
//  New cognitive modes (memory, logic/pattern, reaction/attention) plug in
//  by registering another source — no engine changes needed.
//
//  ChallengeSource {
//    id:     'math' | 'memory' | 'logic' | 'reaction' | ...
//    label:  human-readable name
//    input:  'numeric'          (typed number — the only one the MVP UI renders)
//            'choice' | 'sequence' | 'tap'   (future input panels)
//    next(ctx) → Challenge
//        ctx = { sector, heat, warmup, recentSkills: string[] }
//  }
//
//  Challenge {
//    mode:    source id
//    skill:   stable skill id, e.g. 'mul_table' — used for stats & parent reports
//    prompt:  string shown to the player, e.g. '17 × 8'
//    answer:  canonical answer (shown on timeout — the hidden teaching moment)
//    time:    base seconds allowed (before sector / adaptive scaling)
//    value:   base points
//    maxLen:  answer length in characters (drives auto-fire / auto-miss)
//    check(input: string) → 'correct' | 'partial' | 'wrong'
//        'partial' = a prefix of the answer (keep typing)
//  }
// ════════════════════════════════════════════════════════════════

import { MathChallenges, MATH_SKILLS } from './math.js';

const sources = new Map();

export function registerSource(source) { sources.set(source.id, source); }
export function getSource(id) { return sources.get(id); }
export function listSources() { return [...sources.values()]; }

// Human labels for every skill across modes (debrief / reports)
export const SKILL_LABELS = {};
export function registerSkills(skills) {
  for (const s of skills) SKILL_LABELS[s.id] = s.label;
}

registerSource(MathChallenges);
registerSkills(MATH_SKILLS);

// A "mix" decides which sources feed a run. MVP = pure math.
// Later e.g. { math: 0.6, memory: 0.2, logic: 0.2 } for a mixed "Cognitive Gauntlet".
export function pickSource(mix = { math: 1 }) {
  const entries = Object.entries(mix).filter(([id]) => sources.has(id));
  let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of entries) { if ((r -= w) <= 0) return sources.get(id); }
  return sources.get(entries[0][0]);
}
