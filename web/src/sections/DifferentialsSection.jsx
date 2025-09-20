import React from 'react'
import Section from '../components/Section'
import SliderField from '../components/SliderField'
import Info from '../components/Info'
import DifferentialsTable from '../components/DifferentialsTable'
import { api } from '../lib/api'
import { normNum } from '../lib/num'

export default function DifferentialsSection(){
  const [params, setParams] = React.useState({
    maxOwn: 15, minForm: 60, maxFdr: 3.5, minRisk: 0.7, position: '', limit: 8, relax: 1
  })
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function reload(){
    setLoading(true); setErr(null)
    try {
      const p = {
        ...params,
        maxOwn: String(params.maxOwn),
        minForm: String(params.minForm),
        maxFdr: String(params.maxFdr),
        minRisk: String(params.minRisk),
        limit: String(params.limit)
      }
      setData(await api.players.differentials(new URLSearchParams(p)))
    } catch(e){ setErr(e) } finally { setLoading(false) }
  }

  React.useEffect(()=>{ reload() },[]) // initial

  return (
    <Section title="Hidden gems (Differentials)" action={
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center">Max ägande (%)<Info text="Andel managers som äger spelaren. Lågt = differential." /></label>
            <input type="number" min="0" max="100" step="1" value={params.maxOwn}
              onChange={e=>setParams(s=>({...s, maxOwn: Math.max(0, Math.min(100, Number(e.target.value)))}))}
              className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center">Min form<Info text="Vår skala 0–100 från senaste matcher." /></label>
            <input type="number" min="0" max="100" step="1" value={params.minForm}
              onChange={e=>setParams(s=>({...s, minForm: Math.max(0, Math.min(100, Number(e.target.value)))}))}
              className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center">Max motståndarsvårighet<Info text="Snitt FDR (1 lätt – 5 svår) nästa 3 GW." /></label>
            <input type="number" min="1" max="5" step="0.1" value={params.maxFdr}
              onChange={e=>setParams(s=>({...s, maxFdr: normNum(e.target.value)}))}
              className="w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          </div>

          <SliderField
            label="Min startchans"
            tooltip="Sannolikhet att få speltid nästa GW."
            kind="percent"
            min={0} max={1} step={0.05}
            value={params.minRisk}
            onChange={v=> setParams(s=>({...s, minRisk: normNum(v)}))}
          />

          <div className="flex items-center gap-2">
            <label>Position</label>
            <select value={params.position} onChange={e=>setParams(s=>({...s, position: e.target.value}))}
              className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
              <option value="">Any</option>
              <option>Goalkeeper</option>
              <option>Defender</option>
              <option>Midfielder</option>
              <option>Forward</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label>Limit</label>
            <input type="number" min="1" max="50" value={params.limit}
              onChange={e=>setParams(s=>({...s, limit: Math.max(1, Math.min(50, Number(e.target.value)))}))}
              className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          </div>

          <button onClick={reload} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
          <button onClick={()=>{
            const d = { maxOwn:15, minForm:60, maxFdr:3.5, minRisk:0.7, position:'', limit:8, relax:1 }
            setParams(d); setTimeout(reload,0)
          }} className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Reset</button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={()=>{ setParams({maxOwn:20,minForm:60,maxFdr:3.5,minRisk:0.7,position:'',limit:8,relax:1}); setTimeout(reload,0)}}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Safe</button>
          <button onClick={()=>{ setParams({maxOwn:15,minForm:65,maxFdr:3.2,minRisk:0.7,position:'',limit:8,relax:1}); setTimeout(reload,0)}}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Balanced</button>
          <button onClick={()=>{ setParams({maxOwn:10,minForm:70,maxFdr:3.0,minRisk:0.75,position:'Midfielder',limit:8,relax:1}); setTimeout(reload,0)}}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Aggressive</button>
        </div>
      </div>
    }>
      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}
      {(!loading && (data?.players||[]).length === 0) && (
        <div className="text-sm text-neutral-400">
          Inga träffar. Tips: höj Max motståndarsvårighet till 3.8, sänk Min form till 60, eller välj Position “Any”.
        </div>
      )}
      <DifferentialsTable players={data?.players || []} />
    </Section>
  )
}