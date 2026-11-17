//! Puente nativo entre el motor de física (Rust) y Node.js, con napi.
//!
//! Cada función recibe y devuelve JSON (texto). Así el contrato entre los dos lados es simple
//! y se valida en ambos extremos: con serde en Rust y con zod en TypeScript.

use napi::{Error, Result, Status};
use napi_derive::napi;

fn convertir(r: std::result::Result<String, String>) -> Result<String> {
    r.map_err(|e| Error::new(Status::InvalidArg, e))
}

#[napi]
pub fn version() -> String {
    fisica_core::version().to_string()
}

/// Lista de modelos con sus variables, ecuaciones y ejemplos.
#[napi]
pub fn modelos() -> Result<String> {
    convertir(fisica_core::api::modelos())
}

/// Resuelve un ejercicio paso a paso y, si se puede, lo simula.
#[napi]
pub fn resolver(entrada: String) -> Result<String> {
    convertir(fisica_core::api::resolver(&entrada))
}

/// Genera el guion del Modo clase.
#[napi]
pub fn leccion(entrada: String) -> Result<String> {
    convertir(fisica_core::api::leccion(&entrada))
}

/// Escenarios del juego de la hondilla.
#[napi]
pub fn escenarios() -> Result<String> {
    convertir(fisica_core::api::escenarios())
}

/// Simula un tiro con la hondilla y lo explica.
#[napi]
pub fn tiro(entrada: String) -> Result<String> {
    convertir(fisica_core::api::tiro(&entrada))
}

/// Calcula el tiro perfecto hacia un objetivo, con la deducción paso a paso.
#[napi]
pub fn sugerencia(entrada: String) -> Result<String> {
    convertir(fisica_core::api::sugerencia(&entrada))
}
