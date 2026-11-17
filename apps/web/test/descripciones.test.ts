import { describe, expect, it } from 'vitest';
import { motorLocal } from '../src/demo/motor';
import { descripcionDe } from '../src/lib/descripciones';

describe('qué es cada fórmula', () => {
  it('todas las ecuaciones de los modelos tienen nombre y para qué sirven', () => {
    for (const m of motorLocal.modelos()) for (const e of m.ecuaciones) {
      const d = descripcionDe(e);
      expect(d, `${m.id}: ${e}`).toBeDefined();
      expect(d!.nombre.length).toBeGreaterThan(5);
      expect(d!.para.length).toBeGreaterThan(20);
    }
  });
  it('cada paso de una solución apunta a una ecuación con descripción', () => {
    const r = motorLocal.resolver({ modelo: 'parabolico', datos: { v0: 20, theta: 45 }, incognitas: ['hmax', 'tv', 'R'] });
    expect(r.solucion.pasos.length).toBeGreaterThan(2);
    for (const p of r.solucion.pasos) expect(descripcionDe(p.ecuacion), p.ecuacion).toBeDefined();
  });
});
