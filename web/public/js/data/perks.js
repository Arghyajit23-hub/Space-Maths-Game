// ════════════════════════════════════════════════════════════════
//  PERKS — roguelite upgrades drafted after each Mothership.
//  Each perk mutates the run's modifier object; the game reads mods.
//  See docs/FLOWMAP.md §5.
// ════════════════════════════════════════════════════════════════

export const PERKS = [
  { id: 'prime', name: 'Prime Hunter', icon: '◆', color: '#ffd740',
    desc: 'Prime-number answers score ×2 and repair +3 hull.', apply: m => { m.prime++; } },
  { id: 'nine', name: 'Nine Lives', icon: '⑨', color: '#69f0ae',
    desc: 'Answers that are multiples of 9 repair +4 hull.', apply: m => { m.nine++; } },
  { id: 'overclock', name: 'Overclock', icon: '⚡', color: '#00e5ff',
    desc: 'Your streak grows twice as fast. Misses cost double hull.', apply: m => { m.overclock++; } },
  { id: 'echo', name: 'Echo Cannon', icon: '◎', color: '#b388ff',
    desc: 'Even answers also destroy the next small threat.', apply: m => { m.echo++; } },
  { id: 'dilation', name: 'Time Dilation', icon: '⌛', color: '#80d8ff',
    desc: 'All threats move 12% slower.', apply: m => { m.timeMult *= 1.12; } },
  { id: 'deflector', name: 'Deflector', icon: '⛨', color: '#64ffda',
    desc: 'The first impact each sector is absorbed.', apply: m => { m.deflector++; } },
  { id: 'nano', name: 'Nano Repair', icon: '✚', color: '#69f0ae',
    desc: '+1 hull for every correct answer.', apply: m => { m.nano++; } },
  { id: 'chain', name: 'Chain Lightning', icon: 'ϟ', color: '#ffff00',
    desc: 'BLAZING answers also destroy one other threat.', apply: m => { m.chain++; } },
  { id: 'bounty', name: 'Bounty Hunter', icon: '¤', color: '#ffab40',
    desc: '+40% credits from this run.', apply: m => { m.creditsMult += 0.4; } },
  { id: 'steady', name: 'Steady Hands', icon: '✋', color: '#ea80fc',
    desc: 'One miss per sector does not break your streak.', apply: m => { m.steady++; } },
  { id: 'scanner', name: 'Scanner', icon: '◉', color: '#18ffff',
    desc: 'Cloaked and Beacon signals stay visible 0.8 s longer.', apply: m => { m.revealBonus += 0.8; } },
  { id: 'glass', name: 'Glass Cannon', icon: '✦', color: '#ff5252',
    desc: '×1.5 points, but max hull −30.', apply: m => { m.pointsMult *= 1.5; m.hullMax -= 30; } },
];

export const PERK = Object.fromEntries(PERKS.map(p => [p.id, p]));

export function baseMods() {
  return {
    hullMax: 100, timeMult: 1, pointsMult: 1, creditsMult: 1, repairEvery: 10,
    revealBonus: 0, revealMult: 1, choiceTimeMult: 1,
    prime: 0, nine: 0, overclock: 0, echo: 0, deflector: 0, nano: 0, chain: 0, steady: 0,
    carrier: false, gunner: false,
  };
}
