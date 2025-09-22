// api/app.js
import express from "express";
import cors from "cors";

// --- Players & suggestions (befintliga) ---
import playersRoute from "./routes/players.js";
import suggestionsRoute from "./routes/suggestions.js";
import differentialsRoute from "./routes/differentials.js";
import xgiRoute from "./routes/xgi.js";
import risersRoute from "./routes/risers.js";
import rotationRoute from "./routes/rotation.js";
import trendsRoute from "./routes/trends.js";
import templateRoute from "./routes/template.js";
import captainMcRoute from "./routes/captainMc.js";
import transferStrategy from "./routes/suggestions/transferStrategy.js";

// --- Fixtures (befintlig + ny heatmap) ---
import fixturesRoute from "./routes/fixtures.js";
import heatmapRoute from "./routes/heatmap.js";

// --- Nya routes: pricewatch, congestion, stacks, alerts, compare, planner, meta, team ---
import pricewatchRoute from "./routes/pricewatch.js";
import congestionRoute from "./routes/congestion.js";
import stacksRoute from "./routes/stacks.js";
import alertsRoute from "./routes/alerts.js";
import compareRoute from "./routes/compare.js";
import playerSearchRoute from "./routes/playerSearch.js";
import plannerRoute from "./routes/planner.js";
import metaRoute from "./routes/meta.js";
import teamRoute from "./routes/team.js";         // ← Lokala lag-analyser (POST /team/analyze)
import transferRoute from "./routes/transfer.js";
import chipsRoute from "./routes/chips.js";

// --- NY: User/FPL-import i egen undermapp ---
// (ersätter tidigare userteam.js / fplImport.js)
import userTeamRoute from "./routes/user/team.js";

// (valfri) Post-GW review om du redan har den
import reviewRoute from "./routes/review.js";
import postGwReviewRouter from "./routes/review/post-gw.js";

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "fpl-edge-api" });
});

// --- Players: specifika först ---
app.use("/players/xgi-leaders", xgiRoute);
app.use("/players/risers", risersRoute);
app.use("/players/rotation-risks", rotationRoute);
app.use("/players/pricewatch", pricewatchRoute);
app.use("/players/trends", trendsRoute);
app.use("/players/search", playerSearchRoute);
app.use("/players/template", templateRoute);

// Generell players-lista
app.use("/players", playersRoute);

// --- Differentials (egen bas) ---
app.use("/differentials", differentialsRoute);

// --- Fixtures: heatmap före generella fixtures ---
app.use("/fixtures/heatmap", heatmapRoute);
app.use("/fixtures", fixturesRoute);

// --- Teams & alerts ---
app.use("/teams/congestion", congestionRoute);
app.use("/teams/stacks", stacksRoute);
app.use("/alerts", alertsRoute);

// --- Suggestions / Compare / Planner ---
app.use("/suggestions/captain-mc", captainMcRoute);
app.use("/suggestions/transfer", transferRoute);
app.use("/suggestions/transfer-strategy", transferStrategy);
app.use("/suggestions", suggestionsRoute);
app.use("/compare", compareRoute);
app.use("/planner", plannerRoute);
app.use("/chips", chipsRoute);

// --- USER TEAM (FPL-import m.m.) ---
// Ny router i routes/user/team.js (GET /user/team?entryId=... etc)
app.use("/user/team", userTeamRoute);

// --- REVIEW (om du använder den) ---
app.use("/review/post-gw", postGwReviewRouter);
app.use("/review", reviewRoute);

// --- Lokalt team-endpoint (analysera användarens manuella lag) ---
app.use("/team", teamRoute);

// --- Meta ---
app.use("/meta", metaRoute);

export default app;