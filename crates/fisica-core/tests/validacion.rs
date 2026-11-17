//! Pruebas de validación del motor: ejemplos contra cálculos a mano, casos de error,
//! simulación, lecciones y que cada escenario del juego se pueda ganar.

use fisica_core::juego::{self, EntradaSugerencia, EntradaTiro};
use fisica_core::leccion::{generar, EntradaLeccion};
use fisica_core::modelo::Valores;
use fisica_core::modelos::{self, G};
use fisica_core::movimiento::desde_modelo;
use fisica_core::solver::{resolver, Entrada};

fn resolver_con(modelo: &str, datos: &[(&str, f64)]) -> fisica_core::solver::Solucion {
    let m = modelos::por_id(modelo).unwrap();
    let mut d: Valores = datos.iter().map(|(k, v)| (k.to_string(), *v)).collect();
    for var in &m.variables {
        if let Some(def) = var.defecto {
            d.entry(var.id.into()).or_insert(def);
        }
    }
    resolver(
        m,
        &Entrada {
            modelo: modelo.into(),
            datos: d,
            incognitas: vec![],
        },
    )
}

fn cerca(a: f64, b: f64) -> bool {
    (a - b).abs() <= 1e-9 * b.abs().max(1.0)
}

#[test]
fn ejemplos_coinciden_con_calculo_a_mano() {
    let r = |x: f64| x.to_radians();
    let vy = 15.0 * r(37.0).sin();
    let tv = (vy + (vy * vy + 2.0 * G * 25.0).sqrt()) / G;
    let casos: Vec<(&str, usize, Vec<(&str, f64)>)> = vec![
        ("mru", 0, vec![("dx", 600.0)]),
        ("mru", 1, vec![("v", 8.0)]),
        ("mru", 2, vec![("t", 360.0)]),
        ("mrua", 0, vec![("dx", 96.0), ("v", 24.0)]),
        ("mrua", 1, vec![("a", -6.25), ("t", 4.0)]),
        ("mrua", 2, vec![("dx", 200.0), ("t", 10.0)]),
        (
            "parabolico",
            0,
            vec![
                ("hmax", (20.0 * r(45.0).sin()).powi(2) / (2.0 * G)),
                ("tv", 2.0 * 20.0 * r(45.0).sin() / G),
                ("R", 400.0 / G),
            ],
        ),
        (
            "parabolico",
            1,
            vec![("v0", (80.0 * G / r(60.0).sin()).sqrt())],
        ),
        (
            "parabolico",
            2,
            vec![("tv", tv), ("R", 15.0 * r(37.0).cos() * tv)],
        ),
    ];
    for (modelo, i, esperado) in casos {
        let m = modelos::por_id(modelo).unwrap();
        let ej = &m.ejemplos[i];
        let sol = resolver_con(modelo, &ej.datos);
        assert!(
            sol.inconsistencias.is_empty(),
            "{modelo} {i}: inconsistente"
        );
        for (var, val) in esperado {
            let obtenido = sol.valores[var];
            assert!(
                cerca(obtenido, val),
                "{modelo} ej {i}: {var} = {obtenido}, se esperaba {val}"
            );
        }
    }
}

#[test]
fn datos_insuficientes() {
    let sol = resolver_con("mrua", &[("v0", 10.0)]);
    assert!(sol.pasos.is_empty());
}

#[test]
fn datos_inconsistentes() {
    let sol = resolver_con("mrua", &[("v0", 10.0), ("a", 2.0), ("t", 5.0), ("v", 30.0)]);
    assert!(!sol.inconsistencias.is_empty());
}

#[test]
fn tiempo_negativo_se_descarta() {
    let sol = resolver_con("mrua", &[("v0", 10.0), ("v", 20.0), ("a", -2.0)]);
    assert!(!sol.valores.contains_key("t"));
    assert!(sol.avisos.iter().any(|a| a.contains("negativo")));
}

#[test]
fn alcance_imposible() {
    let sol = resolver_con("parabolico", &[("v0", 10.0), ("R", 30.0)]);
    assert!(!sol.valores.contains_key("theta"));
    assert!(sol.avisos.iter().any(|a| a.contains("alcance máximo")));
}

#[test]
fn angulo_desde_alcance_da_dos_soluciones() {
    let sol = resolver_con("parabolico", &[("v0", 20.0), ("R", 30.0)]);
    let paso = sol.pasos.iter().find(|p| p.variable == "theta").unwrap();
    assert!(paso.nota.as_ref().unwrap().contains("Otro ángulo"));
}

#[test]
fn validacion_de_rangos() {
    let sol = resolver_con("parabolico", &[("v0", 10.0), ("theta", 120.0)]);
    assert!(sol.errores.contains_key("theta"));
    let sol = resolver_con("mru", &[("t", -3.0), ("v", 2.0)]);
    assert!(sol.errores.contains_key("t"));
}

