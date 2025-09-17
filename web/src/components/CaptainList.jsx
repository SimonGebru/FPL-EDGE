// web/src/components/CaptainList.jsx
import React from 'react'
import StatPill from './StatPill'
import { reasonsForPlayer } from '../lib/reasons'

export default function CaptainList({ picks = [] }) {
  const [openId, setOpenId] = React.useState(null)

  if (!picks.length) {
    return <div className="text-sm text-neutral-400">Inga kaptensförslag ännu.</div>
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {picks.map(p => {
        const isOpen = openId === p.id
        const ev = p.captainEV ?? p.ev
        const startPct = Math.round((p.minutesRisk ?? 0) * 100)
        const why = (Array.isArray(p.reasons) && p.reasons.length ? p.reasons : reasonsForPlayer(p))

        return (
          <div key={p.id} className="rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{p.web_name}</div>
                <div className="text-sm text-neutral-400">{p.team} · {p.position}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{ev?.toFixed?.(1) ?? '–'}</div>
                <div className="text-xs text-neutral-400">EV</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {p.captainConfidence != null && <StatPill label="Conf" value={`${p.captainConfidence}`} />}
              <StatPill label="Form" value={Math.round(p.formScore ?? 0)} />
              <StatPill label="xGI/90" value={p.xGI90?.toFixed?.(2) ?? '–'} />
              <StatPill label="FDR" value={p.fdrAttackNext3 ?? '–'} />
              <StatPill label="Startchans" value={`${startPct}%`} />
            </div>

            <div className="mt-3">
              <button
                onClick={() => setOpenId(isOpen ? null : p.id)}
                className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
              >
                {isOpen ? 'Hide' : 'Why?'}
              </button>
            </div>

            {isOpen && (
              <div className="mt-3 text-sm text-neutral-300">
                <ul className="flex flex-wrap gap-2">
                  {why.map((r, i) => (
                    <li key={i} className="px-2 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs">
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-xs text-neutral-400">
                  EV ≈ <span className="font-medium text-neutral-300">60% Form + 40% xGI/90</span>, justerat för FDR & startchans.
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}