import { describe, expect, it } from 'vitest';
import { significados } from '../src/lib/significados';
const mrua = [{ simbolo: 'd', etiqueta: 'Distancia', unidad: 'm' }, { simbolo: 'v_0', etiqueta: 'Velocidad inicial', unidad: 'm/s' }, { simbolo: 'v', etiqueta: 'Velocidad final', unidad: 'm/s' }, { simbolo: 'a', etiqueta: 'Aceleración', unidad: 'm/s²' }, { simbolo: 't', etiqueta: 'Tiempo', unidad: 's' }];
describe('significados de las letras', () => {
  it('MRUA', () => {
    expect(significados('v^2 = v_0^2 + 2\\,a\\,d', mrua).map((s) => s.simbolo)).toEqual(['v', 'v_0', 'a', 'd']);
    expect(significados('d = v_0\\,t + \\tfrac{1}{2}\\,a\\,t^2', mrua).map((s) => s.simbolo)).toEqual(['d', 'v_0', 't', 'a']);
    expect(significados('d = v_0\\,t', mrua)[0].texto).toBe('distancia (m)');
  });
  it('parabólico y comandos', () => {
    expect(significados('v_{0y} = v_0\\operatorname{sen}\\theta').map((s) => s.simbolo)).toEqual(['v_{0y}', 'v_0', '\\theta']);
    expect(significados('h_{\\max} = h_0 + \\dfrac{v_{0y}^2}{2g}').map((s) => s.simbolo)).toEqual(['h_{\\max}', 'h_0', 'v_{0y}', 'g']);
    expect(significados('t = \\dfrac{8}{2} = 4\\ \\text{s}')).toEqual([{ simbolo: 't', texto: 'tiempo (s)' }]);
  });
});
