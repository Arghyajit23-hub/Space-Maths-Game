// ════════════════════════════════════════════════════════════════
//  DEBRIEF — end-of-run screen (FLOWMAP §2 → Debrief).
//  Performance · Rewards · Growth, plus share card for the Daily.
// ════════════════════════════════════════════════════════════════

import { $, toast, copyText } from './dom.js';
import { fmt, esc, clock } from '../core/util.js';
import { SYSTEMS, MISSION } from '../data/galaxy.js';
import { CODEX_BY_ID } from '../data/codex.js';
import { CREW_BY_ID, SHIP } from '../data/ships.js';
import { PERK } from '../data/perks.js';

function unlockText(u) {
  switch (u.type) {
    case 'codex': return `📜 Codex restored: <b>${esc(CODEX_BY_ID[u.id].title)}</b>`;
    case 'crew': return `🧑‍🚀 New crew: <b>${esc(CREW_BY_ID[u.id].name)}</b> — ${esc(CREW_BY_ID[u.id].perk)}`;
    case 'ship': return `🚀 New ship: <b>${esc(SHIP[u.id].name)}</b>`;
    case 'system': return `🪐 System unlocked: <b>${esc(SYSTEMS.find(s => s.id === u.id).name)}</b>`;
    default: return '';
  }
}

export function shareText(summary, run, name) {
  const rows = summary.shareRows.join('\n');
  return `🚀 Space Math · ${run.title}\n${name} scored ${fmt(summary.score)} · ${summary.accuracy}% · streak ${summary.bestStreak}\n${rows}`;
}

/**
 * ctx = { summary, session, report, run, name, nextMission, assist, onRetry, onNext, onDeck }
 */
