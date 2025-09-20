// web/src/sections/XGISection.jsx
import React from 'react'
import Section from '../components/Section'
import SliderField from '../components/SliderField'
import Info from '../components/Info'
import { api } from '../lib/api'
import { normNum, toPct } from '../lib/num'

export default function XGISection(){
  const [data, setData] = React.useState(null)
  const [params, setParams] = React.useState({ position: '', minMinutesRisk: 0.7, limit: 10 })
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function reload(){
    setLoading(true); setErr(null)
    try {
      const qs = new URLSearchParams({ position: params.position, minMinutesRisk: String(params.minMinutesRisk), limit: String(params.limit) })
      setData(await api.players.xgiLeaders(qs))
    } catch(e){ setErr(e) } finally { setLoading(false) }
  }

  React.useEffect(()=>{ reload() },[])

  return (
    <Section title="xGI Leaders" action={
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <label>Position <Info text="Filtrera per position." /></label>
          <select value={params.position} onChange={e=>setParams(s=>({...s, position: e.target.value}))}
            className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
            <option value="">Any</option>
            <option>Goalkeeper</option>
            <option>Defender</option>
            <option>Midfielder</option>
            <option>Forward</option>
          </select>
        </div>

        <SliderField
          label="Min startchans"
          tooltip="Sannolikhet att få speltid."
          kind="percent"
          min={0} max={1} step={0.05}
          value={params.minMinutesRisk}
          onChange={v=> setParams(s=>({...s, minMinutesRisk: normNum(v)}))}
        />

        <div className="flex items-center gap-2">
          <label>Limit</label>
          <input type="number" min="5" max="30" value={params.limit}
            onChange={e=>setParams(s=>({...s, limit: Math.max(5, Math.min(30, Number(e.target.value)))}))}
            className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
        </div>

        <button onClick={()=>{ setParams({ position:'Forward', minMinutesRisk:0.7, limit:10 }); setTimeout(reload,0)}}
          className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">Forwards</button>
        <button onClick={()=>{ setParams({ position:'Midfielder', minMinutesRisk:0.7, limit:10 }); setTimeout(reload,0)}}
          className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">Mid creators</button>

        <button onClick={reload} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
        <button onClick={()=>{ const d={ position:'', minMinutesRisk:0.7, limit:10 }; setParams(d); setTimeout(reload,0) }}
          className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Reset</button>
      </div>
    }>
      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="text-left py-2 pr-4">Player</th>
              <th className="text-left py-2 pr-4">Team</th>
              <th className="text-right py-2 pr-4">xG/90</th>
              <th className="text-right py-2 pr-4">xA/90</th>
              <th className="text-right py-2 pr-4">xGI/90</th>
              <th className="text-right py-2 pr-0">Startchans</th>
            </tr>
          </thead>
          <tbody>
            {(data?.players||[]).map(p=>(
              <tr key={p.id} className="border-t border-neutral-800">
                <td className="py-2 pr-4">{p.web_name}</td>
                <td className="py-2 pr-4">{p.team}</td>
                <td className="py-2 pr-4 text-right">{p.xG90?.toFixed?.(2) ?? '–'}</td>
                <td className="py-2 pr-4 text-right">{p.xA90?.toFixed?.(2) ?? '–'}</td>
                <td className="py-2 pr-4 text-right font-semibold">{p.xGI90?.toFixed?.(2) ?? '–'}</td>
                <td className="py-2 pr-0 text-right">{toPct(p.minutesRisk)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}