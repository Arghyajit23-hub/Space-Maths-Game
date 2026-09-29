// ════════════════════════════════════════════════════════════════
//  HUB SCREENS — Welcome, Command Deck, Galaxy Map, Hangar, Brain Map,
//  Codex, Records, Settings, Parent Zone. (FLOWMAP §1, §4, §7–11)
//  Each render function fills its <section> and wires its buttons to
//  the `app` controller passed in from main.js.
// ════════════════════════════════════════════════════════════════

import { $, qsa, head, stars, toast, copyText } from './dom.js';
import { fmt, esc, clock } from '../core/util.js';
import { dayKey } from '../core/rng.js';
import { Profile } from '../services/profile.js';
import { Progress } from '../services/progression.js';
import { Leaderboard } from '../services/leaderboard.js';
import { pilotDNA, dnaShareText, weeklyReport } from '../services/insights.js';
import { SYSTEMS, MISSIONS, missionsOf } from '../data/galaxy.js';
import { SHIPS, CREW, TRAILS, SHIP, CREW_BY_ID } from '../data/ships.js';
import { CODEX } from '../data/codex.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ALL_SKILLS, SYSTEM_GROUPS } from '../challenges/index.js';
import { drawShipShape } from '../game/render.js';
import { THREAT_INFO } from '../config.js';

const P = () => Profile.get();
const DPR = () => Math.min(devicePixelRatio || 1, 2);

// ── Welcome ────────────────────────────────────────
export function renderWelcome(app) {
  const el = $('welcomeScreen');
  el.innerHTML = `
    <div class="kicker">DEEP SPACE DEFENSE</div>
    <h1>SPACE MATH</h1>
    <div class="tagline">Think fast. Survive longer.</div>
    <p class="intro">The Static is erasing knowledge across the galaxy. Your mind is the ship's only weapon:
      solve, remember and reason faster than the threats can reach you.</p>
    <input id="nameInput" type="text" placeholder="PILOT CALLSIGN" maxlength="16" autocomplete="off" spellcheck="false">
    <button id="btnBegin" class="btn primary">BEGIN FLIGHT SCHOOL <kbd>Enter</kbd></button>
    <div class="keys">Takes about a minute. You can change your callsign later.</div>`;
  const input = $('nameInput');
  const go = () => {
    const name = input.value.trim().slice(0, 16);
    if (!name) { input.focus(); toast('Choose a callsign first, pilot.'); return; }
    Profile.update(p => { p.name = name; });
    app.launch('1-0');
  };
  $('btnBegin').onclick = go;
  input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  setTimeout(() => input.focus(), 50);
}

// ── Command Deck ───────────────────────────────────
function pilotBar() {
  const p = P(), r = Progress.rank();
  return `<div class="pilot-bar">
    <div class="pilot-name">${esc(p.name)}</div>
    <div class="rank"><div class="r-name">${r.name.toUpperCase()}</div>
      <div class="xpbar"><div style="width:${Math.round(r.progress * 100)}%"></div></div>
      <div class="r-next">${fmt(p.xp)} XP · next rank at ${fmt(r.next)}</div></div>
    <span class="pill gold" title="Credits">¤ ${fmt(p.credits)}</span>
    ${p.daily.streak ? `<span class="pill fire" title="Daily streak">🔥 ${p.daily.streak}</span>` : ''}
    ${p.fleet ? `<span class="pill cyan" title="Fleet code">⚑ ${esc(p.fleet)}</span>` : ''}
  </div>`;
}

