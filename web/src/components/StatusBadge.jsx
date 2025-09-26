import React from 'react';

export default function StatusBadge({ availability }) {
  if (!availability) return null;
  const { flag, status, chanceNext } = availability;

  const color =
    flag === 'red' ? 'bg-rose-700/30 text-rose-300 border-rose-700/60'
    : flag === 'yellow' ? 'bg-amber-700/30 text-amber-300 border-amber-700/60'
    : 'bg-emerald-700/30 text-emerald-300 border-emerald-700/60';

  const label = (() => {
    if (status === 'i') return 'Injured';
    if (status === 's') return 'Suspended';
    if (status === 'd') return typeof chanceNext === 'number' ? `Doubtful ${chanceNext}%` : 'Doubtful';
    if (status === 'n') return 'Unavailable';
    if (status === 'u') return 'Unregistered';
    return typeof chanceNext === 'number' && chanceNext < 100 ? `Risk ${chanceNext}%` : 'Fit';
  })();

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] ${color}`}>
      {label}
    </span>
  );
}