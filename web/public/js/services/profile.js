// ════════════════════════════════════════════════════════════════
//  PROFILE — everything the game remembers about a pilot (localStorage).
//
//  One JSON object per pilot (`Profile.export()`), so it can later be
//  synced to a server account without changes to callers.
//  Several pilots can share a browser: each name ("WHO ARE YOU?" in the
//  opening) has its own save under `sm_pilot_<name>`, listed in the
//  roster `sm_pilots_v1`. Migrates the old single save and v1 profiles.
// ════════════════════════════════════════════════════════════════

import { store, clamp } from '../core/util.js';
import { dayKey } from '../core/rng.js';

const KEY = 'sm_profile_v2';          // old single-pilot save (migrated into the roster)
const ROSTER_KEY = 'sm_pilots_v1';     // { current, pilots: [{ key, name, last }] }
const keyOf = name => String(name).trim().toLowerCase();
const slotOf = key => `sm_pilot_${encodeURIComponent(key)}`;
const DAY = 86400000;
const REVENANT_GAPS = [0, DAY, 3 * DAY, 7 * DAY];   // box → wait before due
const REVENANT_MAX = 40;
const HISTORY_MAX = 60;

function fresh() {
  return {
    version: 2, name: '', fleet: '', createdAt: new Date().toISOString(),
    xp: 0, credits: 0,
    ships: ['interceptor'], ship: 'interceptor', trails: ['cyan'], trail: 'cyan',
    crew: [], crewOn: null,
    missions: {}, codex: [], achievements: [],
    skills: {}, history: [], revenants: [],
    lifetime: { kills: 0, bossKills: 0, swarms: 0, cleanBreaks: 0, vanquished: 0, playSeconds: 0 },
    best: { endlessScore: 0, endlessSector: 0, streak: 0, survival: 0 },
    daily: { lastDay: null, streak: 0, count: 0, official: {} },
    ghosts: {},
    totalRuns: 0,
    settings: { sound: true, voice: true, reducedMotion: false, assist: false },
    seen: {},
  };
}

const normalize = v2 => ({ ...fresh(), ...v2, settings: { ...fresh().settings, ...(v2.settings || {}) }, lifetime: { ...fresh().lifetime, ...(v2.lifetime || {}) } });

function legacy() {
  const v2 = store.get(KEY);
  if (v2) return normalize(v2);
  const p = fresh();
  const v1 = store.get('sm_profile_v1');
  if (v1) {
    p.name = v1.name || '';
    p.best.endlessScore = v1.bestScore || 0;
    p.best.endlessSector = v1.bestSector || 0;
    p.best.streak = v1.bestStreak || 0;
    p.totalRuns = v1.totalRuns || 0;
    for (const [id, s] of Object.entries(v1.skills || {})) p.skills[id] = { attempts: s.attempts, correct: s.correct, timeouts: s.timeouts || 0, totalMs: s.totalMs };
    p.history = (v1.history || []).map(h => ({ ...h, kind: 'endless' }));
    if (p.totalRuns > 0) p.missions['1-0'] = { cleared: true, stars: 1, best: 0, plays: 1 }; // veterans skip Flight School
    p.xp = Math.min(3000, Math.round((v1.totalPlaySeconds || 0) * 3));
    p.credits = Math.min(1500, p.totalRuns * 40);
  }
  return p;
}

// ── Roster: every pilot who has played in this browser ──
let roster = store.get(ROSTER_KEY);
if (!roster || !Array.isArray(roster.pilots)) {
  roster = { current: null, pilots: [] };
  const old = legacy();                       // the save from before multiple pilots
  if (old.name) {
    const key = keyOf(old.name);
    store.set(slotOf(key), old);
    roster = { current: key, pilots: [{ key, name: old.name, last: Date.now() }] };
  }
  store.set(ROSTER_KEY, roster);
}
function load(key) { const d = key && store.get(slotOf(key)); return d ? normalize(d) : null; }

let profile = load(roster.current) || fresh();
/** Unnamed profiles (before "WHO ARE YOU?") are never written. */
const save = () => {
  if (!profile.name) return;
  const key = keyOf(profile.name);
  store.set(slotOf(key), profile);
  const others = roster.pilots.filter(x => x.key !== key);
  roster = { current: key, pilots: [{ key, name: profile.name, last: Date.now() }, ...others] };
  store.set(ROSTER_KEY, roster);
};