export function renderDeck(app) {
  const p = P();
  const next = Progress.nextMission();
  const today = dayKey();
  const dailyDone = p.daily.official[today];
  const dna = pilotDNA();
  const due = Profile.dueRevenants(99).length;
  const starsTotal = Progress.starsTotal();
  const maxStars = MISSIONS.filter(m => m.kind !== 'tutorial').length * 3;
  const ship = SHIP[p.ship];
  const hero = next
    ? `<button class="tile glass hero" data-act="continue">
        <span class="key"><kbd>Enter</kbd></span>
        <div class="m-id">${next.kind === 'boss' ? 'DREADNOUGHT · ' : ''}MISSION ${next.id}</div>
        <div class="m-name">${esc(next.name)}</div>
        <p>${esc(next.brief)}</p>
        <div class="t-foot"><span class="pill">${SYSTEMS.find(s => s.id === next.system).name}</span><span class="pill">Level ${next.level}</span><span class="pill">${next.sectors} sector${next.sectors > 1 ? 's' : ''}</span></div>
        <div class="muted" style="font:700 10px var(--orb);letter-spacing:3px;margin-top:16px">THREATS</div>
        <div class="t-foot" style="margin-top:6px">${Object.keys(next.enemies(next.level)).map(k => `<span class="pill">${THREAT_INFO[k].name}</span>`).join('')}</div>
        ${next.rewards ? `<div class="muted" style="font:700 10px var(--orb);letter-spacing:3px;margin-top:14px">REWARD</div><div class="t-foot" style="margin-top:6px">${next.rewards.crew ? `<span class="pill gold">Crew: ${CREW_BY_ID[next.rewards.crew].name}</span>` : ''}${next.rewards.ship ? '<span class="pill gold">Ship: Phantom</span>' : ''}<span class="pill gold">Codex card</span></div>` : ''}
        <div class="t-foot" style="margin-top:auto"><span class="btn primary small">LAUNCH ▸</span><span class="muted">${p.missions[next.id]?.plays ? `${p.missions[next.id].plays} attempt${p.missions[next.id].plays > 1 ? 's' : ''}` : ''}</span></div>
      </button>`
    : `<button class="tile glass hero" data-act="endless">
        <span class="key"><kbd>Enter</kbd></span>
        <div class="m-id">GALAXY COMPLETE</div><div class="m-name">Deep Space awaits</div>
        <p>Every system is clear. How far can you survive in the endless dark?</p>
        <div class="t-foot" style="margin-top:14px"><span class="btn primary small">LAUNCH ▸</span></div></button>`;

  $('deckScreen').innerHTML = `
    <div class="hub-head">${pilotBar()}<div class="spacer"></div></div>
    <div class="deck-grid">
      ${hero}
      <button class="tile glass daily" data-act="daily"><span class="key"><kbd>D</kbd></span>
        <div class="t-icon">🌍</div><h3>DAILY GALAXY</h3>
        <p>${dailyDone ? `Today: ${fmt(dailyDone.score)} ${dailyDone.rows.join('')}` : 'Same galaxy for every pilot today. First run counts.'}</p>
        <div class="t-foot">${dailyDone ? '<span class="pill">Practice mode</span>' : '<span class="badge-new">NEW TODAY</span>'}${p.daily.streak ? `<span class="pill fire">🔥 ${p.daily.streak}</span>` : ''}</div></button>
      <button class="tile glass deep" data-act="endless"><span class="key"><kbd>E</kbd></span>
        <div class="t-icon">🌌</div><h3>DEEP SPACE</h3>
        <p>Endless. Perks every sector. Global leaderboard.</p>
        <div class="t-foot"><span class="pill gold">Best ${fmt(p.best.endlessScore)}</span>${p.best.endlessSector ? `<span class="pill">Sector ${p.best.endlessSector}</span>` : ''}</div></button>
      <button class="tile glass" data-nav="galaxy"><span class="key"><kbd>G</kbd></span>
        <div class="t-icon">🪐</div><h3>GALAXY MAP</h3>
        <p>${SYSTEMS.filter(s => Progress.systemUnlocked(s.id)).length} of ${SYSTEMS.length} systems reached.</p>
        <div class="t-foot"><span class="stars">★</span> ${starsTotal} / ${maxStars}</div></button>
      <button class="tile glass" data-nav="hangar"><span class="key"><kbd>H</kbd></span>
        <div class="t-icon">🛠️</div><h3>HANGAR</h3>
        <p>${ship.name}${p.crewOn ? ` · ${CREW_BY_ID[p.crewOn].name}` : ''}</p>
        <div class="t-foot"><span class="pill gold">¤ ${fmt(p.credits)}</span></div></button>
      <button class="tile glass" data-nav="brain"><span class="key"><kbd>B</kbd></span>
        <div class="t-icon">🧠</div><h3>BRAIN MAP</h3>
        <p>Pilot DNA: <b>${dna.archetype}</b></p>
        <div class="t-foot"><span class="pill">${ALL_SKILLS.filter(s => Profile.masteryTier(s.id) === 'supernova').length} supernova skills</span></div></button>
      <button class="tile glass" data-nav="codex"><span class="key"><kbd>C</kbd></span>
        <div class="t-icon">📜</div><h3>CODEX</h3>
        <p>Restored archive cards — the tricks behind the maths.</p>
        <div class="t-foot"><span class="pill">${p.codex.length} / ${CODEX.length}</span></div></button>
      <button class="tile glass" data-nav="records"><span class="key"><kbd>R</kbd></span>
        <div class="t-icon">🏆</div><h3>RECORDS</h3>
        <p>Leaderboards, fleet, achievements.</p>
        <div class="t-foot"><span class="pill">${p.achievements.length} / ${ACHIEVEMENTS.length} medals</span></div></button>
      <button class="tile glass" data-nav="settings"><div class="t-icon">⚙️</div><h3>SETTINGS</h3>
        <p>Sound, motion, Assist mode, callsign.</p></button>
      <button class="tile glass" data-nav="parent"><div class="t-icon">👪</div><h3>PARENT ZONE</h3>
        <p>Weekly progress report and skill breakdown.</p></button>
      <div class="tile glass" style="cursor:default"><div class="t-icon">👻</div><h3>REVENANT FLEET</h3>
        <p>${due ? `${due} past mistake${due > 1 ? 's' : ''} will ambush your next run.` : `${p.revenants.length} tracked · ${p.lifetime.vanquished} vanquished for good.`}</p>
        <div class="t-foot"><span class="pill">Spaced repetition</span></div></div>
    </div>`;
  wire($('deckScreen'), app);
}

