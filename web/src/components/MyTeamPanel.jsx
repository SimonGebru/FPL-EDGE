import React from 'react';
import { useUserTeam } from '../context/UserTeamContext';

function Badge({ children, tone='neutral' }) {
  const map = {
    neutral: 'bg-neutral-800 border-neutral-700 text-neutral-200',
    green:   'bg-emerald-900/30 border-emerald-800 text-emerald-300',
    blue:    'bg-sky-900/30 border-sky-800 text-sky-300',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[11px] ${map[tone] || map.neutral}`}>
      {children}
    </span>
  );
}

export default function MyTeamPanel() {
  const { entryId, gw, teamName, playerName, itb, picks, captainElement, viceElement, lastImportedAt, clear } = useUserTeam();

  if (!entryId || picks.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 p-3 text-sm text-neutral-400">
        Inget lag importerat ännu. Ange ditt <b>FPL Entry ID</b> ovan och klicka <b>Import my FPL team</b>.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950">
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-medium text-neutral-200">{teamName || 'My FPL Team'}</span>
          <span className="text-neutral-400"> — GW {gw ?? '–'}</span>
          {playerName && <span className="ml-2 text-neutral-400">({playerName})</span>}
          {itb != null && <span className="ml-3"><Badge tone="blue">ITB {Number(itb).toFixed(1)}m</Badge></span>}
          {lastImportedAt && <span className="ml-3 text-xs text-neutral-500">Imported {new Date(lastImportedAt).toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">
            Clear
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {picks.map(p => {
            const isC = p.element === captainElement;
            const isV = p.element === viceElement;
            return (
              <div key={p.element} className="rounded-lg border border-neutral-800 p-2 bg-neutral-900">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-neutral-200">
                    {p.web_name} <span className="text-neutral-400">· {p.team}</span>
                  </div>
                  <div className="text-xs text-neutral-400">{p.position}</div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {isC && <Badge tone="green">C</Badge>}
                  {isV && <Badge>VC</Badge>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 text-xs text-neutral-400">
          Tips: Vi använder det här laget i resten av appen via en global “UserTeam”-context. I nästa steg kopplar vi det till
          Transfer Planner och Ownership Shield (förifyller ditt lag).
        </div>
      </div>
    </div>
  );
}