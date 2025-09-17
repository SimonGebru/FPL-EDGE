
export function reasonsForPlayer(p) {
    const out = [];
    if (Number.isFinite(p.formScore)) {
      if (p.formScore >= 80) out.push(`Form ${Math.round(p.formScore)} (topp)`);
      else if (p.formScore >= 65) out.push(`Form ${Math.round(p.formScore)} (bra)`);
      else out.push(`Form ${Math.round(p.formScore)}`);
    }
    if (Number.isFinite(p.xGI90)) {
      const v = p.xGI90.toFixed?.(2) ?? p.xGI90;
      if (p.xGI90 >= 0.6) out.push(`xGI/90 ${v} (hög)`);
      else if (p.xGI90 >= 0.35) out.push(`xGI/90 ${v} (över medel)`);
      else out.push(`xGI/90 ${v}`);
    }
    if (Number.isFinite(p.fdrAttackNext3)) {
      if (p.fdrAttackNext3 <= 2.5) out.push(`FDR ${p.fdrAttackNext3} (lätt schema)`);
      else if (p.fdrAttackNext3 <= 3.2) out.push(`FDR ${p.fdrAttackNext3} (ok schema)`);
      else out.push(`FDR ${p.fdrAttackNext3}`);
    }
    if (Number.isFinite(p.minutesRisk)) {
      const pct = Math.round(p.minutesRisk * 100);
      if (pct >= 85) out.push(`Startchans ${pct}% (stark)`);
      else if (pct >= 70) out.push(`Startchans ${pct}%`);
      else out.push(`Startchans ${pct}% (osäkrare)`);
    }
    if (p.selected_by_percent != null) {
      const own = Number(String(p.selected_by_percent).replace(',', '.')) || 0;
      if (own <= 5) out.push(`Ägande ${own}% (differential)`);
      else out.push(`Ägande ${own}%`);
    }
    return out;
  }