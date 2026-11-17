//! Los tres modelos son casos de un mismo movimiento con aceleración constante en el plano:
//!   x(t) = x₀ + vₓ₀·t + ½·aₓ·t²       y(t) = y₀ + vᵧ₀·t + ½·aᵧ·t²
//! MRU: aₓ = 0 · MRUA: aₓ = a · Parabólico: aᵧ = −g

use crate::modelo::{Valores, V};
use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct Movimiento {
    pub t_max: f64,
    pub x0: f64,
    pub y0: f64,
    pub vx0: f64,
    pub vy0: f64,
    pub ax: f64,
    pub ay: f64,
}

#[derive(Debug, Clone, Copy, Serialize)]
pub struct Estado {
    pub t: f64,
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    pub ax: f64,
    pub ay: f64,
}

/// Un instante notable del movimiento (punto más alto, el móvil se detiene, etc.)
#[derive(Debug, Clone, Serialize)]
pub struct Evento {
    pub t: f64,
    pub nombre: String,
}

#[derive(Debug, Serialize)]
pub struct Simulacion {
    pub movimiento: Movimiento,
    pub muestras: Vec<Estado>,
    pub eventos: Vec<Evento>,
}

impl Movimiento {
    pub fn estado(&self, t: f64) -> Estado {
        Estado {
            t,
            x: self.x0 + self.vx0 * t + 0.5 * self.ax * t * t,
            y: self.y0 + self.vy0 * t + 0.5 * self.ay * t * t,
            vx: self.vx0 + self.ax * t,
            vy: self.vy0 + self.ay * t,
            ax: self.ax,
            ay: self.ay,
        }
    }

    /// n + 1 instantes equiespaciados, redondeados a 6 decimales para aligerar el JSON.
    pub fn muestrear(&self, n: usize) -> Vec<Estado> {
        let r = |x: f64| (x * 1e6).round() / 1e6;
        (0..=n)
            .map(|i| {
                let e = self.estado(self.t_max * i as f64 / n as f64);
                Estado {
                    t: r(e.t),
                    x: r(e.x),
                    y: r(e.y),
                    vx: r(e.vx),
                    vy: r(e.vy),
                    ax: r(e.ax),
                    ay: r(e.ay),
                }
            })
            .collect()
    }

    pub fn eventos(&self) -> Vec<Evento> {
        let mut ev = vec![];
        if self.ay < 0.0 && self.vy0 > 0.0 {
            let t = -self.vy0 / self.ay;
            if t < self.t_max {
                ev.push(Evento {
                    t,
                    nombre: "Punto más alto (vᵧ = 0)".into(),
                });
            }
        }
        if self.ax != 0.0 && self.vx0 != 0.0 && self.vx0.signum() != self.ax.signum() {
            let t = -self.vx0 / self.ax;
            if t > 0.0 && t <= self.t_max + 1e-9 {
                ev.push(Evento {
                    t,
                    nombre: "El móvil se detiene (v = 0)".into(),
                });
            }
        }
        ev
    }

    pub fn simular(&self, n: usize) -> Simulacion {
        Simulacion {
            movimiento: *self,
            muestras: self.muestrear(n),
            eventos: self.eventos(),
        }
    }
}

/// Construye el movimiento a partir de los valores ya resueltos de un modelo.
pub fn desde_modelo(modelo: &str, valores: &Valores) -> Result<Movimiento, String> {
    let v = V(valores);
    let req = |ids: &[&str]| ids.iter().all(|id| v.tiene(id));
    match modelo {
        "mru" => {
            if !req(&["v", "t"]) {
                return Err("Faltan datos para simular: se necesitan v y t.".into());
            }
            if v.g("t") <= 0.0 {
                return Err("Se necesita un tiempo mayor que 0 para simular.".into());
            }
            Ok(Movimiento {
                t_max: v.g("t"),
                x0: 0.0,
                y0: 0.0,
                vx0: v.g("v"),
                vy0: 0.0,
                ax: 0.0,
                ay: 0.0,
            })
        }
        "mrua" => {
            if !req(&["v0", "a", "t"]) {
                return Err("Faltan datos para simular: se necesitan v₀, a y t.".into());
            }
            if v.g("t") <= 0.0 {
                return Err("Se necesita un tiempo mayor que 0 para simular.".into());
            }
            Ok(Movimiento {
                t_max: v.g("t"),
                x0: 0.0,
                y0: 0.0,
                vx0: v.g("v0"),
                vy0: 0.0,
                ax: v.g("a"),
                ay: 0.0,
            })
        }
        "parabolico" => {
            if !req(&["v0x", "v0y", "h0", "g", "tv"]) {
                return Err("Faltan datos para simular el tiro completo.".into());
            }
            if v.g("tv") <= 0.0 {
                return Err("El tiempo de vuelo tiene que ser mayor que 0.".into());
            }
            Ok(Movimiento {
                t_max: v.g("tv"),
                x0: 0.0,
                y0: v.g("h0"),
                vx0: v.g("v0x"),
                vy0: v.g("v0y"),
                ax: 0.0,
                ay: -v.g("g"),
            })
        }
        otro => Err(format!("Modelo desconocido: {otro}")),
    }
}
