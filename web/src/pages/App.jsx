import React from 'react'
import Section from '../components/Section'
import CaptainList from '../components/CaptainList'
import DifferentialsTable from '../components/DifferentialsTable'
import Heatmap from '../components/Heatmap'
import Pricewatch from '../components/Pricewatch'
import { api } from '../lib/api'

export default function App(){
  const [meta, setMeta] = React.useState(null)
  const [captain, setCaptain] = React.useState(null)
  const [diffs, setDiffs] = React.useState(null)
  const [heat, setHeat] = React.useState(null)
  const [price, setPrice] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    (async () => {
      try {
        const [m, c, d, h, p] = await Promise.all([
          api.meta.sources(),
          api.suggestions.captain(new URLSearchParams({ limit: '3' })),
          api.players.differentials(new URLSearchParams({ limit: '8', relax: '1' })),
          api.fixtures.heatmap(5),
          api.players.pricewatch(new URLSearchParams({ limit: '12' })),
        ])
        setMeta(m); setCaptain(c); setDiffs(d); setHeat(h); setPrice(p)
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="h1">FPL Edge</h1>
        <div className="text-sm text-neutral-400">
          {meta?.summary?.dataFreshAt ? <>Data updated <span className="font-medium text-neutral-200">{new Date(meta.summary.dataFreshAt).toLocaleString()}</span></> : '…'}
        </div>
      </header>

      {loading && <div className="text-neutral-400">Loading…</div>}

      {!loading && (
        <div className="grid gap-6">
          <Section title="Captain picks">
            <CaptainList picks={captain?.picks || []} />
          </Section>

          <Section title="Hidden gems (Differentials)">
            <DifferentialsTable players={diffs?.players || []} />
          </Section>

          <Section title="Fixture heatmap (next 5 GWs)">
            <Heatmap teams={heat?.teams || []} />
          </Section>

          <Section title="Price Watch">
            <Pricewatch risers={price?.risers || []} fallers={price?.fallers || []} />
          </Section>
        </div>
      )}

      <footer className="pt-6 text-center text-neutral-500 text-sm">
        Backend: {import.meta.env.VITE_API_BASE || 'http://localhost:5060'} · Built with React + Tailwind · MVP
      </footer>
    </div>
  )
}