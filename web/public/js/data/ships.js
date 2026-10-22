// ════════════════════════════════════════════════════════════════
//  HANGAR — ships, crew and engine trails. See docs/FLOWMAP.md §7.
// ════════════════════════════════════════════════════════════════

export const SHIPS = [
  { id: 'interceptor', name: 'Interceptor', cost: 0, color: '#00e5ff', shape: 'interceptor',
    trait: 'Balanced all-rounder.', apply: () => {} },
  { id: 'scout', name: 'Scout', cost: 600, color: '#69f0ae', shape: 'scout',
    trait: '+20% time on every threat, −15% points.', apply: m => { m.timeMult *= 1.2; m.pointsMult *= 0.85; } },
  { id: 'gunship', name: 'Gunship', cost: 1200, color: '#ff6e40', shape: 'gunship',
    trait: '+20% points, but max hull 85.', apply: m => { m.pointsMult *= 1.2; m.hullMax -= 15; } },
  { id: 'carrier', name: 'Carrier', cost: 2000, color: '#b388ff', shape: 'carrier',
    trait: 'Once per wave a drone destroys the easiest meteor (free round).', apply: m => { m.carrier = true; } },
  { id: 'phantom', name: 'Phantom', cost: null, unlock: 'Destroy the Heart of the Swarm', color: '#e040fb', shape: 'phantom',
    trait: 'Starts every run with a random perk.', apply: m => { m.phantom = true; } },
];

export const CREW = [
  { id: 'rao', name: 'Engineer Hollis', from: 'Titan-1', icon: '🔧', perk: '+10 max hull.', apply: m => { m.hullMax += 10; } },
  { id: 'ayo', name: 'Medic Ayo', from: 'The Splinter', icon: '✚', perk: 'Repair drone every 8-streak (not 10).', apply: m => { m.repairEvery = 8; } },
  { id: 'mira', name: 'Signals Officer Mira', from: 'The Ghost Rock', icon: '📜', perk: 'Tracking pings stay visible 40% longer.', apply: m => { m.revealMult *= 1.4; } },
  { id: 'kade', name: 'Gunner Kade', from: 'Atlas Mass', icon: '🎯', perk: 'Every 5th planet-killer hit deals double.', apply: m => { m.gunner = true; } },
  { id: 'vega', name: 'Navigator Vega', from: 'The Twin', icon: '🧭', perk: 'Twin tracks and patterns get +25% time.', apply: m => { m.choiceTimeMult *= 1.25; } },
];

export const TRAILS = [
  { id: 'cyan', name: 'Cyan', cost: 0, color: '#00e5ff' },
  { id: 'ember', name: 'Ember', cost: 250, color: '#ff6e40' },
  { id: 'toxic', name: 'Toxic', cost: 250, color: '#76ff03' },
  { id: 'royal', name: 'Royal', cost: 400, color: '#b388ff' },
  { id: 'gold', name: 'Gold', cost: 800, color: '#ffd740' },
];

export const SHIP = Object.fromEntries(SHIPS.map(s => [s.id, s]));
export const CREW_BY_ID = Object.fromEntries(CREW.map(c => [c.id, c]));
export const TRAIL = Object.fromEntries(TRAILS.map(t => [t.id, t]));
