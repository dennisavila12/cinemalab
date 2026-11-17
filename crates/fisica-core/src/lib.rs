//! # fisica-core
//!
//! Motor de cinemática de CinemaLab. No depende de Node ni del navegador:
//! recibe y devuelve estructuras serializables a JSON.
//!
//! - [`modelos`] — MRU, MRUA y lanzamiento parabólico (variables, ecuaciones y despejes)
//! - [`solver`] — resolución paso a paso con verificación de consistencia
//! - [`movimiento`] — simulación (todos son movimientos con aceleración constante)
//! - [`leccion`] — guiones del Modo clase
//! - [`juego`] — física y explicaciones del juego de la hondilla
//! - [`api`] — funciones JSON → JSON que usa el puente con Node.js

pub mod api;
pub mod formato;
pub mod juego;
pub mod leccion;
pub mod modelo;
pub mod modelos;
pub mod movimiento;
pub mod solver;

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
