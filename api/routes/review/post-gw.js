// api/routes/review/post-gw.js
import { Router } from "express";
import fetch from "node-fetch";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");
const FPL_BASE = "https://fantasy.premierleague.com/api";

const toNum = (x, d=0) => {
  const n = Number(String(x ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : d;
};

async function fplJson(path) {
  const res = await fetch(`${FPL_BASE}${path}`, {
    headers: { "User-Agent":"Mozilla/5.0 (EdgeBot)", "Accept":"application/json,*/*" }
  });
  if (!res.ok) throw new Error(`FPL ${res.status}`);
  return res.json();
}

/**
 * GET /review/post-gw?entryId=XXXX&gw=YY
 * Returnerar:
 *  - faktisk kapten + poäng
 *  - “rekommenderad kapten” (från vår /suggestions/captain) + poäng
 *  - lagets totalpoäng (GW) + jämförelser mot xGI-proxy
 */
router.get("/", async (req, res) => {
  try {
    const entryId = String(req.query.entryId || "").trim();
    const gw = Number(req.query.gw || NaN);
    if (!entryId || !Number.isFinite(gw)) {
      return res.status(400).json({ ok:false, error:"Missing ?entryId or ?gw" });
    }

    // Picks för vald GW
    const picksJson = await fplJson(`/entry/${entryId}/event/${gw}/picks/`);
    const picks = picksJson.picks || [];

    // Live-poäng för GW
    const live = await fplJson(`/event/${gw}/live/`);
    const liveById = {};
    for (const e of live.elements || []) liveById[e.id] = e;

    // Vår lokala metrics (för xGI-proxy, om du vill)
    const metrics = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const byId = {};
    for (const p of metrics.metrics || []) byId[p.id] = p;

    // Faktisk kapten
    const capPick = picks.find(p => p.is_captain) || null;
    const capId = capPick?.element ?? null;
    const capPoints = capId ? (liveById[capId]?.stats?.total_points ?? 0) : 0;
    const capMult = capPick ? (capPick.multiplier ?? 2) : 2;
    const capPointsTotal = capPoints * capMult;

    // Rekommenderad kapten: ta top from vår /suggestions/captain (med snälla defaults)
    // (Vi kallar inte API:t här för enkelhet → använd metrics som proxy: högst xGI90*minutesRisk)
    const sortedByEV = (metrics.metrics || [])
      .filter(p => toNum(p.minutesRisk, 0) >= 0.7)
      .sort((a,b)=>{
        const eva = toNum(a.xGI90,0)*toNum(a.minutesRisk,0);
        const evb = toNum(b.xGI90,0)*toNum(b.minutesRisk,0);
        return evb - eva;
      });
    const rec = sortedByEV[0] || null;
    const recPoints = rec ? (liveById[rec.id]?.stats?.total_points ?? 0) : 0;

    // Lagets GW-poäng (enkelt: summera varje pick points * multiplier)
    let teamPoints = 0;
    for (const p of picks) {
      const pts = liveById[p.element]?.stats?.total_points ?? 0;
      const mult = p.multiplier ?? (p.is_captain ? 2 : 1);
      teamPoints += pts * mult;
    }

    res.json({
      ok: true,
      gw,
      entryId,
      actualCaptain: capId ? { id: capId, points: capPoints, totalWithMult: capPointsTotal } : null,
      recommendedCaptain: rec ? { id: rec.id, web_name: rec.web_name, points: recPoints } : null,
      teamPoints,
      picksCount: picks.length
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"post-gw review failed" });
  }
});

export default router;