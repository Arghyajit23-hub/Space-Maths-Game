// ════════════════════════════════════════════════════════════════
//  CHALLENGE REGISTRY
//
//  The engine never knows what a challenge *is*. The director asks this
//  registry for a challenge for a skill id; the game shows `prompt`,
//  feeds keystrokes to `check()`, and logs the result by `skill`.
//  To add a new cognitive mode: write a source with `skills` and
//  `generate(skillId, ctx)`, then add it to SOURCES below.
// ════════════════════════════════════════════════════════════════

import { MathChallenges, MATH_SKILLS } from './math.js';
import { LogicChallenges, LOGIC_SKILLS } from './logic.js';
import { MemoryChallenges, MEMORY_SKILLS } from './memory.js';

export const SOURCES = [MathChallenges, LogicChallenges, MemoryChallenges];

export const ALL_SKILLS = [...MATH_SKILLS, ...LOGIC_SKILLS, ...MEMORY_SKILLS];
export const SKILL = Object.fromEntries(ALL_SKILLS.map(s => [s.id, s]));
export const SKILL_LABELS = Object.fromEntries(ALL_SKILLS.map(s => [s.id, s.label]));

const SOURCE_OF = {};
for (const src of SOURCES) for (const s of src.skills) SOURCE_OF[s.id] = src;

export const CHOICE_SKILLS = ALL_SKILLS.filter(s => s.choice).map(s => s.id);
export const MEMORY_SKILL_IDS = MEMORY_SKILLS.map(s => s.id);

/** Skill groups shown on the Brain Map */
export const SYSTEM_GROUPS = [
  { id: 'arith', name: 'Arithmetic', hue: 205 },
  { id: 'fraction', name: 'Fractions & %', hue: 175 },
  { id: 'power', name: 'Powers & Algebra', hue: 330 },
  { id: 'memory', name: 'Memory', hue: 275 },
  { id: 'logic', name: 'Logic & Estimation', hue: 45 },
];

export function generateSkill(skillId, ctx = {}) {
  const src = SOURCE_OF[skillId];
  if (!src) throw new Error(`Unknown skill ${skillId}`);
  return src.generate(skillId, ctx);
}

export { MathChallenges, LogicChallenges, MemoryChallenges };
