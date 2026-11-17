//! Movimiento Rectilíneo Uniforme: d = v·t

use super::nz;
use crate::formato::par;
use crate::modelo::*;

pub fn modelo() -> Modelo {
    Modelo {
        id: "mru",
        corto: "MRU",
        nombre: "Movimiento Rectilíneo Uniforme",
        descripcion: "Velocidad constante y aceleración nula.",
        dimension: Dimension::Recta,
        variables: vec![
            Variable::libre("dx", "d", "Distancia", "m"),
            Variable::libre("v", "v", "Velocidad", "m/s"),
            Variable::no_negativa("t", "t", "Tiempo", "s"),
        ],
        ecuaciones: vec![Ecuacion {
            id: "mru1",
            latex: "d = v\\,t",
            vars: &["dx", "v", "t"],
            cuando: None,
            residuo: |v| (v.g("dx"), v.g("v") * v.g("t")),
            despejes: vec![
                FormaDespejada { var: "dx", latex: "d = v\\,t", prioridad: 1, f: |v| {
                    Despeje::ok(v.g("v") * v.g("t"), format!("d = {}\\cdot {}", par(v.g("v")), par(v.g("t"))))
                }},
                FormaDespejada { var: "v", latex: "v = \\dfrac{d}{t}", prioridad: 1, f: |v| {
                    if !nz(v.g("t")) { return Despeje::NoAplica; }
                    Despeje::ok(v.g("dx") / v.g("t"), format!("v = \\dfrac{{{}}}{{{}}}", par(v.g("dx")), par(v.g("t"))))
                }},
                FormaDespejada { var: "t", latex: "t = \\dfrac{d}{v}", prioridad: 1, f: |v| {
                    if !nz(v.g("v")) { return Despeje::NoAplica; }
                    Despeje::ok(v.g("dx") / v.g("v"), format!("t = \\dfrac{{{}}}{{{}}}", par(v.g("dx")), par(v.g("v"))))
                }},
            ],
        }],
        ejemplos: vec![
            Ejemplo { titulo: "El microbús de la ruta", enunciado: "Un microbús viaja por la carretera con velocidad constante de 15 m/s. ¿Qué distancia recorre en 40 s?", datos: vec![("v", 15.0), ("t", 40.0)], pide: vec!["dx"] },
            Ejemplo { titulo: "Ciclista en la Ruta Militar", enunciado: "Un ciclista recorre 1 200 m en 150 s con velocidad constante. ¿Cuál es su velocidad?", datos: vec![("dx", 1200.0), ("t", 150.0)], pide: vec!["v"] },
            Ejemplo { titulo: "Caminando al mercado", enunciado: "Una señora camina a 1.25 m/s hacia el mercado, que está a 450 m. ¿Cuánto tarda en llegar?", datos: vec![("dx", 450.0), ("v", 1.25)], pide: vec!["t"] },
        ],
    }
}
