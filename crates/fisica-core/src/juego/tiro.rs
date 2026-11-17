//! Física del tiro: la piedra sigue exactamente las ecuaciones del tiro parabólico
//!   x(t) = x₀ + lado·v₀·cos θ·t        y(t) = y₀ + v₀·sen θ·t − ½·g·t²
//! y se revisan los choques cada 1/240 s para no "atravesar" un objetivo entre dos cuadros.

use super::analisis::{self, Analisis, Bloque};
use super::escenarios::{Escenario, Lanzador, Objetivo, TipoObjetivo};
use super::{escenario, ANGULO_MAX, ANGULO_MIN, G, RAPIDEZ_MAX, RAPIDEZ_MIN, R_PIEDRA};
use crate::formato::{num, par, txt};
use serde::{Deserialize, Serialize};

const DT: f64 = 1.0 / 240.0;
const CADA: usize = 4; // se guarda un punto de la trayectoria cada 4 pasos (60 por segundo)

#[derive(Debug, Deserialize)]
pub struct EntradaTiro {
    pub escenario: String,
    #[serde(default)]
    pub jugador: usize,
    pub angulo: f64,
    pub rapidez: f64,
    /// Ids de los objetivos que siguen en pie (si no se manda, todos)
    #[serde(default)]
    pub activos: Option<Vec<String>>,
    /// Número de tiro (para variar las frases)
    #[serde(default)]
    pub numero: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct Fin {
    /// "suelo" | "obstaculo" | "fuera"
    pub tipo: &'static str,
    pub t: f64,
    pub x: f64,
    pub y: f64,
    pub obstaculo: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Caida {
    pub altura: f64,
    pub tiempo: f64,
    pub rapidez: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct Impacto {
    pub id: String,
    pub tipo: TipoObjetivo,
    pub t: f64,
    pub x: f64,
    pub y: f64,
    pub caida: Option<Caida>,
}

#[derive(Debug, Serialize)]
pub struct Resultado {
    pub angulo: f64,
    pub rapidez: f64,
    /// Puntos (t, x, y) de la trayectoria, 60 por segundo
    pub trayectoria: Vec<[f64; 3]>,
    pub fin: Fin,
    pub impactos: Vec<Impacto>,
    /// Objetivos que caen (los golpeados y las latas que estaban encima)
    pub derribados: Vec<String>,
    pub analisis: Analisis,
}

/// Recorrido de un tiro, sin explicaciones.
pub struct Trazo {
    pub trayectoria: Vec<[f64; 3]>,
    pub fin: Fin,
    /// (índice del objetivo, instante del golpe)
    pub golpes: Vec<(usize, f64)>,
}

pub fn posicion(l: &Lanzador, angulo: f64, rapidez: f64, t: f64) -> (f64, f64) {
    let a = angulo.to_radians();
    (
        l.x + l.lado * rapidez * a.cos() * t,
        l.y + rapidez * a.sin() * t - 0.5 * G * t * t,
    )
}

fn circulo_caja(cx: f64, cy: f64, r: f64, x: f64, y: f64, w: f64, h: f64) -> bool {
    let nx = cx.clamp(x, x + w);
    let ny = cy.clamp(y, y + h);
    (cx - nx).powi(2) + (cy - ny).powi(2) <= r * r
}

fn toca(o: &Objetivo, px: f64, py: f64) -> bool {
    match o.tipo {
        TipoObjetivo::Lata => circulo_caja(px, py, R_PIEDRA, o.x, o.y, o.w, o.h),
        TipoObjetivo::Mango => {
            let (cx, cy) = o.centro();
            (px - cx).hypot(py - cy) <= R_PIEDRA + o.w / 2.0
        }
    }
}

pub fn trazar(esc: &Escenario, l: &Lanzador, angulo: f64, rapidez: f64, activos: &[bool]) -> Trazo {
    let mut tray = vec![];
    let mut golpes: Vec<(usize, f64)> = vec![];
    let vy0 = rapidez * angulo.to_radians().sin();
    let mut i = 0usize;
    loop {
        let t = i as f64 * DT;
        let (x, y) = posicion(l, angulo, rapidez, t);
        #[allow(clippy::manual_is_multiple_of)]
        if i % CADA == 0 {
            tray.push([redondear(t), redondear(x), redondear(y)]);
        }
        for (k, o) in esc.objetivos.iter().enumerate() {
            if activos[k] && !golpes.iter().any(|g| g.0 == k) && toca(o, x, y) {
                golpes.push((k, t));
            }
        }
        let fin = if let Some(ob) = esc
            .obstaculos
            .iter()
            .find(|ob| circulo_caja(x, y, R_PIEDRA, ob.x, ob.y, ob.w, ob.h))
        {
            Some(Fin {
                tipo: "obstaculo",
                t,
                x,
                y,
                obstaculo: Some(ob.nombre.to_string()),
            })
        } else if y <= R_PIEDRA && vy0 - G * t < 0.0 {
            Some(Fin {
                tipo: "suelo",
                t,
                x,
                y: R_PIEDRA,
                obstaculo: None,
            })
        } else if x < -4.0 || x > esc.ancho + 4.0 || t > 30.0 {
            Some(Fin {
                tipo: "fuera",
                t,
                x,
                y,
                obstaculo: None,
            })
        } else {
            None
        };
        if let Some(f) = fin {
            if tray.last().map(|p| p[0]) != Some(t) {
                tray.push([t, x, y]);
            }
            return Trazo {
                trayectoria: tray,
                fin: f,
                golpes,
            };
        }
        i += 1;
    }
}

/// Índices de las latas que caen si se bota la lata k (las que están encima).
fn sostenidas(esc: &Escenario, k: usize, activos: &[bool], caen: &mut Vec<usize>) {
    if caen.contains(&k) {
        return;
    }
    caen.push(k);
    let c = &esc.objetivos[k];
    if c.tipo != TipoObjetivo::Lata {
        return;
    }
    for (j, o) in esc.objetivos.iter().enumerate() {
        if !activos[j] || o.tipo != TipoObjetivo::Lata || caen.contains(&j) {
            continue;
        }
        let traslape = o.x < c.x + c.w - 0.05 && o.x + o.w > c.x + 0.05;
        if traslape && (o.y - (c.y + c.h)).abs() < 0.05 {
            sostenidas(esc, j, activos, caen);
        }
    }
}

pub fn activos_de(esc: &Escenario, activos: &Option<Vec<String>>) -> Vec<bool> {
    esc.objetivos
        .iter()
        .map(|o| match activos {
            Some(a) => a.iter().any(|id| id == &o.id),
            None => true,
        })
        .collect()
}

fn validar(
    esc: &Escenario,
    jugador: usize,
    angulo: f64,
    rapidez: f64,
) -> Result<&Lanzador, String> {
    let l = esc
        .lanzadores
        .get(jugador)
        .ok_or_else(|| format!("El escenario no tiene jugador {}.", jugador + 1))?;
    if !(ANGULO_MIN..=ANGULO_MAX).contains(&angulo) {
        return Err(format!(
            "El ángulo tiene que estar entre {ANGULO_MIN}° y {ANGULO_MAX}°."
        ));
    }
    if !(RAPIDEZ_MIN..=RAPIDEZ_MAX).contains(&rapidez) {
        return Err(format!(
            "La rapidez tiene que estar entre {RAPIDEZ_MIN} y {RAPIDEZ_MAX} m/s."
        ));
    }
    Ok(l)
}

pub fn lanzar(e: &EntradaTiro) -> Result<Resultado, String> {
    let esc = escenario(&e.escenario)
        .ok_or_else(|| format!("No existe el escenario «{}».", e.escenario))?;
    let l = validar(esc, e.jugador, e.angulo, e.rapidez)?;
    let activos = activos_de(esc, &e.activos);
    let trazo = trazar(esc, l, e.angulo, e.rapidez, &activos);

    let mut impactos = vec![];
    let mut caen: Vec<usize> = vec![];
    for &(k, t) in &trazo.golpes {
        let o = &esc.objetivos[k];
        let (x, y) = posicion(l, e.angulo, e.rapidez, t);
        let caida = (o.tipo == TipoObjetivo::Mango).then(|| {
            let h = o.y.max(0.0);
            Caida {
                altura: h,
                tiempo: (2.0 * h / G).sqrt(),
                rapidez: (2.0 * G * h).sqrt(),
            }
        });
        impactos.push(Impacto {
            id: o.id.clone(),
            tipo: o.tipo,
            t,
            x,
            y,
            caida,
        });
        sostenidas(esc, k, &activos, &mut caen);
    }
    let derribados: Vec<String> = caen.iter().map(|&k| esc.objetivos[k].id.clone()).collect();
    let analisis = analisis::analizar(
        esc,
        e.jugador,
        l,
        e.angulo,
        e.rapidez,
        &activos,
        &trazo,
        &impactos,
        &derribados,
        e.numero,
    );
    Ok(Resultado {
        angulo: e.angulo,
        rapidez: e.rapidez,
        trayectoria: trazo.trayectoria,
        fin: trazo.fin,
        impactos,
        derribados,
        analisis,
    })
}

// ------------------------------------------------------------------ Tiro perfecto

#[derive(Debug, Deserialize)]
pub struct EntradaSugerencia {
    pub escenario: String,
    #[serde(default)]
    pub jugador: usize,
    pub angulo: f64,
    #[serde(default)]
    pub activos: Option<Vec<String>>,
    #[serde(default)]
    pub objetivo: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Sugerencia {
    pub objetivo: Option<String>,
    pub posible: bool,
    pub angulo: f64,
    pub rapidez: f64,
    pub mismo_angulo: bool,
    pub pasos: Vec<Bloque>,
    pub aviso: Option<String>,
}

/// Objetivos que le tocan al jugador (en el duelo, los del rival).
pub fn objetivos_del_jugador(esc: &Escenario, jugador: usize, activos: &[bool]) -> Vec<usize> {
    esc.objetivos
        .iter()
        .enumerate()
        .filter(|(k, o)| activos[*k] && (o.dueno != Some(jugador)))
        .map(|(k, _)| k)
        .collect()
}

/// Rapidez para que, con ángulo θ, la trayectoria pase por un punto a distancia horizontal d y altura y.
pub fn rapidez_para(l: &Lanzador, angulo: f64, d: f64, y: f64) -> Option<f64> {
    let a = angulo.to_radians();
    let den = 2.0 * (l.y + d * a.tan() - y);
    (den > 0.0 && d > 0.0).then(|| (d / a.cos()) * (G / den).sqrt())
}

fn acierta(
    esc: &Escenario,
    l: &Lanzador,
    angulo: f64,
    rapidez: f64,
    activos: &[bool],
    k: usize,
) -> bool {
    (RAPIDEZ_MIN..=RAPIDEZ_MAX).contains(&rapidez)
        && trazar(esc, l, angulo, rapidez, activos)
            .golpes
            .iter()
            .any(|g| g.0 == k)
}

pub fn sugerir(e: &EntradaSugerencia) -> Result<Sugerencia, String> {
    let esc = escenario(&e.escenario)
        .ok_or_else(|| format!("No existe el escenario «{}».", e.escenario))?;
    let l = esc.lanzadores.get(e.jugador).ok_or("Jugador inválido.")?;
    let activos = activos_de(esc, &e.activos);
    let candidatos = objetivos_del_jugador(esc, e.jugador, &activos);
    let elegido = match &e.objetivo {
        Some(id) => candidatos
            .iter()
            .copied()
            .find(|&k| &esc.objetivos[k].id == id),
        None => candidatos.iter().copied().min_by(|&a, &b| {
            let (oa, ob) = (&esc.objetivos[a], &esc.objetivos[b]);
            let da = (oa.centro().0 - l.x).abs();
            let db = (ob.centro().0 - l.x).abs();
            (oa.y, da).partial_cmp(&(ob.y, db)).unwrap()
        }),
    };
    let Some(k) = elegido else {
        return Ok(Sugerencia {
            objetivo: None,
            posible: false,
            angulo: e.angulo,
            rapidez: 0.0,
            mismo_angulo: true,
            pasos: vec![],
            aviso: Some("Ya no quedan objetivos.".into()),
        });
    };
    let o = &esc.objetivos[k];
    let (cx, cy) = o.centro();
    let d = l.lado * (cx - l.x);
    let th = e.angulo.clamp(ANGULO_MIN, ANGULO_MAX);
    let que = if o.tipo == TipoObjetivo::Mango {
        "el mango"
    } else {
        "la lata de abajo"
    };

    let mut pasos = vec![
        Bloque::new(
            "1. ¿Dónde está el objetivo?",
            format!("Apuntamos al centro de {que}: está a {} m de la hondilla en horizontal y a {} m del suelo. La hondilla está a {} m de altura.", txt(d), txt(cy), txt(l.y)),
            vec![format!("d = {}\\ \\text{{m}},\\quad y = {}\\ \\text{{m}},\\quad y_0 = {}\\ \\text{{m}}", num(d), num(cy), num(l.y))],
        ),
        Bloque::new(
            "2. Ecuación de la trayectoria",
            "Se despeja el tiempo del movimiento horizontal, t = d / (v₀ cos θ), y se sustituye en la altura:".into(),
            vec!["y(d) = y_0 + d\\tan\\theta - \\dfrac{g\\,d^2}{2\\,v_0^2\\cos^2\\theta}".into()],
        ),
        Bloque::new(
            "3. Despejamos la rapidez",
            "Ponemos el punto del objetivo y despejamos v₀:".into(),
            vec!["v_0 = \\dfrac{d}{\\cos\\theta}\\sqrt{\\dfrac{g}{2\\,(y_0 + d\\tan\\theta - y)}}".into()],
        ),
    ];
    let v_mismo = rapidez_para(l, th, d, cy);
    match v_mismo {
        Some(v) => pasos.push(Bloque::new(
            format!("4. Sustituimos con tu ángulo θ = {}°", txt(th)),
            String::new(),
            vec![format!(
                "v_0 = \\dfrac{{{}}}{{\\cos {}^\\circ}}\\sqrt{{\\dfrac{{{}}}{{2\\,({} + {}\\tan {}^\\circ - {})}}}} = \\mathbf{{{}\\ m/s}}",
                num(d), num(th), num(G), num(l.y), num(d), num(th), par(cy), num_v(v)
            )],
        )),
        None => pasos.push(Bloque::new(
            format!("4. Con θ = {}° no hay solución", txt(th)),
            "La recta de lanzamiento y₀ + d·tan θ queda por debajo del objetivo, así que lo de adentro de la raíz es negativo: ninguna rapidez sirve. Subí el ángulo.".into(),
            vec![],
        )),
    }

    if let Some(v) = v_mismo.filter(|&v| acierta(esc, l, th, v, &activos, k)) {
        return Ok(Sugerencia {
            objetivo: Some(o.id.clone()),
            posible: true,
            angulo: th,
            rapidez: v,
            mismo_angulo: true,
            pasos,
            aviso: None,
        });
    }
    // Buscar el ángulo más cercano al del jugador que sí llegue
    for paso in 1..=80 {
        for a in [th + paso as f64, th - paso as f64] {
            if !(ANGULO_MIN..=ANGULO_MAX).contains(&a) {
                continue;
            }
            if let Some(v) =
                rapidez_para(l, a, d, cy).filter(|&v| acierta(esc, l, a, v, &activos, k))
            {
                let razon = match v_mismo {
                    Some(vm) if vm > RAPIDEZ_MAX => format!(
                        "necesitaría {} m/s y la hondilla da máximo {} m/s",
                        txt_v(vm),
                        RAPIDEZ_MAX
                    ),
                    Some(vm) if vm < RAPIDEZ_MIN => format!(
                        "necesitaría solo {} m/s y la hondilla da mínimo {} m/s",
                        txt_v(vm),
                        RAPIDEZ_MIN
                    ),
                    Some(_) => "la piedra choca con algo antes de llegar".into(),
                    None => "no hay rapidez que funcione".into(),
                };
                let aviso = format!(
                    "Con θ = {}° {razon}. Con θ = {}° la rapidez necesaria es {} m/s y sí llega.",
                    txt(th),
                    txt(a),
                    txt_v(v)
                );
                pasos.push(Bloque::new(
                    format!("5. Probamos con θ = {}°", txt(a)),
                    "Con ese ángulo la trayectoria sí pasa sin chocar y llega al objetivo:".into(),
                    vec![format!(
                        "v_0 = \\dfrac{{{}}}{{\\cos {}^\\circ}}\\sqrt{{\\dfrac{{{}}}{{2\\,({} + {}\\tan {}^\\circ - {})}}}} = \\mathbf{{{}\\ m/s}}",
                        num(d), num(a), num(G), num(l.y), num(d), num(a), par(cy), num_v(v)
                    )],
                ));
                return Ok(Sugerencia {
                    objetivo: Some(o.id.clone()),
                    posible: true,
                    angulo: a,
                    rapidez: v,
                    mismo_angulo: false,
                    pasos,
                    aviso: Some(aviso),
                });
            }
        }
    }
    Ok(Sugerencia {
        objetivo: Some(o.id.clone()), posible: false, angulo: th, rapidez: 0.0, mismo_angulo: true, pasos,
        aviso: Some(format!("Ningún ángulo entre {ANGULO_MIN}° y {ANGULO_MAX}° llega a ese objetivo con la rapidez de la hondilla.")),
    })
}

fn redondear(x: f64) -> f64 {
    (x * 1e5).round() / 1e5
}

fn num_v(v: f64) -> String {
    crate::formato::num_dec(v, 2)
}
fn txt_v(v: f64) -> String {
    crate::formato::txt_dec(v, 2)
}
