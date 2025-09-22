// web/src/components/TransferStrategyPanel.jsx
import React from 'react';
import { api } from '../lib/api';
import SliderField from './SliderField';

function Pill({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full border border-neutral-800 bg-neutral-900 text-xs">
      {children}
    </span>
  );
}

function fmtPrice(p){
  if (p == null) return '–';
  const n = Number(String(p).replace(',', '.'));
  if (!Number.isFinite(n)) return '–';
  return `${n.toFixed(1)}m`;
}

// Samla kandidater från potentiella fält i API-svaret
function pickArray(data){
  if (!data || typeof data !== 'object') return [];
  return (
    data.results ||
    data.players ||
    data.items ||
    data.candidates ||
    data.picks ||
    []
  );
}

export default function TransferStrategyPanel({ onAddToPlanner }) {
  // meta → horizon cap
  const [metaGW, setMetaGW] = React.useState(null);
  const [maxGW, setMaxGW]   = React.useState(6);

  // ====== INPUTS (minimala defaults) ======
  const [budgetMax, setBudgetMax] = React.useState(4.5); // 4.5m default
  const [budgetMin, setBudgetMin] = React.useState('');  // tom
  const [position, setPosition]   = React.useState('');  // Any (= tom sträng)
  const [horizon, setHorizon]     = React.useState(3);   // 3
  const [minRisk, setMinRisk]     = React.useState('');  // tom = inget filter
  const [maxFdr, setMaxFdr]       = React.useState('');  // tom = inget filter
  const [limit, setLimit]         = React.useState(10);  // 10
  const [ownRange, setOwnRange]   = React.useState('');  // t.ex. "0-20"
  const [excludeTeams, setExcludeTeams] = React.useState(''); // t.ex. "Arsenal,Chelsea"
  const [sort, setSort] = React.useState('vorp');        // 'vorp' | 'ev'

  // data / UI state
  const [items, setItems]   = React.useState([]);
  const [res, setRes]       = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr]         = React.useState(null);
  const [debugOpen, setDebugOpen] = React.useState(false);
  const [lastQuery, setLastQuery] = React.useState('');  // för debug

  // init meta
  React.useEffect(()=>{
    (async()=>{
      try{
        const meta = await api.meta.sources();
        const gw = Number(meta?.summary?.currentGW || 1);
        setMetaGW(gw);
        const left = Math.max(1, 38 - gw); // kvar EFTER current GW
        setMaxGW(left);
        setHorizon(h => Math.min(h, left));
      }catch(e){}
    })();
  },[]);

  async function run(){
    setLoading(true); setErr(null);
    try{
      const params = new URLSearchParams();

      // Skicka endast fält som har värde (tomma strings skickas inte)
      if (budgetMax !== '' && budgetMax != null) params.set('budgetMax', String(budgetMax));
      if (budgetMin !== '' && budgetMin != null) params.set('budgetMin', String(budgetMin));

      // Fail-safe: om någon gång "Any" skulle hamna i state, skicka inte det ordet
      const pos = (position || '').trim();
      if (pos && pos.toLowerCase() !== 'any') params.set('position', pos);

      if (horizon) params.set('horizon', String(horizon));
      if (minRisk !== '' && minRisk != null) params.set('minMinutesRisk', String(minRisk));

      // 🔒 Viktigt: skicka ENDAST om > 0 (annars lämna bort helt)
      if (maxFdr !== '' && Number(maxFdr) > 0) {
        params.set('maxFdrNext3', String(maxFdr));
      }

      const ownR = (ownRange || '').trim();
      if (ownR) params.set('ownRange', ownR);

      const exc = (excludeTeams || '').trim();
      if (exc) params.set('excludeTeams', exc);

      if (limit) params.set('limit', String(limit));
      if (sort)  params.set('sort', sort);

      // Spara querystring för enkel felsökning i debug-rutan
      const qs = params.toString();
      setLastQuery(qs);

      const data = await api.suggestions.transferStrategy(qs);
      setRes(data);

      // Visa backend-fel tydligt
      if (data && data.ok === false && data.error) {
        setItems([]);
        setErr(new Error(data.error));
        return;
      }

      const raw = pickArray(data) || [];
      const list = raw.map(p => ({
        ...p,
        price: (p.price != null)
          ? Number(p.price)
          : (p.now_cost != null ? Number(p.now_cost)/10 : null),
        EV: (typeof p.EV === 'number') ? p.EV
            : (typeof p.ev === 'number') ? p.ev
            : (typeof p.score === 'number') ? p.score
            : 0,
        VORP: (typeof p.VORP === 'number') ? p.VORP
            : (typeof p.vorp === 'number') ? p.vorp
            : null,
      }));

      setItems(list);
    }catch(e){
      setErr(e);
      setItems([]);
    }finally{
      setLoading(false);
    }
  }

  function runPermissivePreset(){
    // Snäll preset för snabb sanity check
    setBudgetMax(6.0);
    setBudgetMin('');
    setPosition('');
    setHorizon(h => Math.max(1, Math.min(maxGW, h || 3)));
    setMinRisk('');     // inga riskfilter
    setMaxFdr('');      // ingen FDR-gräns
    setOwnRange('');    // ingen ägarfilter
    setExcludeTeams('');// inga exkluderingar
    setLimit(10);
    setSort('vorp');
    setTimeout(run, 0);
  }

  const untilGW = metaGW ? Math.min(38, metaGW + (Number(horizon||0))) : null;

  return (
    <div className="space-y-3">
      <div className="text-sm text-neutral-300">
        Ange <b>budget</b> och ev. <b>position</b> för att få en rankad köp-lista.
        Nu även <b>VORP</b> (värde över ersättare) per position + sortering VORP/EV.
      </div>

      {/* Controls */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label>Budget max (m)
            <input
              type="number" step="0.1" min="3.5" max="13.0"
              value={budgetMax}
              onChange={e=>setBudgetMax(e.target.value === '' ? '' : Number(e.target.value))}
              className="ml-2 w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
            />
          </label>

          <label>Min
            <input
              type="number" step="0.1" min="3.5" max={budgetMax || 13}
              value={budgetMin}
              onChange={e=>setBudgetMin(e.target.value)}
              className="ml-2 w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
              placeholder="valfritt"
            />
          </label>

          <label>Position
            <select
              value={position}
              onChange={e=>setPosition(e.target.value)}
              className="ml-2 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
            >
              <option value="">Any</option>
              <option>Goalkeeper</option>
              <option>Defender</option>
              <option>Midfielder</option>
              <option>Forward</option>
            </select>
          </label>

          <SliderField
            label="Min startchans"
            tooltip="Lägsta sannolikhet att få speltid."
            kind="percent"
            min={0} max={1} step={0.05}
            value={minRisk === '' ? 0 : minRisk}
            onChange={v=> setMinRisk(Number(v))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label>Horizon
            <input
              type="number" min="1" max={maxGW}
              value={horizon}
              onChange={e=>setHorizon(Math.max(1, Math.min(maxGW, Number(e.target.value))))}
              className="ml-2 w-16 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
            />
          </label>
          {untilGW && <Pill>Till och med GW {untilGW}</Pill>}

          <label>Max FDR
            <input
              type="number" step="0.1" min="1" max="5"
              value={maxFdr === '' ? '' : String(maxFdr)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') { setMaxFdr(''); return; }     // tomt = inget filter
                const n = Number(v);
                setMaxFdr(Number.isFinite(n) ? n : '');      // ingen 0-fallsback
              }}
              className="ml-2 w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
              placeholder="t.ex. 3.5"
            />
          </label>

          <label>Ownership (a-b%)
            <input
              type="text" placeholder="t.ex. 0-20"
              value={ownRange}
              onChange={e=>setOwnRange(e.target.value)}
              className="ml-2 w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
            />
          </label>

          <label>Exclude teams
            <input
              type="text" placeholder="Arsenal,Chelsea"
              value={excludeTeams}
              onChange={e=>setExcludeTeams(e.target.value)}
              className="ml-2 w-40 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
            />
          </label>

          <label>Limit
            <input
              type="number" min="1" max="20"
              value={limit}
              onChange={e=>setLimit(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="ml-2 w-16 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
            />
          </label>

          {/* Sortering */}
          <div className="flex items-center gap-2">
            <span>Sort</span>
            <button
              className={`px-2 py-1 rounded border ${sort==='vorp'?'border-emerald-600 text-emerald-400':'border-neutral-700 text-neutral-300'}`}
              onClick={()=>setSort('vorp')}
            >
              VORP
            </button>
            <button
              className={`px-2 py-1 rounded border ${sort==='ev'?'border-emerald-600 text-emerald-400':'border-neutral-700 text-neutral-300'}`}
              onClick={()=>setSort('ev')}
            >
              EV
            </button>
          </div>

          <button onClick={run} className="px-3 py-1.5 rounded bg-emerald-600 text-white">
            Find picks
          </button>
          <button
            onClick={runPermissivePreset}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
            title="Snäll preset: tar bort nästan alla filter och kör"
          >
            Try sample
          </button>
          <button
            onClick={()=>setDebugOpen(o=>!o)}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
          >
            {debugOpen ? 'Hide debug' : 'Show debug'}
          </button>
        </div>
      </div>

      {loading && <div className="text-neutral-400">Calculating…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {/* Replacement-sammanfattning */}
      {res?.replacement?.byPosition && (
        <div className="text-xs text-neutral-400">
          Replacement EV (per position) för {res.replacement.horizon} GWs, minRisk {Math.round((res.replacement.minMinutesRisk ?? 0)*100)}%:{' '}
          {Object.entries(res.replacement.byPosition).map(([pos,ev])=>(
            <span key={pos} className="mr-2">{pos}: <b className="text-neutral-200">{Number(ev).toFixed(2)}</b></span>
          ))}
        </div>
      )}

      {/* Results / tomt-läge */}
      {(!loading && items.length === 0 && !err) && (
        <div className="text-sm text-neutral-400 border border-neutral-800 rounded-xl p-3">
          Inga kandidater hittades för dina filter. Testa att:
          <ul className="list-disc ml-5 mt-1 space-y-0.5">
            <li>höja budgeten eller sänka min-startchans,</li>
            <li>öka Max FDR,</li>
            <li>eller ta bort exkluderade lag.</li>
          </ul>
        </div>
      )}

      {debugOpen && res && (
        <div className="text-xs text-neutral-400 border border-dashed border-neutral-700 rounded-xl p-3">
          <div className="mb-1 font-medium text-neutral-300">Debug</div>
          <div>ok: {String(res.ok ?? 'n/a')} · error: {String(res.error ?? 'n/a')}</div>
          <div>counts: results={Array.isArray(res.results)?res.results.length:'—'}; players={Array.isArray(res.players)?res.players.length:'—'}; items={Array.isArray(res.items)?res.items.length:'—'}; candidates={Array.isArray(res.candidates)?res.candidates.length:'—'}; picks={Array.isArray(res.picks)?res.picks.length:'—'}</div>
          {res?.params && <div className="mt-1">params (server): {JSON.stringify(res.params)}</div>}
          {lastQuery &&  <div className="mt-1">query (client): {decodeURIComponent(lastQuery)}</div>}
        </div>
      )}

      {items.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map(p=>(
            <div key={p.id ?? `${p.web_name}-${p.team}`} className="rounded-xl border border-neutral-800 p-3 bg-gradient-to-b from-neutral-900 to-neutral-950">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {p.web_name} <span className="text-neutral-400">· {p.team}</span>
                  </div>
                  <div className="text-xs text-neutral-400">{p.position}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold">{(p.EV ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-neutral-400">EV next {horizon}</div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>Price</div><div className="text-right">{fmtPrice(p.price)}</div>
                <div>xGI/90</div><div className="text-right">{p.xGI90?.toFixed?.(2) ?? '–'}</div>
                <div>Form</div><div className="text-right">{Math.round(p.formScore ?? 0)}</div>
                <div>FDR (3)</div><div className="text-right">{p.fdrAttackNext3 ?? '–'}</div>
                <div>Startchans</div><div className="text-right">{Math.round((p.minutesRisk ?? 0)*100)}%</div>
                <div>Own%</div><div className="text-right">{p.selected_by_percent ?? '–'}</div>
                <div>VORP</div><div className="text-right font-semibold">{p.VORP != null ? p.VORP.toFixed(2) : '–'}</div>
              </div>

              {Array.isArray(p.reasons) && p.reasons.length > 0 && (
                <div className="mt-2 text-xs text-neutral-300">
                  {p.reasons.map((r,i)=>(<div key={i}>• {r}</div>))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={()=> onAddToPlanner?.(p)}
                  className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
                >
                  Add to Planner (In)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}