export function renderDebrief(ctx) {
  const { summary: s, report: r, run, session } = ctx;
  const isMission = ['mission', 'boss', 'tutorial'].includes(run.kind);
  const title = s.victory ? (run.kind === 'tutorial' ? 'FLIGHT SCHOOL COMPLETE' : 'MISSION COMPLETE')
    : run.kind === 'endless' ? `LOST IN SECTOR ${s.sector}` : run.kind === 'daily' ? 'DAILY GALAXY OVER' : 'SHIP DESTROYED';
  const pb = r.prevBest != null && s.score > r.prevBest && r.prevBest > 0;
  const ins = session.insights();

  // Next goal — one concrete target
  let goal;
  if (isMission && !s.victory) goal = `Destroy the Mothership to clear ${run.id}. ${ins.focus ? `Brush up on ${ins.focus.label}.` : ''}`;
  else if (isMission && r.stars < 3) goal = r.stars === 1 ? 'Next: ★★ needs 85% accuracy.' : 'Next: ★★★ needs 85% accuracy and zero impacts.';
  else if (ctx.nextMission) goal = `Next up: ${ctx.nextMission.id} ${ctx.nextMission.name}.`;
  else if (run.kind === 'endless') goal = `Reach sector ${s.sector + 1} next time.`;
  else goal = 'Try Deep Space and climb the global board.';

  const rankUp = r.rankAfter.name !== r.rankBefore.name;
  const perks = s.perks.length ? s.perks.map(id => `<span title="${PERK[id].name}">${PERK[id].icon}</span>`).join(' ') : '–';

  $('debriefScreen').innerHTML = `
    <div class="db-top">
      <div class="kicker">${esc(run.kind === 'endless' ? 'DEEP SPACE' : run.kind === 'daily' ? run.title : `${run.id} · ${run.title}`)}${ctx.assist ? ' · ASSIST' : ''}</div>
      <div class="db-title ${s.victory ? 'win' : 'lose'}">${title}</div>
      ${isMission ? `<div class="db-stars">${[1, 2, 3].map(i => `<span data-star="${i}">★</span>`).join('')}</div>` : ''}
      <div class="db-score">${fmt(s.score)}</div>
      <div class="muted" id="dbRank">${pb ? '<span class="badge-new">NEW PERSONAL BEST</span>' : r.prevBest ? `Best ${fmt(Math.max(r.prevBest, s.score))}` : ''}</div>
    </div>
    <div class="db-grid">
      <div class="db-col glass">
        <h4>PERFORMANCE</h4>
        <div class="db-stats">
          <div><b>${s.accuracy}%</b><span>ACCURACY</span></div>
          <div><b>${s.avgMs ? (s.avgMs / 1000).toFixed(1) + 's' : '–'}</b><span>AVG ANSWER</span></div>
          <div><b>${s.bestStreak}</b><span>BEST STREAK</span></div>
          <div><b>${clock(s.survival)}</b><span>SURVIVED</span></div>
          <div><b>${s.kills}</b><span>THREATS DOWN</span></div>
          <div><b>${s.blazing}</b><span>BLAZING</span></div>
        </div>
        ${ins.best ? `<div class="unlock up">⚡ Sharpest: <b>${esc(ins.best.label)}</b> · ${(ins.best.avg / 1000).toFixed(1)}s</div>` : ''}
        ${ins.focus ? `<div class="unlock">🎯 Train next: <b>${esc(ins.focus.label)}</b> · ${Math.round(ins.focus.acc * 100)}%</div>` : ''}
        <div class="muted" style="font-size:12px">Perks: ${perks}</div>
      </div>
      <div class="db-col glass scroll">
        <h4>REWARDS</h4>
        <div class="reward-line"><span>XP</span><b>+${fmt(r.xp)}</b></div>
        <div class="xpbar"><div style="width:${Math.round(r.rankAfter.progress * 100)}%"></div></div>
        <div class="muted" style="font-size:11px">${rankUp ? `<span class="badge-new">RANK UP</span> ${r.rankAfter.name}` : r.rankAfter.name}</div>
        ${r.creditBreakdown.map(([k, v]) => `<div class="reward-line"><span>${k}</span><b>¤ ${fmt(v)}</b></div>`).join('')}
        <div class="reward-line" style="border-top:1px solid rgba(255,255,255,.1);padding-top:4px"><span>Total credits</span><b>¤ ${fmt(r.credits)}</b></div>
        ${r.unlocks.map(u => `<div class="unlock">${unlockText(u)}</div>`).join('')}
        ${r.achievements.map(a => `<div class="unlock medal">🏅 ${esc(a.name)} <span class="muted">+¤${a.reward}</span></div>`).join('')}
      </div>
      <div class="db-col glass scroll">
        <h4>GROWTH</h4>
        ${r.revenants.banished || r.revenants.added ? `<div class="unlock rev">👻 Revenants: ${r.revenants.banished} banished${r.revenants.vanquished ? `, ${r.revenants.vanquished} gone for good` : ''}${r.revenants.added ? ` · ${r.revenants.added} new will return` : ''}</div>` : ''}
        ${r.masteryUps.slice(0, 3).map(m => `<div class="unlock up">🧠 ${esc(m.label)}: ${Math.round(m.from * 100)}% → ${Math.round(m.to * 100)}%</div>`).join('')}
        ${s.bossName && !s.victory && s.bossKills === 0 && run.kind !== 'tutorial' ? `<div class="unlock">💀 ${esc(s.bossName)} is hunting you.</div>` : ''}
        <div style="color:#d1c4ff;font-size:14px">${esc(goal)}</div>
        ${run.kind === 'daily' ? `<div class="share-box" id="shareBox">${esc(shareText(s, run, ctx.name))}</div>
          <button class="btn primary small" id="btnShare">COPY RESULT ${r.dailyOfficial ? '' : '(practice)'}</button>
          ${r.dailyStreak ? `<div class="muted" style="font-size:12px">🔥 Daily streak: ${r.dailyStreak}</div>` : ''}` : ''}
      </div>
    </div>
    <div class="db-actions">
      <button class="btn primary small" id="btnRetry">${s.victory && isMission ? 'REPLAY' : 'RELAUNCH'} <kbd>Enter</kbd></button>
      ${ctx.nextMission && s.victory ? `<button class="btn primary small" id="btnNext">NEXT: ${esc(ctx.nextMission.id)} <kbd>N</kbd></button>` : ''}
      <button class="btn ghost small" id="btnDeck">COMMAND DECK <kbd>Esc</kbd></button>
    </div>`;

  // Star reveal
  if (isMission) [1, 2, 3].forEach(i => setTimeout(() => {
    if (i <= r.stars) { $('debriefScreen').querySelector(`[data-star="${i}"]`)?.classList.add('on'); ctx.sound?.('multUp', i); }
  }, 350 + i * 320));

  $('btnRetry').onclick = ctx.onRetry;
  $('btnDeck').onclick = ctx.onDeck;
  if ($('btnNext')) $('btnNext').onclick = ctx.onNext;
  if ($('btnShare')) $('btnShare').onclick = async () => toast((await copyText(shareText(s, run, ctx.name))) ? 'Copied! Paste it to your friends.' : 'Could not copy.');
}

export function setDebriefRank(text) { const el = $('dbRank'); if (el && text) el.innerHTML += ` · ${text}`; }
