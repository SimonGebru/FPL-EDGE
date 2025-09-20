// api/routes/template.js
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

function ownNum(x){ return Number(String(x ?? "").replace(",", ".")) || 0 }

router.get("/", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 15)));
    const idsParam = String(req.query.ids || "");
    const myIds = idsParam ? idsParam.split(",").map(s=>Number(s.trim())).filter(Boolean) : [];

    const raw = JSON.parse(await readFile(resolve(DATA_DIR, "metrics.json"), "utf-8"));
    const sorted = (raw.metrics || [])
      .map(p => ({...p, __own: ownNum(p.selected_by_percent)}))
      .sort((a,b)=> b.__own - a.__own);

    const template = sorted.slice(0, limit);
    const mySet = new Set(myIds);
    const missing = myIds.length ? template.filter(p => !mySet.has(p.id)) : template;

    res.json({ ok:true, currentGW: raw.currentGW, template, missing });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to compute template" });
  }
});

export default router;