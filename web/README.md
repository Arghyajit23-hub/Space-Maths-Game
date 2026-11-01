# Space Math

> Earth, 2047. Every answer is a round.

A story-driven maths survival game for students aged 10–14 where **calculation, memory, logic and self-control** decide whether Earth survives a meteor swarm. The learning is hidden inside the game systems: a fracturing meteor teaches decomposition, a debris cluster teaches equivalent expressions, a tracking ping trains working memory, a green supply shuttle trains inhibition, your past mistakes come back as **returning fragments** (spaced repetition), and limited **munitions** make accuracy matter more than guessing.

**The complete design, with every number, is in [`docs/FLOWMAP.md`](../docs/FLOWMAP.md).** This README covers how to run, deploy and extend it.

---

## What's in the game

| Area | What the player gets |
|---|---|
| **Opening: "The Dreaming Mind"** | Every visit starts in a dark neural web asking *WHO ARE YOU?* New pilots then get the full opening: a short film (a vault of cryo pods, their own sleeping body in pod 07·114 with their name on it, the frost melting, the eye dreaming), a conversation with **Vyom**, the program's architect, inside their rebuilding mind, one real equation to prove their mind is intact, and a first-person awakening as the pod opens into Flight School. Returning pilots go straight to their Command Deck. Replay it from Settings or Intel Files. |
| **Story: "The Swarm"** | 6 chapters with opening and ending scenes, a briefing card before every mission, in-run radio chatter and a finale. Cast: Vyom (who stays as a HUD icon and speaks at every supply drop), Commander Aisha Rao, Dr. Kenji Mori and rookie gunner "Spark". Scenes can be replayed from the Defense Map, Settings and Intel Files. |
| **Munitions** | Each wave issues a fixed number of rounds. A correct answer uses one, a BLAZING answer recovers it, and a wrong answer wastes it. An empty magazine holds your answer until an emergency round arrives (one every 2.5 s). The debrief shows munitions efficiency. Off in Flight School and Assist mode. |
| **Command Deck** | Hub with Continue (next mission, with the city it defends), Today's Wave, The Long Watch, Defense Map, Hangar, Brain Map, Intel Files, Records, Settings, Parent Zone and Earth Status. It also shows "Day N of the Swarm". Every tile has a keyboard shortcut. |
| **Defense Map** | 6 chapters and 22 missions: First Light, The Shattering, Blackout, Heavy Iron, Decoys and the hidden Heart of the Swarm. Each mission defends a city and earns 1–3 stars. Each chapter ends with a **planet-killer** that awards a crew member, an intel file and the chapter's ending scene. |
| **Meteors** | Stony, iron, fracturing, debris cluster, dark, tracking ping, ice-crusted, twin track (press 1 or 2), supply shuttle (don't shoot!), returning fragment, and the **Nemesis planet-killer**, which is built from your weakest skills. |
| **Supply drops** | Pick 1 of 3 upgrades after every planet-killer, from 14 stackable perks such as Prime Hunter, Chain Lightning, Munitions Factory and Recycler. Vyom sends one line each time, chosen by how the wave went. |
| **Today's Wave** | A seeded run, identical for everyone. The first attempt of the day is ranked and gives a Wordle-style emoji result to share, plus a daily streak 🔥. |
| **The Long Watch** | Endless waves with a global leaderboard and a "next rival to pass" tracker. |
| **Progression** | XP and 10 ranks (Cadet to Defender of Earth, then Legend), credits, 5 ships with different play styles, 5 crew members, engine trails, 20 achievements and 16 intel files. |
| **Brain Map** | A constellation with one star per skill that brightens with mastery, plus a shareable **Pilot DNA** archetype. |
| **Ghost race** | The HUD shows how far you are ahead of or behind your own best run. |
| **Fleets** | A class or school code shared by students gives them their own leaderboard. |
| **Parent Zone** | Behind a gate: weekly report with week-on-week trends, a skill table, printing and data export. |
| **Pilots** | Several pilots can share one device: each name typed at *WHO ARE YOU?* keeps its own progress, and saved pilots appear there as tap-to-wake names. |
| **Settings** | Sound, voice, reduced motion, Assist mode (+30% time, unlimited munitions, unranked), replay the opening, switch pilot, and callsign. |
| **Any screen** | The play field reshapes to the window: no letterbox bars, a bottom numpad on phones held upright, stacked menus on small screens, notch-safe. |

## Controls

| Input | Action |
|---|---|
| Digits / `-` | Type an answer. It fires automatically when correct. |
| `1` / `2` | Answer twin tracks (which is bigger? true/false?) |
| `Enter` | Force-fire the current input |
| `Backspace` · `Space` | Delete a digit · clear the input |
| `Esc` / `P` | Pause (auto-pauses when the tab loses focus) · `Q` to abandon while paused |
| `1` `2` `3` | Choose a supply-drop upgrade |
| Opening: type a name · `Enter` | Wake as that pilot (or tap a saved name) |
| Opening: `Enter` / `Space` / `→` / tap · `Esc` | Next line (finishes forming it first) · skip (appears after 3 s; also skips the film) |
| Opening test: digits · `Enter` | Answer Vyom's equation (the on-screen numpad's ✓ works too) |
| Story: `Enter` / `Space` / `→` · `Esc` | Next line (finishes the typing first) · skip; on a briefing `Esc` jumps to the card, then back to the deck |
| `M` | Sound on/off |
| Deck: `Enter` `D` `E` `G` `H` `B` `C` `R` | Continue · Today's Wave · The Long Watch · Defense Map · Hangar · Brain · Intel Files · Records |
| Debrief: `Enter` · `N` · `Esc` | Retry · next mission · Command Deck |
| Any menu: `Esc` | Back to the Command Deck (works even while typing in a text box) |

