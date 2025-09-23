import React from 'react';

const STORAGE_KEY = 'fpl-edge.layout.v1';
const LayoutContext = React.createContext(null);

const DEFAULT_ORDER = [
  'myTeam','captain','teamView','differentials','transferStrategy',
  'transferPlanner','captainMC','heatmap','priceWatch','xgi','trends',
  'congestion','ownership','compare'
];
const DEFAULT_HIDDEN = [];

export function LayoutProvider({ children }) {
  const [order, setOrder]   = React.useState(DEFAULT_ORDER);
  const [hidden, setHidden] = React.useState(DEFAULT_HIDDEN);

  // hydrate
  React.useEffect(()=>{
    try{
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (Array.isArray(raw.order)) setOrder(raw.order);
      if (Array.isArray(raw.hidden)) setHidden(raw.hidden);
    }catch{}
  },[]);
  // persist
  React.useEffect(()=>{
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden }));
    }catch{}
  }, [order, hidden]);

  const value = React.useMemo(()=>({
    order, setOrder, hidden, setHidden
  }), [order, hidden]);

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}
export function useLayout(){ const ctx = React.useContext(LayoutContext); if(!ctx) throw new Error('useLayout must be used within LayoutProvider'); return ctx; }