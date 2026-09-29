// ════════════════════════════════════════════════════════════════
//  SEEDED RANDOM — every gameplay decision (questions, spawn lanes,
//  enemy types, perk offers) goes through here, so a run is fully
//  reproducible from its seed. Needed for the Daily Galaxy today and
//  for duels / replays / server verification later.
//  Cosmetic randomness (particles, twinkle) keeps using Math.random.
// ════════════════════════════════════════════════════════════════

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

let gen = Math.random;
let currentSeed = null;

export const RNG = {
  /** Seed the generator (number or string). `null` → unseeded Math.random. */
  seed(s) {
    currentSeed = s;
    gen = s == null ? Math.random : mulberry32(typeof s === 'number' ? s : hashString(String(s)));
  },
  get seedValue() { return currentSeed; },
  random: () => gen(),
  int: (min, max) => Math.floor(gen() * (max - min + 1)) + min,
  float: (min, max) => min + gen() * (max - min),
  pick: arr => arr[Math.floor(gen() * arr.length)],
  chance: p => gen() < p,
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(gen() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
  /** Weighted pick from { key: weight } */
  weighted(map) {
    const entries = Object.entries(map).filter(([, w]) => w > 0);
    let r = gen() * entries.reduce((s, [, w]) => s + w, 0);
    for (const [k, w] of entries) if ((r -= w) <= 0) return k;
    return entries[entries.length - 1][0];
  },
};

/** UTC day key, e.g. "2026-09-27" */
export function dayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