Phones and tablets get an on-screen numpad: along the bottom when held upright, on the right in landscape. Meteors keep clear of it.

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

- **Boards.** The Long Watch (`mode=endless`, all time), Today's Wave (`mode=daily`, per UTC day; only today's, yesterday's or tomorrow's date is accepted; kept 30 days) and Fleet boards filtered by a moderated class code.

Scores are still submitted by the browser, so a determined player can forge one. That's fine for a casual game. Because runs are deterministic from a seed, the server can later replay-verify them for school competitions.

---

## Architecture

```
docs/FLOWMAP.md                 master flowmap — story + design source of truth
web/
├── server.js                   static files + leaderboards (zero deps, hardened)
├── test/challenges.test.mjs    generator + determinism tests
└── public/
    ├── index.html · css/style.css (HUD, adaptive layouts) · css/hub.css (menus, story, briefing, radio)
    │   · css/dream.css (the opening, the film, Vyom's HUD icon and supply-drop line)
    └── js/
        ├── main.js             fit-to-screen, router, opening flow (Void → film → dream → wake), chapters, briefings, run launching,
        │                       HUD + munitions + radio binding, input, render loop
        ├── config.js           every balance number + VIEW (adaptive play-field geometry)
        ├── core/               rng.js (seeded runs) · util.js (helpers, safe storage)
        ├── challenges/         index.js registry · math.js · logic.js · memory.js · common.js
        ├── data/               story (opening script, Vyom's lines, cast, chapters, briefings, cities, radio) · galaxy (chapters + missions)
        │                       perks · ships (ships, crew, trails) · codex (intel files) · achievements · ranks
        ├── game/               game.js (simulation, munitions, radio events) · director.js (pacing, Nemesis)
        │                       session.js (telemetry) · render.js (meteors, Earth, planet-killer, story art)
        ├── services/           profile (pilot roster, one save per pilot, story flags, revenants, mastery)
        │                       progression (rewards, stars) · leaderboard · insights (Pilot DNA, parent report)
        │                       audio (procedural sound, incl. the dream drone and film effects)
        └── ui/                 dream.js (the Void, Vyom's conversation, the test, the shatter)
                                cinema.js (the cold-open film + first-person wake) · cinema-art.js (the sleeper in the pod)
                                hub.js (menu screens) · story.js (story player) · debrief.js · dom.js
```

