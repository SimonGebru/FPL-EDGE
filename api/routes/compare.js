import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

// Samma EV-formel som i /suggestions/captain
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function form10(f){return clamp((Number(f||0))/10,0,10);}
function xgi10(x){return clamp((Number(x||0))*10,0,10);}
function boost(fdr){const f=Number.isFinite(fdr)?fdr:3;return clamp(5-f,0,4);}
function evOf(p,wForm=0.6,wXGI=0.4){
  const comp = wForm*form10(p.formScore) + wXGI*xgi10(p.xGI90) + boost(p.fdrAttackNext3);
  return Math.round((comp*clamp(p.minutesRisk??0,0.4,1)*2)*10)/10;
}

router.get("/", async (req, res) => {
  try {
    const ids = String(req.query.ids || "").split(",").map(s=>Number(s.trim())).filter(Boolean);
    if (!ids.length) return res.status(400).json({ ok:false, error:"Provide ids=1,2,3" });
    const wForm = Number(req.query.wForm) || 0.6;
    const wXGI = Number(req.query.wXGI) || 0.4;

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const byId = Object.fromEntries((raw.metrics||[]).map(p=>[p.id,p]));

    const players = ids.map(id => {
      const p = byId[id];
      if (!p) return { id, error: "not found" };
      const ev = evOf(p,wForm,wXGI);
      return {
        id: p.id, name: p.web_name, team: p.team, pos: p.position, price: p.now_cost,
        own: p.selected_by_percent, formScore: p.formScore, xGI90: p.xGI90,
        minutesRisk: p.minutesRisk, fdrAttackNext3: p.fdrAttackNext3, captainEV: ev
      };
    });

    // Ranka
    const ranked = players
      .filter(p=>!p.error)
      .sort((a,b)=> (b.captainEV ?? 0) - (a.captainEV ?? 0));

    res.json({ ok:true, currentGW: raw.currentGW, params:{ids,wForm,wXGI}, players, ranked });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to compare players" });
  }
});

export default router;