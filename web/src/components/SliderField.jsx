// web/src/components/SliderField.jsx
import React from 'react';
import Info from './Info';

export default function SliderField({
  label,
  tooltip,
  value,             // number
  onChange,          // (number)=>void
  min = 0,
  max = 1,
  step = 0.05,
  kind = 'percent',  // 'percent' | 'number'
  suffix = '',
  className = '',
}) {
  const display =
    kind === 'percent'
      ? `${Math.round((Number(value) || 0) * 100)}%`
      : `${Number(value) || 0}${suffix}`;

  function handle(e) {
    const v = Number(e.target.value);
    onChange(kind === 'percent' ? v : v);
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <label className="text-sm text-neutral-200 whitespace-nowrap inline-flex items-center">
        {label}
        {tooltip && <Info text={tooltip} />}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? 0}
        onChange={handle}
        className="accent-emerald-600 w-48"
      />
      <span className="text-sm text-neutral-300 tabular-nums">{display}</span>
    </div>
  );
}