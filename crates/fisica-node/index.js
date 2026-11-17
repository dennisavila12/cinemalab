// Carga el módulo nativo compilado por scripts/compilar-nativo.mjs
'use strict';
const path = require('node:path');

let nativo;
try {
  nativo = require(path.join(__dirname, 'fisica.node'));
} catch (error) {
  throw new Error(
    'No se encontró el motor de física compilado (fisica.node).\n' +
      'Ejecutá primero:  pnpm build:nativo\n' +
      'Necesitás Rust instalado: https://rustup.rs\n\n' +
      String(error && error.message)
  );
}
module.exports = nativo;
