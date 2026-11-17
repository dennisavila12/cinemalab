/** Número con hasta `dec` decimales, sin ceros sobrantes y con el signo menos tipográfico. */
export function fmt(x: number | undefined | null, dec = 3): string {
  if (x === undefined || x === null || Number.isNaN(x)) return '—';
  if (!Number.isFinite(x)) return '∞';
  if (Math.abs(x) < 1e-9) x = 0;
  let s = x.toFixed(Math.abs(x) >= 1000 ? Math.min(dec, 1) : dec);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('-', '−');
}

/** Lee un número escrito por el usuario (acepta coma decimal). */
export function leerNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.').replace('−', '-');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
