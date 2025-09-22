// api/routes/user/team.js
import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

const toNum = (x, d = 0) => {
  const n = Number(String(x ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : d;
};

// Publika FPL-endpoints
const FPL_BASE = process.env.FPL_BASE || "https://fantasy.premierleague.com/api";

async function fplJson(path) {
  const res = await fetch(`${FPL_BASE}${path}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (FPL-Edge MVP)",
      "Accept": "application/json,text/plain,*/*",
    },
  });
  if (!res.ok) throw new Error(`FPL ${res.status} ${res.statusText} for ${path}`);
  return res.json();
}

// Ladda bootstrap → index för element/lag/position + currentGW
async function loadIndex() {
  const boot = await fplJson("/bootstrap-static/");
  const teamsById = {};
  for (const t of boot.teams || []) teamsById[t.id] = t;

  const elemsById = {};
  for (const e of boot.elements || []) elemsById[e.id] = e;

  const posById = {};
  for (const p of boot.element_types || []) posById[p.id] = p.singular_name;

  const events = boot?.events || [];
  const currentGW =
    events.find(e => e.is_current)?.id ??
    events.find(e => e.is_next)?.id ??
    events[0]?.id ??
    1;

  return { teamsById, elemsById, posById, currentGW };
}

// ---- 1) GET /user/team?entryId=XXXX[&gw=YY] ---------------------------------
router.get("/", async (req, res) => {
  try {
    const entryId = String(req.query.entryId || "").trim();
    const gwParam = toNum(req.query.gw, NaN);
    if (!entryId) return res.status(400).json({ ok: false, error: "Missing ?entryId" });

    const { teamsById, elemsById, posById, currentGW } = await loadIndex();
    const gw = Number.isFinite(gwParam) ? gwParam : currentGW;

    // Grundinfo om laget/entry
    const entry = await fplJson(`/entry/${entryId}/`);

    // Picks för GW (kan kräva inlogg före deadline – fånga det)
    let picksJson = null;
    try {
      picksJson = await fplJson(`/entry/${entryId}/event/${gw}/picks/`);
    } catch (e) {
      return res.json({
        ok: true,
        entry: {
          id: entry.id,
          name: entry.name,
          player_first_name: entry.player_first_name,
          player_last_name: entry.player_last_name,
        },
        currentGW,
        gw,
        picks: [],
        warning:
          "Kunde inte läsa picks för vald GW (FPL kräver ibland inlogg före deadline). Testa en GW efter deadline.",
      });
    }

    const captainId = picksJson.picks?.find(p => p.is_captain)?.element ?? null;
    const viceId = picksJson.picks?.find(p => p.is_vice_captain)?.element ?? null;

    const picks = (picksJson.picks || []).map(p => {
      const el = elemsById[p.element];
      const t = el ? teamsById[el.team] : null;
      const pos = el ? posById[el.element_type] : null;
      return {
        element: p.element,
        web_name: el?.web_name ?? `#${p.element}`,
        team: t?.name ?? "-",
        position: pos ?? "-",
        is_captain: !!p.is_captain,
        is_vice: !!p.is_vice_captain,
        buy_price: p.purchase_price != null ? p.purchase_price / 10 : null,
        sell_price: p.selling_price != null ? p.selling_price / 10 : null,
      };
    });

    res.json({
      ok: true,
      entry: {
        id: entry.id,
        name: entry.name,
        player_first_name: entry.player_first_name,
        player_last_name: entry.player_last_name,
      },
      currentGW,
      gw,
      bank: picksJson.entry_history?.bank ?? null,   // i 0.1 m
      value: picksJson.entry_history?.value ?? null, // lagvärde i 0.1 m
      picks,
      captainElement: captainId,
      viceElement: viceId,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "user/team failed" });
  }
});

// ---- 2) GET /user/team/import-fpl?entry=XXXX  (nuvarande GW) ----------------
router.get("/import-fpl", async (req, res) => {
  try {
    const entry = String(req.query.entry || "").trim();
    if (!entry) return res.status(400).json({ ok: false, error: "Missing ?entry" });

    const { teamsById, elemsById, posById, currentGW } = await loadIndex();
    const gw = currentGW;

    // Entry-info + picks för current GW
    const [entryInfo, picksJson] = await Promise.all([
      fplJson(`/entry/${entry}/`),
      // Samma notis som ovan: före deadline kan detta kräva inlogg – fångas av catch
      fplJson(`/entry/${entry}/event/${gw}/picks/`),
    ]);

    const picks = (picksJson?.picks || []).map(p => {
      const el = elemsById[p.element];
      const t = el ? teamsById[el.team] : null;
      const pos = el ? posById[el.element_type] : null;
      return {
        id: p.element,                // alias key
        element: p.element,
        web_name: el?.web_name ?? `#${p.element}`,
        team: t?.name ?? "-",
        position: pos ?? "-",
        now_cost: el?.now_cost ?? null, // 0.1 m
        is_captain: !!p.is_captain,
        is_vice: !!p.is_vice_captain,
      };
    });

    const bank = picksJson?.entry_history?.bank ?? null; // i 0.1 m
    const itb = bank != null ? bank / 10 : null;

    res.json({
      ok: true,
      entry: Number(entry),
      gw,
      team_name: entryInfo?.name ?? null,
      player_name:
        entryInfo?.player_first_name && entryInfo?.player_last_name
          ? `${entryInfo.player_first_name} ${entryInfo.player_last_name}`
          : null,
      picks,
      bank,
      itb,
    });
  } catch (e) {
    // Om FPL kräver inlogg före deadline så kommer vi hamna här
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to import FPL team (may require login before deadline)" });
  }
});

export default router;