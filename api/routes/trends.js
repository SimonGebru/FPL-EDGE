import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /players/trends
 * Query:
 *  - direction: "up" | "down" | "both" (default "up")
 *  - minForm: default 50 (0 om direction=down)
 *  - limit: default 30 (max 200)
 */
router.get("/", async (req, res) => {
  try {
    const direction = String(req.query.direction || "up").toLowerCase(); // up|down|both
    const minForm = Number(req.query.minForm) || (direction === "down" ? 0 : 50);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 30));

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const list = (raw.metrics || []).map(p => {
      const own = Number(String(p.selected_by_percent).replace(",", ".")) || 0;
      const m = p.momentumScore ?? 0;            // nettotransfers / 1k (från metricsPipeline)
      const priceKick = p.priceChangeEvent ?? 0; // +1/-1 per 0.1 (från metricsPipeline)
      const trendScore = m + (priceKick * 3) + (own / 20); // din proxy
      return { ...p, selected_by_percent_num: own, trendScore };
    });

    const up = list
      .filter(p => (p.formScore ?? 0) >= minForm)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);

    const down = list
      .sort((a, b) => a.trendScore - b.trendScore)
      .slice(0, limit);

    let items = up;
    if (direction === "down") items = down;
    if (direction === "both") items = [...up, ...down]; // enkel sammanslagning

    res.json({
      ok: true,
      currentGW: raw.currentGW,
      params: { direction, minForm, limit },
      items,                // 👈 alltid detta för frontend
      ...(direction === "both" ? { up, down } : {}), // extra fält när det är vettigt
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build trends" });
  }
});

export default router;