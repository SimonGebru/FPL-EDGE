import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /players/xgi-leaders
 * Query:
 *  - position: valfritt ("Forward" | "Midfielder" | "Defender" | "Goalkeeper")
 *  - minMinutesRisk: default 0.6 (filtrera bort rena rotationslotter)
 *  - limit: default 20
 */
router.get("/", async (req, res) => {
  try {
    const position = req.query.position ? String(req.query.position) : null;
    const minMinutesRisk = Number(req.query.minMinutesRisk) || 0.6;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    let list = raw.metrics || [];

    if (position) {
      const pos = position.toLowerCase();
      list = list.filter(p => (p.position || "").toLowerCase().startsWith(pos));
    }

    list = list
      .filter(p => (p.xGI90 ?? 0) > 0)
      .filter(p => (p.minutesRisk ?? 0) >= minMinutesRisk)
      .sort((a, b) => (b.xGI90 ?? 0) - (a.xGI90 ?? 0))
      .slice(0, limit);

    res.json({ ok: true, currentGW: raw.currentGW, count: list.length, players: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build xgi leaders" });
  }
});

export default router;