import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

/**
 * GET /differentials
 * Query (alla valfria):
 *  - maxOwn: max ägande % (default 15)
 *  - minForm: min formScore (default 60)
 *  - maxFdr: max FDR kommande 3 (default 3.8)
 *  - minRisk: min minutesRisk (default 0.6)
 *  - position: "Forward" | "Midfielder" | "Defender" | "Goalkeeper"
 *  - sort: "form" | "fdr" | "risk" | "own" (default "form")
 *  - limit: antal rader (default 20, max 100)
 *  - debug: "1" för att se counts och varför kandidater föll
 *  - relax: "1" för att successivt lätta på kraven om tomt resultat
 */
router.get("/", async (req, res) => {
  try {
    const maxOwn = Number(req.query.maxOwn) || 15;
    const minForm = Number(req.query.minForm) || 60;
    const maxFdr = Number(req.query.maxFdr) || 3.8;
    const minRisk = Number(req.query.minRisk) || 0.6;
    const position = req.query.position ? String(req.query.position) : null;
    const sort = String(req.query.sort || "form");
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const debug = String(req.query.debug || "") === "1";
    const relax = String(req.query.relax || "") === "1";

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    let list = (raw.metrics || []).map((p) => ({
      ...p,
      selected_by_percent_num: Number(String(p.selected_by_percent).replace(",", ".")) || 0,
    }));

    // Om position specificeras: begränsa kandidat-poolen först (för bättre debug)
    if (position) {
      const pos = position.toLowerCase();
      list = list.filter((p) => (p.position || "").toLowerCase().startsWith(pos));
    }

    const counts = { total: list.length };

    // Hjälp-funktion: gör filter och returnera både lista och counts
    const applyFilters = (pool, cfg) => {
      const {
        own = maxOwn,
        form = minForm,
        fdr = maxFdr,
        risk = minRisk,
        considerFdr = true,
      } = cfg;

      let arr = pool.filter((p) => p.selected_by_percent_num <= own);
      const afterOwn = arr.length;

      arr = arr.filter((p) => (p.formScore ?? 0) >= form);
      const afterForm = arr.length;

      if (considerFdr) {
        arr = arr.filter((p) => (p.fdrAttackNext3 ?? 5) <= fdr);
      }
      const afterFdr = arr.length;

      arr = arr.filter((p) => (p.minutesRisk ?? 0) >= risk);
      const afterMinutes = arr.length;

      return { arr, afterOwn, afterForm, afterFdr, afterMinutes };
    };

    // 1) Försök med användarens filter “som är”
    let { arr: filtered, afterOwn, afterForm, afterFdr, afterMinutes } =
      applyFilters(list, {});

    counts.afterOwnership = afterOwn;
    counts.afterForm = afterForm;
    counts.afterFdr = afterFdr;
    counts.afterMinutes = afterMinutes;

    // Sortera hjälpare
    const sortBy = (arr) => {
      const a = [...arr];
      if (sort === "form") a.sort((x, y) => (y.formScore ?? 0) - (x.formScore ?? 0));
      else if (sort === "fdr") a.sort((x, y) => (x.fdrAttackNext3 ?? 5) - (y.fdrAttackNext3 ?? 5));
      else if (sort === "risk") a.sort((x, y) => (y.minutesRisk ?? 0) - (x.minutesRisk ?? 0));
      else if (sort === "own") a.sort((x, y) => (x.selected_by_percent_num ?? 0) - (y.selected_by_percent_num ?? 0));
      return a;
    };

    let players = sortBy(filtered).slice(0, limit);

    // 2) RELAX-steg om tomt: släpp stegvis tills vi får något
    if (relax && players.length === 0) {
      // 2a) Släpp FDR
      let step = applyFilters(list, { considerFdr: false });
      let cand = sortBy(step.arr).slice(0, limit);

      // 2b) Om fortfarande tomt: sänk form med 5
      if (cand.length === 0) {
        step = applyFilters(list, { considerFdr: false, form: Math.max(0, minForm - 5) });
        cand = sortBy(step.arr).slice(0, limit);
      }

      // 2c) Om fortfarande tomt: höj ägande-taket till 40%
      if (cand.length === 0) {
        step = applyFilters(list, { considerFdr: false, form: Math.max(0, minForm - 5), own: Math.max(maxOwn, 40) });
        cand = sortBy(step.arr).slice(0, limit);
      }

      // 2d) Om fortfarande tomt: sänk minutesRisk till 0.5
      if (cand.length === 0) {
        step = applyFilters(list, {
          considerFdr: false,
          form: Math.max(0, minForm - 5),
          own: Math.max(maxOwn, 40),
          risk: Math.min(minRisk, 0.5),
        });
        cand = sortBy(step.arr).slice(0, limit);
      }

      // 2e) Sista utväg: topp efter form i den (ev. positionsbegränsade) poolen
      if (cand.length === 0) {
        cand = sortBy(list).slice(0, limit);
      }

      players = cand;
    }

    // Extra debug: varför föll kandidater bort?
    let why = undefined;
    if (debug) {
      const sample = list.slice(0, 50).map((p) => {
        const reasons = [];
        if (!(p.selected_by_percent_num <= maxOwn)) reasons.push(`own>${maxOwn} (${p.selected_by_percent})`);
        if (!((p.formScore ?? 0) >= minForm)) reasons.push(`form<${minForm} (${p.formScore ?? 0})`);
        if (!((p.fdrAttackNext3 ?? 5) <= maxFdr)) reasons.push(`fdr>${maxFdr} (${p.fdrAttackNext3 ?? "n/a"})`);
        if (!((p.minutesRisk ?? 0) >= minRisk)) reasons.push(`risk<${minRisk} (${p.minutesRisk ?? 0})`);
        return {
          id: p.id,
          name: p.web_name,
          pos: p.position,
          own: p.selected_by_percent_num,
          form: p.formScore,
          fdr: p.fdrAttackNext3,
          risk: p.minutesRisk,
          reasons,
        };
      });
      why = sample;
    }

    res.json({
      ok: true,
      currentGW: raw.currentGW,
      params: { maxOwn, minForm, maxFdr, minRisk, position, sort, limit, debug, relax },
      count: players.length,
      players,
      ...(debug ? { debug: counts, sampleWhyRejected: why } : {}),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to build differentials" });
  }
});

export default router;