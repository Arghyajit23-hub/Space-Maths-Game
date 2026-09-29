// ════════════════════════════════════════════════════════════════
//  PROGRESSION — turns a finished run into XP, credits, stars, unlocks,
//  achievements, Revenant updates and Brain Map changes (FLOWMAP §7).
//  Also answers "is this system / mission / ship unlocked?".
// ════════════════════════════════════════════════════════════════

import { Profile } from './profile.js';
import { SYSTEMS, MISSIONS, MISSION, missionsOf } from '../data/galaxy.js';
import { CODEX_ON_CLEAR } from '../data/codex.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { rankFor } from '../data/ranks.js';
import { SKILL_LABELS } from '../challenges/index.js';
import { dayKey } from '../core/rng.js';

const BOSS_IDS = MISSIONS.filter(m => m.kind === 'boss').map(m => m.id);

export const Progress = {
  bossBeaten(sys) {
    const b = MISSIONS.find(m => m.system === sys && m.kind === 'boss');
    return !!(b && Profile.get().missions[b.id]?.cleared);
  },

  systemUnlocked(id) {
    const p = Profile.get();
    if (!p.missions['1-0']?.cleared) return false;
    const s = SYSTEMS.find(x => x.id === id);
    if (!s.requires) return true;
    if (s.requires === 'ALL') return BOSS_IDS.every(b => p.missions[b]?.cleared) || p.best.streak >= 50;
    return this.bossBeaten(s.requires);
  },

  missionUnlocked(id) {
    const m = MISSION[id];
    if (m.kind === 'tutorial') return true;
    if (!this.systemUnlocked(m.system)) return false;
    const list = missionsOf(m.system);
    const i = list.findIndex(x => x.id === id);
    return i === 0 || !!Profile.get().missions[list[i - 1].id]?.cleared;
  },

  starsTotal() { return Object.values(Profile.get().missions).reduce((s, m) => s + (m.stars || 0), 0); },

  /** First mission not yet cleared — the "Continue" button. */
  nextMission() {
    for (const m of MISSIONS) if (this.missionUnlocked(m.id) && !Profile.get().missions[m.id]?.cleared) return m;
    return null;
  },

  rank() { return rankFor(Profile.get().xp); },

  starsFor(summary) {
    if (!summary.victory) return 0;
    if (summary.accuracy >= 85 && summary.impacts === 0) return 3;
    if (summary.accuracy >= 85) return 2;
    return 1;
  },

  /**
   * Apply a finished run. Returns a report for the debrief screen.
   * opts: { assist, creditsMult }
   */
  applyRun(summary, run, opts = {}) {
    const p = Profile.get();
    const report = { unlocks: [], achievements: [], masteryUps: [], revenants: { banished: 0, vanquished: 0, added: 0 } };
    const unlockedBefore = SYSTEMS.filter(s => this.systemUnlocked(s.id)).map(s => s.id);
    const rankBefore = rankFor(p.xp);
    const masteryBefore = Object.fromEntries(Object.keys(summary.skills).map(id => [id, Profile.mastery(id)]));

    // Lifetime + skills
    p.totalRuns++;
    p.lifetime.kills += summary.kills;
    p.lifetime.bossKills += summary.bossKills;
    p.lifetime.swarms += summary.swarms;
    p.lifetime.cleanBreaks += summary.cleanBreaks;
    p.lifetime.playSeconds += summary.survival;
    p.best.streak = Math.max(p.best.streak, summary.bestStreak);
    p.best.survival = Math.max(p.best.survival, summary.survival);
    for (const [id, s] of Object.entries(summary.skills)) {
      const agg = p.skills[id] || (p.skills[id] = { attempts: 0, correct: 0, timeouts: 0, totalMs: 0 });
      agg.attempts += s.attempts; agg.correct += s.correct; agg.timeouts += s.timeouts; agg.totalMs += s.totalMs;
    }
    for (const id of Object.keys(summary.skills)) {
      const before = masteryBefore[id], after = Profile.mastery(id);
      if (after - before >= 0.03) report.masteryUps.push({ id, label: SKILL_LABELS[id] || id, from: before, to: after });
    }
    report.masteryUps.sort((a, b) => (b.to - b.from) - (a.to - a.from));

    // Revenant Fleet
    for (const r of summary.revenantResults) {
      if (r.beaten) { report.revenants.banished++; if (Profile.revenantResult(r.key, true)) report.revenants.vanquished++; }
      else Profile.revenantResult(r.key, false);
    }
    for (const snap of summary.missed) { Profile.addRevenant(snap); report.revenants.added++; }

    // Stars, mission record, rewards
    let credits = Math.floor(summary.score / 80);
    const breakdown = [['Score', credits]];
    const stars = this.starsFor(summary);
    report.stars = stars;
    if (run.kind === 'mission' || run.kind === 'boss' || run.kind === 'tutorial') {
      const rec = p.missions[run.id] || (p.missions[run.id] = { cleared: false, stars: 0, best: 0, plays: 0 });
      rec.plays++;
      report.prevStars = rec.stars;
      report.prevBest = rec.best;
      rec.best = Math.max(rec.best, summary.score);
      if (summary.victory) {
        const first = !rec.cleared;
        rec.cleared = true;
        rec.stars = Math.max(rec.stars, stars);
        credits += stars * 40 + 60; breakdown.push(['Stars', stars * 40], ['Victory', 60]);
        if (first) {
          report.firstClear = true;
          credits += 150; breakdown.push(['First clear', 150]);
          const m = MISSION[run.id];
          const codex = m.rewards?.codex || CODEX_ON_CLEAR[run.id];
          if (codex && !p.codex.includes(codex)) { p.codex.push(codex); report.unlocks.push({ type: 'codex', id: codex }); }
          if (m.rewards?.crew && !p.crew.includes(m.rewards.crew)) {
            p.crew.push(m.rewards.crew); if (!p.crewOn) p.crewOn = m.rewards.crew;
            report.unlocks.push({ type: 'crew', id: m.rewards.crew });
          }
          if (m.rewards?.ship && !p.ships.includes(m.rewards.ship)) { p.ships.push(m.rewards.ship); report.unlocks.push({ type: 'ship', id: m.rewards.ship }); }
        }
      }
    }
    if (run.kind === 'endless') {
      report.prevBest = p.best.endlessScore;
      p.best.endlessScore = Math.max(p.best.endlessScore, summary.score);
      p.best.endlessSector = Math.max(p.best.endlessSector, summary.sector);
    }

    // Daily Galaxy
    if (run.kind === 'daily') {
      const today = dayKey();
      report.prevBest = p.daily.official[today]?.score ?? 0;
      if (!p.daily.official[today]) {
        report.dailyOfficial = true;
        p.daily.official[today] = { score: summary.score, rows: summary.shareRows };
        const yesterday = dayKey(new Date(Date.now() - 86400000));
        p.daily.streak = p.daily.lastDay === yesterday ? p.daily.streak + 1 : 1;
        p.daily.lastDay = today;
        p.daily.count++;
        credits += 150; breakdown.push(['Daily bonus', 150]);
        // keep 30 days
        const keys = Object.keys(p.daily.official).sort();
        while (keys.length > 30) delete p.daily.official[keys.shift()];
      }
      report.dailyStreak = p.daily.streak;
    }

    // Ghost (best run timeline per run id; the Daily uses one ghost for all days)
    const ghostKey = run.kind === 'daily' ? 'daily' : run.id;
    const ghost = p.ghosts[ghostKey];
    if (!ghost || summary.score > ghost.score) p.ghosts[ghostKey] = { score: summary.score, timeline: summary.timeline.slice(0, 600) };

    // XP & credits
    const xp = Math.floor(summary.score / 25) + summary.kills * 3 + (summary.victory ? 150 : 0);
    const mult = opts.creditsMult || 1;
    if (mult > 1) { const bonus = Math.round(credits * (mult - 1)); credits += bonus; breakdown.push(['Bounty Hunter', bonus]); }
    p.xp += xp;
    p.credits += credits;
    report.xp = xp; report.credits = credits; report.creditBreakdown = breakdown;
    report.rankBefore = rankBefore; report.rankAfter = rankFor(p.xp);

    // Achievements (+ codex cards tied to them)
    const runCtx = { ...summary, kind: run.kind, stars };
    for (const a of ACHIEVEMENTS) {
      if (p.achievements.includes(a.id)) continue;
      if (a.test(runCtx, p)) { p.achievements.push(a.id); p.credits += a.reward; report.achievements.push(a); }
    }
    if (p.achievements.includes('streak25') && !p.codex.includes('eleven')) { p.codex.push('eleven'); report.unlocks.push({ type: 'codex', id: 'eleven' }); }
    if (p.daily.count >= 3 && !p.codex.includes('divisibility')) { p.codex.push('divisibility'); report.unlocks.push({ type: 'codex', id: 'divisibility' }); }

    // Newly opened systems
    for (const s of SYSTEMS) if (!unlockedBefore.includes(s.id) && this.systemUnlocked(s.id)) report.unlocks.push({ type: 'system', id: s.id });

    p.history.push({
      date: new Date().toISOString(), kind: run.kind, runId: run.id, score: summary.score, sector: summary.sector,
      accuracy: summary.accuracy, avgMs: summary.avgMs, bestStreak: summary.bestStreak, survival: summary.survival,
      victory: summary.victory, assist: !!opts.assist,
    });
    if (p.history.length > 60) p.history.splice(0, p.history.length - 60);
    Profile.save();
    return report;
  },
};
