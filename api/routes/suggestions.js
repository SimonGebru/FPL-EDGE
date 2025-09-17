// api/routes/suggestions.js
import { Router } from "express";
import fetch from "node-fetch";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");
const FPL_BASE = process.env.FPL_BASE || "https://fantasy.premierleague.com/api";

/* -------------------------- Helpers (shared) -------------------------- */

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

// Normalisera FormScore (0–100) → 0–10
function formTo10(formScore) {
  const f = Number(formScore ?? 0);
  return clamp(f / 10, 0, 10);
}

// Normalisera xGI/90 → 0–10 (cap vid 1.0 xGI/90 = 10)
function xgiTo10(xgi90) {
  const x = Number(xgi90 ?? 0);
  return clamp(x * 10, 0, 10);
}

// Fixture-boost: FDR 1 (lätt) → +4, FDR 5 (svår) → +0
function fixtureBoostFromFdr(fdr) {
  const f = Number.isFinite(fdr) ? fdr : 3;
  return clamp(5 - f, 0, 4);
}

/* ---------------------- Captain EV (med xGI) ------------------------- */

/**
 * EV = ( wForm * form10 + wXGI * xgi10 + fixtureBoost ) * minutesRisk * 2
 * Defaultvikter: wForm=0.6, wXGI=0.4
 */
function computeCaptainEV(p, { wForm = 0.6, wXGI = 0.4 } = {}) {
  const form10 = formTo10(p.formScore);
  const xgi10  = xgiTo10(p.xGI90);
  const fdr    = Number(p.fdrAttackNext3 ?? 3);
  const boost  = fixtureBoostFromFdr(fdr);
  const minutes = clamp(Number(p.minutesRisk ?? 0), 0.4, 1); // skydda mot 0

  const comp = (wForm * form10) + (wXGI * xgi10) + boost;
  const ev = comp * minutes * 2;

  return {
    ev: Math.round(ev * 10) / 10,
    comp,
    parts: { form10, xgi10, boost, minutes, fdr }
  };
}

/* ---------------- Captain Confidence (0–100) ------------------------- */
/**
 * Hämtar element-summary och beräknar:
 * - points/90 stdavvikelse (stdP)
 * - xGI/90   stdavvikelse (stdX)
 * - stabP, stabX ∈ [0,1] (1 = stabilt) via normaliserad std
 * - stability = 0.5*stabP + 0.5*stabX
 * - minutesSafety = p.minutesRisk (0–1)
 * - fixtureEase   = (5 - FDR)/4 (0–1)
 *
 * Confidence = 100 * (0.5*minutesSafety + 0.35*stability + 0.15*fixtureEase)
 *
 * Returnerar { confidence, parts, samples } där parts innehåller
 * minut-säkerhet, fixtureEase, stability, stabP, stabX, stdP, stdX,
 * och samples innehåller arrays för senaste matcherna (max 4) av points90/xgi90.
 */

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "fpl-edge-mvp" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}
async function fetchElementSummary(playerId) {
  return fetchJson(`${FPL_BASE}/element-summary/${playerId}/`);
}

function stddev(arr) {
  const a = arr.filter(Number.isFinite);
  if (a.length <= 1) return 0;
  const mean = a.reduce((s, x) => s + x, 0) / a.length;
  const v = a.reduce((s, x) => s + (x - mean) ** 2, 0) / (a.length - 1);
  return Math.sqrt(v);
}

function perMatchXgi90FromHistoryRow(h) {
  const mins = h?.minutes ?? 0;
  if (mins <= 0) return null;

  const hasExp = (typeof h.expected_goals === "number") ||
                 (typeof h.expected_assists === "number") ||
                 (typeof h.expected_goal_involvements === "number");
  if (hasExp) {
    const xg  = h.expected_goals || 0;
    const xa  = h.expected_assists || 0;
    const xgi = h.expected_goal_involvements ?? (xg + xa);
    return (xgi / mins) * 90;
  }
  // Fallback: ICT-proxy
  const threat     = Number(h.threat || 0);
  const creativity = Number(h.creativity || 0);
  const xgProxy = threat / 100;     // ~0.0–0.8
  const xaProxy = creativity / 120; // ~0.0–0.7
  return xgProxy + xaProxy;
}

