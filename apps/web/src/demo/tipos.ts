import type { Variable } from '@cinemalab/contratos';

export type Valores = Record<string, number>;

/** Acceso a los valores conocidos (solo se llama cuando la variable existe). */
export class V {
  constructor(public readonly m: Valores) {}
  g(k: string) {
    return this.m[k] ?? NaN;
  }
  tiene(k: string) {
    return k in this.m;
  }
}

export type Despeje =
  | { tipo: 'valor'; valor: number; sustitucion: string; nota: string | null }
  | { tipo: 'noaplica' }
  | { tipo: 'imposible'; mensaje: string };

export const ok = (valor: number, sustitucion: string): Despeje => ({ tipo: 'valor', valor, sustitucion, nota: null });
export const conNota = (valor: number, sustitucion: string, nota: string): Despeje => ({ tipo: 'valor', valor, sustitucion, nota });
export const NO: Despeje = { tipo: 'noaplica' };
export const imposible = (mensaje: string): Despeje => ({ tipo: 'imposible', mensaje });

export interface Forma {
  var: string;
  latex: string;
  prioridad: number;
  f: (v: V) => Despeje;
}

export interface Ecuacion {
  id: string;
  latex: string;
  vars: string[];
  cuando?: (v: V) => boolean;
  residuo: (v: V) => [number, number];
  despejes: Forma[];
}

export interface ModeloInterno {
  id: 'mru' | 'mrua' | 'parabolico';
  corto: string;
  nombre: string;
  descripcion: string;
  dimension: 'recta' | 'plano';
  variables: Variable[];
  ecuaciones: Ecuacion[];
  ejemplos: { titulo: string; enunciado: string; datos: [string, number][]; pide: string[] }[];
}

export const libre = (id: string, simbolo: string, etiqueta: string, unidad: string, extra: Partial<Variable> = {}): Variable => ({ id, simbolo, etiqueta, unidad, estricto: false, ...extra });
export const noNegativa = (id: string, simbolo: string, etiqueta: string, unidad: string, extra: Partial<Variable> = {}): Variable => ({ id, simbolo, etiqueta, unidad, min: 0, estricto: false, ...extra });
export const nz = (x: number) => Math.abs(x) > 1e-12;
export const G = 9.81;
