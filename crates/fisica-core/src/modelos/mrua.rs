//! Movimiento Rectilíneo Uniformemente Acelerado.
//!   v = v₀ + a·t
//!   Δx = v₀·t + ½·a·t²
//!   v² = v₀² + 2·a·Δx
//!   Δx = ½·(v₀ + v)·t

use super::nz;
use crate::formato::{par, raices_positivas, txt};
use crate::modelo::*;

fn sgn(x: f64) -> f64 {
    if x < 0.0 {
        -1.0
    } else {
        1.0
    }
}

const NO_LLEGA: &str =
    "Con esos datos la ecuación no tiene solución real: el móvil nunca llega a esa posición.";

pub fn modelo() -> Modelo {
    Modelo {
        id: "mrua",
        corto: "MRUA",
        nombre: "Movimiento Rectilíneo Uniformemente Acelerado",
        descripcion: "Aceleración constante en línea recta: la velocidad cambia lo mismo cada segundo.",
        dimension: Dimension::Recta,
        variables: vec![
            Variable::libre("dx", "\\Delta x", "Desplazamiento", "m"),
            Variable::libre("v0", "v_0", "Velocidad inicial", "m/s"),
            Variable::libre("v", "v", "Velocidad final", "m/s"),
            Variable::libre("a", "a", "Aceleración", "m/s²"),
            Variable::no_negativa("t", "t", "Tiempo", "s"),
        ],
        ecuaciones: vec![
            Ecuacion {
                id: "mrua1",
                latex: "v = v_0 + a\\,t",
                vars: &["v", "v0", "a", "t"],
                cuando: None,
                residuo: |v| (v.g("v"), v.g("v0") + v.g("a") * v.g("t")),
                despejes: vec![
                    FormaDespejada { var: "v", latex: "v = v_0 + a\\,t", prioridad: 1, f: |v| {
                        Despeje::ok(v.g("v0") + v.g("a") * v.g("t"), format!("v = {} + {}\\cdot {}", par(v.g("v0")), par(v.g("a")), par(v.g("t"))))
                    }},
                    FormaDespejada { var: "v0", latex: "v_0 = v - a\\,t", prioridad: 1, f: |v| {
                        Despeje::ok(v.g("v") - v.g("a") * v.g("t"), format!("v_0 = {} - {}\\cdot {}", par(v.g("v")), par(v.g("a")), par(v.g("t"))))
                    }},
                    FormaDespejada { var: "a", latex: "a = \\dfrac{v - v_0}{t}", prioridad: 1, f: |v| {
                        if !nz(v.g("t")) { return Despeje::NoAplica; }
                        Despeje::ok((v.g("v") - v.g("v0")) / v.g("t"), format!("a = \\dfrac{{{} - {}}}{{{}}}", par(v.g("v")), par(v.g("v0")), par(v.g("t"))))
                    }},
                    FormaDespejada { var: "t", latex: "t = \\dfrac{v - v_0}{a}", prioridad: 1, f: |v| {
                        if !nz(v.g("a")) { return Despeje::NoAplica; }
                        Despeje::ok((v.g("v") - v.g("v0")) / v.g("a"), format!("t = \\dfrac{{{} - {}}}{{{}}}", par(v.g("v")), par(v.g("v0")), par(v.g("a"))))
                    }},
                ],
            },
            Ecuacion {
                id: "mrua2",
                latex: "\\Delta x = v_0\\,t + \\tfrac{1}{2}\\,a\\,t^2",
                vars: &["dx", "v0", "a", "t"],
                cuando: None,
                residuo: |v| (v.g("dx"), v.g("v0") * v.g("t") + 0.5 * v.g("a") * v.g("t").powi(2)),
                despejes: vec![
                    FormaDespejada { var: "dx", latex: "\\Delta x = v_0\\,t + \\tfrac{1}{2}\\,a\\,t^2", prioridad: 1, f: |v| {
                        let (v0, a, t) = (v.g("v0"), v.g("a"), v.g("t"));
                        Despeje::ok(v0 * t + 0.5 * a * t * t, format!("\\Delta x = {}\\cdot {} + \\tfrac{{1}}{{2}}\\cdot {}\\cdot {}^2", par(v0), par(t), par(a), par(t)))
                    }},
                    FormaDespejada { var: "v0", latex: "v_0 = \\dfrac{\\Delta x - \\tfrac{1}{2}\\,a\\,t^2}{t}", prioridad: 1, f: |v| {
                        let (dx, a, t) = (v.g("dx"), v.g("a"), v.g("t"));
                        if !nz(t) { return Despeje::NoAplica; }
                        Despeje::ok((dx - 0.5 * a * t * t) / t, format!("v_0 = \\dfrac{{{} - \\tfrac{{1}}{{2}}\\cdot {}\\cdot {}^2}}{{{}}}", par(dx), par(a), par(t), par(t)))
                    }},
                    FormaDespejada { var: "a", latex: "a = \\dfrac{2\\,(\\Delta x - v_0\\,t)}{t^2}", prioridad: 1, f: |v| {
                        let (dx, v0, t) = (v.g("dx"), v.g("v0"), v.g("t"));
                        if !nz(t) { return Despeje::NoAplica; }
                        Despeje::ok(2.0 * (dx - v0 * t) / (t * t), format!("a = \\dfrac{{2\\,({} - {}\\cdot {})}}{{{}^2}}", par(dx), par(v0), par(t), par(t)))
                    }},
                    FormaDespejada { var: "t", latex: "\\tfrac{1}{2}\\,a\\,t^2 + v_0\\,t - \\Delta x = 0 \\;\\Rightarrow\\; t = \\dfrac{-v_0 \\pm \\sqrt{v_0^2 + 2\\,a\\,\\Delta x}}{a}", prioridad: 2, f: |v| {
                        let (dx, v0, a) = (v.g("dx"), v.g("v0"), v.g("a"));
                        let r = raices_positivas(0.5 * a, v0, -dx);
                        if r.is_empty() { return Despeje::Imposible(NO_LLEGA.into()); }
                        let s = if nz(a) {
                            format!("t = \\dfrac{{-{} \\pm \\sqrt{{{}^2 + 2\\cdot {}\\cdot {}}}}}{{{}}}", par(v0), par(v0), par(a), par(dx), par(a))
                        } else {
                            format!("t = \\dfrac{{{}}}{{{}}}\\quad (a = 0)", par(dx), par(v0))
                        };
                        match r.get(1) {
                            Some(r2) => Despeje::con_nota(r[0], s, format!("La ecuación cuadrática tiene otra raíz positiva: t = {} s. Se usa la primera vez que el móvil llega a esa posición.", txt(*r2))),
                            None => Despeje::ok(r[0], s),
                        }
                    }},
                ],
            },
            Ecuacion {
                id: "mrua3",
                latex: "v^2 = v_0^2 + 2\\,a\\,\\Delta x",
                vars: &["v", "v0", "a", "dx"],
                cuando: None,
                residuo: |v| (v.g("v").powi(2), v.g("v0").powi(2) + 2.0 * v.g("a") * v.g("dx")),
                despejes: vec![
                    FormaDespejada { var: "v", latex: "v = \\pm\\sqrt{v_0^2 + 2\\,a\\,\\Delta x}", prioridad: 3, f: |v| {
                        let (v0, a, dx) = (v.g("v0"), v.g("a"), v.g("dx"));
                        let rad = v0 * v0 + 2.0 * a * dx;
                        if rad < -1e-9 { return Despeje::Imposible(NO_LLEGA.into()); }
                        let s = if nz(v0) { sgn(v0) } else { sgn(a) };
                        Despeje::con_nota(s * rad.max(0.0).sqrt(), format!("v = \\pm\\sqrt{{{}^2 + 2\\cdot {}\\cdot {}}}", par(v0), par(a), par(dx)), "Se toma el signo del sentido del movimiento (se supone que el móvil no se devuelve).")
                    }},
                    FormaDespejada { var: "v0", latex: "v_0 = \\pm\\sqrt{v^2 - 2\\,a\\,\\Delta x}", prioridad: 3, f: |v| {
                        let (vf, a, dx) = (v.g("v"), v.g("a"), v.g("dx"));
                        let rad = vf * vf - 2.0 * a * dx;
                        if rad < -1e-9 { return Despeje::Imposible(NO_LLEGA.into()); }
                        let s = if nz(vf) { sgn(vf) } else { -sgn(a) };
                        Despeje::con_nota(s * rad.max(0.0).sqrt(), format!("v_0 = \\pm\\sqrt{{{}^2 - 2\\cdot {}\\cdot {}}}", par(vf), par(a), par(dx)), "Se toma el signo del sentido del movimiento (se supone que el móvil no se devuelve).")
                    }},
                    FormaDespejada { var: "a", latex: "a = \\dfrac{v^2 - v_0^2}{2\\,\\Delta x}", prioridad: 1, f: |v| {
                        let (vf, v0, dx) = (v.g("v"), v.g("v0"), v.g("dx"));
                        if !nz(dx) { return Despeje::NoAplica; }
                        Despeje::ok((vf * vf - v0 * v0) / (2.0 * dx), format!("a = \\dfrac{{{}^2 - {}^2}}{{2\\cdot {}}}", par(vf), par(v0), par(dx)))
                    }},
                    FormaDespejada { var: "dx", latex: "\\Delta x = \\dfrac{v^2 - v_0^2}{2\\,a}", prioridad: 1, f: |v| {
                        let (vf, v0, a) = (v.g("v"), v.g("v0"), v.g("a"));
                        if !nz(a) { return Despeje::NoAplica; }
                        Despeje::ok((vf * vf - v0 * v0) / (2.0 * a), format!("\\Delta x = \\dfrac{{{}^2 - {}^2}}{{2\\cdot {}}}", par(vf), par(v0), par(a)))
                    }},
                ],
            },
            Ecuacion {
                id: "mrua4",
                latex: "\\Delta x = \\tfrac{1}{2}\\,(v_0 + v)\\,t",
                vars: &["dx", "v0", "v", "t"],
                cuando: None,
                residuo: |v| (v.g("dx"), 0.5 * (v.g("v0") + v.g("v")) * v.g("t")),
                despejes: vec![
                    FormaDespejada { var: "dx", latex: "\\Delta x = \\tfrac{1}{2}\\,(v_0 + v)\\,t", prioridad: 1, f: |v| {
                        let (v0, vf, t) = (v.g("v0"), v.g("v"), v.g("t"));
                        Despeje::ok(0.5 * (v0 + vf) * t, format!("\\Delta x = \\tfrac{{1}}{{2}}\\,({} + {})\\cdot {}", par(v0), par(vf), par(t)))
                    }},
                    FormaDespejada { var: "v0", latex: "v_0 = \\dfrac{2\\,\\Delta x}{t} - v", prioridad: 1, f: |v| {
                        let (dx, vf, t) = (v.g("dx"), v.g("v"), v.g("t"));
                        if !nz(t) { return Despeje::NoAplica; }
                        Despeje::ok(2.0 * dx / t - vf, format!("v_0 = \\dfrac{{2\\cdot {}}}{{{}}} - {}", par(dx), par(t), par(vf)))
                    }},
                    FormaDespejada { var: "v", latex: "v = \\dfrac{2\\,\\Delta x}{t} - v_0", prioridad: 1, f: |v| {
                        let (dx, v0, t) = (v.g("dx"), v.g("v0"), v.g("t"));
                        if !nz(t) { return Despeje::NoAplica; }
                        Despeje::ok(2.0 * dx / t - v0, format!("v = \\dfrac{{2\\cdot {}}}{{{}}} - {}", par(dx), par(t), par(v0)))
                    }},
                    FormaDespejada { var: "t", latex: "t = \\dfrac{2\\,\\Delta x}{v_0 + v}", prioridad: 1, f: |v| {
                        let (dx, v0, vf) = (v.g("dx"), v.g("v0"), v.g("v"));
                        if !nz(v0 + vf) { return Despeje::NoAplica; }
                        Despeje::ok(2.0 * dx / (v0 + vf), format!("t = \\dfrac{{2\\cdot {}}}{{{} + {}}}", par(dx), par(v0), par(vf)))
                    }},
                ],
            },
        ],
        ejemplos: vec![
            Ejemplo { titulo: "Arranque en el semáforo", enunciado: "Un carro parte del reposo en un semáforo de la Alameda Roosevelt y acelera a 3 m/s² durante 8 s. ¿Qué distancia recorre y cuál es su velocidad final?", datos: vec![("v0", 0.0), ("a", 3.0), ("t", 8.0)], pide: vec!["dx", "v"] },
            Ejemplo { titulo: "Frenado en la carretera", enunciado: "Un pick-up va a 25 m/s y frena con aceleración constante hasta detenerse en 50 m. ¿Cuál fue su aceleración y cuánto tardó en detenerse?", datos: vec![("v0", 25.0), ("v", 0.0), ("dx", 50.0)], pide: vec!["a", "t"] },
            Ejemplo { titulo: "Moto en la Panamericana", enunciado: "Una moto que va a 10 m/s acelera a 2 m/s² hasta alcanzar 30 m/s. ¿Qué distancia recorrió y en cuánto tiempo?", datos: vec![("v0", 10.0), ("a", 2.0), ("v", 30.0)], pide: vec!["dx", "t"] },
        ],
    }
}
