// Pilot ranks by lifetime XP. See docs/FLOWMAP.md §7.

const RANKS = [
  [0, 'Cadet'], [500, 'Ensign'], [1500, 'Lieutenant'], [3000, 'Lt. Commander'], [5500, 'Commander'],
  [9000, 'Captain'], [14000, 'Commodore'], [21000, 'Rear Admiral'], [30000, 'Vice Admiral'], [42000, 'Admiral'],
];
const LEGEND_STEP = 15000;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** → { index, name, floor, next, progress } */
export function rankFor(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
  if (i === RANKS.length - 1 && xp >= RANKS[i][0] + LEGEND_STEP) {
    const lv = Math.floor((xp - RANKS[i][0]) / LEGEND_STEP);
    const floor = RANKS[i][0] + lv * LEGEND_STEP;
    return { index: i + lv, name: `Legend ${ROMAN[lv - 1] || lv}`, floor, next: floor + LEGEND_STEP, progress: (xp - floor) / LEGEND_STEP };
  }
  const floor = RANKS[i][0];
  const next = i + 1 < RANKS.length ? RANKS[i + 1][0] : floor + LEGEND_STEP;
  return { index: i, name: RANKS[i][1], floor, next, progress: (xp - floor) / (next - floor) };
}
