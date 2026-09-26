// ════════════════════════════════════════════════════════════════
//  MAIN — boot, screen flow, input, HUD binding, render loop.
// ════════════════════════════════════════════════════════════════

import { CONFIG, sectorInfo, multiplierProgress } from './config.js';
import { Game } from './game/game.js';
import { renderGame } from './game/render.js';
import { Sound, speak } from './services/audio.js';
import { Profile } from './services/profile.js';
import { Leaderboard } from './services/leaderboard.js';

const $ = id => document.getElementById(id);
const el = {
  game: $('game'), canvas: $('canvas'), hud: $('hud'), console: $('console'), numpad: $('numpad'),
  score: $('hudScore'), mult: $('hudMult'), multFill: $('hudMultFill'), streak: $('hudStreak'),
  sector: $('hudSector'), sectorFill: $('hudSectorFill'), sectorHint: $('hudSectorHint'),
  hullFill: $('hudHullFill'), hull: $('hudHull'), time: $('hudTime'), pb: $('hudPB'), rival: $('hudRival'),
  prompt: $('consolePrompt'), value: $('consoleValue'), note: $('consoleNote'),
  banner: $('banner'), bannerTitle: $('bannerTitle'), bannerSub: $('bannerSub'),
  start: $('startScreen'), pause: $('pauseScreen'), over: $('overScreen'),
  name: $('nameInput'), board: $('boardList'), pbLine: $('pbLine'),
  btnSound: $('btnSound'), btnPause: $('btnPause'),
};
const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');

// ── Canvas sizing: #game is a fixed 1300×700 box scaled to fit the window ──
const ctx = el.canvas.getContext('2d');
let scale = 1;
function fit() {
  scale = Math.min(innerWidth / CONFIG.WIDTH, innerHeight / CONFIG.HEIGHT) * 0.985;
  el.game.style.transform = `scale(${scale})`;
  const dpr = Math.min(devicePixelRatio || 1, CONFIG.MAX_DPR);
  el.canvas.width = Math.round(CONFIG.WIDTH * scale * dpr);
  el.canvas.height = Math.round(CONFIG.HEIGHT * scale * dpr);
  ctx.setTransform(el.canvas.width / CONFIG.WIDTH, 0, 0, el.canvas.height / CONFIG.HEIGHT, 0, 0);
}
addEventListener('resize', fit);
fit();

// ── Game + UI state ──
const game = new Game();
if (isTouch) game.fieldMaxX = CONFIG.WIDTH - 420; // keep threats clear of the numpad
if (new URLSearchParams(location.search).has('debug')) window.__game = game; // debug & automated play tests only
let ui = 'start';          // start | play | paused | over
let overAt = 0;
let lastRival = null;
const profile = Profile.get();
el.name.value = profile.name || '';

function show(screen) {
  ui = screen;
  el.start.classList.toggle('hidden', screen !== 'start');
  el.pause.classList.toggle('hidden', screen !== 'paused');
  el.over.classList.toggle('hidden', screen !== 'over');
  const playing = screen === 'play' || screen === 'paused';
  el.hud.classList.toggle('hidden', !playing);
  el.console.classList.toggle('hidden', screen !== 'play');
  el.numpad.classList.toggle('hidden', !(isTouch && screen === 'play'));
  el.btnPause.classList.toggle('hidden', screen !== 'play');
}

// ── Formatting ──
const fmt = n => n.toLocaleString('en-US');
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MULT_COLORS = ['#00e5ff', '#00e5ff', '#69f0ae', '#ffd740', '#ff6e40', '#e040fb'];

// ════════════════════════════════════════════
//  GAME → UI callbacks
// ════════════════════════════════════════════
let shownScore = 0;
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

  const info = sectorInfo(g.sector);
  el.sector.textContent = `SECTOR ${g.sector} · ${info.name.toUpperCase()}`;
  const boss = g.boss;
  if (boss) {
    el.sectorFill.classList.add('boss');
    el.sectorFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    el.sectorHint.textContent = `MOTHERSHIP · ${boss.hp} HITS LEFT`;
  } else {
    el.sectorFill.classList.remove('boss');
    el.sectorFill.style.width = `${Math.min(1, g.sectorKills / g.sectorGoal) * 100}%`;
    const left = Math.max(0, g.sectorGoal - g.sectorKills);
    el.sectorHint.textContent = left ? `${left} TO MOTHERSHIP` : '';
  }

  const hull = Math.round(g.hull);
  el.hull.textContent = hull;
  el.hullFill.style.width = `${(hull / CONFIG.HULL_MAX) * 100}%`;
  el.hullFill.className = hull <= CONFIG.HULL_CRITICAL ? 'crit' : hull <= 60 ? 'warn' : '';

  // Rival chase
  const rival = Leaderboard.rivalAbove(s.score, game.pilot);
  if (rival) {
    el.rival.classList.remove('hidden', 'pass');
    el.rival.textContent = `NEXT: ${rival.name} · ${fmt(rival.score - s.score)} to pass`;
  } else if (Leaderboard.entries.length && s.score > 0) {
    el.rival.classList.remove('hidden'); el.rival.classList.add('pass');
    el.rival.textContent = '★ #1 GALACTIC PILOT';
  } else el.rival.classList.add('hidden');
  if (lastRival && rival !== lastRival && s.score > lastRival.score) {
    el.rival.classList.add('pass'); setTimeout(() => el.rival.classList.remove('pass'), 600);
  }
  lastRival = rival;
};

