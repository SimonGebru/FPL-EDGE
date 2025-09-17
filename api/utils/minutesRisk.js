// Minutes/Rotation Risk 0–1 (högre = tryggare speltid)
// Heuristik byggd på:
// - starterRate senaste 6 (vi approximerar "start" som >= 60 min)
// - availability från bootstrap: status + chance_of_playing_next_round
// - congestion (tätt schema nästa 10 dagar) dämpar något
//
// Parametrar:
// - recentHistory: element-summary.history (array)
// - playerBootstrap: objekt från bootstrap.elements för spelaren (status, chance_of_playing_next_round, news etc.)
// - nextFixtures: kommande fixtures för spelarens lag (daterade, kan sakna datum i vissa fall → då hoppar vi congestion)
export function computeMinutesRisk(recentHistory, playerBootstrap, nextFixtures = []) {
    // 1) starter rate senaste 6 matcher
    const last6 = (recentHistory || []).slice(-6);
    const starts = last6.filter(h => (h?.minutes ?? 0) >= 60).length;
    const played = last6.filter(h => (h?.minutes ?? 0) > 0).length;
    const starterRate = played === 0 ? 0 : (starts / Math.max(1, last6.length)); // 0–1
  
    // 2) availability
    // status: 'a' available, 'd' doubtful, 'i' injured, 's' suspended, 'n' not available
    const status = playerBootstrap?.status ?? 'a';
    const chance = Number(playerBootstrap?.chance_of_playing_next_round ?? 100); // kan vara null
    let availability = 1.0;
    if (status === 'i' || status === 's' || status === 'n' || chance === 0) availability = 0.2;
    else if (status === 'd' || (chance > 0 && chance < 75)) availability = 0.6;
    else availability = 1.0; // 'a' eller okänt → optimistiskt
  
    // 3) congestion: om två matcher ligger med <=3 dagars mellanrum inom 10 dagar → dämpa
    let restFactor = 1.0;
    const times = (nextFixtures || [])
      .map(f => f.kickoff_time ? new Date(f.kickoff_time).getTime() : null)
      .filter(Boolean)
      .sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      const diffDays = (times[i] - times[i - 1]) / (1000 * 60 * 60 * 24);
      if (diffDays <= 3) { restFactor = 0.9; break; }
    }
  
    // Slutlig risk
    // baseline väger starterRate högst, multiplicerat med availability och restFactor
    const risk = Math.max(0, Math.min(1, (0.7 * starterRate + 0.3 * (played / Math.max(1, last6.length))) * availability * restFactor));
    // rundning
    return Math.round(risk * 100) / 100;
  }