export const Profile = {
  get: () => profile,
  save,
  export: () => JSON.parse(JSON.stringify(profile)),
  /** Erase the current pilot (Parent Zone). Other pilots are kept. */
  reset() {
    if (profile.name) {
      const key = keyOf(profile.name);
      store.remove(slotOf(key));
      roster = { current: null, pilots: roster.pilots.filter(x => x.key !== key) };
      store.set(ROSTER_KEY, roster);
    }
    profile = fresh();
  },
  isNew: () => !profile.name,

  /** Pilots saved in this browser, most recent first: [{ key, name, last }]. */
  pilots: () => roster.pilots.slice(),

  /**
   * Load the pilot with this name (any letter case), or create a new one.
   * Device settings (sound, reduced motion…) carry over to a new pilot.
   * Returns { isNew }.
   */
  switchTo(name) {
    const clean = String(name).trim().slice(0, 16);
    const found = load(keyOf(clean));
    if (found) profile = found;
    else { const settings = { ...profile.settings }; profile = fresh(); profile.name = clean; profile.settings = settings; }
    save();
    return { isNew: !found };
  },

  /** Rename the current pilot. False if another pilot already has that name. */
  rename(name) {
    const clean = String(name).trim().slice(0, 16), oldKey = keyOf(profile.name), newKey = keyOf(clean);
    if (!clean) return false;
    if (newKey !== oldKey && store.get(slotOf(newKey))) return false;
    if (newKey !== oldKey) { store.remove(slotOf(oldKey)); roster.pilots = roster.pilots.filter(x => x.key !== oldKey); }
    profile.name = clean; save();
    return true;
  },

  update(fn) { fn(profile); save(); },

  // ── Skills & mastery ─────────────────────────────
  skillStats(id) { return profile.skills[id] || { attempts: 0, correct: 0, timeouts: 0, totalMs: 0 }; },

  /** 0..1 — accuracy × speed × confidence (FLOWMAP §7) */
  mastery(id) {
    const s = profile.skills[id];
    if (!s || !s.attempts) return 0;
    const acc = s.correct / s.attempts;
    const avg = s.correct ? s.totalMs / s.correct : 99999;
    const speed = clamp(2500 / avg, 0.4, 1);
    const conf = s.attempts / (s.attempts + 6);
    return acc * speed * conf;
  },

  masteryTier(id) {
    const m = this.mastery(id), n = profile.skills[id]?.attempts || 0;
    if (m >= 0.8 && n >= 20) return 'supernova';
    if (m >= 0.55) return 'bright';
    if (m >= 0.3) return 'glowing';
    return n ? 'dim' : 'unknown';
  },

  /** Weakest practised skills among `allowed` (for the Nemesis boss). */
  weakest(allowed, n = 3) {
    return allowed
      .map(id => ({ id, m: profile.skills[id]?.attempts ? this.mastery(id) : 0.5 }))
      .sort((a, b) => a.m - b.m).slice(0, n).map(x => x.id);
  },

  // ── Revenant Fleet (spaced repetition) ───────────
  addRevenant(snap) {
    if (snap.mode === 'memory') return;               // codes are random — nothing to re-learn
    const key = `${snap.prompt}=${snap.answer}`;
    const ex = profile.revenants.find(r => r.key === key);
    if (ex) { ex.box = 0; ex.due = 0; ex.misses++; }
    else profile.revenants.push({ key, snap, box: 0, due: 0, misses: 1, added: Date.now() });
    if (profile.revenants.length > REVENANT_MAX) profile.revenants.splice(0, profile.revenants.length - REVENANT_MAX);
  },

  dueRevenants(max = 5, now = Date.now()) {
    return profile.revenants.filter(r => r.due <= now).sort((a, b) => a.due - b.due).slice(0, max);
  },

  /** Returns true if vanquished for good. */
  revenantResult(key, beaten, now = Date.now()) {
    const r = profile.revenants.find(x => x.key === key);
    if (!r) return false;
    if (!beaten) { r.box = 0; r.due = now + 60000; r.misses++; return false; }
    r.box++;
    if (r.box >= REVENANT_GAPS.length) {
      profile.revenants = profile.revenants.filter(x => x !== r);
      profile.lifetime.vanquished++;
      return true;
    }
    r.due = now + REVENANT_GAPS[r.box];
    return false;
  },

  // ── Daily ────────────────────────────────────────
  dailyPlayedToday: () => !!profile.daily.official[dayKey()],

  // ── Ghosts ───────────────────────────────────────
  ghost: runId => profile.ghosts[runId] || null,
};
