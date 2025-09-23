// web/src/components/TeamViewPanel.jsx
import React from 'react';
import { api } from '../lib/api';
import SearchBox from './SearchBox';
import { useUserTeam } from '../context/UserTeamContext';   // ⬅️ NYTT

function Pill({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs">
      {children}
    </span>
  );
}

function LineupTable({ title, players = [] }) {
  return (
    <div>
      <div className="text-sm text-neutral-400 mb-1">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="text-left py-2 pr-4">Player</th>
              <th className="text-left py-2 pr-4">Team</th>
              <th className="text-left py-2 pr-4">Pos</th>
              <th className="text-right py-2 pr-4">Form</th>
              <th className="text-right py-2 pr-4">xGI/90</th>
              <th className="text-right py-2 pr-4">FDR</th>
              <th className="text-right py-2 pr-0">Start%</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-t border-neutral-800">
                <td className="py-2 pr-4">{p.web_name}</td>
                <td className="py-2 pr-4">{p.team}</td>
                <td className="py-2 pr-4">{p.position}</td>
                <td className="py-2 pr-4 text-right">{Math.round(p.formScore ?? 0)}</td>
                <td className="py-2 pr-4 text-right">{p.xGI90?.toFixed?.(2) ?? '–'}</td>
                <td className="py-2 pr-4 text-right">{p.fdrAttackNext3 ?? '–'}</td>
                <td className="py-2 pr-0 text-right">{Math.round((p.minutesRisk ?? 0) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TeamViewPanel() {
  // Importerat lag från context
  const { team, hasTeam, playerIds } = useUserTeam();   // ⬅️ NYTT

  // Manuellt tillagda spelare
  const [picked, setPicked] = React.useState([]);   // [{id, web_name, ...}]
  const ids = React.useMemo(() => picked.map(p => p.id), [picked]);

  const [res, setRes] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);

  function addPlayer(p) {
    if (!p?.id) return;
    setPicked(prev => prev.find(x => x.id === p.id) ? prev : [...prev, p]);
  }

  async function addIdFromInput(raw) {
    const n = Number(String(raw || '').trim());
    if (!n) return;
    try {
      const r = await api.compare([n]);
      const p = (r.players || r.comparison || []).find(x => x.id === n) || (r.players || r.comparison || [])[0];
      if (p?.id) addPlayer(p);
    } catch {
      setPicked(prev => prev.find(x => x.id === n) ? prev : [...prev, { id: n, web_name: `#${n}`, team: '—', position: '—' }]);
    }
  }

  function removeId(id) {
    setPicked(prev => prev.filter(x => x.id !== id));
  }

  // ⬇️ NYTT: analysera mitt riktiga lag
  async function analyzeMyTeam() {
    if (!hasTeam || playerIds.length < 11) {
      setErr(new Error('Importera ett lag med minst 11 spelare först.'));
      return;
    }
    setLoading(true); setErr(null);
    try {
      const out = await api.team.analyze({ squad: playerIds });
      setRes(out);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  // Befintlig analys
  async function analyze() {
    if (ids.length < 11) {
      setErr(new Error('Lägg till minst 11 spelare innan analys.'));
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const out = await api.team.analyze({ squad: ids });
      setRes(out);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-neutral-300">
        Lägg till spelare via sök eller klistra in ID. Minst <b>11 spelare</b> för start/bench/captain-förslag.
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <SearchBox
          placeholder="Search players to add…"
          position=""
          limit={8}
          onSelect={addPlayer}
        />

        <div className="flex gap-2">
          <input
            placeholder="Paste ID (e.g. 597) och tryck Enter"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addIdFromInput(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 outline-none"
          />
          <button onClick={analyze} className="px-3 py-2 rounded-lg bg-emerald-600 text-white">
            Analyze
          </button>

          {/* ⬇️ NYTT: knapp för ditt riktiga lag */}
          <button
            onClick={analyzeMyTeam}
            disabled={!hasTeam}
            className={`px-3 py-2 rounded-lg ${hasTeam ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-500'}`}
          >
            Use My Team
          </button>
        </div>
      </div>

      {/* Valda spelare */}
      <div className="flex flex-wrap gap-2">
        {picked.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs"
          >
            {p.web_name} <span className="text-neutral-400">· {p.team}</span>
            <button onClick={() => removeId(p.id)} className="text-neutral-400 hover:text-neutral-200">×</button>
          </span>
        ))}
        {picked.length === 0 && <span className="text-sm text-neutral-500">Inga spelare tillagda ännu.</span>}
      </div>

      {loading && <div className="text-neutral-400">Analyserar…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {res && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Pill>GW {res.currentGW}</Pill>
            {res.captain && <Pill>Captain: {res.captain.web_name}</Pill>}
            {res.vice && <Pill>Vice: {res.vice.web_name}</Pill>}
          </div>

          <LineupTable title="Start XI" players={res.startXI || []} />
          <LineupTable title="Bench" players={res.bench || []} />

          <div>
            <div className="text-sm text-neutral-400 mb-1">Sell candidates</div>
            <div className="grid md:grid-cols-3 gap-3">
              {(res.sellCandidates || []).map((p) => (
                <div key={p.id} className="p-3 rounded-xl border border-neutral-800">
                  <div className="font-medium">
                    {p.web_name} <span className="text-neutral-400">· {p.team}</span>
                  </div>
                  <div className="text-xs text-neutral-400">{p.position}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-neutral-400 mb-1">Shortlist (IN)</div>
            <div className="grid md:grid-cols-2 gap-3">
              {(res.shortlist || []).map((p) => (
                <div key={p.id} className="p-3 rounded-xl border border-neutral-800">
                  <div className="font-medium">
                    {p.web_name} <span className="text-neutral-400">· {p.team}</span>
                  </div>
                  <div className="text-xs text-neutral-400">{p.position}</div>
                  <div className="mt-2 text-xs text-neutral-300">
                    Form {Math.round(p.formScore ?? 0)} · xGI/90 {p.xGI90?.toFixed?.(2) ?? '–'} · FDR {p.fdrAttackNext3 ?? '–'} · Start {Math.round((p.minutesRisk ?? 0) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}