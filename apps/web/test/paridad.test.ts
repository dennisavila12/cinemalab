/**
 * Paridad: el motor local del HTML de demostración debe responder igual que el motor en Rust.
 * Compara recursivamente cada respuesta (números con tolerancia, textos y fórmulas exactos).
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { motorLocal } from '../src/demo/motor';

const require = createRequire(import.meta.url);
const rust = require('../../../crates/fisica-node');

function comparar(a: unknown, b: unknown, ruta = '$'): string[] {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)) ? [] : [`${ruta}: ${a} ≠ ${b}`];
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return [`${ruta}: largo ${a.length} ≠ ${b.length}`];
    return a.flatMap((x, i) => comparar(x, b[i], `${ruta}[${i}]`));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const claves = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...claves].flatMap((k) => comparar((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${ruta}.${k}`));
  }
  return a === b ? [] : [`${ruta}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`];
}

const igual = (local: unknown, deRust: string) => expect(comparar(JSON.parse(JSON.stringify(local)), JSON.parse(deRust)).slice(0, 5)).toEqual([]);

const casosResolver = [
  { modelo: 'mru', datos: { v: 15, t: 40 }, incognitas: ['dx'] },
  { modelo: 'mru', datos: { dx: 450, v: 1.25 }, incognitas: [] },
  { modelo: 'mrua', datos: { v0: 25, v: 0, dx: 50 }, incognitas: ['a', 't'] },
  { modelo: 'mrua', datos: { v0: 10, a: 2, v: 30 }, incognitas: [] },
  { modelo: 'mrua', datos: { v0: 10, a: 2, t: 5, v: 30 }, incognitas: [] },
  { modelo: 'mrua', datos: { v0: 10, v: 20, a: -2 }, incognitas: ['t'] },
  { modelo: 'mrua', datos: { v0: 5, a: -2, dx: 4 }, incognitas: ['t'] },
  { modelo: 'mrua', datos: { v: 0, a: -3, dx: 24 }, incognitas: ['v0', 't'] },
  { modelo: 'parabolico', datos: { v0: 20, theta: 45 }, incognitas: ['hmax', 'tv', 'R'] },
  { modelo: 'parabolico', datos: { theta: 30, R: 80, h0: 0 }, incognitas: ['v0'] },
  { modelo: 'parabolico', datos: { v0: 15, theta: 37, h0: 25 }, incognitas: [] },
  { modelo: 'parabolico', datos: { v0: 20, R: 30 }, incognitas: ['theta'] },
  { modelo: 'parabolico', datos: { v0: 10, R: 30 }, incognitas: ['theta'] },
  { modelo: 'parabolico', datos: { hmax: 10, R: 40 }, incognitas: ['v0', 'theta'] },
  { modelo: 'parabolico', datos: { v0: 10, theta: 120 }, incognitas: [] },
];

describe('paridad del motor local con Rust', () => {
  it('modelos', () => igual(motorLocal.modelos(), rust.modelos()));
  it('escenarios', () => igual(motorLocal.escenarios(), rust.escenarios()));
  it.each(casosResolver)('resolver %o', (c) => igual(motorLocal.resolver(c), rust.resolver(JSON.stringify(c))));
  it.each([
    { modelo: 'mru' }, { modelo: 'mrua' }, { modelo: 'parabolico' },
    { modelo: 'mrua', datos: { v0: 25, v: 0, dx: 50 }, incognitas: ['a', 't'] },
    { modelo: 'parabolico', datos: { v0: 12, theta: 60, h0: 2 }, incognitas: ['R'] },
  ])('lección %o', (c) => igual(motorLocal.leccion(c), rust.leccion(JSON.stringify(c))));

  it('tiros y sugerencias en todos los escenarios', () => {
    for (const e of motorLocal.escenarios()) {
      for (let j = 0; j < e.lanzadores.length; j++) {
        for (const [angulo, rapidez] of [[30, 15], [45, 16], [60, 22], [20, 30], [75, 12]]) {
          const c = { escenario: e.id, jugador: j, angulo, rapidez, numero: 2 };
          igual(motorLocal.tiro(c), rust.tiro(JSON.stringify(c)));
          const s = { escenario: e.id, jugador: j, angulo };
          igual(motorLocal.sugerencia(s), rust.sugerencia(JSON.stringify(s)));
        }
      }
    }
  });
});
