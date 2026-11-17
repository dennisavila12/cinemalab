//! Los tres modelos de movimiento del proyecto.

mod mru;
mod mrua;
mod parabolico;

use crate::modelo::Modelo;
use std::sync::OnceLock;

pub const G: f64 = 9.81;

pub fn todos() -> &'static [Modelo] {
    static MODELOS: OnceLock<Vec<Modelo>> = OnceLock::new();
    MODELOS.get_or_init(|| vec![mru::modelo(), mrua::modelo(), parabolico::modelo()])
}

pub fn por_id(id: &str) -> Option<&'static Modelo> {
    todos().iter().find(|m| m.id == id)
}

/// ¿Es distinto de cero (para no dividir entre cero)?
pub(crate) fn nz(x: f64) -> bool {
    x.abs() > 1e-12
}
