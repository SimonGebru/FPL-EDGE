// web/src/components/HelpDrawer.jsx
import React from 'react';

function Pill({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full border border-neutral-800 bg-neutral-900 text-xs">
      {children}
    </span>
  );
}

export default function HelpDrawer({ open, onClose }) {
  // Stäng på ESC och lås bakgrundsscroll när panelen är öppen
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-neutral-950 border-l border-neutral-800 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Hjälp & guide</h2>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700"
          >
            Stäng
          </button>
        </div>

        {/* Snabböversikt */}
        <section className="space-y-3">
          <h3 className="font-medium">Vad betyder allt?</h3>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li>
              <b>Form</b> (0–100): vår sammanvägda poäng från senaste matcherna
              (mål/assist/xGI, minuter, trend).
            </li>
            <li>
              <b>Startchans</b> (<code>minutesRisk</code>): sannolikhet att få
              vettig speltid nästa GW (0–100%).
            </li>
            <li>
              <b>FDR</b> (1–5): svårighet på motstånd (lägre = lättare).
              I listor anges ofta snitt för kommande 3 GW.
            </li>
            <li>
              <b>xGI/90</b>: förväntade mål + assist per 90 min (expected goal
              involvement).
            </li>
            <li>
              <b>EV</b>: uppskattat poängvärde över din horisont (form + xGI +
              FDR + startchans). Används för att ranka absolut output.
            </li>
            <li>
              <b>VORP</b> (<i>Value Over Replacement</i>): EV minus en “billig
              spelbar ersättare” i samma position. Mäter värdet relativt vad du
              hade kunnat få för nästan gratis. Bra för budgetoptimering.
              <div className="mt-1 text-xs text-neutral-400">
                Ex: Om en mittfältare ger EV 7.2 och replacement för MIDs är
                4.8 ⇒ <b>VORP 2.4</b>. VORP lyfter kandidater som ger störst
                skillnad mot minimilösningen i positionen.
              </div>
            </li>
            <li>
              <b>Ägande</b>: % managers som äger spelaren (lågt = differential).
            </li>
            <li>
              <b>Momentum (/1k)</b>: netto-transfers per 1 000 managers (proxy
              för prisrörelser och hype).
            </li>
          </ul>
        </section>

        {/* Hur man använder modulerna */}
        <section className="space-y-3 mt-6">
          <h3 className="font-medium">Hur använder jag modulerna?</h3>

          <div className="text-sm text-neutral-300 space-y-3">
            <div>
              <div className="font-medium mb-1">Price Watch</div>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  <Pill>Min momentum</Pill> höjer gränsen för att synas bland
                  “Likely Risers”. Sätt högre för mer selektiv lista.
                </li>
                <li>
                  <Pill>Min ägande</Pill> filtrerar bort nischade namn som inte
                  brukar trigga prisrörelser.
                </li>
                <li>
                  Tips: Växla <b>Show debug</b> för att se hur många som
                  flaggas och exempel på trösklar.
                </li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-1">Transfer Strategy</div>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  Börja med <Pill>Budget max</Pill> och ev.{" "}
                  <Pill>Position</Pill>. Välj <Pill>Horizon</Pill> (t.ex. 3 GW).
                </li>
                <li>
                  <Pill>Min startchans</Pill> sätter ribban för hur säkra
                  minuter du kräver.
                </li>
                <li>
                  <Pill>Max FDR</Pill> (t.ex. 3.3) begränsar kandidater med
                  tuffa fixtures.
                </li>
                <li>
                  <Pill>Ownership a–b%</Pill> kan jaga differentials (0–20) eller
                  säkrare picks (40–100).
                </li>
                <li>
                  <Pill>Sort</Pill>:
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>
                      <b>VORP</b> – värde mot ersättare. Bra när budget är tight
                      och du vill maximera lagets totala lyft.
                    </li>
                    <li>
                      <b>EV</b> – absolut output. Bra om du bara vill ha högsta
                      råa poäng.
                    </li>
                  </ul>
                </li>
                <li>
                  I korten ser du både <b>EV</b> och <b>VORP</b> (om tillgängligt)
                  så du kan jämföra.
                </li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-1">xGI Leaders</div>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  Filtrera på <Pill>Position</Pill> och höj{" "}
                  <Pill>Min startchans</Pill> för säkrare minuter.
                </li>
                <li>
                  Sorteringen visar xG/90, xA/90, xGI/90 – använd som scouting
                  för form & chansskapande.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Riktlinjer / rimliga intervall */}
        <section className="space-y-3 mt-6">
          <h3 className="font-medium">Rimliga intervall & tumregler</h3>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li>
              <b>Form:</b> 40–80 vanligt, 75–95 topp.
            </li>
            <li>
              <b>Startchans:</b> 70–95% för förväntade startspelare.
            </li>
            <li>
              <b>FDR (3 GW snitt):</b> 1.5–3.0 lätt, 3.5–5.0 svår.
            </li>
            <li>
              <b>Momentum (/1k):</b> +0.5 till +3 är normalt för risers; under
              –0.5 ofta fallrisk.
            </li>
            <li>
              <b>Horisont:</b> 2–4 GW ger snabb “payback”; 5–8 GW bättre för
              medium-range plan.
            </li>
          </ul>
        </section>

        {/* Snabbtips */}
        <section className="space-y-3 mt-6">
          <h3 className="font-medium">Snabbtips</h3>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li>
              <b>Kapten:</b> startchans ≥ 80%, FDR ≤ 3.2, hög form & xGI/90.
            </li>
            <li>
              <b>Differentials:</b> ägande ≤ 15%, form ≥ 60, startchans ≥ 70%.
            </li>
            <li>
              <b>Byten nära deadline:</b> kolla <i>Price Watch</i> för att
              undvika att förlora 0.1 eller missa en uppgång.
            </li>
            <li>
              <b>VORP vs EV:</b> Börja i <i>VORP</i> för att hitta bäst “bang for
              buck”. Växla till <i>EV</i> för att bekräfta rå potential.
            </li>
          </ul>
        </section>

        {/* FAQ / felsök */}
        <section className="space-y-3 mt-6">
          <h3 className="font-medium">FAQ & felsökning</h3>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li>
              <b>“Inga kandidater hittades” i Transfer Strategy?</b> Höj
              budgeten, sänk min-startchans, öka Max FDR eller ta bort
              exkluderade lag.
            </li>
            <li>
              <b>VORP & EV visar olika toppnamn – är det fel?</b> Nej, VORP
              mäter värde relativt ersättare (per position). EV mäter absolut
              output. De ska ofta skilja sig.
            </li>
            <li>
              <b>Price Watch reagerar inte på “Min momentum”?</b> Värdet är
              <i>per 1 000 managers</i>. Stora förändringar syns först när du
              går från t.ex. 5 → 20 eller lägger en lägre <i>Min ägande</i>.
            </li>
          </ul>
        </section>

        <div className="h-6" />
      </div>
    </div>
  );
}