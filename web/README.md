# Space Math

> Think fast. Survive longer.

A competitive space survival game for students aged 10–14 where **calculation, memory, logic and self-control** decide how far you get. The learning is hidden inside the game systems: a Splitter crystal teaches decomposition, a Swarm teaches equivalent expressions, a Beacon trains working memory, a green Ally ship trains inhibition, and your own past mistakes come back as the **Revenant Fleet** (spaced repetition).

**The complete design, with every number, is in [`docs/FLOWMAP.md`](../docs/FLOWMAP.md).** This README covers how to run, deploy and extend it.

---

## What's in the game

| Area | What the player gets |
|---|---|
| **Command Deck** | Hub with Continue (next mission), Daily Galaxy, Deep Space, Galaxy Map, Hangar, Brain Map, Codex, Records, Settings, Parent Zone and Revenant status. Every tile has a keyboard shortcut. |
| **Galaxy Map** | 6 star systems and 22 missions: Arithmetic Belt, Fraction Nebula, Memory Void, Power Core, Logic Expanse and the hidden Singularity. There are 1–3 stars per mission, and each system ends with a **Dreadnought** boss that awards a crew member and a Codex card. |
| **Threats** | Asteroid, Saucer, Splitter, Swarm, Cloaked, Beacon, Shield bearer, Mirror (press 1 or 2), Ally (don't shoot!), Revenant and the **Nemesis Mothership**, which is built from your weakest skills. |
| **Roguelite perks** | Pick 1 of 3 after every Mothership, from 12 stackable perks such as Prime Hunter, Nine Lives, Overclock and Chain Lightning. |
| **Daily Galaxy** | A seeded run, identical for everyone. The first attempt of the day is ranked and gives a Wordle-style emoji result to share, plus a daily streak 🔥. |
| **Deep Space** | Endless mode with a global leaderboard and a "next rival to pass" tracker. |
| **Progression** | XP and 10 ranks (then Legend), credits, 5 ships with different play styles, 5 crew members, engine trails, 20 achievements and 16 Codex trick cards. |
| **Brain Map** | A constellation with one star per skill that brightens with mastery, plus a shareable **Pilot DNA** archetype. |
| **Ghost race** | The HUD shows how far you are ahead of or behind your own best run. |
| **Fleets** | A class or school code shared by students gives them their own leaderboard. |
| **Parent Zone** | Behind a gate: weekly report with week-on-week trends, a skill table, printing and data export. |
| **Settings** | Sound, voice, reduced motion, Assist mode (+30% time, unranked) and callsign. |

## Controls

| Input | Action |
|---|---|
| Digits / `-` | Type an answer. It fires automatically when correct. |
| `1` / `2` | Answer Mirror threats (which is bigger? true/false?) |
| `Enter` | Force-fire the current input |
| `Backspace` · `Space` | Delete a digit · clear the input |
| `Esc` / `P` | Pause (auto-pauses when the tab loses focus) · `Q` to abandon while paused |
| `1` `2` `3` | Choose a perk |
| `M` | Sound on/off |
| Deck: `Enter` `D` `E` `G` `H` `B` `C` `R` | Continue · Daily · Deep Space · Galaxy · Hangar · Brain · Codex · Records |
| Debrief: `Enter` · `N` · `Esc` | Retry · next mission · Command Deck |

Phones and tablets get an on-screen numpad, and threats keep clear of it.

---

## Quick start

Needs Node.js 18+. There are no dependencies to install.

```bash
cd web
npm start               # http://localhost:3000
npm test                # checks every challenge generator (22 skills) and seeded-run determinism
```

The game uses ES modules, so it must be served over HTTP rather than opened as a `file://` URL.

---

## Deploying online

The server is a single zero-dependency Node process that serves the game and stores the leaderboard in `DATA_DIR/leaderboard.json`. **Give `DATA_DIR` persistent storage**, or the leaderboard resets on every redeploy.

**Docker / any VPS**

```bash
cd web
docker compose up -d --build        # port 3000, leaderboard in the "leaderboard" volume
```

**Render / Railway / Fly.io / Cloud Run**: point the service at the `web/` folder (or use the repo-root `package.json`, which runs `web/server.js`), start command `npm start`, and mount a persistent disk/volume at `/app/data` (Docker) or set `DATA_DIR` to the mounted path. The platform's `PORT` is picked up automatically. The health check is `GET /api/health`.

Put it behind HTTPS (every platform above does this for you). One instance only: the leaderboard is a JSON file, not a shared database.

### What the server does for you in production

- **Name moderation.** Leaderboard names are public and the players are students, so names are normalised (leetspeak, spacing, symbols) and checked against a blocklist of profanity, slurs and hate references in English and Hindi. Blocked names are replaced with `Pilot 1234`. Extend `BLOCK_ANYWHERE` / `BLOCK_EXACT` in `server.js`.
- **Score sanity check.** A submission scoring more than the game can produce in the reported survival time is rejected (`422`).
- **Rate limiting.** At most 30 score submissions per IP per 10 minutes (`429`).
- **Hardening.** Security headers and a Content-Security-Policy (scripts from this site only), a 4 KB body limit, directory-traversal protection, atomic leaderboard writes and graceful shutdown on `SIGTERM`.
- **Fast delivery.** Static files are gzip-compressed and cached in memory. HTML/JS/CSS revalidate on every load, so a redeploy reaches players immediately.

- **Boards.** Deep Space (all time), the Daily Galaxy (per UTC day; only today's, yesterday's or tomorrow's date is accepted; kept 30 days) and Fleet boards filtered by a moderated class code.

Scores are still submitted by the browser, so a determined player can forge one. That's fine for a casual game. Because runs are deterministic from a seed, the server can later replay-verify them for school competitions.

---

## Architecture

```
docs/FLOWMAP.md                 master flowmap — the design source of truth
web/
├── server.js                   static files + leaderboards (zero deps, hardened)
├── test/challenges.test.mjs    generator + determinism tests
└── public/
    ├── index.html · css/style.css (HUD) · css/hub.css (menus)
    └── js/
        ├── main.js             router, run launching, HUD binding, input, render loop
        ├── config.js           every balance number
        ├── core/               rng.js (seeded runs) · util.js (helpers, safe storage)
        ├── challenges/         index.js registry · math.js · logic.js · memory.js · common.js
        ├── data/               galaxy · perks · ships (ships, crew, trails) · codex · achievements · ranks
        ├── game/               game.js (simulation) · director.js (pacing, Nemesis) · session.js (telemetry) · render.js
        ├── services/           profile (local save, revenants, mastery) · progression (rewards, unlocks)
        │                       leaderboard · insights (Pilot DNA, parent report) · audio
        └── ui/                 hub.js (all menu screens) · debrief.js · dom.js
```

**Design rules that keep it extensible**

- **The engine never knows what a challenge is.** A challenge source returns `{ prompt, answer, check(), skill, time, value, choice?, reveal?, parts? }`. To add a mode (for example spatial reasoning or word problems), write a source in `challenges/`, add it to `SOURCES`, and reference its skill ids from a mission in `data/galaxy.js`.
- **All content is data.** Missions, perks, ships, crew, codex cards and achievements are plain arrays in `data/`, so adding a system or a perk doesn't touch the engine.
- **Runs are deterministic from a seed** (`core/rng.js`, per-event reseeding). That is how the Daily Galaxy is fair, and it's the base for duels, replays and server-side verification.
- **The profile is one JSON object** (`Profile.export()`), ready to sync to accounts later.
- **Every answer is logged** with its skill and response time, which feeds mastery, the Nemesis boss, Revenants, the Brain Map and the Parent Zone.

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/leaderboard?mode=endless[&fleet=CODE]` | GET | Deep Space board (optionally filtered by fleet) |
| `/api/leaderboard?mode=daily&day=YYYY-MM-DD` | GET | Daily Galaxy board for a day (default today, UTC) |
| `/api/leaderboard` | POST | `{ name, score, mode, day?, fleet?, sector, accuracy, bestStreak, survival }`. Every field is sanitised, and names and fleet codes are moderated. Returns `422` for an implausible score or wrong day, and `429` when rate-limited. |
| `/api/health` | GET | `{ status: 'ok', entries }` |

| Env var | Default | Description |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `DATA_DIR` | `./data` | Leaderboard JSON location (use persistent storage) |
| `MAX_ENTRIES` | `100` | Scores kept per board |

## Roadmap

The next phases (accounts and cloud save, Classroom Armada, teacher dashboard, parent email reports, subscriptions and school licences, duels, weekly leagues) are specified in [`docs/FLOWMAP.md` §12](../docs/FLOWMAP.md#12-roadmap-beyond-this-build-).

---

**Author:** Arghyajit Nayak · **License:** MIT
