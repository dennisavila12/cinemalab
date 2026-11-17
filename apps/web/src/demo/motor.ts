/**
 * Motor local para el HTML de demostración: responde lo mismo que la API (Node.js + Rust),
 * pero dentro del navegador. Valida las entradas con los mismos esquemas zod que la API.
 */
import {
  EntradaLeccion, EntradaResolver, EntradaSugerencia, EntradaTiro,
  type Leccion, type Modelo, type RespuestaResolver,
} from '@cinemalab/contratos';
import { ESCENARIOS, lanzar, sugerir } from './juego';
import { generar } from './leccion';
import { MODELOS, porId } from './modelos';
import { desdeModelo, simular } from './movimiento';
import { resolver } from './solver';

export class ErrorLocal extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

function validar<T>(esquema: { safeParse: (x: unknown) => { success: true; data: T } | { success: false } }, cuerpo: unknown): T {
  const r = esquema.safeParse(cuerpo);
  if (!r.success) throw new ErrorLocal('Los datos enviados no son válidos.', 400);
  return r.data;
}

function motor<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ErrorLocal) throw e;
    throw new ErrorLocal((e as Error).message, 422);
  }
}

export const motorLocal = {
  modelos: (): Modelo[] =>
    MODELOS.map((m) => ({
      id: m.id, corto: m.corto, nombre: m.nombre, descripcion: m.descripcion, dimension: m.dimension, variables: m.variables,
      ecuaciones: m.ecuaciones.map((e) => e.latex),
      ejemplos: m.ejemplos.map((e) => ({ titulo: e.titulo, enunciado: e.enunciado, datos: Object.fromEntries([...e.datos].sort(([a], [b]) => (a < b ? -1 : 1))), pide: e.pide })),
    })),

  resolver: (cuerpo: unknown): RespuestaResolver => {
    const e = validar(EntradaResolver, cuerpo);
    const m = porId(e.modelo)!;
    const solucion = resolver(m, e);
    if (Object.keys(solucion.errores).length) return { solucion, simulacion: null, aviso_simulacion: null };
    try {
      return { solucion, simulacion: simular(desdeModelo(m.id, solucion.valores), 600), aviso_simulacion: null };
    } catch (err) {
      return { solucion, simulacion: null, aviso_simulacion: (err as Error).message };
    }
  },

  leccion: (cuerpo: unknown): Leccion => {
    const e = validar(EntradaLeccion, cuerpo);
    return motor(() => generar(e));
  },

  escenarios: () => ESCENARIOS,
  tiro: (cuerpo: unknown) => {
    const e = validar(EntradaTiro, cuerpo);
    return motor(() => lanzar(e));
  },
  sugerencia: (cuerpo: unknown) => {
    const e = validar(EntradaSugerencia, cuerpo);
    return motor(() => sugerir(e));
  },
};
