// ════════════════════════════════════════════════════════════════
//  STORY — "The Swarm" (Earth, 2047).
//  Opening sequence, cast, chapters (one per Defense Map zone),
//  mission briefings, chapter endings and in-run radio chatter.
//  Pure data: rendered by ui/story.js, triggered from main.js.
//  A line is { who?: castId, text } — `{name}` becomes the callsign.
// ════════════════════════════════════════════════════════════════

export const CAST = {
  rao:   { name: 'Commander Aisha Rao', role: 'Interceptor Command', glyph: 'AR', color: '#ffd740' },
  mori:  { name: 'Dr. Kenji Mori', role: 'Far Side Observatory, Moon', glyph: 'KM', color: '#00e5ff' },
  spark: { name: 'Lina "Spark" Okoye', role: 'Rookie gunner, your wing', glyph: 'SP', color: '#ff4081' },
  you:   { name: 'You', role: 'Interceptor', glyph: '▲', color: '#69f0ae' },
};

// ── Opening sequence (the user's story, panel by panel) ──
export const INTRO = [
  { art: 'earth', kicker: 'YEAR 2047',
    text: 'Earth was sprinting toward the peak of its technological age. Fusion grids lit the cities, autonomous fleets crossed the skies, and humanity believed the age of existential threats was behind it.' },
  { art: 'moon', kicker: 'LUNAR FAR SIDE OBSERVATORY',
    text: 'Then the observatories on the lunar far side picked up something nobody had planned for: a swarm of meteors on a collision course with Earth, arriving in waves over months rather than in a single strike.' },
  { art: 'swarm', kicker: 'THE SWARM',
    text: 'Technology alone couldn’t stop them. Satellites were too few and automated defenses too slow, and the swarm was too unpredictable for any algorithm to handle without a human making the final call.' },
  { art: 'fleet', kicker: 'THE INTERCEPTORS',
    text: 'So the world turned to its Interceptors, an elite corps of pilots and gunners trained to meet the rocks in orbit and the upper atmosphere. They held the line wave after wave.' },
  { art: 'supply', kicker: 'THE SHORTAGE',
    text: 'But the fight outlasted the supplies. Munitions factories couldn’t keep pace, rare-earth stockpiles ran low, and every launch cost something that could not be replaced.' },
  { art: 'earth', kicker: 'NOW',
    text: 'Now the question wasn’t whether they could fight, but how to spend what little they had left. Every meteor demanded a different answer, and every wrong choice meant a city’s worth of ammunition wasted on the wrong target.' },
  { art: 'fleet', who: 'rao', kicker: 'INTERCEPTOR COMMAND',
    text: 'Welcome to the Interceptors, {name}. Your gun fires the moment you type the right answer. Spend every round like it’s the last one we have. It might be.' },
];

