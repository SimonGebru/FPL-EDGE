import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

export default function DraggableGrid({ ids, onReorder, renderItem }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(e){
    const {active, over} = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid gap-6">
          {ids.map(id => <SortableItem key={id} id={id}>{renderItem(id)}</SortableItem>)}
        </div>
      </SortableContext>
    </DndContext>
  );
}