import React from 'react'

export default function StatPill({ label, value, hint }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-neutral-800 border border-neutral-700 px-3 py-1 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="font-semibold" title={hint}>{value}</span>
    </div>
  )
}