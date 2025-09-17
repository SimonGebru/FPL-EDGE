import React from 'react';

export default function CongestionTable({ teams }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-neutral-400">
          <tr>
            <th className="text-left py-2 pr-4">Team</th>
            <th className="text-right py-2 pr-4">Matches</th>
            <th className="text-right py-2 pr-4">Back-to-backs</th>
            <th className="text-right py-2 pr-4">Avg rest (d)</th>
            <th className="text-right py-2 pr-0">Score</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(t => (
            <tr key={t.teamId} className="border-top border-neutral-800">
              <td className="py-2 pr-4">{t.team}</td>
              <td className="py-2 pr-4 text-right">{t.matches}</td>
              <td className="py-2 pr-4 text-right">{t.backToBacks}</td>
              <td className="py-2 pr-4 text-right">{t.avgRestDays ?? '–'}</td>
              <td className="py-2 pr-0 text-right font-semibold">{t.congestionScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}