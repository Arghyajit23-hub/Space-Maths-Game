// ════════════════════════════════════════════════════════════════
//  INTEL FILES — unlocked by clearing missions. Each pairs a short
//  story fragment (`intel`) with a real mental-maths trick (`body`).
// ════════════════════════════════════════════════════════════════

export const CODEX = [
  { id: 'nines', intel: 'Gunnery manual, page 9: the nine-table is the first thing every Interceptor memorises.', title: 'The Secret of Nine', from: 'Clear Debris Storm (1-2)',
    body: 'In the 9 times table the digits always add to 9: 18, 27, 36, 45… And the tens digit is one less than what you multiply by: 9 × 7 → 6_, and 6 + 3 = 9, so 63.' },
  { id: 'split', intel: 'Titan-1 debris report: it broke along clean lines, just like a product splits into easy parts.', title: 'Split & Conquer', from: 'Defeat Titan-1',
    body: 'Break a hard product into easy ones: 24 × 15 = 24 × 10 + 24 × 5 = 240 + 120 = 360. That is exactly how fracturing meteors crack.' },
  { id: 'doubling', intel: 'Ice-crust analysis: halve the crust, double the shots. The total work never changes.', title: 'Double & Halve', from: 'Clear Divide & Conquer (2-1)',
    body: 'Halve one number and double the other and the answer does not change: 16 × 25 = 8 × 50 = 4 × 100 = 400.' },
  { id: 'tenpct', intel: 'Rationing memo: Command counts munitions in ten-percent steps. So should you.', title: 'The Ten-Percent Ladder', from: 'Clear Percent Rain (2-2)',
    body: 'Find 10% by moving the decimal point one place. Halve it for 5%, and add them for 15%. So 15% of 240 = 24 + 12 = 36.' },
  { id: 'pctflip', intel: "Recovered from The Splinter's wake: a shortcut every logistics officer swears by.", title: 'The Percent Flip', from: 'Defeat The Splinter',
    body: 'x% of y equals y% of x. So 8% of 50 is the same as 50% of 8, which is 4. Always flip to the easier one.' },
  { id: 'fracof', intel: 'Shuttle manifest: three-quarters of the cargo is rounds. Divide, then multiply.', title: 'Fractions of Amounts', from: 'Clear Supply Lines (2-3)',
    body: 'Divide by the bottom, then multiply by the top. For 3/4 of 60: 60 ÷ 4 = 15, and 15 × 3 = 45.' },
  { id: 'chunk', intel: "Mira's storm notebook: how she remembered every probe code during the Blackout.", title: 'Chunking', from: 'Defeat The Ghost Rock',
    body: 'Your working memory holds about 4 chunks. Group digits into pairs or triples, like 47-29-1 instead of 4-7-2-9-1, and long codes become short.' },
  { id: 'sqrtbracket', intel: "Iron survey: Mori estimates a meteor's mass by bracketing square roots.", title: 'Bracketing Roots', from: 'Clear Square Up (4-1)',
    body: 'To find √196, bracket it: 14² = 196 because 13² = 169 is too small and 15² = 225 is too big. Squares ending in 6 have roots ending in 4 or 6.' },
  { id: 'bodmas', intel: 'Firing-computer protocol 4-2: calculations run in a strict order, or the shot misses.', title: 'Order of Operations', from: 'Clear Order Protocol (4-2)',
    body: 'Brackets first, then Orders (powers), then Division and Multiplication, then Addition and Subtraction. So 3 + 4 × 5 = 23, not 35.' },
  { id: 'negline', intel: 'Deep-cold telemetry: temperatures on iron meteors read far below zero.', title: 'The Number Line', from: 'Clear Deep Freeze (4-3)',
    body: 'Adding moves right and subtracting moves left. −7 + 10 starts at −7 and moves 10 right, landing on 3. A negative times a positive is negative.' },
  { id: 'square5', intel: "Atlas Mass post-mortem: Kade's favourite trick for squaring distances fast.", title: 'Squares Ending in 5', from: 'Defeat Atlas Mass',
    body: 'For 35²: multiply 3 by the next number up (3 × 4 = 12), then write 25 after it: 1225. It works for every number ending in 5.' },
  { id: 'differences', intel: "The Twin's orbit, decoded: real tracks leave a pattern in the gaps.", title: 'Look at the Gaps', from: 'Defeat The Twin',
    body: 'Stuck on a pattern? Write the gaps between terms: 2, 5, 10, 17 has gaps 3, 5, 7, so the next gap is 9 and the next term is 26.' },
  { id: 'estimate', intel: 'Sensor-glitch guide: a rough estimate catches a false echo before you waste a round.', title: 'Round, Then Adjust', from: 'Clear False Echoes (5-3)',
    body: '48 × 21 is about 50 × 20 = 1000. Estimating first also catches mistakes: if you calculated 10,080, you know something went wrong.' },
  { id: 'eleven', intel: "Spark's glove notes: the trick she used for her first 25-streak.", title: 'Times Eleven', from: 'Reach a 25 streak',
    body: 'For a 2-digit number × 11, add the two digits and put the sum in the middle: 23 × 11 → 2 (2+3) 3 = 253. If the sum is 10 or more, carry the 1.' },
  { id: 'divisibility', intel: "Today's Wave logs: dispatch checks every crate count for divisibility.", title: 'Divisibility Detectives', from: 'Fly 3 of Today\'s Waves',
    body: 'A number divides by 3 (or 9) if its digit sum does: 741 → 7+4+1 = 12, so it divides by 3 but not by 9. It divides by 4 if its last two digits do.' },
  { id: 'powers2', intel: 'Final report on the core: its mass halved with every wave you held.', title: 'The Doubling Ladder', from: 'Destroy the Heart of the Swarm (6-1)',
    body: '2, 4, 8, 16, 32, 64, 128, 256, 512, 1024. Knowing these by heart makes 2⁸, binary and memory sizes instant, and 2¹⁰ ≈ 1000.' },
];

export const CODEX_BY_ID = Object.fromEntries(CODEX.map(c => [c.id, c]));

// Which first-clear unlocks which card (Dreadnought cards come from mission.rewards)
export const CODEX_ON_CLEAR = { '1-2': 'nines', '2-1': 'doubling', '2-2': 'tenpct', '2-3': 'fracof', '4-1': 'sqrtbracket', '4-2': 'bodmas', '4-3': 'negline', '5-3': 'estimate' };
