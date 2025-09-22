// api/routes/suggestions/transferStrategy.js
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

const toNum = (x, d = 0) => {
  const n = Number(String(x ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : d;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * EV per GW (proxy):
 *   EV_gw ≈ xGI/90 * 4.5 * minutesRisk * fixtureFactor(FDR)
 */
function evPerGw(p){
  const xgi = toNum(p.xGI90, 0);
  const mins = clamp(toNum(p.minutesRisk, 0), 0, 1);
  const fdr = clamp(toNum(p.fdrAttackNext3, 3), 1, 5);
  const fixtureFactor = clamp(1.15 - (fdr - 2.5) * 0.18, 0.70, 1.30);
  return xgi * 4.5 * mins * fixtureFactor;
}

function makeReasons(p, budgetMax, pos, horizon){
  const r = [];
  if (p.EV != null) r.push(`Top EV under ${budgetMax.toFixed(1)}m${pos ? " ("+pos+")" : ""} next ${horizon} GWs`);
  if (p.fdrAttackNext3 != null && p.fdrAttackNext3 <= 3.0) r.push(`Favorable fixtures (avg FDR ${p.fdrAttackNext3})`);
  if (p.minutesRisk != null && p.minutesRisk >= 0.8) r.push(`Likely starter (${Math.round(p.minutesRisk*100)}%)`);
  if (p.xGI90 != null && p.xGI90 >= 0.35) r.push(`Strong xGI/90 (${p.xGI90.toFixed(2)})`);
  const own = toNum(p.selected_by_percent, null);
  if (own != null && own <= 10) r.push(`Differential (${own}% owned)`);
  if (toNum(p.formScore, 0) >= 70) r.push(`Hot form (${Math.round(p.formScore)})`);
  return r.slice(0,3);
}

// Baseline pris-cap per position för "replacement"
const BASE_CAP = {
  Goalkeeper: 4.5,
  Defender:   4.5,
  Midfielder: 5.0,
  Forward:    5.5,
};

function buildReplacementEVByPosition(list, horizon, minMinutesRiskBaseline){
  const out = {};
  for (const pos of ["Goalkeeper","Defender","Midfielder","Forward"]) {
    const cap = BASE_CAP[pos] ?? 4.5;
    const pool = list.filter(p =>
      (p.position === pos) &&
      (toNum(p.now_cost,0)/10 <= cap) &&
      (toNum(p.minutesRisk,0) >= minMinutesRiskBaseline)
    );
    if (pool.length === 0) {
      out[pos] = 0;
      continue;
    }
    const evs = pool.map(p => evPerGw(p) * horizon).sort((a,b)=>b-a);
    // 80:e percentilen ≈ robust ersättare
    const k = Math.max(0, Math.min(evs.length-1, Math.floor(0.2 * evs.length)));
    out[pos] = evs[k] ?? 0;
  }
  return out;
}

/**
 * GET /suggestions/transfer-strategy
 * Query:
 *  - budgetMax (required)
 *  - budgetMin
 *  - position
 *  - horizon (default 3)
 *  - minMinutesRisk (appl. endast om satt > 0)
 *  - maxFdrNext3   (appl. endast om satt > 0)
 *  - limit (default 6, max 12)
 *  - ownRange ("a-b")
 *  - excludeTeams ("Arsenal,Chelsea")
 *  - sort: "ev" | "vorp"   (default "vorp")
 */
router.get("/", async (req, res) => {
  try {
    // ---- Läs & tolka query ----
    const budgetMax = toNum(req.query.budgetMax, NaN);
    if (!Number.isFinite(budgetMax)) {
      return res.status(400).json({ ok:false, error:"Missing or invalid ?budgetMax" });
    }
    // budgetMin: om ej skickad → ingen undre gräns (null), annars numeriskt värde
    const hasBudgetMin = Object.prototype.hasOwnProperty.call(req.query, "budgetMin");
    const budgetMin = hasBudgetMin ? toNum(req.query.budgetMin, 0) : null;

    const position  = (req.query.position || "").trim() || null;
    const horizon   = clamp(toNum(req.query.horizon, 3), 1, 12);

    // minMinutesRisk: tillämpa ENDAST om parametern skickas och > 0
    const hasMinRisk = Object.prototype.hasOwnProperty.call(req.query, "minMinutesRisk");
    const minRiskRaw = toNum(req.query.minMinutesRisk, NaN);
    const applyMinRisk = hasMinRisk && Number.isFinite(minRiskRaw) && minRiskRaw > 0;
    const minMinutesRisk = applyMinRisk ? clamp(minRiskRaw, 0, 1) : 0;

    // maxFdrNext3: tillämpa ENDAST om parametern skickas och > 0
    const hasFdr = Object.prototype.hasOwnProperty.call(req.query, "maxFdrNext3");
    const fdrRaw = toNum(req.query.maxFdrNext3, NaN);
    const applyFdrMax = hasFdr && Number.isFinite(fdrRaw) && fdrRaw > 0;
    const maxFdrNext3 = applyFdrMax ? fdrRaw : null;

    const limit = clamp(toNum(req.query.limit, 6), 1, 12);

    const ownRangeRaw = (req.query.ownRange || "").trim();
    const ownRange = (() => {
      if (!ownRangeRaw) return null;
      const [a,b] = ownRangeRaw.split("-").map(v => toNum(v, NaN));
      if (!Number.isFinite(a) && !Number.isFinite(b)) return null;
      return { min: Number.isFinite(a) ? a : 0, max: Number.isFinite(b) ? b : 100 };
    })();

    const excludeTeams = String(req.query.excludeTeams || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    const sortKind = (req.query.sort || "vorp").toLowerCase(); // 'ev' | 'vorp'

    // ---- Ladda data ----
    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const list = Array.isArray(raw.metrics) ? raw.metrics : [];

    // ---- Filtrering ----
    let filtered = list.filter(p => {
      const price = toNum(p.now_cost, 0) / 10;
      if (!(price <= budgetMax)) return false;
      if (budgetMin != null && !(price >= budgetMin)) return false;

      if (position && (p.position || "") !== position) return false;

      if (applyMinRisk) {
        if (toNum(p.minutesRisk, 0) < minMinutesRisk) return false;
      }

      if (applyFdrMax) {
        if (toNum(p.fdrAttackNext3, 5) > maxFdrNext3) return false;
      }

      if (excludeTeams.length) {
        const teamName = String(p.team||"").toLowerCase();
        if (excludeTeams.map(t=>t.toLowerCase()).includes(teamName)) return false;
      }

      if (ownRange) {
        const own = toNum(p.selected_by_percent, NaN);
        if (Number.isFinite(own)) {
          if (own < ownRange.min) return false;
          if (own > ownRange.max) return false;
        }
      }

      return true;
    });

    // ---- Replacement baselines (minRisk-baselinje = faktisk tillämpning) ----
    const minRiskBaseline = applyMinRisk ? minMinutesRisk : 0;
    const replByPos = buildReplacementEVByPosition(list, horizon, minRiskBaseline);

    // ---- Score/EV ----
    const withEv = filtered.map(p => {
      const perGw = evPerGw(p);
      const EV = perGw * horizon;
      const price = toNum(p.now_cost,0)/10;
      const replEV = replByPos[p.position] ?? 0;
      const EV_above_replacement = EV - replEV;
      return {
        ...p,
        price,
        EV,
        EV_perGW: perGw,
        EV_above_replacement,
        _replEV: replEV,
      };
    });

    // ---- Rank ----
    if (sortKind === "ev") {
      withEv.sort((a,b)=>{
        if (b.EV !== a.EV) return b.EV - a.EV;
        if (b.minutesRisk !== a.minutesRisk) return b.minutesRisk - a.minutesRisk;
        if (b.formScore !== a.formScore) return b.formScore - a.formScore;
        if (a.fdrAttackNext3 !== b.fdrAttackNext3) return a.fdrAttackNext3 - b.fdrAttackNext3;
        return a.price - b.price;
      });
    } else {
      // default: VORP
      withEv.sort((a,b)=>{
        if (b.EV_above_replacement !== a.EV_above_replacement) return b.EV_above_replacement - a.EV_above_replacement;
        if (b.EV !== a.EV) return b.EV - a.EV;
        return a.price - b.price;
      });
    }

    const results = withEv.slice(0, limit).map(p => ({
      id: p.id,
      web_name: p.web_name,
      team: p.team,
      position: p.position,
      now_cost: p.now_cost,
      price: p.price,
      selected_by_percent: p.selected_by_percent,
      formScore: p.formScore,
      minutesRisk: p.minutesRisk,
      fdrAttackNext3: p.fdrAttackNext3,
      xGI90: p.xGI90,
      EV: Number(p.EV.toFixed(2)),
      EV_perGW: Number(p.EV_perGW.toFixed(2)),
      VORP: Number(p.EV_above_replacement.toFixed(2)),
      reasons: makeReasons(p, budgetMax, position, horizon),
    }));

    // ---- Svar + debug ----
    res.json({
      ok: true,
      currentGW: raw.currentGW,
      params: {
        budgetMax,
        budgetMin: budgetMin ?? null,
        position,
        horizon,
        minMinutesRisk: applyMinRisk ? minMinutesRisk : null,
        maxFdrNext3: applyFdrMax ? maxFdrNext3 : null,
        limit,
        ownRange: ownRange ? `${ownRange.min}-${ownRange.max}` : null,
        excludeTeams,
        sort: sortKind
      },
      applied: {
        applyMinRisk,
        applyFdrMax,
        minRiskBaseline,
      },
      replacement: { byPosition: replByPos, horizon, minMinutesRisk: minRiskBaseline },
      results
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"transfer-strategy failed" });
  }
});

export default router;