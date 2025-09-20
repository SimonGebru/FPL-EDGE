import React from 'react'
import Section from '../components/Section'
import { api } from '../lib/api'

export default function TrendsSection(){
  const [params, setParams] = React.useState({ direction: 'both', limit: 20 })
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function reload(){
    setLoading(true); setErr(null)
    try {
      const qs = new URLSearchParams({ direction: params.direction, limit: String(params.limit) })
      setData(await api.players.trends(qs))
    } catch(e){ setErr(e) } finally { setLoading(false) }
  }

  React.useEffect(()=>{ reload() },[]) // initial

  return (
    <Section title="Trends">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <label>Direction</label>
        <select value={params.direction} onChange={e=>setParams(s=>({...s, direction: e.target.value}))}
          className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
          <option value="up">Rising</option>
          <option value="down">Falling</option>
          <option value="both">Both</option>
        </select>
        <label>Limit</label>
        <input type="number" min="5" max="50" value={params.limit}
          onChange={e=>setParams(s=>({...s, limit: Math.max(5, Math.min(50, Number(e.target.value)))}))}
          className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
        <button onClick={reload} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
      </div>

      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      <div className="space-y-2">
        {(data?.items || data?.players || []).map(p=>(
          <div key={p.id} className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
            <div>
              <div className="font-medium">{p.web_name} <span className="text-neutral-400">· {p.team}</span></div>
              <div className="text-xs text-neutral-400">Ägande {p.selected_by_percent} · Trend {p.trendScore?.toFixed?.(1) ?? p.trendScore}</div>
            </div>
            <div className={p.trendScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {p.trendScore >= 0 ? '↑ Rising' : '↓ Falling'}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}