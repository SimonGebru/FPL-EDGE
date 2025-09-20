// api/routes/suggestions/transferStrategy.js
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

// ---- helpers ---------------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function toNum(x, d = 0) {
  if (x === null || x === undefined) return d;
  const s = String(x).trim().replace(",", ".").replace(/%$/, ""); // ta bort ev. %
  const n = Number(s);
  return Number.isFinite(n) ? n : d;
}
function parseRange(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  return [Math.min(a,b), Math.max(a,b)];
}
function evPerGw(p){
  const xgi = toNum(p.xGI90, 0);
  const mins = clamp(toNum(p.minutesRisk, 0), 0, 1);
  // saknas FDR → neutral faktor = 1.0
  const fdrRaw = p.fdrAttackNext3;
  const hasFdr = Number.isFinite(Number(fdrRaw));
  const fdr = clamp(toNum(fdrRaw, 3), 1, 5);
  const fixtureFactor = hasFdr ? clamp(1.15 - (fdr - 2.5) * 0.18, 0.70, 1.30) : 1.0;
  return xgi * 4.5 * mins * fixtureFactor;
}
function makeReasons(p, budgetMax, pos, horizon){
  const r = [];
  if (p.EV != null) r.push(`Top EV ≤ ${budgetMax.toFixed(1)}m${pos ? " ("+pos+")" : ""} över ${horizon} GWs`);
  if (Number.isFinite(p.fdrAttackNext3) && p.fdrAttackNext3 <= 3.0) r.push(`Fina matcher (FDR 3)`);
  if (toNum(p.minutesRisk,0) >= 0.8) r.push(`Hög startchans (${Math.round(toNum(p.minutesRisk)*100)}%)`);
  if (toNum(p.xGI90,0) >= 0.35) r.push(`Bra xGI/90 (${toNum(p.xGI90).toFixed(2)})`);
  const own = toNum(p.selected_by_percent, NaN);
  if (Number.isFinite(own) && own <= 10) r.push(`Differential (${own}% ägd)`);
  if (toNum(p.formScore,0) >= 70) r.push(`Het form (${Math.round(toNum(p.formScore))})`);
  return r.slice(0,3);
}

// ---- route -----------------------------------------------------------------
/**
 * GET /suggestions/transfer-strategy
 * Query:
 *  - budgetMax (required, e.g. 4.5)
 *  - budgetMin (optional)
 *  - position (Goalkeeper|Defender|Midfielder|Forward)
 *  - horizon (default 3, 1..38)
 *  - minMinutesRisk (optional)  // filtreras bara om skickad
 *  - maxFdrNext3 (optional)     // filtreras bara om skickad och spelarens fdr finns
 *  - ownRange (e.g. "0-20")
 *  - excludeTeams ("Arsenal,Chelsea")
 *  - limit (default 10, max 20)
 */
