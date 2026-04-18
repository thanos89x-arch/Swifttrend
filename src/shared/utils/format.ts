export const fmtNum = (n: number | null | undefined, dec = 2): string => {
  if (n === null || n === undefined) return '—';
  return typeof n === 'number' ? n.toFixed(dec) : String(n);
};

export const fmtDate = (ts: number | undefined): string => {
  try {
    return new Date(ts ?? 0).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  } catch {
    return '—';
  }
};

export const fmtTime = (ts: number | undefined): string => {
  try {
    return new Date(ts ?? 0).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
};
