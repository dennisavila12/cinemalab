//! Lanzamiento parabólico desde una altura h₀ (MRU en x + MRUA en y).

use super::{nz, G};
use crate::formato::{num, par, rad, raices_positivas, txt};
use crate::modelo::*;

fn sind(a: f64) -> f64 {
    rad(a).sin()
}
fn cosd(a: f64) -> f64 {
    rad(a).cos()
}
fn tand(a: f64) -> f64 {
    rad(a).tan()
}
fn grados(x: f64) -> f64 {
    x.to_degrees()
}

fn h0_cero(v: &V) -> bool {
    v.tiene("h0") && v.g("h0").abs() < 1e-12
}

pub fn modelo() -> Modelo {
    Modelo {
        id: "parabolico",
        corto: "Parabólico",
        nombre: "Lanzamiento parabólico",
        descripcion: "Se lanza con rapidez v₀ y ángulo θ sobre la horizontal desde una altura h₀. En x es un MRU y en y un MRUA con a = −g.",
        dimension: Dimension::Plano,
        variables: vec![
            Variable { min: Some(0.0), estricto: true, ..Variable::libre("v0", "v_0", "Rapidez inicial", "m/s") },
            Variable { min: Some(0.0), max: Some(90.0), ..Variable::libre("theta", "\\theta", "Ángulo de lanzamiento", "°") },
            Variable { defecto: Some(0.0), ..Variable::no_negativa("h0", "h_0", "Altura inicial", "m") },
            Variable::no_negativa("v0x", "v_{0x}", "Componente horizontal", "m/s"),
            Variable::no_negativa("v0y", "v_{0y}", "Componente vertical", "m/s"),
            Variable::no_negativa("ts", "t_s", "Tiempo de subida", "s"),
            Variable::no_negativa("hmax", "h_{\\max}", "Altura máxima (desde el suelo)", "m"),
            Variable::no_negativa("tv", "t_v", "Tiempo de vuelo", "s"),
            Variable::no_negativa("R", "R", "Alcance horizontal", "m"),
            Variable { min: Some(0.0), estricto: true, defecto: Some(G), ..Variable::libre("g", "g", "Gravedad", "m/s²") },
        ],
        ecuaciones: vec![
            Ecuacion {
                id: "lp1", latex: "v_{0x} = v_0\\cos\\theta", vars: &["v0x", "v0", "theta"], cuando: None,
                residuo: |v| (v.g("v0x"), v.g("v0") * cosd(v.g("theta"))),
                despejes: vec![
                    FormaDespejada { var: "v0x", latex: "v_{0x} = v_0\\cos\\theta", prioridad: 1, f: |v| {
                        Despeje::ok(v.g("v0") * cosd(v.g("theta")), format!("v_{{0x}} = {}\\cos {}^\\circ", par(v.g("v0")), num(v.g("theta"))))
                    }},
                    FormaDespejada { var: "v0", latex: "v_0 = \\dfrac{v_{0x}}{\\cos\\theta}", prioridad: 1, f: |v| {
                        if v.g("theta") >= 90.0 { return Despeje::NoAplica; }
                        Despeje::ok(v.g("v0x") / cosd(v.g("theta")), format!("v_0 = \\dfrac{{{}}}{{\\cos {}^\\circ}}", par(v.g("v0x")), num(v.g("theta"))))
                    }},
                    FormaDespejada { var: "theta", latex: "\\theta = \\arccos\\dfrac{v_{0x}}{v_0}", prioridad: 2, f: |v| {
                        let (vx, v0) = (v.g("v0x"), v.g("v0"));
                        if !nz(v0) || vx > v0 { return Despeje::NoAplica; }
                        Despeje::ok(grados((vx / v0).acos()), format!("\\theta = \\arccos\\dfrac{{{}}}{{{}}}", par(vx), par(v0)))
                    }},
                ],
            },
            Ecuacion {
                id: "lp2", latex: "v_{0y} = v_0\\operatorname{sen}\\theta", vars: &["v0y", "v0", "theta"], cuando: None,
                residuo: |v| (v.g("v0y"), v.g("v0") * sind(v.g("theta"))),
                despejes: vec![
                    FormaDespejada { var: "v0y", latex: "v_{0y} = v_0\\operatorname{sen}\\theta", prioridad: 1, f: |v| {
                        Despeje::ok(v.g("v0") * sind(v.g("theta")), format!("v_{{0y}} = {}\\operatorname{{sen}} {}^\\circ", par(v.g("v0")), num(v.g("theta"))))
                    }},
                    FormaDespejada { var: "v0", latex: "v_0 = \\dfrac{v_{0y}}{\\operatorname{sen}\\theta}", prioridad: 1, f: |v| {
                        if v.g("theta") <= 0.0 { return Despeje::NoAplica; }
                        Despeje::ok(v.g("v0y") / sind(v.g("theta")), format!("v_0 = \\dfrac{{{}}}{{\\operatorname{{sen}} {}^\\circ}}", par(v.g("v0y")), num(v.g("theta"))))
                    }},
                    FormaDespejada { var: "theta", latex: "\\theta = \\arcsin\\dfrac{v_{0y}}{v_0}", prioridad: 2, f: |v| {
                        let (vy, v0) = (v.g("v0y"), v.g("v0"));
                        if !nz(v0) || vy > v0 { return Despeje::NoAplica; }
                        Despeje::ok(grados((vy / v0).asin()), format!("\\theta = \\arcsin\\dfrac{{{}}}{{{}}}", par(vy), par(v0)))
                    }},
                ],
            },
            Ecuacion {
                id: "lp3", latex: "v_0 = \\sqrt{v_{0x}^2 + v_{0y}^2}", vars: &["v0", "v0x", "v0y"], cuando: None,
                residuo: |v| (v.g("v0").powi(2), v.g("v0x").powi(2) + v.g("v0y").powi(2)),
                despejes: vec![
                    FormaDespejada { var: "v0", latex: "v_0 = \\sqrt{v_{0x}^2 + v_{0y}^2}", prioridad: 2, f: |v| {
                        Despeje::ok(v.g("v0x").hypot(v.g("v0y")), format!("v_0 = \\sqrt{{{}^2 + {}^2}}", par(v.g("v0x")), par(v.g("v0y"))))
                    }},
                    FormaDespejada { var: "v0x", latex: "v_{0x} = \\sqrt{v_0^2 - v_{0y}^2}", prioridad: 2, f: |v| {
                        let (v0, vy) = (v.g("v0"), v.g("v0y"));
                        if vy > v0 { return Despeje::NoAplica; }
                        Despeje::ok((v0 * v0 - vy * vy).sqrt(), format!("v_{{0x}} = \\sqrt{{{}^2 - {}^2}}", par(v0), par(vy)))
                    }},
                    FormaDespejada { var: "v0y", latex: "v_{0y} = \\sqrt{v_0^2 - v_{0x}^2}", prioridad: 2, f: |v| {
                        let (v0, vx) = (v.g("v0"), v.g("v0x"));
                        if vx > v0 { return Despeje::NoAplica; }
                        Despeje::ok((v0 * v0 - vx * vx).sqrt(), format!("v_{{0y}} = \\sqrt{{{}^2 - {}^2}}", par(v0), par(vx)))
                    }},
                ],
            },
            Ecuacion {
                id: "lp4", latex: "\\tan\\theta = \\dfrac{v_{0y}}{v_{0x}}", vars: &["theta", "v0y", "v0x"], cuando: None,
                residuo: |v| (v.g("v0x") * tand(v.g("theta")), v.g("v0y")),
                despejes: vec![
                    FormaDespejada { var: "theta", latex: "\\theta = \\arctan\\dfrac{v_{0y}}{v_{0x}}", prioridad: 1, f: |v| {
                        Despeje::ok(grados(v.g("v0y").atan2(v.g("v0x"))), format!("\\theta = \\arctan\\dfrac{{{}}}{{{}}}", par(v.g("v0y")), par(v.g("v0x"))))
                    }},
                    FormaDespejada { var: "v0y", latex: "v_{0y} = v_{0x}\\tan\\theta", prioridad: 1, f: |v| {
                        if v.g("theta") >= 90.0 { return Despeje::NoAplica; }
                        Despeje::ok(v.g("v0x") * tand(v.g("theta")), format!("v_{{0y}} = {}\\tan {}^\\circ", par(v.g("v0x")), num(v.g("theta"))))
                    }},
                    FormaDespejada { var: "v0x", latex: "v_{0x} = \\dfrac{v_{0y}}{\\tan\\theta}", prioridad: 1, f: |v| {
                        if v.g("theta") <= 0.0 { return Despeje::NoAplica; }
                        Despeje::ok(v.g("v0y") / tand(v.g("theta")), format!("v_{{0x}} = \\dfrac{{{}}}{{\\tan {}^\\circ}}", par(v.g("v0y")), num(v.g("theta"))))
                    }},
                ],
            },
            Ecuacion {
                id: "lp5", latex: "t_s = \\dfrac{v_{0y}}{g}", vars: &["ts", "v0y", "g"], cuando: None,
                residuo: |v| (v.g("ts"), v.g("v0y") / v.g("g")),
                despejes: vec![
                    FormaDespejada { var: "ts", latex: "t_s = \\dfrac{v_{0y}}{g}", prioridad: 1, f: |v| {
                        Despeje::ok(v.g("v0y") / v.g("g"), format!("t_s = \\dfrac{{{}}}{{{}}}", par(v.g("v0y")), par(v.g("g"))))
                    }},
                    FormaDespejada { var: "v0y", latex: "v_{0y} = g\\,t_s", prioridad: 1, f: |v| {
                        Despeje::ok(v.g("g") * v.g("ts"), format!("v_{{0y}} = {}\\cdot {}", par(v.g("g")), par(v.g("ts"))))
                    }},
                ],
            },
            Ecuacion {
                id: "lp6", latex: "h_{\\max} = h_0 + \\dfrac{v_{0y}^2}{2g}", vars: &["hmax", "h0", "v0y", "g"], cuando: None,
                residuo: |v| (v.g("hmax"), v.g("h0") + v.g("v0y").powi(2) / (2.0 * v.g("g"))),
                despejes: vec![
                    FormaDespejada { var: "hmax", latex: "h_{\\max} = h_0 + \\dfrac{v_{0y}^2}{2g}", prioridad: 1, f: |v| {
                        Despeje::ok(v.g("h0") + v.g("v0y").powi(2) / (2.0 * v.g("g")), format!("h_{{\\max}} = {} + \\dfrac{{{}^2}}{{2\\cdot {}}}", par(v.g("h0")), par(v.g("v0y")), par(v.g("g"))))
                    }},
                    FormaDespejada { var: "v0y", latex: "v_{0y} = \\sqrt{2g\\,(h_{\\max} - h_0)}", prioridad: 2, f: |v| {
                        let (hm, h0, g) = (v.g("hmax"), v.g("h0"), v.g("g"));
                        if hm < h0 { return Despeje::Imposible("La altura máxima no puede ser menor que la altura inicial.".into()); }
                        Despeje::ok((2.0 * g * (hm - h0)).sqrt(), format!("v_{{0y}} = \\sqrt{{2\\cdot {}\\,({} - {})}}", par(g), par(hm), par(h0)))
                    }},
                    FormaDespejada { var: "h0", latex: "h_0 = h_{\\max} - \\dfrac{v_{0y}^2}{2g}", prioridad: 1, f: |v| {
                        Despeje::ok(v.g("hmax") - v.g("v0y").powi(2) / (2.0 * v.g("g")), format!("h_0 = {} - \\dfrac{{{}^2}}{{2\\cdot {}}}", par(v.g("hmax")), par(v.g("v0y")), par(v.g("g"))))
                    }},
                ],
            },
            Ecuacion {
                id: "lp7", latex: "h_0 + v_{0y}\\,t_v - \\tfrac{1}{2}\\,g\\,t_v^2 = 0", vars: &["tv", "h0", "v0y", "g"], cuando: None,
                residuo: |v| (v.g("h0") + v.g("v0y") * v.g("tv"), 0.5 * v.g("g") * v.g("tv").powi(2)),
                despejes: vec![
                    FormaDespejada { var: "tv", latex: "t_v = \\dfrac{v_{0y} + \\sqrt{v_{0y}^2 + 2\\,g\\,h_0}}{g}", prioridad: 1, f: |v| {
                        let (vy, h0, g) = (v.g("v0y"), v.g("h0"), v.g("g"));
                        let r = raices_positivas(0.5 * g, -vy, -h0);
                        match r.last() {
                            Some(t) => Despeje::ok(*t, format!("t_v = \\dfrac{{{} + \\sqrt{{{}^2 + 2\\cdot {}\\cdot {}}}}}{{{}}}", par(vy), par(vy), par(g), par(h0), par(g))),
                            None => Despeje::NoAplica,
                        }
                    }},
                    FormaDespejada { var: "v0y", latex: "v_{0y} = \\dfrac{\\tfrac{1}{2}\\,g\\,t_v^2 - h_0}{t_v}", prioridad: 1, f: |v| {
                        let (tv, h0, g) = (v.g("tv"), v.g("h0"), v.g("g"));
                        if !nz(tv) { return Despeje::NoAplica; }
                        Despeje::ok((0.5 * g * tv * tv - h0) / tv, format!("v_{{0y}} = \\dfrac{{\\tfrac{{1}}{{2}}\\cdot {}\\cdot {}^2 - {}}}{{{}}}", par(g), par(tv), par(h0), par(tv)))
                    }},
                    FormaDespejada { var: "h0", latex: "h_0 = \\tfrac{1}{2}\\,g\\,t_v^2 - v_{0y}\\,t_v", prioridad: 1, f: |v| {
                        let (tv, vy, g) = (v.g("tv"), v.g("v0y"), v.g("g"));
                        Despeje::ok(0.5 * g * tv * tv - vy * tv, format!("h_0 = \\tfrac{{1}}{{2}}\\cdot {}\\cdot {}^2 - {}\\cdot {}", par(g), par(tv), par(vy), par(tv)))
                    }},
                ],
            },
            Ecuacion {
                id: "lp8", latex: "R = v_{0x}\\,t_v", vars: &["R", "v0x", "tv"], cuando: None,
                residuo: |v| (v.g("R"), v.g("v0x") * v.g("tv")),
                despejes: vec![
                    FormaDespejada { var: "R", latex: "R = v_{0x}\\,t_v", prioridad: 1, f: |v| {
                        Despeje::ok(v.g("v0x") * v.g("tv"), format!("R = {}\\cdot {}", par(v.g("v0x")), par(v.g("tv"))))
                    }},
                    FormaDespejada { var: "v0x", latex: "v_{0x} = \\dfrac{R}{t_v}", prioridad: 1, f: |v| {
                        if !nz(v.g("tv")) { return Despeje::NoAplica; }
                        Despeje::ok(v.g("R") / v.g("tv"), format!("v_{{0x}} = \\dfrac{{{}}}{{{}}}", par(v.g("R")), par(v.g("tv"))))
                    }},
                    FormaDespejada { var: "tv", latex: "t_v = \\dfrac{R}{v_{0x}}", prioridad: 1, f: |v| {
                        if !nz(v.g("v0x")) { return Despeje::NoAplica; }
                        Despeje::ok(v.g("R") / v.g("v0x"), format!("t_v = \\dfrac{{{}}}{{{}}}", par(v.g("R")), par(v.g("v0x"))))
                    }},
                ],
            },
            Ecuacion {
                // Fórmula del alcance: solo vale si sale y cae al mismo nivel (h₀ = 0)
                id: "lp9", latex: "R = \\dfrac{v_0^2\\operatorname{sen}(2\\theta)}{g}\\quad(h_0 = 0)", vars: &["R", "v0", "theta", "g"], cuando: Some(h0_cero),
                residuo: |v| (v.g("R"), v.g("v0").powi(2) * sind(2.0 * v.g("theta")) / v.g("g")),
                despejes: vec![
                    FormaDespejada { var: "R", latex: "R = \\dfrac{v_0^2\\operatorname{sen}(2\\theta)}{g}", prioridad: 3, f: |v| {
                        Despeje::ok(v.g("v0").powi(2) * sind(2.0 * v.g("theta")) / v.g("g"), format!("R = \\dfrac{{{}^2\\operatorname{{sen}}(2\\cdot {}^\\circ)}}{{{}}}", par(v.g("v0")), num(v.g("theta")), par(v.g("g"))))
                    }},
                    FormaDespejada { var: "v0", latex: "v_0 = \\sqrt{\\dfrac{R\\,g}{\\operatorname{sen}(2\\theta)}}", prioridad: 2, f: |v| {
                        let s2 = sind(2.0 * v.g("theta"));
                        if s2 <= 1e-9 { return Despeje::NoAplica; }
                        Despeje::ok((v.g("R") * v.g("g") / s2).sqrt(), format!("v_0 = \\sqrt{{\\dfrac{{{}\\cdot {}}}{{\\operatorname{{sen}}(2\\cdot {}^\\circ)}}}}", par(v.g("R")), par(v.g("g")), num(v.g("theta"))))
                    }},
                    FormaDespejada { var: "theta", latex: "\\theta = \\tfrac{1}{2}\\arcsin\\dfrac{R\\,g}{v_0^2}", prioridad: 2, f: |v| {
                        let (r, g, v0) = (v.g("R"), v.g("g"), v.g("v0"));
                        if !nz(v0) { return Despeje::NoAplica; }
                        let k = r * g / (v0 * v0);
                        if k > 1.0 + 1e-12 {
                            return Despeje::Imposible(format!("Con v₀ = {} m/s el alcance máximo posible (a 45°) es v₀²/g = {} m, menor que R = {} m.", txt(v0), txt(v0 * v0 / g), txt(r)));
                        }
                        let th = grados(k.min(1.0).asin()) / 2.0;
                        let s = format!("\\theta = \\tfrac{{1}}{{2}}\\arcsin\\dfrac{{{}\\cdot {}}}{{{}^2}}", par(r), par(g), par(v0));
                        if (th - 45.0).abs() > 1e-6 {
                            Despeje::con_nota(th, s, format!("Otro ángulo da el mismo alcance: θ = 90° − {}° = {}°. Se usa el menor.", txt(th), txt(90.0 - th)))
                        } else {
                            Despeje::ok(th, s)
                        }
                    }},
                ],
            },
        ],
        ejemplos: vec![
            Ejemplo { titulo: "Penal en la cancha", enunciado: "Un balón se patea con 20 m/s a 45° sobre el suelo. Calculá la altura máxima, el tiempo de vuelo y el alcance.", datos: vec![("v0", 20.0), ("theta", 45.0), ("h0", 0.0)], pide: vec!["hmax", "tv", "R"] },
            Ejemplo { titulo: "Cohete de pólvora", enunciado: "En diciembre, un cohete sale a 30° y cae a 80 m de distancia al mismo nivel. ¿Con qué rapidez salió? (Sin contar el empuje.)", datos: vec![("theta", 30.0), ("R", 80.0), ("h0", 0.0)], pide: vec!["v0"] },
            Ejemplo { titulo: "Piedra desde el mirador", enunciado: "Desde un mirador de 25 m de altura en el Cerro Verde se lanza una piedra a 15 m/s con un ángulo de 37°. ¿Cuánto tarda en caer y a qué distancia cae?", datos: vec![("v0", 15.0), ("theta", 37.0), ("h0", 25.0)], pide: vec!["tv", "R"] },
        ],
    }
}
