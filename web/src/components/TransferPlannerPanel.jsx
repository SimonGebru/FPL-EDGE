// web/src/components/TransferPlannerPanel.jsx
import React from 'react';
import { api } from '../lib/api';
import { useUserTeam } from '../context/UserTeamContext';

// Liten hjälpare för försiktig parsing av olika shapes (id/element)
function pickId(p) {
  if (!p) return null;
  if (typeof p === 'number') return p;
  return Number(p.id ?? p.element ?? NaN) || null;
}
function uniq(arr){ return Array.from(new Set(arr.filter(Boolean))); }

function Pill({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full border border-neutral-800 bg-neutral-900 text-xs">
      {children}
    </span>
  );
}

export default function TransferPlannerPanel() {
  const { team, hasTeam, entryId, clear: clearUserTeam } = useUserTeam();

  // Extrahera nuvarande lag → id-lista
  const squadIds = React.useMemo(()=>{
    const fromPicks = Array.isArray(team?.picks) ? team.picks.map(p=>pickId(p)) : [];
    const plain     = Array.isArray(team?.squad) ? team.squad.map(p=>pickId(p)) : [];
    return uniq([...fromPicks, ...plain]).filter(Boolean);
  }, [team]);

  // === Lokalt UI-state ===
  // Viktigt: “Use my team” styrs direkt av useMyTeam, inte ett härlett värde.
  const [useMyTeam, setUseMyTeam] = React.useState(true);
  const myTeamEnabled = useMyTeam && hasTeam && squadIds.length >= 11;

  const [outId, setOutId] = React.useState('');
  const [budgetItb, setBudgetItb] = React.useState(
    Number.isFinite(team?.itb) ? Number(team?.itb) : ''
  );
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [result, setResult] = React.useState(null);

  // När importerade laget ändras → förvälj OUT från ditt lag
  React.useEffect(()=>{
    if (myTeamEnabled) {
      // välj första spelaren
      const first = squadIds[0];
      setOutId(first ? String(first) : '');
      if (Number.isFinite(team?.itb)) setBudgetItb(Number(team.itb));
    } else {
      // om man slår av “Use my team” rensa OUT så att user förstår att välja manuellt
      setOutId('');
    }
  }, [myTeamEnabled, squadIds, team?.itb]);

  async function runPlanner(){
    setLoading(true); setErr(null); setResult(null);
    try {
      if (!outId) throw new Error('Välj först en spelare att sälja.');

      // Hämta OUT-spelaren (pris osv.)
      const cmp = await api.compare([Number(outId)]);
      const outPlayer = (cmp?.players || []).find(p => Number(p.id) === Number(outId)) || null;
      const outSell = Number(outPlayer?.now_cost)/10 || 0;

      // Budget: ITB + säljsumman
      const budgetMax = Number(budgetItb || 0) + outSell;
      const qs = new URLSearchParams({
        budgetMax: String(budgetMax.toFixed(1)),
        // du kan lägga till fler filter (position/minMinutesRisk/maxFdrNext3/ownRange)
        limit: '12',
        sort: 'vorp'
      });

      const ts = await api.suggestions.transferStrategy(qs.toString());

      setResult({
        outPlayer,
        suggestions: (ts?.results || []).slice(0, 12),
        budgetMax
      });
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  // Små visningshjälpare
  function fmtPrice(v){
    if (v == null) return '–';
    const n = Number(v);
    return Number.isFinite(n) ? `${n.toFixed(1)}m` : '–';
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-neutral-300">
        Välj en <b>OUT</b>-spelare och få förslag på <b>IN</b> utifrån din budget
        {myTeamEnabled ? <> (använder <b>My Team</b>)</> : <> (manuellt läge)</>}.
      </div>

      {/* Top Control bar */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2" title={!hasTeam ? 'Importera ditt lag högst upp först' : (squadIds.length<11 ? 'Kunde inte läsa minst 11 spelare' : '')}>
            <input
              type="checkbox"
              checked={useMyTeam}
              disabled={!hasTeam || squadIds.length < 11}
              onChange={e=> setUseMyTeam(e.target.checked)}
            />
            Use my team
          </label>
          {hasTeam ? (
            <Pill>Entry #{entryId}</Pill>
          ) : (
            <Pill>No imported team</Pill>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label>OUT</label>
          <select
            value={outId}
            onChange={e=>setOutId(e.target.value)}
            className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
          >
            <option value="">— välj spelare —</option>
            {myTeamEnabled ? (
              (team?.picks || []).map(p => {
                const pid = pickId(p);
                const label = `${p.web_name || `#${pid}`} · ${p.team ?? ''} · ${p.position ?? ''}`
                  + (p.availability?.flag === 'red' ? ' (INJ/SUS)' :
                     p.availability?.flag === 'yellow' ? ' (Doubtful)' : '');
                return <option key={pid} value={pid}>{label}</option>;
              })
            ) : null}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label>ITB (budget)</label>
          <input
            type="number" step="0.1" min="0" max="20"
            value={budgetItb}
            onChange={e=>setBudgetItb(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
            placeholder="t.ex. 1.2"
          />
        </div>

        <button
          onClick={runPlanner}
          disabled={!outId || loading}
          className={`px-3 py-1.5 rounded ${(!outId||loading)?'bg-neutral-800 text-neutral-500':'bg-emerald-600 text-white'}`}
        >
          {loading ? 'Calculating…' : 'Find IN suggestions'}
        </button>

        {hasTeam && (
          <button
            onClick={clearUserTeam}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
            title="Glöm importerat lag (endast klienten)"
          >
            Clear My Team
          </button>
        )}
      </div>

      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {result && (
        <div className="mt-2 space-y-3">
          {/* Sammanfattning */}
          <div className="text-xs text-neutral-400">
            Budget (ITB + OUT-pris): <b className="text-neutral-200">{fmtPrice(result.budgetMax)}</b>
            {result.outPlayer && (
              <> · OUT: <b className="text-neutral-200">{result.outPlayer.web_name}</b> ({result.outPlayer.team})</>
            )}
          </div>

          {/* Förslag */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(result.suggestions || []).map(p => (
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
                    <div className="text-xs text-neutral-400">EV next {p.horizon ?? '—'}</div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>Price</div><div className="text-right">{p.price != null ? `${Number(p.price).toFixed(1)}m` : (p.now_cost ? `${(p.now_cost/10).toFixed(1)}m` : '–')}</div>
                  <div>xGI/90</div><div className="text-right">{p.xGI90?.toFixed?.(2) ?? '–'}</div>
                  <div>Form</div><div className="text-right">{Math.round(p.formScore ?? 0)}</div>
                  <div>FDR (3)</div><div className="text-right">{p.fdrAttackNext3 ?? '–'}</div>
                  <div>Startchans</div><div className="text-right">{Math.round((p.minutesRisk ?? 0)*100)}%</div>
                  <div>Own%</div><div className="text-right">{p.selected_by_percent ?? '–'}</div>
                  {p.VORP != null && (<><div>VORP</div><div className="text-right font-semibold">{p.VORP.toFixed(2)}</div></>)}
                </div>

                {Array.isArray(p.reasons) && p.reasons.length > 0 && (
                  <div className="mt-2 text-xs text-neutral-300">
                    {p.reasons.map((r,i)=>(<div key={i}>• {r}</div>))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {(!result.suggestions || result.suggestions.length === 0) && (
            <div className="text-sm text-neutral-400">
              Inga kandidater inom budgeten. Höj ITB eller välj en annan OUT-spelare.
            </div>
          )}
        </div>
      )}
    </div>
  );
}