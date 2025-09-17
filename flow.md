
            ┌─────────────────────┐
        │  FPL API Endpoints  │
        │  bootstrap, fixtures│
        └─────────┬───────────┘
                  │ (fetch)
                  ▼
        ┌─────────────────────┐
        │   Rådata (/data)    │
        │  bootstrap.json     │
        │  fixtures.json      │
        └─────────┬───────────┘
                  │ (metricsPipeline)
                  ▼
        ┌─────────────────────┐
        │  Beräkningar (API)  │
        │  - FormScore        │
        │  - FDR (att/def)    │
        │  - Minutes/Risk     │
        │  - Captain EV       │
        └─────────┬───────────┘
                  │ (persist)
                  ▼
        ┌─────────────────────┐
        │   Databas (MVP→DB)  │
        │  players, fixtures  │
        │  computed_metrics   │
        └─────────┬───────────┘
                  │ (REST)
                  ▼
        ┌─────────────────────┐
        │    API Endpoints    │
        │  /players /fixtures │
        │  /suggestions/*     │
        └─────────┬───────────┘
                  │ (fetch)
                  ▼
        ┌─────────────────────┐
        │     Frontend UI     │
        │  Dashboard/Explorer │
        │  Heatmap/Watchlist  │
        └─────────────────────┘

      (Nightly Cron) ─────────┘  uppdaterar rådata + metrics


      FAS 1 — Skelett & rådata (Dag 1)

Uppgifter
	•	Skapa repo + mappar /api, /web, /data.
	•	Initiera Node i /api och React (Vite) i /web.
	•	Implementera scripts/fetchFplData.js (bootstrap + fixtures → /data).
	•	Lägg in npm run fetch:data i api/package.json.
	•	Kör första hämtningen lokalt; spara JSON.

Leverabler
	•	/data/bootstrap.json, /data/fixtures.json finns och ser rimliga ut.
	•	README + FLOW i root.

Check
	•	Man kan köra node scripts/fetchFplData.js utan fel.
	•	JSON-filer uppdateras.

⸻

FAS 2 — Metrics-pipeline (Dag 2)

Uppgifter
	•	Skapa utils/formScore.js, utils/fdr.js, utils/captainEV.js.
	•	Bygg services/metricsPipeline.js som:
	•	Läser rådata,
	•	Beräknar FormScore/FDR/MinutesRisk,
	•	Skriver resultat (MVP: till data/metrics.json, senare DB).
	•	Skapa script npm run build:metrics.

Leverabler
	•	data/metrics.json med fält per spelare: {id, name, team, position, formScore, fdrAttackNext3, minutesRisk, captainEV}.

Check
	•	Rimliga värden (ej 0/NaN överallt), topplistan “känns” rätt jämfört med FPL-appen.

⸻

FAS 3 — API (Dag 3)

Uppgifter
	•	Express-app (app.js, server.js).
	•	Routes:
	•	GET /players (filter: position, minForm, maxRisk…)
	•	GET /fixtures/heatmap?horizon=5
	•	GET /suggestions/captain
	•	GET /suggestions/watchlist
	•	Felhantering, CORS, env-variabler.

Leverabler
	•	Kör npm run dev → API svarar på lokala requests.

Check
	•	Snabb Postman-test: alla endpoints returnerar JSON inom 300–500 ms lokalt.

⸻

FAS 4 — Frontend Dashboard (Dag 4)

Uppgifter
	•	Skapa Dashboard.jsx med fyra widgets:
	•	Captain Picks (topp 3)
	•	Top Form (per position, tabs)
	•	Fixture Heatmap (kommande 5 GW)
	•	Watchlist (stigande form + bra fixtures)
	•	lib/api.js för fetch med bas-URL från .env.

Leverabler
	•	UI visar data från API live.
	•	Responsiv layout (mobil först).

Check
	•	Öppna webben → ser 4 sektioner med uppdaterad data utan reloadfel.

⸻

FAS 5 — Cron & enklare deploy (Dag 5)

Uppgifter
	•	GitHub Actions workflow .github/workflows/cron.yml:
	•	Kör fetchFplData + build:metrics 1×/natt (och extra runda på deadline-dagen).
	•	(MVP) committa uppdaterad data/metrics.json till repo eller deploya API.
	•	Välj enkel hosting (Render/Railway/Netlify/Vercel för webdelen).

Leverabler
	•	Nightly uppdatering fungerar.

Check
	•	Nästa morgon har metrics.json/API färsk data.

⸻

FAS 6 — Förfining & kvalitet (Vecka 2)

Uppgifter
	•	Byt från fil-baserad lagring → DB (Mongo/Postgres).
	•	Lägg till GET /players/:id med matchhistorik + kommande fixtures.
	•	UI-filter (pris, ägande, klubb) i Player Explorer.
	•	Prestanda (indexering/agg i DB) + rate-limit på externa anrop.

Leverabler
	•	Stabil, snabb baseline med sök/filter.

Check
	•	API <300 ms på vanliga queries (lokalt/hostat), UI känns snärtigt.

⸻

FAS 7 — “Pro-edge” (Vecka 3–6)

Uppgifter
	•	xPts per spelare per GW (om xG/xA-data finns).
	•	Captaincy Monte Carlo (minuter + events).
	•	Rotation risk modell (logistisk regression).
	•	Prisrörelse-proxy + alerts (Discord/Telegram).

Leverabler
	•	Captain EV visar även konfidensintervall.
	•	Alerts triggas på signifikanta förändringar.