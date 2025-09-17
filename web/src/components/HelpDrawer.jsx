// web/src/components/HelpDrawer.jsx
import React from 'react';

export default function HelpDrawer({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-neutral-950 border-l border-neutral-800 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Help & guide</h2>
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700">Close</button>
        </div>

        <section className="space-y-3">
          <h3 className="font-medium">Ordliga (kort)</h3>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li><b>Form</b> (0–100): vår poäng från senaste matcher (mål/assist/xGI, minuter, trend).</li>
            <li><b>Startchans</b> (minutesRisk): sannolikhet att få vettig speltid nästa GW (0–100%).</li>
            <li><b>FDR</b> (1–5): snittsvårighet för motstånd i nästa 3 GW (lägre = lättare).</li>
            <li><b>xGI/90</b>: förväntade mål + assist per 90 min.</li>
            <li><b>EV</b>: uppskattat poängvärde (form+xGI+FDR+startchans).</li>
            <li><b>Ägande</b>: hur många % managers som äger spelaren (lågt = differential).</li>
          </ul>
        </section>

        <section className="space-y-3 mt-6">
          <h3 className="font-medium">Snabbtips</h3>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li><b>Kapten:</b> startchans ≥ 80%, FDR ≤ 3.2, hög form & xGI/90.</li>
            <li><b>Differentials:</b> ägande ≤ 15%, form ≥ 60, startchans ≥ 70%.</li>
            <li><b>Jakten på mål:</b> filtrera xGI Leaders på Forwards/Mids, min startchans ≥ 70%.</li>
            <li><b>Undvik fällor:</b> hög ägande + låg form + svåra fixtures.</li>
          </ul>
        </section>

        <section className="space-y-3 mt-6">
          <h3 className="font-medium">Rimliga intervall</h3>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li>Form 40–80 vanligt, 75–95 topp.</li>
            <li>Startchans 70–95% för förväntade startspelare.</li>
            <li>FDR 1.5–3.0 lätt, 3.5–5.0 svår.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}