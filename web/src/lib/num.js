
export const normNum = (v) => Number(String(v ?? '').replace(',', '.'));
export const toPct   = (v) => Math.round((Number(v) || 0) * 100);