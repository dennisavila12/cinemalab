/** Arranque del servidor: API en /api y la web compilada en la raíz. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApp } from './app.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const carpetaWeb = process.env.CARPETA_WEB ?? join(aqui, '../../web/dist');
const puerto = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const app = await crearApp({ logger: true, carpetaWeb });
try {
  await app.listen({ port: puerto, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
