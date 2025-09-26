// web/src/components/DockTray.jsx
import React from 'react';
import { useLayout } from '../context/LayoutContext';

export default function DockTray({ registry }) {
  const { hidden, restore, restoreAll } = useLayout();

  if (!hidden.length) {
    return (
      <div className="rounded-xl border border-neutral-800 p-3 text-xs text-neutral-500">
        Tray: tom. Skicka widgets hit via “Send to tray”.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-medium text-neutral-200">Tray (undanställda sektioner)</div>
        <button
          onClick={restoreAll}
          className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
          title="Lägg tillbaka alla sektioner"
        >
          Restore all
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {hidden.map(id => {
          const title = registry?.[id]?.title || id;
          return (
            <span key={id} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs">
              {title}
              <button
                onClick={()=>restore(id)}
                className="text-neutral-300 hover:text-white"
                title="Lägg tillbaka i dashboarden"
              >
                Restore
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}