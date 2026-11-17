/** Rutas del resolvedor y del Modo clase. */
import { EntradaLeccion, EntradaResolver } from '@cinemalab/contratos';
import type { FastifyInstance } from 'fastify';
import { motor } from '../motor.js';
import { validar } from '../validar.js';

export async function rutasFisica(app: FastifyInstance) {
  app.get('/modelos', async () => motor.modelos());

  app.post('/resolver', async (req) => motor.resolver(validar(EntradaResolver, req.body)));

  app.post('/leccion', async (req) => motor.leccion(validar(EntradaLeccion, req.body)));
}
