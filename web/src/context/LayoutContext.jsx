// web/src/context/LayoutContext.jsx
import React from 'react';

const STORAGE_KEY = 'fpl-edge.layout.v1'; // behåller samma nyckel som du redan använder

// Samma ordning som du har idag
export const DEFAULT_ORDER = [
  'myTeam','captain','teamView','differentials','transferStrategy',
  'transferPlanner','captainMC','heatmap','priceWatch','xgi','trends',
  'congestion','ownership','compare'
];

const LayoutContext = React.createContext(null);

export function LayoutProvider({ children }) {
  const [order, setOrder]   = React.useState(DEFAULT_ORDER);
  const [hidden, setHidden] = React.useState([]); // widgets “i tray”

  // --- Hydrate från localStorage (med sanering mot okända IDs) ---
  React.useEffect(()=>{
    try{
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const savedOrder  = Array.isArray(raw.order)  ? raw.order  : DEFAULT_ORDER;
      const savedHidden = Array.isArray(raw.hidden) ? raw.hidden : [];
      const isKnown = (id) => DEFAULT_ORDER.includes(id);

      // Filtrera bort okända ids och dubbletter
      const cleanOrder  = savedOrder.filter(isKnown);
      const cleanHidden = savedHidden.filter(isKnown).filter(id => !cleanOrder.includes(id));

      setOrder(cleanOrder.length ? cleanOrder : DEFAULT_ORDER);
      setHidden(cleanHidden);
    }catch{
      setOrder(DEFAULT_ORDER);
      setHidden([]);
    }
  },[]);

  // --- Persistera ---
  React.useEffect(()=>{
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden }));
    }catch{}
  }, [order, hidden]);

  // --- API: flytta widget till tray ---
  function hide(id){
    if (!DEFAULT_ORDER.includes(id)) return;
    setOrder(prev => prev.filter(x => x !== id));
    setHidden(prev => prev.includes(id) ? prev : [...prev, id]);
  }

  // --- API: återställ widget från tray (lägg sist om ingen index anges) ---
  function restore(id, toIndex = null){
    if (!DEFAULT_ORDER.includes(id)) return;
    setHidden(prev => prev.filter(x => x !== id));
    setOrder(prev => {
      if (prev.includes(id)) return prev;
      if (toIndex == null || toIndex < 0 || toIndex > prev.length) {
        return [...prev, id];
      }
      const next = [...prev];
      next.splice(toIndex, 0, id);
      return next;
    });
  }

  // --- API: återställ alla från tray ---
  function restoreAll(){
    setOrder(prev => {
      const setInOrder = new Set(prev);
      const toAdd = hidden.filter(id => !setInOrder.has(id));
      return [...prev, ...toAdd];
    });
    setHidden([]);
  }

  // --- Hjälpare ---
  function isHidden(id){ return hidden.includes(id) }

  const value = React.useMemo(()=>({
    order, setOrder,
    hidden,
    hide, restore, restoreAll, isHidden,
  }), [order, hidden]);

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(){
  const ctx = React.useContext(LayoutContext);
  if(!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}