function perMatchP90FromHistoryRow(h) {
  const mins = h?.minutes ?? 0;
  if (mins <= 0) return null;
  return (Number(h.total_points || 0) / mins) * 90;
}

function normalizeStd(std, scale) {
  // map std ∈ [0, scale] → penalty ∈ [0,1], 0 = stabilt, 1 = spretigt
  const pen = clamp(std / scale, 0, 1);
  return 1 - pen; // 1 = stabilt
}

function computeConfidenceFromHistory(history, player) {
  const last = (history || []).filter(h => (h?.minutes ?? 0) > 0).slice(-4);
  const minutesSafety = clamp(Number(player.minutesRisk ?? 0), 0, 1);
  const fixtureEase = clamp((5 - (player.fdrAttackNext3 ?? 3)) / 4, 0, 1);

  if (last.length === 0) {
    return {
      confidence: Math.round(100 * (0.7 * minutesSafety + 0.3 * fixtureEase)),
      parts: { minutesSafety, fixtureEase, stability: null, stabP: null, stabX: null, stdP: null, stdX: null },
      samples: { points90: [], xgi90: [] }
    };
  }

  const points90 = last.map(perMatchP90FromHistoryRow).filter(Number.isFinite);
  const xgi90    = last.map(perMatchXgi90FromHistoryRow).filter(Number.isFinite);

  const stdP = stddev(points90); // typiskt 0–8
  const stdX = stddev(xgi90);    // typiskt 0–0.6

  const stabP = normalizeStd(stdP, 8);
  const stabX = normalizeStd(stdX, 0.6);
  const stability = 0.5 * stabP + 0.5 * stabX;

  const confidence = 100 * (0.5 * minutesSafety + 0.35 * stability + 0.15 * fixtureEase);

  return {
    confidence: Math.round(confidence),
    parts: {
      minutesSafety,
      fixtureEase,
      stability: Math.round(stability * 100) / 100,
      stabP: Math.round(stabP * 100) / 100,
      stabX: Math.round(stabX * 100) / 100,
      stdP: Math.round(stdP * 100) / 100,
      stdX: Math.round(stdX * 100) / 100
    },
    samples: {
      points90: points90.map(n => Math.round(n * 100) / 100),
      xgi90: xgi90.map(n => Math.round(n * 100) / 100)
    }
  };
}

/* ----------------------------- /captain ---------------------------------- */

/**
 * GET /suggestions/captain
 * Query:
 *  - limit: default 3
 *  - includeGK: "1" inkludera målvakter
 *  - wForm: 0..1 (default 0.6)
 *  - wXGI:  0..1 (default 0.4)
 *  - minMinutesRisk: default 0.6
 *  - debug: "1" för att se EV-komponenter och confidence-delar
 */
