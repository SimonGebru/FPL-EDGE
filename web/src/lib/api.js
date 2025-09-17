export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5080';

async function j(res) {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  meta: {
    sources: () => fetch(`${API_BASE}/meta/sources`).then(j),
  },
  suggestions: {
    captain: (params) => fetch(`${API_BASE}/suggestions/captain?${params}`).then(j),
    watchlist: (params) => fetch(`${API_BASE}/suggestions/watchlist?${params}`).then(j),
  },
  players: {
    differentials: (params) => fetch(`${API_BASE}/differentials?${params}`).then(j),
    xgiLeaders:     (params) => fetch(`${API_BASE}/players/xgi-leaders?${params}`).then(j),
    trends:         (params) => fetch(`${API_BASE}/players/trends?${params}`).then(j),
    pricewatch:     (params) => fetch(`${API_BASE}/players/pricewatch?${params}`).then(j),
    rotationRisks:  (params) => fetch(`${API_BASE}/players/rotation-risks?${params}`).then(j),
    
    search:         (params) => fetch(`${API_BASE}/players/search?${params}`).then(j),
  },
  fixtures: {
    heatmap: (horizon = 5) => fetch(`${API_BASE}/fixtures/heatmap?horizon=${horizon}`).then(j),
  },
  teams: {
    congestion: (days = 14) => fetch(`${API_BASE}/teams/congestion?horizonDays=${days}`).then(j),
    // stacks: (params) => fetch(`${API_BASE}/teams/stacks?${params}`).then(j),
  },
  compare: (ids) => {
    const arr = Array.isArray(ids) ? ids : String(ids).split(',').map(s => Number(s.trim())).filter(Boolean);
    return fetch(`${API_BASE}/compare?ids=${arr.join(',')}`).then(j);
  },
};