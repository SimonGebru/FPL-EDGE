// web/src/components/CaptainMonteCarloPanel.jsx
import React from 'react';
import { api } from '../lib/api';
import SearchBox from './SearchBox';

export default function CaptainMonteCarloPanel(){
  const [ids, setIds] = React.useState([]);
  const [sims, setSims] = React.useState(10000);
  const [res, setRes] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);

  function addPlayer(p){ if (p?.id) setIds(prev => prev.includes(p.id) ? prev : [...prev, p.id]); }
  function removeId(id){ setIds(prev => prev.filter(x=>x!==id)); }

  async function run(){
    if (ids.length < 2) return;
    setLoading(true); setErr(null);
    try{
      const params = new URLSearchParams({ ids: ids.join(','), sims: String(sims) });
      const r = await api.suggestions.captainMc(params.toString());
      setRes(r);
    }catch(e){ setErr(e) }finally{ setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <SearchBox placeholder="Add captain candidates…" onSelect={addPlayer} />
        <div className="flex items-center gap-3">
          <label>Simulations
            <input type="number" min="1000" max="20000" step="1000" value={sims}
              onChange={e=>setSims(Math.max(1000, Math.min(20000, Number(e.target.value))))}
              className="ml-2 w-28 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          </label>
          <button onClick={run} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Run</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ids.map(id=>(
          <span key={id} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs">
            id {id}
            <button onClick={()=>removeId(id)} className="text-neutral-400 hover:text-neutral-200">×</button>
          </span>
        ))}
        {!ids.length && <span className="text-sm text-neutral-500">Add 2–5 players to compare.</span>}
      </div>

      {loading && <div className="text-neutral-400">Running…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {res && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-neutral-400">
              <tr>
                <th className="text-left py-2 pr-4">Player</th>
                <th className="text-left py-2 pr-4">Team</th>
                <th className="text-right py-2 pr-4">EV</th>
                <th className="text-right py-2 pr-4">SD</th>
                <th className="text-right py-2 pr-4">p(≥10p)</th>
                <th className="text-right py-2 pr-0">xGI/90 · FDR · Start%</th>
              </tr>
            </thead>
            <tbody>
              {(res.results||[]).map(p=>(
                <tr key={p.id} className="border-t border-neutral-800">
                  <td className="py-2 pr-4">{p.web_name}</td>
                  <td className="py-2 pr-4">{p.team}</td>
                  <td className="py-2 pr-4 text-right font-semibold">{p.EV?.toFixed?.(2)}</td>
                  <td className="py-2 pr-4 text-right">{p.SD?.toFixed?.(2)}</td>
                  <td className="py-2 pr-4 text-right">{(p.p10*100).toFixed(1)}%</td>
                  <td className="py-2 pr-0 text-right text-xs">
                    {p.xGI90?.toFixed?.(2) ?? '–'} · {p.fdrAttackNext3 ?? '–'} · {Math.round((p.minutesRisk ?? 0)*100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs text-neutral-500 mt-2">Monte Carlo (Poisson, μ från xGI/90, FDR & startchans). MVP-modell.</div>
        </div>
      )}
    </div>
  );
}