// ════════════════════════════════════════════════════════════════
//  DEFENSE MAP — the six story chapters ("systems" in code), missions and
//  the run configs for The Long Watch (endless) and Today's Wave (daily).
//  Story text lives in data/story.js. See docs/FLOWMAP.md §4.
//
//  Run config {
//    id, kind: 'tutorial'|'mission'|'boss'|'endless'|'daily',
//    title, system, level, sectors (Infinity = endless),
//    sectorKills(sectorIndex) → kills before the Mothership,
//    bossHp(sectorIndex), bossName (fixed Dreadnought name or null = Nemesis),
//    skills: string[] | null (null = unlocked by level),
//    enemies(level) → { kind: weight },
//    perks, revenants, seed, rewards
//  }
// ════════════════════════════════════════════════════════════════

export const SYSTEMS = [
  { id: 'arith', name: 'First Light', zone: 'High lunar orbit', hue: 210, hue2: 255, x: 170, y: 420, requires: null,
    lore: 'The first waves cross the Moon\'s orbit. Stony meteors, simple sums, and no room for waste.' },
  { id: 'fraction', name: 'The Shattering', zone: 'Mid orbit', hue: 185, hue2: 290, x: 420, y: 230, requires: 'arith',
    lore: 'Meteors fracture in flight. Everything comes in parts: fractions, percentages, shares.' },
  { id: 'memory', name: 'Blackout', zone: 'Solar storm belt', hue: 280, hue2: 330, x: 440, y: 560, requires: 'arith',
    lore: 'A solar storm blinds the sensors. Tracking pings flicker and vanish, so remember them.' },
  { id: 'power', name: 'Heavy Iron', zone: 'Low orbit', hue: 330, hue2: 20, x: 720, y: 180, requires: 'fraction',
    lore: 'Iron-nickel giants, heavier than mountain ranges. Squares, roots and powers grow fast.' },
  { id: 'logic', name: 'Decoys', zone: 'Upper atmosphere', hue: 45, hue2: 190, x: 740, y: 520, requires: 'memory',
    lore: 'Debris clouds throw false echoes. Patterns reveal which tracks are real.' },
  { id: 'singularity', name: 'Heart of the Swarm', zone: 'The core body', hue: 0, hue2: 270, x: 1040, y: 360, requires: 'ALL', hidden: true,
    lore: 'The dense core holding the swarm together. Destroy it and every wave scatters.' },
];

const E = (o) => () => o; // fixed enemy mix helper

const M = (id, system, name, brief, level, skills, enemies, extra = {}) => ({
  id, system, name, brief, level, skills, enemies: typeof enemies === 'function' ? enemies : E(enemies),
  kind: 'mission', sectors: 2, bossName: null, bossHp: s => 4 + s + Math.floor(level / 2),
  sectorKills: s => 7 + s * 2, perks: true, revenants: true, ...extra,
});

const BOSS = (id, system, name, brief, level, skills, enemies, hp, rewards) =>
  M(id, system, name, brief, level, skills, enemies, {
    kind: 'boss', sectors: 1, bossName: name, bossHp: () => hp, sectorKills: () => 6, perks: false, rewards,
  });

