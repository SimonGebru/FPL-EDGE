// api/routes/congestion.js
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /teams/congestion
 * Query:
 *  - horizonDays: default 14
 *  - restPenalty: default 1.5  (poäng per back-to-back (<3 dygn vila))
 *  - basePerGame: default 2    (poäng per match inom horisonten)
 *  - includeGaps: "1"          (inkludera restGaps-listan i svaret)
 *
 * Svar per lag:
 *  - matches, backToBacks, congestionScore
 *  - firstMatch, lastMatch (ISO)
 *  - avgRestDays (2 dec)
 *  - restGaps: number[] (dagar mellan matcher, bara om includeGaps=1)
 */
router.get("/", async (req, res) => {
  try {
    const horizonDays = Number(req.query.horizonDays) || 14;
    const restPenalty = Number(req.query.restPenalty) || 1.5;
    const basePerGame = Number(req.query.basePerGame) || 2;
    const includeGaps = String(req.query.includeGaps || "") === "1";

    const bootstrap = JSON.parse(await readFile(resolve(DATA_DIR, "bootstrap.json"), "utf-8"));
    const fixtures  = JSON.parse(await readFile(resolve(DATA_DIR, "fixtures.json"), "utf-8"));
    const events = bootstrap.events || [];
    const teams  = bootstrap.teams  || [];

    const currentEvent =
      events.find(e => e.is_current) ??
      events.find(e => e.is_next) ??
      events[0];
    const currentGW = currentEvent?.id ?? 1;

    const now = Date.now();
    const horizon = now + horizonDays * 24 * 3600 * 1000;

    // Kommande PL-matcher inom horisonten
    const up = fixtures
      .filter(f => !f.finished)
      .map(f => ({ ...f, ts: f.kickoff_time ? new Date(f.kickoff_time).getTime() : null }))
      .filter(f => f.ts && f.ts >= now && f.ts <= horizon);

    // teamId -> sorterade matchtider
    const byTeam = {};
    for (const t of teams) byTeam[t.id] = [];
    for (const f of up) {
      byTeam[f.team_h].push(f.ts);
      byTeam[f.team_a].push(f.ts);
    }
    for (const id in byTeam) byTeam[id].sort((a, b) => a - b);

    const toDays = (ms) => ms / (24 * 3600 * 1000);

    const rows = Object.entries(byTeam).map(([id, times]) => {
      const team = teams.find(t => t.id === Number(id));
      const matches = times.length;

      // Räkna vilodagar mellan matcher
      const gaps = [];
      for (let i = 1; i < times.length; i++) {
        gaps.push(toDays(times[i] - times[i - 1]));
      }

      // back-to-backs med < 3 dagars vila
      const backToBacks = gaps.filter(d => d < 3).length;

      // congestion score
      const congestionScore = matches * basePerGame + backToBacks * restPenalty;

      // metadata
      const firstMatch = matches ? new Date(times[0]).toISOString() : null;
      const lastMatch  = matches ? new Date(times[times.length - 1]).toISOString() : null;
      const avgRestDays = gaps.length ? Math.round((gaps.reduce((s, d) => s + d, 0) / gaps.length) * 100) / 100 : null;

      const base = {
        teamId: Number(id),
        team: team?.name || `Team ${id}`,
        matches,
        backToBacks,
        congestionScore,
        firstMatch,
        lastMatch,
        avgRestDays
      };
      if (includeGaps) base.restGaps = gaps.map(d => Math.round(d * 100) / 100);

      return base;
    }).sort((a, b) => b.congestionScore - a.congestionScore);

    res.json({ ok: true, currentGW, horizonDays, teams: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to compute congestion" });
  }
});

export default router;