// ════════════════════════════════════════════════════════════════
//  MAIN — boot, routing between screens, run launching, in-run HUD,
//  keyboard/touch input and the render loop. (FLOWMAP §1)
// ════════════════════════════════════════════════════════════════

import { CONFIG, VIEW, computeView, multiplierProgress } from './config.js';
import { fmt, clock, esc } from './core/util.js';
import { dayKey } from './core/rng.js';
import { Game } from './game/game.js';
import { renderGame, renderBackdrop, setReducedMotion, plateText, MULT_COLORS } from './game/render.js';
import { Sound, speak } from './services/audio.js';
import { Profile } from './services/profile.js';
import { Progress } from './services/progression.js';
import { Leaderboard } from './services/leaderboard.js';
import { endlessRun, dailyRun, missionRun, MISSION } from './data/galaxy.js';
import { PERK } from './data/perks.js';
import { TRAIL } from './data/ships.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { $, qsa, showScreen, toast } from './ui/dom.js';
import * as Hub from './ui/hub.js';
import { renderDebrief, setDebriefRank } from './ui/debrief.js';

const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');

// ── Canvas: the play-field (#game) always fills the window ──
// VIEW (config.js) turns the window into a logical W×H field that matches the
// screen's aspect ratio; #game is sized to that and scaled by VIEW.k, so there
// are no letterbox bars and nothing is cropped, from phones to ultrawides.
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const gameEl = $('game'), safeProbe = document.createElement('div');
safeProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
document.body.appendChild(safeProbe);
function readSafe() {
  const cs = getComputedStyle(safeProbe);
  return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}
function viewportSize() {
  const vv = window.visualViewport;
  // visualViewport excludes on-screen keyboards / browser chrome on mobile; ignore pinch-zoom
  if (vv && vv.scale === 1) return [vv.width, vv.height];
  return [document.documentElement.clientWidth || innerWidth, document.documentElement.clientHeight || innerHeight];
}
let onRelayout = () => {};
function fit() {
  const [vw, vh] = viewportSize();
  const old = { ...VIEW };
  const changed = computeView(vw, vh, isTouch, readSafe());
  gameEl.style.width = `${VIEW.W}px`; gameEl.style.height = `${VIEW.H}px`;
  gameEl.style.transform = `scale(${VIEW.k})`;
  const cls = gameEl.classList;
  cls.toggle('v-narrow', VIEW.narrow); cls.toggle('v-tall', VIEW.tall); cls.toggle('v-wide', !VIEW.narrow);
  cls.toggle('v-compact', VIEW.tall || VIEW.W < 820);
  const st = gameEl.style, sf = VIEW.safe;
  st.setProperty('--safe-t', `${sf.t}px`); st.setProperty('--safe-r', `${sf.r}px`);
  st.setProperty('--safe-b', `${sf.b}px`); st.setProperty('--safe-l', `${sf.l}px`);
  st.setProperty('--vw', `${VIEW.W}px`); st.setProperty('--vh', `${VIEW.H}px`);
  // Backing store: device pixels, capped so 4K/5K screens don't allocate giant canvases
  let px = Math.min(devicePixelRatio || 1, CONFIG.MAX_DPR) * VIEW.k;
  const MAX_PIXELS = 3840 * 2400;
  if (VIEW.W * VIEW.H * px * px > MAX_PIXELS) px = Math.sqrt(MAX_PIXELS / (VIEW.W * VIEW.H));
  canvas.style.width = `${VIEW.W}px`; canvas.style.height = `${VIEW.H}px`;
  canvas.width = Math.round(VIEW.W * px);
  canvas.height = Math.round(VIEW.H * px);
  ctx.setTransform(canvas.width / VIEW.W, 0, 0, canvas.height / VIEW.H, 0, 0);
  if (changed) onRelayout(old);
}
let fitQueued = false;
function queueFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); }
addEventListener('resize', queueFit);
addEventListener('orientationchange', () => setTimeout(fit, 120));
window.visualViewport?.addEventListener('resize', queueFit);
fit();

