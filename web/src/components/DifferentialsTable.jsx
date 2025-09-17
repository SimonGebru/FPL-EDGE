import React from 'react'

export default function DifferentialsTable({ players }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-neutral-400">
          <tr>
            <th className="text-left font-medium py-2 pr-4">Player</th>
            <th className="text-left font-medium py-2 pr-4">Team</th>
            <th className="text-left font-medium py-2 pr-4">Pos</th>
            <th className="text-right font-medium py-2 pr-4">Own %</th>
            <th className="text-right font-medium py-2 pr-4">Form</th>
            <th className="text-right font-medium py-2 pr-4">FDR</th>
            <th className="text-right font-medium py-2 pr-0">MinRisk</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id} className="border-t border-neutral-800">
              <td className="py-2 pr-4">{p.web_name}</td>
              <td className="py-2 pr-4">{p.team}</td>
              <td className="py-2 pr-4">{p.position}</td>
              <td className="py-2 pr-4 text-right">{p.selected_by_percent}</td>
              <td className="py-2 pr-4 text-right">{Math.round(p.formScore)}</td>
              <td className="py-2 pr-4 text-right">{p.fdrAttackNext3}</td>
              <td className="py-2 pr-0 text-right">{p.minutesRisk?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}