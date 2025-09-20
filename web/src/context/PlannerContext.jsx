// web/src/context/PlannerContext.jsx
import React from 'react';

const PlannerContext = React.createContext(null);

export function PlannerProvider({ children }) {
  const [inPick, setInPick] = React.useState(null);
  const [outPick, setOutPick] = React.useState(null);

  const value = {
    inPick,
    outPick,
    setInPick,   // kalla med en player → fyller “In” i plannern
    setOutPick,  // kalla med en player → fyller “Out” i plannern
    clear() {
      setInPick(null);
      setOutPick(null);
    }
  };

  return (
    <PlannerContext.Provider value={value}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const ctx = React.useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within <PlannerProvider>');
  return ctx;
}