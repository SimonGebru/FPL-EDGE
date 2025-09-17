import React from 'react';

export default function TrendsList({ items }) {
  return (
    <div className="space-y-2">
      {items.map(p => (
        <div key={p.id} className="flex items-center justify-between border border-neutral-800 rounded-xl px-3 py-2">
          <div>
            <div className="font-medium">{p.web_name} <span className="text-neutral-400">· {p.team}</span></div>
            <div className="text-xs text-neutral-400">Own {p.selected_by_percent} · Trend {p.trendScore?.toFixed?.(1) ?? p.trendScore}</div>
          </div>
          <div className={p.trendScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {p.trendScore >= 0 ? '↑ Rising' : '↓ Falling'}
          </div>
        </div>
      ))}
    </div>
  );
}