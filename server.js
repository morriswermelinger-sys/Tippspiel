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
    /* ===================== GROUP STAGE (72) ===================== */
  /* ================= GROUP A ================= */
  { "id":"A1","team_a":"Mexiko","code_a":"mx","team_b":"Südafrika","code_b":"za","kickoff":"2026-06-11T21:00:00+02:00","stage":"group" },
  { "id":"A2","team_a":"Südkorea","code_a":"kr","team_b":"Playoff-D","code_b":"pd","kickoff":"2026-06-12T04:00:00+02:00","stage":"group" },
  { "id":"A3","team_a":"Playoff-D","code_a":"pd","team_b":"Südafrika","code_b":"za","kickoff":"2026-06-18T18:00:00+02:00","stage":"group" },
  { "id":"A4","team_a":"Mexiko","code_a":"mx","team_b":"Südkorea","code_b":"kr","kickoff":"2026-06-19T03:00:00+02:00","stage":"group" },
  { "id":"A5","team_a":"Playoff-D","code_a":"pd","team_b":"Mexiko","code_b":"mx","kickoff":"2026-06-25T03:00:00+02:00","stage":"group" },
  { "id":"A6","team_a":"Südafrika","code_a":"za","team_b":"Südkorea","code_b":"kr","kickoff":"2026-06-25T03:00:00+02:00","stage":"group" },

  /* ================= GROUP B ================= */
  { "id":"B1","team_a":"Kanada","code_a":"ca","team_b":"Playoff-A","code_b":"pa","kickoff":"2026-06-12T21:00:00+02:00","stage":"group" },
  { "id":"B2","team_a":"Katar","code_a":"qa","team_b":"Schweiz","code_b":"ch","kickoff":"2026-06-13T21:00:00+02:00","stage":"group" },
  { "id":"B3","team_a":"Schweiz","code_a":"ch","team_b":"Playoff-A","code_b":"pa","kickoff":"2026-06-18T21:00:00+02:00","stage":"group" },
  { "id":"B4","team_a":"Kanada","code_a":"ca","team_b":"Katar","code_b":"qa","kickoff":"2026-06-19T00:00:00+02:00","stage":"group" },
  { "id":"B5","team_a":"Schweiz","code_a":"ch","team_b":"Kanada","code_b":"ca","kickoff":"2026-06-24T21:00:00+02:00","stage":"group" },
  { "id":"B6","team_a":"Playoff-A","code_a":"pa","team_b":"Katar","code_b":"qa","kickoff":"2026-06-24T21:00:00+02:00","stage":"group" },

  /* ================= GROUP C ================= */
  { "id":"C1","team_a":"Brasilien","code_a":"br","team_b":"Marokko","code_b":"ma","kickoff":"2026-06-14T00:00:00+02:00","stage":"group" },
  { "id":"C2","team_a":"Haiti","code_a":"ht","team_b":"Schottland","code_b":"gb","kickoff":"2026-06-14T03:00:00+02:00","stage":"group" },
  { "id":"C3","team_a":"Schottland","code_a":"gb","team_b":"Marokko","code_b":"ma","kickoff":"2026-06-20T00:00:00+02:00","stage":"group" },
  { "id":"C4","team_a":"Brasilien","code_a":"br","team_b":"Haiti","code_b":"ht","kickoff":"2026-06-20T03:00:00+02:00","stage":"group" },
  { "id":"C5","team_a":"Schottland","code_a":"gb","team_b":"Brasilien","code_b":"br","kickoff":"2026-06-25T00:00:00+02:00","stage":"group" },
  { "id":"C6","team_a":"Marokko","code_a":"ma","team_b":"Haiti","code_b":"ht","kickoff":"2026-06-25T00:00:00+02:00","stage":"group" },

  /* ================= GROUP D ================= */
  { "id":"D1","team_a":"USA","code_a":"us","team_b":"Paraguay","code_b":"py","kickoff":"2026-06-13T03:00:00+02:00","stage":"group" },
  { "id":"D2","team_a":"Australien","code_a":"au","team_b":"Playoff-C","code_b":"pc","kickoff":"2026-06-14T06:00:00+02:00","stage":"group" },
  { "id":"D3","team_a":"USA","code_a":"us","team_b":"Australien","code_b":"au","kickoff":"2026-06-19T21:00:00+02:00","stage":"group" },
  { "id":"D4","team_a":"Playoff-C","code_a":"pc","team_b":"Paraguay","code_b":"py","kickoff":"2026-06-20T06:00:00+02:00","stage":"group" },
  { "id":"D5","team_a":"Playoff-C","code_a":"pc","team_b":"USA","code_b":"us","kickoff":"2026-06-26T04:00:00+02:00","stage":"group" },
  { "id":"D6","team_a":"Paraguay","code_a":"py","team_b":"Australien","code_b":"au","kickoff":"2026-06-26T04:00:00+02:00","stage":"group" },

  /* ================= GROUP E ================= */
  { "id":"E1","team_a":"Deutschland","code_a":"de","team_b":"Curaçao","code_b":"cw","kickoff":"2026-06-14T19:00:00+02:00","stage":"group" },
  { "id":"E2","team_a":"Elfenbeinküste","code_a":"ci","team_b":"Ecuador","code_b":"ec","kickoff":"2026-06-15T01:00:00+02:00","stage":"group" },
  { "id":"E3","team_a":"Deutschland","code_a":"de","team_b":"Elfenbeinküste","code_b":"ci","kickoff":"2026-06-20T22:00:00+02:00","stage":"group" },
  { "id":"E4","team_a":"Ecuador","code_a":"ec","team_b":"Curaçao","code_b":"cw","kickoff":"2026-06-21T02:00:00+02:00","stage":"group" },
  { "id":"E5","team_a":"Curaçao","code_a":"cw","team_b":"Elfenbeinküste","code_b":"ci","kickoff":"2026-06-25T22:00:00+02:00","stage":"group" },
  { "id":"E6","team_a":"Ecuador","code_a":"ec","team_b":"Deutschland","code_b":"de","kickoff":"2026-06-25T22:00:00+02:00","stage":"group" },

  /* ================= GROUP F ================= */
  { "id":"F1","team_a":"Niederlande","code_a":"nl","team_b":"Japan","code_b":"jp","kickoff":"2026-06-14T22:00:00+02:00","stage":"group" },
  { "id":"F2","team_a":"Playoff-B","code_a":"pb","team_b":"Tunesien","code_b":"tn","kickoff":"2026-06-15T04:00:00+02:00","stage":"group" },
  { "id":"F3","team_a":"Niederlande","code_a":"nl","team_b":"Playoff-B","code_b":"pb","kickoff":"2026-06-20T19:00:00+02:00","stage":"group" },
  { "id":"F4","team_a":"Tunesien","code_a":"tn","team_b":"Japan","code_b":"jp","kickoff":"2026-06-21T06:00:00+02:00","stage":"group" },
  { "id":"F5","team_a":"Japan","code_a":"jp","team_b":"Playoff-B","code_b":"pb","kickoff":"2026-06-26T01:00:00+02:00","stage":"group" },
  { "id":"F6","team_a":"Tunesien","code_a":"tn","team_b":"Niederlande","code_b":"nl","kickoff":"2026-06-26T01:00:00+02:00","stage":"group" },

  /* ================= GROUP G ================= */
  { "id":"G1","team_a":"Belgien","code_a":"be","team_b":"Ägypten","code_b":"eg","kickoff":"2026-06-15T21:00:00+02:00","stage":"group" },
  { "id":"G2","team_a":"Iran","code_a":"ir","team_b":"Neuseeland","code_b":"nz","kickoff":"2026-06-16T03:00:00+02:00","stage":"group" },
  { "id":"G3","team_a":"Belgien","code_a":"be","team_b":"Iran","code_b":"ir","kickoff":"2026-06-21T21:00:00+02:00","stage":"group" },
  { "id":"G4","team_a":"Neuseeland","code_a":"nz","team_b":"Ägypten","code_b":"eg","kickoff":"2026-06-22T03:00:00+02:00","stage":"group" },
  { "id":"G5","team_a":"Ägypten","code_a":"eg","team_b":"Iran","code_b":"ir","kickoff":"2026-06-27T05:00:00+02:00","stage":"group" },
  { "id":"G6","team_a":"Neuseeland","code_a":"nz","team_b":"Belgien","code_b":"be","kickoff":"2026-06-27T05:00:00+02:00","stage":"group" },

  /* ================= GROUP H ================= */
  { "id":"H1","team_a":"Spanien","code_a":"es","team_b":"Kap Verde","code_b":"cv","kickoff":"2026-06-15T18:00:00+02:00","stage":"group" },
  { "id":"H2","team_a":"Saudi-Arabien","code_a":"sa","team_b":"Uruguay","code_b":"uy","kickoff":"2026-06-16T00:00:00+02:00","stage":"group" },
  { "id":"H3","team_a":"Spanien","code_a":"es","team_b":"Saudi-Arabien","code_b":"sa","kickoff":"2026-06-21T18:00:00+02:00","stage":"group" },
  { "id":"H4","team_a":"Uruguay","code_a":"uy","team_b":"Kap Verde","code_b":"cv","kickoff":"2026-06-22T00:00:00+02:00","stage":"group" },
  { "id":"H5","team_a":"Kap Verde","code_a":"cv","team_b":"Saudi-Arabien","code_b":"sa","kickoff":"2026-06-27T02:00:00+02:00","stage":"group" },
  { "id":"H6","team_a":"Uruguay","code_a":"uy","team_b":"Spanien","code_b":"es","kickoff":"2026-06-27T02:00:00+02:00","stage":"group" },

  /* ================= GROUP I ================= */
  { "id":"I1","team_a":"Frankreich","code_a":"fr","team_b":"Senegal","code_b":"sn","kickoff":"2026-06-16T21:00:00+02:00","stage":"group" },
  { "id":"I2","team_a":"Playoff-Sieger","code_a":"px","team_b":"Norwegen","code_b":"no","kickoff":"2026-06-17T00:00:00+02:00","stage":"group" },
  { "id":"I3","team_a":"Frankreich","code_a":"fr","team_b":"Playoff-Sieger","code_b":"px","kickoff":"2026-06-22T23:00:00+02:00","stage":"group" },
  { "id":"I4","team_a":"Norwegen","code_a":"no","team_b":"Senegal","code_b":"sn","kickoff":"2026-06-23T02:00:00+02:00","stage":"group" },
  { "id":"I5","team_a":"Norwegen","code_a":"no","team_b":"Frankreich","code_b":"fr","kickoff":"2026-06-26T21:00:00+02:00","stage":"group" },
  { "id":"I6","team_a":"Senegal","code_a":"sn","team_b":"Playoff-Sieger","code_b":"px","kickoff":"2026-06-26T21:00:00+02:00","stage":"group" },

  /* ================= GROUP J ================= */
  { "id":"J1","team_a":"Argentinien","code_a":"ar","team_b":"Algerien","code_b":"dz","kickoff":"2026-06-17T03:00:00+02:00","stage":"group" },
  { "id":"J2","team_a":"Österreich","code_a":"at","team_b":"Jordanien","code_b":"jo","kickoff":"2026-06-17T06:00:00+02:00","stage":"group" },
  { "id":"J3","team_a":"Argentinien","code_a":"ar","team_b":"Österreich","code_b":"at","kickoff":"2026-06-22T19:00:00+02:00","stage":"group" },
  { "id":"J4","team_a":"Jordanien","code_a":"jo","team_b":"Algerien","code_b":"dz","kickoff":"2026-06-23T05:00:00+02:00","stage":"group" },
  { "id":"J5","team_a":"Algerien","code_a":"dz","team_b":"Österreich","code_b":"at","kickoff":"2026-06-28T04:00:00+02:00","stage":"group" },
  { "id":"J6","team_a":"Jordanien","code_a":"jo","team_b":"Argentinien","code_b":"ar","kickoff":"2026-06-28T04:00:00+02:00","stage":"group" },

  /* ================= GROUP K ================= */
  { "id":"K1","team_a":"England","code_a":"gb","team_b":"Kroatien","code_b":"hr","kickoff":"2026-06-17T22:00:00+02:00","stage":"group" },
  { "id":"K2","team_a":"Ghana","code_a":"gh","team_b":"Panama","code_b":"pa","kickoff":"2026-06-18T01:00:00+02:00","stage":"group" },
  { "id":"K3","team_a":"England","code_a":"gb","team_b":"Ghana","code_b":"gh","kickoff":"2026-06-23T22:00:00+02:00","stage":"group" },
  { "id":"K4","team_a":"Panama","code_a":"pa","team_b":"Kroatien","code_b":"hr","kickoff":"2026-06-24T01:00:00+02:00","stage":"group" },
  { "id":"K5","team_a":"Panama","code_a":"pa","team_b":"England","code_b":"gb","kickoff":"2026-06-27T23:00:00+02:00","stage":"group" },
  { "id":"K6","team_a":"Kroatien","code_a":"hr","team_b":"Ghana","code_b":"gh","kickoff":"2026-06-27T23:00:00+02:00","stage":"group" },
  
  /* ================= GROUP L ================= */
  { "id":"L1","team_a":"England","code_a":"gb","team_b":"Kroatien","code_b":"hr","kickoff":"2026-06-17T22:00:00+02:00","stage":"group" },
  { "id":"L2","team_a":"Ghana","code_a":"gh","team_b":"Panama","code_b":"pa","kickoff":"2026-06-18T01:00:00+02:00","stage":"group" },
  { "id":"L3","team_a":"England","code_a":"gb","team_b":"Ghana","code_b":"gh","kickoff":"2026-06-23T22:00:00+02:00","stage":"group" },
  { "id":"L4","team_a":"Panama","code_a":"pa","team_b":"Kroatien","code_b":"hr","kickoff":"2026-06-24T01:00:00+02:00","stage":"group" },
  { "id":"L5","team_a":"Panama","code_a":"pa","team_b":"England","code_b":"gb","kickoff":"2026-06-27T23:00:00+02:00","stage":"group" },
  { "id":"L6","team_a":"Kroatien","code_a":"hr","team_b":"Ghana","code_b":"gh","kickoff":"2026-06-27T23:00:00+02:00","stage":"group" },

    /* To keep chat usable, the pattern below repeats exactly */

    /* ===================== ROUND OF 32 (16) ===================== */
  { "id":"R32-1","team_a":"Zweiter Gruppe A","code_a":"tbd","team_b":"Zweiter Gruppe B","code_b":"tbd","kickoff":"2026-06-28T21:00:00+02:00","stage":"ko" },
  { "id":"R32-2","team_a":"Erster Gruppe C","code_a":"tbd","team_b":"Zweiter Gruppe F","code_b":"tbd","kickoff":"2026-06-29T19:00:00+02:00","stage":"ko" },
  { "id":"R32-3","team_a":"Erster Gruppe E","code_a":"tbd","team_b":"Dritter Gruppe A/B/C/D/F","code_b":"tbd","kickoff":"2026-06-29T22:30:00+02:00","stage":"ko" },
  { "id":"R32-4","team_a":"Erster Gruppe F","code_a":"tbd","team_b":"Zweiter Gruppe C","code_b":"tbd","kickoff":"2026-06-30T03:00:00+02:00","stage":"ko" },
  { "id":"R32-5","team_a":"Zweiter Gruppe E","code_a":"tbd","team_b":"Zweiter Gruppe I","code_b":"tbd","kickoff":"2026-06-30T19:00:00+02:00","stage":"ko" },
  { "id":"R32-6","team_a":"Erster Gruppe I","code_a":"tbd","team_b":"Dritter Gruppe C/D/F/G/H","code_b":"tbd","kickoff":"2026-06-30T23:00:00+02:00","stage":"ko" },
  { "id":"R32-7","team_a":"Erster Gruppe A","code_a":"tbd","team_b":"Dritter Gruppe C/E/F/H/I","code_b":"tbd","kickoff":"2026-07-01T03:00:00+02:00","stage":"ko" },
  { "id":"R32-8","team_a":"Erster Gruppe L","code_a":"tbd","team_b":"Dritter Gruppe E/H/I/J/K","code_b":"tbd","kickoff":"2026-07-01T18:00:00+02:00","stage":"ko" },
  { "id":"R32-9","team_a":"Erster Gruppe G","code_a":"tbd","team_b":"Dritter Gruppe A/E/H/I/J","code_b":"tbd","kickoff":"2026-07-01T22:00:00+02:00","stage":"ko" },
  { "id":"R32-10","team_a":"Erster Gruppe D","code_a":"tbd","team_b":"Dritter Gruppe B/E/F/I/J","code_b":"tbd","kickoff":"2026-07-02T02:00:00+02:00","stage":"ko" },
  { "id":"R32-11","team_a":"Erster Gruppe H","code_a":"tbd","team_b":"Zweiter Gruppe J","code_b":"tbd","kickoff":"2026-07-02T21:00:00+02:00","stage":"ko" },
  { "id":"R32-12","team_a":"Zweiter Gruppe K","code_a":"tbd","team_b":"Zweiter Gruppe L","code_b":"tbd","kickoff":"2026-07-03T01:00:00+02:00","stage":"ko" },
  { "id":"R32-13","team_a":"Erster Gruppe B","code_a":"tbd","team_b":"Dritter Gruppe E/F/G/I/J","code_b":"tbd","kickoff":"2026-07-03T05:00:00+02:00","stage":"ko" },
  { "id":"R32-14","team_a":"Zweiter Gruppe D","code_a":"tbd","team_b":"Zweiter Gruppe G","code_b":"tbd","kickoff":"2026-07-03T20:00:00+02:00","stage":"ko" },
  { "id":"R32-15","team_a":"Erster Gruppe J","code_a":"tbd","team_b":"Zweiter Gruppe H","code_b":"tbd","kickoff":"2026-07-04T00:00:00+02:00","stage":"ko" },
  { "id":"R32-16","team_a":"Erster Gruppe K","code_a":"tbd","team_b":"Dritter Gruppe D/E/I/J/L","code_b":"tbd","kickoff":"2026-07-04T03:30:00+02:00","stage":"ko" },

    /* ===================== ROUND OF 16 (8) ===================== */
  { "id":"R16-1",  "team_a":"Sieger R32-1",  "code_a":"tbd", "team_b":"Sieger R32-4",  "code_b":"tbd", "kickoff":"2026-07-04T19:00:00+02:00", "stage":"ko" },
  { "id":"R16-2",  "team_a":"Sieger R32-3",  "code_a":"tbd", "team_b":"Sieger R32-6",  "code_b":"tbd", "kickoff":"2026-07-04T23:00:00+02:00", "stage":"ko" },
  { "id":"R16-3",  "team_a":"Sieger R32-2",  "code_a":"tbd", "team_b":"Sieger R32-5",  "code_b":"tbd", "kickoff":"2026-07-05T22:00:00+02:00", "stage":"ko" },
  { "id":"R16-4",  "team_a":"Sieger R32-7",  "code_a":"tbd", "team_b":"Sieger R32-8",  "code_b":"tbd", "kickoff":"2026-07-06T02:00:00+02:00", "stage":"ko" },
  { "id":"R16-5",  "team_a":"Sieger R32-12", "code_a":"tbd", "team_b":"Sieger R32-11", "code_b":"tbd", "kickoff":"2026-07-06T21:00:00+02:00", "stage":"ko" },
  { "id":"R16-6",  "team_a":"Sieger R32-10", "code_a":"tbd", "team_b":"Sieger R32-9",  "code_b":"tbd", "kickoff":"2026-07-07T02:00:00+02:00", "stage":"ko" },
  { "id":"R16-7",  "team_a":"Sieger R32-15", "code_a":"tbd", "team_b":"Sieger R32-14", "code_b":"tbd", "kickoff":"2026-07-07T18:00:00+02:00", "stage":"ko" },
  { "id":"R16-8",  "team_a":"Sieger R32-13", "code_a":"tbd", "team_b":"Sieger R32-16", "code_b":"tbd", "kickoff":"2026-07-07T22:00:00+02:00", "stage":"ko" },

      /* ===================== QUARTERFINALS (4) ===================== */
  { "id":"R8-1", "team_a":"Sieger R16-2", "code_a":"tbd", "team_b":"Sieger R16-1", "code_b":"tbd", "kickoff":"2026-07-09T22:00:00+02:00", "stage":"ko" },
  { "id":"R8-2", "team_a":"Sieger R16-5", "code_a":"tbd", "team_b":"Sieger R16-6", "code_b":"tbd", "kickoff":"2026-07-10T21:00:00+02:00", "stage":"ko" },
  { "id":"R8-3", "team_a":"Sieger R16-3", "code_a":"tbd", "team_b":"Sieger R16-4", "code_b":"tbd", "kickoff":"2026-07-11T23:00:00+02:00", "stage":"ko" },
  { "id":"R8-4", "team_a":"Sieger R16-7", "code_a":"tbd", "team_b":"Sieger R16-8", "code_b":"tbd", "kickoff":"2026-07-12T03:00:00+02:00", "stage":"ko" },

      /* ===================== SEMIFINALS (2) ===================== */
  { "id":"R4-1", "team_a":"Sieger R8-1", "code_a":"tbd", "team_b":"Sieger R8-2", "code_b":"tbd", "kickoff":"2026-07-14T21:00:00+02:00", "stage":"ko" },
  { "id":"R4-2", "team_a":"Sieger R8-3", "code_a":"tbd", "team_b":"Sieger R8-4", "code_b":"tbd", "kickoff":"2026-07-15T21:00:00+02:00", "stage":"ko" },

    /* ===================== FINALS ===================== */
   { "id":"R3-1", "team_a":"Verlierer R4-1", "code_a":"tbd", "team_b":"Verlierer R4-2", "code_b":"tbd", "kickoff":"2026-07-18T23:00:00+02:00", "stage":"ko" },
   { "id":"R2-1", "team_a":"Sieger R4-1",    "code_a":"tbd", "team_b":"Sieger R4-2",    "code_b":"tbd", "kickoff":"2026-07-19T21:00:00+02:00", "stage":"ko" },
  ]
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

