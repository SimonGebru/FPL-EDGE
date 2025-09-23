import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableItem({ id, children }) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div className="rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-950">
          <div className="text-xs text-neutral-400">Drag</div>
          <button className="text-xs text-neutral-400" {...attributes} {...listeners}>↕</button>
        </div>
        <div className="p-0">{children}</div>
      </div>
    </div>
  );
}