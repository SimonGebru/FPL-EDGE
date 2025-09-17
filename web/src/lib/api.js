export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5060'

async function j(res) {
  if (!res.ok) throw new Error(await res.text())
  return res.json()
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
    xgiLeaders: (params) => fetch(`${API_BASE}/players/xgi-leaders?${params}`).then(j),
    trends: (params) => fetch(`${API_BASE}/players/trends?${params}`).then(j),
    pricewatch: (params) => fetch(`${API_BASE}/players/pricewatch?${params}`).then(j),
  },
  fixtures: {
    heatmap: (horizon = 5) => fetch(`${API_BASE}/fixtures/heatmap?horizon=${horizon}`).then(j),
  },
  teams: {
    congestion: (days = 14) => fetch(`${API_BASE}/teams/congestion?horizonDays=${days}`).then(j),
  },
  compare: (ids) => fetch(`${API_BASE}/compare?ids=${ids.join(',')}`).then(j),
}