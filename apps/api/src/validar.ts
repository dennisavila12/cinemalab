import type { ZodType, ZodTypeDef } from 'zod';

/** Error de validación de la entrada (HTTP 400). */
export class ErrorEntrada extends Error {
  readonly statusCode = 400;
  constructor(public readonly detalles: unknown) {
    super('Los datos enviados no son válidos.');
  }
}

/** Valida el cuerpo de la petición con un esquema de zod. */
export function validar<S, E = S>(esquema: ZodType<S, ZodTypeDef, E>, cuerpo: unknown): S {
  const r = esquema.safeParse(cuerpo);
  if (!r.success) throw new ErrorEntrada(r.error.flatten());
  return r.data;
}
