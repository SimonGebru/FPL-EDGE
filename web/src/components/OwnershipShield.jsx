// web/src/components/OwnershipShield.jsx
import React from 'react';
import { api } from '../lib/api';
import SearchBox from './SearchBox';

export default function OwnershipShield(){
  const [limit, setLimit] = React.useState(15);
  const [myIds, setMyIds] = React.useState([]);
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);

  function addPlayer(p){ if (p?.id) setMyIds(prev => prev.includes(p.id) ? prev : [...prev, p.id]); }
  function removeId(id){ setMyIds(prev => prev.filter(x=>x!==id)); }

  async function load(){
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (myIds.length) params.set('ids', myIds.join(','));
      const res = await api.players.template(params.toString());
      setData(res);
    } catch(e){ setErr(e) } finally { setLoading(false); }
  }

  React.useEffect(()=>{ load(); /* initial */ }, []); // eslint-disable-line

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label>Template size
          <input type="number" min="5" max="30" value={limit}
            onChange={e=>setLimit(Math.max(5, Math.min(30, Number(e.target.value))))}
            className="ml-2 w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
        </label>
        <button onClick={load} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Refresh</button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <SearchBox placeholder="Add your players…" onSelect={addPlayer} />
        <div className="flex flex-wrap gap-2">
          {myIds.map(id=>(
            <span key={id} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs">
              id {id}
              <button onClick={()=>removeId(id)} className="text-neutral-400 hover:text-neutral-200">×</button>
            </span>
          ))}
        </div>
      </div>

      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {data && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-neutral-400 mb-1">Template picks (top ownership)</div>
            <div className="space-y-2">
              {(data.template||[]).map(p=>(
                <div key={p.id} className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
                  <div>
                    <div className="font-medium">{p.web_name} <span className="text-neutral-400">· {p.team}</span></div>
                    <div className="text-xs text-neutral-400">{p.position}</div>
                  </div>
                  <div className="text-sm text-neutral-300">{p.selected_by_percent}%</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-neutral-400 mb-1">You’re missing</div>
            <div className="space-y-2">
              {(data.missing||[]).map(p=>(
                <div key={p.id} className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
                  <div>
                    <div className="font-medium">{p.web_name} <span className="text-neutral-400">· {p.team}</span></div>
                    <div className="text-xs text-neutral-400">{p.position}</div>
                  </div>
                  <div className="text-sm text-amber-300">Owned {p.selected_by_percent}%</div>
                </div>
              ))}
              {!data.missing?.length && <div className="text-sm text-emerald-400">Du täcker hela templatet — låg risk.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}