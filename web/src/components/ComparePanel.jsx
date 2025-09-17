import React from 'react'
import { api } from '../lib/api'

export default function ComparePanel({ result, onCompare }) {
  const [query, setQuery] = React.useState('')
  const [suggestions, setSuggestions] = React.useState([])
  const [selected, setSelected] = React.useState([]) // [{id, web_name, team, position}]
  const [busy, setBusy] = React.useState(false)

  // Debounced fuzzy-sök mot backend
  React.useEffect(() => {
    if (!query || query.trim().length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ q: query, limit: '8' })
        const data = await api.players.search(p)
        setSuggestions(data.results || [])
      } catch { setSuggestions([]) }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  function addPlayer(p) {
    if (selected.some(s => s.id === p.id)) return
    setSelected(s => [...s, p])
    setQuery('')
    setSuggestions([])
  }
  function removePlayer(id) {
    setSelected(s => s.filter(x => x.id !== id))
  }

  async function doCompare() {
    const ids = selected.map(s => s.id)
    if (ids.length === 0) return
    setBusy(true)
    try { await onCompare(ids) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      {/* Sökfält + dropdown */}
      <div className="relative">
        <input
          value={query}
          onChange={(e)=> setQuery(e.target.value)}
          placeholder="Search players (e.g. saka, haaland)"
          className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 outline-none"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 max-h-64 overflow-auto">
            {suggestions.map(p => (
              <button
                key={p.id}
                onClick={()=> addPlayer(p)}
                className="w-full text-left px-3 py-2 hover:bg-neutral-900"
              >
                <div className="font-medium">
                  {p.web_name} <span className="text-neutral-400">· {p.team}</span>
                </div>
                <div className="text-xs text-neutral-500">{p.position}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Valda spelare (chips) */}
      <div className="flex flex-wrap gap-2">
        {selected.map(p => (
          <span key={p.id} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-neutral-800 border border-neutral-700">
            {p.web_name} <span className="text-neutral-400">· {p.team}</span>
            <button onClick={()=> removePlayer(p.id)} className="text-neutral-400 hover:text-white">×</button>
          </span>
        ))}
      </div>

      <div>
        <button
          onClick={doCompare}
          disabled={busy || selected.length === 0}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
        >
          {busy ? 'Comparing…' : `Compare ${selected.length || ''}`}
        </button>
      </div>

      {/* Resultattabell (samma som innan) */}
      {result && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-neutral-400">
              <tr>
                <th className="text-left py-2 pr-4">Player</th>
                <th className="text-left py-2 pr-4">Team</th>
                <th className="text-right py-2 pr-4">Form</th>
                <th className="text-right py-2 pr-4">xGI/90</th>
                <th className="text-right py-2 pr-4">FDR</th>
                <th className="text-right py-2 pr-0">EV</th>
              </tr>
            </thead>
            <tbody>
              {(result.players || result.comparison || []).map(p => (
                <tr key={p.id} className="border-t border-neutral-800">
                  <td className="py-2 pr-4">{p.web_name}</td>
                  <td className="py-2 pr-4">{p.team}</td>
                  <td className="py-2 pr-4 text-right">{Math.round(p.formScore)}</td>
                  <td className="py-2 pr-4 text-right">{p.xGI90?.toFixed?.(2) ?? '–'}</td>
                  <td className="py-2 pr-4 text-right">{p.fdrAttackNext3}</td>
                  <td className="py-2 pr-0 text-right font-semibold">{p.captainEV?.toFixed?.(1) ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}