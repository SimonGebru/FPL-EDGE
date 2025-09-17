export function computeFormScoreFromHistory(history) {
    if (!Array.isArray(history)) return 0;
  
    // ta de senaste matcherna med >0 min
    const played = history.filter(h => (h?.minutes ?? 0) > 0);
    // ta SENASTE 4 (history är redan kronologisk i element-summary)
    const last = played.slice(-4);
    if (last.length === 0) return 0;
  
    const per90 = last.map(h => (h.total_points / Math.max(1, h.minutes)) * 90);
    const avgPer90 = per90.reduce((a, b) => a + b, 0) / per90.length;
  
    // minutes-säkerhet i ett svep: andel av 90 i snitt (0–1)
    const minuteSafety = Math.min(1, (last.reduce((a, h) => a + h.minutes, 0) / (last.length * 90)));
  
    // skala till 0–100
    const scaled = Math.max(0, Math.min(100, avgPer90 * 10));
  
    // dämpa “poäng från inhopp” via minuteSafety
    const finalScore = Math.round(scaled * (0.6 + 0.4 * minuteSafety));
    return finalScore;
  }