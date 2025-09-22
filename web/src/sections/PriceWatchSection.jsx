import React from 'react';
import Section from '../components/Section';
import Info from '../components/Info';
import Pricewatch from '../components/Pricewatch';
import { api } from '../lib/api';

export default function PriceWatchSection() {
  // UI state
  const [limit, setLimit] = React.useState(10);
  const [minMomentum, setMinMomentum] = React.useState(1);  // vettig default (per 1k)
  const [minOwn, setMinOwn] = React.useState(0);            // % ägande
  const [showDebug, setShowDebug] = React.useState(false);

  // Data state
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        minMomentum: String(minMomentum),
        minOwn: String(minOwn),
      });
      if (showDebug) params.set('debug', '1');
      const res = await api.players.pricewatch(params);
      setData(res);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); /* initial */ }, []); // eslint-disable-line

  const risers =
    data?.risers
    ?? data?.items?.risers
    ?? data?.results?.risers
    ?? data?.data?.risers
    ?? [];

  const fallers =
    data?.fallers
    ?? data?.items?.fallers
    ?? data?.results?.fallers
    ?? data?.data?.fallers
    ?? [];

  return (
    <Section title="Price Watch">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="inline-flex items-center gap-2">
          Limit <Info text="Hur många kandidater att visa totalt (delas lika upp/ner)." />
        </label>
        <input
          type="number" min="4" max="50" value={limit}
          onChange={e => setLimit(Math.max(4, Math.min(50, Number(e.target.value))))}
          className="ml-1 w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
        />

        <label className="inline-flex items-center gap-2 ml-3">
          Min momentum (/1k) <Info text="Minsta nettotransfers per 1 000 managers för att kvala in. 1–3 är rimligt." />
        </label>
        <input
          type="number" min="0" step="0.1" value={minMomentum}
          onChange={e => setMinMomentum(Number(e.target.value))}
          className="ml-1 w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
        />

        <label className="inline-flex items-center gap-2 ml-3">
          Min ägande (%) <Info text="Filtrera bort lågägda spelare. 0 = visa alla." />
        </label>
        <input
          type="number" min="0" max="100" step="1" value={minOwn}
          onChange={e => setMinOwn(Math.max(0, Math.min(100, Number(e.target.value))))}
          className="ml-1 w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
        />

        <button onClick={load} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Apply</button>
        <button
          onClick={() => { setLimit(10); setMinMomentum(1); setMinOwn(0); setTimeout(load, 0); }}
          className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700"
        >
          Reset
        </button>

        <button
          onClick={() => { setShowDebug(v => !v); setTimeout(load, 0); }}
          className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700"
        >
          {showDebug ? 'Hide debug' : 'Show debug'}
        </button>
      </div>

      {loading && <div className="text-neutral-400">Loading…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {/* Debugpanel */}
      {showDebug && data?.debug && (
        <div className="mb-3 p-3 rounded-xl border border-neutral-800 bg-neutral-900 text-xs text-neutral-300 space-y-1">
          <div className="font-semibold text-neutral-200">Debug</div>
          <div>
            counts: total={data.debug.counts?.total ?? '–'}, afterOwn={data.debug.counts?.afterOwn ?? '–'},
            {' '}risers={data.debug.counts?.risers ?? '–'}, fallers={data.debug.counts?.fallers ?? '–'}
          </div>
          <div>
            thresholds:&nbsp;
            momentum ≥ <b>{minMomentum}</b>/1k,&nbsp;
            ownership ≥ <b>{minOwn}%</b>
          </div>
          <div>samples up: {data.debug.samples?.up?.map(s => s.name).join(', ') || '–'}</div>
          <div>samples down: {data.debug.samples?.down?.map(s => s.name).join(', ') || '–'}</div>
        </div>
      )}

      {/* Tomtext */}
      {!loading && !err && risers.length === 0 && fallers.length === 0 && (
        <div className="text-sm text-neutral-400">
          Inga prisförändringskandidater matchar dina filter. Sänk “Min momentum (/1k)” eller “Min ägande (%)”, eller höj limit.
        </div>
      )}

      <Pricewatch risers={risers} fallers={fallers} />
    </Section>
  );
}