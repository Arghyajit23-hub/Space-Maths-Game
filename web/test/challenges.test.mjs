// Sanity tests for every challenge generator and the seeded RNG.
// Run:  node test/challenges.test.mjs   (or `npm test`)
import { MathChallenges, LogicChallenges, MemoryChallenges, ALL_SKILLS, generateSkill } from '../public/js/challenges/index.js';
import { explain } from '../public/js/challenges/common.js';
import { RNG } from '../public/js/core/rng.js';

let failures = 0, checked = 0;
const fail = msg => { failures++; if (failures < 25) console.error('✗', msg); };

// 1. Every skill, easy and hard, many levels
for (const s of ALL_SKILLS) {
  for (const hard of [false, true]) for (const level of [1, 3, 6]) {
    for (let i = 0; i < 400; i++) {
      const c = generateSkill(s.id, { level, hard });
      checked++;
      if (c.skill !== s.id) fail(`${s.id}: wrong skill tag ${c.skill}`);
      if (!/^-?\d+$/.test(c.answer)) fail(`${s.id}: non-integer answer "${c.answer}" for ${c.prompt}`);
      if (c.check(c.answer) !== 'correct') fail(`${s.id}: check() rejects its own answer`);
      if (c.answer.length > 1 && c.check(c.answer.slice(0, -1)) !== 'partial') fail(`${s.id}: prefix not partial`);
      if (c.choice && !['1', '2'].includes(c.answer)) fail(`${s.id}: choice answer ${c.answer}`);
      if (!c.choice && s.id !== 'negative' && Number(c.answer) <= 0 && c.mode !== 'memory') fail(`${s.id}: non-positive ${c.prompt} = ${c.answer}`);
      if (Math.abs(Number(c.answer)) > 100000 && c.mode !== 'memory') fail(`${s.id}: answer too large ${c.prompt}`);
      if (c.mode === 'memory' && !(c.reveal > 1)) fail(`${s.id}: memory without reveal time`);
      if (!explain(c)) fail(`${s.id}: no explanation`);
      if (!(c.time > 0 && c.value > 0)) fail(`${s.id}: bad time/value`);
    }
  }
}

// 2. Logic correctness spot-checks
for (let i = 0; i < 2000; i++) {
  const c = LogicChallenges.generate('truefalse', { level: 4 });
  const [lhs, shown] = c.prompt.split(' = ');
  let v;
  if (lhs.includes('% of')) { const [p, n] = lhs.split('% of '); v = (Number(p) * Number(n)) / 100; }
  else if (lhs.includes('×')) { const [a, b] = lhs.split(' × ').map(Number); v = a * b; }
  else { const [a, b] = lhs.split(' + ').map(Number); v = a + b; }
  if ((v === Number(shown)) !== (c.answer === '1')) fail(`truefalse wrong: ${c.prompt} → ${c.answer}`);
}
for (let i = 0; i < 2000; i++) {
  const c = LogicChallenges.generate('compare', { level: 5 });
  const vals = c.prompt.replace('①', '').split('②').map(x => x.trim()).map(t => {
    if (t.includes('% of')) { const [p, n] = t.split('% of '); return (Number(p) * Number(n)) / 100; }
    if (t.includes('/')) { const [f, n] = t.split(' of '); const [a, b] = f.split('/').map(Number); return (a * Number(n)) / b; }
    if (t.includes('×')) { const [a, b] = t.split('×').map(Number); return a * b; }
    return Number(t);
  });
  if (vals[0] === vals[1]) fail(`compare tie: ${c.prompt}`);
  if ((vals[0] > vals[1] ? '1' : '2') !== c.answer) fail(`compare wrong: ${c.prompt} → ${c.answer}`);
}

// 3. Splitter decomposition and swarm equivalence
for (let i = 0; i < 2000; i++) {
  const c = MathChallenges.splittable({ level: 1 + (i % 6) });
  const sum = c.parts.reduce((a, p) => a + Number(p.answer), 0);
  if (sum !== Number(c.answer)) fail(`splitter parts ${c.parts.map(p => p.prompt)} ≠ ${c.prompt}`);
  const sw = MathChallenges.swarm({ level: 1 + (i % 6) });
  if (sw.length !== 3 || new Set(sw.map(x => x.answer)).size !== 1 || new Set(sw.map(x => x.prompt)).size !== 3) fail(`swarm bad: ${sw.map(x => x.prompt)}`);
  for (const x of sw) {
    const n = x.prompt.startsWith('Half') ? Number(x.prompt.split(' ').pop()) / 2
      : x.prompt.includes('×') ? x.prompt.split(' × ').map(Number).reduce((a, b) => a * b)
      : x.prompt.includes('+') ? x.prompt.split(' + ').map(Number).reduce((a, b) => a + b)
      : x.prompt.split(' − ').map(Number).reduce((a, b) => a - b);
    if (n !== Number(x.answer)) fail(`swarm expr ${x.prompt} ≠ ${x.answer}`);
  }
}

// 4. Seeded RNG determinism (Daily Galaxy fairness)
const seq = seed => { RNG.seed(seed); return Array.from({ length: 30 }, () => MathChallenges.next({ level: 3 }).prompt).join('|'); };
if (seq('daily-2026-09-27') !== seq('daily-2026-09-27')) fail('seeded runs are not reproducible');
if (seq('daily-2026-09-27') === seq('daily-2026-09-28')) fail('different days produced identical runs');
RNG.seed(null);

// 5. Mission skill filters respected
for (let lvl = 1; lvl <= 8; lvl++) for (let i = 0; i < 1000; i++) {
  const c = MathChallenges.next({ level: lvl });
  const s = ALL_SKILLS.find(k => k.id === c.skill);
  if (s.from > lvl) fail(`level ${lvl} produced locked skill ${c.skill}`);
}

console.log(failures ? `${failures} failures (${checked} generated)` : `✓ all challenge checks passed (${ALL_SKILLS.length} skills, ${checked} challenges)`);
process.exit(failures ? 1 : 0);
