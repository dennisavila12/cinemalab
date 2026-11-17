#!/usr/bin/env bash
# Construcción para Vercel: compila el motor original en Rust a WebAssembly y luego la interfaz.
# Así la página publicada usa el mismo motor que el servidor de Node (crates/fisica-core).
set -euo pipefail

if ! command -v cargo >/dev/null 2>&1 && [ -f "$HOME/.cargo/env" ]; then source "$HOME/.cargo/env"; fi
if ! command -v cargo >/dev/null 2>&1; then
  echo "▶ Instalando Rust (perfil mínimo)…"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable --no-modify-path
  source "$HOME/.cargo/env"
fi
rustup target add wasm32-unknown-unknown

echo "▶ Compilando el motor de física (Rust → WebAssembly)…"
cargo build -p fisica-wasm --target wasm32-unknown-unknown --release --locked
mkdir -p apps/web/public/motor
cp target/wasm32-unknown-unknown/release/fisica_wasm.wasm apps/web/public/motor/fisica.wasm
ls -la apps/web/public/motor/fisica.wasm

echo "▶ Construyendo la interfaz…"
pnpm --filter @cinemalab/web build:wasm
