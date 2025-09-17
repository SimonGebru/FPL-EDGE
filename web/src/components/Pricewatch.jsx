import React from 'react'

export default function Pricewatch({ risers, fallers }) {
  const Block = ({ title, rows }) => (
    <div className="card">
      <div className="card-pad border-b border-neutral-800"><h3 className="font-semibold">{title}</h3></div>
      <div className="card-pad">
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
              <div>
                <div className="font-medium">{r.web_name} <span className="text-neutral-400">· {r.team}</span></div>
                <div className="text-xs text-neutral-400">Own {r.selected_by_percent} · ΔGW {r.priceChangeEvent > 0 ? `+${r.priceChangeEvent/10}` : r.priceChangeEvent/10} · TI/TO {r.priceFlags.m.toFixed(1)}/1k</div>
              </div>
              <div className={title.includes('Rise') ? 'text-emerald-400 font-semibold':'text-rose-400 font-semibold'}>
                {title.includes('Rise') ? '↑ Rise risk':'↓ Fall risk'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Block title="Likely Risers" rows={risers} />
      <Block title="Likely Fallers" rows={fallers} />
    </div>
  )
}