// web/src/pages/App.jsx
import React from 'react'

import Section from '../components/Section'
import HelpDrawer from '../components/HelpDrawer'
import TeamViewPanel from '../components/TeamViewPanel'
import TransferPlannerPanel from '../components/TransferPlannerPanel'
import TransferStrategyPanel from '../components/TransferStrategyPanel'
import CaptainMonteCarloPanel from '../components/CaptainMonteCarloPanel'
import OwnershipShield from '../components/OwnershipShield'

import { PlannerProvider } from '../context/PlannerContext'
import { api } from '../lib/api'

// Nya sektioner (state+fetch inuti varje fil)
import CaptainSection from '../sections/CaptainSection'
import DifferentialsSection from '../sections/DifferentialsSection'
import HeatmapSection from '../sections/HeatmapSection'
import PriceWatchSection from '../sections/PriceWatchSection'
import XGISection from '../sections/XGISection'
import TrendsSection from '../sections/TrendsSection'
import CongestionSection from '../sections/CongestionSection'
import CompareSection from '../sections/CompareSection'

export default function App(){
  const [meta, setMeta] = React.useState(null)
  const [helpOpen, setHelpOpen] = React.useState(false)

  React.useEffect(()=>{
    (async()=>{
      try { setMeta(await api.meta.sources()) } catch {}
    })()
  },[])

  return (
    <PlannerProvider>
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

        {/* Kapten */}
        <CaptainSection />

        {/* Team View */}
        <Section title="Team View (start/bench/captain)">
          <TeamViewPanel />
        </Section>

        {/* Differentials */}
        <DifferentialsSection />

        {/* Transfer Strategy */}
        <Section title="Transfer Strategy (budget → best buys)">
          <TransferStrategyPanel />
        </Section>

        {/* Transfer Planner */}
        <Section title="Transfer Planner (1 move EV)">
          <TransferPlannerPanel />
        </Section>

        {/* Captaincy Monte Carlo */}
        <Section title="Captaincy Monte Carlo">
          <CaptainMonteCarloPanel />
        </Section>

        {/* Heatmap */}
        <HeatmapSection />

        {/* Price Watch */}
        <PriceWatchSection />

        {/* xGI Leaders */}
        <XGISection />

        {/* Trends */}
        <TrendsSection />

        {/* Team Congestion */}
        <CongestionSection />

        {/* Ownership Shield */}
        <Section title="Ownership Shield (template risk)">
          <OwnershipShield />
        </Section>

        {/* Compare */}
        <CompareSection />

        <footer className="pt-6 text-center text-neutral-500 text-sm">
          Backend: {import.meta.env.VITE_API_BASE || 'http://localhost:5080'} · Built with React + Tailwind · MVP
        </footer>
      </div>
    </PlannerProvider>
  )
}