#[test]
fn simulacion_termina_donde_dice_la_solucion() {
    for m in modelos::todos() {
        for ej in &m.ejemplos {
            let sol = resolver_con(m.id, &ej.datos);
            let mov = desde_modelo(m.id, &sol.valores).unwrap();
            let fin = mov.estado(mov.t_max);
            match m.id {
                "mru" | "mrua" => assert!(cerca(fin.x, sol.valores["dx"])),
                _ => {
                    assert!(cerca(fin.x, sol.valores["R"]));
                    assert!(fin.y.abs() < 1e-9);
                    let arriba = mov.estado(sol.valores["ts"]);
                    assert!(cerca(arriba.y, sol.valores["hmax"]));
                }
            }
        }
    }
}

#[test]
fn lecciones_se_generan() {
    for m in modelos::todos() {
        let l = generar(&EntradaLeccion {
            modelo: m.id.into(),
            datos: None,
            incognitas: vec![],
            enunciado: None,
        })
        .unwrap();
        assert!(l.escenas.len() >= 6, "{}: pocas escenas", m.id);
        assert!(!l.propio);
    }
    // Con datos propios
    let datos: Valores = [
        ("v0".to_string(), 12.0),
        ("theta".to_string(), 60.0),
        ("h0".to_string(), 2.0),
    ]
    .into();
    let l = generar(&EntradaLeccion {
        modelo: "parabolico".into(),
        datos: Some(datos),
        incognitas: vec!["R".into()],
        enunciado: None,
    })
    .unwrap();
    assert!(l.propio);
    assert!(l
        .escenas
        .iter()
        .any(|e| e.paso.as_ref().map_or(false, |p| p.variable == "R")));
}

/// Cada escenario se puede ganar siguiendo el "tiro perfecto" que sugiere el juego.
#[test]
fn cada_escenario_se_puede_ganar() {
    for esc in juego::escenarios() {
        for (j, _) in esc.lanzadores.iter().enumerate() {
            let mut activos: Vec<String> = esc.objetivos.iter().map(|o| o.id.clone()).collect();
            let mios = |act: &Vec<String>| {
                act.iter()
                    .filter(|id| {
                        esc.objetivos
                            .iter()
                            .any(|o| &o.id == *id && o.dueno.map_or(true, |d| d != j))
                    })
                    .count()
            };
            let mut tiros = 0;
            let mut angulo = 45.0;
            while mios(&activos) > 0 {
                tiros += 1;
                assert!(tiros <= 8, "{} jugador {}: no se pudo ganar", esc.id, j + 1);
                let s = juego::sugerir(&EntradaSugerencia {
                    escenario: esc.id.into(),
                    jugador: j,
                    angulo,
                    activos: Some(activos.clone()),
                    objetivo: None,
                })
                .unwrap();
                assert!(
                    s.posible,
                    "{} jugador {}: sin sugerencia ({:?})",
                    esc.id,
                    j + 1,
                    s.aviso
                );
                angulo = s.angulo;
                let r = juego::lanzar(&EntradaTiro {
                    escenario: esc.id.into(),
                    jugador: j,
                    angulo: s.angulo,
                    rapidez: s.rapidez,
                    activos: Some(activos.clone()),
                    numero: tiros,
                })
                .unwrap();
                assert!(
                    !r.derribados.is_empty(),
                    "{} jugador {}: el tiro sugerido no derribó nada",
                    esc.id,
                    j + 1
                );
                activos.retain(|id| !r.derribados.contains(id));
            }
        }
    }
}

#[test]
fn tiro_que_choca_con_el_muro() {
    let r = juego::lanzar(&EntradaTiro {
        escenario: "latas-3".into(),
        jugador: 0,
        angulo: 30.0,
        rapidez: 15.0,
        activos: None,
        numero: 1,
    })
    .unwrap();
    assert_eq!(r.fin.tipo, "obstaculo");
    assert_eq!(r.analisis.resultado, "obstaculo");
}

#[test]
fn mango_cae_en_caida_libre() {
    let s = juego::sugerir(&EntradaSugerencia {
        escenario: "mangos-1".into(),
        jugador: 0,
        angulo: 45.0,
        activos: None,
        objetivo: None,
    })
    .unwrap();
    let r = juego::lanzar(&EntradaTiro {
        escenario: "mangos-1".into(),
        jugador: 0,
        angulo: s.angulo,
        rapidez: s.rapidez,
        activos: None,
        numero: 1,
    })
    .unwrap();
    let c = r
        .impactos
        .iter()
        .find_map(|i| i.caida.clone())
        .expect("debe caer un mango");
    assert!(cerca(c.tiempo, (2.0 * c.altura / G).sqrt()));
}
