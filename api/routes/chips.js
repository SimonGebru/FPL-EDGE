// api/routes/chips.js
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

function startScore(p){
  const mr   = Number(p.minutesRisk ?? 0);
  const form = Number(p.formScore ?? 0)/100;
  const xgi  = Number(p.xGI90 ?? 0);
  const fdr  = Number(p.fdrAttackNext3 ?? 3);
  const fdrBoost = (3.5 - fdr) / 2;
  return (0.50*mr) + (0.30*form) + (0.20*Math.min(xgi,1)) + fdrBoost*0.10;
}

router.get("/recommendations", async (req, res) => {
  try {
    const horizon = Math.max(1, Math.min(6, Number(req.query.horizon || 3)));
    const ids = String(req.query.ids || "").split(",").map(s=>Number(s.trim())).filter(Boolean);

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const metrics = raw.metrics || [];
    const byId = Object.fromEntries(metrics.map(p=>[p.id,p]));
    const squad = ids.length ? ids.map(id=>byId[id]).filter(Boolean) : [];

    const notes = [];

    // Triple Captain kandidat från hela playerpoolen eller din trupp
    const pool = (squad.length ? squad : metrics).filter(p => (p.minutesRisk ?? 0) >= 0.75);
    const sortedEv = [...pool].sort((a,b)=> (Number(b.captainEV ?? 0) - Number(a.captainEV ?? 0)));
    const top = sortedEv[0];

    const tcSuggest = top && (top.captainEV ?? 0) >= 6.5 && (top.fdrAttackNext3 ?? 5) <= 3.0 && (top.minutesRisk ?? 0) >= 0.85;

    // Bench Boost heuristik
    const mr70 = squad.filter(p=> (p?.minutesRisk ?? 0) >= 0.70).length;
    const benchBoostOk = squad.length >= 14 && mr70 >= 14;

    // Wildcard heuristik (lågt lag-startscore + många sell)
    const avgStart = squad.length ? (squad.reduce((a,p)=>a+startScore(p),0) / squad.length) : 0;
    const sellCnt  = squad.filter(p => startScore(p) < 0.45).length;
    const wildcardOk = (avgStart < 0.50 && sellCnt >= 5);

    if (tcSuggest) notes.push({ chip:"Triple Captain", reason:`${top.web_name} har hög EV (${(top.captainEV ?? 0).toFixed(1)}), lätt FDR (${top.fdrAttackNext3}) och hög startchans (${Math.round((top.minutesRisk??0)*100)}%).`, player: top });
    if (benchBoostOk) notes.push({ chip:"Bench Boost", reason:`Minst 14 av dina spelare har startchans ≥70%.` });
    if (wildcardOk) notes.push({ chip:"Wildcard", reason:`Låg lag-form (avgStart ${(avgStart*100).toFixed(0)}‰) och ${sellCnt} möjliga sälj.` });

    res.json({ ok:true, currentGW: raw.currentGW, horizon, recommendations: notes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to compute chip recommendations" });
  }
});

export default router;