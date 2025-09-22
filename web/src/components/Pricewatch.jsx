import React from 'react';

function ownPct(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n.toFixed(1) : String(value ?? '–');
}

function momentumLabel(p) {
  // föredra backend-fältet, fall back till gamla
  const m = Number.isFinite(p.momentumPer1k) ? p.momentumPer1k
        : (Number.isFinite(p.priceFlags?.m) ? p.priceFlags.m : null);
  return Number.isFinite(m) ? `${m.toFixed(2)}/1k` : '–/1k';
}

function PriceDeltaBadge({ priceChangeEvent }) {
  const n = Number(priceChangeEvent);
  if (!Number.isFinite(n) || n === 0) return null; // visa inget om 0/ogiltigt
  const txt = `${n > 0 ? '+' : ''}${(n / 10).toFixed(1)}`;
  const cls =
    n > 0
      ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800/60'
      : 'bg-rose-900/40 text-rose-300 border-rose-800/60';
  return (
    <span className={`px-2 py-0.5 rounded-full border text-xs ${cls}`}>
      Δ GW {txt}
    </span>
  );
}

export default function Pricewatch({ risers = [], fallers = [] }) {
  const Row = ({ r, positive }) => (
    <div className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
      <div className="min-w-0">
        <div className="font-medium truncate">
          {r.web_name} <span className="text-neutral-400">· {r.team}</span>
        </div>
        <div className="text-xs text-neutral-400">
          Momentum {momentumLabel(r)} · Ägande {ownPct(r.selected_by_percent)}
        </div>
      </div>

      <div className="flex items-center gap-2 pl-3">
        {/* Pris-badge (±0.1 när event triggat) */}
        <PriceDeltaBadge priceChangeEvent={r.priceChangeEvent} />

        {/* Risk-label */}
        <div className={`${positive ? 'text-emerald-400' : 'text-rose-400'} font-semibold whitespace-nowrap`}>
          {positive ? '↑ Rise risk' : '↓ Fall risk'}
        </div>
      </div>
    </div>
  );

  const Block = ({ title, rows, positive }) => (
    <div className="card">
      <div className="card-pad border-b border-neutral-800">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="card-pad">
        <div className="space-y-2">
          {rows.map(r => <Row key={r.id} r={r} positive={positive} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Block title="Likely Risers" rows={risers} positive />
      <Block title="Likely Fallers" rows={fallers} positive={false} />
    </div>
  );
}