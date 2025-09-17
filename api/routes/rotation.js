import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /players/rotation-risks
 * Visar spelare med lågt minutesRisk.
 * Query:
 *  - maxRisk: default 0.6 (visa understiger/likamed detta)
 *  - minForm: default 40 (plocka bort helt kalla)
 *  - limit: default 30
 */
router.get("/", async (req, res) => {
  try {
    const maxRisk = Number(req.query.maxRisk) || 0.6;
    const minForm = Number(req.query.minForm) || 40;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 30));

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const list = (raw.metrics || [])
      .filter(p => (p.minutesRisk ?? 1) <= maxRisk)
      .filter(p => (p.formScore ?? 0) >= minForm)
      .sort((a, b) => (a.minutesRisk ?? 1) - (b.minutesRisk ?? 1))
      .slice(0, limit);

    res.json({ ok: true, currentGW: raw.currentGW, count: list.length, players: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build rotation risks" });
  }
});

export default router;