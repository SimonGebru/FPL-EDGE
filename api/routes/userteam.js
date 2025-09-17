import { Router } from "express";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");
const TEAM_FILE = resolve(DATA_DIR, "user_team.json");

/**
 * POST /user/team
 * Body: { playerIds: number[], bank?: number, itb?: number }
 */
router.post("/", async (req, res) => {
  try {
    const { playerIds = [], bank = 0, itb = 0 } = req.body || {};
    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ ok:false, error:"Provide playerIds[]" });
    }
    await writeFile(TEAM_FILE, JSON.stringify({ playerIds, bank, itb, savedAt: new Date().toISOString() }, null, 2));
    res.json({ ok:true, saved: playerIds.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to save team" });
  }
});

/** GET /user/team */
router.get("/", async (_req, res) => {
  try {
    let json;
    try {
      json = JSON.parse(await readFile(TEAM_FILE, "utf-8"));
    } catch {
      json = { playerIds: [], bank: 0, itb: 0 };
    }
    res.json({ ok:true, team: json });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Failed to read team" });
  }
});

export default router;