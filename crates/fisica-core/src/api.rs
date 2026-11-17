//! Funciones JSON → JSON. Son la única puerta de entrada que usa el puente con Node.js,
//! así el motor se puede probar sin Node y Node no conoce los detalles internos.

use crate::juego::{self, EntradaSugerencia, EntradaTiro};
use crate::leccion::{self, EntradaLeccion};
use crate::modelo::ModeloPublico;
use crate::modelos;
use crate::movimiento::{desde_modelo, Simulacion};
use crate::solver::{self, Entrada, Solucion};
use serde::Serialize;

fn a_json<T: Serialize>(x: &T) -> Result<String, String> {
    serde_json::to_string(x).map_err(|e| e.to_string())
}

fn leer<'a, T: serde::Deserialize<'a>>(json: &'a str) -> Result<T, String> {
    serde_json::from_str(json).map_err(|e| format!("JSON inválido: {e}"))
}

pub fn modelos() -> Result<String, String> {
    let lista: Vec<ModeloPublico> = modelos::todos().iter().map(ModeloPublico::from).collect();
    a_json(&lista)
}

#[derive(Serialize)]
struct RespuestaResolver {
    solucion: Solucion,
    simulacion: Option<Simulacion>,
    aviso_simulacion: Option<String>,
}

pub fn resolver(json: &str) -> Result<String, String> {
    let entrada: Entrada = leer(json)?;
    let m = modelos::por_id(&entrada.modelo)
        .ok_or_else(|| format!("Modelo desconocido: {}", entrada.modelo))?;
    let solucion = solver::resolver(m, &entrada);
    let (simulacion, aviso_simulacion) = if solucion.errores.is_empty() {
        match desde_modelo(m.id, &solucion.valores) {
            Ok(mov) => (Some(mov.simular(600)), None),
            Err(e) => (None, Some(e)),
        }
    } else {
        (None, None)
    };
    a_json(&RespuestaResolver {
        solucion,
        simulacion,
        aviso_simulacion,
    })
}

pub fn leccion(json: &str) -> Result<String, String> {
    let entrada: EntradaLeccion = leer(json)?;
    a_json(&leccion::generar(&entrada)?)
}

pub fn escenarios() -> Result<String, String> {
    a_json(&juego::escenarios())
}

pub fn tiro(json: &str) -> Result<String, String> {
    let entrada: EntradaTiro = leer(json)?;
    a_json(&juego::lanzar(&entrada)?)
}

pub fn sugerencia(json: &str) -> Result<String, String> {
    let entrada: EntradaSugerencia = leer(json)?;
    a_json(&juego::sugerir(&entrada)?)
}
