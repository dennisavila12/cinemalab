//! Guiones del "Modo clase": una explicación por escenas, como una presentación.
//!
//! Cada escena trae la narración (escrita para leerse en voz alta), las fórmulas en LaTeX,
//! qué capas visuales debe mostrar la animación y en qué tramo de tiempo.
//! La interfaz solo reproduce el guion: toda la física y los números salen de aquí.

use crate::formato::{num, num_dec, txt, txt_dec};
use crate::modelo::{Modelo, Valores};
use crate::modelos;
use crate::movimiento::{desde_modelo, Movimiento, Simulacion};
use crate::solver::{self, Entrada, Paso, Solucion};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct EntradaLeccion {
    pub modelo: String,
    #[serde(default)]
    pub datos: Option<Valores>,
    #[serde(default)]
    pub incognitas: Vec<String>,
    #[serde(default)]
    pub enunciado: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Dato {
    pub etiqueta: String,
    pub valor: String,
}

#[derive(Debug, Serialize)]
pub struct Escena {
    pub titulo: String,
    pub narracion: Vec<String>,
    pub formulas: Vec<String>,
    /// Capas visuales: estrobo, regla, vectores, trayectoria, sombra_x, sombra_y,
    /// componentes, punto_alto, gemelo
    pub capas: Vec<&'static str>,
    /// Tramo de tiempo que se anima en la escena
    pub desde: f64,
    pub hasta: f64,
    /// Gráfica que acompaña: x, v, a, v_area, vx, vy, trayectoria
    pub grafica: Option<&'static str>,
    pub datos: Vec<Dato>,
    pub paso: Option<Paso>,
}

#[derive(Debug, Serialize)]
pub struct Leccion {
    pub modelo: String,
    pub titulo: String,
    pub enunciado: Option<String>,
    /// true si la lección usa los datos del usuario; false si usa un ejemplo
    pub propio: bool,
    /// Intervalo entre marcas estroboscópicas (s)
    pub marcas: f64,
    pub escenas: Vec<Escena>,
    pub simulacion: Simulacion,
    pub solucion: Solucion,
}

fn escena(
    titulo: impl Into<String>,
    narracion: Vec<String>,
    formulas: Vec<String>,
    capas: Vec<&'static str>,
    desde: f64,
    hasta: f64,
    grafica: Option<&'static str>,
) -> Escena {
    Escena {
        titulo: titulo.into(),
        narracion,
        formulas,
        capas,
        desde,
        hasta,
        grafica,
        datos: vec![],
        paso: None,
    }
}

fn unidad_hablada(u: &str) -> &str {
    match u {
        "m" => "metros",
        "m/s" => "metros por segundo",
        "m/s²" => "metros por segundo al cuadrado",
        "s" => "segundos",
        "°" => "grados",
        otro => otro,
    }
}

fn escenas_de_pasos(sol: &Solucion, mov: &Movimiento, capas: Vec<&'static str>) -> Vec<Escena> {
    let pasos: Vec<&Paso> = sol.pasos.iter().filter(|p| p.necesario).collect();
    let total = pasos.len();
    pasos
        .into_iter()
        .enumerate()
        .map(|(i, p)| {
            let mut narr = vec![
                format!("Paso {} de {}: queremos {}.", i + 1, total, p.etiqueta.to_lowercase()),
                if p.despeje.is_some() {
                    "Buscamos la ecuación que la relaciona con los datos que ya tenemos, la despejamos y sustituimos los números.".into()
                } else {
                    "Buscamos la ecuación que la relaciona con los datos que ya tenemos y sustituimos los números.".into()
                },
                format!("Resultado: {} {}.", txt_dec(p.valor, 3), unidad_hablada(&p.unidad)),
            ];
            if let Some(n) = &p.nota {
                narr.push(n.clone());
            }
            let mut f = vec![p.ecuacion.clone()];
            if let Some(d) = &p.despeje {
                f.push(d.clone());
            }
            f.push(p.sustitucion.clone());
            f.push(p.resultado.clone());
            Escena { paso: Some(p.clone()), ..escena(format!("Tu ejercicio · {}", p.etiqueta), narr, f, capas.clone(), 0.0, mov.t_max, None) }
        })
        .collect()
}

fn leccion_mru(v: &Valores, mov: &Movimiento, sol: &Solucion) -> Vec<Escena> {
    let (vel, t, dx) = (v["v"], v["t"], v["dx"]);
    let dt = mov.t_max / 10.0;
    let mut e = vec![
        escena("¿Qué es el MRU?", vec![
            "En el movimiento rectilíneo uniforme el móvil va en línea recta y su velocidad nunca cambia.".into(),
            format!("En este ejemplo va a {} metros por segundo durante {} segundos.", txt(vel), txt(t)),
        ], vec![], vec!["vectores"], 0.0, mov.t_max, None),
        Escena {
            datos: vec![
                Dato { etiqueta: "Intervalo entre marcas".into(), valor: format!("\\Delta t = {}\\ \\text{{s}}", num(dt)) },
                Dato { etiqueta: "Distancia entre marcas".into(), valor: format!("v\\,\\Delta t = {}\\ \\text{{m}}", num(vel * dt)) },
            ],
            ..escena("Distancias iguales en tiempos iguales", vec![
                format!("Cada marca se toma cada {} segundos.", txt(dt)),
                format!("Como la velocidad no cambia, entre una marca y la siguiente siempre hay la misma distancia: {} metros.", txt(vel * dt)),
                "Esa es la huella del MRU: distancias iguales en tiempos iguales.".into(),
            ], vec![], vec!["estrobo", "regla", "vectores"], 0.0, mov.t_max, None)
        },
        escena("La ecuación del MRU", vec![
            "Si en cada segundo avanza lo mismo, la distancia total es la velocidad por el tiempo.".into(),
        ], vec![
            "\\Delta x = v\\,t".into(),
            "x(t) = x_0 + v\\,t".into(),
            format!("\\Delta x = {}\\cdot {} = {}\\ \\text{{m}}", num(vel), num(t), num(dx)),
        ], vec!["estrobo"], 0.0, mov.t_max, None),
        escena("La gráfica x–t es una recta", vec![
            "La posición crece al mismo ritmo todo el tiempo; por eso la gráfica posición contra tiempo es una línea recta.".into(),
            format!("Su pendiente es la velocidad: {} metros por segundo.", txt(vel)),
        ], vec!["\\text{pendiente} = \\dfrac{\\Delta x}{\\Delta t} = v".into()], vec!["estrobo"], 0.0, mov.t_max, Some("x")),
        escena("La gráfica v–t es horizontal", vec![
            "La velocidad no cambia, así que su gráfica es una línea horizontal.".into(),
            format!("El área del rectángulo bajo esa línea es el desplazamiento: {} por {} da {} metros.", txt(vel), txt(t), txt(dx)),
        ], vec![format!("\\text{{Área}} = v\\,t = {}\\cdot {} = {}\\ \\text{{m}} = \\Delta x", num(vel), num(t), num(dx))], vec!["vectores"], 0.0, mov.t_max, Some("v_area")),
    ];
    e.extend(escenas_de_pasos(sol, mov, vec!["estrobo", "vectores"]));
    e.push(escena("Resumen", vec![
        "En el MRU la velocidad es constante y la aceleración es cero.".into(),
        "Recorre distancias iguales en tiempos iguales.".into(),
        "La gráfica posición–tiempo es una recta con pendiente v y la gráfica velocidad–tiempo es horizontal.".into(),
    ], vec!["\\Delta x = v\\,t".into(), "a = 0".into()], vec!["estrobo", "vectores"], 0.0, mov.t_max, Some("x")));
    e
}

fn leccion_mrua(v: &Valores, mov: &Movimiento, sol: &Solucion) -> Vec<Escena> {
    let (v0, a, t, vf, dx) = (v["v0"], v["a"], v["t"], v["v"], v["dx"]);
    let acelera = a != 0.0 && (v0 == 0.0 || v0.signum() == a.signum());
    let mut e = vec![
        escena("¿Qué es el MRUA?", vec![
            "En el movimiento rectilíneo uniformemente acelerado el móvil va en línea recta y su velocidad cambia lo mismo cada segundo: la aceleración es constante.".into(),
            format!("Aquí empieza a {} metros por segundo y su velocidad cambia {} metros por segundo en cada segundo.", txt(v0), txt(a)),
        ], vec![], vec!["vectores"], 0.0, mov.t_max, None),
        escena(if acelera { "Las marcas se van separando" } else { "Las marcas se van juntando" }, vec![
            "Las marcas se toman a intervalos de tiempo iguales.".into(),
            if acelera {
                "Como el móvil va cada vez más rápido, en cada intervalo recorre más distancia: las marcas se separan cada vez más.".into()
            } else {
                "Como el móvil va frenando, en cada intervalo recorre menos distancia: las marcas quedan cada vez más juntas.".into()
            },
            "Fijate que la flecha de la velocidad también cambia de tamaño.".into(),
        ], vec![], vec!["estrobo", "regla", "vectores"], 0.0, mov.t_max, None),
        escena("La velocidad cambia parejo", vec![
            "La gráfica velocidad contra tiempo es una línea recta.".into(),
            format!("Su pendiente es la aceleración: {} metros por segundo al cuadrado.", txt(a)),
        ], vec![
            "v = v_0 + a\\,t".into(),
            format!("v = {} + {}\\,t", num(v0), crate::formato::par(a)),
        ], vec!["vectores"], 0.0, mov.t_max, Some("v")),
        escena("La posición forma una parábola", vec![
            "Como la velocidad cambia, la posición ya no crece al mismo ritmo: la gráfica posición contra tiempo es una curva, una parábola.".into(),
        ], vec!["\\Delta x = v_0\\,t + \\tfrac{1}{2}\\,a\\,t^2".into()], vec!["estrobo"], 0.0, mov.t_max, Some("x")),
        escena("El área bajo v–t es el desplazamiento", vec![
            "El área bajo la recta de la velocidad es un trapecio.".into(),
            format!("Su área es el promedio de la velocidad inicial y la final, por el tiempo: da {} metros, que es el desplazamiento.", txt(dx)),
        ], vec![
            "\\Delta x = \\tfrac{1}{2}\\,(v_0 + v)\\,t".into(),
            format!("\\Delta x = \\tfrac{{1}}{{2}}\\,({} + {})\\cdot {} = {}\\ \\text{{m}}", num(v0), num(vf), num(t), num(dx)),
        ], vec!["vectores"], 0.0, mov.t_max, Some("v_area")),
        escena("Las cuatro ecuaciones y cuál usar", vec![
            "Hay cinco variables: desplazamiento, velocidad inicial, velocidad final, aceleración y tiempo.".into(),
            "Cada ecuación deja fuera una de ellas.".into(),
            "El truco es buscar la variable que ni te dan ni te piden, y usar la ecuación que no la tiene.".into(),
        ], vec![
            "v = v_0 + a\\,t \\qquad (\\text{no tiene } \\Delta x)".into(),
            "\\Delta x = v_0\\,t + \\tfrac{1}{2}a\\,t^2 \\qquad (\\text{no tiene } v)".into(),
            "v^2 = v_0^2 + 2\\,a\\,\\Delta x \\qquad (\\text{no tiene } t)".into(),
            "\\Delta x = \\tfrac{1}{2}(v_0 + v)\\,t \\qquad (\\text{no tiene } a)".into(),
        ], vec![], 0.0, 0.0, None),
    ];
    for ev in mov.eventos() {
        e.push(escena(
            "El momento en que se detiene",
            vec![
                format!(
                    "A los {} segundos la velocidad llega a cero: el móvil se detiene.",
                    txt(ev.t)
                ),
                "En la gráfica velocidad–tiempo es el punto donde la recta cruza el eje.".into(),
            ],
            vec![format!(
                "v = 0 \\Rightarrow t = -\\dfrac{{v_0}}{{a}} = {}\\ \\text{{s}}",
                num(ev.t)
            )],
            vec!["estrobo", "vectores"],
            0.0,
            ev.t,
            Some("v"),
        ));
    }
    e.extend(escenas_de_pasos(sol, mov, vec!["estrobo", "vectores"]));
    e.push(escena("Resumen", vec![
        "En el MRUA la aceleración es constante y la velocidad cambia lo mismo cada segundo.".into(),
        "La gráfica velocidad–tiempo es una recta con pendiente a y la de posición es una parábola.".into(),
        "Para resolver, elegí la ecuación que no tiene la variable que ni te dan ni te piden.".into(),
    ], vec!["v = v_0 + a\\,t".into(), "\\Delta x = v_0\\,t + \\tfrac{1}{2}a\\,t^2".into(), "v^2 = v_0^2 + 2a\\,\\Delta x".into()], vec!["estrobo", "vectores"], 0.0, mov.t_max, Some("v")));
    e
}

fn leccion_parabolico(v: &Valores, mov: &Movimiento, sol: &Solucion) -> Vec<Escena> {
    let (v0, th, h0, vx, vy, ts, hmax, tv, r, g) = (
        v["v0"], v["theta"], v["h0"], v["v0x"], v["v0y"], v["ts"], v["hmax"], v["tv"], v["R"],
        v["g"],
    );
    let dt = mov.t_max / 10.0;
    let k2 = g / (2.0 * v0 * v0 * th.to_radians().cos().powi(2));
    let mut e = vec![
        escena("Dos movimientos en uno", vec![
            "El tiro parabólico no es un movimiento nuevo: son dos movimientos que ya conocés, ocurriendo al mismo tiempo.".into(),
            "Mirá las sombras. La de abajo muestra solo el movimiento horizontal, y la de la izquierda solo el vertical. Es como ver la parábola con rayos X.".into(),
        ], vec![], vec!["trayectoria", "sombra_x", "sombra_y"], 0.0, mov.t_max, None),
        Escena {
            datos: vec![
                Dato { etiqueta: "Hacia adelante".into(), valor: format!("v_{{0x}} = {}\\ \\text{{m/s}}", num_dec(vx, 2)) },
                Dato { etiqueta: "Hacia arriba".into(), valor: format!("v_{{0y}} = {}\\ \\text{{m/s}}", num_dec(vy, 2)) },
            ],
            ..escena("Descomponemos la velocidad inicial", vec![
                format!("El proyectil sale a {} metros por segundo con un ángulo de {} grados.", txt(v0), txt(th)),
                format!("Con el coseno y el seno separamos esa velocidad en dos: {} metros por segundo hacia adelante y {} hacia arriba.", txt_dec(vx, 2), txt_dec(vy, 2)),
            ], vec![
                format!("v_{{0x}} = v_0\\cos\\theta = {}\\cos {}^\\circ = {}\\ \\text{{m/s}}", num(v0), num(th), num_dec(vx, 2)),
                format!("v_{{0y}} = v_0\\operatorname{{sen}}\\theta = {}\\operatorname{{sen}} {}^\\circ = {}\\ \\text{{m/s}}", num(v0), num(th), num_dec(vy, 2)),
            ], vec!["componentes"], 0.0, 0.0, None)
        },
        escena("En x: un MRU", vec![
            "Hacia adelante nada empuja ni frena al proyectil, porque no tomamos en cuenta el aire.".into(),
            format!("Por eso la sombra de abajo avanza siempre lo mismo: {} metros en cada intervalo de {} segundos.", txt_dec(vx * dt, 2), txt(dt)),
            "La velocidad horizontal es constante: su gráfica es una línea horizontal.".into(),
        ], vec!["x(t) = v_{0x}\\,t".into(), "v_x = v_{0x} = \\text{constante}".into()], vec!["sombra_x", "estrobo"], 0.0, mov.t_max, Some("vx")),
        escena("En y: un MRUA", vec![
            format!("Hacia arriba, la gravedad frena al proyectil {} metros por segundo en cada segundo, hasta que se detiene.", txt(g)),
            "Después la acelera hacia abajo. Fijate cómo la sombra de la izquierda sube cada vez más despacio y baja cada vez más rápido.".into(),
            "La gráfica de la velocidad vertical es una recta que baja: su pendiente es menos g.".into(),
        ], vec!["y(t) = h_0 + v_{0y}\\,t - \\tfrac{1}{2}\\,g\\,t^2".into(), "v_y = v_{0y} - g\\,t".into()], vec!["sombra_y", "estrobo"], 0.0, mov.t_max, Some("vy")),
        escena("El punto más alto", vec![
            "Arriba, la velocidad vertical vale cero: al proyectil solo le queda la velocidad horizontal.".into(),
            format!("Llega ahí a los {} segundos, a {} metros del suelo.", txt(ts), txt_dec(hmax, 2)),
        ], vec![
            format!("v_y = 0 \\Rightarrow t_s = \\dfrac{{v_{{0y}}}}{{g}} = \\dfrac{{{}}}{{{}}} = {}\\ \\text{{s}}", num_dec(vy, 2), num(g), num(ts)),
            format!("h_{{\\max}} = h_0 + \\dfrac{{v_{{0y}}^2}}{{2g}} = {} + \\dfrac{{{}^2}}{{2\\cdot {}}} = {}\\ \\text{{m}}", num(h0), num_dec(vy, 2), num(g), num_dec(hmax, 2)),
        ], vec!["trayectoria", "vectores", "punto_alto", "sombra_y"], 0.0, ts.min(mov.t_max), None),
        escena("¿Cuánto vuela y hasta dónde llega?", vec![
            "El proyectil toca el suelo cuando su altura vuelve a ser cero.".into(),
            format!("Eso pasa a los {} segundos. En ese tiempo avanzó {} metros hacia adelante: ese es el alcance.", txt(tv), txt_dec(r, 2)),
        ], vec![
            if h0.abs() < 1e-9 {
                format!("t_v = \\dfrac{{2\\,v_{{0y}}}}{{g}} = {}\\ \\text{{s}}", num(tv))
            } else {
                format!("t_v = \\dfrac{{v_{{0y}} + \\sqrt{{v_{{0y}}^2 + 2\\,g\\,h_0}}}}{{g}} = {}\\ \\text{{s}}", num(tv))
            },
            format!("R = v_{{0x}}\\,t_v = {}\\cdot {} = {}\\ \\text{{m}}", num_dec(vx, 2), num(tv), num_dec(r, 2)),
        ], vec!["trayectoria", "vectores"], 0.0, mov.t_max, None),
    ];
    if ts > 0.0 && ts < mov.t_max {
        let bajada = (2.0 * hmax / g).sqrt();
        e.push(escena("El mango que se cae del palo", vec![
            "Imaginá un mango que se suelta del palo justo a la altura máxima, en el instante en que el proyectil pasa por arriba.".into(),
            "¡Los dos llegan al suelo al mismo tiempo! En el eje y los dos hacen exactamente lo mismo: caen libremente desde la altura máxima.".into(),
            format!("Por eso la bajada dura {} segundos para los dos.", txt(bajada)),
        ], vec![format!("t_{{\\text{{bajada}}}} = \\sqrt{{\\dfrac{{2\\,h_{{\\max}}}}{{g}}}} = {}\\ \\text{{s}} = t_v - t_s", num(bajada))], vec!["trayectoria", "gemelo"], ts, mov.t_max, None));
    }
    e.push(escena("La ecuación de la trayectoria", vec![
        "Si despejamos el tiempo del movimiento horizontal y lo metemos en el vertical, el tiempo desaparece.".into(),
        "Queda la altura en función de la distancia: la ecuación de la parábola.".into(),
    ], vec![
        "y(x) = h_0 + x\\tan\\theta - \\dfrac{g\\,x^2}{2\\,v_0^2\\cos^2\\theta}".into(),
        format!("y(x) = {} + {}\\,x - {}\\,x^2", num(h0), num(th.to_radians().tan()), num_dec(k2, 4)),
    ], vec!["trayectoria"], 0.0, mov.t_max, Some("trayectoria")));
    if h0.abs() < 1e-9 {
        e.push(escena("¿Por qué 45° llega más lejos?", vec![
            "Si sale y cae al mismo nivel, el alcance depende del seno del doble del ángulo.".into(),
            "Ese seno vale lo máximo, uno, cuando el doble del ángulo es noventa grados, o sea con cuarenta y cinco grados.".into(),
            "Y dos ángulos que suman noventa grados, como treinta y sesenta, llegan igual de lejos.".into(),
        ], vec!["R = \\dfrac{v_0^2\\operatorname{sen}(2\\theta)}{g}".into(), format!("R_{{\\max}} = \\dfrac{{v_0^2}}{{g}} = {}\\ \\text{{m}}\\quad(\\theta = 45^\\circ)", num_dec(v0 * v0 / g, 2))], vec!["trayectoria"], 0.0, mov.t_max, None));
    }
    e.extend(escenas_de_pasos(sol, mov, vec!["trayectoria", "vectores"]));
    e.push(escena("Resumen", vec![
        "En x es un movimiento rectilíneo uniforme y en y un movimiento uniformemente acelerado con aceleración menos g.".into(),
        "Arriba la velocidad vertical es cero.".into(),
        "Con la ecuación de la trayectoria podés calcular un tiro antes de lanzarlo, como en el juego de la hondilla.".into(),
    ], vec!["x = v_{0x}\\,t".into(), "y = h_0 + v_{0y}\\,t - \\tfrac{1}{2}g\\,t^2".into()], vec!["trayectoria", "sombra_x", "sombra_y", "vectores"], 0.0, mov.t_max, Some("trayectoria")));
    e
}

fn con_defectos(m: &Modelo, datos: &Valores) -> Valores {
    let mut d = datos.clone();
    for var in &m.variables {
        if let Some(def) = var.defecto {
            d.entry(var.id.to_string()).or_insert(def);
        }
    }
    d
}

pub fn generar(e: &EntradaLeccion) -> Result<Leccion, String> {
    let m =
        modelos::por_id(&e.modelo).ok_or_else(|| format!("Modelo desconocido: {}", e.modelo))?;
    let todas: Vec<String> = m.variables.iter().map(|v| v.id.to_string()).collect();

    // 1) Intentar con los datos del usuario
    let mut elegida = None;
    if let Some(datos) = &e.datos {
        let entrada = Entrada {
            modelo: m.id.into(),
            datos: con_defectos(m, datos),
            incognitas: e.incognitas.clone(),
        };
        let sol = solver::resolver(m, &entrada);
        let completa = sol.errores.is_empty()
            && sol.inconsistencias.is_empty()
            && todas.iter().all(|id| sol.valores.contains_key(id));
        if completa {
            if let Ok(mov) = desde_modelo(m.id, &sol.valores) {
                elegida = Some((sol, mov, e.enunciado.clone(), true));
            }
        }
    }
    // 2) Si no alcanzan, usar el primer ejemplo del modelo
    let (sol, mov, enunciado, propio) = match elegida {
        Some(x) => x,
        None => {
            let ej = &m.ejemplos[0];
            let datos: Valores = ej.datos.iter().map(|(k, v)| (k.to_string(), *v)).collect();
            let entrada = Entrada {
                modelo: m.id.into(),
                datos: con_defectos(m, &datos),
                incognitas: ej.pide.iter().map(|s| s.to_string()).collect(),
            };
            let sol = solver::resolver(m, &entrada);
            let mov = desde_modelo(m.id, &sol.valores)?;
            (sol, mov, Some(ej.enunciado.to_string()), false)
        }
    };
    let v = &sol.valores;
    let escenas = match m.id {
        "mru" => leccion_mru(v, &mov, &sol),
        "mrua" => leccion_mrua(v, &mov, &sol),
        _ => leccion_parabolico(v, &mov, &sol),
    };
    Ok(Leccion {
        modelo: m.id.into(),
        titulo: format!("Modo clase · {}", m.nombre),
        enunciado,
        propio,
        marcas: mov.t_max / 10.0,
        escenas,
        simulacion: mov.simular(600),
        solucion: sol,
    })
}
