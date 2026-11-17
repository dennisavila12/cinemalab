//! Juego "La hondilla": escenarios salvadoreños, física del tiro y explicaciones.

pub mod analisis;
pub mod escenarios;
pub mod tiro;

pub use escenarios::{escenario, escenarios, Escenario};
pub use tiro::{lanzar, sugerir, EntradaSugerencia, EntradaTiro};

/// Gravedad usada en el juego (m/s²)
pub const G: f64 = 9.81;
/// Radio de la piedra (m)
pub const R_PIEDRA: f64 = 0.3;
pub const RAPIDEZ_MIN: f64 = 5.0;
pub const RAPIDEZ_MAX: f64 = 35.0;
pub const ANGULO_MIN: f64 = 5.0;
pub const ANGULO_MAX: f64 = 85.0;
