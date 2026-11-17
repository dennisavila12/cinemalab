/**
 * Motor de física original (Rust) compilado a WebAssembly y corriendo dentro del navegador.
 * Habla el mismo JSON que la API de Node.js: valida con los mismos esquemas zod y llama al
 * puente `fisica-wasm` (crates/fisica-wasm), que a su vez llama a `fisica-core`.
 */
import { EntradaLeccion, EntradaResolver, EntradaSugerencia, EntradaTiro } from '@cinemalab/contratos';

export class ErrorWasm extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

interface Exportaciones {
  memory: WebAssembly.Memory;
  cl_reservar(n: number): number;
  cl_liberar(p: number, n: number): void;
  cl_llamar(op: number, p: number, n: number): number;
  cl_salida_ptr(): number;
  cl_salida_len(): number;
}

const OP = { version: 0, modelos: 1, resolver: 2, leccion: 3, escenarios: 4, tiro: 5, sugerencia: 6 } as const;
const URL_WASM = `${import.meta.env.BASE_URL}motor/fisica.wasm`;
const cod = new TextEncoder();
const dec = new TextDecoder();
let cargando: Promise<Exportaciones> | null = null;

function cargar(): Promise<Exportaciones> {
  if (!cargando) {
    cargando = (async () => {
      const r = await fetch(URL_WASM);
      if (!r.ok) throw new ErrorWasm('No se pudo cargar el motor de física (WebAssembly).', 503);
      const bytes = await r.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      return instance.exports as unknown as Exportaciones;
    })().catch((e) => {
      cargando = null;
      throw e instanceof ErrorWasm ? e : new ErrorWasm('No se pudo iniciar el motor de física (WebAssembly).', 503);
    });
  }
  return cargando;
}

async function llamar(op: number, entrada?: unknown): Promise<string> {
  const ex = await cargar();
  const bytes = entrada === undefined ? new Uint8Array(0) : cod.encode(JSON.stringify(entrada));
  let codigo: number;
  let texto: string;
  try {
    const p = ex.cl_reservar(bytes.length) >>> 0;
    new Uint8Array(ex.memory.buffer, p, bytes.length).set(bytes);
    codigo = ex.cl_llamar(op, p, bytes.length);
    ex.cl_liberar(p, bytes.length);
    texto = dec.decode(new Uint8Array(ex.memory.buffer, ex.cl_salida_ptr() >>> 0, ex.cl_salida_len() >>> 0));
  } catch {
    cargando = null; // el módulo se detuvo: se vuelve a crear en la próxima llamada
    throw new ErrorWasm('El motor de física se detuvo inesperadamente. Probá de nuevo.', 500);
  }
  if (codigo !== 0) throw new ErrorWasm(texto, 422);
  return texto;
}

function validar<T>(esquema: { safeParse: (x: unknown) => { success: true; data: T } | { success: false } }, cuerpo: unknown): T {
  const r = esquema.safeParse(cuerpo);
  if (!r.success) throw new ErrorWasm('Los datos enviados no son válidos.', 400);
  return r.data;
}

const json = async <T>(op: number, entrada?: unknown): Promise<T> => JSON.parse(await llamar(op, entrada)) as T;

export const motorWasm = {
  version: () => llamar(OP.version),
  modelos: () => json(OP.modelos),
  resolver: (c: unknown) => json(OP.resolver, validar(EntradaResolver, c)),
  leccion: (c: unknown) => json(OP.leccion, validar(EntradaLeccion, c)),
  escenarios: () => json(OP.escenarios),
  tiro: (c: unknown) => json(OP.tiro, validar(EntradaTiro, c)),
  sugerencia: (c: unknown) => json(OP.sugerencia, validar(EntradaSugerencia, c)),
};
