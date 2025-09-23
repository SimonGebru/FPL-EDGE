// web/src/components/OwnershipShield.jsx
import React from 'react';
import { api } from '../lib/api';
import { useUserTeam } from '../context/UserTeamContext';

// Hjälpare
const pid = (x) => Number(x?.id ?? x?.element ?? x) || null;

function flattenTemplateResponse(data) {
  if (!data || typeof data !== 'object') return [];
  // vanligaste fälten
  const direct = data.players || data.items || data.list || data.core || data.template;
  if (Array.isArray(direct)) return direct;

  // byPosition {Goalkeeper:[...], Defender:[...], ...}
  if (data.byPosition && typeof data.byPosition === 'object') {
    const all = [];
    for (const arr of Object.values(data.byPosition)) {
      if (Array.isArray(arr)) all.push(...arr);
    }
    return all;
  }

  // safety: metrics? (ibland ligger listan under metrics)
  if (Array.isArray(data.metrics)) return data.metrics;

  // om inget hittas → tom
  return [];
}

export default function OwnershipShield(){
  const { team, hasTeam } = useUserTeam();

  const [template, setTemplate] = React.useState([]);
  const [loading, setLoading]   = React.useState(false);
  const [err, setErr]           = React.useState(null);
  const [showDebug, setShowDebug] = React.useState(false);

  // Ladda “template team”
  React.useEffect(()=>{
    (async()=>{
      setLoading(true); setErr(null);
      try {
        const data = await api.players.template(new URLSearchParams({ limit:'15' }));
        const flat = flattenTemplateResponse(data).filter(Boolean);
        setTemplate(flat);
      } catch(e) {
        setErr(e);
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  const myIds = React.useMemo(()=>{
    if (!hasTeam) return [];
    const picks = Array.isArray(team?.picks) ? team.picks : [];
    return picks.map(p=>pid(p)).filter(Boolean);
  }, [hasTeam, team]);

  const stats = React.useMemo(()=>{
    const t = Array.isArray(template) ? template : [];
    const tIds = new Set(t.map(p=>pid(p)).filter(Boolean));
    const overlap = myIds.filter(id=>tIds.has(id));
    const base = Math.min(11, myIds.length || 11); // XI-bas
    const rate = base ? (overlap.length / base) : 0;
    const risk = Math.round(rate * 100);
    // Lista dina differentials (spelare i ditt lag som INTE är i template)
    const mine = Array.isArray(team?.picks) ? team.picks : [];
    const differentials = mine.filter(p => !tIds.has(pid(p)));

    // lista template-spelare du saknar (vanliga “mall”-pjäser)
    const missing = t.filter(tp => !myIds.includes(pid(tp)));

    return {
      overlapIds: overlap,
      riskPct: risk,
      templateCount: t.length,
      differentials,
      missing
    };
  }, [template, myIds, team?.picks]);

  return (
    <div className="rounded-xl border border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold">Ownership Shield</div>
        <div className="flex items-center gap-3">
          <button
            onClick={()=>setShowDebug(v=>!v)}
            className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs"
          >
            {showDebug ? 'Hide debug' : 'Show debug'}
          </button>
          <div className="text-sm text-neutral-400">
            {hasTeam ? 'Using My Team' : 'No imported team'}
          </div>
        </div>
      </div>

      {loading && <div className="text-neutral-400">Loading template…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {(!loading && !err) && (
        <>
          <div className="text-sm text-neutral-300">
            Template-overlap: <b className="text-neutral-100">{stats.riskPct}%</b>
            <span className="text-neutral-500"> (högre = mer lik mallaget)</span>
          </div>

          {hasTeam && (
            <>
              <div className="mt-3">
                <div className="text-xs text-neutral-400 mb-1">Du delar dessa med template:</div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(team?.picks) && team.picks
                    .filter(p=>stats.overlapIds.includes(pid(p)))
                    .map(p=>(
                      <span key={pid(p)} className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-xs">
                        {p.web_name} · {p.team}
                      </span>
                    ))}
                  {stats.overlapIds.length === 0 && (
                    <span className="text-xs text-neutral-500">Ingen overlap just nu.</span>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-neutral-400 mb-1">Dina differentials (inte i template):</div>
                <div className="flex flex-wrap gap-2">
                  {stats.differentials.map(p=>(
                    <span key={pid(p)} className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-xs">
                      {p.web_name} · {p.team}
                    </span>
                  ))}
                  {stats.differentials.length === 0 && (
                    <span className="text-xs text-neutral-500">Du har i princip hela template-kärnan.</span>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-neutral-400 mb-1">Vanliga template-spelare du saknar:</div>
                <div className="flex flex-wrap gap-2">
                  {stats.missing.map(tp=>(
                    <span key={pid(tp)} className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-xs">
                      {(tp.web_name || tp.name || `#${pid(tp)}`)} · {tp.team}
                    </span>
                  ))}
                  {stats.missing.length === 0 && (
                    <span className="text-xs text-neutral-500">Du matchar template ganska väl.</span>
                  )}
                </div>
              </div>
            </>
          )}

          {!hasTeam && (
            <div className="mt-2 text-xs text-neutral-500">
              Importera ditt lag högst upp på sidan för att se din riktiga template-risk.
            </div>
          )}

          {showDebug && (
            <div className="mt-3 text-xs text-neutral-500 border border-dashed border-neutral-700 rounded p-2">
              <div>templateCount: {template.length}</div>
              <div>myIds (XI-bas {Math.min(11, myIds.length || 11)}): {myIds.slice(0,15).join(', ')}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}