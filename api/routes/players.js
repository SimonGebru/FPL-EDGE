import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

router.get("/", async (req, res) => {
  try {
    const { position, minForm, maxRisk, sort = "form", limit = "50" } = req.query;
    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    let list = raw.metrics || [];

    if (position) {
      const p = String(position).toLowerCase();
      list = list.filter(pl => (pl.position || "").toLowerCase().startsWith(p));
    }
    if (minForm) {
      const lim = Number(minForm) || 0;
      list = list.filter(pl => (pl.formScore ?? 0) >= lim);
    }
    if (maxRisk) {
      const r = Number(maxRisk);
      if (!Number.isNaN(r)) list = list.filter(pl => (pl.minutesRisk ?? 0) <= r);
    }

    if (sort === "form") {
      list.sort((a, b) => (b.formScore ?? 0) - (a.formScore ?? 0));
    } else if (sort === "fdr") {
      list.sort((a, b) => (a.fdrAttackNext3 ?? 5) - (b.fdrAttackNext3 ?? 5)); // enklare först
    } else if (sort === "risk") {
      list.sort((a, b) => (a.minutesRisk ?? 1) - (b.minutesRisk ?? 1)); // minst risk först
    }

    const limNum = Math.max(1, Math.min(500, Number(limit) || 50));
    res.json({ ok: true, count: Math.min(limNum, list.length), players: list.slice(0, limNum) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to read metrics" });
  }
});

export default router;