// web/src/context/UserTeamContext.jsx
import React from 'react';

const STORAGE_KEY = 'userTeam';
const UserTeamContext = React.createContext(null);

// Normalisera ett pick från olika källor (id/element, is_vice vs is_vice_captain, etc)
// ⬇️ Uppdaterad: behåll även availability (flag/news)
// Normalisera ett pick från olika källor (id/element, is_vice vs is_vice_captain, etc)
// + robust availability med både news_added/newsAt, samt chanceNext + boolean-flaggor.
function normalizePick(p = {}) {
  const element = Number(p.element ?? p.id ?? 0);

  // availability kan komma i lite olika former – mappa ihop dem
  const availIn = p.availability || null;
  const availability = availIn ? {
    flag: availIn.flag ?? null,                 // 'red' | 'yellow' | 'ok'
    news: availIn.news ?? '',                   // text
    news_added: availIn.news_added ?? availIn.newsAt ?? null, // stöd båda nycklarna
    raw_status: availIn.raw_status ?? availIn.status ?? null, // original 'a'/'d'/'i'/'s'...
    chanceNext: typeof availIn.chanceNext === 'number'
      ? availIn.chanceNext
      : (typeof availIn.chance_of_playing_next_round === 'number'
          ? availIn.chance_of_playing_next_round
          : null),
    // boolean-hjälpare om backend skickat dem
    isInjured: !!availIn.isInjured,
    isSuspended: !!availIn.isSuspended,
    isDoubtful: !!availIn.isDoubtful,
    isUnavailable: !!availIn.isUnavailable,
  } : null;

  return {
    element,
    web_name: p.web_name ?? '',
    team: p.team ?? '',
    position: p.position ?? '',
    is_captain: !!p.is_captain,
    is_vice: !!(p.is_vice || p.is_vice_captain),
    buy_price: p.buy_price ?? null,
    sell_price: p.sell_price ?? null,
    now_cost: p.now_cost ?? null,
    availability,
  };
}

export function UserTeamProvider({ children }) {
  const [state, setState] = React.useState({
    entryId: null,
    gw: null,
    teamName: null,
    playerName: null,
    bank: null,   // tenths (från FPL) – vi exponerar även itb i m
    itb: null,    // i miljoner
    picks: [],    // [{ element, web_name, team, position, is_captain, is_vice, buy_price, sell_price, availability }]
    captainElement: null,
    viceElement: null,
    lastImportedAt: null,
  });

  // --- Hydrate från localStorage (om finns)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setState(s => ({
        ...s,
        entryId: saved.entryId ?? null,
        gw: saved.gw ?? null,
        teamName: saved.teamName ?? null,
        playerName: saved.playerName ?? null,
        bank: saved.bank ?? null,
        itb: saved.itb ?? (saved.bank != null ? saved.bank / 10 : null),
        picks: Array.isArray(saved.picks) ? saved.picks.map(normalizePick) : [],
        captainElement: saved.captainElement ?? null,
        viceElement: saved.viceElement ?? null,
        lastImportedAt: saved.lastImportedAt ?? null,
      }));
    } catch {}
  }, []);

  // --- Spara till localStorage vid ändring
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  function setFromImport(payload) {
    // Fungerar både med /user/team/import-fpl och /user/team
    const entryId = payload.entry?.id ?? payload.entry ?? null;
    const gw = payload.gw ?? payload.currentGW ?? null;

    const teamName =
      payload.team_name ??
      payload.teamName ??
      payload.entry?.name ??
      null;

    const playerName =
      payload.player_name ??
      (payload.entry?.player_first_name && payload.entry?.player_last_name
        ? `${payload.entry.player_first_name} ${payload.entry.player_last_name}`
        : null);

    const picks = Array.isArray(payload.picks)
      ? payload.picks.map(normalizePick)
      : [];

    const captainElement =
      payload.captainElement ??
      payload.picks?.find?.(x => x.is_captain)?.element ??
      null;

    const viceElement =
      payload.viceElement ??
      payload.picks?.find?.(x => x.is_vice_captain || x.is_vice)?.element ??
      null;

    // itb: backend kan skicka itb direkt; annars bank (tenths) → /10
    const itb =
      typeof payload.itb === 'number'
        ? payload.itb
        : (payload.bank != null ? payload.bank / 10 : null);

    setState({
      entryId,
      gw,
      teamName,
      playerName,
      bank: payload.bank ?? null,
      itb,
      picks,
      captainElement,
      viceElement,
      lastImportedAt: new Date().toISOString(),
    });
  }

  function clear() {
    setState({
      entryId: null,
      gw: null,
      teamName: null,
      playerName: null,
      bank: null,
      itb: null,
      picks: [],
      captainElement: null,
      viceElement: null,
      lastImportedAt: null,
    });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  // Små hjälpare som kan vara nice för paneler
  function setITB(valueM) {
    const n = Number(String(valueM).replace(',', '.'));
    setState(s => ({ ...s, itb: Number.isFinite(n) ? n : s.itb }));
  }

  function updatePicks(nextPicks = []) {
    const list = Array.isArray(nextPicks) ? nextPicks.map(normalizePick) : [];
    setState(s => ({ ...s, picks: list }));
  }

  function setCaptain(elementId) {
    const id = Number(elementId);
    setState(s => ({ ...s, captainElement: Number.isFinite(id) ? id : s.captainElement }));
  }

  function setVice(elementId) {
    const id = Number(elementId);
    setState(s => ({ ...s, viceElement: Number.isFinite(id) ? id : s.viceElement }));
  }

  const playerIds = React.useMemo(
    () => state.picks.map(p => Number(p.element)).filter(Boolean),
    [state.picks]
  );

  // === Härleder hasTeam + bygger kompakt team-objekt ===
  const hasTeam = React.useMemo(
    () => !!(state.entryId && Array.isArray(state.picks) && state.picks.length >= 1),
    [state.entryId, state.picks]
  );

  const team = React.useMemo(() => ({
    entryId: state.entryId,
    gw: state.gw,
    teamName: state.teamName,
    playerName: state.playerName,
    bank: state.bank,
    itb: state.itb,
    picks: state.picks,
    captainElement: state.captainElement,
    viceElement: state.viceElement,
    lastImportedAt: state.lastImportedAt,
  }), [state]);

  const value = React.useMemo(() => ({
    ...state,
    // nytt för konsumenter:
    hasTeam,
    team,
    playerIds,
    // actions:
    setFromImport,
    clear,
    setITB,
    updatePicks,
    setCaptain,
    setVice,
  }), [state, hasTeam, team, playerIds]);

  return (
    <UserTeamContext.Provider value={value}>
      {children}
    </UserTeamContext.Provider>
  );
}

export function useUserTeam(){
  const ctx = React.useContext(UserTeamContext);
  if (!ctx) throw new Error('useUserTeam must be used within UserTeamProvider');
  return ctx;
}