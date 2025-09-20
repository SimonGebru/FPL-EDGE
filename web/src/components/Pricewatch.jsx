// web/src/components/Pricewatch.jsx
import React from 'react'

function Row({ title, rows }) {
  if (!rows?.length) {
    return (
      <div className="text-sm text-neutral-400">
        Inga kandidater hittades just nu. Testa att sänka tröskeln eller öka limit.
      </div>
    );
  }

  const up = title.toLowerCase().includes('rise');

  return (
    <div className="space-y-2">
      {rows.map(r => {
        const m = r.momentumPer1k ?? r.priceFlags?.m ?? 0;
        const pc = Number(r.priceChangeEvent || 0); // +1/-1/0 om data finns
        return (
          <div key={r.id} className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
            <div>
              <div className="font-medium">
                {r.web_name} <span className="text-neutral-400">· {r.team}</span>
              </div>
              <div className="text-xs text-neutral-400">
                Momentum {m?.toFixed?.(2)}/1k · Ägande {r.selected_by_percent}
                {Number.isFinite(pc) && pc !== 0 ? (
                  <> · ΔGW {pc > 0 ? `+${pc/10}` : (pc/10)}</>
                ) : null}
              </div>
            </div>
            <div className={`${up ? 'text-emerald-400' : 'text-rose-400'} font-semibold`}>
              {up ? '↑ Rise risk' : '↓ Fall risk'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Pricewatch({ risers = [], fallers = [] }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card">
        <div className="card-pad border-b border-neutral-800"><h3 className="font-semibold">Likely Risers</h3></div>
        <div className="card-pad"><Row title="Risers" rows={risers} /></div>
      </div>

      <div className="card">
        <div className="card-pad border-b border-neutral-800"><h3 className="font-semibold">Likely Fallers</h3></div>
        <div className="card-pad"><Row title="Fallers" rows={fallers} /></div>
      </div>
    </div>
  );
}