// api/routes/meta.js
import { Router } from "express";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const router = Router();
const DATA_DIR = resolve(process.cwd(), "../data");

function toIso(x) {
  try {
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

router.get("/sources", async (_req, res) => {
  try {
    const paths = {
      bootstrap: resolve(DATA_DIR, "bootstrap.json"),
      fixtures: resolve(DATA_DIR, "fixtures.json"),
      metrics: resolve(DATA_DIR, "metrics.json"),
    };

    // Läs filer (om de finns)
    const [bootstrapRaw, fixturesRaw, metricsRaw] = await Promise.all([
      readFile(paths.bootstrap, "utf-8").catch(() => null),
      readFile(paths.fixtures, "utf-8").catch(() => null),
      readFile(paths.metrics, "utf-8").catch(() => null),
    ]);

    const [bootstrapStat, fixturesStat, metricsStat] = await Promise.all([
      stat(paths.bootstrap).catch(() => null),
      stat(paths.fixtures).catch(() => null),
      stat(paths.metrics).catch(() => null),
    ]);

    const bootstrap = bootstrapRaw ? JSON.parse(bootstrapRaw) : null;
    const fixtures  = fixturesRaw  ? JSON.parse(fixturesRaw)  : null;
    const metrics   = metricsRaw   ? JSON.parse(metricsRaw)   : null;

    // Basdata
    const events = bootstrap?.events ?? [];
    const teams  = bootstrap?.teams ?? [];
    const currentEvent =
      events.find(e => e.is_current) ??
      events.find(e => e.is_next) ??
      events[0];
    const currentGW = currentEvent?.id ?? null;

    // Fixture-färskhet
    let nextKickoff = null, lastKickoff = null, upcoming = 0;
    if (Array.isArray(fixtures)) {
      const times = fixtures
        .map(f => f?.kickoff_time ? new Date(f.kickoff_time).getTime() : null)
        .filter(t => Number.isFinite(t))
        .sort((a,b)=>a-b);

      const now = Date.now();
      nextKickoff = toIso(times.find(t => t >= now));
      lastKickoff = toIso([...times].reverse().find(t => t <= now));

      upcoming = fixtures.filter(f => f?.kickoff_time && !f.finished && new Date(f.kickoff_time).getTime() >= now).length;
    }

    // Metrics-färskhet
    const metricsGeneratedAt = metrics?.generatedAt ?? null;
    const metricsCount = metrics?.count ?? metrics?.metrics?.length ?? null;

    res.json({
      ok: true,
      files: {
        bootstrap: {
          path: "data/bootstrap.json",
          modifiedAt: bootstrapStat ? new Date(bootstrapStat.mtimeMs).toISOString() : null,
          teams: teams.length || null,
          events: events.length || null,
        },
        fixtures: {
          path: "data/fixtures.json",
          modifiedAt: fixturesStat ? new Date(fixturesStat.mtimeMs).toISOString() : null,
          total: Array.isArray(fixtures) ? fixtures.length : null,
          nextKickoff,
          lastKickoff,
          upcoming,
        },
        metrics: {
          path: "data/metrics.json",
          modifiedAt: metricsStat ? new Date(metricsStat.mtimeMs).toISOString() : null,
          generatedAt: metricsGeneratedAt,
          players: metricsCount,
          currentGW,
        },
      },
      summary: {
        currentGW,
        nextKickoff,
        dataFreshAt: metricsGeneratedAt ?? (metricsStat ? new Date(metricsStat.mtimeMs).toISOString() : null),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Failed to read meta sources" });
  }
});

export default router;