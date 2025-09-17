// api/routes/heatmap.js
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

// Hämta min/max för defence strength per kontext
function computeDefenceRanges(teams) {
  const valsHome = [];
  const valsAway = [];
  for (const t of teams) {
    const h = num(t.strength_defence_home) ?? num(t.strength_overall_home) ?? num(t.strength) ?? 3;
    const a = num(t.strength_defence_away) ?? num(t.strength_overall_away) ?? num(t.strength) ?? 3;
    valsHome.push(h); valsAway.push(a);
  }
  return {
    minHome: Math.min(...valsHome),
    maxHome: Math.max(...valsHome),
    minAway: Math.min(...valsAway),
    maxAway: Math.max(...valsAway),
  };
}

// Linjär mappning x∈[min,max] → FDR∈[1,5] med halva steg
function mapToFdr(x, min, max) {
  if (!Number.isFinite(x) || !Number.isFinite(min) || !Number.isFinite(max) || min === max) return 3;
  const t = (x - min) / (max - min); // 0..1
  const fdr = 1 + t * 4;             // 1..5
  return Math.max(1, Math.min(5, Math.round(fdr * 2) / 2));
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * GET /fixtures/heatmap?horizon=5
 * Returnerar per lag: FDR (1–5, halva steg) för varje GW i horisonten + snitt.
 * (Offensiv “svårighet” baserat på motståndarens försvar, normaliserat mot ligan)
 */
router.get("/", async (req, res) => {
  try {
    const horizon = Math.max(1, Math.min(10, Number(req.query.horizon) || 5));

    const bootstrap = JSON.parse(await readFile(resolve(DATA_DIR, "bootstrap.json"), "utf-8"));
    const fixtures  = JSON.parse(await readFile(resolve(DATA_DIR, "fixtures.json"),  "utf-8"));

    const teams  = bootstrap.teams || [];
    const events = bootstrap.events || [];
    const teamsById = Object.fromEntries(teams.map(t => [t.id, t]));

    const currentEvent =
      events.find(e => e.is_current) ??
      events.find(e => e.is_next) ??
      events[0];
    const currentGW = currentEvent?.id ?? 1;

    const { minHome, maxHome, minAway, maxAway } = computeDefenceRanges(teams);

    // Mål-GWs
    const targetGWs = Array.from({ length: horizon }, (_, i) => currentGW + i);

    // teamId -> gw -> fdr
    const table = {};
    for (const t of teams) table[t.id] = {};

    for (const f of fixtures) {
      const gw = f.event;
      if (!gw || !targetGWs.includes(gw)) continue;

      const homeId = f.team_h;
      const awayId = f.team_a;
      const oppHome = teamsById[homeId];
      const oppAway = teamsById[awayId];

      // För HOME-laget: motståndaren är AWAY → använd deras defence_away
      const defAway = num(teamsById[awayId]?.strength_defence_away) ??
                      num(teamsById[awayId]?.strength_overall_away) ??
                      num(teamsById[awayId]?.strength) ?? 3;

      // För AWAY-laget: motståndaren är HOME → använd deras defence_home
      const defHome = num(teamsById[homeId]?.strength_defence_home) ??
                      num(teamsById[homeId]?.strength_overall_home) ??
                      num(teamsById[homeId]?.strength) ?? 3;

      // Normalisera till FDR 1..5 i respektive kontext
      const fdrForHomeTeam = mapToFdr(defAway, minAway, maxAway); // hur svagt/starkt är bortaförsvaret vi möter
      const fdrForAwayTeam = mapToFdr(defHome, minHome, maxHome); // hur svagt/starkt är hemmaförsvaret vi möter

      // Liten hemma-bonus: anfalla hemma är lite enklare → -0.2 (klampas senare av mappen redan rondad)
      const homeAdj = Math.max(1, Math.min(5, Math.round((fdrForHomeTeam - 0.2) * 2) / 2));
      const awayAdj = Math.max(1, Math.min(5, Math.round((fdrForAwayTeam) * 2) / 2));

      table[homeId][gw] = homeAdj;
      table[awayId][gw] = awayAdj;
    }

    // Fyll rader
    const rows = teams.map(t => {
      const row = { teamId: t.id, team: t.name, gw: {}, avg: null };
      let sum = 0, cnt = 0;
      for (const gw of targetGWs) {
        const val = table[t.id][gw] ?? 3; // default neutral om ingen fixture markerad
        row.gw[gw] = val;
        sum += val; cnt++;
      }
      row.avg = Math.round((sum / cnt) * 10) / 10;
      return row;
    }).sort((a, b) => a.avg - b.avg); // lägst snitt (lättast) först

    res.json({ ok: true, currentGW, horizon, teams: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build heatmap" });
  }
});

export default router;