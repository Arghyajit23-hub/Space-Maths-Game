// ════════════════════════════════════════════════════════════════
//  RAPID CALCULATION — challenge source (ages 10–14 curve)
//
//  Each skill unlocks at a difficulty level (`from`). In Deep Space the
//  level rises every sector; missions pass an explicit skill list.
//  `hard` variants appear two levels after unlock or when the adaptive
//  director says the player is "hot". All answers are integers.
//  Uses the seeded RNG so Daily Galaxy runs are identical for everyone.
// ════════════════════════════════════════════════════════════════

import { RNG } from '../core/rng.js';
import { makeChallenge, MINUS, pretty } from './common.js';

const r = (a, b) => RNG.int(a, b);
const pick = arr => RNG.pick(arr);
const SUP = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸' };
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export const MATH_SKILLS = [
  { id: 'add', label: 'Addition', system: 'arith', from: 1, time: [6, 7], value: 100,
    gen(hard) { const a = hard ? r(25, 99) : r(10, 49), b = hard ? r(15, 89) : r(3, 19); return { prompt: `${a} + ${b}`, answer: a + b }; } },
  { id: 'sub', label: 'Subtraction', system: 'arith', from: 1, time: [6, 7.5], value: 100,
    gen(hard) { const a = hard ? r(45, 99) : r(12, 50); const b = hard ? r(11, a - 6) : r(3, Math.min(19, a - 2)); return { prompt: `${a} ${MINUS} ${b}`, answer: a - b }; } },
  { id: 'mul_table', label: 'Times tables', system: 'arith', from: 1, time: [5, 5.5], value: 120,
    gen(hard) { const a = hard ? r(6, 12) : r(2, 10), b = hard ? r(6, 12) : r(2, 10); return { prompt: `${a} × ${b}`, answer: a * b }; } },
  { id: 'div_fact', label: 'Division facts', system: 'fraction', from: 2, time: [6, 6.5], value: 130,
    gen(hard) { const b = hard ? r(6, 12) : r(2, 9), q = hard ? r(4, 12) : r(2, 10); return { prompt: `${b * q} ÷ ${b}`, answer: q }; } },
  { id: 'double_half', label: 'Doubles & halves', system: 'arith', from: 2, time: [5, 6], value: 110,
    gen(hard) {
      if (RNG.chance(0.5)) { const n = hard ? r(115, 495) : r(16, 99); return { prompt: `Double ${n}`, answer: n * 2 }; }
      const n = (hard ? r(56, 249) : r(12, 49)) * 2; return { prompt: `Half of ${n}`, answer: n / 2 };
    } },
  { id: 'mul_2x1', label: '2-digit × 1-digit', system: 'arith', from: 3, time: [9, 11], value: 180,
    gen(hard) { const a = hard ? r(23, 79) : r(12, 29), b = r(3, 9); return { prompt: `${a} × ${b}`, answer: a * b }; } },
  { id: 'missing', label: 'Missing numbers', system: 'power', from: 3, time: [7, 8], value: 150,
    gen(hard) {
      const t = r(0, 2);
      if (t === 0) { const a = r(3, hard ? 12 : 9), x = r(3, 12); return { prompt: `▢ × ${a} = ${a * x}`, answer: x }; }
      if (t === 1) { const x = r(12, hard ? 89 : 49), b = r(11, 60); return { prompt: `▢ + ${b} = ${x + b}`, answer: x }; }
      const a = r(40, hard ? 150 : 90), x = r(8, a - 5); return { prompt: `${a} ${MINUS} ▢ = ${a - x}`, answer: x };
    } },
  { id: 'pct', label: 'Percentages', system: 'fraction', from: 3, time: [9, 11], value: 180,
    gen(hard) {
      const p = hard ? pick([5, 15, 20, 30, 40, 75]) : pick([10, 50, 25]);
      const step = 100 / gcd(p, 100);
      const maxK = Math.max(2, Math.floor((hard ? 400 : 300) / step));
      const amount = step * r(Math.max(1, Math.ceil(20 / step)), maxK);
      return { prompt: `${p}% of ${amount}`, answer: (p * amount) / 100 };
    } },
  { id: 'square', label: 'Squares', system: 'power', from: 3, time: [6, 8], value: 150,
    gen(hard) { const n = hard ? r(11, 20) : r(2, 12); return { prompt: `${n}²`, answer: n * n }; } },
  { id: 'sqrt', label: 'Square roots', system: 'power', from: 4, time: [6, 8], value: 160,
    gen(hard) { const n = hard ? r(11, 20) : r(2, 12); return { prompt: `√${n * n}`, answer: n }; } },
  { id: 'frac_of', label: 'Fractions of amounts', system: 'fraction', from: 4, time: [9, 10], value: 190,
    gen(hard) {
      const d = hard ? pick([3, 5, 6, 8, 12]) : pick([2, 3, 4, 5, 10]);
      let nn = r(1, d - 1); while (gcd(nn, d) !== 1) nn = r(1, d - 1);
      const amount = d * r(2, hard ? 15 : 10);
      return { prompt: `${nn}/${d} of ${amount}`, answer: (nn * amount) / d };
    } },
  { id: 'bodmas', label: 'Order of operations', system: 'power', from: 4, time: [10, 12], value: 220,
    gen(hard) {
      const a = r(2, hard ? 20 : 12), b = r(2, 9), c = r(2, 9);
      switch (r(0, hard ? 3 : 1)) {
        case 0: return { prompt: `${a} + ${b} × ${c}`, answer: a + b * c };
        case 1: { const d = r(1, Math.min(a, b * c - 1)); return { prompt: `${b} × ${c} ${MINUS} ${d}`, answer: b * c - d }; }
        case 2: return { prompt: `(${a} + ${b}) × ${c}`, answer: (a + b) * c };
        default: { const q = r(2, 9); return { prompt: `${b * q} ÷ ${b} + ${a}`, answer: q + a }; }
      }
    } },
  { id: 'negative', label: 'Negative numbers', system: 'power', from: 5, time: [7, 8], value: 180,
    gen(hard) {
      switch (r(0, hard ? 2 : 1)) {
        case 0: { const a = r(2, 15), b = r(a + 1, a + 20); return { prompt: `${a} ${MINUS} ${b}`, answer: a - b }; }
        case 1: { const a = -r(3, 20), b = r(2, 25); return { prompt: `${pretty(a)} + ${b}`, answer: a + b }; }
        default: { const a = -r(2, 9), b = r(2, 9); return { prompt: `${pretty(a)} × ${b}`, answer: a * b }; }
      }
    } },
  { id: 'frac_add', label: 'Adding fractions', system: 'fraction', from: 5, time: [10, 12], value: 220,
    gen() {
      const D = pick([4, 6, 8, 10, 12]);
      const divs = [2, 3, 4, 5, 6].filter(x => D % x === 0 && x < D);
      const d1 = pick(divs), a = r(1, d1 - 1), b = r(1, D - 1);
      return { prompt: `${a}/${d1} + ${b}/${D} = ▢/${D}`, answer: a * (D / d1) + b };
    } },
  { id: 'power', label: 'Powers', system: 'power', from: 6, time: [7, 8], value: 200,
    gen() {
      const [base, e] = pick([[2, r(3, 8)], [3, r(2, 4)], [4, 3], [5, 3], [10, r(2, 4)], [r(6, 9), 2]]);
      return { prompt: `${base}${SUP[e]}`, answer: base ** e };
    } },
  { id: 'mul_2x2', label: '2-digit × 2-digit', system: 'power', from: 6, time: [14, 16], value: 260,
    gen() { const a = r(11, 25), b = r(11, 19); return { prompt: `${a} × ${b}`, answer: a * b }; } },
];

