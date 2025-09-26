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

// Availability-badge från element (bootstrap)
function buildAvailability(el) {
  // status: 'a'=available, 'd'=doubtful, 'i'=injured, 's'=suspended, 'n'=not available, 'u'=unregistered
  const status = el?.status ?? 'a';
  const chanceNext = typeof el?.chance_of_playing_next_round === 'number'
    ? el.chance_of_playing_next_round
    : null;
  const news = el?.news || null;
  const newsAt = el?.news_added || null;

  let flag = null;
  if (status === 'i' || status === 's' || status === 'n' || status === 'u') flag = 'red';
  else if (status === 'd' || (typeof chanceNext === 'number' && chanceNext < 100)) flag = 'yellow';

  return {
    status,            // 'a' | 'd' | 'i' | 's' | 'n' | 'u'
    chanceNext,        // 0..100 eller null
    news,              // text
    newsAt,            // ISO-tid
    flag,              // 'red' | 'yellow' | null
    isInjured: status === 'i',
    isSuspended: status === 's',
    isDoubtful: status === 'd' || (typeof chanceNext === 'number' && chanceNext < 100),
    isUnavailable: status === 'n' || status === 'u',
  };
}

// Ladda bootstrap → index + events + currentGW
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

  return { teamsById, elemsById, posById, events, currentGW };
}

/**
 * GET /user/team?entryId=XXXX[&gw=YY]
 * Smart hämtning:
 *  - Om gw anges: försök just den GW:n.
 *  - Annars: current → next → last finished (för att plocka upp “draft” pre-deadline).
 * Svar inkluderar: gwKind ('current'|'next'|'finished'), deadline_time, availability per spelare.
 */
router.get("/", async (req, res) => {
  try {
    const entryId = String(req.query.entryId || "").trim();
    const gwParam = toNum(req.query.gw, NaN);
    if (!entryId) return res.status(400).json({ ok: false, error: "Missing ?entryId" });

    const { teamsById, elemsById, posById, events, currentGW } = await loadIndex();

    // Entry-basinfo
    const entry = await fplJson(`/entry/${entryId}/`);

    // Hjälpare: hämta picks för given GW (kan faila pre-deadline)
    async function tryPicks(gw) {
      if (!gw) return null;
      try {
        const json = await fplJson(`/entry/${entryId}/event/${gw}/picks/`);
        return { gw, json };
      } catch {
        return null;
      }
    }

    let trial = null;
    let gwKind = null;

    if (Number.isFinite(gwParam)) {
      // Respektera explicit GW
      trial = await tryPicks(gwParam);
      gwKind = trial ? (
        events.find(e => e.id === gwParam)?.is_current ? 'current' :
        events.find(e => e.id === gwParam)?.is_next    ? 'next'    :
        events.find(e => e.id === gwParam)?.finished   ? 'finished' : 'manual'
      ) : null;
    } else {
      // Smart ordning: current → next → last finished
      const current = events.find(e => e.is_current) || null;
      const next    = events.find(e => e.is_next) || null;
      const finished= events.filter(e => e.finished).sort((a,b)=>b.id-a.id)[0] || null;

      trial = (await tryPicks(current?.id)) ||
              (await tryPicks(next?.id)) ||
              (await tryPicks(finished?.id));

      if (trial) {
        if (current && trial.gw === current.id) gwKind = 'current';
        else if (next && trial.gw === next.id)  gwKind = 'next';
        else if (finished && trial.gw === finished.id) gwKind = 'finished';
      }
    }

    if (!trial) {
      // Kunde inte läsa picks (oftast p.g.a. inloggkrav pre-deadline)
      return res.json({
        ok: true,
        entry: {
          id: entry.id,
          name: entry.name,
          player_first_name: entry.player_first_name,
          player_last_name: entry.player_last_name,
        },
        currentGW,
        gw: null,
        gwKind: null,
        picks: [],
        warning: "Kunde inte läsa picks (kan kräva inlogg före deadline). Försök igen senare eller efter deadline.",
      });
    }

    const picksJson = trial.json;
    const usedEvent = events.find(e => e.id === trial.gw) || null;

    const captainId = picksJson.picks?.find(p => p.is_captain)?.element ?? null;
    const viceId    = picksJson.picks?.find(p => p.is_vice_captain)?.element ?? null;

    const picks = (picksJson?.picks || []).map(p => {
      const el  = elemsById[p.element];
      const t   = el ? teamsById[el.team] : null;
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
        now_cost: el?.now_cost ?? null,
        availability: buildAvailability(el), // ⬅️ NYTT
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
      gw: trial.gw,
      gwKind,                                        // 'current' | 'next' | 'finished' | 'manual'
      deadline_time: usedEvent?.deadline_time ?? null,
      bank: picksJson.entry_history?.bank ?? null,   // i 0.1 m
      value: picksJson.entry_history?.value ?? null, // i 0.1 m
      picks,
      captainElement: captainId,
      viceElement: viceId,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "user/team failed" });
  }
});

/**
 * GET /user/team/import-fpl?entry=XXXX   (alias: ?entryId=XXXX)
 * Hämtar current GW picks (kan faila pre-deadline). Inkluderar availability.
 */
router.get("/import-fpl", async (req, res) => {
  try {
    const entry = String(req.query.entry || req.query.entryId || "").trim();
    if (!entry) return res.status(400).json({ ok: false, error: "Missing ?entry (eller ?entryId)" });

    const { teamsById, elemsById, posById, currentGW } = await loadIndex();
    const gw = currentGW;

    const [entryInfo, picksJson] = await Promise.all([
      fplJson(`/entry/${entry}/`),
      fplJson(`/entry/${entry}/event/${gw}/picks/`), // kan kräva inlogg pre-deadline
    ]);

    const picks = (picksJson?.picks || []).map(p => {
      const el  = elemsById[p.element];
      const t   = el ? teamsById[el.team] : null;
      const pos = el ? posById[el.element_type] : null;

      return {
        id: p.element,
        element: p.element,
        web_name: el?.web_name ?? `#${p.element}`,
        team: t?.name ?? "-",
        position: pos ?? "-",
        now_cost: el?.now_cost ?? null, // 0.1 m
        is_captain: !!p.is_captain,
        is_vice: !!p.is_vice_captain,
        availability: buildAvailability(el), // ⬅️ NYTT
      };
    });

    const bank = picksJson?.entry_history?.bank ?? null; // i 0.1 m
    const itb  = bank != null ? bank / 10 : null;

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
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to import FPL team (may require login before deadline)" });
  }
});

export default router;