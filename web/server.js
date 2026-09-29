// ════════════════════════════════════════════════════════════════
//  Space Math — production game server (zero dependencies)
//
//  • Serves the game from ./public (gzip, cache headers, security headers)
//  • Shared leaderboard API with validation, name moderation,
//    score plausibility checks and per-IP rate limiting
//
//  Run:  node server.js
//  Env:  PORT (3000) · DATA_DIR (./data) · MAX_ENTRIES (100)
// ════════════════════════════════════════════════════════════════

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT        = parseInt(process.env.PORT, 10) || 3000;
const DATA_DIR    = process.env.DATA_DIR || path.join(__dirname, 'data');
const LB_FILE     = path.join(DATA_DIR, 'leaderboard.json');
const MAX_ENTRIES = parseInt(process.env.MAX_ENTRIES, 10) || 100;
const PUBLIC      = path.join(__dirname, 'public');
// Boards: 'endless' (Deep Space, all-time) and 'daily' (per UTC day). v1 'math' entries load as 'endless'.
const DAILY_KEEP_DAYS = 30;

// ────────────────────────────────────────────
//  Leaderboard persistence (atomic writes)
// ────────────────────────────────────────────
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadLeaderboard() {
  try {
    const data = JSON.parse(fs.readFileSync(LB_FILE, 'utf-8'));
    return Array.isArray(data)
      ? data.filter(e => e && typeof e.score === 'number').map(e => ({ ...e, mode: e.mode === 'daily' ? 'daily' : 'endless' }))
      : [];
  } catch { return []; }
}

function saveLeaderboard() {
  const tmp = `${LB_FILE}.tmp`;
  fs.writeFile(tmp, JSON.stringify(leaderboard, null, 2), err => {
    if (err) return console.error('Leaderboard save failed:', err.message);
    fs.rename(tmp, LB_FILE, e => e && console.error('Leaderboard rename failed:', e.message));
  });
}

let leaderboard = loadLeaderboard();

// ────────────────────────────────────────────
//  Name moderation — this is a game for students, names are public.
//  Normalises leetspeak/spacing, then checks a blocklist.
// ────────────────────────────────────────────
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };
// Matched anywhere inside the normalised name
const BLOCK_ANYWHERE = [
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'bastard', 'asshole', 'penis', 'vagina',
  'porn', 'sex', 'rape', 'nigg', 'fagg', 'retard', 'hitler', 'nazi', 'kkk', 'isis', 'jihad', 'terror',
  'chutiya', 'madarchod', 'bhenchod', 'behenchod', 'bhosd', 'gandu', 'randi', 'harami', 'kamina', 'lauda', 'lawda',
];
// Matched only as the whole name (too short / common to match inside other words)
const BLOCK_EXACT = ['ass', 'fag', 'cum', 'tit', 'tits', 'lund', 'lodu', 'suck', 'kill', 'die'];

function normalise(s) {
  return s.toLowerCase().replace(/[0134578@$!]/g, c => LEET[c] ?? c).replace(/[^a-z]/g, '');
}

function cleanName(raw) {
  // Printable characters only, collapse whitespace, 16 chars max
  let name = String(raw ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const n = normalise(name);
  if (!name || !n && !/\d/.test(name)) return `Pilot ${1000 + Math.floor(Math.random() * 9000)}`;
  if (BLOCK_ANYWHERE.some(w => n.includes(w)) || BLOCK_EXACT.includes(n)) {
    return `Pilot ${1000 + Math.floor(Math.random() * 9000)}`;
  }
  return name;
}

// ────────────────────────────────────────────
//  Score validation
// ────────────────────────────────────────────
const clampInt = (v, min, max) => Math.min(max, Math.max(min, Math.floor(Number(v) || 0)));

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

/** Fleet (class / school) code: 3–8 letters or digits, moderated. Empty = none. */
function cleanFleet(raw) {
  const f = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (f.length < 3) return '';
  const n = normalise(f);
  if (BLOCK_ANYWHERE.some(w => n.includes(w)) || BLOCK_EXACT.includes(n)) return '';
  return f;
}

function validate(p) {
  const score = clampInt(p.score, 0, 50_000_000);
  const survival = clampInt(p.survival, 0, 86_400);
  // Generous ceiling on points-per-second — blocks obviously forged submissions
  if (score > 5000 + survival * 8000) return null;
  const mode = p.mode === 'daily' ? 'daily' : 'endless';
  const entry = {
    name: cleanName(p.name),
    score, mode,
    sector: clampInt(p.sector, 1, 999),
    accuracy: clampInt(p.accuracy, 0, 100),
    bestStreak: clampInt(p.bestStreak, 0, 100_000),
    survival,
    date: new Date().toISOString(),
  };
  const fleet = cleanFleet(p.fleet);
  if (fleet) entry.fleet = fleet;
  if (mode === 'daily') {
    // Only today's (or yesterday's / tomorrow's, for time zones) Daily Galaxy is accepted
    if (!DAY_RE.test(p.day) || ![today(-1), today(), today(1)].includes(p.day)) return null;
    entry.day = p.day;
  }
  return entry;
}

function addScore(entry) {
  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);
  const counts = {};
  const oldest = today(-DAILY_KEEP_DAYS);
  leaderboard = leaderboard.filter(e => {
    if (e.mode === 'daily' && e.day < oldest) return false;
    const k = e.mode === 'daily' ? `daily:${e.day}` : 'endless';
    counts[k] = (counts[k] || 0) + 1;
    return counts[k] <= MAX_ENTRIES;
  });
  saveLeaderboard();
}

