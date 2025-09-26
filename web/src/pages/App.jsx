// web/src/pages/App.jsx
import React from 'react'

import HelpDrawer from '../components/HelpDrawer'
import TeamViewPanel from '../components/TeamViewPanel'
import TransferPlannerPanel from '../components/TransferPlannerPanel'
import TransferStrategyPanel from '../components/TransferStrategyPanel'
import CaptainMonteCarloPanel from '../components/CaptainMonteCarloPanel'
import OwnershipShield from '../components/OwnershipShield'

import { PlannerProvider } from '../context/PlannerContext'
import { UserTeamProvider, useUserTeam } from '../context/UserTeamContext'
import { LayoutProvider, useLayout } from '../context/LayoutContext'
import DraggableGrid from '../components/DraggableGrid'
import WidgetShell from '../components/WidgetShell'
import DockTray from '../components/DockTray' // ⬅️ TRAY

import { api, API_BASE } from '../lib/api'

import CaptainSection from '../sections/CaptainSection'
import DifferentialsSection from '../sections/DifferentialsSection'
import HeatmapSection from '../sections/HeatmapSection'
import PriceWatchSection from '../sections/PriceWatchSection'
import XGISection from '../sections/XGISection'
import TrendsSection from '../sections/TrendsSection'
import CongestionSection from '../sections/CongestionSection'
import CompareSection from '../sections/CompareSection'

// NYTT (fast block högst upp)
import ImportTeamBar from '../components/ImportTeamBar'
import MyTeamPanel from '../components/MyTeamPanel'

/* ----------------------------- Fast top-block ----------------------------- */
function ImportBlock(){
  const { entryId, setFromImport } = useUserTeam();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);

  async function refresh(){
    if (!entryId) return;
    setLoading(true); setErr(null);
    try{
      const data = await api.user.team(entryId);
      setFromImport(data);
    }catch(e){ setErr(e) }finally{ setLoading(false) }
  }

  return (
    <>
      <div className="rounded-xl border border-neutral-800 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-medium text-neutral-200">Mitt riktiga lag</div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={!entryId || loading}
              className={`px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs ${(!entryId||loading)?'opacity-60':''}`}
              title={entryId ? `Uppdatera entry ${entryId}` : 'Importera först'}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
        <ImportTeamBar onImported={setFromImport} />
        {err && <div className="mt-2 text-rose-400 text-xs">Error: {String(err.message||err)}</div>}
      </div>

      {/* Snabb vy av laget direkt under importbaren */}
      <MyTeamPanel />
    </>
  );
}

/* ------------------------------- GW Banner ------------------------------- */
// Visar läget för nuvarande vy: aktuell GW, draft (nästa GW) eller senast färdiga GW.
// Placeras efter <header> och före <DockTray /> i render-trädet.
function GwBanner(){
  const { gw, gwKind, deadlineTime } = useUserTeam(); // kräver att UserTeamContext exponerar dessa
  if (!gwKind) return null;

  const label =
    gwKind === 'current'  ? `Aktuell GW ${gw}` :
    gwKind === 'next'     ? `Draft (nästa GW ${gw})` :
    gwKind === 'finished' ? `Senast färdiga GW ${gw}` :
                            `GW ${gw}`;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm flex items-center justify-between">
      <div className="text-neutral-200">{label}</div>
      {deadlineTime && (
        <div className="text-xs text-neutral-400">
          Deadline: {new Date(deadlineTime).toLocaleString()}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Widget-registry (DND) --------------------------- */
// OBS: ID:na här bör matcha DEFAULT_ORDER i LayoutContext.jsx
const WIDGETS = {
  captain:          { title: 'Captain picks',                         render: (key) => <CaptainSection key={`cap-${key}`} /> },
  teamView:         { title: 'Team View (start/bench/captain)',       render: () => <TeamViewPanel /> },
  differentials:    { title: 'Hidden gems (Differentials)',           render: (key) => <DifferentialsSection key={`diff-${key}`} /> },
  transferStrategy: { title: 'Transfer Strategy (budget → best buys)',render: () => <TransferStrategyPanel /> },
  transferPlanner:  { title: 'Transfer Planner (1 move EV)',          render: () => <TransferPlannerPanel /> },
  captainMC:        { title: 'Captaincy Monte Carlo',                 render: () => <CaptainMonteCarloPanel /> },
  heatmap:          { title: 'Fixture heatmap',                       render: (key) => <HeatmapSection key={`heat-${key}`} /> },
  priceWatch:       { title: 'Price Watch',                           render: (key) => <PriceWatchSection key={`pw-${key}`} /> },
  xgi:              { title: 'xGI Leaders',                           render: (key) => <XGISection key={`xgi-${key}`} /> },
  trends:           { title: 'Trends',                                render: (key) => <TrendsSection key={`tr-${key}`} /> },
  congestion:       { title: 'Team Congestion',                       render: (key) => <CongestionSection key={`cg-${key}`} /> },
  ownership:        { title: 'Ownership Shield (template risk)',      render: () => <OwnershipShield /> },
  compare:          { title: 'Compare players (what-if)',             render: () => <CompareSection /> },
};

function WidgetsArea({ reloadTick }){
  const { order, setOrder } = useLayout();
  const ids = order.filter(id => WIDGETS[id]); // skydda mot saknade keys
  return (
    <DraggableGrid
      ids={ids}
      onReorder={setOrder}
      renderItem={(id)=>(
        <WidgetShell id={id} title={WIDGETS[id].title}>
          {WIDGETS[id].render?.(reloadTick)}
        </WidgetShell>
      )}
    />
  );
}

/* ---------------------------------- App ---------------------------------- */
export default function App(){
  const [meta, setMeta] = React.useState(null)
  const [helpOpen, setHelpOpen] = React.useState(false)

  // --- Debug/Reload ---
  const [debugOpen, setDebugOpen] = React.useState(false)
  const [reloadTick, setReloadTick] = React.useState(0) // bump → trigga refetch på vissa widgets
  const [appKey, setAppKey] = React.useState(1)
  const [lastMetaErr, setLastMetaErr] = React.useState(null)

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

  // Alt+R → global reload för widgets
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

  const updatedAt = meta?.summary?.dataFreshAt
    ? new Date(meta.summary.dataFreshAt).toLocaleString()
    : null
  const currentGW = meta?.summary?.currentGW ?? meta?.currentGW ?? null

  return (
    <PlannerProvider>
      <UserTeamProvider>
        <LayoutProvider>
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

            {/* === GW-status/banner (NY) === */}
            <GwBanner />

            {/* === Dock/Tray för gömda widgets – HÖGST UPP, ej sticky === */}
            <DockTray />

            {/* Fast block högst upp: Import + direkt lagvy */}
            <ImportBlock />

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
                      <div>• <b>Force reload all</b> remountar widgets (triggar nya fetchar).</div>
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

            {/* === Drag-n-drop area för alla sektioner nedanför top-blocket === */}
            <WidgetsArea reloadTick={reloadTick} />

            <footer className="pt-6 text-center text-neutral-500 text-sm">
              Backend: {import.meta.env.VITE_API_BASE || 'http://localhost:5080'} · Built with React + Tailwind · MVP
            </footer>
          </div>
        </LayoutProvider>
      </UserTeamProvider>
    </PlannerProvider>
  )
}