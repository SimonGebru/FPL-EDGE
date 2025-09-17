// Robust xG/xA/xGI per 90 utifrån element-summary.history.
// Faller tillbaka till ICT-proxy om expected_* saknas.

export function computeXgXaGi90(history) {
    if (!Array.isArray(history)) {
      return { xG90: null, xA90: null, xGI90: null, source: "none" };
    }
    const last = history.filter(h => (h?.minutes ?? 0) > 0).slice(-4);
    if (last.length === 0) {
      return { xG90: null, xA90: null, xGI90: null, source: "none" };
    }
  
    const minutes = last.reduce((s, h) => s + (h.minutes || 0), 0);
    const hasXg = last.some(h =>
      typeof h.expected_goals === "number" ||
      typeof h.expected_assists === "number" ||
      typeof h.expected_goal_involvements === "number"
    );
  
    if (hasXg) {
      const xg  = last.reduce((s, h) => s + (h.expected_goals || 0), 0);
      const xa  = last.reduce((s, h) => s + (h.expected_assists || 0), 0);
      const xgi = last.reduce(
        (s, h) => s + (h.expected_goal_involvements ?? ((h.expected_goals || 0) + (h.expected_assists || 0))),
        0
      );
      const denom = Math.max(1, minutes) / 90;
      return {
        xG90: round2(xg / denom),
        xA90: round2(xa / denom),
        xGI90: round2(xgi / denom),
        source: "xg"
      };
    }
  
    // Fallback: ICT-index proxy (grovt!)
    const threat     = avg(last.map(h => Number(h.threat || 0)));
    const creativity = avg(last.map(h => Number(h.creativity || 0)));
    const xgProxy = threat / 100;     // typ 0.0–0.8
    const xaProxy = creativity / 120; // typ 0.0–0.7
  
    return {
      xG90: round2(xgProxy),
      xA90: round2(xaProxy),
      xGI90: round2(xgProxy + xaProxy),
      source: "ict"
    };
  }
  
  function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
  function round2(x) { return x == null ? null : Math.round(x * 100) / 100; }