router.get("/captain", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(10, Number(req.query.limit) || 3));
    const includeGK = String(req.query.includeGK || "") === "1";
    const wForm = clamp(Number(req.query.wForm ?? 0.6), 0, 1);
    const wXGI  = clamp(Number(req.query.wXGI  ?? 0.4), 0, 1);
    const minMinutesRisk = Number(req.query.minMinutesRisk ?? 0.6);
    const debug = String(req.query.debug || "") === "1";

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    let list = raw.metrics || [];

    // Basfilter
    if (!includeGK) list = list.filter(p => p.position !== "Goalkeeper");
    list = list.filter(p => (p.minutesRisk ?? 0) >= minMinutesRisk);

    // Beräkna EV per spelare
    const enriched = list.map(p => {
      const { ev, comp, parts } = computeCaptainEV(p, { wForm, wXGI });
      const reasons = [];
      if ((p.formScore ?? 0) >= 70) reasons.push("hög form");
      if ((p.xGI90 ?? 0) >= 0.5) reasons.push("xGI/90 stark");
      if ((p.fdrAttackNext3 ?? 3) <= 3) reasons.push("bra schema");
      if ((p.minutesRisk ?? 0) >= 0.75) reasons.push("säker speltid");
      return { ...p, captainEV: ev, _comp: comp, _parts: parts, reasons };
    });

    // Sortera preliminärt på EV och förbered kandidater att hämta history för
    const prePicks = enriched
      .sort((a, b) => (b.captainEV ?? 0) - (a.captainEV ?? 0))
      .slice(0, Math.max(limit, 12));

    // Hämta element-summary för kandidater och beräkna confidence + breakdown
    const withConfidence = [];
    for (const cand of prePicks) {
      try {
        const sum = await fetchElementSummary(cand.id);
        const cfg = computeConfidenceFromHistory(sum?.history ?? [], cand);
        withConfidence.push({ ...cand, captainConfidence: cfg.confidence, _confParts: cfg.parts, _confSamples: cfg.samples });
      } catch {
        // Fallback: confidence via minutesRisk + FDR
        const minutesSafety = clamp(cand.minutesRisk ?? 0, 0, 1);
        const fixtureEase = clamp((5 - (cand.fdrAttackNext3 ?? 3)) / 4, 0, 1);
        const fallback = Math.round(100 * (0.7 * minutesSafety + 0.3 * fixtureEase));
        withConfidence.push({
          ...cand,
          captainConfidence: fallback,
          _confParts: { minutesSafety, fixtureEase, stability: null, stabP: null, stabX: null, stdP: null, stdX: null },
          _confSamples: { points90: [], xgi90: [] }
        });
      }
    }

    // Final picks: sortera primärt på EV, sekundärt på confidence
    const picks = withConfidence
      .sort((a, b) => (b.captainEV ?? 0) - (a.captainEV ?? 0) || (b.captainConfidence ?? 0) - (a.captainConfidence ?? 0))
      .slice(0, limit);

    const players = picks.map(p => {
      const base = {
        id: p.id,
        web_name: p.web_name,
        team: p.team,
        position: p.position,
        now_cost: p.now_cost,
        selected_by_percent: p.selected_by_percent,
        formScore: p.formScore,
        xGI90: p.xGI90,
        minutesRisk: p.minutesRisk,
        fdrAttackNext3: p.fdrAttackNext3,
        captainEV: p.captainEV,
        captainConfidence: p.captainConfidence,
        reasons: p.reasons
      };
      if (debug) {
        base.debug = {
          ev: { comp: p._comp, parts: p._parts },
          confidence: { parts: p._confParts, samples: p._confSamples }
        };
      }
      return base;
    });

    res.json({
      ok: true,
      currentGW: raw.currentGW,
      params: { limit, includeGK, wForm, wXGI, minMinutesRisk, debug },
      picks: players
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build captain suggestions" });
  }
});

/* ----------------------------- /watchlist -------------------------------- */

router.get("/watchlist", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 12));
    const maxOwnership = Number(req.query.maxOwn) || 15;     // %
    const minForm = Number(req.query.minForm) || 65;         // formScore
    const maxFdr = Number(req.query.maxFdr) || 3.8;          // enklare scheman
    const minMinutesRisk = Number(req.query.minRisk) || 0.6; // minst denna säkerhet
    const debug = String(req.query.debug || "") === "1";

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    let list = raw.metrics || [];

    const parsed = list.map(p => ({
      ...p,
      selected_by_percent_num: Number(String(p.selected_by_percent).replace(",", ".")) || 0
    }));

    const counts = { total: parsed.length };

    const f1 = parsed.filter(p => (p.selected_by_percent_num <= maxOwnership));
    counts.afterOwnership = f1.length;

    const f2 = f1.filter(p => (p.formScore ?? 0) >= minForm);
    counts.afterForm = f2.length;

    const f3 = f2.filter(p => (p.fdrAttackNext3 ?? 5) <= maxFdr);
    counts.afterFdr = f3.length;

    const filtered = f3
      .filter(p => (p.minutesRisk ?? 0) >= minMinutesRisk)
      .sort((a, b) => (b.formScore ?? 0) - (a.formScore ?? 0))
      .slice(0, limit);
    counts.afterMinutes = filtered.length;

    res.json({
      ok: true,
      currentGW: raw.currentGW,
      params: { maxOwnership, minForm, maxFdr, minMinutesRisk },
      players: filtered,
      ...(debug ? { debug: counts } : {})
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build watchlist" });
  }
});

export default router;