**Story names vs code names.** Players see story names; the code keeps the original identifiers so saves and leaderboards stay compatible: chapter = `system` (`arith`, `fraction`, `memory`, `power`, `logic`, `singularity`), wave = `sector`, planet-killer = `boss`, supply drop = perk draft (`perks`), intel file = `codex`, returning fragment = `revenant`, The Long Watch = `endless`, Today's Wave = `daily`. Meteor ids are listed in [FLOWMAP §3](../docs/FLOWMAP.md#3-threat-catalogue-gamejs-renderjs). When you add content, write the player-facing text in story terms and keep the ids.

**Design rules that keep it extensible**

- **The engine never knows what a challenge is.** A challenge source returns `{ prompt, answer, check(), skill, time, value, choice?, reveal?, parts? }`. To add a mode (for example spatial reasoning or word problems), write a source in `challenges/`, add it to `SOURCES`, and reference its skill ids from a mission in `data/galaxy.js`.
- **All content is data.** Missions, perks, ships, crew, intel files, achievements and all story text (`data/story.js`: `DREAM`, `VYOM_LINES`, `CAST`, `CHAPTERS`, `BRIEFINGS`, `CITIES`, `RADIO`) are plain objects in `data/`, so adding a chapter, a briefing or a perk doesn't touch the engine. A story line is `{ who, text }`; `{name}` becomes the player's callsign.
- **Story progress is just flags** in `profile.seen` (`intro`, `open_<system>`, `end_<system>`, plus `vyomHeard`, the last 12 supply-drop lines), so scenes play once and can be replayed.
- **The opening is drawn in code.** The dreamspace and the film are canvas; the sleeper is one SVG (`cinema-art.js`) rasterised once per film. There are no image or audio files to load.
- **Never hard-code the screen size.** Read `VIEW.W`, `VIEW.H`, `VIEW.shipY`, `VIEW.impactY`, `VIEW.fieldMinX/MaxX` and `VIEW.top` (FLOWMAP §12). CSS uses the `#game` classes `.v-narrow`, `.v-tall`, `.v-compact` and the `--safe-*` insets, not media queries.
- **Runs are deterministic from a seed** (`core/rng.js`, per-event reseeding). That is how Today's Wave is fair, and it's the base for duels, replays and server-side verification.
- **Each pilot is one JSON object** (`Profile.export()`), stored as `sm_pilot_<name>` and listed in the roster `sm_pilots_v1`, ready to sync to accounts later.
- **Every answer is logged** with its skill and response time, which feeds mastery, the Nemesis planet-killer, returning fragments, the Brain Map and the Parent Zone.

**Testing and debugging.** Open the game with `?debug` (http://localhost:3000/?debug) to get `window.__game` and `window.__app` in the console: e.g. `__app.launch('1-B')` (briefing → run), `__app.chapter('memory')`, `__app.intro(() => __app.go('deck'), { full: true })` (the whole opening, film included), `__app.go('galaxy')`, or `__game.ammo = 1`. Browser bots (Playwright) can read `__game.target.challenge.answer` and type it to play through runs. Reset the current pilot from the Parent Zone; to start completely fresh, clear localStorage (`sm_pilots_v1` and the `sm_pilot_*` keys).

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/leaderboard?mode=endless[&fleet=CODE]` | GET | The Long Watch board (optionally filtered by fleet) |
| `/api/leaderboard?mode=daily&day=YYYY-MM-DD` | GET | Today's Wave board for a day (default today, UTC) |
| `/api/leaderboard` | POST | `{ name, score, mode, day?, fleet?, sector, accuracy, bestStreak, survival }`. Every field is sanitised, and names and fleet codes are moderated. Returns `422` for an implausible score or wrong day, and `429` when rate-limited. |
| `/api/health` | GET | `{ status: 'ok', entries }` |

| Env var | Default | Description |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `DATA_DIR` | `./data` | Leaderboard JSON location (use persistent storage) |
| `MAX_ENTRIES` | `100` | Scores kept per board |

## Roadmap

The next phases (accounts and cloud save, Classroom Armada, teacher dashboard, parent email reports, subscriptions and school licences, duels, weekly leagues) are specified in [`docs/FLOWMAP.md` §13](../docs/FLOWMAP.md#13-roadmap-beyond-this-build-).

---

**Author:** Arghyajit Nayak · **License:** AGPL-3.0, with a separate commercial license (see the root [README](../README.md#license))
