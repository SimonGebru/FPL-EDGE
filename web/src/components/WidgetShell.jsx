// web/src/components/WidgetShell.jsx
import React from 'react';
import { useLayout } from '../context/LayoutContext';

export default function WidgetShell({ id, title, children }) {
  const { hide, isHidden, restore } = useLayout();
  const hidden = isHidden(id);

  function onHide() {
    // Lägg widgeten i tray (tas bort från order automatiskt i context)
    hide(id);
  }

  function onRestore() {
    // Plocka tillbaka från tray, lägg sist
    restore(id);
  }

  return (
    <section className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Drag handle → låt din DnD använda t.ex. .drag-handle som selektor */}
          <span className="drag-handle cursor-grab select-none text-neutral-500">⋮⋮</span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>

        <div className="flex items-center gap-2">
          {!hidden ? (
            <button
              onClick={onHide}
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
              title="Flytta denna sektion till tray"
            >
              Send to tray
            </button>
          ) : (
            <button
              onClick={onRestore}
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
              title="Återställ denna sektion från tray"
            >
              Restore here
            </button>
          )}
        </div>
      </div>

      {/* Om widgeten mot förmodan renderas när den är hidden → visa en mild tom-state */}
      {!hidden ? (
        children
      ) : (
        <div className="text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl p-4">
          This widget is in your tray. Click “Restore here” to bring it back.
        </div>
      )}
    </section>
  );
}