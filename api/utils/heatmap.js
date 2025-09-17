// Bygger en fixtures-heatmap per lag för kommande GWs.
// Returnerar en tabell-lik struktur som frontenden enkelt kan rendera.

function clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }

// Mappa motståndarens defensiva styrka till FDR (1–5, halva steg)
function defenceStrengthToFdr(v) {
  const f = Math.round((Number.isFinite(v) ? v : 3) * 2) / 2;
  return clamp(f, 1, 5);
}

export function buildFixtureHeatmap({ teams, fixtures, currentGW, horizon = 5 }) {
  const teamsById = Object.fromEntries(teams.map(t => [t.id, t]));

  // plocka kommande fixtures inom horisonten
  const upcoming = fixtures
    .filter(f => !f.finished && typeof f.event === "number" && f.event >= currentGW && f.event < currentGW + horizon)
    .sort((a, b) => a.event - b.event);

  // indexera per lag
  const rows = teams.map(team => {
    const entries = [];
    for (let gw = currentGW; gw < currentGW + horizon; gw++) {
      // hitta fixture för detta lag i den GW
      const f = upcoming.find(x => x.event === gw && (x.team_h === team.id || x.team_a === team.id));
      if (!f) {
        entries.push({ gw, opp: null, isHome: null, fdrAttack: null });
        continue;
      }
      const isHome = f.team_h === team.id;
      const oppId = isHome ? f.team_a : f.team_h;
      const opp = teamsById[oppId];

      // välj försvarsstyrka beroende på hemma/borta
      const defHome = opp?.strength_defence_home ?? opp?.strength_overall_home ?? opp?.strength ?? 3;
      const defAway = opp?.strength_defence_away ?? opp?.strength_overall_away ?? opp?.strength ?? 3;
      const oppDefInContext = isHome ? defAway : defHome;

      let fdr = defenceStrengthToFdr(oppDefInContext);
      if (isHome) fdr = clamp(fdr - 0.2, 1, 5); // liten hemma-bonus
      fdr = Math.round(fdr * 2) / 2;

      entries.push({
        gw,
        opp: opp?.name ?? `Team ${oppId}`,
        isHome,
        fdrAttack: fdr
      });
    }
    return {
      teamId: team.id,
      teamName: team.name,
      entries
    };
  });

  return {
    currentGW,
    horizon,
    rows
  };
}