// ── Galaxy map ─────────────────────────────────────
let selectedSystem = null;
const pos = s => ({ left: (s.x / 1200) * 100, top: ((s.y - 100) / 560) * 100 });

export function renderGalaxy(app, sysId) {
  const p = P();
  selectedSystem = sysId || selectedSystem || (Progress.nextMission()?.system) || 'arith';
  if (selectedSystem === 'singularity' && !Progress.systemUnlocked('singularity')) selectedSystem = 'arith';
  const edges = SYSTEMS.filter(s => s.requires && s.requires !== 'ALL').map(s => [SYSTEMS.find(x => x.id === s.requires), s])
    .concat([['power', 'singularity'], ['logic', 'singularity']].map(([a, b]) => [SYSTEMS.find(x => x.id === a), SYSTEMS.find(x => x.id === b)]));
  const lines = edges.map(([a, b]) => {
    const A = pos(a), B = pos(b), open = Progress.systemUnlocked(b.id);
    return `<line x1="${A.left}%" y1="${A.top}%" x2="${B.left}%" y2="${B.top}%" stroke="${open ? 'rgba(0,229,255,.5)' : 'rgba(255,255,255,.12)'}" stroke-width="2" stroke-dasharray="${open ? '0' : '6 8'}"/>`;
  }).join('');
  const nodes = SYSTEMS.map(s => {
    const open = Progress.systemUnlocked(s.id), hidden = s.hidden && !open;
    const ms = MISSIONS.filter(m => m.system === s.id && m.kind !== 'tutorial');
    const got = ms.reduce((a, m) => a + (p.missions[m.id]?.stars || 0), 0);
    const P2 = pos(s);
    return `<button class="sys-node ${open ? '' : 'locked'} ${s.id === selectedSystem ? 'sel' : ''}" data-sys="${s.id}" style="left:${P2.left}%;top:${P2.top}%">
      <div class="sys-orb" style="--glow:hsla(${s.hue},90%,55%,.45);background:radial-gradient(circle at 35% 30%, hsl(${s.hue},80%,70%), hsl(${s.hue2},70%,30%) 60%, hsl(${s.hue2},60%,10%))"></div>
      <div class="sys-name">${hidden ? '? ? ?' : s.name}</div>
      <div class="sys-stars">${open ? `★ ${got}/${ms.length * 3}` : '🔒'}</div></button>`;
  }).join('');

  const sys = SYSTEMS.find(s => s.id === selectedSystem);
  const open = Progress.systemUnlocked(sys.id);
  const req = sys.requires === 'ALL' ? 'Beat all five Dreadnoughts, or reach a 50 streak.' : sys.requires ? `Defeat the Dreadnought of ${SYSTEMS.find(s => s.id === sys.requires).name}.` : '';
  const missions = missionsOf(sys.id).map(m => {
    const rec = p.missions[m.id], unlocked = Progress.missionUnlocked(m.id);
    return `<button class="mission ${m.kind === 'boss' ? 'boss' : ''} ${unlocked ? '' : 'locked'}" ${unlocked ? `data-launch="${m.id}"` : ''}>
      <span class="mid">${m.id}</span>
      <span><div class="mname">${esc(m.name)}</div><div class="mbrief">${esc(m.brief)}</div></span>
      <span class="mright">${unlocked ? stars(rec?.stars || 0) : '🔒'}<div class="muted">${rec?.best ? fmt(rec.best) : ''}</div></span></button>`;
  }).join('');

  $('galaxyScreen').innerHTML = `${head('GALAXY MAP', 'Choose a system, then a mission', `<span class="pill gold">★ ${Progress.starsTotal()}</span>`)}
    <div class="galaxy-wrap">
      <div class="galaxy-map glass"><svg>${lines}</svg>${nodes}</div>
      <div class="sys-panel glass">
        <h3 style="color:hsl(${sys.hue},90%,70%)">${sys.hidden && !open ? '? ? ?' : sys.name.toUpperCase()}</h3>
        <div class="lore">${open || !sys.hidden ? esc(sys.lore) : 'Something stirs beyond the known systems…'}</div>
        ${open ? `<div class="mission-list scroll">${missions}</div>` : `<div class="unlock">🔒 ${req}</div>`}
      </div>
    </div>`;
  qsa('[data-sys]', $('galaxyScreen')).forEach(b => b.onclick = () => renderGalaxy(app, b.dataset.sys));
  wire($('galaxyScreen'), app);
}

