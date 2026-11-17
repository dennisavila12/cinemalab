/**
 * Acceso tipado al motor de física en Rust (módulo nativo @cinemalab/fisica-node).
 * El motor habla JSON; aquí se convierte a objetos con los tipos de @cinemalab/contratos.
 */
import { createRequire } from 'node:module';
import type {
  EntradaLeccion,
  EntradaResolver,
  EntradaSugerencia,
  EntradaTiro,
  Escenario,
  Leccion,
  Modelo,
  RespuestaResolver,
  ResultadoTiro,
  Sugerencia,
} from '@cinemalab/contratos';

interface ModuloNativo {
  version(): string;
  modelos(): string;
  resolver(entrada: string): string;
  leccion(entrada: string): string;
  escenarios(): string;
  tiro(entrada: string): string;
  sugerencia(entrada: string): string;
}

const require = createRequire(import.meta.url);
const nativo: ModuloNativo = require('@cinemalab/fisica-node');

/** Error que viene del motor (por ejemplo, un escenario que no existe). */
export class ErrorMotor extends Error {
  readonly statusCode = 422;
}

function llamar<T>(fn: () => string): T {
  try {
    return JSON.parse(fn()) as T;
  } catch (e) {
    if (e instanceof SyntaxError) throw e;
    throw new ErrorMotor(e instanceof Error ? e.message : String(e));
  }
}

// Los modelos y escenarios no cambian: se calculan una sola vez.
let modelosCache: Modelo[] | undefined;
let escenariosCache: Escenario[] | undefined;

export const motor = {
  version: (): string => nativo.version(),
  modelos: (): Modelo[] => (modelosCache ??= llamar<Modelo[]>(() => nativo.modelos())),
  escenarios: (): Escenario[] => (escenariosCache ??= llamar<Escenario[]>(() => nativo.escenarios())),
  resolver: (e: EntradaResolver): RespuestaResolver => llamar(() => nativo.resolver(JSON.stringify(e))),
  leccion: (e: EntradaLeccion): Leccion => llamar(() => nativo.leccion(JSON.stringify(e))),
  tiro: (e: EntradaTiro): ResultadoTiro => llamar(() => nativo.tiro(JSON.stringify(e))),
  sugerencia: (e: EntradaSugerencia): Sugerencia => llamar(() => nativo.sugerencia(JSON.stringify(e))),
};
