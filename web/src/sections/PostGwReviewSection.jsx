// web/src/sections/PostGwReviewSection.jsx
import React from 'react';
import Section from '../components/Section';
import { api } from '../lib/api';
import ImportTeamBar from '../components/ImportTeamBar';

function MiniTable({ items }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-neutral-400">
          <tr>
            <th className="text-left py-2 pr-4">Player</th>
            <th className="text-left py-2 pr-4">Team</th>
            <th className="text-left py-2 pr-4">Pos</th>
            <th className="text-right py-2 pr-4">Pts</th>
            <th className="text-right py-2 pr-4">xGI</th>
            <th className="text-right py-2 pr-0">Min</th>
          </tr>
        </thead>
        <tbody>
          {items.map(x=>(
            <tr key={x.id} className="border-t border-neutral-800">
              <td className="py-2 pr-4">{x.web_name}{x.is_captain ? ' (C)' : x.is_vice ? ' (VC)' : ''}</td>
              <td className="py-2 pr-4">{x.team}</td>
              <td className="py-2 pr-4">{x.position}</td>
              <td className="py-2 pr-4 text-right font-medium">{x.points}</td>
              <td className="py-2 pr-4 text-right">{x.xgi ?? '–'}</td>
              <td className="py-2 pr-0 text-right">{x.minutes ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PostGwReviewSection(){
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [entryMemo, setEntryMemo] = React.useState(null);

  async function load(entryId){
    if (!entryId) return;
    setLoading(true); setErr(null);
    try {
      const d = await api.review.postGw(entryId);
      setData(d);
    } catch(e){ setErr(e) } finally { setLoading(false) }
  }

  return (
    <Section title="Post-GW Review" action={
      <div className="space-y-2">
        <ImportTeamBar onImported={(imp)=>{
          setEntryMemo(imp.entry);
          load(imp.entry);
        }}/>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <button
            onClick={()=> load(entryMemo)}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700"
            disabled={!entryMemo || loading}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {data?.gw && <span>Last finished GW: <b className="text-neutral-200">{data.gw}</b></span>}
        </div>
      </div>
    }>
      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {data && (
        <div className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-neutral-800">
              <div className="text-neutral-400 text-sm">Total points</div>
              <div className="text-2xl font-semibold">{data.totals?.points ?? '–'}</div>
            </div>
            <div className="p-3 rounded-xl border border-neutral-800">
              <div className="text-neutral-400 text-sm">Team xGI (sum)</div>
              <div className="text-2xl font-semibold">{data.totals?.xgi ?? '–'}</div>
            </div>
            <div className="p-3 rounded-xl border border-neutral-800">
              <div className="text-neutral-400 text-sm">Captain delta (best on team)</div>
              <div className={`text-2xl font-semibold ${Number(data.captain?.deltaIfBest||0) > 0 ? 'text-emerald-400':'text-neutral-200'}`}>
                {data.captain?.deltaIfBest != null ? `+${data.captain.deltaIfBest}` : '–'}
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                Actual: {data.captain?.actual?.web_name || '–'} · Best: {data.captain?.bestOnTeam?.web_name || '–'}
              </div>
            </div>
          </div>

          <MiniTable items={data.items || []} />
        </div>
      )}
    </Section>
  );
}