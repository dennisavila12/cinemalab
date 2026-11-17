//! Tipos que describen un modelo de movimiento: variables, ecuaciones y despejes.
//!
//! Cada ecuación sabe despejar cada una de sus variables. El texto del despeje y la
//! sustitución se generan en LaTeX para que la interfaz los muestre tal cual.

use serde::Serialize;
use std::collections::BTreeMap;

pub type Valores = BTreeMap<String, f64>;

/// Acceso cómodo a los valores ya conocidos (solo se llama cuando la variable existe).
pub struct V<'a>(pub &'a Valores);
impl V<'_> {
    pub fn g(&self, k: &str) -> f64 {
        *self.0.get(k).unwrap_or(&f64::NAN)
    }
    pub fn tiene(&self, k: &str) -> bool {
        self.0.contains_key(k)
    }
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Dimension {
    /// Movimiento en línea recta sobre el eje x
    Recta,
    /// Movimiento en el plano x–y
    Plano,
}

#[derive(Debug, Clone, Serialize)]
pub struct Variable {
    pub id: &'static str,
    /// Símbolo en LaTeX (por ejemplo `v_0`)
    pub simbolo: &'static str,
    pub etiqueta: &'static str,
    pub unidad: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<f64>,
    /// Si es true, el mínimo no se incluye (valor > min)
    pub estricto: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub defecto: Option<f64>,
}

impl Variable {
    pub const fn libre(
        id: &'static str,
        simbolo: &'static str,
        etiqueta: &'static str,
        unidad: &'static str,
    ) -> Self {
        Variable {
            id,
            simbolo,
            etiqueta,
            unidad,
            min: None,
            estricto: false,
            max: None,
            defecto: None,
        }
    }
    pub const fn no_negativa(
        id: &'static str,
        simbolo: &'static str,
        etiqueta: &'static str,
        unidad: &'static str,
    ) -> Self {
        Variable {
            id,
            simbolo,
            etiqueta,
            unidad,
            min: Some(0.0),
            estricto: false,
            max: None,
            defecto: None,
        }
    }
}

/// Resultado de aplicar un despeje.
pub enum Despeje {
    /// Se pudo calcular
    Valor {
        valor: f64,
        sustitucion: String,
        nota: Option<String>,
    },
    /// El despeje no aplica (división entre cero, etc.); se intentará otro camino
    NoAplica,
    /// Los datos no tienen solución física; el mensaje se muestra al usuario
    Imposible(String),
}

impl Despeje {
    pub fn ok(valor: f64, sustitucion: String) -> Self {
        Despeje::Valor {
            valor,
            sustitucion,
            nota: None,
        }
    }
    pub fn con_nota(valor: f64, sustitucion: String, nota: impl Into<String>) -> Self {
        Despeje::Valor {
            valor,
            sustitucion,
            nota: Some(nota.into()),
        }
    }
}

pub type FnDespeje = fn(&V) -> Despeje;

pub struct FormaDespejada {
    pub var: &'static str,
    /// Fórmula despejada en LaTeX
    pub latex: &'static str,
    /// 1 = lineal, 2 = raíz o cuadrática, 3 = con ambigüedad de signo
    pub prioridad: u8,
    pub f: FnDespeje,
}

pub struct Ecuacion {
    pub id: &'static str,
    pub latex: &'static str,
    pub vars: &'static [&'static str],
    /// Condición para que la ecuación sea válida (por ejemplo, h₀ = 0)
    pub cuando: Option<fn(&V) -> bool>,
    /// (lado izquierdo, lado derecho) para verificar consistencia
    pub residuo: fn(&V) -> (f64, f64),
    pub despejes: Vec<FormaDespejada>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Ejemplo {
    pub titulo: &'static str,
    pub enunciado: &'static str,
    pub datos: Vec<(&'static str, f64)>,
    pub pide: Vec<&'static str>,
}

pub struct Modelo {
    pub id: &'static str,
    pub corto: &'static str,
    pub nombre: &'static str,
    pub descripcion: &'static str,
    pub dimension: Dimension,
    pub variables: Vec<Variable>,
    pub ecuaciones: Vec<Ecuacion>,
    pub ejemplos: Vec<Ejemplo>,
}

impl Modelo {
    pub fn variable(&self, id: &str) -> Option<&Variable> {
        self.variables.iter().find(|v| v.id == id)
    }
}

/// Descripción pública de un modelo (lo que la interfaz necesita para armar el formulario).
#[derive(Serialize)]
pub struct ModeloPublico<'a> {
    pub id: &'a str,
    pub corto: &'a str,
    pub nombre: &'a str,
    pub descripcion: &'a str,
    pub dimension: Dimension,
    pub variables: &'a [Variable],
    pub ecuaciones: Vec<&'a str>,
    pub ejemplos: Vec<EjemploPublico<'a>>,
}

#[derive(Serialize)]
pub struct EjemploPublico<'a> {
    pub titulo: &'a str,
    pub enunciado: &'a str,
    pub datos: BTreeMap<&'a str, f64>,
    pub pide: &'a [&'a str],
}

impl<'a> From<&'a Modelo> for ModeloPublico<'a> {
    fn from(m: &'a Modelo) -> Self {
        ModeloPublico {
            id: m.id,
            corto: m.corto,
            nombre: m.nombre,
            descripcion: m.descripcion,
            dimension: m.dimension,
            variables: &m.variables,
            ecuaciones: m.ecuaciones.iter().map(|e| e.latex).collect(),
            ejemplos: m
                .ejemplos
                .iter()
                .map(|e| EjemploPublico {
                    titulo: e.titulo,
                    enunciado: e.enunciado,
                    datos: e.datos.iter().copied().collect(),
                    pide: &e.pide,
                })
                .collect(),
        }
    }
}
