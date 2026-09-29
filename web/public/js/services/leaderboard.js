// ════════════════════════════════════════════════════════════════
//  LEADERBOARD — server API client. Fails silently offline so the game
//  stays playable from any static host.
//  Boards: 'endless' (Deep Space) · 'daily' (per UTC day) · fleet filter.
// ════════════════════════════════════════════════════════════════

const cache = new Map();   // key → entries

function key(mode, { day, fleet } = {}) { return `${mode}|${day || ''}|${fleet || ''}`; }

export const Leaderboard = {
  entries(mode = 'endless', opts = {}) { return cache.get(key(mode, opts)) || []; },

  async fetch(mode = 'endless', opts = {}) {
    const q = new URLSearchParams({ mode });
    if (opts.day) q.set('day', opts.day);
    if (opts.fleet) q.set('fleet', opts.fleet);
    try {
      const r = await fetch(`/api/leaderboard?${q}`);
      if (r.ok) cache.set(key(mode, opts), await r.json());
    } catch {}
    return this.entries(mode, opts);
  },

  async submit(summary, { name, mode, day, fleet }) {
    try {
      const r = await fetch('/api/leaderboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, fleet, mode, day, score: summary.score, sector: summary.sector,
          accuracy: summary.accuracy, bestStreak: summary.bestStreak, survival: summary.survival,
        }),
      });
      if (r.ok) cache.set(key(mode, { day }), await r.json());
    } catch {}
    return this.entries(mode, { day });
  },

  /** The entry just above `score` on a board — the rival to chase. */
  rivalAbove(entries, score) {
    let rival = null;
    for (const e of entries) if (e.score > score) rival = e; else break;
    return rival;
  },

  rankFor(entries, score) { return entries.filter(e => e.score > score).length + 1; },
};