const game = new Game();
onRelayout = old => {
  game.relayout(old);
  // Canvas-based menu screens measure their box when drawn, so redraw them at the new size
  if (ui === 'menu' && (screen === 'brain' || screen === 'hangar')) app.go(screen);
};
if (new URLSearchParams(location.search).has('debug')) window.__game = game; // debug & automated play tests only

// ════════════════════════════════════════════
//  Router
// ════════════════════════════════════════════
let ui = 'menu';          // menu | play | paused | draft | debrief
let screen = null;        // current hub screen
let currentRun = null;
let overAt = 0;
let lastNext = null;

function setPlayChrome(on) {
  $('hud').classList.toggle('hidden', !on);
  $('console').classList.toggle('hidden', !on);
  $('numpad').classList.toggle('hidden', !(on && isTouch));
  $('btnPause').classList.toggle('hidden', !on);
  if (!on) { $('tip').classList.add('hidden'); $('banner').classList.add('hidden'); }
}

const app = {
  go(name) {
    ui = 'menu'; screen = name;
    game.state = 'idle';
    setPlayChrome(false);
    if (name !== 'parent') Hub.closeParentGate();
    const r = { welcome: Hub.renderWelcome, deck: Hub.renderDeck, galaxy: Hub.renderGalaxy, hangar: Hub.renderHangar, brain: Hub.renderBrain,
      codex: Hub.renderCodex, records: Hub.renderRecords, settings: Hub.renderSettings, parent: Hub.renderParent }[name];
    r(app);
    showScreen(name);
  },
  launch(id) { startRun(id); },
  action(act) {
    if (act !== 'continue' && !Profile.get().missions['1-0']?.cleared) { toast('Finish Flight School first, pilot!'); return startRun('1-0'); }
    if (act === 'continue') { const n = Progress.nextMission(); startRun(n ? n.id : 'endless'); }
    else if (act === 'daily') startRun('daily');
    else if (act === 'endless') startRun('endless');
  },
  sound(name, arg) { Sound[name]?.(arg); },
  applySettings() {
    const s = Profile.get().settings;
    Sound.setEnabled(s.sound); Sound.setVoice(s.voice); setReducedMotion(s.reducedMotion);
    $('btnSound').classList.toggle('off', !s.sound); $('btnSound').textContent = s.sound ? '♫' : '✕';
  },
  checkAchievements() {
    const p = Profile.get();
    for (const a of ACHIEVEMENTS) {
      if (p.achievements.includes(a.id)) continue;
      try { if (a.test({}, p)) { Profile.update(pp => { pp.achievements.push(a.id); pp.credits += a.reward; }); toast(`🏅 ${a.name} · +¤${a.reward}`); } } catch {}
    }
  },
  reboot() { app.go(Profile.isNew() ? 'welcome' : 'deck'); },
};

// ════════════════════════════════════════════
//  Runs
// ════════════════════════════════════════════
function buildRun(id) {
  if (id === 'endless') return endlessRun();
  if (id === 'daily') return dailyRun(dayKey());
  return missionRun(id);
}

async function startRun(id) {
  Sound.unlock(); Sound.click();
  const p = Profile.get();
  const run = buildRun(id);
  currentRun = run;
  const ghostKey = run.kind === 'daily' ? 'daily' : run.id;
  shownScore = -1; lastRival = null; board = []; perkCount = -1; targetTh = null;
  const personalBest = run.kind === 'endless' ? p.best.endlessScore : run.kind === 'daily' ? (p.ghosts.daily?.score || 0) : (p.missions[run.id]?.best || 0);
  game.start({
    run, ship: p.ship, crew: p.crewOn, trailColor: TRAIL[p.trail]?.color, assist: p.settings.assist,
    revenants: run.revenants === false ? [] : Profile.dueRevenants(5),
    ghost: Profile.ghost(ghostKey), personalBest,
    weakest: (allowed, n) => Profile.weakest(allowed, n),
  });
  ui = 'play'; screen = null;
  showScreen(null);
  setPlayChrome(true);
  note(isTouch ? 'tap the answer · FIRE' : 'type the answer — no Enter needed');
  if (run.kind === 'endless') board = await Leaderboard.fetch('endless');
  else if (run.kind === 'daily') board = await Leaderboard.fetch('daily', { day: run.day });
}

