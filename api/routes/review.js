// api/routes/review.js
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

async function getEvents() {
  const boot = await j(`${FPL_BASE}/bootstrap-static/`);
  return boot?.events || [];
}

async function getLastFinishedGw() {
  const events = await getEvents();
  const finished = events.filter(e => e.finished);
  if (finished.length === 0) return null;
  return finished[finished.length - 1].id;
}

async function elementSummary(id) {
  return j(`${FPL_BASE}/element-summary/${id}/`);
}

async function metricsIndex() {
  const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
  const idx = new Map();
  for (const p of (raw.metrics || [])) idx.set(p.id, p);
  return idx;
}

// Plocka ut GW-specifik rad ur element-summary.history
function pickGwRow(history, gw) {
  return (history || []).find(h => Number(h?.round) === Number(gw)) || null;
}

/**
 * GET /review/post-gw?entry=123456
 * - Om entry finns: hämtar lagets picks för senaste avslutade GW och bygger rapport.
 * - Om entry saknas: returnerar { ok:false, error } (framtida: stöd för body.ids)
 */
router.get("/post-gw", async (req, res) => {
  try {
    const entry = Number(req.query.entry || 0);
    if (!entry) return res.status(400).json({ ok:false, error:"Missing ?entry" });

    const lastGw = await getLastFinishedGw();
    if (!lastGw) return res.status(400).json({ ok:false, error:"No finished GW yet" });

    const [entryInfo, picksInfo] = await Promise.all([
      j(`${FPL_BASE}/entry/${entry}/`),
      j(`${FPL_BASE}/entry/${entry}/event/${lastGw}/picks/`)
    ]);

    const picks = picksInfo?.picks || [];
    if (!picks.length) return res.json({ ok:true, entry, gw:lastGw, items: [], totals:{ points:0, xgi:0 }, captain:null });

    const mIdx = await metricsIndex();

    // Hämta element-summary parallellt (begränsa till dina spelare)
    const ids = picks.map(p => p.element);
    const summaries = await Promise.all(ids.map(id => elementSummary(id).catch(()=>null)));

    let totalPoints = 0, totalXGI = 0;
    let capActual = null, bestOnTeam = null;

    const items = picks.map((p, i) => {
      const id = Number(p.element);
      const sum = summaries[i];
      const hist = pickGwRow(sum?.history || [], lastGw);
      const m = mIdx.get(id);
      const web_name = m?.web_name ?? `#${id}`;
      const team = m?.team ?? null;
      const position = m?.position ?? null;

      // xGI raw
      let xgi = null;
      if (hist && (typeof hist.expected_goal_involvements === "number")) {
        xgi = hist.expected_goal_involvements;
      } else if (hist && (typeof hist.expected_goals === "number" || typeof hist.expected_assists === "number")) {
        xgi = (hist.expected_goals || 0) + (hist.expected_assists || 0);
      }

      const pts = Number(hist?.total_points || 0);
      totalPoints += pts;
      totalXGI += Number(xgi || 0);

      const is_captain = !!p.is_captain;
      const is_vice = !!p.is_vice_captain;

      const out = {
        id, web_name, team, position,
        is_captain, is_vice,
        points: pts,
        xgi: xgi != null ? Math.round(xgi * 100) / 100 : null,
        minutes: hist?.minutes ?? null,
        was_home: hist?.was_home ?? null,
        opp: hist?.opponent_team ?? null
      };

      if (is_captain) capActual = out;
      return out;
    });

    // Best on team (by points) som hypotetisk kapten
    bestOnTeam = [...items].sort((a,b)=>b.points - a.points)[0];

    res.json({
      ok: true,
      entry,
      gw: lastGw,
      team_name: entryInfo?.name ?? null,
      player_name: entryInfo?.player_first_name && entryInfo?.player_last_name
        ? `${entryInfo.player_first_name} ${entryInfo.player_last_name}` : null,
      items,
      totals: { points: totalPoints, xgi: Math.round(totalXGI * 100) / 100 },
      captain: {
        actual: capActual,
        bestOnTeam,
        deltaIfBest: (capActual && bestOnTeam)
          ? (bestOnTeam.points - capActual.points) : null
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"post-gw review failed" });
  }
});

export default router;