export const MISSIONS = [
  // ── Arithmetic Belt ──
  M('1-0', 'arith', 'Flight School', 'Learn to fire: type the answer on a meteor.', 1, ['add', 'sub'], { rock: 1 },
    { kind: 'tutorial', sectors: 1, sectorKills: () => 5, bossHp: () => 3, perks: false, revenants: false }),
  M('1-1', 'arith', 'First Wave', 'Stony meteors over Lagos. Steady hands.', 1, ['add', 'sub'], { rock: 3, saucer: 2 }),
  M('1-2', 'arith', 'Debris Storm', 'Debris clusters share one answer. One round clears them all.', 1, ['mul_table'], { rock: 3, saucer: 2, swarm: 1.2 }),
  M('1-3', 'arith', 'Cracking Rocks', 'Fracturing meteors split into smaller sums. Hit them whole for double.', 2, ['mul_table', 'mul_2x1'], { rock: 2, splitter: 2, saucer: 1.5 }),
  BOSS('1-B', 'arith', 'Titan-1', 'The first planet-killer, built from every sum you fear.', 2,
    ['add', 'sub', 'mul_table', 'double_half', 'mul_2x1'], { rock: 2, saucer: 2, swarm: 0.8, splitter: 0.8 }, 8,
    { crew: 'rao', codex: 'split' }),

  // ── Fraction Nebula ──
  M('2-1', 'fraction', 'Divide & Conquer', 'Ice-crusted meteors need two answers.', 2, ['div_fact', 'double_half'], { rock: 2, saucer: 2, shield: 1.2 }),
  M('2-2', 'fraction', 'Percent Rain', 'Percentages fall like hail over Jakarta.', 3, ['pct'], { rock: 2, saucer: 2, swarm: 0.8 }),
  M('2-3', 'fraction', 'Supply Lines', 'Green supply shuttles are friendly. Never fire on them.', 4, ['frac_of', 'frac_add'], { saucer: 2, shield: 1, ally: 1.2 }),
  BOSS('2-B', 'fraction', 'The Splinter', 'A planet-killer that splits, slices and never stops.', 4,
    ['pct', 'frac_of', 'frac_add', 'div_fact'], { rock: 2, saucer: 2, shield: 1, ally: 0.7 }, 9,
    { crew: 'ayo', codex: 'pctflip' }),

  // ── Memory Void ──
  M('3-1', 'memory', 'Tracking Pings', 'Probes tag meteors with a code. Remember it.', 1, ['code', 'add'], { beacon: 2.5, rock: 1.5 }),
  M('3-2', 'memory', 'Dark Rocks', 'Dark meteors hide their sums after a moment.', 2, ['mul_table', 'add'], { cloaked: 3, saucer: 1 }),
  M('3-3', 'memory', 'Echo Chamber', 'Some pings echo backwards. Type them in reverse.', 3, ['code', 'code_rev', 'mul_table'], { beacon: 2.5, cloaked: 1.5, ally: 0.8 }),
  BOSS('3-B', 'memory', 'The Ghost Rock', 'A dark giant that hides from every sensor.', 3,
    ['code', 'code_rev', 'mul_table', 'sub'], { beacon: 2, cloaked: 2, ally: 0.6 }, 8,
    { crew: 'mira', codex: 'chunk' }),

  // ── Power Core ──
  M('4-1', 'power', 'Square Up', 'Iron bodies: squares and roots.', 3, ['square', 'sqrt'], { rock: 2, saucer: 2, splitter: 1 }),
  M('4-2', 'power', 'Order Protocol', 'BODMAS or bust.', 4, ['bodmas', 'missing'], { shield: 1.5, saucer: 2, ally: 0.8 }),
  M('4-3', 'power', 'Deep Freeze', 'Below zero, powers above.', 5, ['negative', 'power'], { saucer: 2, swarm: 0.8, cloaked: 1.2 }),
  BOSS('4-B', 'power', 'Atlas Mass', 'Iron so dense it doubles every time you blink.', 5,
    ['square', 'sqrt', 'bodmas', 'negative', 'power', 'missing'], { rock: 1.5, saucer: 2, shield: 1, cloaked: 0.8, splitter: 0.8 }, 10,
    { crew: 'kade', codex: 'square5' }),

  // ── Logic Expanse ──
  M('5-1', 'logic', 'Pattern Lock', 'Predict the trajectory: find the next number.', 2, ['sequence'], { rock: 2, saucer: 2 }),
  M('5-2', 'logic', 'Twin Tracks', 'One track is real. Which is bigger? Press 1 or 2.', 3, ['compare', 'sequence'], { mirror: 3, saucer: 1.5 }),
  M('5-3', 'logic', 'False Echoes', 'Spot the broken readings. Round fast.', 4, ['truefalse', 'rounding', 'mul_2x1'], { mirror: 2.5, ally: 1, splitter: 1 }),
  BOSS('5-B', 'logic', 'The Twin', 'Two bodies locked together. True is false and big is small.', 4,
    ['sequence', 'compare', 'truefalse', 'rounding'], { mirror: 2, rock: 1.5, saucer: 1.5, ally: 0.6 }, 10,
    { crew: 'vega', codex: 'differences' }),

  // ── The Singularity ──
  M('6-1', 'singularity', 'The Final Wave', 'Everything, all at once. Four waves, then the core.', 6, null,
    { rock: 1.5, saucer: 1.5, splitter: 1, swarm: 0.8, cloaked: 1, beacon: 1, shield: 1, mirror: 1, ally: 0.8 },
    { sectors: 4, bossName: 'The Heart of the Swarm', bossHp: s => 8 + s * 2, rewards: { ship: 'phantom', codex: 'powers2' } }),
];

export const MISSION = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
export const missionsOf = sys => MISSIONS.filter(m => m.system === sys && m.kind !== 'tutorial');

// Threat mix that grows with level — used by The Long Watch and Today's Wave
export function openMix(level) {
  const mix = { rock: 3, saucer: 2 };
  if (level >= 2) Object.assign(mix, { swarm: 0.7, beacon: 0.6, mirror: 0.6 });
  if (level >= 3) Object.assign(mix, { splitter: 0.9, cloaked: 0.7, shield: 0.8 });
  if (level >= 4) Object.assign(mix, { ally: 0.6 });
  return mix;
}

export function endlessRun() {
  return {
    id: 'endless', kind: 'endless', title: 'The Long Watch', system: null, level: 1, sectors: Infinity,
    sectorKills: s => 8 + s * 2, bossHp: s => 3 + s, bossName: null, skills: null, enemies: openMix,
    perks: true, revenants: true, levelPerSector: 1,
  };
}

export function dailyRun(day) {
  return {
    id: `daily-${day}`, kind: 'daily', title: `Today's Wave · ${day}`, day, system: null, level: 2, sectors: 3,
    sectorKills: s => 8 + s * 2, bossHp: s => 4 + s, bossName: null, skills: null, enemies: openMix,
    perks: true, revenants: false, levelPerSector: 1, seed: `daily-${day}`,
  };
}

export function missionRun(id) {
  const m = MISSION[id];
  return { ...m, title: m.name, levelPerSector: 0 };
}
