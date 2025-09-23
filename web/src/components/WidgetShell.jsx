import React from 'react';
import { useLayout } from '../context/LayoutContext';

export default function WidgetShell({ id, title, children }) {
  const { hidden, setHidden } = useLayout();
  const isHidden = hidden.includes(id);
  function toggle(){
    setHidden(h => isHidden ? h.filter(x=>x!==id) : [...h, id]);
  }
  return (
    <section className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={toggle} className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs">
          {isHidden ? 'Show' : 'Hide'}
        </button>
      </div>
      {!isHidden ? children : (
        <div className="text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl p-4">
          Hidden. Click “Show” to display this section.
        </div>
      )}
    </section>
  );
}