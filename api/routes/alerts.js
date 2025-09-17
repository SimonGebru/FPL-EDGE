import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /alerts/risks
 * Query:
 *  - ownHigh: default 25 (%)
 *  - formLow: default 55
 *  - fdrHigh: default 3.6
 *  - riskLow: default 0.55
 *  - limit: default 40
 */
router.get("/risks", async (req, res) => {
  try {
    const ownHigh = Number(req.query.ownHigh) || 25;
    const formLow = Number(req.query.formLow) || 55;
    const fdrHigh = Number(req.query.fdrHigh) || 3.6;
    const riskLow = Number(req.query.riskLow) || 0.55;
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 40));

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const list = (raw.metrics || []).map(p => ({
      ...p,
      own: Number(String(p.selected_by_percent).replace(",", ".")) || 0
    }));

    const traps = list
      .filter(p => p.own >= ownHigh && ((p.formScore ?? 0) < formLow || (p.fdrAttackNext3 ?? 5) > fdrHigh))
      .sort((a,b)=> (b.own - a.own))
      .slice(0, Math.ceil(limit/2));

    const doubtful = list
      .filter(p => (p.minutesRisk ?? 1) < riskLow)
      .sort((a,b)=> (a.minutesRisk ?? 1) - (b.minutesRisk ?? 1))
      .slice(0, Math.floor(limit/2));

    res.json({ ok: true, currentGW: raw.currentGW, traps, doubtful });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build risk alerts" });
  }
});

export default router;