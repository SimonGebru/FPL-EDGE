// web/src/components/SearchBox.jsx
import React from 'react';
import { api } from '../lib/api';

export default function SearchBox({
  placeholder = 'Search players…',
  minLength = 2,
  debounceMs = 200,
  position = '',     // ex: "Forward" | "Midfielder" | ...
  limit = 8,
  showOnFocus = true, // hämta fallback-lista när input får fokus
  onSelect,          // (player) => void
  className = '',
}) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [active, setActive] = React.useState(-1);

  const rootRef = React.useRef(null);
  const lastReq = React.useRef(0);
  const abortRef = React.useRef(null);

  // Stäng dropdown när man klickar utanför
  React.useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // --- Hjälpare --------------------------------------------------------------
  function normalizeList(res) {
    // Sök: {results|items|players}
    let list = res?.items || res?.results || res?.players || [];
    // Trends-fallback: {up}
    if (!list.length && Array.isArray(res?.up)) list = res.up;
    return list;
  }

  async function fetchFallbackIfNeeded() {
    if (!showOnFocus || q.trim().length > 0) return;
    try {
      setLoading(true); setError(null);
      // Fallback = rising trends (respekt för position)
      const params = { direction: 'up', limit };
      if (position) params.position = position;
      const res = await api.players.trends(params);
      const list = normalizeList(res);
      setItems(list);
      setActive(list.length ? 0 : -1);
      setOpen(true);
    } catch (e) {
      setError(e?.message || 'API error');
      setItems([]); setActive(-1); setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  // Debounced sökning (med abort av tidigare request)
  React.useEffect(() => {
    const trimmed = q.trim();

    // Hintläge: användare har börjat skriva men inte nått minLength än
    if (trimmed.length > 0 && trimmed.length < minLength) {
      setError(null);
      setItems([]); setActive(-1); setOpen(true);
      // Avbryt ev. pågående request
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    const reqId = ++lastReq.current;
    const t = setTimeout(async () => {
      // Tom query → behåll ev. fallback; gör ingen API-call
      if (trimmed.length === 0) return;

      // Avbryt tidigare request
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        setLoading(true); setError(null);

        const params = new URLSearchParams({ limit: String(limit) });
        if (position) params.set('position', position);
        params.set('q', trimmed);

        const res = await api.players.search(params, { signal: ctrl.signal });
        if (reqId !== lastReq.current) return; // utdaterat svar

        const list = normalizeList(res);
        setItems(list);
        setActive(list.length ? 0 : -1);
        setOpen(true);
      } catch (e) {
        if (reqId !== lastReq.current) return;
        // Ignorera abortfel
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'API error');
        setItems([]); setActive(-1); setOpen(true);
      } finally {
        if (reqId === lastReq.current) setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(t);
  }, [q, position, limit, minLength, debounceMs]);

  function handleSelect(p) {
    onSelect?.(p);
    setQ('');
    setItems([]);
    setActive(-1);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => (items.length ? (i + 1) % items.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => (items.length ? (i - 1 + items.length) % items.length : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && items[active]) handleSelect(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showTypeHint = q.trim().length > 0 && q.trim().length < minLength;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (items.length) setOpen(true); else fetchFallbackIfNeeded(); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 outline-none"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-activedescendant={active >= 0 ? `sb-item-${items[active]?.id}` : undefined}
      />

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950">
          {showTypeHint && (
            <div className="px-3 py-2 text-sm text-neutral-400">
              Type at least {minLength} characters…
            </div>
          )}

          {!showTypeHint && loading && (
            <div className="px-3 py-2 text-sm text-neutral-400">Searching…</div>
          )}

          {!showTypeHint && !loading && error && (
            <div className="px-3 py-2 text-sm text-rose-400">API offline: {String(error)}</div>
          )}

          {!showTypeHint && !loading && !error && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-400">No results</div>
          )}

          {!showTypeHint && !loading && !error && items.map((p, i) => {
            const isActive = i === active;
            return (
              <button
                key={p.id}
                id={`sb-item-${p.id}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => handleSelect(p)}
                className={`w-full text-left px-3 py-2 text-sm ${
                  isActive ? 'bg-neutral-800' : 'hover:bg-neutral-900'
                }`}
              >
                <div className="font-medium">
                  {p.web_name} <span className="text-neutral-400">· {p.team}</span>
                </div>
                <div className="text-xs text-neutral-500">
                  {p.position} · id {p.id}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}