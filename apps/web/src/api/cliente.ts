/** Cliente HTTP de la API de CinemaLab. Todas las respuestas están tipadas con @cinemalab/contratos. */
import type {
  EntradaLeccion,
  EntradaResolver,
  EntradaSugerencia,
  EntradaTiro,
  ErrorApi,
  Escenario,
  Leccion,
  Modelo,
  RespuestaResolver,
  ResultadoTiro,
  Sugerencia,
} from '@cinemalab/contratos';

const BASE = import.meta.env.VITE_API_URL ?? '';

export class ErrorDeApi extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

/** En el HTML de demostración el motor corre dentro del navegador (ver src/demo). */
export const MODO_DEMO = import.meta.env.VITE_MODO === 'demo';

async function pedirLocal<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const { motorLocal, ErrorLocal } = await import('../demo/motor');
  const rutas: Record<string, (c?: unknown) => unknown> = {
    '/modelos': motorLocal.modelos,
    '/resolver': motorLocal.resolver,
    '/leccion': motorLocal.leccion,
    '/juego/escenarios': motorLocal.escenarios,
    '/juego/tiro': motorLocal.tiro,
    '/juego/sugerencia': motorLocal.sugerencia,
  };
  try {
    return structuredClone(rutas[ruta](cuerpo)) as T;
  } catch (e) {
    throw new ErrorDeApi((e as Error).message, e instanceof ErrorLocal ? e.status : 500);
  }
}

async function pedir<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  if (MODO_DEMO) return pedirLocal<T>(ruta, cuerpo);
  let r: Response;
  try {
    r = await fetch(`${BASE}/api${ruta}`, {
      method: cuerpo === undefined ? 'GET' : 'POST',
      headers: cuerpo === undefined ? undefined : { 'content-type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorDeApi('No se pudo conectar con el servidor. ¿Está corriendo la API (pnpm dev)?', 0);
  }
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorDeApi((datos as ErrorApi).error ?? `Error ${r.status}`, r.status);
  return datos as T;
}

type Opcional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const api = {
  modelos: () => pedir<Modelo[]>('/modelos'),
  resolver: (e: Opcional<EntradaResolver, 'incognitas' | 'datos'>) => pedir<RespuestaResolver>('/resolver', e),
  leccion: (e: Opcional<EntradaLeccion, 'incognitas'>) => pedir<Leccion>('/leccion', e),
  escenarios: () => pedir<Escenario[]>('/juego/escenarios'),
  tiro: (e: Opcional<EntradaTiro, 'jugador' | 'numero'>) => pedir<ResultadoTiro>('/juego/tiro', e),
  sugerencia: (e: Opcional<EntradaSugerencia, 'jugador'>) => pedir<Sugerencia>('/juego/sugerencia', e),
};
