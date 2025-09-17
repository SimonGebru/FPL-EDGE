

// Samla min/max för defence strength per kontext (home/away) för hela ligan
export function computeDefenceRanges(teams) {
    const valsHome = [];
    const valsAway = [];
  
    for (const t of teams) {
      const h = Number.isFinite(t.strength_defence_home) ? t.strength_defence_home
                : (Number.isFinite(t.strength_overall_home) ? t.strength_overall_home
                : (Number.isFinite(t.strength) ? t.strength : 3));
      const a = Number.isFinite(t.strength_defence_away) ? t.strength_defence_away
                : (Number.isFinite(t.strength_overall_away) ? t.strength_overall_away
                : (Number.isFinite(t.strength) ? t.strength : 3));
      valsHome.push(h);
      valsAway.push(a);
    }
  
    const minHome = Math.min(...valsHome);
    const maxHome = Math.max(...valsHome);
    const minAway = Math.min(...valsAway);
    const maxAway = Math.max(...valsAway);
  
    return { minHome, maxHome, minAway, maxAway };
  }
  
  // Linjär mappning x∈[min,max] → FDR∈[1,5]
  function mapToFdr(x, min, max) {
    if (!Number.isFinite(x) || !Number.isFinite(min) || !Number.isFinite(max) || min === max) return 3;
    const t = (x - min) / (max - min); // 0..1
    const fdr = 1 + t * 4;             // 1..5
    return Math.max(1, Math.min(5, Math.round(fdr * 2) / 2)); // halva steg
  }
  
  // Huvudfunktion: FDR för anfall (nästa N matcher), normaliserad mot ligan
  export function attackFDRForTeamNextN(teamId, fixtures, teamsById, currentGW, N = 3, defenceRanges) {
    if (!teamId || !Array.isArray(fixtures)) return 3;
  
    const { minHome, maxHome, minAway, maxAway } = defenceRanges ?? {
      minHome: 1, maxHome: 5, minAway: 1, maxAway: 5
    };
  
    const upcoming = fixtures
      .filter(f => (f.team_h === teamId || f.team_a === teamId))
      .filter(f => (typeof f.event === 'number' ? f.event >= currentGW : true))
      .filter(f => !f.finished)
      .sort((a, b) => {
        const ea = (typeof a.event === 'number') ? a.event : 10_000;
        const eb = (typeof b.event === 'number') ? b.event : 10_000;
        if (ea !== eb) return ea - eb;
        const ta = a.kickoff_time ? new Date(a.kickoff_time).getTime() : Number.MAX_SAFE_INTEGER;
        const tb = b.kickoff_time ? new Date(b.kickoff_time).getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
      })
      .slice(0, N);
  
    if (upcoming.length === 0) return 3;
  
    const values = upcoming.map(fix => {
      const isHome = fix.team_h === teamId;      // vårt lag = home?
      const oppId  = isHome ? fix.team_a : fix.team_h;
      const opp    = teamsById[oppId];
  
      const defHome = Number.isFinite(opp?.strength_defence_home) ? opp.strength_defence_home
                    : (Number.isFinite(opp?.strength_overall_home) ? opp.strength_overall_home
                    : (Number.isFinite(opp?.strength) ? opp.strength : 3));
  
      const defAway = Number.isFinite(opp?.strength_defence_away) ? opp.strength_defence_away
                    : (Number.isFinite(opp?.strength_overall_away) ? opp.strength_overall_away
                    : (Number.isFinite(opp?.strength) ? opp.strength : 3));
  
      // Om vi spelar hemma → motståndaren borta-defence (defAway). Annars hemma-defence (defHome)
      const oppDefContext = isHome ? defAway : defHome;
  
      // Normalisera till FDR 1..5 mot ligans min/max i samma kontext
      const fdr = isHome
        ? mapToFdr(oppDefContext, minAway, maxAway) // opponent away strength
        : mapToFdr(oppDefContext, minHome, maxHome); // opponent home strength
  
      // Liten hemma-bonus för oss (anfalla hemma är lite enklare)
      const adjusted = Math.max(1, Math.min(5, Math.round((fdr - (isHome ? 0.2 : 0)) * 2) / 2));
      return adjusted;
    });
  
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(avg * 2) / 2;
  }