// ── Chapters: one per Defense Map zone (system id) ──
export const CHAPTERS = {
  arith: {
    num: 1, title: 'First Light', art: 'moon',
    open: [
      { who: 'mori', text: 'Far Side here. First wave is crossing lunar orbit now. Mostly stony bodies, the size of houses.' },
      { who: 'rao', text: 'Then we meet them in high orbit. Clean sums, clean shots. Show me what the training was for.' },
      { who: 'spark', text: 'First real launch… okay. I’ve got your wing, {name}. Don’t let me miss.' },
    ],
    end: [
      { who: 'mori', text: 'Titan-1 is breaking up over the Pacific. Every fragment is burning up. You did it.' },
      { who: 'rao', text: 'Factories report munitions down eleven percent. Celebrate tonight. Tomorrow we ration.' },
      { who: 'mori', text: 'One more thing. The next wave isn’t intact. Something is cracking the big ones apart before they reach us.' },
    ],
  },
  fraction: {
    num: 2, title: 'The Shattering', art: 'swarm',
    open: [
      { who: 'mori', text: 'Wave two is fracturing in flight. Every rock splits into parts, and every part still has a target.' },
      { who: 'rao', text: 'Think in pieces, Interceptor. Fractions, percentages, shares. And never fire on our green supply shuttles.' },
    ],
    end: [
      { who: 'mori', text: 'The Splinter is gone. And the fragments match. Same minerals, same spin. This swarm was one body once.' },
      { who: 'spark', text: 'So somewhere out there is the rest of it?' },
      { who: 'mori', text: 'Worse news first: a solar storm is about to blind every sensor we own.' },
    ],
  },
  memory: {
    num: 3, title: 'Blackout', art: 'storm',
    open: [
      { who: 'rao', text: 'Solar storm hit. Radar is down to flickers. Tracking probes can tag a rock with a code, but only for a second.' },
      { who: 'mori', text: 'Read the ping, hold it in your head, fire when it fades. Your memory is the only sensor that still works.' },
    ],
    end: [
      { who: 'rao', text: 'The Ghost Rock is dust. Sensors are coming back online.' },
      { who: 'mori', text: '…and they’re showing iron. Dense, heavy bodies. Each one weighs more than a mountain range.' },
      { who: 'rao', text: 'Supply report: we are at forty percent. From here on, a missed shot costs a city.' },
    ],
  },
  power: {
    num: 4, title: 'Heavy Iron', art: 'iron',
    open: [
      { who: 'mori', text: 'Iron-nickel giants. Mass grows fast with size. Squares, roots, powers. The numbers get big quickly.' },
      { who: 'rao', text: 'Our stockpiles are thin, {name}. I need precision, not panic. Make every round count.' },
      { who: 'spark', text: 'Precision. Got it. My hands are shaking but… got it.' },
    ],
    end: [
      { who: 'spark', text: 'Atlas Mass is down! Did you see that? We actually did it!' },
      { who: 'mori', text: 'Celebrate fast. The next wave is hiding in its own debris. Decoys everywhere. Only some of them are real.' },
    ],
  },
  logic: {
    num: 5, title: 'Decoys', art: 'swarm',
    open: [
      { who: 'mori', text: 'Debris clouds are throwing false echoes. Two tracks, one real threat. Patterns will tell you which.' },
      { who: 'rao', text: 'Wrong targets waste rounds we no longer have. Think before you shoot. Then shoot fast.' },
    ],
    end: [
      { who: 'mori', text: 'The Twin is broken. And now I can see it. A dense core body, deep in the swarm, holding every wave together with its gravity.' },
      { who: 'rao', text: 'Then that’s the target. Destroy the heart, and the swarm scatters into harmless shooting stars.' },
      { who: 'spark', text: 'One last flight, {name}. Let’s finish this.' },
    ],
  },
  singularity: {
    num: 6, title: 'Heart of the Swarm', art: 'core',
    open: [
      { who: 'rao', text: 'Every factory on Earth emptied its shelves for this launch. There will not be another one like it.' },
      { who: 'mori', text: 'Four waves stand between you and the core. Everything you’ve learned, all at once.' },
      { who: 'spark', text: 'For Lagos. For Mumbai. For everyone down there. Ready when you are.' },
    ],
    end: [
      { who: 'mori', text: 'The core is gone. The swarm is scattering. Everything left is burning up harmlessly.' },
      { who: 'spark', text: 'Look down, {name}. Every city on the night side is out on the streets, watching the sky.' },
      { who: 'rao', text: 'Biggest meteor shower in human history, and not one city lost. Earth owes you, Interceptor.' },
      { who: 'rao', text: 'But the sky is never truly empty. The Interceptors keep The Long Watch. Your post is waiting.' },
    ],
  },
};

// ── The city each mission defends (shown in briefings, debrief, deck) ──
export const CITIES = {
  '1-0': 'Lunar Gateway', '1-1': 'Lagos', '1-2': 'Mumbai', '1-3': 'São Paulo', '1-B': 'Tokyo',
  '2-1': 'Cairo', '2-2': 'Jakarta', '2-3': 'Mexico City', '2-B': 'New York',
  '3-1': 'Nairobi', '3-2': 'Seoul', '3-3': 'Istanbul', '3-B': 'London',
  '4-1': 'Kolkata', '4-2': 'Buenos Aires', '4-3': 'Manila', '4-B': 'Shanghai',
  '5-1': 'Sydney', '5-2': 'Lima', '5-3': 'Toronto', '5-B': 'Paris',
  '6-1': 'Every city on Earth',
};