game.on.target = (challenge, th) => {
  el.console.classList.remove('hot');
  if (!challenge) { el.prompt.textContent = '—'; el.console.classList.add('idle'); return; }
  el.console.classList.remove('idle');
  el.console.classList.toggle('noeq', challenge.prompt.includes('='));
  el.prompt.textContent = challenge.prompt;
};

game.on.input = v => { el.value.textContent = v.replace('-', '−'); };

let noteTimer = null;
function note(text, cls = '') {
  el.note.textContent = text; el.note.className = `c-note ${cls}`;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { el.note.textContent = isTouch ? 'tap to fire' : 'type to fire'; el.note.className = 'c-note'; }, 1800);
}
function flashConsole(cls) {
  el.console.classList.remove('ok', 'bad'); void el.console.offsetWidth;
  el.console.classList.add(cls);
  setTimeout(() => el.console.classList.remove(cls), cls === 'ok' ? 180 : 320);
}

game.on.feedback = (type, data) => {
  if (type === 'correct') flashConsole('ok');
  else if (type === 'wrong') { flashConsole('bad'); note('MISS — hull hit', 'reveal'); }
  else if (type === 'timeout') { flashConsole('bad'); note(`IMPACT · ${data.prompt} = ${data.answer}`, 'reveal'); }
  else if (type === 'mult') { el.mult.classList.remove('pop'); void el.mult.offsetWidth; el.mult.classList.add('pop'); }
};

game.on.banner = (title, sub, kind) => {
  el.bannerTitle.textContent = title; el.bannerSub.textContent = sub;
  el.banner.className = kind === 'boss' ? 'boss' : '';
  void el.banner.offsetWidth; // restart animation
};

game.on.record = () => speak('New personal best!');

game.on.over = async (run, session) => {
  const improved = Profile.recordRun(run);
  overAt = performance.now();
  show('over');
  renderDebrief(run, session, improved);
  const lines = improved.score && improved.prevBest > 0 ? `New personal best. ${run.score} points.`
    : run.sector >= 3 ? `Great flying. You reached sector ${run.sector}.` : `Ship down. ${run.score} points. Relaunch when ready.`;
  setTimeout(() => speak(lines), 500);
  await Leaderboard.submit(run, game.pilot);
  renderDebriefRank(run);
  renderBoard();
};

// ════════════════════════════════════════════
//  Screens
// ════════════════════════════════════════════
function startRun() {
  Sound.unlock(); Sound.click();
  const name = (el.name.value.trim() || profile.name || 'Pilot').slice(0, 16);
  Profile.setName(name);
  game.pilot = name;
  shownScore = -1; lastRival = null;
  game.start({ mode: 'math', personalBest: Profile.get().bestScore });
  show('play');
  el.name.blur();
  note(isTouch ? 'tap the answer · FIRE' : 'type the answer — no Enter needed');
}

function pauseRun() {
  if (ui !== 'play' || game.state !== 'play') return;
  game.pause(); show('paused'); Sound.stopMusic();
}
function resumeRun() {
  if (ui !== 'paused') return;
  Sound.click(); game.resume(); show('play'); Sound.startMusic();
}
function toMenu() {
  Sound.click(); Sound.stopMusic();
  game.state = 'idle';
  show('start'); renderStart();
}

function renderStart() {
  const p = Profile.get();
  el.pbLine.innerHTML = p.totalRuns
    ? `Personal best <b>${fmt(p.bestScore)}</b> · Sector ${p.bestSector} · ${p.totalRuns} run${p.totalRuns > 1 ? 's' : ''}`
    : 'Your first mission awaits, pilot.';
  renderBoard();
}

function renderBoard() {
  const list = Leaderboard.entries.slice(0, 10);
  if (!list.length) { el.board.innerHTML = '<li class="empty">Offline — scores saved on this device</li>'; return; }
  const me = Profile.get().name;
  el.board.innerHTML = list.map(e =>
    `<li class="${e.name === me ? 'me' : ''}"><span class="n">${esc(e.name)}</span><span class="s">${fmt(e.score)}</span></li>`).join('');
}

