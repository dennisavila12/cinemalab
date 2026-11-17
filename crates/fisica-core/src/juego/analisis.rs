//! Explicación de cada tiro, con frases salvadoreñas.

use super::escenarios::{Escenario, Lanzador, TipoObjetivo};
use super::tiro::{objetivos_del_jugador, Impacto, Trazo};
use super::G;
use crate::formato::{num, num_dec, txt, txt_dec};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct Bloque {
    pub titulo: String,
    pub texto: String,
    pub formulas: Vec<String>,
}

impl Bloque {
    pub fn new(titulo: impl Into<String>, texto: String, formulas: Vec<String>) -> Self {
        Bloque {
            titulo: titulo.into(),
            texto,
            formulas,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Analisis {
    /// "acierto" | "cerca" | "arriba" | "abajo" | "corto" | "obstaculo"
    pub resultado: &'static str,
    pub frase: String,
    pub veredicto: String,
    pub pasos: Vec<Bloque>,
}

fn elegir<'a>(opciones: &[&'a str], semilla: u64) -> &'a str {
    opciones[(semilla % opciones.len() as u64) as usize]
}

#[allow(clippy::too_many_arguments)]
pub fn analizar(
    esc: &Escenario,
    jugador: usize,
    l: &Lanzador,
    angulo: f64,
    rapidez: f64,
    activos: &[bool],
    trazo: &Trazo,
    impactos: &[Impacto],
    derribados: &[String],
    numero: u32,
) -> Analisis {
    let a = angulo.to_radians();
    let (vx, vy) = (rapidez * a.cos(), rapidez * a.sin());
    let ts = vy / G;
    let hmax = l.y + vy * vy / (2.0 * G);
    let k1 = a.tan();
    let k2 = G / (2.0 * rapidez * rapidez * a.cos().powi(2));
    let semilla = (angulo * 10.0) as u64 + (rapidez * 10.0) as u64 + numero as u64;

    let mut pasos = vec![
        Bloque::new(
            "1. Descomponemos la velocidad inicial",
            format!(
                "En x la piedra va siempre a {} m/s: es un MRU. En y empieza subiendo a {} m/s y la gravedad la frena: es un MRUA con a = −g.",
                txt_dec(vx, 2), txt_dec(vy, 2)
            ),
            vec![
                format!("v_{{0x}} = v_0\\cos\\theta = {}\\cos {}^\\circ = {}\\ \\text{{m/s}}", num(rapidez), num(angulo), num_dec(vx, 2)),
                format!("v_{{0y}} = v_0\\operatorname{{sen}}\\theta = {}\\operatorname{{sen}} {}^\\circ = {}\\ \\text{{m/s}}", num(rapidez), num(angulo), num_dec(vy, 2)),
            ],
        ),
        Bloque::new(
            "2. El punto más alto",
            "Arriba la velocidad vertical es cero, así que:".into(),
            vec![
                format!("t_s = \\dfrac{{v_{{0y}}}}{{g}} = \\dfrac{{{}}}{{{}}} = {}\\ \\text{{s}}", num_dec(vy, 2), num(G), num(ts)),
                format!("h_{{\\max}} = y_0 + \\dfrac{{v_{{0y}}^2}}{{2g}} = {} + \\dfrac{{{}^2}}{{2\\cdot {}}} = {}\\ \\text{{m}}", num(l.y), num_dec(vy, 2), num(G), num_dec(hmax, 2)),
            ],
        ),
        Bloque::new(
            "3. Ecuación de la trayectoria de este tiro",
            "d es la distancia horizontal desde la hondilla:".into(),
            vec![format!("y(d) = {} + {}\\,d - {}\\,d^2", num(l.y), num(k1), num_dec(k2, 4))],
        ),
    ];

    // Objetivo de referencia: el que la trayectoria tenía más cerca
    let cand = objetivos_del_jugador(esc, jugador, activos);
    let altura_en = |d: f64| l.y + k1 * d - k2 * d * d;
    let referencia = cand
        .iter()
        .copied()
        .filter(|&k| l.lado * (esc.objetivos[k].centro().0 - l.x) > 0.0)
        .min_by(|&p, &q| {
            let err = |k: usize| {
                let o = &esc.objetivos[k];
                (altura_en(l.lado * (o.centro().0 - l.x)) - o.centro().1).abs()
            };
            err(p).partial_cmp(&err(q)).unwrap()
        });

    let d_fin = l.lado * (trazo.fin.x - l.x);
    let propios: usize = impactos
        .iter()
        .filter(|i| {
            esc.objetivos
                .iter()
                .any(|o| o.id == i.id && o.dueno == Some(jugador))
        })
        .count();
    let ajenos = derribados.len().saturating_sub(propios);

    let (resultado, frase, veredicto): (&'static str, String, String);
    if !derribados.is_empty() {
        let mangos = impactos
            .iter()
            .filter(|i| i.tipo == TipoObjetivo::Mango)
            .count();
        resultado = "acierto";
        if propios > 0 && ajenos == 0 {
            frase = "¡Te botaste tus propias latas, bicho!".into();
        } else if mangos > 0 {
            frase = elegir(
                &[
                    "¡Cayó el mango! A comerlo con sal y alguashte.",
                    "¡Chivo! Ese mango ya es tuyo.",
                    "¡Qué puntería, vos! Bajaste el mango.",
                ],
                semilla,
            )
            .into();
        } else {
            frase = elegir(
                &[
                    "¡Chivo, cipote! Le diste.",
                    "¡Qué puntería, vos!",
                    "¡Ese sí fue un hondillazo!",
                    "¡Puro tiro de campeón!",
                ],
                semilla,
            )
            .into();
        }
        veredicto = if mangos > 0 {
            format!(
                "Bajaste {} mango{}.",
                mangos,
                if mangos > 1 { "s" } else { "" }
            )
        } else {
            format!(
                "Botaste {} lata{}.",
                derribados.len(),
                if derribados.len() > 1 { "s" } else { "" }
            )
        };
    } else if trazo.fin.tipo == "obstaculo" {
        resultado = "obstaculo";
        let ob = trazo.fin.obstaculo.clone().unwrap_or_default();
        let al = match ob.strip_prefix("el ") {
            Some(resto) => format!("al {resto}"),
            None => format!("a {ob}"),
        };
        frase = elegir(
            &[
                "¡Pum! Directo {al}.",
                "¡Le diste {al}!",
                "¡Ay no! Se topó con {ob}.",
            ],
            semilla,
        )
        .replace("{al}", &al)
        .replace("{ob}", &ob);
        veredicto = format!(
            "Chocó con {ob} a {} m de altura, a {} m de la hondilla.",
            txt_dec(trazo.fin.y, 2),
            txt_dec(d_fin, 2)
        );
    } else if let Some(k) = referencia {
        let o = &esc.objetivos[k];
        let d_obj = l.lado * (o.centro().0 - l.x);
        if d_fin < d_obj - o.w {
            resultado = "corto";
            frase = elegir(
                &[
                    "Se quedó cortito, échele más fuerza.",
                    "Le faltó jugo a ese tiro.",
                ],
                semilla,
            )
            .into();
            veredicto = format!(
                "Cayó a {} m de la hondilla: le faltaron {} m para llegar.",
                txt_dec(d_fin, 2),
                txt_dec(d_obj - d_fin, 2)
            );
        } else {
            let y_en = altura_en(d_obj);
            let (lo, hi) = (o.y, o.y + o.h);
            let falla = if y_en > hi { y_en - hi } else { lo - y_en };
            resultado = if falla < 1.0 {
                "cerca"
            } else if y_en > hi {
                "arriba"
            } else {
                "abajo"
            };
            frase = if falla < 1.0 {
                elegir(
                    &["¡Púchica, casi!", "¡Por un pelito!", "¡Uy, rozó!"],
                    semilla,
                )
                .into()
            } else if y_en > hi {
                elegir(
                    &[
                        "¡Va para San Miguel ese tiro!",
                        "Se fue volando, échele menos fuerza.",
                    ],
                    semilla,
                )
                .into()
            } else {
                "Pasó por debajo. Subile al ángulo o a la fuerza.".into()
            };
            veredicto = if y_en > hi {
                format!("Pasó {} m por encima del objetivo.", txt_dec(y_en - hi, 2))
            } else {
                format!("Pasó {} m por debajo del objetivo.", txt_dec(lo - y_en, 2))
            };
        }
    } else {
        resultado = "corto";
        frase = "Ese tiro no iba para ningún lado, vos.".into();
        veredicto = format!("Cayó a {} m de la hondilla.", txt_dec(d_fin, 2));
    }

    if let Some(k) = referencia {
        let o = &esc.objetivos[k];
        let d_obj = l.lado * (o.centro().0 - l.x);
        if d_fin >= d_obj - o.w || !derribados.is_empty() {
            let t_obj = d_obj / vx;
            let nombre = if o.tipo == TipoObjetivo::Mango {
                "el mango"
            } else {
                "las latas"
            };
            pasos.push(Bloque::new(
                format!("4. ¿A qué altura pasó por {nombre}?"),
                format!(
                    "Llega a d = {} m en t = d / v₀ₓ = {} s. El objetivo está entre y = {} m y y = {} m.",
                    txt_dec(d_obj, 2), txt(t_obj), txt_dec(o.y, 2), txt_dec(o.y + o.h, 2)
                ),
                vec![format!(
                    "y = {} + {}\\cdot {} - {}\\cdot {}^2 = {}\\ \\text{{m}}",
                    num(l.y), num(k1), num_dec(d_obj, 2), num_dec(k2, 4), num_dec(d_obj, 2), num_dec(altura_en(d_obj), 2)
                )],
            ));
        }
    }

    if trazo.fin.tipo == "obstaculo" && derribados.is_empty() {
        if let Some(ob) = esc
            .obstaculos
            .iter()
            .find(|o| Some(o.nombre.to_string()) == trazo.fin.obstaculo)
        {
            let d_ob = if l.lado > 0.0 {
                ob.x - l.x
            } else {
                l.x - (ob.x + ob.w)
            };
            let y_ob = altura_en(d_ob);
            pasos.push(Bloque::new(
                format!("4. ¿Por qué chocó con {}?", ob.nombre),
                format!(
                    "Para pasar, la piedra tenía que ir por encima de {} m al llegar a d = {} m, pero ahí iba a {} m de altura. Hace falta una trayectoria más alta: más ángulo o más rapidez.",
                    txt_dec(ob.y + ob.h, 2), txt_dec(d_ob, 2), txt_dec(y_ob, 2)
                ),
                vec![format!(
                    "y({}) = {} + {}\\cdot {} - {}\\cdot {}^2 = {}\\ \\text{{m}} < {}\\ \\text{{m}}",
                    num_dec(d_ob, 2), num(l.y), num(k1), num_dec(d_ob, 2), num_dec(k2, 4), num_dec(d_ob, 2), num_dec(y_ob, 2), num_dec(ob.y + ob.h, 2)
                )],
            ));
        }
    }

    for imp in impactos {
        if let Some(c) = &imp.caida {
            pasos.push(Bloque::new(
                "5. El mango cae: ¡caída libre!",
                format!(
                    "El mango se suelta desde el reposo a {} m de altura. Solo actúa la gravedad, así que tarda {} s en llegar al suelo y llega a {} m/s.",
                    txt_dec(c.altura, 2), txt(c.tiempo), txt_dec(c.rapidez, 2)
                ),
                vec![
                    format!("t = \\sqrt{{\\dfrac{{2h}}{{g}}}} = \\sqrt{{\\dfrac{{2\\cdot {}}}{{{}}}}} = {}\\ \\text{{s}}", num_dec(c.altura, 2), num(G), num(c.tiempo)),
                    format!("v = \\sqrt{{2\\,g\\,h}} = \\sqrt{{2\\cdot {}\\cdot {}}} = {}\\ \\text{{m/s}}", num(G), num_dec(c.altura, 2), num_dec(c.rapidez, 2)),
                ],
            ));
            break;
        }
    }

    Analisis {
        resultado,
        frase,
        veredicto,
        pasos,
    }
}
