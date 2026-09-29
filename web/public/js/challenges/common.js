// ════════════════════════════════════════════════════════════════
//  Challenge factory — the one shape every source produces.
//
//  Challenge {
//    mode, skill       source id + stable skill id (stats, reports, revenants)
//    prompt            text on the threat, e.g. '17 × 8'
//    answer            canonical answer string typed by the player ('-5', '136', '2')
//    display           pretty answer ('−5') shown on impact — the teaching moment
//    time, value       base seconds / base points before scaling
//    hard              harder variant?
//    choice            true → answer is a single key 1 or 2 (Mirror threats)
//    label             optional short caption ('WHICH IS BIGGER?', 'TYPE THE CODE')
//    reveal            seconds the prompt stays readable (memory threats); null = always
//    parts             optional [{prompt, answer}] decomposition (Splitter threats)
//    check(input) → 'correct' | 'partial' | 'wrong'
//  }
// ════════════════════════════════════════════════════════════════

export const MINUS = '−';
export const pretty = n => (typeof n === 'number' && n < 0 ? `${MINUS}${-n}` : String(n));

export function makeChallenge({ mode, skill, prompt, answer, time, value, hard = false, choice = false, label = null, reveal = null, parts = null }) {
  const answerStr = String(answer);
  return {
    mode, skill, prompt,
    answer: answerStr,
    display: answerStr.replace(/^-/, MINUS),
    time, value: Math.round(value * (hard ? 1.25 : 1)), hard, choice, label, reveal, parts,
    check(input) {
      if (input === '') return 'partial';
      if (input === answerStr) return 'correct';
      return answerStr.startsWith(input) ? 'partial' : 'wrong';
    },
  };
}

/** Rebuild a stored snapshot (used by the Revenant Fleet). */
export function fromSnapshot(s) {
  return makeChallenge({ ...s, time: s.time || 8, value: s.value || 150 });
}

export function snapshot(c) {
  return { mode: c.mode, skill: c.skill, prompt: c.prompt, answer: c.answer, time: c.time, value: c.value, choice: c.choice, label: c.label };
}

/** Human explanation of the right answer — shown when a threat gets through. */
export function explain(c) {
  if (c.mode === 'memory') return `CODE ${c.answer.split('').join(' ')}`;
  if (c.choice && c.skill === 'truefalse') return `${c.prompt} is ${c.answer === '1' ? 'TRUE' : 'FALSE'}`;
  if (c.choice) return `${c.answer === '1' ? '①' : '②'} was bigger`;
  if (c.prompt.includes('▢')) return c.prompt.replace('▢', c.display);
  if (c.prompt.includes('≈')) return c.prompt.replace('≈ ? (nearest 100)', `≈ ${c.display}`);
  if (c.prompt.startsWith('Round')) return `${c.prompt} → ${c.display}`;
  return `${c.prompt} = ${c.display}`;
}
