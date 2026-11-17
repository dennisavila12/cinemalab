import type { Estado } from '@cinemalab/contratos';

/**
 * Estado del móvil en el instante t, interpolando linealmente entre las muestras que
 * calculó el motor en Rust. La interfaz no evalúa ecuaciones físicas: solo interpola.
 */
export function estadoEn(muestras: Estado[], t: number): Estado {
  const n = muestras.length - 1;
  const tMax = muestras[n].t;
  if (t <= 0 || n === 0) return muestras[0];
  if (t >= tMax) return muestras[n];
  const f = (t / tMax) * n;
  const i = Math.min(Math.floor(f), n - 1);
  const a = muestras[i];
  const b = muestras[i + 1];
  const k = f - i;
  const mix = (p: number, q: number) => p + (q - p) * k;
  return { t, x: mix(a.x, b.x), y: mix(a.y, b.y), vx: mix(a.vx, b.vx), vy: mix(a.vy, b.vy), ax: a.ax, ay: a.ay };
}

/** Punto (x, y) de una trayectoria [t, x, y][] en el instante t. */
export function puntoEn(tray: [number, number, number][], t: number): [number, number] {
  if (t <= tray[0][0]) return [tray[0][1], tray[0][2]];
  const ult = tray[tray.length - 1];
  if (t >= ult[0]) return [ult[1], ult[2]];
  let lo = 0;
  let hi = tray.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (tray[m][0] <= t) lo = m;
    else hi = m;
  }
  const [t0, x0, y0] = tray[lo];
  const [t1, x1, y1] = tray[hi];
  const k = (t - t0) / (t1 - t0 || 1);
  return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
}
