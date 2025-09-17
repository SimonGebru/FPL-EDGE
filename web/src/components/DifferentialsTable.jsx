// web/src/components/DifferentialsTable.jsx
import React from 'react';
import { reasonsForPlayer } from '../lib/reasons';

function parseOwn(x) {
  return Number(String(x ?? '').replace(',', '.')) || 0;
}

export default function DifferentialsTable({ players = [] }) {
  const [openId, setOpenId] = React.useState(null);

  if (!players.length) {
    return <div className="text-sm text-neutral-400">Inga spelare matchar dina filter.</div>;
  }

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
            <th className="text-right font-medium py-2 pr-4">Startchans</th>
            <th className="text-right font-medium py-2 pr-0"></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const isOpen = openId === p.id;
            const own = parseOwn(p.selected_by_percent);
            const startPct = Math.round((p.minutesRisk ?? 0) * 100);
            const why = reasonsForPlayer(p);

            return (
              <React.Fragment key={p.id}>
                <tr className="border-t border-neutral-800">
                  <td className="py-2 pr-4">{p.web_name}</td>
                  <td className="py-2 pr-4">{p.team}</td>
                  <td className="py-2 pr-4">{p.position}</td>
                  <td className="py-2 pr-4 text-right">{own.toFixed(1)}</td>
                  <td className="py-2 pr-4 text-right">{Math.round(p.formScore ?? 0)}</td>
                  <td className="py-2 pr-4 text-right">{p.fdrAttackNext3 ?? '–'}</td>
                  <td className="py-2 pr-4 text-right">{startPct}%</td>
                  <td className="py-2 pr-0 text-right">
                    <button
                      onClick={() => setOpenId(isOpen ? null : p.id)}
                      className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
                    >
                      {isOpen ? 'Hide' : 'Why?'}
                    </button>
                  </td>
                </tr>

                {isOpen && (
                  <tr className="border-t border-neutral-900 bg-neutral-950/50">
                    <td colSpan={8} className="py-2 pr-4">
                      <ul className="flex flex-wrap gap-2">
                        {why.map((r, i) => (
                          <li
                            key={i}
                            className="px-2 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs"
                          >
                            {r}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}