import React from 'react';

export default function XgiLeadersTable({ players }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-neutral-400">
          <tr>
            <th className="text-left py-2 pr-4">Player</th>
            <th className="text-left py-2 pr-4">Team</th>
            <th className="text-right py-2 pr-4">xG/90</th>
            <th className="text-right py-2 pr-4">xA/90</th>
            <th className="text-right py-2 pr-4">xGI/90</th>
            <th className="text-right py-2 pr-0">MinRisk</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id} className="border-t border-neutral-800">
              <td className="py-2 pr-4">{p.web_name}</td>
              <td className="py-2 pr-4">{p.team}</td>
              <td className="py-2 pr-4 text-right">{p.xG90?.toFixed(2) ?? '–'}</td>
              <td className="py-2 pr-4 text-right">{p.xA90?.toFixed(2) ?? '–'}</td>
              <td className="py-2 pr-4 text-right font-semibold">{p.xGI90?.toFixed(2) ?? '–'}</td>
              <td className="py-2 pr-0 text-right">{p.minutesRisk?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}