// ── Hangar ─────────────────────────────────────────
let hangarTab = 'ships';
export function renderHangar(app, tab) {
  hangarTab = tab || hangarTab;
  const p = P();
  let cards = '';
  if (hangarTab === 'ships') {
    cards = SHIPS.map(s => {
      const owned = p.ships.includes(s.id), on = p.ship === s.id;
      const action = on ? '<button class="btn ghost small" disabled>EQUIPPED</button>'
        : owned ? `<button class="btn primary small" data-equip-ship="${s.id}">EQUIP</button>`
        : s.cost == null ? `<button class="btn ghost small" disabled>🔒 ${s.unlock}</button>`
        : `<button class="btn primary small" data-buy-ship="${s.id}" ${p.credits < s.cost ? 'disabled' : ''}>BUY ¤ ${fmt(s.cost)}</button>`;
      return `<div class="item glass ${on ? 'equipped' : ''} ${!owned && s.cost == null ? 'locked' : ''}"><canvas data-ship="${s.id}"></canvas><h4>${s.name}</h4><p>${s.trait}</p>${action}</div>`;
    }).join('');
  } else if (hangarTab === 'crew') {
    cards = CREW.map(c => {
      const owned = p.crew.includes(c.id), on = p.crewOn === c.id;
      const action = !owned ? `<button class="btn ghost small" disabled>🔒 Defeat ${c.from}</button>`
        : on ? `<button class="btn ghost small" data-crew-off="1">ON DUTY ✓</button>`
        : `<button class="btn primary small" data-crew="${c.id}">ASSIGN</button>`;
      return `<div class="item glass ${on ? 'equipped' : ''} ${owned ? '' : 'locked'}"><div class="crew-icon">${owned ? c.icon : '❔'}</div><h4>${owned ? c.name : 'Unknown crew'}</h4><p>${c.perk}</p>${action}</div>`;
    }).join('');
  } else {
    cards = TRAILS.map(t => {
      const owned = p.trails.includes(t.id), on = p.trail === t.id;
      const action = on ? '<button class="btn ghost small" disabled>EQUIPPED</button>'
        : owned ? `<button class="btn primary small" data-equip-trail="${t.id}">EQUIP</button>`
        : `<button class="btn primary small" data-buy-trail="${t.id}" ${p.credits < t.cost ? 'disabled' : ''}>BUY ¤ ${fmt(t.cost)}</button>`;
      return `<div class="item glass ${on ? 'equipped' : ''}"><div class="swatch" style="background:linear-gradient(180deg,#fff,${t.color} 30%,transparent)"></div><h4>${t.name}</h4><p>Engine trail colour.</p>${action}</div>`;
    }).join('');
  }
  $('hangarScreen').innerHTML = `${head('HANGAR', 'Ships change how you play. Crew are earned from Dreadnoughts.', `<span class="pill gold">¤ ${fmt(p.credits)}</span>`)}
    <div class="tabs" style="margin-bottom:14px">${['ships', 'crew', 'trails'].map(t => `<button class="tab ${t === hangarTab ? 'on' : ''}" data-tab="${t}">${t.toUpperCase()}</button>`).join('')}</div>
    <div class="card-grid">${cards}</div>`;
  const root = $('hangarScreen');
  qsa('[data-tab]', root).forEach(b => b.onclick = () => renderHangar(app, b.dataset.tab));
  qsa('canvas[data-ship]', root).forEach(cv => {
    const s = SHIP[cv.dataset.ship], w = 210, h = 110, d = DPR();
    cv.width = w * d; cv.height = h * d;
    const c = cv.getContext('2d'); c.scale(d, d); c.translate(w / 2, h / 2 - 6); c.scale(1.2, 1.2);
    drawShipShape(c, s.shape, s.color, TRAILS.find(t => t.id === p.trail)?.color || s.color, 1, 0, true);
  });
  const buy = (cost, fn, what) => {
    if (p.credits < cost) return toast('Not enough credits yet.');
    Profile.update(pp => { pp.credits -= cost; fn(pp); });
    app.sound('record'); toast(`${what} acquired!`);
    app.checkAchievements();
    renderHangar(app);
  };
  qsa('[data-buy-ship]', root).forEach(b => b.onclick = () => { const s = SHIP[b.dataset.buyShip]; buy(s.cost, pp => { pp.ships.push(s.id); pp.ship = s.id; }, s.name); });
  qsa('[data-equip-ship]', root).forEach(b => b.onclick = () => { Profile.update(pp => { pp.ship = b.dataset.equipShip; }); app.sound('click'); renderHangar(app); });
  qsa('[data-crew]', root).forEach(b => b.onclick = () => { Profile.update(pp => { pp.crewOn = b.dataset.crew; }); app.sound('click'); renderHangar(app); });
  qsa('[data-crew-off]', root).forEach(b => b.onclick = () => { Profile.update(pp => { pp.crewOn = null; }); app.sound('click'); renderHangar(app); });
  qsa('[data-buy-trail]', root).forEach(b => b.onclick = () => { const t = TRAILS.find(x => x.id === b.dataset.buyTrail); buy(t.cost, pp => { pp.trails.push(t.id); pp.trail = t.id; }, `${t.name} trail`); });
  qsa('[data-equip-trail]', root).forEach(b => b.onclick = () => { Profile.update(pp => { pp.trail = b.dataset.equipTrail; }); app.sound('click'); renderHangar(app); });
  wire(root, app);
}

