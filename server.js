/**
 * Tippspiel Backend (Node.js + Express + SQLite)
 * - API unter /api/*
 * - Statische Dateien werden aus demselben Ordner ausgeliefert
 * - Root '/' zeigt login.html (Gating)
 */
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));
app.get('/', (req,res)=> res.sendFile(path.join(__dirname, 'login.html')));

const PORT = process.env.PORT || 3001;
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-please';

const db = new Database('tippspiel.sqlite3');
db.pragma('journal_mode = WAL');

db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  team_a TEXT NOT NULL,
  code_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  code_b TEXT NOT NULL,
  kickoff TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('group','ko')),
  res_a INTEGER,
  res_b INTEGER,
  result_set_at TEXT
);
CREATE TABLE IF NOT EXISTS tips (
  user_id INTEGER NOT NULL,
  match_id TEXT NOT NULL,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(user_id, match_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE
);
`);

function seedMatches() {
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM matches").get();
  if (c > 0) return;
  const matches = [
    { id: 'm1', team_a: 'Deutschland', code_a: 'de', team_b: 'Brasilien',  code_b: 'br', kickoff: '2026-06-14T18:00:00Z', stage: 'group' },
    { id: 'm2', team_a: 'Frankreich',  code_a: 'fr', team_b: 'Argentinien',code_b: 'ar', kickoff: '2026-06-15T18:00:00Z', stage: 'group' },
    { id: 'm3', team_a: 'Portugal',    code_a: 'pt', team_b: 'Spanien',    code_b: 'es', kickoff: '2026-06-16T18:00:00Z', stage: 'group' },
    { id: 'm4', team_a: 'England',     code_a: 'gb', team_b: 'Italien',    code_b: 'it', kickoff: '2026-06-17T18:00:00Z', stage: 'group' },
    { id: 'm5', team_a: 'USA',         code_a: 'us', team_b: 'Mexiko',     code_b: 'mx', kickoff: '2026-06-18T18:00:00Z', stage: 'group' }
  ];
  const ins = db.prepare(`INSERT INTO matches (id, team_a, code_a, team_b, code_b, kickoff, stage) VALUES (@id,@team_a,@code_a,@team_b,@code_b,@kickoff,@stage)`);
  const tx = db.transaction(arr => arr.forEach(m => ins.run(m)));
  tx(matches);
}
seedMatches();

function nowUtcISO(){ return new Date().toISOString(); }
function hasStarted(k){ return new Date() >= new Date(k); }
function stageLabel(s){ return s === 'group' ? 'Gruppenphase' : 'K.O.-Phase'; }
function sign(n){ return n>0?1:n<0?-1:0; }
function computePoints(tipA, tipB, resA, resB, stage){
  const isGroup = stage === 'group';
  const base = isGroup ? 5 : 10;
  const diff = isGroup ? 3 : 6;
  const goalUnit = isGroup ? 1 : 2;
  let pts = 0;
  const tipDelta = tipA - tipB, resDelta = resA - resB;
  const tipOutcome = sign(tipDelta), resOutcome = sign(resDelta);
  if (tipOutcome === resOutcome) { pts += base; if (Math.abs(tipDelta) === Math.abs(resDelta)) pts += diff; }
  if (tipA === resA) pts += goalUnit; if (tipB === resB) pts += goalUnit;
  return pts;
}

// Auth helpers
function userFromToken(req){
  const auth = req.headers.authorization || ''; const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') { const token = parts[1]; const u = db.prepare("SELECT id,name,token FROM users WHERE token = ?").get(token); if (u) return u; }
  return null;
}
function requireAdmin(req,res,next){
  const key = req.headers['x-admin-key']; if (!key || key !== ADMIN_KEY) return res.status(401).json({ error:'Admin-Key ungültig' }); next();
}

// Routes
app.get('/api/ping', (req,res)=> res.json({ ok:true, time: nowUtcISO() }));

app.post('/api/register', (req,res) => {
  const name = (req.body?.name || '').trim().replace(/\s+/g,' ');
  if (!name || name.length<2 || name.length>30) return res.status(400).json({ error: 'Nickname 2–30 Zeichen' });
  try {
    let u = db.prepare("SELECT id,name,token FROM users WHERE name = ?").get(name);
    if (u) return res.json(u);
    const token = crypto.randomBytes(24).toString('hex');
    const info = db.prepare("INSERT INTO users (name, token) VALUES (?,?)").run(name, token);
    u = { id: info.lastInsertRowid, name, token };
    res.json(u);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Registration fehlgeschlagen' }); }
});

app.get('/api/matches', (req,res) => {
  const rows = db.prepare("SELECT * FROM matches ORDER BY kickoff ASC").all();
  res.json(rows.map(m => ({ id:m.id, teamA:m.team_a, codeA:m.code_a, teamB:m.team_b, codeB:m.code_b, kickoff:m.kickoff, stage:m.stage, stageLabel:stageLabel(m.stage),
    started: hasStarted(m.kickoff), result: (m.res_a!=null && m.res_b!=null) ? { a:m.res_a, b:m.res_b } : null })));
});

app.get('/api/my-tips', (req,res) => {
  const user = userFromToken(req); if (!user) return res.status(401).json({ error:'Unauthorized' });
  const rows = db.prepare("SELECT match_id AS matchId, score_a AS scoreA, score_b AS scoreB FROM tips WHERE user_id = ?").all(user.id);
  res.json(rows);
});

app.post('/api/tips', (req,res) => {
  const user = userFromToken(req); if (!user) return res.status(401).json({ error:'Unauthorized' });
  const { matchId, scoreA, scoreB } = req.body || {};
  if (!matchId || !Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA<0 || scoreB<0) return res.status(400).json({ error:'Ungültige Daten' });
  const m = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId); if (!m) return res.status(404).json({ error:'Match nicht gefunden' });
  if (hasStarted(m.kickoff)) return res.status(403).json({ error:'Tipp gesperrt (Match hat begonnen)' });
  db.prepare("INSERT INTO tips (user_id, match_id, score_a, score_b) VALUES (?,?,?,?) ON CONFLICT(user_id,match_id) DO UPDATE SET score_a=excluded.score_a, score_b=excluded.score_b, updated_at=datetime('now')").run(user.id, matchId, scoreA, scoreB);
  res.json({ ok:true });
});

app.get('/api/leaderboard', (req,res) => {
  const users = db.prepare("SELECT id,name FROM users ORDER BY name ASC").all();
  const rows = db.prepare(`SELECT u.id AS user_id, u.name, m.id AS match_id, m.stage, m.res_a AS resA, m.res_b AS resB, t.score_a AS tipA, t.score_b AS tipB
                           FROM users u LEFT JOIN tips t ON t.user_id = u.id LEFT JOIN matches m ON m.id = t.match_id
                           WHERE m.res_a IS NOT NULL AND m.res_b IS NOT NULL`).all();
  const totals = new Map(); users.forEach(u => totals.set(u.id, { userId:u.id, name:u.name, points:0, tips:0, exact:0, winners:0 }));
  function sign(n){ return n>0?1:n<0?-1:0; }
  for (const r of rows){ if (r.tipA==null || r.tipB==null || r.resA==null || r.resB==null) continue;
    const isGroup = r.stage==='group'; const base=isGroup?5:10; const diff=isGroup?3:6; const goal=isGroup?1:2;
    let pts=0; const tipD=r.tipA-r.tipB, resD=r.resA-r.resB; if (Math.sign(tipD)===Math.sign(resD)) {{ pts+=base; if (Math.abs(tipD)===Math.abs(resD)) pts+=diff; }}
    if (r.tipA===r.resA) pts+=goal; if (r.tipB===r.resB) pts+=goal;
    const ent=totals.get(r.user_id); ent.points+=pts; ent.tips+=1; if (Math.sign(tipD)===Math.sign(resD)) ent.winners+=1; if (r.tipA===r.resA && r.tipB===r.resB) ent.exact+=1;
  }
  let arr = Array.from(totals.values()); arr.sort((a,b)=> b.points-a.points || b.exact-a.exact || b.winners-a.winners || a.name.localeCompare(b.name));
  let last=null, rank=0, shown=0; arr.forEach(row=>{{ shown++; if(last===null || row.points<last){{ rank=shown; last=row.points; }} row.rank=rank; }});
  res.json(arr);
});

app.get('/api/admin/matches', requireAdmin, (req,res) => {
  const rows = db.prepare("SELECT * FROM matches ORDER BY kickoff ASC").all();
  res.json(rows.map(m => ({ id:m.id, teamA:m.team_a, codeA:m.code_a, teamB:m.team_b, codeB:m.code_b, kickoff:m.kickoff, stage:m.stage, stageLabel:stageLabel(m.stage),
    result: (m.res_a!=null && m.res_b!=null) ? { a:m.res_a, b:m.res_b } : null })));
});
app.post('/api/admin/results', requireAdmin, (req,res) => {
  const { matchId, resA, resB } = req.body || {};
  if (!matchId || !Number.isInteger(resA) || !Number.isInteger(resB) || resA<0 || resB<0) return res.status(400).json({ error:'Ungültige Daten' });
  const m = db.prepare("SELECT id FROM matches WHERE id = ?").get(matchId); if (!m) return res.status(404).json({ error:'Match nicht gefunden' });
  db.prepare("UPDATE matches SET res_a=?, res_b=?, result_set_at=? WHERE id=?").run(resA, resB, nowUtcISO(), matchId);
  res.json({ ok:true });
});

app.listen(PORT, () => console.log(`Tippspiel läuft auf http://localhost:${PORT}`));
