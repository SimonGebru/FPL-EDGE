import React from 'react'
import Section from '../components/Section'
import Info from '../components/Info'
import { api } from '../lib/api'

export default function CongestionSection(){
  const [days, setDays] = React.useState(14)
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function reload(){
    setLoading(true); setErr(null)
    try { setData(await api.teams.congestion(Number(days||14))) }
    catch(e){ setErr(e) } finally { setLoading(false) }
  }

  React.useEffect(()=>{ reload() },[]) // initial

  return (
    <Section title="Team Congestion">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <label className="inline-flex items-center">
          Horizon (days) <Info text="Fler dagar = fler matcher fångas (cup/europa)." />
        </label>
        <input type="number" min="7" max="28" value={days}
          onChange={e=>setDays(Math.max(7, Math.min(28, Number(e.target.value))))}
          className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"/>
        <button onClick={reload} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
      </div>

      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

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
            {(data?.teams||[]).map(t=>(
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
  )
}