// ── Brain map ──────────────────────────────────────
const TIER = { unknown: ['rgba(255,255,255,.12)', 3, 'Not tried'], dim: ['#5c6bc0', 5, 'Dim'], glowing: ['#4fc3f7', 7, 'Glowing'], bright: ['#69f0ae', 9, 'Bright'], supernova: ['#ffd740', 12, 'Supernova'] };

export function renderBrain(app) {
  const p = P();
  const dna = pilotDNA();
  $('brainScreen').innerHTML = `${head('BRAIN MAP', 'Every star is a skill. Practice makes it shine.')}
    <div class="brain-wrap">
      <div class="brain-canvas glass"><canvas id="brainCanvas"></canvas></div>
      <div class="dna glass">
        <div class="muted" style="font:700 11px var(--orb);letter-spacing:3px">PILOT DNA</div>
        <div class="arch">${dna.archetype}</div>
        <div class="muted" style="font-style:italic">“${dna.tagline}”</div>
        <div class="row"><span>Lifetime accuracy</span><b>${dna.accuracy ? Math.round(dna.accuracy * 100) + '%' : '–'}</b></div>
        <div class="row"><span>Average answer</span><b>${dna.avg ? (dna.avg / 1000).toFixed(1) + 's' : '–'}</b></div>
        <div class="row"><span>Strengths</span><b>${dna.strengths.join(', ') || '–'}</b></div>
        <div class="row"><span>Weak spot</span><b>${dna.weakSpot || '–'}</b></div>
        <div class="row"><span>Best streak</span><b>${p.best.streak}</b></div>
        <div class="row"><span>Revenants vanquished</span><b>${p.lifetime.vanquished}</b></div>
        <div class="legend">${Object.entries(TIER).map(([, [c, , n]]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>
        <button class="btn primary small" id="btnShareDNA" style="margin-top:auto">COPY PILOT DNA CARD</button>
      </div>
    </div>`;
  $('btnShareDNA').onclick = async () => toast((await copyText(dnaShareText(p.name))) ? 'Pilot DNA copied — paste it anywhere!' : 'Could not copy.');
  wire($('brainScreen'), app);
  requestAnimationFrame(drawBrain);
}

