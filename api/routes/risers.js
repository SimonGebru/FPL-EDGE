import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /players/risers
 * Query:
 *  - minForm: default 55 (undvik rena bluffar)
 *  - maxFdr: default 3.8
 *  - limit: default 20
 *  - includePrice: "1" sortera sekundärt på priceChangeEvent
 */
router.get("/", async (req, res) => {
  try {
    const minForm = Number(req.query.minForm) || 55;
    const maxFdr = Number(req.query.maxFdr) || 3.8;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const includePrice = String(req.query.includePrice || "") === "1";

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    let list = raw.metrics || [];

    const filtered = list
      .filter(p => (p.formScore ?? 0) >= minForm)
      .filter(p => (p.fdrAttackNext3 ?? 5) <= maxFdr)
      .sort((a, b) => {
        const m = (b.momentumScore ?? 0) - (a.momentumScore ?? 0);
        if (m !== 0) return m;
        if (includePrice) {
          const pc = (b.priceChangeEvent ?? 0) - (a.priceChangeEvent ?? 0);
          if (pc !== 0) return pc;
        }
        return (b.formScore ?? 0) - (a.formScore ?? 0);
      })
      .slice(0, limit);

    res.json({
      ok: true,
      currentGW: raw.currentGW,
      count: filtered.length,
      players: filtered
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build risers" });
  }
});

export default router;