function abandon() {
  Sound.stopMusic();
  game.state = 'idle';
  app.go('deck');
}

// ════════════════════════════════════════════
//  HUD binding (game → DOM)
// ════════════════════════════════════════════
const el = {
  score: $('hudScore'), mult: $('hudMult'), multFill: $('hudMultFill'), streak: $('hudStreak'), perks: $('hudPerks'),
  sector: $('hudSector'), sectorFill: $('hudSectorFill'), sectorHint: $('hudSectorHint'),
  hullFill: $('hudHullFill'), hull: $('hudHull'), time: $('hudTime'), ghost: $('hudGhost'), rival: $('hudRival'),
  console: $('console'), label: $('consoleLabel'), prompt: $('consolePrompt'), value: $('consoleValue'), note: $('consoleNote'),
  banner: $('banner'), bannerTitle: $('bannerTitle'), bannerSub: $('bannerSub'), tip: $('tip'),
};
let shownScore = 0, lastRival = null, board = [], perkCount = -1;

game.on.hud = g => {
  const s = g.session;
  if (s.score !== shownScore) {
    el.score.textContent = fmt(s.score);
    el.score.classList.remove('bump'); void el.score.offsetWidth; el.score.classList.add('bump');
    setTimeout(() => el.score.classList.remove('bump'), 90);
    shownScore = s.score;
  }
  const m = s.multiplier, col = MULT_COLORS[Math.min(m, MULT_COLORS.length - 1)];
  el.mult.textContent = `×${m}`; el.mult.style.background = col;
  el.multFill.style.width = `${multiplierProgress(s.streak) * 100}%`; el.multFill.style.background = col;
  el.streak.textContent = s.streak;
  if (s.perks.length !== perkCount) {
    perkCount = s.perks.length;
    el.perks.innerHTML = s.perks.map(id => `<span title="${PERK[id].name}: ${PERK[id].desc}" style="color:${PERK[id].color}">${PERK[id].icon}</span>`).join('');
  }

  const run = g.run;
  const secTxt = run.sectors === Infinity ? `SECTOR ${g.sector} · ${g.theme.name.toUpperCase()}`
    : run.kind === 'daily' ? `DAILY GALAXY · SECTOR ${g.sector}/${run.sectors}`
    : `${run.id} · ${run.title.toUpperCase()}${run.sectors > 1 ? ` · ${g.sector}/${run.sectors}` : ''}`;
  el.sector.textContent = secTxt;
  const boss = g.boss;
  if (boss) {
    el.sectorFill.classList.add('boss');
    el.sectorFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    el.sectorHint.textContent = `${boss.name.toUpperCase()} · ${boss.hp} HITS LEFT`;
  } else {
    el.sectorFill.classList.remove('boss');
    el.sectorFill.style.width = `${Math.min(1, g.sectorKills / g.sectorGoal) * 100}%`;
    const left = Math.max(0, g.sectorGoal - g.sectorKills);
    el.sectorHint.textContent = left ? `${left} TO MOTHERSHIP` : '';
  }
  const hull = Math.round(g.hull), max = g.mods.hullMax;
  el.hull.textContent = hull;
  el.hullFill.style.width = `${(hull / max) * 100}%`;
  el.hullFill.className = hull <= CONFIG.HULL_CRITICAL ? 'crit' : hull <= max * 0.6 ? 'warn' : '';

  // Rival chase (Deep Space / Daily boards) or mission best
  if (run.kind === 'endless' || run.kind === 'daily') {
    const rival = Leaderboard.rivalAbove(board, s.score);
    if (rival) { el.rival.classList.remove('hidden', 'pass'); el.rival.textContent = `NEXT: ${rival.name} · ${fmt(rival.score - s.score)} to pass`; }
    else if (board.length && s.score > 0) { el.rival.classList.remove('hidden'); el.rival.classList.add('pass'); el.rival.textContent = run.kind === 'daily' ? "★ #1 TODAY" : '★ #1 GALACTIC PILOT'; }
    else el.rival.classList.add('hidden');
    if (lastRival && rival !== lastRival && s.score > lastRival.score) { el.rival.classList.add('pass'); setTimeout(() => el.rival.classList.remove('pass'), 600); }
    lastRival = rival;
  } else if (g.personalBest) {
    el.rival.classList.remove('hidden', 'pass');
    el.rival.textContent = s.score > g.personalBest ? '★ NEW MISSION BEST' : `MISSION BEST ${fmt(g.personalBest)}`;
  } else el.rival.classList.add('hidden');
};

