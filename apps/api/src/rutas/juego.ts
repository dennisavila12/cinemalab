/** Rutas del juego de la hondilla. */
import { EntradaSugerencia, EntradaTiro } from '@cinemalab/contratos';
import type { FastifyInstance } from 'fastify';
import { motor } from '../motor.js';
import { validar } from '../validar.js';

export async function rutasJuego(app: FastifyInstance) {
  app.get('/escenarios', async () => motor.escenarios());

  app.post('/tiro', async (req) => motor.tiro(validar(EntradaTiro, req.body)));

  app.post('/sugerencia', async (req) => motor.sugerencia(validar(EntradaSugerencia, req.body)));
}
