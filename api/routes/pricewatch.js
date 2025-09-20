// api/routes/pricewatch.js
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

const toNum = (x, d = 0) => {
  const n = Number(String(x ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : d;
};

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor((p / 100) * a.length)));
  return a[idx];
}

/**
 * GET /players/pricewatch
 * Query:
 *  - limit: default 40
 *  - minMomentum: default 5 (per 1k managers)
 *  - minOwn: default 0 (% ägande)
 *  - debug: "1" för extra info
 */
router.get("/", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 40));
    const minMomentum = toNum(req.query.minMomentum, 5); // per 1k
    const minOwn = toNum(req.query.minOwn, 0);
    const debug = String(req.query.debug || "") === "1";

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const base = Array.isArray(raw.metrics) ? raw.metrics : [];

    // Enhetlig normalisering + robusta fallbacks
    const list = base.map(p => {
      const own = toNum(p.selected_by_percent, 0);
      // momentum-kandidater
      const m1 = toNum(p.momentumScore, NaN);
      const m2 = toNum(p.trendScore, NaN); // om du har ett trendmått
      const m3 = toNum(p.transfers_delta_per1k, NaN);
      const m4 = toNum(p.transfers_in_event, NaN) - toNum(p.transfers_out_event, NaN);
      const m4per1k = Number.isFinite(m4) ? m4 / 1000 : NaN;

      const momentum =
        [m1, m2, m3, m4per1k].find(Number.isFinite) ?? 0;

      // prisändringsflaggor/fallbacks
      const priceChangeEvent =
        (Number.isFinite(toNum(p.priceChangeEvent, NaN)) && toNum(p.priceChangeEvent)) ||
        (Number.isFinite(toNum(p.event_price_change, NaN)) && toNum(p.event_price_change)) ||
        0;

      return {
        ...p,
        __own: own,
        __momentum: momentum,          // per 1k managers (kan vara proxyt)
        __priceEvent: priceChangeEvent // +1 / -1 / 0
      };
    });

    const filtered = list.filter(p => p.__own >= minOwn);

    // Samla momentum för percentiler
    const mVals = filtered.map(p => p.__momentum).filter(Number.isFinite);
    const p85 = percentile(mVals, 85);
    const p15 = percentile(mVals, 15);

    // Absoluta (inmatade) trösklar + percentil-trösklar
    const riseAbs   = minMomentum;       // t.ex. 5 per 1k
    const fallAbs   = -minMomentum;
    const risePerc  = Math.max(p85,  0.5); // skydd mot för snälla percentiler
    const fallPerc  = Math.min(p15, -0.5);

    // Heuristik
    const enriched = filtered.map(p => {
      const m = p.__momentum;
      const pc = p.__priceEvent; // +1 → redan triggat uppåt idag/denna GW (om datan har det)
      const riseRisk = (m >= riseAbs) || (m >= risePerc) || (pc > 0);
      const fallRisk = (m <= fallAbs) || (m <= fallPerc) || (pc < 0);
      const scoreUp   = (m) + (pc > 0 ? 5 : 0) + (p.__own / 10);
      const scoreDown = (-m) + (pc < 0 ? 5 : 0) + (p.__own / 10);
      return { ...p, priceFlags: { riseRisk, fallRisk, scoreUp, scoreDown, m, pc, own: p.__own } };
    });

    let risers = enriched
      .filter(p => p.priceFlags.riseRisk)
      .sort((a, b) => b.priceFlags.scoreUp - a.priceFlags.scoreUp)
      .slice(0, Math.ceil(limit / 2));

    let fallers = enriched
      .filter(p => p.priceFlags.fallRisk)
      .sort((a, b) => b.priceFlags.scoreDown - a.priceFlags.scoreDown)
      .slice(0, Math.floor(limit / 2));

    // Fail-safe: om tomt, returnera top/bottom på momentum ändå
    if (risers.length === 0) {
      risers = [...enriched]
        .sort((a, b) => b.__momentum - a.__momentum)
        .slice(0, Math.ceil(limit / 2));
    }
    if (fallers.length === 0) {
      fallers = [...enriched]
        .sort((a, b) => a.__momentum - b.__momentum)
        .slice(0, Math.floor(limit / 2));
    }

    // Minimalt svar (frontend renderar nyckelfält)
    const slim = p => ({
      id: p.id,
      web_name: p.web_name,
      team: p.team,
      position: p.position,
      selected_by_percent: p.selected_by_percent,
      priceChangeEvent: p.__priceEvent,
      momentumPer1k: Number((p.__momentum).toFixed(2)),
      // extra visning i UI:
      priceFlags: p.priceFlags,
    });

    const out = {
      ok: true,
      currentGW: raw.currentGW,
      params: { limit, minMomentum, minOwn },
      risers: risers.map(slim),
      fallers: fallers.map(slim),
    };

    if (debug) {
      out.debug = {
        counts: {
          total: list.length,
          afterOwn: filtered.length,
          risers: risers.length,
          fallers: fallers.length,
        },
        thresholds: {
          abs: { riseAbs, fallAbs },
          percentiles: { p85, p15, risePerc, fallPerc },
          note: "flaggar om abs OCH/ELLER percentiler uppfylls, eller priceEvent ≠ 0",
        },
        samples: {
          up: risers.slice(0, 3).map(p => ({ name: p.web_name, m: p.__momentum, pc: p.__priceEvent, own: p.__own })),
          down: fallers.slice(0, 3).map(p => ({ name: p.web_name, m: p.__momentum, pc: p.__priceEvent, own: p.__own })),
        },
      };
    }

    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build pricewatch" });
  }
});

export default router;