let targetTh = null, targetHidden = false;
function paintTarget() {
  const th = targetTh;
  el.console.classList.remove('hot');
  if (!th) { el.prompt.textContent = '—'; el.label.textContent = ''; el.console.classList.add('idle'); return; }
  const c = th.challenge;
  el.console.classList.remove('idle');
  const text = plateText(th);
  targetHidden = text !== c.prompt;
  el.console.classList.toggle('noeq', c.prompt.includes('=') || c.choice || c.mode === 'memory');
  el.prompt.textContent = text;
  el.label.textContent = c.label || (th.kind === 'revenant' ? 'REVENANT' : '');
}
game.on.target = (challenge, th) => { targetTh = th || null; paintTarget(); };
game.on.input = v => { el.value.textContent = v.replace('-', '−'); };

let noteTimer = null;
function note(text, cls = '') {
  el.note.textContent = text; el.note.className = `c-note ${cls}`;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { el.note.textContent = isTouch ? 'tap to fire' : 'type to fire'; el.note.className = 'c-note'; }, 2200);
}
function flashConsole(cls) {
  el.console.classList.remove('ok', 'bad'); void el.console.offsetWidth;
  el.console.classList.add(cls);
  setTimeout(() => el.console.classList.remove(cls), cls === 'ok' ? 180 : 320);
}
game.on.feedback = (type, data) => {
  if (type === 'correct') flashConsole('ok');
  else if (type === 'wrong') { flashConsole('bad'); note('MISS — hull hit', 'reveal'); }
  else if (type === 'friendly') { flashConsole('bad'); note('FRIENDLY FIRE — never answer green ships', 'reveal'); }
  else if (type === 'timeout') { flashConsole('bad'); note(`IMPACT · ${data.explain}`, 'reveal'); }
  else if (type === 'mult') { el.mult.classList.remove('pop'); void el.mult.offsetWidth; el.mult.classList.add('pop'); }
};
game.on.banner = (title, sub, kind) => {
  el.bannerTitle.textContent = title; el.bannerSub.textContent = sub;
  el.banner.className = kind === 'boss' ? 'boss' : '';
  void el.banner.offsetWidth;
};
let tipTimer = null;
game.on.tip = text => {
  el.tip.textContent = text; el.tip.classList.remove('hidden');
  el.tip.style.animation = 'none'; void el.tip.offsetWidth; el.tip.style.animation = '';
  clearTimeout(tipTimer); tipTimer = setTimeout(() => el.tip.classList.add('hidden'), 4200);
};
game.on.record = () => speak('New personal best!');

