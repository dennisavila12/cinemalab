import { describe, expect, it } from 'vitest';
import type { Estado } from '@cinemalab/contratos';
import { fmt, leerNumero } from '../src/lib/formato';
import { estadoEn, puntoEn } from '../src/lib/interpolar';

describe('formato', () => {
  it('quita ceros sobrantes y usa el signo menos tipográfico', () => {
    expect(fmt(2.5)).toBe('2.5');
    expect(fmt(-6.25)).toBe('−6.25');
    expect(fmt(3)).toBe('3');
  });
  it('lee números con coma decimal', () => {
    expect(leerNumero('2,5')).toBe(2.5);
    expect(leerNumero('')).toBeNull();
    expect(leerNumero('abc')).toBeNaN();
  });
});

describe('interpolación', () => {
  const muestras: Estado[] = [0, 1, 2].map((t) => ({ t, x: 10 * t, y: 0, vx: 10, vy: 0, ax: 0, ay: 0 }));
  it('interpola entre muestras del motor', () => {
    expect(estadoEn(muestras, 0.5).x).toBeCloseTo(5);
    expect(estadoEn(muestras, 5).x).toBe(20);
  });
  it('interpola puntos de una trayectoria', () => {
    expect(puntoEn([[0, 0, 0], [1, 2, 4]], 0.5)).toEqual([1, 2]);
  });
});
