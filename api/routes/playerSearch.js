import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Fuse from "fuse.js";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /players/search
 * Query:
 *  - q: söksträng (krävs)
 *  - position: optional ("Goalkeeper"|"Defender"|"Midfielder"|"Forward")
 *  - limit: default 8 (max 50)
 */
router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const position = req.query.position ? String(req.query.position) : "";
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 8));
    if (!q) return res.status(400).json({ ok: false, error: "Missing query ?q=" });

    // 1) Läs ALLA spelare från bootstrap
    const bootstrap = JSON.parse(await readFile(resolve(DATA_DIR, "bootstrap.json"), "utf-8"));
    const teams = bootstrap.teams || [];
    const elements = bootstrap.elements || [];
    const elementTypes = bootstrap.element_types || [];
    const teamsById = Object.fromEntries(teams.map(t => [t.id, t.name]));
    const posById = Object.fromEntries(elementTypes.map(p => [p.id, p.singular_name]));

    // 2) Läs metrics (subset) och gör uppslag för enrich
    let metricsById = {};
    try {
      const metricsRaw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
      for (const m of (metricsRaw.metrics || [])) metricsById[m.id] = m;
    } catch { /* ok om saknas */ }

    // 3) Bygg källlista av ALLA spelare med bas-info + ev metrics
    let list = elements.map(e => {
      const base = {
        id: e.id,
        web_name: e.web_name,
        team: teamsById[e.team] || "Unknown",
        position: posById[e.element_type] || "Unknown",
        now_cost: e.now_cost,                        // 0.1m
        selected_by_percent: e.selected_by_percent,  // sträng
      };
      const m = metricsById[e.id];
      return m ? { ...base, ...pick(m, ["formScore","xG90","xA90","xGI90","fdrAttackNext3","minutesRisk"]) } : base;
    });

    // Valfritt filter position
    if (position) {
      const pos = position.toLowerCase();
      list = list.filter(p => (p.position || "").toLowerCase().startsWith(pos));
    }

    // 4) Fuse-sök på namn (väger in lag/position lite)
    const fuse = new Fuse(list, {
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "web_name", weight: 0.75 },
        { name: "team",     weight: 0.15 },
        { name: "position", weight: 0.10 },
      ],
    });

    const results = fuse.search(q).slice(0, limit).map(r => ({
      ...r.item,
      _score: r.score,
    }));

    res.json({
      ok: true,
      currentGW: (JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8")).currentGW) || null,
      params: { q, position: position || null, limit },
      results,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Search failed" });
  }
});

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj?.[k] !== undefined) out[k] = obj[k];
  return out;
}

export default router;