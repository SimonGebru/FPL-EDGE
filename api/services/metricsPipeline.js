import "dotenv/config";
import fetch from "node-fetch";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { computeFormScoreFromHistory } from "../utils/formScore.js";
import { computeMinutesRisk } from "../utils/minutesRisk.js";
import { attackFDRForTeamNextN, computeDefenceRanges } from "../utils/fdr.js";
import { computeXgXaGi90 } from "../utils/xg.js"; // <-- NYTT

const DATA_DIR = resolve(process.cwd(), "../data");
const FPL_BASE = process.env.FPL_BASE || "https://fantasy.premierleague.com/api";

// Styrning via ENV
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 350);
const MIN_TOTAL_MINUTES = Number(process.env.MIN_TOTAL_MINUTES || 90);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 10);
const BATCH_PAUSE_MS = Number(process.env.BATCH_PAUSE_MS || 300);

// --- Hjälpare för nätanrop ---------------------------------------------------
async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "fpl-edge-mvp" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchElementSummary(playerId) {
  return fetchJson(`${FPL_BASE}/element-summary/${playerId}/`);
}

// Enkel concurrency-kö (för att inte smattra FPL onödigt hårt)
async function processInBatches(items, handler, batchSize = 10, pauseMs = 200) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const out = await Promise.allSettled(batch.map(handler));
    results.push(...out);
    if (i + batchSize < items.length && pauseMs > 0) {
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
  return results;
}

// --- Huvudflöde --------------------------------------------------------------
async function main() {
  const bootstrapPath = resolve(DATA_DIR, "bootstrap.json");
  const fixturesPath  = resolve(DATA_DIR, "fixtures.json");

  const bootstrap = JSON.parse(await readFile(bootstrapPath, "utf-8"));
  const fixtures  = JSON.parse(await readFile(fixturesPath, "utf-8"));

  const players   = bootstrap.elements || [];
  const teams     = bootstrap.teams || [];
  const positions = bootstrap.element_types || [];
  const events    = bootstrap.events || [];

  const teamsById   = Object.fromEntries(teams.map(t => [t.id, t]));
  const posById     = Object.fromEntries(positions.map(p => [p.id, p]));
  const defenceRanges = computeDefenceRanges(teams);

  const currentEvent =
    events.find(e => e.is_current) ??
    events.find(e => e.is_next) ??
    events[0];
  const currentGW = currentEvent?.id ?? 1;

  // --- Urval: bredare & smartare --------------------------------------------
  const scored = players.map(p => {
    const own     = num(p.selected_by_percent);
    const fplForm = num(p.form);          // FPL:s egna formtal (sträng -> siffra)
    const minutes = p.minutes || 0;       // säsongens totala minuter
    const mix = fplForm * 2 + Math.min(minutes / 90, 5) - own * 0.05;
    return { ...p, __own: own, __mix: mix };
  });

  const topPlayers = scored
    .filter(p => (p.minutes || 0) >= MIN_TOTAL_MINUTES)
    // .filter(p => !["i","s","n"].includes(p.status)) // valfritt
    .sort((a, b) => b.__mix - a.__mix)
    .slice(0, MAX_PLAYERS);

  // --- Hämta detaljer (element-summary) -------------------------------------
  const summaries = await processInBatches(
    topPlayers,
    async (p) => {
      const summary = await fetchElementSummary(p.id);
      return { playerId: p.id, summary };
    },
    BATCH_SIZE,
    BATCH_PAUSE_MS
  );

  const summaryById = {};
  for (const r of summaries) {
    if (r.status === "fulfilled" && r.value?.playerId) {
      summaryById[r.value.playerId] = r.value.summary;
    }
  }

  // --- Nästa fixtures per lag (för congestion/minutesRisk) -------------------
  const nextFixturesByTeamId = {};
  for (const t of teams) nextFixturesByTeamId[t.id] = [];
  for (const f of fixtures) {
    if (typeof f.event === "number" && f.event >= currentGW && !f.finished) {
      nextFixturesByTeamId[f.team_h].push(f);
      nextFixturesByTeamId[f.team_a].push(f);
    }
  }

  // --- Beräkna metrics per spelare ------------------------------------------
  const metrics = [];
  for (const p of topPlayers) {
    const team = teamsById[p.team];
    const pos  = posById[p.element_type];

    const sum     = summaryById[p.id];
    const history = sum?.history ?? [];

    // Form + minutes risk + FDR
    const formScore  = computeFormScoreFromHistory(history);
    const nextTeamFix = nextFixturesByTeamId[p.team] ?? [];
    const minutesRisk = computeMinutesRisk(history, p, nextTeamFix);
    const fdrAttackNext3 = attackFDRForTeamNextN(
      p.team, fixtures, teamsById, currentGW, 3, defenceRanges
    );

    // xG/xA/xGI 90 (senaste ~4 matcher)
    const { xG90, xA90, xGI90, source: xgSource } = computeXgXaGi90(history);

    // Transfers/price (denna GW)
    const netTransfersEvent = (p.transfers_in_event || 0) - (p.transfers_out_event || 0);
    const momentumScore     = Math.round((netTransfersEvent / 1000) * 100) / 100; // per 1k
    const priceChangeEvent  = p.cost_change_event || 0; // +1 = +0.1

    metrics.push({
      id: p.id,
      web_name: p.web_name,
      team: team?.name || "Unknown",
      position: pos?.singular_name || "Unknown",
      now_cost: p.now_cost,                   // pris *0.1
      selected_by_percent: p.selected_by_percent,

      // Bas-metrics
      formScore,
      minutesRisk,
      fdrAttackNext3,

      // xG/xA/xGI
      xG90, xA90, xGI90, xgSource,

      // Momentum/price
      netTransfersEvent,
      momentumScore,
      priceChangeEvent
    });
  }

  const outPath = resolve(DATA_DIR, "metrics.json");
  await writeFile(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    currentGW,
    count: metrics.length,
    metrics
  }, null, 2));

  console.log(`Wrote metrics to /data/metrics.json for GW ${currentGW} (players: ${metrics.length})`);
}

function num(x) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

main().catch((e) => {
  console.error("metricsPipeline failed:", e);
  process.exit(1);
});