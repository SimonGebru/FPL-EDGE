// web/src/lib/api.js
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5080';

async function j(res) {
  if (!res.ok) {
    // 304 m.fl. saknar ofta body → ge tydligt fel
    let msg = '';
    try { msg = await res.text(); } catch {}
    throw new Error(msg || `HTTP ${res.status} ${res.statusText || ''}`.trim());
  }
  return res.json();
}

// Lägg på en timestamp för att tvinga nätverksrunda (förbi 304/proxy-cache)
function withTs(url) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_ts=${Date.now()}`;
}

// GET-hjälpare: “no-store” och headers som stänger av cache
function get(url, opts = {}) {
  const o = {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ...(opts.headers || {}),
    },
    ...opts,
  };
  return fetch(withTs(url), o).then(j);
}

// Gör om input (string | URLSearchParams | object) till querystring
function qstr(input) {
  if (!input) return '';
  if (typeof input === 'string') {
    if (input.includes('=')) return input;        // ser redan ut som a=b&c=d
    const p = new URLSearchParams({ q: input });  // annars tolka som söksträng
    return p.toString();
  }
  if (typeof URLSearchParams !== 'undefined' && input instanceof URLSearchParams) {
    return input.toString();
  }
  if (typeof input === 'object') {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null) continue;
      p.set(k, String(v));
    }
    return p.toString();
  }
  return '';
}

export const api = {
  meta: {
    sources: () => get(`${API_BASE}/meta/sources`),
  },

  suggestions: {
    captain:   (params) => get(`${API_BASE}/suggestions/captain?${qstr(params)}`),
    watchlist: (params) => get(`${API_BASE}/suggestions/watchlist?${qstr(params)}`),
    transfer:  (params) => get(`${API_BASE}/suggestions/transfer?${qstr(params)}`),
    captainMc: (params) => get(`${API_BASE}/suggestions/captain-mc?${qstr(params)}`),

    // Transfer Strategy – explicit get() med cache-buster
    transferStrategy: (params) => {
      const qs = typeof params === 'string' ? params : qstr(params);
      return get(`${API_BASE}/suggestions/transfer-strategy?${qs}`);
    },
  },

  players: {
    differentials:  (params) => get(`${API_BASE}/differentials?${qstr(params)}`),
    xgiLeaders:     (params) => get(`${API_BASE}/players/xgi-leaders?${qstr(params)}`),
    trends:         (params) => get(`${API_BASE}/players/trends?${qstr(params)}`),
    pricewatch:     (params) => get(`${API_BASE}/players/pricewatch?${qstr(params)}`),
    rotationRisks:  (params) => get(`${API_BASE}/players/rotation-risks?${qstr(params)}`),
    template:       (params) => get(`${API_BASE}/players/template?${qstr(params)}`),

    /**
     * Sök kan ta:
     *  - ren sträng: "haaland"
     *  - objekt: { q: 'haal', position: 'Forward', limit: 8 }
     *  - URLSearchParams
     * Andra argumentet kan innehålla fetch-options (t.ex. { signal }).
     */
    search: (params, fetchOpts = {}) => {
      let qs = '';
      let qVal = '';

      if (typeof params === 'string') {
        if (params.includes('=')) {
          qs = params;
          const usp = new URLSearchParams(qs);
          qVal = String(usp.get('q') || '').trim();
        } else {
          qVal = String(params).trim();
          qs = qVal ? `q=${encodeURIComponent(qVal)}` : '';
        }
      } else if (typeof URLSearchParams !== 'undefined' && params instanceof URLSearchParams) {
        qs = params.toString();
        qVal = String(params.get('q') || '').trim();
      } else if (params && typeof params === 'object') {
        const usp = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v === undefined || v === null) continue;
          usp.set(k, String(v));
        }
        qs = usp.toString();
        qVal = String(usp.get('q') || '').trim();
      }

      
      if (!qVal) return Promise.resolve({ ok: true, results: [] });

      return get(`${API_BASE}/players/search?${qs}`, fetchOpts);
    },
  },

  fixtures: {
    heatmap: (horizon = 5) => get(`${API_BASE}/fixtures/heatmap?horizon=${horizon}`),
  },

  teams: {
    congestion: (days = 14) => get(`${API_BASE}/teams/congestion?horizonDays=${days}`),
  },

  team: {
    analyze: (body) =>
      fetch(`${API_BASE}/team/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(j),
  },

  compare: (ids) => {
    const arr = Array.isArray(ids)
      ? ids
      : String(ids).split(',').map(s => Number(s.trim())).filter(Boolean);
    return get(`${API_BASE}/compare?ids=${arr.join(',')}`);
  },

  
  user: {
   
    importFpl: (entry) =>
      get(`${API_BASE}/user/team/import-fpl?entry=${encodeURIComponent(entry)}`),
  
    
    team: (entryId, gw) => {
      const qs = new URLSearchParams({ entryId: String(entryId) });
      if (gw != null) qs.set('gw', String(gw));
      return get(`${API_BASE}/user/team?${qs.toString()}`);
    },
  },
};