const BY_ID = Object.fromEntries(MATH_SKILLS.map(s => [s.id, s]));

function weightFor(skill, level) {
  if (skill.from > level) return 0;
  const age = level - skill.from;
  if (age === 0) return skill.from === 1 ? 1 : 2.4;   // spotlight the new skill
  if (age >= 3) return 0.55;                          // spaced review
  return 1;
}

function build(skill, hard) {
  const { prompt, answer } = skill.gen(hard);
  return makeChallenge({ mode: 'math', skill: skill.id, prompt, answer, time: skill.time[hard ? 1 : 0], value: skill.value, hard });
}

function hardFor(skill, level, heat, warmup) {
  if (warmup) return false;
  return level - skill.from >= 2 ? RNG.chance(0.55 + heat * 0.3) : heat > 0.35 && RNG.chance(heat);
}

export const MathChallenges = {
  id: 'math',
  label: 'Rapid Calculation',
  skills: MATH_SKILLS,

  /** ctx = { level, heat, warmup, skills: string[] | null, recentSkills } */
  next({ level = 1, heat = 0, warmup = false, skills = null, recentSkills = [] } = {}) {
    let pool = skills ? MATH_SKILLS.filter(s => skills.includes(s.id)) : MATH_SKILLS.filter(s => s.from <= level);
    if (!pool.length) pool = MATH_SKILLS.filter(s => s.from === 1);
    if (warmup) { const easy = pool.filter(s => s.from <= 2); if (easy.length) pool = easy; }
    const last2 = recentSkills.slice(-2);
    if (last2.length === 2 && last2[0] === last2[1]) {
      const filtered = pool.filter(s => s.id !== last2[0]);
      if (filtered.length) pool = filtered;
    }
    const weights = Object.fromEntries(pool.map(s => [s.id, skills ? 1 : weightFor(s, level)]));
    const skill = BY_ID[RNG.weighted(weights)];
    return build(skill, hardFor(skill, level, heat, warmup));
  },

  /** A specific skill (Nemesis boss, tests). */
  generate(skillId, { level = 3, heat = 0, hard = null } = {}) {
    const s = BY_ID[skillId];
    return build(s, hard ?? hardFor(s, level, heat, false));
  },

  /**
   * SPLITTER — a multiplication that can be decomposed: a × b with a ≥ 12,
   * a = 10t + u → (10t) × b and u × b.
   */
  splittable({ level = 2 } = {}) {
    let a, b;
    do { a = level >= 5 ? r(13, 39) : level >= 3 ? r(12, 29) : r(11, 19); b = level >= 4 ? r(3, 12) : r(3, 9); } while (a % 10 === 0);
    const t = a - (a % 10), u = a % 10;
    const c = makeChallenge({ mode: 'math', skill: a > 20 || b > 9 ? 'mul_2x1' : 'mul_2x1', prompt: `${a} × ${b}`, answer: a * b, time: 11, value: 200 });
    c.parts = [
      makeChallenge({ mode: 'math', skill: 'mul_table', prompt: `${t} × ${b}`, answer: t * b, time: 6, value: 90 }),
      makeChallenge({ mode: 'math', skill: 'mul_table', prompt: `${u} × ${b}`, answer: u * b, time: 5, value: 90 }),
    ];
    return c;
  },

  /** SWARM — three different expressions with one shared answer. */
  swarm({ level = 1 } = {}) {
    const N = pick(level >= 3 ? [24, 36, 48, 60, 72, 40, 30, 90, 84] : [12, 16, 18, 20, 24, 30, 36]);
    const exprs = [];
    for (let a = 2; a * a <= N; a++) if (N % a === 0 && N / a <= 12) exprs.push(RNG.chance(0.5) ? `${a} × ${N / a}` : `${N / a} × ${a}`);
    const x = r(3, N - 3); exprs.push(`${x} + ${N - x}`);
    const y = r(3, 30); exprs.push(`${N + y} ${MINUS} ${y}`);
    if (level >= 3 && N % 2 === 0) exprs.push(`Half of ${N * 2}`);
    const chosen = RNG.shuffle([...new Set(exprs)]).slice(0, 3);
    return chosen.map(p => makeChallenge({ mode: 'math', skill: p.includes('×') ? 'mul_table' : p.includes('+') ? 'add' : p.includes('Half') ? 'double_half' : 'sub', prompt: p, answer: N, time: 7, value: 100 }));
  },
};
