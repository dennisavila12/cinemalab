/** Copia en TypeScript de crates/fisica-core/src/movimiento.rs (solo para la demostración). */
import type { Estado, Movimiento, Simulacion } from '@cinemalab/contratos';
import type { Valores } from './tipos';

export function estado(m: Movimiento, t: number): Estado {
  return {
    t,
    x: m.x0 + m.vx0 * t + 0.5 * m.ax * t * t,
    y: m.y0 + m.vy0 * t + 0.5 * m.ay * t * t,
    vx: m.vx0 + m.ax * t,
    vy: m.vy0 + m.ay * t,
    ax: m.ax,
    ay: m.ay,
  };
}

export function eventos(m: Movimiento) {
  const ev: { t: number; nombre: string }[] = [];
  if (m.ay < 0 && m.vy0 > 0) {
    const t = -m.vy0 / m.ay;
    if (t < m.t_max) ev.push({ t, nombre: 'Punto más alto (vᵧ = 0)' });
  }
  if (m.ax !== 0 && m.vx0 !== 0 && Math.sign(m.vx0) !== Math.sign(m.ax)) {
    const t = -m.vx0 / m.ax;
    if (t > 0 && t <= m.t_max + 1e-9) ev.push({ t, nombre: 'El móvil se detiene (v = 0)' });
  }
  return ev;
}

export function simular(m: Movimiento, n: number): Simulacion {
  const r = (x: number) => Math.round(x * 1e6) / 1e6 + 0;
  const muestras: Estado[] = [];
  for (let i = 0; i <= n; i++) {
    const e = estado(m, (m.t_max * i) / n);
    muestras.push({ t: r(e.t), x: r(e.x), y: r(e.y), vx: r(e.vx), vy: r(e.vy), ax: r(e.ax), ay: r(e.ay) });
  }
  return { movimiento: { ...m }, muestras, eventos: eventos(m) };
}

export function desdeModelo(modelo: string, v: Valores): Movimiento {
  const req = (ids: string[]) => ids.every((id) => id in v);
  if (modelo === 'mru') {
    if (!req(['v', 't'])) throw new Error('Faltan datos para simular: se necesitan v y t.');
    if (v.t <= 0) throw new Error('Se necesita un tiempo mayor que 0 para simular.');
    return { t_max: v.t, x0: 0, y0: 0, vx0: v.v, vy0: 0, ax: 0, ay: 0 };
  }
  if (modelo === 'mrua') {
    if (!req(['v0', 'a', 't'])) throw new Error('Faltan datos para simular: se necesitan v₀, a y t.');
    if (v.t <= 0) throw new Error('Se necesita un tiempo mayor que 0 para simular.');
    return { t_max: v.t, x0: 0, y0: 0, vx0: v.v0, vy0: 0, ax: v.a, ay: 0 };
  }
  if (!req(['v0x', 'v0y', 'h0', 'g', 'tv'])) throw new Error('Faltan datos para simular el tiro completo.');
  if (v.tv <= 0) throw new Error('El tiempo de vuelo tiene que ser mayor que 0.');
  return { t_max: v.tv, x0: 0, y0: v.h0, vx0: v.v0x, vy0: v.v0y, ax: 0, ay: -v.g };
}
