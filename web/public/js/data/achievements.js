// ════════════════════════════════════════════════════════════════
//  ACHIEVEMENTS — checked after every run against the run summary
//  and the lifetime profile. Each pays credits once.
// ════════════════════════════════════════════════════════════════

export const ACHIEVEMENTS = [
  { id: 'first_flight', name: 'First Flight', desc: 'Complete Flight School.', reward: 100, test: (r, p) => !!p.missions['1-0']?.cleared },
  { id: 'first_boss', name: 'Giant Slayer', desc: 'Destroy your first Mothership.', reward: 150, test: r => r.bossKills >= 1 },
  { id: 'streak10', name: 'On Fire', desc: 'Reach a 10 streak.', reward: 100, test: r => r.bestStreak >= 10 },
  { id: 'streak25', name: 'Unstoppable', desc: 'Reach a 25 streak.', reward: 250, test: r => r.bestStreak >= 25 },
  { id: 'streak50', name: 'Singular Focus', desc: 'Reach a 50 streak.', reward: 600, test: r => r.bestStreak >= 50 },
  { id: 'blazing20', name: 'Lightning Brain', desc: '20 BLAZING answers in one run.', reward: 250, test: r => r.blazing >= 20 },
  { id: 'clutch5', name: 'Nerves of Steel', desc: '5 CLUTCH saves in one run.', reward: 200, test: r => r.clutch >= 5 },
  { id: 'flawless', name: 'Untouchable', desc: 'Clear a sector without losing hull.', reward: 200, test: r => r.flawlessSectors >= 1 },
  { id: 'three_star', name: 'Perfectionist', desc: 'Earn 3 stars on a mission.', reward: 200, test: r => r.stars === 3 },
  { id: 'swarm10', name: 'Swarm Breaker', desc: 'Destroy 10 swarms (lifetime).', reward: 250, test: (r, p) => p.lifetime.swarms >= 10 },
  { id: 'clean10', name: 'Clean Breaker', desc: 'Solve 10 Splitters whole (lifetime).', reward: 250, test: (r, p) => p.lifetime.cleanBreaks >= 10 },
  { id: 'revenant10', name: 'Ghostbuster', desc: 'Vanquish 10 Revenants for good.', reward: 300, test: (r, p) => p.lifetime.vanquished >= 10 },
  { id: 'deep5min', name: 'Deep Diver', desc: 'Survive 5 minutes in Deep Space.', reward: 300, test: r => r.kind === 'endless' && r.survival >= 300 },
  { id: 'deep6', name: 'Into the Dark', desc: 'Reach sector 6 in Deep Space.', reward: 400, test: r => r.kind === 'endless' && r.sector >= 6 },
  { id: 'daily3', name: 'Creature of Habit', desc: 'Play the Daily Galaxy 3 days in a row.', reward: 300, test: (r, p) => p.daily.streak >= 3 },
  { id: 'codex8', name: 'Archivist', desc: 'Restore 8 Codex cards.', reward: 300, test: (r, p) => p.codex.length >= 8 },
  { id: 'all_crew', name: 'Full Crew', desc: 'Recruit all 5 crew members.', reward: 500, test: (r, p) => p.crew.length >= 5 },
  { id: 'new_ship', name: 'New Wings', desc: 'Buy a new ship.', reward: 100, test: (r, p) => p.ships.length >= 2 },
  { id: 'singularity', name: 'Event Horizon', desc: 'Defeat The Static.', reward: 1000, test: (r, p) => !!p.missions['6-1']?.cleared },
  { id: 'runs100', name: 'Veteran', desc: 'Fly 100 runs.', reward: 500, test: (r, p) => p.totalRuns >= 100 },
];

export const ACH = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
