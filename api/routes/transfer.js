// api/routes/transfer.js
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

function evLike(p){
  // Proxy: captainEV är redan din kombomodell, men för icke-kaptener tar vi ned vikten.
  // För enkelhet: använd (form 0..1 * 0.6 + xGI * 0.4), justera för FDR/minRisk.
  const form = (Number(p.formScore ?? 0) / 100);
  const xgi  = Number(p.xGI90 ?? 0);
  const fdr  = Number(p.fdrAttackNext3 ?? 3);   // lägre bättre
  const mr   = Number(p.minutesRisk ?? 0);      // 0..1
  const base = 0.6*form + 0.4*Math.min(xgi,1);
  const fdrAdj = (3.5 - fdr) * 0.08;            // ~ -0.2..+0.2
  return Math.max(0, base + fdrAdj) * (0.5 + 0.5*mr); // mins damp
}

router.get("/", async (req,res)=>{
  try {
    const outId = Number(req.query.out);
    const inId  = Number(req.query.in);
    const horizon = Math.max(1, Math.min(6, Number(req.query.horizon || 3)));

    if (!outId || !inId) return res.status(400).json({ ok:false, error:"Provide ?out=ID&in=ID" });

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const byId = Object.fromEntries((raw.metrics||[]).map(p=>[p.id,p]));
    const outP = byId[outId], inP = byId[inId];
    if (!outP || !inP) return res.status(404).json({ ok:false, error:"Player not found" });

    // MVP: använd samma värde för varje GW (du kan förbättra med fixture-vikter per GW)
    const evOut = evLike(outP) * horizon;
    const evIn  = evLike(inP)  * horizon;
    const diff  = evIn - evOut;

    res.json({ ok:true, currentGW: raw.currentGW, horizon, out: outP, in: inP, evOut, evIn, diff });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to compute transfer EV" });
  }
});

export default router;