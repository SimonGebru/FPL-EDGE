import React from 'react'
import Section from '../components/Section'
import Info from '../components/Info'
import Heatmap from '../components/Heatmap'
import { api } from '../lib/api'

export default function HeatmapSection(){
  const [horizon, setHorizon] = React.useState(5)
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function reload(){
    setLoading(true); setErr(null)
    try { setData(await api.fixtures.heatmap(Number(horizon||5))) }
    catch(e){ setErr(e) } finally { setLoading(false) }
  }

  React.useEffect(()=>{ reload() },[]) // initial

  return (
    <Section title="Fixture heatmap">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <label className="inline-flex items-center">
          Horizon (GWs) <Info text="Hur många omgångar framåt som ska sammanfattas." />
        </label>
        <input type="number" min="1" max="10" value={horizon}
          onChange={e=>setHorizon(Math.max(1, Math.min(10, Number(e.target.value))))}
          className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
        <button onClick={reload} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
        <button onClick={()=>{ setHorizon(5); setTimeout(reload,0) }} className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Reset</button>
      </div>
      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}
      <Heatmap teams={data?.teams || []} />
    </Section>
  )
}