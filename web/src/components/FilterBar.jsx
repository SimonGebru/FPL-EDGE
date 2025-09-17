import React from 'react';

export default function FilterBar({ children, onApply, onReset }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-3">{children}</div>
      <div className="ml-auto flex gap-2">
        <button onClick={onReset} className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700">Reset</button>
        <button onClick={onApply} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white">Apply</button>
      </div>
    </div>
  );
}

export function Input({ label, ...props }) {
  return (
    <label className="text-sm">
      <span className="block text-neutral-400 mb-1">{label}</span>
      <input {...props} className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 outline-none" />
    </label>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <label className="text-sm">
      <span className="block text-neutral-400 mb-1">{label}</span>
      <select {...props} className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 outline-none">
        {children}
      </select>
    </label>
  );
}