import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Fuse from "fuse.js";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /players/search
 * Query:
 *  - q: sträng att söka på (krävs)
 *  - position: optional ("Goalkeeper" | "Defender" | "Midfielder" | "Forward")
 *  - limit: antal resultat (default 8, max 50)
 */
router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const position = req.query.position ? String(req.query.position) : "";
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 8));

    if (!q) {
      return res.status(400).json({ ok: false, error: "Missing query ?q=" });
    }

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    let list = raw.metrics || [];

    // Valfritt filter på position
    if (position) {
      const pos = position.toLowerCase();
      list = list.filter(p => (p.position || "").toLowerCase().startsWith(pos));
    }

    // För Fuse – håll index smått & relevant
    const source = list.map(p => ({
      id: p.id,
      web_name: p.web_name,
      team: p.team,
      position: p.position,
      formScore: p.formScore ?? 0,
      xGI90: p.xGI90 ?? null, // om du har det i metrics
    }));

    const fuse = new Fuse(source, {
      includeScore: true,
      threshold: 0.35,           // hur “fuzzy” (lägre = striktare)
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "web_name", weight: 0.7 },
        { name: "team",     weight: 0.2 },
        { name: "position", weight: 0.1 },
      ],
    });

    const results = fuse.search(q).slice(0, limit).map(r => ({
      ...r.item,
      score: r.score, // lägre = bättre träff
    }));

    res.json({
      ok: true,
      currentGW: raw.currentGW,
      params: { q, position: position || null, limit },
      results,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Search failed" });
  }
});

export default router;