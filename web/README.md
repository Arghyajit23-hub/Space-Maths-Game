# Space Math

> Think fast. Survive longer.

A competitive space survival game where the player's cognitive skills decide how far they get. Asteroids and alien ships dive toward your fighter, each carrying a calculation. Type the answer and your laser fires the instant it's right. Answer slowly and they get closer. Miss, and your hull takes the hit.

The learning is built into the game loop. Players don't see "questions". They see threats, streaks, multipliers, bosses and a rival to overtake.

---

## The gameplay loop

1. **Threats descend** from the top of the screen. How close a threat is to your ship shows how much time you have left, so you can always see the pressure building.
2. **Type the answer** to any visible threat. It fires automatically once the digits are right, so you don't press Enter. The most urgent threat is auto-targeted and shown large in the console.
3. **Wrong answer:** −8 hull and your streak resets. **Impact** (a threat reaches you): −34 hull, and the correct answer flashes on screen. That flash is where the learning happens.
4. **Streak multiplier:** ×2 at 5 hits, ×3 at 10, ×4 at 20, ×5 at 35. The ship, lasers and soundtrack all change color and intensity as it climbs.
5. **Bonuses:** *BLAZING* (answered within the first 35% of the time, +50%) and *CLUTCH* (answered in the last moment).
6. **Repair drone** every 10-streak (+15 hull). Good play lets you recover from a bad run.
7. **Sectors:** after 10 / 12 / 14 … kills a **Mothership** arrives. Each correct answer knocks it back. Destroy it to earn a sector bonus and a hull repair, then warp to the next sector (new colors, new skills, faster threats).
8. **Chase:** the HUD always shows the next leaderboard rival to pass and your personal best. You get a *NEW PERSONAL BEST* moment mid-run.
9. **Debrief:** the end screen shows score, galactic rank, sector reached, survival time, accuracy, average answer time, best streak, your **sharpest skill**, the skill to **train next**, and one concrete goal for the next run. Press Enter to relaunch immediately.

### Difficulty curve (ages 10–14)

| Sector | New skills unlocked |
|---|---|
| 1 · Asteroid Belt | Addition, subtraction, times tables to 10×10 |
| 2 · Ion Nebula | Division facts, doubles & halves |
| 3 · Pulsar Fields | 2-digit × 1-digit (`17 × 8`), missing numbers (`▢ × 7 = 56`), percentages (`15% of 240`), squares |
| 4 · Void Rift | Square roots, fractions of amounts (`3/4 of 60`), order of operations |
| 5 · Dark Star | Negative numbers, adding fractions (`1/2 + 1/4 = ▢/4`) |
| 6+ · Quasar Core … | Powers, 2-digit × 2-digit; sectors loop with ever-faster timing |

When a skill first unlocks it appears more often in that sector. Older skills keep coming back so players get spaced review. Harder variants turn up two sectors after a skill unlocks.

**Adaptive "heat"**: fast, accurate players get faster threats and more hard variants. Players who are struggling get more time and one fewer threat on screen at once. Everyone stays challenged without being crushed. The first three threats of every run are a gentle warm-up.

All balance numbers live in **`public/js/config.js`**.

---

## Controls

| Input | Action |
|---|---|
| Digits / `-` | Type an answer (fires automatically when correct) |
| `Enter` | Force-fire the current input |
| `Backspace` | Delete a digit · `Space` clears the input |
| `Esc` / `P` | Pause (the game also pauses automatically when the tab loses focus) |
| `M` | Sound on/off |
| `Enter` / `R` on the debrief | Instant relaunch |

On phones and tablets a large on-screen numpad appears, and threats are kept clear of it.

---

## Quick start

Needs Node.js 18+. There are no dependencies to install.

```bash
cd web
npm start               # http://localhost:3000
npm test                # sanity-checks every challenge generator
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
- **Hardening.** Security headers and a strict Content-Security-Policy, a 4 KB body limit, directory-traversal protection, atomic leaderboard writes and graceful shutdown on `SIGTERM`.
- **Fast delivery.** Static files are gzip-compressed and cached in memory. HTML/JS/CSS revalidate on every load, so a redeploy reaches players immediately.

Scores are still submitted by the browser, so a determined player can forge one. That's fine for a casual game. For school competitions, add a class code plus server-side run verification.

---

## Architecture

```
web/
├── server.js                  static files + leaderboard API (zero deps, production-hardened)
├── Dockerfile · docker-compose.yml
├── test/challenges.test.mjs   generator correctness tests
└── public/
    ├── index.html             markup only
    ├── favicon.svg · robots.txt
    ├── css/style.css          HUD, console, screens
    └── js/
        ├── main.js            boot, screen flow, input, HUD binding, render loop
        ├── config.js          ALL tuning numbers, sectors, multiplier tiers
        ├── challenges/
        │   ├── index.js       challenge-source registry + interface contract
        │   └── math.js        Rapid Calculation source (16 skills)
        ├── game/
        │   ├── game.js        world simulation (threats, boss, hull, phases) — no DOM
        │   ├── director.js    difficulty & pacing (sectors + adaptive heat)
        │   ├── session.js     score + per-answer cognitive telemetry
        │   └── render.js      canvas drawing (cached nebula, additive particles)
        └── services/
            ├── audio.js       procedural Web Audio + speech
            ├── profile.js     local profile: bests, per-skill stats, run history
            └── leaderboard.js server API client (fails silently offline)
```

**The key extension point is the challenge source.** The engine never knows what kind of challenge it is running. It asks the director for the next challenge, shows `prompt`, and calls `check(input)`, which returns `'correct' | 'partial' | 'wrong'`. Every answer is logged with a `skill` id and response time.

### Adding future features

| Feature | Where it plugs in |
|---|---|
| **Memory / logic-pattern / reaction challenges** | New file in `challenges/` implementing `{ id, label, input, next(ctx) }`, then `registerSource()` it. Mix modes through `new Director({ math: .6, memory: .4 })`. Non-numeric inputs (`choice`, `sequence`, `tap`) need a matching input panel in `main.js`. |
| **Daily missions** | Evaluate goals against `Session` (kills, streak, per-skill counts) at game over. The debrief's "next goal" is the prototype for this. |
| **Leaderboards per mode / class** | The API already stores `mode`, `sector`, `accuracy`, `bestStreak`, `survival`. `GET /api/leaderboard?mode=math` filters by mode. Add a `room`/`classCode` field the same way. |
| **Progression / upgrades** | `Profile` already tracks lifetime stats and runs. Spend them on ship upgrades that change `CONFIG` values (hull max, repair amount, multiplier tiers). |
| **Parent reports** | `Profile.skills` holds lifetime attempts, correct answers, timeouts and total response time for every skill, and `Profile.history` has the last 50 runs. A report page only needs to read these (or sync them to the server). |
| **School competitions** | Combine a room code on the leaderboard with a fixed seed/sector start so every student gets comparable runs. |

---

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/leaderboard?mode=math` | GET | Top scores (optionally filtered by mode), sorted descending |
| `/api/leaderboard` | POST | `{ name, score, mode, sector, accuracy, bestStreak, survival }`. Every field is sanitised and clamped, and the name is moderated. The top 100 are kept per mode. Returns `422` for an implausible score and `429` when rate-limited. |
| `/api/health` | GET | `{ status: 'ok', entries }` |

| Env var | Default | Description |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `DATA_DIR` | `./data` | Leaderboard JSON location (use persistent storage) |
| `MAX_ENTRIES` | `100` | Scores kept per mode |

---

**Author:** Arghyajit Nayak · **License:** MIT
