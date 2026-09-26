// Sanity tests for challenge generators.  Run:  node test/challenges.test.mjs
import { MathChallenges, MATH_SKILLS } from '../public/js/challenges/math.js';

let failures = 0;
const fail = (msg) => { failures++; if (failures < 20) console.error('✗', msg); };

for (const skill of MATH_SKILLS) {
  for (const hard of [false, true]) {
    for (const c of MathChallenges._generateAll(skill.id, hard, 2000)) {
      if (!Number.isInteger(c.answer)) fail(`${skill.id}: non-integer answer ${c.prompt} = ${c.answer}`);
      if (skill.id !== 'negative' && c.answer <= 0) fail(`${skill.id}: non-positive answer ${c.prompt} = ${c.answer}`);
      if (c.check(String(c.answer)) !== 'correct') fail(`${skill.id}: check() rejects its own answer`);
      if (c.check(String(c.answer).slice(0, -1) || '') === 'wrong') fail(`${skill.id}: prefix marked wrong`);
      if (Math.abs(c.answer) > 10000) fail(`${skill.id}: answer too large ${c.prompt}`);
    }
  }
}
for (let sector = 1; sector <= 8; sector++) {
  for (let i = 0; i < 2000; i++) {
    const c = MathChallenges.next({ sector, heat: Math.random() * 2 - 1 });
    const s = MATH_SKILLS.find(k => k.id === c.skill);
    if (s.from > sector) fail(`sector ${sector} produced locked skill ${c.skill}`);
  }
}
console.log(failures ? `${failures} failures` : `✓ all challenge checks passed (${MATH_SKILLS.length} skills)`);
process.exit(failures ? 1 : 0);
