import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /teams/stacks
 * Query:
 *  - minFormAvg: default 60  (lagets topp-3 offensiva spelare, snitt)
 *  - maxAttackFdr: default 3.2
 *  - minDefFdr: default 3.5  (om över → avråd defensiv stack)
 *  - limit: default 10
 */
router.get("/", async (req, res) => {
  try {
    const minFormAvg = Number(req.query.minFormAvg) || 60;
    const maxAttackFdr = Number(req.query.maxAttackFdr) || 3.2;
    const minDefFdr = Number(req.query.minDefFdr) || 3.5;
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));

    const metrics = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const list = metrics.metrics || [];

    // group by team
    const byTeam = {};
    for (const p of list) {
      if (!byTeam[p.team]) byTeam[p.team] = [];
      byTeam[p.team].push(p);
    }

    const suggestions = [];
    for (const [team, players] of Object.entries(byTeam)) {
      const attackers = players.filter(p => ["Forward","Midfielder"].includes(p.position));
      const defenders = players.filter(p => ["Defender","Goalkeeper"].includes(p.position));

      const topAtk = attackers.sort((a,b)=> (b.formScore??0)-(a.formScore??0)).slice(0,3);
      const formAvg = topAtk.length ? Math.round(topAtk.reduce((s,p)=>s+(p.formScore||0),0)/topAtk.length) : 0;
      const fdrAvg = Math.round(((players[0]?.fdrAttackNext3 ?? 3) + Number.EPSILON)*10)/10;

      if (formAvg >= minFormAvg && fdrAvg <= maxAttackFdr) {
        suggestions.push({
          type: "pro",
          team,
          suggestion: `Överväg dubbel ${team} offensivt`,
          reason: { formAvg, fdrAttackNext3: fdrAvg },
          samplePlayers: topAtk.slice(0,2).map(p=>({id:p.id,name:p.web_name,position:p.position}))
        });
      }

      if (fdrAvg >= minDefFdr) {
        const topDef = defenders.sort((a,b)=> (b.formScore??0)-(a.formScore??0)).slice(0,2);
        if (topDef.length >= 2) {
          suggestions.push({
            type: "con",
            team,
            suggestion: `Undvik dubbel ${team} defensivt`,
            reason: { fdrAttackNext3: fdrAvg },
            samplePlayers: topDef.map(p=>({id:p.id,name:p.web_name,position:p.position}))
          });
        }
      }
    }

    const sorted = suggestions.sort((a,b) => {
      // pro först, hög form/lågt fdr prioriteras
      const aw = (a.type === "pro") ? 1 : 0;
      const bw = (b.type === "pro") ? 1 : 0;
      if (aw !== bw) return bw - aw;
      return (a.reason.formAvg ?? 0) - (b.reason.formAvg ?? 0);
    }).reverse().slice(0, limit);

    res.json({ ok: true, count: sorted.length, suggestions: sorted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build stacks" });
  }
});

export default router;