game.on.draft = offer => {
  if (!offer) { ui = 'play'; showScreen(null); setPlayChrome(true); return; }
  ui = 'draft';
  const owned = game.session.perks;
  $('draftCards').innerHTML = offer.map((p, i) => {
    const n = owned.filter(x => x === p.id).length;
    return `<button class="perk" data-pick="${i}" style="--pc:${p.color}"><div class="p-key">[ ${i + 1} ]</div><div class="p-icon">${p.icon}</div><h4>${p.name}</h4><p>${p.desc}</p>${n ? `<div class="p-stack">OWNED ×${n} — STACKS</div>` : ''}</button>`;
  }).join('');
  qsa('[data-pick]', $('draftCards')).forEach(b => b.onclick = () => pickPerk(Number(b.dataset.pick)));
  setPlayChrome(false);
  showScreen('draft');
};
function pickPerk(i) { if (ui === 'draft') game.choosePerk(i); }

game.on.over = async (summary, session) => {
  const run = currentRun, p = Profile.get();
  setPlayChrome(false);
  const report = Progress.applyRun(summary, run, { assist: p.settings.assist, creditsMult: game.mods.creditsMult });
  overAt = performance.now();
  ui = 'debrief';
  const next = Progress.nextMission();
  lastNext = next && next.id !== run.id ? next : null;
  renderDebrief({
    summary, session, report, run, name: p.name, assist: p.settings.assist, nextMission: lastNext,
    sound: (n, a) => Sound[n]?.(a),
    onRetry: () => startRun(run.kind === 'daily' ? 'daily' : run.id),
    onNext: () => lastNext && startRun(lastNext.id),
    onDeck: () => app.go('deck'),
  });
  showScreen('debrief');
  const line = summary.victory ? `Mission complete. ${summary.score} points.` : run.kind === 'endless' ? `Ship down in sector ${summary.sector}.` : 'Ship down. Relaunch when ready.';
  setTimeout(() => speak(line), 500);

  // Leaderboards: Deep Space always, Daily only for the official first attempt. Assist runs are never ranked.
  if (p.settings.assist) return;
  if (run.kind === 'endless' || (run.kind === 'daily' && report.dailyOfficial)) {
    const mode = run.kind === 'daily' ? 'daily' : 'endless';
    const entries = await Leaderboard.submit(summary, { name: p.name, mode, day: run.day, fleet: p.fleet });
    if (entries.length && ui === 'debrief') setDebriefRank(`${mode === 'daily' ? 'Today' : 'Galactic'} rank <b style="color:var(--cyan)">#${Leaderboard.rankFor(entries, summary.score)}</b> of ${entries.length}`);
  }
};

// ════════════════════════════════════════════
//  Pause
// ════════════════════════════════════════════
function pauseRun() {
  if (ui !== 'play' || game.state !== 'play') return;
  game.pause(); ui = 'paused'; Sound.stopMusic();
  $('pauseScreen').innerHTML = `<h2>SYSTEMS PAUSED</h2>
    <div class="muted" style="margin-bottom:18px">${esc(currentRun.kind === 'endless' ? 'Deep Space' : currentRun.title)} · score ${fmt(game.session.score)}</div>
    <button id="btnResume" class="btn primary">RESUME <kbd>Esc</kbd></button>
    <button id="btnAbort" class="btn ghost">ABANDON RUN <kbd>Q</kbd></button>`;
  $('btnResume').onclick = resumeRun; $('btnAbort').onclick = abandon;
  setPlayChrome(false);
  showScreen('pause');
}
function resumeRun() {
  if (ui !== 'paused') return;
  Sound.click(); game.resume(); ui = 'play'; showScreen(null); setPlayChrome(true); Sound.startMusic();
}

// ════════════════════════════════════════════
//  Input
// ════════════════════════════════════════════
const DECK_KEYS = { d: () => app.action('daily'), e: () => app.action('endless'), g: () => app.go('galaxy'), h: () => app.go('hangar'), b: () => app.go('brain'), c: () => app.go('codex'), r: () => app.go('records') };