function drawBrain() {
  const cv = $('brainCanvas'); if (!cv) return;
  const r = cv.getBoundingClientRect(), d = DPR();
  const W = cv.parentElement.clientWidth, H = cv.parentElement.clientHeight;
  cv.width = W * d; cv.height = H * d;
  const c = cv.getContext('2d'); c.scale(d, d);
  const centers = { arith: [0.2, 0.29], fraction: [0.5, 0.25], power: [0.81, 0.33], memory: [0.25, 0.76], logic: [0.66, 0.76] };
  for (const g of SYSTEM_GROUPS) {
    const [cx, cy] = centers[g.id];
    const skills = ALL_SKILLS.filter(s => s.system === g.id);
    const R = H * (0.09 + 0.012 * skills.length);
    const pts = skills.map((s, i) => {
      const a = (i / skills.length) * 6.283 - 1.57 + (skills.length === 2 ? 1.57 : 0);
      return [cx * W + Math.cos(a) * R * 1.25, cy * H + Math.sin(a) * R, s];
    });
    const grd = c.createRadialGradient(cx * W, cy * H, 0, cx * W, cy * H, R * 2);
    grd.addColorStop(0, `hsla(${g.hue},80%,50%,.13)`); grd.addColorStop(1, 'transparent');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
    c.strokeStyle = `hsla(${g.hue},80%,70%,.25)`; c.lineWidth = 1;
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.stroke();
    c.textAlign = 'center';
    c.font = "700 11px 'Orbitron', sans-serif"; c.fillStyle = `hsl(${g.hue},80%,75%)`; c.fillText(g.name.toUpperCase(), cx * W, cy * H + 4);
    for (const [x, y, s] of pts) {
      const tier = Profile.masteryTier(s.id);
      const [col, size] = TIER[tier];
      if (tier !== 'unknown') {
        const halo = c.createRadialGradient(x, y, 0, x, y, size * 3);
        halo.addColorStop(0, col); halo.addColorStop(1, 'transparent');
        c.globalAlpha = 0.5; c.fillStyle = halo; c.beginPath(); c.arc(x, y, size * 3, 0, 6.283); c.fill(); c.globalAlpha = 1;
      }
      c.fillStyle = col; c.beginPath(); c.arc(x, y, size / 2 + 1, 0, 6.283); c.fill();
      const above = y < cy * H - 2;
      const ly = above ? y - size - 16 : y + size + 13;
      c.font = "11px 'Share Tech Mono', monospace"; c.fillStyle = tier === 'unknown' ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.85)';
      c.fillText(s.label, x, ly);
      const m = Profile.mastery(s.id);
      if (m > 0) { c.fillStyle = 'rgba(255,255,255,.45)'; c.fillText(`${Math.round(m * 100)}%`, x, ly + 12); }
    }
  }
}

// ── Codex ──────────────────────────────────────────
export function renderCodex(app) {
  const p = P();
  $('codexScreen').innerHTML = `${head('CODEX', `${p.codex.length} of ${CODEX.length} archive cards restored`)}
    <div class="codex-grid scroll">${CODEX.map(c => {
      const has = p.codex.includes(c.id);
      return `<div class="ccard glass ${has ? '' : 'locked'}"><h4>${has ? esc(c.title) : '▮▮▮▮▮▮▮'}</h4><p>${has ? esc(c.body) : `Restore by: ${esc(c.from)}`}</p></div>`;
    }).join('')}</div>`;
  wire($('codexScreen'), app);
}

// ── Records ────────────────────────────────────────
let lbTab = 'endless';
export async function renderRecords(app, tab) {
  lbTab = tab || lbTab;
  const p = P();
  const r = Progress.rank();
  const ach = ACHIEVEMENTS.map(a => {
    const has = p.achievements.includes(a.id);
    return `<div class="ach ${has ? '' : 'locked'}"><span class="a-ic">${has ? '🏅' : '○'}</span><span><div class="a-name">${a.name}</div><div class="a-desc">${a.desc}</div></span><span class="pill gold">¤ ${a.reward}</span></div>`;
  }).join('');
  const draw = entries => {
    const rows = entries.slice(0, 25).map((e, i) => `<div class="lb-row ${e.name === p.name ? 'me' : ''}"><span class="rk">${i + 1}</span><span>${esc(e.name)}</span><span class="fl">${e.fleet ? '⚑ ' + esc(e.fleet) : ''}</span><span class="sc">${fmt(e.score)}</span></div>`).join('');
    $('lbList').innerHTML = rows || `<div class="muted" style="padding:10px">${lbTab === 'fleet' && !p.fleet ? 'Join a fleet below to compete with your class.' : 'No scores yet — be the first!'}</div>`;
  };
  $('recordsScreen').innerHTML = `${head('RECORDS', `${r.name} · ${fmt(p.xp)} XP`)}
    <div class="rec-wrap">
      <div class="rec-col glass"><h3>MEDALS · ${p.achievements.length}/${ACHIEVEMENTS.length}</h3><div class="scroll" style="flex:1">${ach}</div></div>
      <div class="rec-col glass">
        <div class="tabs" style="margin-bottom:10px">${[['endless', 'DEEP SPACE'], ['daily', "TODAY'S DAILY"], ['fleet', 'MY FLEET']].map(([k, l]) => `<button class="tab ${k === lbTab ? 'on' : ''}" data-lb="${k}">${l}</button>`).join('')}</div>
        <div id="lbList" class="scroll" style="flex:1"><div class="muted" style="padding:10px">Loading…</div></div>
        <div class="field"><span class="muted" style="font-size:12px">FLEET CODE</span><input id="fleetInput" maxlength="8" placeholder="e.g. 7B2026" value="${esc(p.fleet)}"><button class="btn primary small" id="btnFleet">JOIN</button></div>
        <div class="muted" style="font-size:11px;margin-top:6px">Ask your teacher for your class code. Everyone with the same code shares a fleet board.</div>
      </div>
    </div>`;
  const root = $('recordsScreen');
  qsa('[data-lb]', root).forEach(b => b.onclick = () => renderRecords(app, b.dataset.lb));
  $('btnFleet').onclick = () => {
    const f = $('fleetInput').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (f && f.length < 3) return toast('Fleet codes are 3–8 letters or numbers.');
    Profile.update(pp => { pp.fleet = f; });
    toast(f ? `Joined fleet ${f}` : 'Left fleet'); renderRecords(app, 'fleet');
  };
  wire(root, app);
  const opts = lbTab === 'daily' ? { day: dayKey() } : lbTab === 'fleet' ? { fleet: p.fleet } : {};
  if (lbTab === 'fleet' && !p.fleet) return draw([]);
  draw(await Leaderboard.fetch(lbTab === 'daily' ? 'daily' : 'endless', opts));
}