function renderDebrief(run, session, improved) {
  $('overKicker').textContent = run.sector > 1 ? `SHIP LOST IN SECTOR ${run.sector}` : 'SHIP DESTROYED';
  $('overRecord').classList.toggle('hidden', !(improved.score && improved.prevBest > 0));
  $('overScore').textContent = fmt(run.score);
  $('stSector').textContent = run.sector;
  $('stTime').textContent = clock(run.survival);
  $('stAcc').textContent = `${run.accuracy}%`;
  $('stAvg').textContent = run.avgMs ? `${(run.avgMs / 1000).toFixed(1)}s` : '–';
  $('stStreak').textContent = run.bestStreak;
  $('stKills').textContent = run.kills;
  $('overRank').textContent = '';

  const ins = session.insights();
  let html = '';
  if (ins.best) html += `<div class="insight good"><small>SHARPEST SKILL</small>${esc(ins.best.label)} · ${(ins.best.avg / 1000).toFixed(1)}s avg · ${Math.round(ins.best.acc * 100)}%</div>`;
  if (ins.focus) html += `<div class="insight train"><small>TRAIN NEXT</small>${esc(ins.focus.label)} · ${Math.round(ins.focus.acc * 100)}% hit rate</div>`;
  $('insights').innerHTML = html;

  // One concrete, reachable goal for the next run
  const p = Profile.get();
  let goal;
  if (run.sector < 2) goal = `Next goal: clear ${CONFIG.sectorKills(1)} threats and take down your first Mothership.`;
  else if (!improved.score && p.bestScore - run.score < p.bestScore * 0.25) goal = `Only ${fmt(p.bestScore - run.score)} points short of your best — one more run?`;
  else if (run.bestStreak < 10) goal = 'Next goal: hit a 10 streak for a free hull repair and ×3 multiplier.';
  else goal = `Next goal: reach Sector ${run.sector + 1} — ${sectorInfo(run.sector + 1).name}.`;
  $('nextGoal').textContent = goal;
}

function renderDebriefRank(run) {
  if (!Leaderboard.entries.length) return;
  const rank = Leaderboard.entries.findIndex(e => e.score === run.score && e.name === game.pilot) + 1 || Leaderboard.rankFor(run.score);
  $('overRank').innerHTML = `Galactic rank <b>#${rank}</b> of ${Leaderboard.entries.length}`;
}

// ════════════════════════════════════════════
//  Input
// ════════════════════════════════════════════
document.addEventListener('keydown', e => {
  const k = e.key;
  if (ui === 'start') {
    if (k === 'Enter') { e.preventDefault(); startRun(); }
    return;
  }
  if (k === 'm' || k === 'M') { toggleSound(); return; }
  if (ui === 'over') {
    if ((k === 'Enter' || k === 'r' || k === 'R') && performance.now() - overAt > 900) { e.preventDefault(); startRun(); }
    if (k === 'Escape') toMenu();
    return;
  }
  if (ui === 'paused') {
    if (k === 'Escape' || k === 'p' || k === 'P' || k === 'Enter') { e.preventDefault(); resumeRun(); }
    return;
  }
  if (ui !== 'play') return;
  if (k === 'Escape' || k === 'p' || k === 'P') { e.preventDefault(); pauseRun(); return; }
  if (k >= '0' && k <= '9') { game.type(k); e.preventDefault(); return; }
  if (k === '-' || k === 'Subtract') { game.type('-'); e.preventDefault(); return; }
  if (k === 'Backspace') { game.backspace(); e.preventDefault(); return; }
  if (k === ' ' || k === 'Delete') { game.clearInput(); e.preventDefault(); return; }
  if (k === 'Enter') { game.submit(); e.preventDefault(); }
});

el.numpad.addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.preventDefault();
  const k = b.dataset.k;
  if (k === 'enter') game.submit(); else if (k === 'del') game.backspace(); else game.type(k);
});

function toggleSound() {
  const on = Sound.toggle();
  el.btnSound.classList.toggle('off', !on);
  el.btnSound.textContent = on ? '♫' : '✕';
  if (on && ui === 'play') Sound.startMusic(); else if (!on) Sound.stopMusic();
}
el.btnSound.classList.toggle('off', !Sound.enabled);
el.btnSound.textContent = Sound.enabled ? '♫' : '✕';
el.btnSound.addEventListener('click', e => { e.currentTarget.blur(); toggleSound(); });
el.btnPause.addEventListener('click', e => { e.currentTarget.blur(); pauseRun(); });
$('btnStart').addEventListener('click', startRun);
$('btnResume').addEventListener('click', resumeRun);
$('btnAbort').addEventListener('click', toMenu);
$('btnReplay').addEventListener('click', startRun);
$('btnMenu').addEventListener('click', toMenu);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseRun(); });
addEventListener('blur', pauseRun);

// ════════════════════════════════════════════
//  Loop
// ════════════════════════════════════════════
let last = performance.now(), timeShown = -1;
function frame(now) {
  const dt = (now - last) / 1000; last = now;
  game.update(dt);
  // Console urgency + clock (cheap DOM writes only on change)
  if (ui === 'play') {
    const hot = !!(game.target && game.target.kind !== 'boss' && game.target.progress > 0.75);
    if (hot !== el.console.classList.contains('hot')) el.console.classList.toggle('hot', hot);
    const sec = Math.floor(game.session.survival);
    if (sec !== timeShown) {
      timeShown = sec; el.time.textContent = clock(sec);
      const pb = Profile.get().bestScore;
      el.pb.textContent = pb ? `PB ${fmt(pb)}` : '';
    }
  }
  renderGame(ctx, game, now);
  requestAnimationFrame(frame);
}

show('start');
renderStart();
Leaderboard.fetch('math').then(renderBoard);
if (!isTouch) el.name.focus();
requestAnimationFrame(frame);
