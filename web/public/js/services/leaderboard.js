// ════════════════════════════════════════════════════════════════
//  LEADERBOARD — talks to server.js. Fails silently when offline so the
//  game stays fully playable from any static host.
//  `mode` is sent with every score so future modes / classrooms can have
//  their own boards (GET /api/leaderboard?mode=math).
// ════════════════════════════════════════════════════════════════

let entries = [];

export const Leaderboard = {
  get entries() { return entries; },

  async fetch(mode = 'math') {
    try {
      const r = await fetch(`/api/leaderboard?mode=${encodeURIComponent(mode)}`);
      if (r.ok) entries = await r.json();
    } catch {}
    return entries;
  },

  async submit(run, name) {
    try {
      const r = await fetch('/api/leaderboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, score: run.score, mode: run.mode, sector: run.sector,
          accuracy: run.accuracy, bestStreak: run.bestStreak, survival: run.survival,
        }),
      });
      if (r.ok) entries = await r.json();
    } catch {}
    return entries;
  },

  /** The entry just above `score` — the rival to chase during a run. */
  rivalAbove(score, selfName) {
    let rival = null;
    for (const e of entries) if (e.score > score) rival = e; else break;
    if (rival && rival.name === selfName && rival === entries[0]) return null;
    return rival;
  },

  rankFor(score) {
    let rank = 1;
    for (const e of entries) if (e.score > score) rank++;
    return rank;
  },
};
