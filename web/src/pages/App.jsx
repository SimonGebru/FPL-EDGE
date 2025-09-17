import React from 'react'
import Section from '../components/Section'
import CaptainList from '../components/CaptainList'
import DifferentialsTable from '../components/DifferentialsTable'
import Heatmap from '../components/Heatmap'
import Pricewatch from '../components/Pricewatch'
import ComparePanel from '../components/ComparePanel'
import SliderField from '../components/SliderField'
import Info from '../components/Info'
import HelpDrawer from '../components/HelpDrawer'
import { api } from '../lib/api'
import { normNum, toPct } from '../lib/num'

export default function App(){
  const [meta, setMeta] = React.useState(null)
  const [helpOpen, setHelpOpen] = React.useState(false)

  // Captain
  const [captain, setCaptain] = React.useState(null)
  const [capLimit, setCapLimit] = React.useState(3)
  const [capMinRisk, setCapMinRisk] = React.useState(0.7)
  const [capLoading, setCapLoading] = React.useState(false)
  const [capErr, setCapErr] = React.useState(null)

  // Differentials
  const [diffs, setDiffs] = React.useState(null)
  const [diffParams, setDiffParams] = React.useState({
    maxOwn: 15, minForm: 60, maxFdr: 3.5, minRisk: 0.7, position: '', limit: 8, relax: 1
  })
  const [diffLoading, setDiffLoading] = React.useState(false)
  const [diffErr, setDiffErr] = React.useState(null)

  // Heatmap
  const [heat, setHeat] = React.useState(null)
  const [horizon, setHorizon] = React.useState(5)
  const [heatLoading, setHeatLoading] = React.useState(false)
  const [heatErr, setHeatErr] = React.useState(null)

  // Pricewatch
  const [price, setPrice] = React.useState(null)
  const [priceLimit, setPriceLimit] = React.useState(12)
  const [priceLoading, setPriceLoading] = React.useState(false)
  const [priceErr, setPriceErr] = React.useState(null)

  // xGI Leaders
  const [xgi, setXgi] = React.useState(null)
  const [xgiParams, setXgiParams] = React.useState({ position: '', minMinutesRisk: 0.7, limit: 10 })
  const [xgiLoading, setXgiLoading] = React.useState(false)
  const [xgiErr, setXgiErr] = React.useState(null)

  // Trends
  const [trends, setTrends] = React.useState(null)
  const [trendParams, setTrendParams] = React.useState({ direction: 'both', limit: 20 })
  const [trendLoading, setTrendLoading] = React.useState(false)
  const [trendErr, setTrendErr] = React.useState(null)

  // Congestion
  const [cong, setCong] = React.useState(null)
  const [congDays, setCongDays] = React.useState(14)
  const [congLoading, setCongLoading] = React.useState(false)
  const [congErr, setCongErr] = React.useState(null)

  // Compare
  const [cmp, setCmp] = React.useState(null)
  const [cmpLoading, setCmpLoading] = React.useState(false)
  const [cmpErr, setCmpErr] = React.useState(null)

  React.useEffect(() => {
    (async () => {
      try {
        const [m, c, d, h, p, xl, tr, cg] = await Promise.all([
          api.meta.sources(),
          api.suggestions.captain(new URLSearchParams({ limit: String(capLimit), minMinutesRisk: String(capMinRisk) })),
          api.players.differentials(new URLSearchParams({ ...diffParams, minRisk: String(diffParams.minRisk), limit: String(diffParams.limit) })),
          api.fixtures.heatmap(horizon),
          api.players.pricewatch(new URLSearchParams({ limit: String(priceLimit) })),
          api.players.xgiLeaders(new URLSearchParams({ ...xgiParams, limit: String(xgiParams.limit) })),
          api.players.trends(new URLSearchParams({ ...trendParams, limit: String(trendParams.limit) })),
          api.teams.congestion(congDays),
        ])
        setMeta(m); setCaptain(c); setDiffs(d); setHeat(h); setPrice(p); setXgi(xl); setTrends(tr); setCong(cg)
      } finally {}
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handlers (oförändrade i logik)
  async function reloadCaptain(){
    setCapLoading(true); setCapErr(null)
    try {
      const params = new URLSearchParams({ limit: String(capLimit), minMinutesRisk: String(capMinRisk) })
      setCaptain(await api.suggestions.captain(params))
    } catch(e){ setCapErr(e) } finally { setCapLoading(false) }
  }
  async function reloadDiffs(){
    setDiffLoading(true); setDiffErr(null)
    try {
      const p = { ...diffParams, maxOwn: String(diffParams.maxOwn), minForm: String(diffParams.minForm), maxFdr: String(diffParams.maxFdr), minRisk: String(diffParams.minRisk), limit: String(diffParams.limit) }
      setDiffs(await api.players.differentials(new URLSearchParams(p)))
    } catch(e){ setDiffErr(e) } finally { setDiffLoading(false) }
  }
  async function reloadHeat(){
    setHeatLoading(true); setHeatErr(null)
    try { setHeat(await api.fixtures.heatmap(Number(horizon||5))) }
    catch(e){ setHeatErr(e) } finally { setHeatLoading(false) }
  }
  async function reloadPrice(){
    setPriceLoading(true); setPriceErr(null)
    try { setPrice(await api.players.pricewatch(new URLSearchParams({ limit: String(priceLimit) }))) }
    catch(e){ setPriceErr(e) } finally { setPriceLoading(false) }
  }
  async function reloadXgi(){
    setXgiLoading(true); setXgiErr(null)
    try {
      const params = new URLSearchParams({ position: xgiParams.position, minMinutesRisk: String(xgiParams.minMinutesRisk), limit: String(xgiParams.limit) })
      setXgi(await api.players.xgiLeaders(params))
    } catch(e){ setXgiErr(e) } finally { setXgiLoading(false) }
  }
  async function reloadTrends(){
    setTrendLoading(true); setTrendErr(null)
    try {
      const params = new URLSearchParams({ direction: trendParams.direction, limit: String(trendParams.limit) })
      setTrends(await api.players.trends(params))
    } catch(e){ setTrendErr(e) } finally { setTrendLoading(false) }
  }
  async function reloadCong(){
    setCongLoading(true); setCongErr(null)
    try { setCong(await api.teams.congestion(Number(congDays||14))) }
    catch(e){ setCongErr(e) } finally { setCongLoading(false) }
  }
  async function doCompare(ids){
    setCmpLoading(true); setCmpErr(null)
    try {
      if (!Array.isArray(ids) || !ids.length) { setCmp(null); return }
      setCmp(await api.compare(ids))
    } catch(e){ setCmpErr(e) } finally { setCmpLoading(false) }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <HelpDrawer open={helpOpen} onClose={()=>setHelpOpen(false)} />

      <header className="flex items-center justify-between">
        <h1 className="h1">FPL Edge</h1>
        <div className="flex items-center gap-3">
          <button onClick={()=>setHelpOpen(true)} className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Help</button>
          <div className="text-sm text-neutral-400">
            {meta?.summary?.dataFreshAt
              ? <>Data updated <span className="font-medium text-neutral-200">{new Date(meta.summary.dataFreshAt).toLocaleString()}</span></>
              : '…'}
          </div>
        </div>
      </header>

      {/* Captain picks */}
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

          {/* presets */}
          <div className="flex items-center gap-2">
            <button onClick={()=>{ setCapLimit(3); setCapMinRisk(0.8); setTimeout(reloadCaptain,0) }}
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">Template</button>
            <button onClick={()=>{ setCapLimit(5); setCapMinRisk(0.6); setTimeout(reloadCaptain,0) }}
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">Upside</button>
            <button onClick={reloadCaptain} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
          </div>
        </div>
      }>
        {capLoading && <div className="text-neutral-400">Loading…</div>}
        {capErr && <div className="text-rose-400 text-sm">Error: {String(capErr.message || capErr)}</div>}
        <CaptainList picks={captain?.picks || []} />
      </Section>

      {/* Differentials */}
      <Section title="Hidden gems (Differentials)" action={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center">Max ägande (%)<Info text="Andel managers som äger spelaren. Lågt = differential." /></label>
              <input type="number" min="0" max="100" step="1" value={diffParams.maxOwn}
                onChange={e=>setDiffParams(s=>({...s, maxOwn: Math.max(0, Math.min(100, Number(e.target.value)))}))}
                className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center">Min form<Info text="Vår skala 0–100 från senaste matcher." /></label>
              <input type="number" min="0" max="100" step="1" value={diffParams.minForm}
                onChange={e=>setDiffParams(s=>({...s, minForm: Math.max(0, Math.min(100, Number(e.target.value)))}))}
                className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center">Max motståndarsvårighet<Info text="Snitt FDR (1 lätt – 5 svår) nästa 3 GW." /></label>
              <input type="number" min="1" max="5" step="0.1" value={diffParams.maxFdr}
                onChange={e=>setDiffParams(s=>({...s, maxFdr: normNum(e.target.value)}))}
                className="w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
            </div>

            <SliderField
              label="Min startchans"
              tooltip="Sannolikhet att få speltid nästa GW."
              kind="percent"
              min={0} max={1} step={0.05}
              value={diffParams.minRisk}
              onChange={v=> setDiffParams(s=>({...s, minRisk: normNum(v)}))}
            />

            <div className="flex items-center gap-2">
              <label>Position</label>
              <select value={diffParams.position} onChange={e=>setDiffParams(s=>({...s, position: e.target.value}))}
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
              <input type="number" min="1" max="50" value={diffParams.limit}
                onChange={e=>setDiffParams(s=>({...s, limit: Math.max(1, Math.min(50, Number(e.target.value)))}))}
                className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
            </div>

            <button onClick={reloadDiffs} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
            <button onClick={()=>{
              const d = { maxOwn:15, minForm:60, maxFdr:3.5, minRisk:0.7, position:'', limit:8, relax:1 }
              setDiffParams(d); setTimeout(reloadDiffs,0)
            }} className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Reset</button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button onClick={()=>{ setDiffParams({maxOwn:20,minForm:60,maxFdr:3.5,minRisk:0.7,position:'',limit:8,relax:1}); setTimeout(reloadDiffs,0)}}
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Safe</button>
            <button onClick={()=>{ setDiffParams({maxOwn:15,minForm:65,maxFdr:3.2,minRisk:0.7,position:'',limit:8,relax:1}); setTimeout(reloadDiffs,0)}}
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Balanced</button>
            <button onClick={()=>{ setDiffParams({maxOwn:10,minForm:70,maxFdr:3.0,minRisk:0.75,position:'Midfielder',limit:8,relax:1}); setTimeout(reloadDiffs,0)}}
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Aggressive</button>
          </div>
        </div>
      }>
        {diffLoading && <div className="text-neutral-400">Loading…</div>}
        {diffErr && <div className="text-rose-400 text-sm">Error: {String(diffErr.message || diffErr)}</div>}
        {(!diffLoading && (diffs?.players||[]).length === 0) && (
          <div className="text-sm text-neutral-400">
            Inga träffar. Tips: höj Max motståndarsvårighet till 3.8, sänk Min form till 60, eller välj Position “Any”.
          </div>
        )}
        <DifferentialsTable players={diffs?.players || []} />
      </Section>

      {/* Heatmap */}
      <Section title="Fixture heatmap">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <label className="inline-flex items-center">
            Horizon (GWs) <Info text="Hur många omgångar framåt som ska sammanfattas." />
          </label>
          <input type="number" min="1" max="10" value={horizon} onChange={e=>setHorizon(Math.max(1, Math.min(10, Number(e.target.value))))}
            className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          <button onClick={reloadHeat} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
          <button onClick={()=>{ setHorizon(5); setTimeout(reloadHeat,0) }} className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Reset</button>
        </div>
        {heatLoading && <div className="text-neutral-400">Loading…</div>}
        {heatErr && <div className="text-rose-400 text-sm">Error: {String(heatErr.message || heatErr)}</div>}
        <Heatmap teams={heat?.teams || []} />
      </Section>

      {/* Pricewatch */}
      <Section title="Price Watch">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <label>Limit <Info text="Hur många toppkandidater att visa." /></label>
          <input type="number" min="5" max="50" value={priceLimit} onChange={e=>setPriceLimit(Math.max(5, Math.min(50, Number(e.target.value))))}
            className="ml-2 w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          <button onClick={reloadPrice} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
          <button onClick={()=>{ setPriceLimit(12); setTimeout(reloadPrice,0) }} className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Reset</button>
        </div>
        {priceLoading && <div className="text-neutral-400">Loading…</div>}
        {priceErr && <div className="text-rose-400 text-sm">Error: {String(priceErr.message || priceErr)}</div>}
        <Pricewatch risers={price?.risers || []} fallers={price?.fallers || []} />
      </Section>

      {/* xGI Leaders */}
      <Section title="xGI Leaders" action={
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <label>Position <Info text="Filtrera per position." /></label>
            <select value={xgiParams.position} onChange={e=>setXgiParams(s=>({...s, position: e.target.value}))}
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
            value={xgiParams.minMinutesRisk}
            onChange={v=> setXgiParams(s=>({...s, minMinutesRisk: normNum(v)}))}
          />

          <div className="flex items-center gap-2">
            <label>Limit</label>
            <input type="number" min="5" max="30" value={xgiParams.limit}
              onChange={e=>setXgiParams(s=>({...s, limit: Math.max(5, Math.min(30, Number(e.target.value)))}))}
              className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          </div>

          {/* små presets */}
          <button onClick={()=>{ setXgiParams({ position:'Forward', minMinutesRisk:0.7, limit:10 }); setTimeout(reloadXgi,0)}}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">Forwards</button>
          <button onClick={()=>{ setXgiParams({ position:'Midfielder', minMinutesRisk:0.7, limit:10 }); setTimeout(reloadXgi,0)}}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">Mid creators</button>

          <button onClick={reloadXgi} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
          <button onClick={()=>{ const d={ position:'', minMinutesRisk:0.7, limit:10 }; setXgiParams(d); setTimeout(reloadXgi,0) }}
            className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Reset</button>
        </div>
      }>
        {xgiLoading && <div className="text-neutral-400">Loading…</div>}
        {xgiErr && <div className="text-rose-400 text-sm">Error: {String(xgiErr.message || xgiErr)}</div>}
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
              {(xgi?.players||[]).map(p=>(
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

      {/* Trends */}
      <Section title="Trends">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <label>Direction</label>
          <select value={trendParams.direction} onChange={e=>setTrendParams(s=>({...s, direction: e.target.value}))}
            className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
            <option value="up">Rising</option>
            <option value="down">Falling</option>
            <option value="both">Both</option>
          </select>
          <label>Limit</label>
          <input type="number" min="5" max="50" value={trendParams.limit}
            onChange={e=>setTrendParams(s=>({...s, limit: Math.max(5, Math.min(50, Number(e.target.value)))}))}
            className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          <button onClick={reloadTrends} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
        </div>
        {trendLoading && <div className="text-neutral-400">Loading…</div>}
        {trendErr && <div className="text-rose-400 text-sm">Error: {String(trendErr.message || trendErr)}</div>}
        <div className="space-y-2">
          {(trends?.items || trends?.players || []).map(p=>(
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

      {/* Team Congestion */}
      <Section title="Team Congestion">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <label className="inline-flex items-center">
            Horizon (days) <Info text="Fler dagar = fler matcher fångas (cup/europa)." />
          </label>
          <input type="number" min="7" max="28" value={congDays}
            onChange={e=>setCongDays(Math.max(7, Math.min(28, Number(e.target.value))))}
            className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
          <button onClick={reloadCong} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
        </div>
        {congLoading && <div className="text-neutral-400">Loading…</div>}
        {congErr && <div className="text-rose-400 text-sm">Error: {String(congErr.message || congErr)}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-neutral-400">
              <tr>
                <th className="text-left py-2 pr-4">Team</th>
                <th className="text-right py-2 pr-4">Matches</th>
                <th className="text-right py-2 pr-4">Back-to-backs</th>
                <th className="text-right py-2 pr-4">Avg rest (d)</th>
                <th className="text-right py-2 pr-0">Score</th>
              </tr>
            </thead>
            <tbody>
              {(cong?.teams||[]).map(t=>(
                <tr key={t.teamId} className="border-t border-neutral-800">
                  <td className="py-2 pr-4">{t.team}</td>
                  <td className="py-2 pr-4 text-right">{t.matches}</td>
                  <td className="py-2 pr-4 text-right">{t.backToBacks}</td>
                  <td className="py-2 pr-4 text-right">{t.avgRestDays ?? '–'}</td>
                  <td className="py-2 pr-0 text-right font-semibold">{t.congestionScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Compare – fuzzy namn-sök */}
      <Section title="Compare players (what-if)">
        {cmpLoading && <div className="text-neutral-400 mb-2">Loading…</div>}
        {cmpErr && <div className="text-rose-400 text-sm mb-2">Error: {String(cmpErr.message || cmpErr)}</div>}
        <ComparePanel result={cmp} onCompare={doCompare} />
      </Section>

      <footer className="pt-6 text-center text-neutral-500 text-sm">
        Backend: {import.meta.env.VITE_API_BASE || 'http://localhost:5080'} · Built with React + Tailwind · MVP
      </footer>
    </div>
  )
}