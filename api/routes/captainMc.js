// api/routes/captainMc.js
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

// Poäng per event (väldigt grov MVP)
const GOAL_PTS = 5;    // anpassa efter position senare
const ASSIST_PTS = 3;

function lambdaFrom(p){
  const xgi = Number(p.xGI90 ?? 0);             // förväntat G+A per 90
  const mins = Math.max(0.5, Number(p.minutesRisk ?? 0)); // 0..1, minst 0.5 för MVP
  const fdr = Number(p.fdrAttackNext3 ?? 3);
  const fdrAdj = 1 + (3.0 - fdr) * 0.12;        // 0.64..1.36 ungef.
  return Math.max(0.05, xgi * mins * fdrAdj);   // λ för “involvements”
}

function samplePoisson(lambda, rng){
  // Knuth
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

router.get("/", async (req,res)=>{
  try {
    const ids = String(req.query.ids || "").split(",").map(s=>Number(s.trim())).filter(Boolean);
    const sims = Math.max(1000, Math.min(20000, Number(req.query.sims || 10000)));

    if (!ids.length) return res.status(400).json({ ok:false, error:"Provide ?ids=..." });

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const byId = Object.fromEntries((raw.metrics||[]).map(p=>[p.id,p]));
    const pool = ids.map(id=>byId[id]).filter(Boolean);
    if (!pool.length) return res.status(404).json({ ok:false, error:"No valid players" });

    const rng = Math.random; // (ersätt med seedad RNG om du vill)
    const results = pool.map(p=>{
      const lam = lambdaFrom(p);
      let sum=0, sum2=0, ge10=0;
      for (let i=0;i<sims;i++){
        const involvements = samplePoisson(lam, rng);
        // Dela involvements i mål/assist 60/40 för MVP
        let pts = 0;
        for (let j=0;j<involvements;j++){
          if (rng() < 0.6) pts += GOAL_PTS; else pts += ASSIST_PTS;
        }
        sum += pts; sum2 += pts*pts;
        if (pts >= 10) ge10++;
      }
      const ev = sum / sims;
      const var_ = (sum2 / sims) - ev*ev;
      const sd = Math.sqrt(Math.max(0,var_));
      const p10 = ge10 / sims;
      return { id:p.id, web_name:p.web_name, team:p.team, position:p.position,
               minutesRisk:p.minutesRisk, xGI90:p.xGI90, fdrAttackNext3:p.fdrAttackNext3,
               EV: ev, SD: sd, p10 };
    });

    // sortera bästa EV
    results.sort((a,b)=> b.EV - a.EV);

    res.json({ ok:true, currentGW: raw.currentGW, sims, results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to run MC" });
  }
});

export default router;