// ── Settings ───────────────────────────────────────
export function renderSettings(app) {
  const s = P().settings;
  const row = (key, title, desc) => `<div class="setting glass"><div><h4>${title}</h4><p>${desc}</p></div><button class="toggle ${s[key] ? 'on' : ''}" data-set="${key}" aria-pressed="${s[key]}"></button></div>`;
  $('settingsScreen').innerHTML = `${head('SETTINGS')}
    <div class="settings-list">
      ${row('sound', 'Sound & music', 'Procedural soundtrack and effects. Shortcut: M')}
      ${row('voice', 'Voice announcements', 'Spoken alerts for sectors and bosses.')}
      ${row('reducedMotion', 'Reduced motion', 'No screen shake, softer flashes.')}
      ${row('assist', 'Assist mode', '+30% time on every threat. Great for learning — Assist runs are not ranked.')}
      <div class="setting glass"><div><h4>Callsign</h4><p>Shown on leaderboards. Offensive names are replaced automatically.</p></div>
        <div class="field" style="margin:0;min-width:360px"><input id="renameInput" maxlength="16" value="${esc(P().name)}"><button class="btn primary small" id="btnRename">SAVE</button></div></div>
    </div>`;
  const root = $('settingsScreen');
  qsa('[data-set]', root).forEach(b => b.onclick = () => {
    Profile.update(p => { p.settings[b.dataset.set] = !p.settings[b.dataset.set]; });
    app.applySettings(); renderSettings(app);
  });
  $('btnRename').onclick = () => {
    const n = $('renameInput').value.trim().slice(0, 16);
    if (!n) return toast('Callsign cannot be empty.');
    Profile.update(p => { p.name = n; }); toast('Callsign saved.');
  };
  wire(root, app);
}

// ── Parent Zone ────────────────────────────────────
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words(n) {
  const h = Math.floor(n / 100), r = n % 100;
  const rest = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : '');
  return (h ? `${ONES[h]} hundred${r ? ' and ' : ''}` : '') + rest;
}
let gateOpen = false, gateNum = 0;