router.get("/", async (req, res) => {
  try {
    const budgetMax = toNum(req.query.budgetMax, NaN);
    if (!Number.isFinite(budgetMax)) {
      return res.status(400).json({ ok:false, error:"Missing or invalid ?budgetMax" });
    }
    const budgetMin = Number.isFinite(toNum(req.query.budgetMin, NaN)) ? toNum(req.query.budgetMin) : 0;
    const position  = (req.query.position || "").trim();
    const horizon   = clamp(toNum(req.query.horizon, 3), 1, 38);
    const limit     = clamp(toNum(req.query.limit, 10), 1, 20);

    // Dessa två är *valfria* – appliceras bara om användaren skickar dem
    const hasMinRisk = req.query.minMinutesRisk !== undefined && req.query.minMinutesRisk !== "";
    const minMinutesRisk = hasMinRisk ? clamp(toNum(req.query.minMinutesRisk, 0), 0, 1) : null;

    const hasMaxFdr = req.query.maxFdrNext3 !== undefined && req.query.maxFdrNext3 !== "";
    const maxFdrNext3 = hasMaxFdr ? toNum(req.query.maxFdrNext3, NaN) : null;

    const ownRange = parseRange(req.query.ownRange);
    const excludeTeams = String(req.query.excludeTeams || "")
      .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

    // ladda metrics
    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const pool = Array.isArray(raw.metrics) ? raw.metrics : [];

    const counts = { pool: pool.length };

    // 1) pris
    let list = pool.filter(p => {
      const price = toNum(p.now_cost, 0) / 10;
      return price >= budgetMin && price <= budgetMax;
    });
    counts.afterPrice = list.length;

    // 2) position (om satt)
    if (position) {
      list = list.filter(p => (p.position || "") === position);
    }
    counts.afterPosition = list.length;

    // 3) minutesRisk (bara om användaren skickat den)
    if (minMinutesRisk !== null) {
      list = list.filter(p => toNum(p.minutesRisk, 0) >= minMinutesRisk);
    }
    counts.afterMinutes = list.length;

    // 4) FDR (bara om skickad, och bara om spelaren *har* fdr satt)
    if (hasMaxFdr) {
      list = list.filter(p => {
        if (!Number.isFinite(Number(p.fdrAttackNext3))) return true; // saknas → släpp igenom
        return toNum(p.fdrAttackNext3, 99) <= maxFdrNext3;
      });
    }
    counts.afterFdr = list.length;

    // 5) exclude teams
    if (excludeTeams.length) {
      list = list.filter(p => !excludeTeams.includes(String(p.team || "").toLowerCase()));
    }
    counts.afterExclude = list.length;

    // 6) ownership range
    if (ownRange) {
      const [lo, hi] = ownRange;
      list = list.filter(p => {
        const own = toNum(p.selected_by_percent, NaN);
        if (!Number.isFinite(own)) return true; // okänd → släpp igenom
        return own >= lo && own <= hi;
      });
    }
    counts.afterOwn = list.length;

    // score/EV och sort
    const ranked = list.map(p => {
      const perGw = evPerGw(p);
      const EV = perGw * horizon;
      return {
        id: p.id,
        web_name: p.web_name,
        team: p.team,
        position: p.position,
        now_cost: p.now_cost,
        price: toNum(p.now_cost,0)/10,
        selected_by_percent: p.selected_by_percent,
        formScore: p.formScore,
        minutesRisk: p.minutesRisk,
        fdrAttackNext3: Number.isFinite(Number(p.fdrAttackNext3)) ? toNum(p.fdrAttackNext3) : null,
        xGI90: p.xGI90,
        EV: Number(EV.toFixed(2)),
        EV_perGW: Number(perGw.toFixed(2)),
      };
    })
    .sort((a,b)=>{
      if (b.EV !== a.EV) return b.EV - a.EV;
      if (b.minutesRisk !== a.minutesRisk) return b.minutesRisk - a.minutesRisk;
      if ((b.formScore ?? 0) !== (a.formScore ?? 0)) return (b.formScore ?? 0) - (a.formScore ?? 0);
      if ((a.fdrAttackNext3 ?? 9) !== (b.fdrAttackNext3 ?? 9)) return (a.fdrAttackNext3 ?? 9) - (b.fdrAttackNext3 ?? 9);
      return (a.price ?? 99) - (b.price ?? 99);
    })
    .slice(0, limit)
    .map(p => ({ ...p, reasons: makeReasons(p, budgetMax, position, horizon) }));

    res.json({
      ok: true,
      currentGW: raw.currentGW,
      params: {
        budgetMax, budgetMin, position: position || null, horizon,
        minMinutesRisk, maxFdrNext3: hasMaxFdr ? maxFdrNext3 : null,
        ownRange: ownRange ? ownRange.join('-') : null,
        excludeTeams, limit
      },
      results: ranked,
      debug: counts
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"transfer-strategy failed" });
  }
});

export default router;