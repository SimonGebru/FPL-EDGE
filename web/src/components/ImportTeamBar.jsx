// web/src/components/ImportTeamBar.jsx
import React from 'react';
import { api } from '../lib/api';
import { useUserTeam } from '../context/UserTeamContext';

const LS_KEY = 'fpl-entry-id';

export default function ImportTeamBar({ onImported }) {
  const { setFromImport, entryId: ctxEntryId } = useUserTeam();

  const [entry, setEntry] = React.useState(() => {
    // Förifyll med det som finns i context eller localStorage
    return String(ctxEntryId || localStorage.getItem(LS_KEY) || '').trim();
  });
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [last, setLast] = React.useState(null);

  React.useEffect(() => {
    // Håll inputen i synk om man importerar via någon annan väg
    if (ctxEntryId && String(ctxEntryId) !== entry) {
      setEntry(String(ctxEntryId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxEntryId]);

  async function doImport(targetEntry) {
    const trimmed = String((targetEntry ?? entry) || '').trim();
    if (!trimmed) return;
    setLoading(true); setErr(null);
    try {
      // Anropar backend: /user/team/import-fpl?entryId=...
      const data = await api.user.importFpl(trimmed);

      // Uppdatera globalt state (context) – resten av appen får tillgång direkt
      setFromImport(data);

      // Spara “senast använda” lokalt
      localStorage.setItem(LS_KEY, trimmed);

      // UI-info
      setLast({
        entry: data.entry?.id ?? data.entry ?? trimmed,
        gw: data.gw ?? data.currentGW ?? '–',
        team_name: data.team_name ?? data.entry?.name ?? 'team'
      });

      // Eventuellt lokalt callback
      onImported?.(data);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && entry && !loading) {
      e.preventDefault();
      doImport();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="inline-flex items-center">
        FPL Entry ID
        <input
          type="text"
          inputMode="numeric"
          placeholder="1234567"
          value={entry}
          onChange={e => { setErr(null); setEntry(e.target.value); }}
          onKeyDown={onKeyDown}
          className="ml-2 w-32 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
        />
      </label>

      <button
        onClick={() => doImport()}
        disabled={!entry || loading}
        className={`px-3 py-1.5 rounded ${(!entry || loading) ? 'bg-neutral-800 text-neutral-500' : 'bg-emerald-600 text-white'}`}
      >
        {loading ? 'Importing…' : 'Import my FPL team'}
      </button>

      <button
        onClick={() => doImport(entry)}
        disabled={!entry || loading}
        className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
        title="Hämta om samma entry"
      >
        Refresh
      </button>

      {err && (
        <span className="text-rose-400 text-xs">
          Error: {String(err.message || err)}
        </span>
      )}

      {last && (
        <span className="text-neutral-400 text-xs">
          Imported GW {last.gw} · {last.team_name}
        </span>
      )}
    </div>
  );
}