// ════════════════════════════════════════════════════════════════
//  PLAYER PROFILE — local persistence (localStorage).
//
//  Holds personal bests, lifetime per-skill aggregates and a short run
//  history. This is the seed for: player progression/upgrades, daily
//  missions, and parent-facing performance reports (the per-skill
//  accuracy + response-time data is already collected here).
//  Swap `store` for a server-backed store later without touching callers.
// ════════════════════════════════════════════════════════════════

const KEY = 'sm_profile_v1';
const HISTORY_MAX = 50;

const store = {
  load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} },
};

function fresh() {
  return {
    version: 1,
    name: '',
    bestScore: 0,
    bestSector: 1,
    bestStreak: 0,
    longestSurvival: 0,       // seconds
    totalRuns: 0,
    totalPlaySeconds: 0,
    skills: {},               // skillId → { attempts, correct, timeouts, totalMs }
    history: [],              // recent run summaries (newest last)
    createdAt: new Date().toISOString(),
  };
}

let profile = { ...fresh(), ...(store.load() || {}) };

export const Profile = {
  get() { return profile; },
  setName(name) { profile.name = name; store.save(profile); },

  /** Merge a finished run (from Session.summary()) and return what improved. */
  recordRun(run) {
    const improved = {
      score: run.score > profile.bestScore,
      sector: run.sector > profile.bestSector,
      streak: run.bestStreak > profile.bestStreak,
      survival: run.survival > profile.longestSurvival,
      prevBest: profile.bestScore,
    };
    profile.bestScore = Math.max(profile.bestScore, run.score);
    profile.bestSector = Math.max(profile.bestSector, run.sector);
    profile.bestStreak = Math.max(profile.bestStreak, run.bestStreak);
    profile.longestSurvival = Math.max(profile.longestSurvival, run.survival);
    profile.totalRuns++;
    profile.totalPlaySeconds += run.survival;

    for (const [id, s] of Object.entries(run.skills)) {
      const agg = profile.skills[id] || (profile.skills[id] = { attempts: 0, correct: 0, timeouts: 0, totalMs: 0 });
      agg.attempts += s.attempts; agg.correct += s.correct; agg.timeouts += s.timeouts; agg.totalMs += s.totalMs;
    }
    profile.history.push({
      date: new Date().toISOString(), mode: run.mode, score: run.score, sector: run.sector,
      accuracy: run.accuracy, avgMs: run.avgMs, bestStreak: run.bestStreak, survival: run.survival,
    });
    if (profile.history.length > HISTORY_MAX) profile.history.splice(0, profile.history.length - HISTORY_MAX);
    store.save(profile);
    return improved;
  },

  reset() { profile = fresh(); store.save(profile); },
};
