FPL Edge är en lättviktig verktygsapp som hjälper Fantasy Premier League-spelare att fatta bättre beslut kring transfers och captaincy. Appen samlar officiella FPL-data, räknar fram enkla men användbara indikatorer (FormScore, Fixture Difficulty, Minutes/Rotation Risk) och presenterar förslag på kaptener, fyndspelare och kommande matcher i en tydlig dashboard. Fokus: snabb översikt + smarta heuristiker som ger en liten edge utan att bli övertekniskt.

Funktioner (MVP)
	•	FormScore (0–100) per spelare, baserat på senaste matcher (poäng/90 justerat för speltid).
	•	Fixture Difficulty (FDR 1–5) per lag och position (anfall/defensiv) för kommande GW.
	•	Minutes/Rotation Risk (0–1) heuristik baserat på starter-frekvens, status (fit/doubtful) och spelschema.
	•	Captain Picks – topp 3 kandidater inför nästa GW (enkel EV-proxy).
	•	Watchlist – spelare med stigande form + bra fixtures (låg ägarandel föredras).
	•	Alerts (valfritt i MVP) – enklare push till Discord/Telegram vid trend/skada.

Tech-stack
	•	Frontend: React + Vite + Tailwind (Next.js funkar också).
	•	Backend: Node.js + Express (cron för datainsamling/beräkning).
	•	Databas: MongoDB eller Postgres (MVP kan börja med JSON-filer lokalt).
	•	CI/Cron: GitHub Actions / Render / Railway för nattliga uppdateringar.


Datakällor (öppna FPL-endpoints)
	•	https://fantasy.premierleague.com/api/bootstrap-static/
	•	https://fantasy.premierleague.com/api/fixtures/
	•	https://fantasy.premierleague.com/api/element-summary/{player_id}/

 Indikatorer (MVP-logik)
	•	FormScore (0–100):
	•	Ta senaste 4 matcher med >0 minuter → snitt( (poäng/min)*90 ).
	•	Skala grovt till 0–100. Multiplicera med minutes-säkerhet (0.6–1.0) för att undvika “inhoppsfällor”.
	•	FDR (1–5, halva steg ok):
	•	Start 3 (neutral). Justera med motståndets insläppta/match och hemma/borta-bonus.
	•	Separera gärna Attack-FDR och Defense-FDR.
	•	Minutes/Rotation Risk (0–1):
	•	risk = 1 - starterRate * availability * restFactor
där availability ∈ {0, 0.5, 1}, restFactor minskar vid ≤3 dagars vila.
	•	Captain EV (proxy):
	•	EV ≈ (form/10 + (5 - FDR_Att)) * minutesSafety * 2 → rangordna topp 3.
    
 API-endpoints (MVP)
	•	GET /players?position=FWD&minForm=60 – lista spelare med beräknade metrics.
	•	GET /players/:id – detaljer inkl. senaste matcher och kommande fixtures.
	•	GET /fixtures/heatmap?horizon=5 – lag × GW matris med FDR.
	•	GET /suggestions/captain – topp 3 captain picks (EV proxy).
	•	GET /suggestions/watchlist – lågt ägande + stigande form + bra fixtures.

Acceptanskriterier (MVP)
	•	Daglig datapipeline körs utan fel och uppdaterar metrics.
	•	Dashboard visar: Captain Picks, Top Form (per position), Fixture Heatmap, Watchlist.
	•	API svarar <500 ms för vanligaste anropen (lokalt).
	•	Kod täcks av baskontroller: felhantering, timeouts, rate-limit på externa anrop.

 Vägen vidare (Pro)
	•	xG/xA-driven xPts-modell, Monte Carlo för captaincy, rotation-klassificerare, bättre prisrörelse-proxy, presskonf-sentiment + alerts.


