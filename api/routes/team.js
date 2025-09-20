import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

function byIdMap(arr, key="id"){ return Object.fromEntries(arr.map(x=>[x[key], x])) }
function ownNum(x){ return Number(String(x ?? "").replace(",", ".")) || 0 }

function roleOrder(pos){
  // Ordning för startXI (GK=0, DEF=1, MID=2, FWD=3) – används i sorteringen
  if (!pos) return 9;
  const p = pos.toLowerCase();
  if (p.startsWith("goal")) return 0;
  if (p.startsWith("def"))  return 1;
  if (p.startsWith("mid"))  return 2;
  if (p.startsWith("for"))  return 3;
  return 9;
}

function startScore(p){
  // Heuristik för starta/bänka (tydlig och snabb):
  // - minutesRisk väger tungt
  // - formScore + xGI/90
  // - lägre FDR är bra
  const mr   = Number(p.minutesRisk ?? 0);     // 0..1
  const form = Number(p.formScore ?? 0)/100;   // 0..1
  const xgi  = Number(p.xGI90 ?? 0);          // ~0..1+
  const fdr  = Number(p.fdrAttackNext3 ?? 3); // 1..5, lägre bättre
  const fdrBoost = (3.5 - fdr) / 2;            // -1..+1 ungefär
  return (0.50*mr) + (0.30*form) + (0.20*Math.min(xgi,1)) + fdrBoost*0.10;
}

function pickXI(players){
  // 1 GK, 10 outfield. Enkel formation: 3-4-3 / 3-5-2 beroende på mittfält/forwards kvalitet.
  const gk  = players.filter(p=>p.position?.toLowerCase().startsWith("goal")).sort((a,b)=>startScore(b)-startScore(a));
  const def = players.filter(p=>p.position?.toLowerCase().startsWith("def")).sort((a,b)=>startScore(b)-startScore(a));
  const mid = players.filter(p=>p.position?.toLowerCase().startsWith("mid")).sort((a,b)=>startScore(b)-startScore(a));
  const fwd = players.filter(p=>p.position?.toLowerCase().startsWith("for")).sort((a,b)=>startScore(b)-startScore(a));

  const gkStart = gk[0] ? [gk[0]] : [];
  // Bas 3-4-3
  let defStart = def.slice(0,3);
  let midStart = mid.slice(0,4);
  let fwdStart = fwd.slice(0,3);

  // Justera om mittfältet är svagt / forwards svaga
  if ((mid[4]?.formScore ?? 0) > (fwd[2]?.formScore ?? 0)) {
    // 3-5-2
    midStart = mid.slice(0,5);
    fwdStart = fwd.slice(0,2);
  }

  const startXI = [...gkStart, ...defStart, ...midStart, ...fwdStart].slice(0,11);
  const startIds = new Set(startXI.map(p=>p.id));
  const bench = players.filter(p=>!startIds.has(p.id)).sort((a,b)=>startScore(b)-startScore(a));

  // Kapten/vice: välj högst captainEV, tiebreak startScore
  const sortedByCap = [...startXI].sort((a,b)=>{
    const evA = Number(a.captainEV ?? 0), evB = Number(b.captainEV ?? 0);
    if (evA !== evB) return evB - evA;
    return startScore(b) - startScore(a);
  });

  const captain = sortedByCap[0] || null;
  const vice    = sortedByCap[1] || null;

  return { startXI, bench, captain, vice };
}

router.post("/analyze", async (req, res) => {
  try {
    const { squad } = req.body || {};
    if (!Array.isArray(squad) || squad.length < 11) {
      return res.status(400).json({ ok:false, error:"Provide squad: number[] (>=11 player ids)" });
    }

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const byId = byIdMap(raw.metrics || []);
    const players = squad.map(id => byId[id]).filter(Boolean);

    const { startXI, bench, captain, vice } = pickXI(players);

    // SELL-kandidater (låg startScore, låg form, svår FDR, ok ersättningsutbud)
    const sellCandidates = [...players]
      .sort((a,b)=> startScore(a) - startScore(b))
      .slice(0,3);

    // SHORTLIST för IN (hög form, xGI, lätt FDR, rimligt ägande) – globalt toppval, inte position-balanserat (MVP)
    const shortlist = (raw.metrics || [])
      .filter(p => (p.formScore ?? 0) >= 65)
      .filter(p => (p.minutesRisk ?? 0) >= 0.75)
      .filter(p => (p.fdrAttackNext3 ?? 5) <= 3.2)
      .sort((a,b)=> (Number(b.xGI90 ?? 0) - Number(a.xGI90 ?? 0)) || ((b.formScore ?? 0) - (a.formScore ?? 0)))
      .slice(0,10);

    res.json({
      ok: true,
      currentGW: raw.currentGW,
      startXI, bench,
      captain, vice,
      sellCandidates,
      shortlist
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to analyze squad" });
  }
});

export default router;