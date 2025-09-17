import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /players/trends
 * Query:
 *  - direction: "up" | "down" | "both" (default up)
 *  - minForm: default 50
 *  - limit: default 30
 */
router.get("/", async (req, res) => {
  try {
    const direction = (String(req.query.direction || "up")).toLowerCase();
    const minForm = Number(req.query.minForm) || (direction === "down" ? 0 : 50);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 30));

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const list = (raw.metrics || []).map(p => {
      const own = Number(String(p.selected_by_percent).replace(",", ".")) || 0;
      const m = p.momentumScore ?? 0;            // nettotransfers / 1k
      const priceKick = p.priceChangeEvent ?? 0; // +1/-1 per 0.1
      const trendScore = m + (priceKick*3) + (own/20); // enkel proxy
      return { ...p, __own: own, trendScore };
    });

    let up = list
      .filter(p => (p.formScore ?? 0) >= minForm)
      .sort((a,b)=> (b.trendScore - a.trendScore))
      .slice(0, limit);

    let down = list
      .sort((a,b)=> (a.trendScore - b.trendScore))
      .slice(0, limit);

    let out;
    if (direction === "up") out = { up };
    else if (direction === "down") out = { down };
    else out = { up, down };

    res.json({ ok:true, currentGW: raw.currentGW, ...out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to build trends" });
  }
});

export default router;