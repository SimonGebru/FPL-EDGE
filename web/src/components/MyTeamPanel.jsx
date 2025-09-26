// web/src/components/MyTeamPanel.jsx
import React from 'react';
import { useUserTeam } from '../context/UserTeamContext';

function Badge({ children, tone='neutral', title }) {
  const map = {
    neutral: 'bg-neutral-800 border-neutral-700 text-neutral-200',
    green:   'bg-emerald-900/30 border-emerald-800 text-emerald-300',
    blue:    'bg-sky-900/30 border-sky-800 text-sky-300',
    yellow:  'bg-amber-900/30 border-amber-800 text-amber-300',
    red:     'bg-rose-900/30 border-rose-800 text-rose-300',
    gray:    'bg-neutral-900/50 border-neutral-800 text-neutral-400',
  };
  return (
    <span
      className={`px-1.5 py-0.5 rounded border text-[11px] ${map[tone] || map.neutral}`}
      title={title}
    >
      {children}
    </span>
  );
}

// Map availability → label/färg + ev. procent
function statusInfo(av) {
  if (!av) return { tone: 'gray', label: '—' };
  const pct = typeof av.chanceNext === 'number' ? ` ${av.chanceNext}%` : '';
  if (av.flag === 'red')    return { tone: 'red',    label: 'INJ/SUS' };
  if (av.flag === 'yellow') return { tone: 'yellow', label: `Doubtful${pct}`.trim() };
  if (av.flag === 'ok')     return { tone: 'green',  label: 'Fit' };
  return { tone: 'gray', label: '—' };
}

function fmtWhen(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return null; }
}

export default function MyTeamPanel() {
  const {
    entryId, gw, teamName, playerName, itb, picks,
    captainElement, viceElement, lastImportedAt, clear
  } = useUserTeam();

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
            const st  = statusInfo(p.availability);
            const newsTitle = p.availability?.news
              ? `${p.availability.news}${p.availability.news_added ? ` — ${fmtWhen(p.availability.news_added)}` : ''}`
              : undefined;

            return (
              <div key={p.element} className="rounded-lg border border-neutral-800 p-2 bg-neutral-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-neutral-200 truncate">
                      {p.web_name} <span className="text-neutral-400">· {p.team}</span>
                    </div>
                    <div className="text-xs text-neutral-400">{p.position}</div>
                  </div>
                  {/* Status-badge till höger, med tooltip på news */}
                  <Badge tone={st.tone} title={newsTitle}>{st.label}</Badge>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {isC && <Badge tone="green">C</Badge>}
                  {isV && <Badge>VC</Badge>}
                  {/* Visa kort nyhetsrad om finns */}
                  {p.availability?.news && (
                    <span className="text-[11px] text-neutral-400 truncate" title={newsTitle}>
                      {p.availability.news}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 text-xs text-neutral-400">
          Tips: Status-badgen visar <i>INJ/SUS</i>, <i>Doubtful</i> (med % om känd), eller <i>Fit</i> – källa FPL “news”.
        </div>
      </div>
    </div>
  );
}