export function renderParent(app) {
  const root = $('parentScreen');
  if (!gateOpen) {
    gateNum = 300 + Math.floor(Math.random() * 600);
    root.innerHTML = `${head('PARENT ZONE')}
      <div class="gate glass"><h3 style="font:900 18px var(--orb);letter-spacing:3px">GROWN-UPS ONLY</h3>
        <p>Type this number in digits to continue:</p><div class="word">${words(gateNum)}</div>
        <div class="field"><input id="gateInput" inputmode="numeric" maxlength="4"><button class="btn primary small" id="btnGate">OPEN</button></div></div>`;
    const tryOpen = () => {
      if (Number($('gateInput').value) === gateNum) { gateOpen = true; renderParent(app); }
      else { toast('That is not quite right.'); renderParent(app); }
    };
    $('btnGate').onclick = tryOpen;
    $('gateInput').onkeydown = e => { if (e.key === 'Enter') tryOpen(); if (e.key !== 'Escape') e.stopPropagation(); };
    wire(root, app);
    setTimeout(() => $('gateInput')?.focus(), 50);
    return;
  }
  const r = weeklyReport(), p = P();
  const trend = (a, b, better = 'up', unit = '') => (a == null || b == null ? '' : `<span class="muted"> (${a >= b === (better === 'up') ? '▲' : '▼'} vs ${b}${unit} last week)</span>`);
  const rows = r.rows.sort((a, b) => b.stats.attempts - a.stats.attempts).map(s => {
    const acc = Math.round((s.stats.correct / Math.max(1, s.stats.attempts)) * 100);
    const avg = s.stats.correct ? (s.stats.totalMs / s.stats.correct / 1000).toFixed(1) + 's' : '–';
    return `<tr><td>${s.label}</td><td>${s.stats.attempts}</td><td>${acc}%</td><td>${avg}</td><td><span class="meter"><i style="width:${Math.round(s.m * 100)}%"></i></span></td><td>${TIER[s.tier][2]}</td></tr>`;
  }).join('');
  root.innerHTML = `${head('PARENT ZONE', `Progress report for ${esc(p.name)} · ${new Date().toLocaleDateString()}`,
      `<button class="btn ghost small no-print" id="btnPrint">PRINT</button><button class="btn ghost small no-print" id="btnExport">EXPORT DATA</button>`)}
    <div class="scroll" style="flex:1">
      <div class="report">
        <div class="kpi glass"><b>${r.runs}</b><span>RUNS THIS WEEK</span></div>
        <div class="kpi glass"><b>${r.minutes} min</b><span>ACTIVE PLAY THIS WEEK</span></div>
        <div class="kpi glass"><b>${r.accuracy ?? '–'}${r.accuracy != null ? '%' : ''}</b><span>ACCURACY${trend(r.accuracy, r.prevAccuracy, 'up', '%')}</span></div>
        <div class="kpi glass"><b>${r.avgMs ? (r.avgMs / 1000).toFixed(1) + 's' : '–'}</b><span>AVG ANSWER TIME${r.avgMs && r.prevAvgMs ? `<span class="muted"> (${r.avgMs <= r.prevAvgMs ? '▲ faster' : '▼ slower'} than ${(r.prevAvgMs / 1000).toFixed(1)}s last week)</span>` : ''}</span></div>
      </div>
      <div class="report" style="grid-template-columns:1fr 1fr">
        <div class="kpi glass"><span>STRONGEST SKILL</span><b style="font-size:18px">${r.strongest || 'Not enough data yet'}</b></div>
        <div class="kpi glass"><span>SUGGESTED PRACTICE</span><b style="font-size:18px">${r.practise || 'Not enough data yet'}</b></div>
      </div>
      <div class="glass" style="padding:14px"><table class="skills"><thead><tr><th>SKILL</th><th>ATTEMPTS</th><th>ACCURACY</th><th>AVG TIME</th><th>MASTERY</th><th>LEVEL</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="muted">No skills practised yet.</td></tr>'}</tbody></table></div>
      <p class="muted" style="font-size:12px;margin-top:10px">All data is stored only on this device. Lifetime: ${p.totalRuns} runs · ${Math.round(p.lifetime.playSeconds / 60)} minutes · rank ${Progress.rank().name}.</p>
      <div class="no-print" style="margin-top:10px"><button class="btn ghost small" id="btnReset">RESET ALL PROGRESS</button></div>
    </div>`;
  $('btnPrint').onclick = () => window.print();
  $('btnExport').onclick = () => {
    const blob = new Blob([JSON.stringify(Profile.export(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `space-math-${p.name || 'pilot'}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  let armed = false;
  $('btnReset').onclick = e => {
    if (!armed) { armed = true; e.target.textContent = 'CLICK AGAIN TO ERASE EVERYTHING'; e.target.style.color = '#ff5252'; return; }
    Profile.reset(); gateOpen = false; app.reboot();
  };
  wire(root, app);
}
export function closeParentGate() { gateOpen = false; }

// ── Shared wiring ──────────────────────────────────
function wire(root, app) {
  qsa('[data-nav]', root).forEach(b => b.onclick = () => { app.sound('click'); app.go(b.dataset.nav); });
  qsa('[data-launch]', root).forEach(b => b.onclick = () => app.launch(b.dataset.launch));
  qsa('[data-act]', root).forEach(b => b.onclick = () => app.action(b.dataset.act));
}

export { clock };
