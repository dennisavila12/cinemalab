/** Formato de números para fórmulas (igual que crates/fisica-core/src/formato.rs). */
export function numDec(x: number, dec: number): string {
  if (Number.isNaN(x)) return '—';
  if (!Number.isFinite(x)) return '\\infty';
  if (Math.abs(x) < 1e-9) x = 0;
  const d = Math.abs(x) >= 1000 ? Math.min(dec, 1) : dec;
  let s = x.toFixed(d);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}
export const num = (x: number) => numDec(x, 3);
export function par(x: number) {
  const s = num(x);
  return s.startsWith('-') ? `(${s})` : s;
}
export const txt = (x: number) => num(x).replace('-', '−');
export const txtDec = (x: number, d: number) => numDec(x, d).replace('-', '−');

/** Raíces reales positivas de a·t² + b·t + c = 0, de menor a mayor. */
export function raicesPositivas(a: number, b: number, c: number): number[] {
  const EPS = 1e-12;
  if (Math.abs(a) < EPS) {
    if (Math.abs(b) < EPS) return [];
    const r = -c / b;
    return r >= -EPS ? [Math.max(r, 0)] : [];
  }
  const disc = b * b - 4 * a * c;
  if (disc < -EPS) return [];
  const sq = Math.sqrt(Math.max(disc, 0));
  const r = [(-b - sq) / (2 * a), (-b + sq) / (2 * a)].filter((x) => x > EPS).sort((p, q) => p - q);
  return r.filter((x, i) => i === 0 || Math.abs(x - r[i - 1]) >= 1e-9);
}

export const rad = (g: number) => g * (Math.PI / 180);
export const sind = (a: number) => Math.sin(rad(a));
export const cosd = (a: number) => Math.cos(rad(a));
export const tand = (a: number) => Math.tan(rad(a));
export const grados = (x: number) => x * (180 / Math.PI);
