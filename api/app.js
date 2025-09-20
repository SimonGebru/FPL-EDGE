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

// --- Nya routes: pricewatch, congestion, stacks, alerts, compare, user team, planner ---
import pricewatchRoute from "./routes/pricewatch.js";
import congestionRoute from "./routes/congestion.js";
import stacksRoute from "./routes/stacks.js";
import alertsRoute from "./routes/alerts.js";
import compareRoute from "./routes/compare.js";
import playerSearchRoute from "./routes/playerSearch.js";
import userteamRoute from "./routes/userteam.js";
import plannerRoute from "./routes/planner.js";
import metaRoute from "./routes/meta.js";
import teamRoute from "./routes/team.js";
import transferRoute from "./routes/transfer.js";
import chipsRoute from "./routes/chips.js";

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

// --- Compare & planner ---
app.use("/suggestions/captain-mc", captainMcRoute);
app.use("/suggestions/transfer", transferRoute);
app.use("/suggestions/transfer-strategy", transferStrategy);
app.use("/suggestions", suggestionsRoute);
app.use("/compare", compareRoute);
app.use("/planner", plannerRoute);
app.use("/chips", chipsRoute);

// --- User team (manuellt lag) ---
app.use("/user/team", userteamRoute);
app.use("/team", teamRoute);

app.use("/meta", metaRoute);

export default app;