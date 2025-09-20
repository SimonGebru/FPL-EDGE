import React from 'react'
import Section from '../components/Section'
import ComparePanel from '../components/ComparePanel'
import { api } from '../lib/api'

export default function CompareSection(){
  const [result, setResult] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function onCompare(ids){
    setLoading(true); setErr(null)
    try {
      if (!Array.isArray(ids) || !ids.length) { setResult(null); return }
      setResult(await api.compare(ids))
    } catch(e){ setErr(e) } finally { setLoading(false) }
  }

  return (
    <Section title="Compare players (what-if)">
      {loading && <div className="text-neutral-400 mb-2">Loading…</div>}
      {err && <div className="text-rose-400 text-sm mb-2">Error: {String(err.message || err)}</div>}
      <ComparePanel result={result} onCompare={onCompare} />
    </Section>
  )
}