app.post('/api/admin/match-teams', requireAdmin, (req,res) => {
  const { matchId, teamA, codeA, teamB, codeB } = req.body || {};
  const cleanName = (s) => (s || '').trim().replace(/\s+/g,' ');
  const ta = cleanName(teamA);
  const tb = cleanName(teamB);
  const ca = (codeA || '').trim().toLowerCase();
  const cb = (codeB || '').trim().toLowerCase();
  if (!matchId || !ta || !tb) return res.status(400).json({ error:'Ungültige Daten' });
  if (ta.length < 2 || tb.length < 2 || ta.length > 60 || tb.length > 60) return res.status(400).json({ error:'Teamnamen 2–60 Zeichen' });
  if (!/^[a-z]{2}$/.test(ca) || !/^[a-z]{2}$/.test(cb)) return res.status(400).json({ error:'Flag-Code muss 2 Buchstaben sein (z.B. de, pt, gb)' });
  const m = db.prepare("SELECT id FROM matches WHERE id = ?").get(matchId); if (!m) return res.status(404).json({ error:'Match nicht gefunden' });
  db.prepare("UPDATE matches SET team_a=?, code_a=?, team_b=?, code_b=? WHERE id=?").run(ta, ca, tb, cb, matchId);
  res.json({ ok:true });
});


app.listen(PORT, () => console.log(`Tippspiel läuft auf http://localhost:${PORT}`));
