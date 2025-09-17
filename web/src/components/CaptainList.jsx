import React from 'react'
import StatPill from './StatPill'

export default function CaptainList({ picks }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {picks.map(p => (
        <div key={p.id} className="rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{p.web_name}</div>
              <div className="text-sm text-neutral-400">{p.team} · {p.position}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{p.captainEV.toFixed(1)}</div>
              <div className="text-xs text-neutral-400">EV</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatPill label="Conf" value={`${p.captainConfidence}`} />
            <StatPill label="Form" value={Math.round(p.formScore)} />
            <StatPill label="xGI/90" value={p.xGI90?.toFixed(2) ?? '–'} />
            <StatPill label="FDR" value={p.fdrAttackNext3} />
            <StatPill label="MinRisk" value={p.minutesRisk?.toFixed(2)} />
          </div>
          {p.reasons?.length ? (
            <div className="mt-3 text-sm text-neutral-300">
              {p.reasons.map((r,i)=>(<span key={i} className="mr-2">• {r}</span>))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}