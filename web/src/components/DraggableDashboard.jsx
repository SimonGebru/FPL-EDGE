import React from 'react';
import {
  DndContext, closestCenter, DragOverlay,
  PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ---- Panel registry: koppla id → renderer (behåll det du vill ha)
import CaptainSection from '../sections/CaptainSection';
import DifferentialsSection from '../sections/DifferentialsSection';
import HeatmapSection from '../sections/HeatmapSection';
import PriceWatchSection from '../sections/PriceWatchSection';
import XGISection from '../sections/XGISection';
import TrendsSection from '../sections/TrendsSection';
import CongestionSection from '../sections/CongestionSection';
import CompareSection from '../sections/CompareSection';
import TransferStrategyPanel from './TransferStrategyPanel';
import TransferPlannerPanel from './TransferPlannerPanel';
import CaptainMonteCarloPanel from './CaptainMonteCarloPanel';
import OwnershipShield from './OwnershipShield';
import TeamViewPanel from './TeamViewPanel';

const REGISTRY = {
  captain:    () => <CaptainSection />,
  teamview:   () => <TeamViewPanel />,
  diff:       () => <DifferentialsSection />,
  tstrategy:  () => <SectionBox title="Transfer Strategy"><TransferStrategyPanel/></SectionBox>,
  tplanner:   () => <SectionBox title="Transfer Planner (1 move EV)"><TransferPlannerPanel/></SectionBox>,
  capmc:      () => <SectionBox title="Captaincy Monte Carlo"><CaptainMonteCarloPanel/></SectionBox>,
  heatmap:    () => <HeatmapSection />,
  pricewatch: () => <PriceWatchSection />,
  xgi:        () => <XGISection />,
  trends:     () => <TrendsSection />,
  congest:    () => <CongestionSection />,
  shield:     () => <SectionBox title="Ownership Shield (template risk)"><OwnershipShield/></SectionBox>,
  compare:    () => <CompareSection />,
};

// Liten wrapper så paneler ser ut som dina <Section>
function SectionBox({ title, children }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-3">
      {title && <div className="mb-2 text-lg font-semibold">{title}</div>}
      {children}
    </div>
  );
}

const STORAGE_KEY = 'dashboardLayout:v1';
const DEFAULT_MAIN  = ['captain','teamview','diff','tstrategy','tplanner','capmc','heatmap','pricewatch','xgi','trends','congest','shield','compare'];
const DEFAULT_SHELF = [];

// ---- Sortable item (panel)
function SortablePanel({ id, onSendToShelf }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const Render = REGISTRY[id];
  if (!Render) return null;
  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
        <div className="text-sm text-neutral-300 cursor-grab select-none" {...attributes} {...listeners}>
          ⠿ Drag
        </div>
        <button
          onClick={()=>onSendToShelf?.(id)}
          className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs"
          title="Flytta panelen till hyllan"
        >
          Send to shelf
        </button>
      </div>
      <div className="p-3">
        <Render />
      </div>
    </div>
  );
}

export default function DraggableDashboard(){
  // Hydrate
  const [main, setMain]   = React.useState(DEFAULT_MAIN);
  const [shelf, setShelf] = React.useState(DEFAULT_SHELF);

  React.useEffect(()=>{
    try{
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      setMain(Array.isArray(raw.main) ? raw.main : DEFAULT_MAIN);
      setShelf(Array.isArray(raw.shelf) ? raw.shelf : DEFAULT_SHELF);
    }catch{}
  },[]);
  // Persist
  React.useEffect(()=>{
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ main, shelf })); }catch{}
  }, [main, shelf]);

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 }}));
  const [activeId, setActiveId] = React.useState(null);

  function onSendToShelf(id){
    setMain(list => list.filter(x=>x!==id));
    setShelf(list => [...list, id]);
  }
  function onBringBack(id){
    setShelf(list => list.filter(x=>x!==id));
    setMain(list => [...list, id]);
  }

  function onDragStart(e){ setActiveId(e.active.id); }
  function onDragEnd(e){
    const {active, over} = e;
    setActiveId(null);
    if (!over) return;

    // Sortering inom main
    if (main.includes(active.id) && main.includes(over.id)){
      const oldIdx = main.indexOf(active.id);
      const newIdx = main.indexOf(over.id);
      if (oldIdx !== newIdx) setMain(arrayMove(main, oldIdx, newIdx));
      return;
    }
    // Sortering inom shelf
    if (shelf.includes(active.id) && shelf.includes(over.id)){
      const oldIdx = shelf.indexOf(active.id);
      const newIdx = shelf.indexOf(over.id);
      if (oldIdx !== newIdx) setShelf(arrayMove(shelf, oldIdx, newIdx));
      return;
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Main area */}
      <div className="col-span-12 lg:col-span-9 space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <SortableContext items={main} strategy={rectSortingStrategy}>
            <div className="grid md:grid-cols-2 gap-4">
              {main.map(id => (
                <SortablePanel key={id} id={id} onSendToShelf={onSendToShelf}/>
              ))}
            </div>
          </SortableContext>
          <DragOverlay />
        </DndContext>
      </div>

      {/* Shelf / hylla */}
      <div className="col-span-12 lg:col-span-3">
        <div className="sticky top-4 rounded-xl border border-neutral-800 p-3 bg-neutral-950">
          <div className="mb-2 text-sm font-medium text-neutral-200">Shelf</div>
          {shelf.length === 0 && <div className="text-xs text-neutral-500">Dra paneler hit för att parkera dem.</div>}
          <div className="space-y-2">
            {shelf.map(id => (
              <div key={id} className="flex items-center justify-between px-2 py-1 rounded border border-neutral-800 bg-neutral-900 text-xs">
                <span>{id}</span>
                <button
                  onClick={()=>onBringBack(id)}
                  className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700"
                >
                  Show
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}