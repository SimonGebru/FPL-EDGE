import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildFixtureHeatmap } from "../utils/heatmap.js";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

router.get("/heatmap", async (req, res) => {
  try {
    const horizon = Number(req.query.horizon) || 5;
    const bootstrap = JSON.parse(await readFile(resolve(DATA_DIR, "bootstrap.json"), "utf-8"));
    const fixtures  = JSON.parse(await readFile(resolve(DATA_DIR, "fixtures.json"), "utf-8"));
    const currentGW =
      (bootstrap.events?.find(e => e.is_current)?.id) ??
      (bootstrap.events?.find(e => e.is_next)?.id) ??
      1;

    const heat = buildFixtureHeatmap({
      teams: bootstrap.teams || [],
      fixtures,
      currentGW,
      horizon
    });

    res.json({ ok: true, ...heat });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build heatmap" });
  }
});

export default router;