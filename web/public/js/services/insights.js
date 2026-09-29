// ════════════════════════════════════════════════════════════════
//  INSIGHTS — Pilot DNA archetype and the Parent Zone weekly report,
//  derived only from the local profile.
// ════════════════════════════════════════════════════════════════

import { Profile } from './profile.js';
import { ALL_SKILLS, SKILL_LABELS } from '../challenges/index.js';

function practised() {
  return ALL_SKILLS.map(s => ({ ...s, stats: Profile.skillStats(s.id), m: Profile.mastery(s.id) })).filter(s => s.stats.attempts >= 3);
}

function groupAvg(rows, system) {
  const g = rows.filter(r => r.system === system);
  return g.length ? g.reduce((a, r) => a + r.m, 0) / g.length : 0;
}

/** → { archetype, tagline, strengths[], weakSpot, speed, accuracy } */
export function pilotDNA() {
  const p = Profile.get();
  const rows = practised();
  let attempts = 0, correct = 0, ms = 0;
  for (const r of rows) { attempts += r.stats.attempts; correct += r.stats.correct; ms += r.stats.totalMs; }
  const accuracy = attempts ? correct / attempts : 0;
  const avg = correct ? ms / correct : 0;
  const groups = { memory: groupAvg(rows, 'memory'), logic: groupAvg(rows, 'logic'), fraction: groupAvg(rows, 'fraction'), power: groupAvg(rows, 'power'), arith: groupAvg(rows, 'arith') };
  let archetype = 'Rising Cadet', tagline = 'Every run sharpens the mind. Keep flying.';
  if (!rows.length) return { archetype, tagline, strengths: [], weakSpot: null, accuracy: 0, avg: 0 };
  if (groups.memory >= 0.6 && groups.memory >= Math.max(groups.logic, groups.arith)) { archetype = 'Memory Ace'; tagline = 'Signals vanish — but never from your mind.'; }
  else if (groups.logic >= 0.6 && groups.logic >= groups.arith) { archetype = 'Pattern Seer'; tagline = 'You see the next move before it happens.'; }
  else if (avg && avg < 1900 && accuracy >= 0.8) { archetype = 'Lightning Calculator'; tagline = 'Answers faster than lasers can travel.'; }
  else if (accuracy >= 0.93) { archetype = 'Precision Pilot'; tagline = 'Rarely misses. Never panics.'; }
  else if (p.best.survival >= 240) { archetype = 'Iron Hull'; tagline = 'Outlasts everything the galaxy throws at you.'; }
  else if (groups.fraction >= 0.55) { archetype = 'Fraction Hunter'; tagline = 'Parts, percents, portions — all yours.'; }
  else if (accuracy >= 0.75) { archetype = 'Steady Striker'; tagline = 'Reliable under fire, getting faster every day.'; }
  const sorted = [...rows].sort((a, b) => b.m - a.m);
  return {
    archetype, tagline, accuracy, avg,
    strengths: sorted.slice(0, 3).filter(r => r.m >= 0.3).map(r => r.label),
    weakSpot: sorted.length > 1 ? sorted[sorted.length - 1].label : null,
  };
}

export function dnaShareText(name) {
  const d = pilotDNA();
  const p = Profile.get();
  return `🚀 Space Math · Pilot DNA\n${name} — ${d.archetype}\n"${d.tagline}"\n` +
    (d.strengths.length ? `Strengths: ${d.strengths.join(', ')}\n` : '') +
    `Best streak ${p.best.streak} · Deep Space best ${p.best.endlessScore.toLocaleString('en-US')}`;
}

/** Parent Zone — last 7 days vs the 7 before. */
export function weeklyReport() {
  const p = Profile.get();
  const now = Date.now(), W = 7 * 86400000;
  const inRange = (h, a, b) => { const t = Date.parse(h.date); return t > now - b && t <= now - a; };
  const week = p.history.filter(h => inRange(h, 0, W));
  const prev = p.history.filter(h => inRange(h, W, 2 * W));
  const acc = list => (list.length ? Math.round(list.reduce((a, h) => a + h.accuracy, 0) / list.length) : null);
  const speed = list => { const l = list.filter(h => h.avgMs); return l.length ? l.reduce((a, h) => a + h.avgMs, 0) / l.length : null; };
  const rows = ALL_SKILLS.map(s => ({ id: s.id, label: s.label, system: s.system, stats: Profile.skillStats(s.id), m: Profile.mastery(s.id), tier: Profile.masteryTier(s.id) }))
    .filter(r => r.stats.attempts > 0);
  const sorted = [...rows].filter(r => r.stats.attempts >= 5).sort((a, b) => a.m - b.m);
  return {
    runs: week.length,
    minutes: Math.round(week.reduce((a, h) => a + h.survival, 0) / 60),
    accuracy: acc(week), prevAccuracy: acc(prev),
    avgMs: speed(week), prevAvgMs: speed(prev),
    bestScore: week.reduce((m, h) => Math.max(m, h.score), 0),
    practise: sorted[0]?.label || null,
    strongest: sorted.at(-1)?.label || null,
    rows,
    labels: SKILL_LABELS,
  };
}
