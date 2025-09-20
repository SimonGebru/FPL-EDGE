// web/src/components/TransferPlannerPanel.jsx
import React from 'react';
import { api } from '../lib/api';
import SearchBox from './SearchBox';

/** Liten rad med label + värde */
function TinyRow({ label, children }) {
  return (
    <div className="flex items-center justify-between text-xs text-neutral-300">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

/** Prisformat – tar hänsyn till null/sträng/komma */
function fmtPrice(p) {
  if (p == null) return '–';
  const n = Number(String(p).replace(',', '.'));
  if (Number.isNaN(n)) return '–';
  return `${(n / 10).toFixed(1)}m`; // now_cost i 0.1m
}

function PlayerCard({ title, player, onClear }) {
  return (
    <div className="p-3 rounded-xl border border-neutral-800">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-neutral-400">{title}</div>
        {player && (
          <button onClick={onClear} className="text-xs text-neutral-400 hover:text-neutral-200">Clear</button>
        )}
      </div>
      {player ? (
        <>
          <div className="font-medium">
            {player.web_name} <span className="text-neutral-400">· {player.team}</span>
          </div>
          <div className="text-xs text-neutral-400 mb-2">{player.position}</div>
          <div className="space-y-1">
            <TinyRow label="Price">{fmtPrice(player.now_cost)}</TinyRow>
            <TinyRow label="Form">{Math.round(player.formScore ?? 0)}</TinyRow>
            <TinyRow label="xGI/90">{player.xGI90?.toFixed?.(2) ?? '–'}</TinyRow>
            <TinyRow label="FDR (next 3)">{player.fdrAttackNext3 ?? '–'}</TinyRow>
            <TinyRow label="Startchans">{Math.round((player.minutesRisk ?? 0) * 100)}%</TinyRow>
          </div>
        </>
      ) : (
        <div className="text-sm text-neutral-500">Ingen vald ännu.</div>
      )}
    </div>
  );
}

export default function TransferPlannerPanel() {
  const [outP, setOutP] = React.useState(null);
  const [inP, setInP] = React.useState(null);

  // Dynamisk horizon – räknas från NÄSTA GW
  const [horizon, setHorizon] = React.useState(3);
  const [maxGW, setMaxGW] = React.useState(6);      // uppdateras när vi läst currentGW
  const [metaGW, setMetaGW] = React.useState(null); // current GW från /meta/sources

  const [res, setRes] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);

  // Hämta currentGW från /meta/sources → kvarvarande GWs EFTER current GW
  React.useEffect(() => {
    (async () => {
      try {
        const meta = await api.meta.sources();
        const currentGW = Number(meta?.summary?.currentGW || 1);
        setMetaGW(currentGW);
        const gwsLeft = Math.max(1, 38 - currentGW); // ex: GW5 → kvar: 33 (6..38)
        setMaxGW(gwsLeft);
        setHorizon(h => Math.min(h, gwsLeft));       // klipp ev. tidigare default
      } catch (e) {
        console.warn('Kunde inte läsa currentGW från /meta/sources', e);
      }
    })();
  }, []);

  async function calc() {
    setRes(null);
    if (!outP?.id || !inP?.id) {
      setErr(new Error('Välj både “Out” och “In” först.'));
      return;
    }
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams({
        out: String(outP.id),
        in: String(inP.id),
        horizon: String(horizon),
      });
      const r = await api.suggestions.transfer(params.toString());
      setRes(r);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  const canCalc = Boolean(outP?.id && inP?.id);

  /** Pris-fallbacks: hämta från valt sökobjekt, annars från backend-responsen */
  const priceOut =
    (outP?.now_cost ??
      res?.out?.now_cost ??
      res?.outPlayer?.now_cost ??
      null);

  const priceIn =
    (inP?.now_cost ??
      res?.in?.now_cost ??
      res?.inPlayer?.now_cost ??
      null);

  const deltaRaw =
    priceIn != null && priceOut != null ? Number(priceIn) - Number(priceOut) : null;

  const deltaLabel =
    deltaRaw == null
      ? '–'
      : `${(deltaRaw / 10).toFixed(1)}m ${deltaRaw >= 0 ? 'needed' : 'freed'}`;

  // “Till och med GW X” – horizon räknat från NÄSTA GW (metaGW + horizon)
  const untilGW = metaGW ? Math.min(38, metaGW + horizon) : null;

  return (
    <div className="space-y-4">
      <div className="text-sm text-neutral-300">
        Simulera ett 1-playersbyte och se EV-skillnad för <b>{horizon}</b> kommande omgångar
        <span className="text-neutral-400"> (räknat från nästa GW)</span>. Vi visar också pris och mellanskillnad.
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <div className="text-sm text-neutral-400 mb-1">Out</div>
          <SearchBox placeholder="Search player to sell…" onSelect={setOutP} />
          <div className="mt-2">
            <PlayerCard title="Säljs" player={outP} onClear={() => setOutP(null)} />
          </div>
        </div>

        <div>
          <div className="text-sm text-neutral-400 mb-1">In</div>
          <SearchBox placeholder="Search player to buy…" onSelect={setInP} />
          <div className="mt-2">
            <PlayerCard title="Köps" player={inP} onClear={() => setInP(null)} />
          </div>
        </div>
      </div>

      {/* Prisrad */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-neutral-800">
          <TinyRow label="Out price">{fmtPrice(priceOut)}</TinyRow>
        </div>
        <div className="p-3 rounded-xl border border-neutral-800">
          <TinyRow label="In price">{fmtPrice(priceIn)}</TinyRow>
        </div>
        <div className="p-3 rounded-xl border border-neutral-800">
          <TinyRow label="Delta">
            <span className={deltaRaw == null ? '' : deltaRaw >= 0 ? 'text-amber-300' : 'text-emerald-400'}>
              {deltaLabel}
            </span>
          </TinyRow>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span>Horizon (antal GWs framåt)</span>
          <input
            type="number"
            min="1"
            max={maxGW}
            value={horizon}
            onChange={(e) => {
              const v = Number(e.target.value);
              setHorizon(Math.max(1, Math.min(maxGW, v)));
            }}
            className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
          />
        </label>

        {untilGW && (
          <span className="px-2 py-0.5 rounded-full border border-neutral-800 bg-neutral-900 text-neutral-300 text-xs">
            Till och med GW {untilGW}
          </span>
        )}

        <button
          onClick={calc}
          disabled={!canCalc}
          className={`px-3 py-1.5 rounded ${canCalc ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}
        >
          Calculate
        </button>
      </div>

      {loading && <div className="text-neutral-400">Calculating…</div>}
      {err && <div className="text-rose-400 text-sm">Error: {String(err.message || err)}</div>}

      {res && (
        <div className="p-3 rounded-xl border border-neutral-800">
          <div className="text-sm text-neutral-400 mb-1">
            Result (GW horizon {res.horizon ?? horizon})
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                Out: {(res.out?.web_name || res.outPlayer?.web_name) ?? outP?.web_name}
                <span className="text-neutral-400">
                  {' '}· {(res.out?.team || res.outPlayer?.team) ?? outP?.team}
                </span>
              </div>
              <div className="text-xs text-neutral-400">
                EV ~ {(res.evOut ?? res.outEV ?? 0).toFixed?.(2)}
              </div>
            </div>

            <div
              className={`text-xl font-semibold ${
                ((res.diff ?? res.deltaEV ?? 0) >= 0) ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {((res.diff ?? res.deltaEV ?? 0) >= 0 ? '+' : '')}
              {(res.diff ?? res.deltaEV ?? 0).toFixed?.(2)} EV
            </div>

            <div className="text-right">
              <div className="font-medium">
                In: {(res.in?.web_name || res.inPlayer?.web_name) ?? inP?.web_name}
                <span className="text-neutral-400">
                  {' '}· {(res.in?.team || res.inPlayer?.team) ?? inP?.team}
                </span>
              </div>
              <div className="text-xs text-neutral-400">
                EV ~ {(res.evIn ?? res.inEV ?? 0).toFixed?.(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}