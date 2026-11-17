// Compila el puente Rust → Node (crates/fisica-node) y copia la librería como fisica.node.
// Funciona en Windows (.dll), macOS (.dylib) y Linux (.so).
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const perfil = process.argv.includes('--debug') ? 'debug' : 'release';

console.log(`▸ Compilando el motor de física en Rust (${perfil})…`);
execSync(`cargo build -p fisica-node${perfil === 'release' ? ' --release' : ''}`, { cwd: raiz, stdio: 'inherit' });

const nombre = {
  win32: 'fisica_node.dll',
  darwin: 'libfisica_node.dylib',
}[process.platform] ?? 'libfisica_node.so';

const origen = join(raiz, 'target', perfil, nombre);
const destino = join(raiz, 'crates', 'fisica-node', 'fisica.node');
if (!existsSync(origen)) {
  console.error(`✗ No se encontró ${origen}`);
  process.exit(1);
}
// Copiar y renombrar (operación atómica): si la API está corriendo con la versión
// anterior cargada en memoria, no se le cambia el archivo por debajo.
copyFileSync(origen, `${destino}.tmp`);
renameSync(`${destino}.tmp`, destino);
console.log(`✓ Motor listo: ${destino}`);
