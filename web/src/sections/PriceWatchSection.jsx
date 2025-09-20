// web/src/sections/PriceWatchSection.jsx
import React from 'react'
import Section from '../components/Section'
import Info from '../components/Info'
import Pricewatch from '../components/Pricewatch'
import { api } from '../lib/api'

export default function PriceWatchSection(){
  const [price, setPrice] = React.useState(null)
  const [priceLimit, setPriceLimit] = React.useState(12)
  const [pwMinMomentum, setPwMinMomentum] = React.useState(5)
  const [pwMinOwn, setPwMinOwn] = React.useState(0)
  const [pwDebug, setPwDebug] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function reload(){
    setLoading(true); setErr(null)
    try{
      const qs = new URLSearchParams({
        limit: String(priceLimit),
        minMomentum: String(pwMinMomentum),
        minOwn: String(pwMinOwn),
      })
      if (pwDebug) qs.set('debug','1')
      setPrice(await api.players.pricewatch(qs))
    }catch(e){ setErr(e) }finally{ setLoading(false) }
  }

  React.useEffect(()=>{ reload() },[]) // första laddning

  const p = price || {}
  const risers = p.risers ?? p.items?.risers ?? p.results?.risers ?? p.data?.risers ?? (Array.isArray(p.items) ? p.items : []) ?? []
  const fallers = p.fallers ?? p.items?.fallers ?? p.results?.fallers ?? p.data?.fallers ?? []

  return (
    <Section title="Price Watch">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span>Limit <Info text="Hur många toppkandidater att visa." /></span>
          <input
            type="number" min="5" max="50" value={priceLimit}
            onChange={e=>setPriceLimit(Math.max(5, Math.min(50, Number(e.target.value))))}
            className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
          />
        </label>

        <label className="flex items-center gap-2">
          <span>Min momentum (/1k)</span>
          <input
            type="number" step="0.5" min="0" max="20" value={pwMinMomentum}
            onChange={e=>setPwMinMomentum(Math.max(0, Number(e.target.value)))}
            className="w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
          />
        </label>

        <label className="flex items-center gap-2">
          <span>Min ägande (%)</span>
          <input
            type="number" step="1" min="0" max="100" value={pwMinOwn}
            onChange={e=>setPwMinOwn(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
          />
        </label>

        <button onClick={reload} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
        <button onClick={()=>{ setPriceLimit(12); setPwMinMomentum(5); setPwMinOwn(0); setTimeout(reload,0) }} className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Reset</button>

        <button onClick={()=>{ setPwDebug(d=>!d); setTimeout(reload,0) }} className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">
          {pwDebug ? 'Hide debug' : 'Show debug'}
        </button>
      </div>

      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {price?.debug && (
        <div className="mb-3 p-3 rounded-xl border border-neutral-800 bg-neutral-900 text-xs text-neutral-300 space-y-1">
          <div className="font-semibold text-neutral-200">Debug</div>
          <div>counts: total={price?.debug?.counts?.total ?? '–'}, afterOwn={price?.debug?.counts?.afterOwn ?? '–'}, risers={price?.debug?.counts?.risers ?? '–'}, fallers={price?.debug?.counts?.fallers ?? '–'}</div>
          <div>thresholds (own → rise/fall): {Array.isArray(price?.debug?.thresholds) ? price.debug.thresholds.map(t => `${t.own}%→${t.riseThresh}/${t.fallThresh}`).join(' · ') : '–'}</div>
          <div>samples up: {price?.debug?.samples?.up?.map(s => s.name).join(', ') || '–'}</div>
          <div>samples down: {price?.debug?.samples?.down?.map(s => s.name).join(', ') || '–'}</div>
        </div>
      )}

      {(!loading && !err && risers.length === 0 && fallers.length === 0) ? (
        <div className="text-sm text-neutral-400">
          Inga prisförändringskandidater just nu. Prova att sänka ”Min momentum” eller öka limit.
        </div>
      ) : (
        <Pricewatch risers={risers} fallers={fallers} />
      )}
    </Section>
  )
}