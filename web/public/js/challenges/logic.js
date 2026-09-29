// ════════════════════════════════════════════════════════════════
//  LOGIC & ESTIMATION — patterns, comparisons, error-spotting, rounding.
//  `compare` and `truefalse` are CHOICE challenges (answer '1' or '2')
//  and ride on Mirror threats.
// ════════════════════════════════════════════════════════════════

import { RNG } from '../core/rng.js';
import { makeChallenge, MINUS } from './common.js';

const r = (a, b) => RNG.int(a, b);
const pick = a => RNG.pick(a);

function sequence(hard, level) {
  const kind = pick(hard || level >= 4 ? ['arith', 'geo', 'square', 'alt', 'fib', 'arith2'] : ['arith', 'arith', 'geo', 'down']);
  let seq;
  switch (kind) {
    case 'arith': { const s = r(1, 20), d = r(2, hard ? 13 : 9); seq = [0, 1, 2, 3, 4].map(i => s + d * i); break; }
    case 'down': { const d = r(2, 9), s = d * 4 + r(5, 40); seq = [0, 1, 2, 3, 4].map(i => s - d * i); break; }
    case 'geo': { const s = r(1, 5), m = pick(hard ? [2, 3, 4] : [2, 3]); seq = [0, 1, 2, 3, 4].map(i => s * m ** i); break; }
    case 'square': { const s = r(1, 6); seq = [0, 1, 2, 3, 4].map(i => (s + i) ** 2); break; }
    case 'alt': { const s = r(5, 30), a = r(4, 12), b = r(1, a - 1); seq = [s]; for (let i = 1; i < 5; i++) seq.push(seq[i - 1] + (i % 2 ? a : -b)); break; }
    case 'fib': { const a = r(1, 5), b = r(a, a + 5); seq = [a, b]; while (seq.length < 5) seq.push(seq.at(-1) + seq.at(-2)); break; }
    default: { const s = r(1, 10), d = r(1, 4); seq = [s]; for (let i = 1; i < 5; i++) seq.push(seq[i - 1] + d * i); } // growing gaps
  }
  const answer = seq.pop();
  return makeChallenge({ mode: 'logic', skill: 'sequence', prompt: `${seq.join(', ')}, ▢`, answer, time: hard ? 11 : 9, value: 180, hard });
}

function quantity(level) {
  // Returns [text, value] of something worth estimating
  switch (r(0, level >= 4 ? 3 : 1)) {
    case 0: { const a = r(12, 49), b = r(11, 29); return [`${a}×${b}`, a * b]; }
    case 1: { const a = r(3, 9), b = r(21, 99); return [`${a}×${b}`, a * b]; }
    case 2: { const p = pick([15, 25, 30, 40, 60, 75]), n = r(4, 40) * 10; return [`${p}% of ${n}`, (p * n) / 100]; }
    default: { const d = pick([4, 5, 8]), n = d * r(10, 60); return [`${r(1, d - 1)}/${d} of ${n}`, 0]; }
  }
}

function compare(hard, level) {
  let [text, v] = quantity(level);
  if (text.includes('/')) { const [f, rest] = text.split(' of '); const [n, d] = f.split('/').map(Number); v = (n * Number(rest)) / d; }
  // A round number close to the real value (never equal)
  const mag = v >= 1000 ? 100 : v >= 100 ? 10 : 5;
  let other, tries = 0;
  do { other = Math.round((v * (1 + (RNG.random() - 0.5) * (hard ? 0.16 : 0.34))) / mag) * mag; }
  while ((other === v || other <= 0) && ++tries < 12);
  if (other === v || other <= 0) other = v + (RNG.chance(0.5) || v <= mag ? mag : -mag);
  const first = RNG.chance(0.5);
  const [a, b] = first ? [text, String(other)] : [String(other), text];
  const bigger = (first ? v > other : other > v) ? '1' : '2';
  return makeChallenge({ mode: 'logic', skill: 'compare', prompt: `① ${a}   ② ${b}`, answer: bigger, time: hard ? 6 : 7, value: 150, hard, choice: true, label: 'WHICH IS BIGGER?' });
}

function truefalse(hard, level) {
  const t = r(0, level >= 3 ? 3 : 1);
  let prompt, truth;
  if (t === 0) { const a = r(3, 12), b = r(3, 12); truth = a * b; prompt = `${a} × ${b}`; }
  else if (t === 1) { const a = r(15, 89), b = r(12, 79); truth = a + b; prompt = `${a} + ${b}`; }
  else if (t === 2) { const a = r(12, 39), b = r(3, 9); truth = a * b; prompt = `${a} × ${b}`; }
  else { const p = pick([10, 20, 25, 50]), n = r(2, 30) * 20; truth = (p * n) / 100; prompt = `${p}% of ${n}`; }
  const isTrue = RNG.chance(0.5);
  let shown = truth;
  if (!isTrue) {
    const opts = [truth + 10, truth - 10, truth + 1, truth - 1, truth + (hard ? 2 : 20)];
    const s = String(truth); if (s.length >= 2) opts.push(Number(s.slice(0, -2) + s.at(-1) + s.at(-2)));
    do { shown = pick(opts); } while (shown === truth || shown < 0);
  }
  return makeChallenge({ mode: 'logic', skill: 'truefalse', prompt: `${prompt} = ${shown}`, answer: isTrue ? '1' : '2', time: hard ? 5.5 : 6.5, value: 150, hard, choice: true, label: '① TRUE   ② FALSE' });
}

function rounding(hard, level) {
  const t = r(0, hard || level >= 4 ? 2 : 1);
  if (t === 0) { const n = r(101, 989); if (n % 10 === 5) return rounding(hard, level); return makeChallenge({ mode: 'logic', skill: 'rounding', prompt: `Round ${n} to nearest 10`, answer: Math.round(n / 10) * 10, time: 6, value: 140 }); }
  if (t === 1) { const n = r(1010, 9890); if (n % 100 === 50) return rounding(hard, level); return makeChallenge({ mode: 'logic', skill: 'rounding', prompt: `Round ${n.toLocaleString('en-US')} to nearest 100`, answer: Math.round(n / 100) * 100, time: 7, value: 150 }); }
  const a = r(18, 59), b = r(11, 39), p = a * b;
  if (p % 100 === 50) return rounding(hard, level);
  return makeChallenge({ mode: 'logic', skill: 'rounding', prompt: `${a} × ${b} ≈ ? (nearest 100)`, answer: Math.round(p / 100) * 100, time: 10, value: 200, hard: true });
}

export const LOGIC_SKILLS = [
  { id: 'sequence', label: 'Number patterns', system: 'logic', from: 2, gen: sequence },
  { id: 'compare', label: 'Estimation & comparison', system: 'logic', from: 2, gen: compare, choice: true },
  { id: 'truefalse', label: 'Error spotting', system: 'logic', from: 2, gen: truefalse, choice: true },
  { id: 'rounding', label: 'Rounding', system: 'logic', from: 3, gen: rounding },
];

export const LogicChallenges = {
  id: 'logic',
  label: 'Logic & Estimation',
  skills: LOGIC_SKILLS,
  generate(skillId, { level = 3, heat = 0, hard = null } = {}) {
    const s = LOGIC_SKILLS.find(k => k.id === skillId);
    const h = hard ?? (level - s.from >= 2 ? RNG.chance(0.5 + heat * 0.3) : heat > 0.4 && RNG.chance(heat * 0.6));
    return s.gen(h, level);
  },
};

export { MINUS };
