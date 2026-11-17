//! Escenarios del juego, ambientados en El Salvador.

use serde::Serialize;
use std::sync::OnceLock;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Modo {
    /// Botar torres de latas
    Latas,
    /// Bajar mangos del palo
    Mangos,
    /// Hondillazos entre amigos (2 jugadores por turnos)
    Duelo,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TipoObjetivo {
    Lata,
    Mango,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Estilo {
    Muro,
    Edificio,
    Tronco,
    Cerro,
}

/// Obstáculo rectangular (x, y = esquina inferior izquierda)
#[derive(Debug, Clone, Serialize)]
pub struct Obstaculo {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub nombre: &'static str,
    pub estilo: Estilo,
}

#[derive(Debug, Clone, Serialize)]
pub struct Objetivo {
    pub id: String,
    pub tipo: TipoObjetivo,
    /// Esquina inferior izquierda de la caja
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    /// En el duelo: a qué jugador pertenece (el otro tiene que botarlo)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dueno: Option<usize>,
}

impl Objetivo {
    pub fn centro(&self) -> (f64, f64) {
        (self.x + self.w / 2.0, self.y + self.h / 2.0)
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Lanzador {
    pub nombre: &'static str,
    /// Posición de la horqueta de la hondilla (punto de lanzamiento)
    pub x: f64,
    pub y: f64,
    /// 1: tira hacia la derecha, −1: hacia la izquierda
    pub lado: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "tipo", rename_all = "kebab-case")]
pub enum Decoracion {
    /// Palo de mango: tronco + copa (la copa no detiene la piedra)
    Palo {
        x: f64,
        tronco: f64,
        copa_x: f64,
        copa_y: f64,
        copa_r: f64,
    },
    /// Cerrito bajo la hondilla (solo decorativo)
    Cerrito { x: f64, w: f64, h: f64 },
}

#[derive(Debug, Clone, Serialize)]
pub struct Escenario {
    pub id: &'static str,
    pub modo: Modo,
    pub numero: usize,
    pub nombre: &'static str,
    pub descripcion: &'static str,
    pub ancho: f64,
    pub lanzadores: Vec<Lanzador>,
    pub obstaculos: Vec<Obstaculo>,
    pub objetivos: Vec<Objetivo>,
    pub decoracion: Vec<Decoracion>,
}

const LATA_W: f64 = 0.9;
const LATA_H: f64 = 1.3;
const MANGO: f64 = 0.7;

fn lata(id: &str, x: f64, y: f64, dueno: Option<usize>) -> Objetivo {
    Objetivo {
        id: id.into(),
        tipo: TipoObjetivo::Lata,
        x,
        y,
        w: LATA_W,
        h: LATA_H,
        dueno,
    }
}
fn torre(prefijo: &str, x: f64, n: usize, base: f64, dueno: Option<usize>) -> Vec<Objetivo> {
    (0..n)
        .map(|i| {
            lata(
                &format!("{prefijo}{}", i + 1),
                x,
                base + i as f64 * LATA_H,
                dueno,
            )
        })
        .collect()
}
fn mango(id: &str, cx: f64, cy: f64) -> Objetivo {
    Objetivo {
        id: id.into(),
        tipo: TipoObjetivo::Mango,
        x: cx - MANGO / 2.0,
        y: cy - MANGO / 2.0,
        w: MANGO,
        h: MANGO,
        dueno: None,
    }
}
fn hondilla(x: f64, y: f64) -> Lanzador {
    Lanzador {
        nombre: "Vos",
        x,
        y,
        lado: 1.0,
    }
}
fn muro(x: f64, h: f64) -> Obstaculo {
    Obstaculo {
        x,
        y: 0.0,
        w: 1.2,
        h,
        nombre: "el muro",
        estilo: Estilo::Muro,
    }
}
fn palo(x: f64, tronco: f64, copa_y: f64, copa_r: f64) -> (Obstaculo, Decoracion) {
    (
        Obstaculo {
            x: x - 0.4,
            y: 0.0,
            w: 0.8,
            h: tronco,
            nombre: "el tronco del palo",
            estilo: Estilo::Tronco,
        },
        Decoracion::Palo {
            x,
            tronco,
            copa_x: x,
            copa_y,
            copa_r,
        },
    )
}

#[allow(clippy::vec_init_then_push)]
fn construir() -> Vec<Escenario> {
    let mut v = vec![];
    // ---------------------------------------------------------------- Botá las latas
    v.push(Escenario {
        id: "latas-1",
        modo: Modo::Latas,
        numero: 1,
        nombre: "La cancha de la colonia",
        descripcion: "Dos latas en la cancha, a 18 m. Probá distintos ángulos.",
        ancho: 30.0,
        lanzadores: vec![hondilla(0.0, 1.0)],
        obstaculos: vec![],
        objetivos: torre("l", 18.0, 2, 0.0, None),
        decoracion: vec![],
    });
    v.push(Escenario {
        id: "latas-2",
        modo: Modo::Latas,
        numero: 2,
        nombre: "El parque de Juayúa",
        descripcion: "Una pirámide de latas a 31 m: vas a necesitar más fuerza.",
        ancho: 40.0,
        lanzadores: vec![hondilla(0.0, 1.0)],
        obstaculos: vec![],
        objetivos: vec![
            lata("l1", 31.0, 0.0, None),
            lata("l2", 31.95, 0.0, None),
            lata("l3", 31.47, LATA_H, None),
        ],
        decoracion: vec![],
    });
    v.push(Escenario {
        id: "latas-3",
        modo: Modo::Latas,
        numero: 3,
        nombre: "El muro de la escuela",
        descripcion: "Un muro de 7 m en medio: la parábola tiene que pasarlo por encima.",
        ancho: 38.0,
        lanzadores: vec![hondilla(0.0, 1.0)],
        obstaculos: vec![muro(13.0, 7.0)],
        objetivos: torre("l", 26.0, 2, 0.0, None),
        decoracion: vec![],
    });
    v.push(Escenario {
        id: "latas-4",
        modo: Modo::Latas,
        numero: 4,
        nombre: "La azotea de la tienda",
        descripcion: "Las latas están en la azotea de la tienda, a 8 m de alto.",
        ancho: 38.0,
        lanzadores: vec![hondilla(0.0, 1.0)],
        obstaculos: vec![Obstaculo {
            x: 24.0,
            y: 0.0,
            w: 5.0,
            h: 8.0,
            nombre: "la tienda",
            estilo: Estilo::Edificio,
        }],
        objetivos: torre("l", 26.0, 2, 8.0, None),
        decoracion: vec![],
    });
    v.push(Escenario {
        id: "latas-5",
        modo: Modo::Latas,
        numero: 5,
        nombre: "El cerro de Apaneca",
        descripcion: "Tirás desde un cerro de 5 m y hay un muro de 10 m antes de las latas.",
        ancho: 44.0,
        lanzadores: vec![hondilla(0.0, 5.0)],
        obstaculos: vec![muro(26.0, 10.0)],
        objetivos: torre("l", 37.0, 3, 0.0, None),
        decoracion: vec![Decoracion::Cerrito {
            x: -3.5,
            w: 4.7,
            h: 5.0,
        }],
    });

    // ---------------------------------------------------------------- Bajá mangos
    let (t1, p1) = palo(18.0, 4.5, 7.0, 3.3);
    v.push(Escenario {
        id: "mangos-1",
        modo: Modo::Mangos,
        numero: 1,
        nombre: "El palo de mango de la abuela",
        descripcion:
            "Bajá los tres mangos sin pegarle al tronco. Cuando le das a uno, cae en caída libre.",
        ancho: 30.0,
        lanzadores: vec![hondilla(0.0, 1.0)],
        obstaculos: vec![t1],
        objetivos: vec![
            mango("m1", 15.6, 5.4),
            mango("m2", 17.2, 8.4),
            mango("m3", 20.0, 6.6),
        ],
        decoracion: vec![p1],
    });
    let (t2, p2) = palo(27.0, 6.0, 9.6, 3.9);
    v.push(Escenario {
        id: "mangos-2",
        modo: Modo::Mangos,
        numero: 2,
        nombre: "El palo de la cancha",
        descripcion: "Un palo más alto y más lejos. Los mangos de arriba piden más ángulo.",
        ancho: 38.0,
        lanzadores: vec![hondilla(0.0, 1.0)],
        obstaculos: vec![t2],
        objetivos: vec![
            mango("m1", 24.0, 7.6),
            mango("m2", 26.0, 11.6),
            mango("m3", 29.4, 9.0),
            mango("m4", 27.6, 8.0),
        ],
        decoracion: vec![p2],
    });
    let (t3, p3) = palo(26.0, 5.0, 8.2, 3.4);
    v.push(Escenario {
        id: "mangos-3",
        modo: Modo::Mangos,
        numero: 3,
        nombre: "El palo del vecino",
        descripcion: "El palo está al otro lado del muro del vecino (6 m). ¡Que no te vean!",
        ancho: 36.0,
        lanzadores: vec![hondilla(0.0, 1.0)],
        obstaculos: vec![muro(12.0, 6.0), t3],
        objetivos: vec![
            mango("m1", 23.6, 7.0),
            mango("m2", 25.4, 10.6),
            mango("m3", 28.2, 7.8),
        ],
        decoracion: vec![p3],
    });

    // ---------------------------------------------------------------- Hondillazos entre amigos
    let (t4, p4) = palo(18.0, 5.0, 7.8, 3.4);
    v.push(Escenario {
        id: "duelo-1", modo: Modo::Duelo, numero: 1, nombre: "Hondillazos en el patio",
        descripcion: "Dos jugadores por turnos. Cada uno defiende sus tres latas y trata de botar las del otro. En medio está el palo de mango.",
        ancho: 36.0,
        lanzadores: vec![
            Lanzador { nombre: "Jugador 1", x: 1.5, y: 1.2, lado: 1.0 },
            Lanzador { nombre: "Jugador 2", x: 34.5, y: 1.2, lado: -1.0 },
        ],
        obstaculos: vec![t4],
        objetivos: vec![
            lata("a1", 3.6, 0.0, Some(0)), lata("a2", 5.3, 0.0, Some(0)), lata("a3", 7.0, 0.0, Some(0)),
            lata("b1", 28.1, 0.0, Some(1)), lata("b2", 29.8, 0.0, Some(1)), lata("b3", 31.5, 0.0, Some(1)),
        ],
        decoracion: vec![p4],
    });
    v.push(Escenario {
        id: "duelo-2", modo: Modo::Duelo, numero: 2, nombre: "Duelo entre cerros",
        descripcion: "El Jugador 1 tira desde un cerro de 5 m; el Jugador 2, desde abajo. En medio hay un muro de 8 m.",
        ancho: 42.0,
        lanzadores: vec![
            Lanzador { nombre: "Jugador 1", x: 1.2, y: 6.2, lado: 1.0 },
            Lanzador { nombre: "Jugador 2", x: 40.5, y: 1.2, lado: -1.0 },
        ],
        obstaculos: vec![
            Obstaculo { x: -1.0, y: 0.0, w: 7.6, h: 5.0, nombre: "el cerro", estilo: Estilo::Cerro },
            muro(20.4, 8.0),
        ],
        objetivos: vec![
            lata("a1", 2.8, 5.0, Some(0)), lata("a2", 4.2, 5.0, Some(0)), lata("a3", 5.6, 5.0, Some(0)),
            lata("b1", 34.4, 0.0, Some(1)), lata("b2", 36.1, 0.0, Some(1)), lata("b3", 37.8, 0.0, Some(1)),
        ],
        decoracion: vec![],
    });
    v
}

pub fn escenarios() -> &'static [Escenario] {
    static E: OnceLock<Vec<Escenario>> = OnceLock::new();
    E.get_or_init(construir)
}

pub fn escenario(id: &str) -> Option<&'static Escenario> {
    escenarios().iter().find(|e| e.id == id)
}
