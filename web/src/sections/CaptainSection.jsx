import React from 'react'
import Section from '../components/Section'
import SliderField from '../components/SliderField'
import CaptainList from '../components/CaptainList'
import { api } from '../lib/api'
import { normNum } from '../lib/num'

export default function CaptainSection(){
  const [capLimit, setCapLimit] = React.useState(3)
  const [capMinRisk, setCapMinRisk] = React.useState(0.7)
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function reload(){
    setLoading(true); setErr(null)
    try {
      const params = new URLSearchParams({ limit: String(capLimit), minMinutesRisk: String(capMinRisk) })
      setData(await api.suggestions.captain(params))
    } catch(e){ setErr(e) } finally { setLoading(false) }
  }

  React.useEffect(()=>{ reload() },[]) // initial

  return (
    <Section title="Captain picks" action={
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm">Limit</label>
          <input type="number" min="1" max="10" value={capLimit}
            onChange={e=>setCapLimit(Math.max(1, Math.min(10, Number(e.target.value))))}
            className="w-16 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
        </div>

        <SliderField
          label="Min startchans"
          tooltip="Sannolikhet att få vettig speltid (0–100%)."
          kind="percent"
          min={0} max={1} step={0.05}
          value={capMinRisk}
          onChange={v=> setCapMinRisk(normNum(v))}
        />

        <div className="flex items-center gap-2">
          <button onClick={()=>{ setCapLimit(3); setCapMinRisk(0.8); setTimeout(reload,0) }}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">Template</button>
          <button onClick={()=>{ setCapLimit(5); setCapMinRisk(0.6); setTimeout(reload,0) }}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">Upside</button>
          <button onClick={reload} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
        </div>
      </div>
    }>
      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}
      <CaptainList picks={data?.picks || []} />
    </Section>
  )
}