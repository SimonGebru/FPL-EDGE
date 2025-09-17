import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /players/pricewatch
 * Query:
 *  - limit: default 40
 *  - minMomentum: default 5  (per 1k managers)
 *  - minOwn: default 0       (% ägande – höjer priskänslighet)
 *  - debug=1 -> returnera thresholds
 */
router.get("/", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 40));
    const minMomentum = Number(req.query.minMomentum) || 5; // per 1k
    const minOwn = Number(req.query.minOwn) || 0;
    const debug = String(req.query.debug || "") === "1";

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const list = (raw.metrics || []).map(p => {
      const own = Number(String(p.selected_by_percent).replace(",", ".")) || 0;
      return { ...p, __own: own };
    });

    // Grov känslighetsfaktor: högre ownership → lättare att trigga prisrörelser
    const sensitivity = (own) => 1 + Math.min(own, 60) / 60; // 1..2

    const enriched = list.map(p => {
      const m = p.momentumScore ?? 0;      // nettotransfers / 1k
      const pc = p.priceChangeEvent ?? 0;  // +1 = +0.1 denna GW
      const own = p.__own;

      // Trösklar (tweaka vid behov)
      const riseThresh = minMomentum / Math.max(1, sensitivity(own));
      const fallThresh = -minMomentum * Math.max(1, 2 - sensitivity(own));

      const riseRisk = (m >= riseThresh) || (pc > 0);
      const fallRisk = (m <= fallThresh) || (pc < 0);

      const scoreUp = m + (pc > 0 ? 5 : 0) + (own/10);   // sorteringshjälp
      const scoreDown = (-m) + (pc < 0 ? 5 : 0) + (own/10);

      return { ...p, priceFlags: { riseRisk, fallRisk, scoreUp, scoreDown, m, pc, own } };
    });

    const risers = enriched
      .filter(p => p.__own >= minOwn)
      .filter(p => p.priceFlags.riseRisk)
      .sort((a, b) => (b.priceFlags.scoreUp - a.priceFlags.scoreUp))
      .slice(0, Math.ceil(limit/2));

    const fallers = enriched
      .filter(p => p.__own >= minOwn)
      .filter(p => p.priceFlags.fallRisk)
      .sort((a, b) => (b.priceFlags.scoreDown - a.priceFlags.scoreDown))
      .slice(0, Math.floor(limit/2));

    const out = {
      ok: true,
      currentGW: raw.currentGW,
      params: { limit, minMomentum, minOwn },
      risers,
      fallers
    };
    if (debug) out.debug = { note: "heuristic", exampleThresholds: { riseThresh: minMomentum, fallThresh: -minMomentum } };
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build pricewatch" });
  }
});

export default router;