// web/src/pages/App.jsx
import React from 'react'

import Section from '../components/Section'
import HelpDrawer from '../components/HelpDrawer'
import TeamViewPanel from '../components/TeamViewPanel'
import TransferPlannerPanel from '../components/TransferPlannerPanel'
import TransferStrategyPanel from '../components/TransferStrategyPanel'
import CaptainMonteCarloPanel from '../components/CaptainMonteCarloPanel'
import OwnershipShield from '../components/OwnershipShield'
import ImportTeamBar from '../components/ImportTeamBar'   // <-- NYTT

import { PlannerProvider } from '../context/PlannerContext'
import { api } from '../lib/api'
import { API_BASE } from '../lib/api' // för debugbaren

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

  // --- Debug/Reload ---
  const [debugOpen, setDebugOpen] = React.useState(false)
  const [reloadTick, setReloadTick] = React.useState(0) // bump → remountar sektioner
  const [appKey, setAppKey] = React.useState(1)         // bump → remountar hela appträdet
  const [lastMetaErr, setLastMetaErr] = React.useState(null)

  // --- Import-status ---
  const [lastImport, setLastImport] = React.useState(null) // { entry, gw, team_name }

  React.useEffect(()=>{
    (async()=>{
      try {
        setLastMetaErr(null)
        setMeta(await api.meta.sources())
      } catch (e) {
        setLastMetaErr(e)
      }
    })()
  },[])

  // Alt+R → global reload
  React.useEffect(()=>{
    function onKey(e){
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        setReloadTick(t => t + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  },[])

  // Små helpers
  const updatedAt = meta?.summary?.dataFreshAt
    ? new Date(meta.summary.dataFreshAt).toLocaleString()
    : null
  const currentGW = meta?.summary?.currentGW ?? meta?.currentGW ?? null

  return (
    <PlannerProvider>
      {/* appKey gör det möjligt att “hard reset” hela appträdet */}
      <div key={appKey} className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <HelpDrawer open={helpOpen} onClose={()=>setHelpOpen(false)} />

        <header className="flex items-center justify-between">
          <h1 className="h1">FPL Edge</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={()=>setHelpOpen(true)}
              className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700"
            >
              Help
            </button>
            <div className="text-sm text-neutral-400">
              {updatedAt
                ? <>Data updated <span className="font-medium text-neutral-200">{updatedAt}</span></>
                : '…'}
            </div>
          </div>
        </header>

        {/* ------ HÖGST UPP: Importera ditt FPL-lag ------ */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-neutral-200">Mitt riktiga lag</div>
            <ImportTeamBar
              onImported={(data) => {
                setLastImport({ entry: data.entry, gw: data.gw, team_name: data.team_name });
                // Trigga om-laddning av sektioner (om du nyttjar ditt lag i UI:t)
                setReloadTick(t => t + 1);
              }}
            />
          </div>
          {lastImport && (
            <div className="mt-2 text-xs text-neutral-400">
              Importerat: <span className="text-neutral-200">{lastImport.team_name || 'team'}</span> · GW {lastImport.gw} · Entry {lastImport.entry}
            </div>
          )}
        </div>
        {/* ------------------------------------------------ */}

        {/* --- Liten Dev/Debug-bar --- */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950">
          <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-neutral-400">
              <span className="mr-3">API_BASE: <span className="text-neutral-200">{API_BASE}</span></span>
              <span className="mr-3">GW: <span className="text-neutral-200">{currentGW ?? '—'}</span></span>
              <span>Updated: <span className="text-neutral-200">{updatedAt ?? '—'}</span></span>
              {lastMetaErr && (
                <span className="ml-3 text-rose-400">meta error: {String(lastMetaErr.message || lastMetaErr)}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={()=> setReloadTick(t => t + 1)}
                className="px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
                title="Alt+R"
              >
                Force reload all
              </button>
              <button
                onClick={()=> setAppKey(k => k + 1)}
                className="px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
                title="Remount hela appträdet (rensa lokalt UI-state)"
              >
                Clear local state
              </button>
              <button
                onClick={()=> setDebugOpen(o => !o)}
                className="px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
              >
                {debugOpen ? 'Hide details' : 'Show details'}
              </button>
            </div>
          </div>

          {debugOpen && (
            <div className="px-3 pb-2 text-xs text-neutral-400">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div className="rounded-lg border border-neutral-800 p-2">
                  <div className="font-medium text-neutral-300 mb-1">Tips</div>
                  <div>• <b>Force reload all</b> remountar sektioner (triggar nya fetchar).</div>
                  <div>• <b>Clear local state</b> remountar hela appträdet.</div>
                  <div>• Kortkommando: <b>Alt+R</b> för “Force reload all”.</div>
                </div>
                <div className="rounded-lg border border-neutral-800 p-2">
                  <div className="font-medium text-neutral-300 mb-1">Meta</div>
                  <div>currentGW: {currentGW ?? '—'}</div>
                  <div>dataFreshAt: {updatedAt ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-neutral-800 p-2">
                  <div className="font-medium text-neutral-300 mb-1">Build</div>
                  <div>Env: {import.meta.env.MODE}</div>
                  <div>Cache-buster: aktiv (api.js withTs + no-store)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kapten */}
        {/* key=reloadTick → remountar respektive sektion när “Force reload all” klickas */}
        <CaptainSection key={`cap-${reloadTick}`} />

        {/* Team View */}
        <Section title="Team View (start/bench/captain)">
          <TeamViewPanel />
        </Section>

        {/* Differentials */}
        <DifferentialsSection key={`diff-${reloadTick}`} />

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
        <HeatmapSection key={`heat-${reloadTick}`} />

        {/* Price Watch */}
        <PriceWatchSection key={`pw-${reloadTick}`} />

        {/* xGI Leaders */}
        <XGISection key={`xgi-${reloadTick}`} />

        {/* Trends */}
        <TrendsSection key={`tr-${reloadTick}`} />

        {/* Team Congestion */}
        <CongestionSection key={`cg-${reloadTick}`} />

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