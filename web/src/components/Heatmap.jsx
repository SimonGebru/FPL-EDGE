import React from 'react'

export default function Heatmap({ teams }) {
  const gws = teams.length ? Object.keys(teams[0].gw) : []
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-neutral-400">
          <tr>
            <th className="text-left font-medium py-2 pr-4">Team</th>
            {gws.map(gw => (<th key={gw} className="text-right font-medium py-2 pr-4">GW {gw}</th>))}
            <th className="text-right font-medium py-2 pr-0">Avg</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(row => (
            <tr key={row.teamId} className="border-t border-neutral-800">
              <td className="py-2 pr-4">{row.team}</td>
              {gws.map(gw => (
                <td key={gw} className="py-2 pr-4 text-right">
                  <span className={cellCls(row.gw[gw])}>{row.gw[gw]}</span>
                </td>
              ))}
              <td className="py-2 pr-0 text-right font-semibold">{row.avg.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function cellCls(v){
  if (v <= 2) return 'text-emerald-400'
  if (v <= 3) return 'text-lime-300'
  if (v <= 4) return 'text-amber-300'
  return 'text-rose-400'
}