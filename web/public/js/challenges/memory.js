// ════════════════════════════════════════════════════════════════
//  MEMORY — signal codes flashed briefly on Beacon threats.
//  `code`      type the digits you saw
//  `code_rev`  type them backwards (working-memory manipulation)
//  `reveal` tells the game how long the digits stay readable.
// ════════════════════════════════════════════════════════════════

import { RNG } from '../core/rng.js';
import { makeChallenge } from './common.js';

function digits(n) {
  const out = [RNG.int(1, 9)];
  while (out.length < n) {
    let d; do { d = RNG.int(0, 9); } while (d === out.at(-1));  // no immediate repeats
    out.push(d);
  }
  return out;
}

function codeLength(level, hard) {
  return Math.min(7, Math.max(3, 3 + Math.floor((level - 1) / 2) + (hard ? 1 : 0)));
}

function code(hard, level, reverse) {
  const n = codeLength(level, hard) - (reverse ? 1 : 0);
  const d = digits(Math.max(3, n));
  const reveal = 1.2 + 0.3 * d.length;
  return makeChallenge({
    mode: 'memory', skill: reverse ? 'code_rev' : 'code',
    prompt: d.join(' '),
    answer: (reverse ? [...d].reverse() : d).join(''),
    time: reveal + 3.2 + 0.6 * d.length,
    value: 120 + 25 * d.length + (reverse ? 60 : 0), hard,
    label: reverse ? 'TYPE IT BACKWARDS ↺' : 'TYPE THE CODE',
    reveal,
  });
}

export const MEMORY_SKILLS = [
  { id: 'code', label: 'Signal codes', system: 'memory', from: 1, gen: (h, l) => code(h, l, false) },
  { id: 'code_rev', label: 'Reverse codes', system: 'memory', from: 3, gen: (h, l) => code(h, l, true) },
];

export const MemoryChallenges = {
  id: 'memory',
  label: 'Memory',
  skills: MEMORY_SKILLS,
  generate(skillId, { level = 2, heat = 0, hard = null } = {}) {
    const s = MEMORY_SKILLS.find(k => k.id === skillId) || MEMORY_SKILLS[0];
    return s.gen(hard ?? (heat > 0.4 && RNG.chance(heat * 0.7)), level);
  },
};