function board(q) {
  const mode = q.get('mode') === 'daily' ? 'daily' : 'endless';
  const fleet = cleanFleet(q.get('fleet'));
  const day = DAY_RE.test(q.get('day') || '') ? q.get('day') : today();
  return leaderboard
    .filter(e => e.mode === mode && (mode !== 'daily' || e.day === day) && (!fleet || e.fleet === fleet))
    .slice(0, MAX_ENTRIES);
}

// ────────────────────────────────────────────
//  Rate limiting (per IP, in memory)
// ────────────────────────────────────────────
const RATE = { windowMs: 10 * 60 * 1000, max: 30 };
const hits = new Map();
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? String(fwd).split(',')[0] : req.socket.remoteAddress || '').trim();
}
function rateLimited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > RATE.windowMs) { hits.set(ip, { start: now, n: 1 }); return false; }
  return ++h.n > RATE.max;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, h] of hits) if (now - h.start > RATE.windowMs) hits.delete(ip);
}, 60_000).unref();

// ────────────────────────────────────────────
//  HTTP helpers
// ────────────────────────────────────────────
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",   // inline style attributes only; scripts stay strict
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; '),
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
  res.end(JSON.stringify(body));
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.webmanifest']);

// Static file cache: path → { raw, gz, mtime }
const cache = new Map();
function readStatic(file, cb) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return cb(err || new Error('not a file'));
    const hit = cache.get(file);
    if (hit && hit.mtime === st.mtimeMs) return cb(null, hit);
    fs.readFile(file, (e, raw) => {
      if (e) return cb(e);
      const ext = path.extname(file).toLowerCase();
      const entry = { raw, gz: COMPRESSIBLE.has(ext) ? zlib.gzipSync(raw) : null, mtime: st.mtimeMs };
      cache.set(file, entry);
      cb(null, entry);
    });
  });
}

// ────────────────────────────────────────────
//  Server
// ────────────────────────────────────────────
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { return json(res, 400, { error: 'Bad request' }); }
  const query = new URL(req.url, 'http://x').searchParams;

  // ── API ──
  if (pathname === '/api/health') return json(res, 200, { status: 'ok', entries: leaderboard.length });

  if (pathname === '/api/leaderboard') {
    if (req.method === 'GET') return json(res, 200, board(query));
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    if (rateLimited(clientIp(req))) return json(res, 429, { error: 'Too many submissions — try again later' });

    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; if (body.length > 4096) { json(res, 413, { error: 'Too large' }); req.destroy(); } });
    req.on('end', () => {
      if (res.headersSent) return;
      let payload;
      try { payload = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
      if (!payload || typeof payload !== 'object') return json(res, 400, { error: 'Invalid payload' });
      const entry = validate(payload);
      if (!entry) return json(res, 422, { error: 'Score rejected' });
      addScore(entry);
      json(res, 200, board(new URLSearchParams({ mode: entry.mode, ...(entry.day ? { day: entry.day } : {}) })));
    });
    return;
  }

  if (pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });

  // ── Static files ──
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end();
  }
  const rel = pathname === '/' ? '/index.html' : pathname;
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }

  readStatic(file, (err, entry) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    const useGz = entry.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    const bodyBuf = useGz ? entry.gz : entry.raw;
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': bodyBuf.length,
      // HTML/JS/CSS revalidate every load so deploys show up immediately
      'Cache-Control': ['.html', '.js', '.css'].includes(ext) ? 'no-cache' : 'public, max-age=86400',
      'Last-Modified': new Date(entry.mtime).toUTCString(),
      ...(useGz ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {}),
      ...SECURITY_HEADERS,
    });
    res.end(req.method === 'HEAD' ? undefined : bodyBuf);
  });
});

server.listen(PORT, () => console.log(`Space Math running on http://localhost:${PORT}`));

// Graceful shutdown (Docker / PaaS send SIGTERM on redeploy)
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
