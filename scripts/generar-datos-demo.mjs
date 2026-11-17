// Copia los escenarios del juego desde el motor en Rust al HTML de demostración,
// para que ambos usen exactamente los mismos datos.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const fisica = createRequire(import.meta.url)(join(raiz, 'crates/fisica-node'));
const destino = join(raiz, 'apps/web/src/demo/escenarios.json');
writeFileSync(destino, JSON.stringify(JSON.parse(fisica.escenarios()), null, 1) + '\n');
console.log(`✓ Escenarios copiados a ${destino}`);