// ── Mission briefings (spoken before launch) ──
export const BRIEFINGS = {
  '1-0': [{ who: 'rao', text: 'Training run near the Lunar Gateway, {name}. Type the answer on a rock and your gun fires by itself. No Enter needed.' }],
  '1-1': [{ who: 'mori', text: 'Stony meteors inbound over West Africa. Simple sums, steady hands.' }, { who: 'rao', text: 'Lagos is counting on you. Bring them down before the defense line.' }],
  '1-2': [{ who: 'mori', text: 'Debris clusters ahead. Three rocks, one shared answer.' }, { who: 'rao', text: 'One round clears a whole cluster. That’s the kind of maths I like.' }],
  '1-3': [{ who: 'mori', text: 'These ones crack apart halfway down. Solve them whole for double points.' }, { who: 'spark', text: 'And if they crack, we just solve the pieces. Right? Right.' }],
  '1-B': [{ who: 'mori', text: 'Titan-1. Our first planet-killer. It’s heading for Tokyo.' }, { who: 'rao', text: 'Every answer chips it apart and pushes it back. Do not let it reach the line.' }],
  '2-1': [{ who: 'mori', text: 'Some rocks carry an ice crust. The first answer cracks the ice, the second breaks the rock.' }],
  '2-2': [{ who: 'rao', text: 'Percentages, pilot. Jakarta is under a hailstorm of them.' }, { who: 'spark', text: 'Ten percent first, then build up. I wrote it on my glove.' }],
  '2-3': [{ who: 'rao', text: 'Green supply shuttles are crossing your lane with our last munitions. Never fire on green.' }],
  '2-B': [{ who: 'mori', text: 'The Splinter keeps dividing as it falls. Fractions, percents, everything at once.' }, { who: 'rao', text: 'New York is under it. Hold the line.' }],
  '3-1': [{ who: 'mori', text: 'Storm’s on us. Probes tag each rock with a code, then the signal drops. Remember it.' }],
  '3-2': [{ who: 'mori', text: 'Dark meteors over Seoul. They reflect almost no light. You get one look at each sum.' }],
  '3-3': [{ who: 'spark', text: 'Some pings are echoing backwards. Type those codes in reverse. Weird storm.' }],
  '3-B': [{ who: 'rao', text: 'The Ghost Rock. Our sensors barely see it. London only has you.' }],
  '4-1': [{ who: 'mori', text: 'Iron bodies. Squares and roots. Bracket the root, then commit.' }],
  '4-2': [{ who: 'rao', text: 'Order of operations, Interceptor. Brackets before bravery.' }],
  '4-3': [{ who: 'mori', text: 'Deep-cold iron. Readings below zero, powers above. Mind the signs.' }],
  '4-B': [{ who: 'mori', text: 'Atlas Mass. The heaviest object we’ve ever tracked. Shanghai is directly under its path.' }, { who: 'rao', text: 'We are low on everything, {name}. Every round has to land.' }],
  '5-1': [{ who: 'mori', text: 'Trajectories follow patterns. Find the next number and you know where it’s going.' }],
  '5-2': [{ who: 'mori', text: 'Twin tracks: one is real, one is an echo. Which is bigger? Press 1 or 2.' }],
  '5-3': [{ who: 'rao', text: 'Our sensors are glitching. Spot the false readings and round fast.' }],
  '5-B': [{ who: 'mori', text: 'The Twin. Two bodies locked together over Paris. True looks false and big looks small.' }],
  '6-1': [{ who: 'rao', text: 'This is it. Four waves, then the heart of the swarm. Everything we have left is on your ship.' }, { who: 'spark', text: 'Together, {name}. All the way.' }],
};

// ── Radio chatter during a run. Several lines per event; one is picked at random. ──
export const RADIO = {
  launch:     [{ who: 'rao', text: 'Interceptor away. Good hunting.' }, { who: 'spark', text: 'Wing is with you. Let’s go.' }, { who: 'mori', text: 'Tracking you. The wave is right on time.' }],
  cluster:    [{ who: 'mori', text: 'Debris cluster! One answer takes all three.' }],
  fracture:   [{ who: 'spark', text: 'It cracked! Two smaller sums, two shots.' }],
  shuttle:    [{ who: 'rao', text: 'Supply shuttle in your lane. Green is friendly. Hold fire!' }],
  ammoLow:    [{ who: 'rao', text: 'Munitions low. No guesses now, {name}.' }, { who: 'spark', text: 'We’re running dry! Make them count!' }],
  dry:        [{ who: 'rao', text: 'Magazine empty! Emergency feed is trickling rounds. Hold your answer.' }],
  wasted:     [{ who: 'spark', text: 'Wasted round! Breathe, then fire.' }, { who: 'rao', text: 'That was a city’s worth of ammunition. Focus.' }],
  boss:       [{ who: 'mori', text: 'Planet-killer on approach! Every hit pushes it back.' }, { who: 'rao', text: 'Big one inbound. Don’t let it touch the line.' }],
  bossHalf:   [{ who: 'mori', text: 'It’s breaking up! Half the mass is gone!' }],
  hullCrit:   [{ who: 'spark', text: 'Your hull’s smoking, {name}! Careful!' }, { who: 'rao', text: 'Hull critical. Precision over speed.' }],
  streak:     [{ who: 'spark', text: 'Ten in a row! You’re on fire!' }, { who: 'mori', text: 'Perfect intercepts. The models never predicted this.' }],
  waveClear:  [{ who: 'rao', text: 'Wave held. Supply drop incoming. Choose wisely.' }],
  returning:  [{ who: 'mori', text: 'Fragments you missed have looped around the Moon. They’re coming back.' }],
  impact:     [{ who: 'rao', text: 'Impact on the line! Get the next one.' }, { who: 'mori', text: 'One got through. Shake it off.' }],
};

/** "Day N of the Swarm": the war clock advances three days per mission cleared. */
export function swarmDay(profile) {
  const cleared = Object.values(profile.missions || {}).filter(m => m.cleared).length;
  return 1 + cleared * 3 + Math.min(profile.totalRuns || 0, 40);
}

/** Cities protected so far (missions cleared, excluding training). */
export function citiesProtected(profile) {
  return Object.entries(profile.missions || {}).filter(([id, m]) => m.cleared && id !== '1-0' && CITIES[id]).map(([id]) => CITIES[id]);
}

export const fill = (text, name) => text.replace(/\{name\}/g, name || 'Interceptor');
