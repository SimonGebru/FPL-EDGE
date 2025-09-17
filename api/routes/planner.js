import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function form10(f){return clamp((Number(f||0))/10,0,10);}
function xgi10(x){return clamp((Number(x||0))*10,0,10);}
function boost(fdr){const f=Number.isFinite(fdr)?fdr:3;return clamp(5-f,0,4);}
function composite(p, wForm=0.6, wXGI=0.4) {
  return wForm*form10(p.formScore) + wXGI*xgi10(p.xGI90) + boost(p.fdrAttackNext3);
}
/**
 * GET /planner/whatif?in=ID&out=ID
 * Returnerar delta i projected score (3 GW proxy) och spelarinfo.
 */
router.get("/whatif", async (req, res) => {
  try {
    const idIn = Number(req.query.in);
    const idOut = Number(req.query.out);
    if (!idIn || !idOut) return res.status(400).json({ ok:false, error:"Provide ?in= and ?out=" });

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const byId = Object.fromEntries((raw.metrics||[]).map(p => [p.id, p]));
    const pin = byId[idIn], pout = byId[idOut];
    if (!pin || !pout) return res.status(404).json({ ok:false, error:"Unknown player id" });

    const cin = composite(pin);
    const cout = composite(pout);
    const safeMin = clamp(pin.minutesRisk ?? 0, 0.5, 1);
    const riskOut = clamp(pout.minutesRisk ?? 0, 0.5, 1);

    // enkel proxy för 3 GW – multiplicera med minutesRisk
    const projIn = Math.round((cin * safeMin * 3) * 10) / 10;
    const projOut = Math.round((cout * riskOut * 3) * 10) / 10;
    const delta = Math.round((projIn - projOut) * 10) / 10;

    res.json({
      ok: true,
      currentGW: raw.currentGW,
      delta3GW: delta,
      in: { id: pin.id, name: pin.web_name, price: pin.now_cost, team: pin.team, pos: pin.position, formScore: pin.formScore, xGI90: pin.xGI90, fdr: pin.fdrAttackNext3, minutesRisk: pin.minutesRisk },
      out:{ id: pout.id, name: pout.web_name, price: pout.now_cost, team: pout.team, pos: pout.position, formScore: pout.formScore, xGI90: pout.xGI90, fdr: pout.fdrAttackNext3, minutesRisk: pout.minutesRisk }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to compute what-if" });
  }
});

export default router;