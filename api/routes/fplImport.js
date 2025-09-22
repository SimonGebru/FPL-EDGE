// api/routes/fplImport.js
import { Router } from "express";
import fetch from "node-fetch";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");
const FPL_BASE = process.env.FPL_BASE || "https://fantasy.premierleague.com/api";

async function j(url) {
  const r = await fetch(url, { headers: { "User-Agent": "fpl-edge-mvp" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// Hämta current GW från bootstrap
async function getCurrentGw() {
  const boot = await j(`${FPL_BASE}/bootstrap-static/`);
  const events = boot?.events || [];
  const cur = events.find(e => e.is_current) || events.find(e => e.is_next) || events[0];
  return cur?.id ?? 1;
}

// Lilla hjälpare för att slå ihop metrics → snabb uppslag på id
async function getMetricsIndex() {
  const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
  const idx = new Map();
  for (const p of (raw.metrics || [])) idx.set(p.id, p);
  return idx;
}

/**
 * GET /user/team/import-fpl?entry=123456
 * Returnerar { ok, entry, gw, picks: [{id, web_name, team, position, now_cost, is_captain, is_vice}], bank, itb }
 */
router.get("/", async (req, res) => {
  try {
    const entry = Number(req.query.entry || 0);
    if (!entry) return res.status(400).json({ ok:false, error:"Missing ?entry" });

    const gw = await getCurrentGw();

    // FPL endpoints
    // (1) /entry/:id/ → grundinfo
    // (2) /entry/:id/event/:gw/picks/ → veckans picks
    const [entryInfo, picksInfo] = await Promise.all([
      j(`${FPL_BASE}/entry/${entry}/`),
      j(`${FPL_BASE}/entry/${entry}/event/${gw}/picks/`)
    ]);

    const metricsIdx = await getMetricsIndex();
    const elToPlayer = (el) => {
      const p = metricsIdx.get(Number(el.element));
      // Fallback om metrics saknar spelaren (sker sällan)
      return {
        id: Number(el.element),
        web_name: p?.web_name ?? `#${el.element}`,
        team: p?.team ?? null,
        position: p?.position ?? null,
        now_cost: p?.now_cost ?? null,
        is_captain: !!el.is_captain,
        is_vice: !!el.is_vice_captain,
      };
    };

    const picks = (picksInfo?.picks || []).map(elToPlayer);
    const bank = picksInfo?.entry_history?.bank ?? null;  // i 0.1m
    const itb  = bank != null ? bank / 10 : null;

    res.json({
      ok: true,
      entry,
      gw,
      team_name: entryInfo?.name ?? null,
      player_name: entryInfo?.player_first_name && entryInfo?.player_last_name
        ? `${entryInfo.player_first_name} ${entryInfo.player_last_name}` : null,
      picks,
      bank,
      itb
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to import FPL team" });
  }
});

export default router;