/**
 * Construye la aplicación Fastify. Se separa del arranque (servidor.ts) para poder
 * probarla con `app.inject()` sin abrir un puerto.
 */
import Fastify, { type FastifyError } from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { motor, ErrorMotor } from './motor.js';
import { rutasFisica } from './rutas/fisica.js';
import { rutasJuego } from './rutas/juego.js';
import { ErrorEntrada } from './validar.js';

export interface Opciones {
  logger?: boolean;
  /** Carpeta con la web compilada (apps/web/dist) para servirla en el mismo puerto */
  carpetaWeb?: string;
}

export async function crearApp({ logger = false, carpetaWeb }: Opciones = {}) {
  const app = Fastify({ logger, bodyLimit: 64 * 1024 });

  app.setErrorHandler((error: FastifyError | ErrorEntrada | ErrorMotor, _req, reply) => {
    if (error instanceof ErrorEntrada) {
      return reply.status(400).send({ error: error.message, detalles: error.detalles });
    }
    if (error instanceof ErrorMotor) {
      return reply.status(422).send({ error: error.message });
    }
    const status = (error as FastifyError).statusCode ?? 500;
    if (status >= 500) app.log.error(error);
    return reply.status(status).send({ error: status >= 500 ? 'Error interno del servidor.' : error.message });
  });

  app.get('/api/salud', async () => ({ estado: 'ok', motor: motor.version() }));
  await app.register(rutasFisica, { prefix: '/api' });
  await app.register(rutasJuego, { prefix: '/api/juego' });

  if (carpetaWeb && existsSync(carpetaWeb)) {
    await app.register(fastifyStatic, { root: carpetaWeb });
    // Cualquier ruta que no sea de la API devuelve la web (aplicación de una sola página)
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith('/api/') ? reply.status(404).send({ error: 'Ruta no encontrada.' }) : reply.sendFile('index.html'),
    );
  }
  return app;
}