document.addEventListener('keydown', e => {
  const k = e.key;
  const typing = e.target.tagName === 'INPUT';
  if ((k === 'm' || k === 'M') && !typing) { toggleSound(); return; }

  if (ui === 'play') {
    if (k === 'Escape' || k === 'p' || k === 'P') { e.preventDefault(); pauseRun(); return; }
    if (k >= '0' && k <= '9') { game.type(k); e.preventDefault(); return; }
    if (k === '-' || k === 'Subtract') { game.type('-'); e.preventDefault(); return; }
    if (k === 'Backspace') { game.backspace(); e.preventDefault(); return; }
    if (k === ' ' || k === 'Delete') { game.clearInput(); e.preventDefault(); return; }
    if (k === 'Enter') { game.submit(); e.preventDefault(); }
    return;
  }
  if (ui === 'draft') { if (k >= '1' && k <= '3') pickPerk(Number(k) - 1); return; }
  if (ui === 'paused') {
    if (k === 'Escape' || k === 'p' || k === 'P' || k === 'Enter') { e.preventDefault(); resumeRun(); }
    else if (k === 'q' || k === 'Q') abandon();
    return;
  }
  if (ui === 'debrief') {
    if (performance.now() - overAt < 900) return;
    if (k === 'Enter' || k === 'r' || k === 'R') { e.preventDefault(); startRun(currentRun.kind === 'daily' ? 'daily' : currentRun.id); }
    else if ((k === 'n' || k === 'N') && lastNext) startRun(lastNext.id);
    else if (k === 'Escape') app.go('deck');
    return;
  }
  // Escape always leaves a hub screen, even while a text box (parent gate, callsign, fleet code) has focus
  if (k === 'Escape' && screen && screen !== 'welcome' && screen !== 'deck') { e.preventDefault(); e.target.blur?.(); app.go('deck'); return; }
  if (typing) return;
  if (screen === 'deck') {
    if (k === 'Enter') { e.preventDefault(); app.action('continue'); return; }
    const f = DECK_KEYS[k.toLowerCase()]; if (f) f();
    return;
  }
});

$('numpad').addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.preventDefault();
  const k = b.dataset.k;
  if (k === 'enter') game.submit(); else if (k === 'del') game.backspace(); else game.type(k);
});

function toggleSound() {
  Profile.update(p => { p.settings.sound = !p.settings.sound; });
  app.applySettings();
  if (Profile.get().settings.sound && ui === 'play') Sound.startMusic();
  if (screen === 'settings') Hub.renderSettings(app);
}
$('btnSound').addEventListener('click', e => { e.currentTarget.blur(); toggleSound(); });
$('btnPause').addEventListener('click', e => { e.currentTarget.blur(); pauseRun(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseRun(); });
addEventListener('blur', pauseRun);

// ════════════════════════════════════════════
//  Loop
// ════════════════════════════════════════════
let last = performance.now(), timeShown = -1, ghostShown = null;
function frame(now) {
  const dt = (now - last) / 1000; last = now;
  game.update(dt);
  if (ui === 'play') {
    const t = game.target;
    const hot = !!(t && t.kind !== 'boss' && t.progress > 0.75);
    if (hot !== el.console.classList.contains('hot')) el.console.classList.toggle('hot', hot);
    if (targetTh && plateText(targetTh) !== targetTh.challenge.prompt !== targetHidden) paintTarget();
    const sec = Math.floor(game.session.survival);
    if (sec !== timeShown) {
      timeShown = sec; el.time.textContent = clock(sec);
      const d = game.ghostDelta();
      if (d !== ghostShown) {
        ghostShown = d;
        el.ghost.textContent = d == null ? '' : `GHOST ${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))}`;
        el.ghost.className = `ghost ${d == null ? '' : d >= 0 ? 'ahead' : 'behind'}`;
      }
    }
  }
  if (ui === 'menu') renderBackdrop(ctx, game, now);
  else renderGame(ctx, game, now);
  requestAnimationFrame(frame);
}

if (window.__game) window.__app = app;
app.applySettings();
app.reboot();
Leaderboard.fetch('endless');
requestAnimationFrame(frame);
