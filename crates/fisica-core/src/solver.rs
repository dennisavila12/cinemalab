//! Motor de resolución paso a paso.
//!
//! 1. Parte de los datos que dio el usuario.
//! 2. Busca las ecuaciones que tienen exactamente UNA variable desconocida.
//! 3. Entre ellas elige el despeje más sencillo (prioridad: lineal → raíz/cuadrática → signo ambiguo).
//! 4. Despeja, sustituye, calcula y la variable pasa a ser conocida.
//! 5. Repite hasta que no quede ninguna ecuación aplicable.
//! 6. Verifica que todas las ecuaciones se cumplan (datos consistentes).

use crate::formato::{num, txt};
use crate::modelo::{Despeje, Modelo, Valores, V};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

/// Tolerancia relativa para aceptar datos redondeados del enunciado.
const TOLERANCIA: f64 = 0.01;

#[derive(Debug, Deserialize)]
pub struct Entrada {
    pub modelo: String,
    #[serde(default)]
    pub datos: Valores,
    #[serde(default)]
    pub incognitas: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Paso {
    pub variable: String,
    pub simbolo: String,
    pub etiqueta: String,
    pub unidad: String,
    pub ecuacion: String,
    /// Solo cuando el despeje es distinto de la ecuación original
    pub despeje: Option<String>,
    pub sustitucion: String,
    pub valor: f64,
    pub resultado: String,
    pub nota: Option<String>,
    /// ¿Es una de las incógnitas que pidió el usuario?
    pub pedido: bool,
    /// ¿Hace falta para llegar a las incógnitas pedidas?
    pub necesario: bool,
}

#[derive(Debug, Serialize)]
pub struct Solucion {
    pub modelo: String,
    pub dados: Valores,
    pub valores: Valores,
    pub incognitas: Vec<String>,
    pub pasos: Vec<Paso>,
    pub faltantes: Vec<String>,
    pub inconsistencias: Vec<String>,
    pub avisos: Vec<String>,
    /// Errores de validación por variable (dato fuera de rango, etc.)
    pub errores: BTreeMap<String, String>,
}

/// Revisa que cada dato cumpla el rango de su variable.
pub fn validar(modelo: &Modelo, datos: &Valores) -> BTreeMap<String, String> {
    let mut errores = BTreeMap::new();
    for (id, &x) in datos {
        let Some(var) = modelo.variable(id) else {
            errores.insert(
                id.clone(),
                format!("La variable «{id}» no existe en este modelo."),
            );
            continue;
        };
        if !x.is_finite() {
            errores.insert(id.clone(), "Escribí un número válido.".into());
            continue;
        }
        if let Some(min) = var.min {
            if (var.estricto && x <= min) || (!var.estricto && x < min) {
                let msg = if var.estricto {
                    format!("Tiene que ser mayor que {}.", num(min))
                } else {
                    "No puede ser negativo.".into()
                };
                errores.insert(id.clone(), msg);
                continue;
            }
        }
        if let Some(max) = var.max {
            if x > max {
                errores.insert(
                    id.clone(),
                    format!(
                        "Tiene que estar entre {} y {}.",
                        num(var.min.unwrap_or(0.0)),
                        num(max)
                    ),
                );
            }
        }
    }
    errores
}

fn texto_resultado(simbolo: &str, valor: f64, unidad: &str) -> String {
    let u = match unidad {
        "°" => "^\\circ".to_string(),
        "" => String::new(),
        u => format!("\\ \\text{{{}}}", u.replace("²", "}^2\\text{")),
    };
    format!("{simbolo} = {}{u}", num(valor))
}

pub fn resolver(modelo: &Modelo, entrada: &Entrada) -> Solucion {
    // Valores por defecto (g = 9.81 m/s², h₀ = 0) si no se dieron ni se piden
    let mut datos = entrada.datos.clone();
    for var in &modelo.variables {
        if let Some(def) = var.defecto {
            if !entrada.incognitas.iter().any(|i| i == var.id) {
                datos.entry(var.id.to_string()).or_insert(def);
            }
        }
    }
    let entrada = &Entrada {
        modelo: entrada.modelo.clone(),
        datos,
        incognitas: entrada.incognitas.clone(),
    };
    let errores = validar(modelo, &entrada.datos);
    let incognitas: Vec<String> = entrada
        .incognitas
        .iter()
        .filter(|id| modelo.variable(id).is_some() && !entrada.datos.contains_key(*id))
        .cloned()
        .collect();
    let mut sol = Solucion {
        modelo: modelo.id.into(),
        dados: entrada.datos.clone(),
        valores: entrada.datos.clone(),
        incognitas: incognitas.clone(),
        pasos: vec![],
        faltantes: vec![],
        inconsistencias: vec![],
        avisos: vec![],
        errores,
    };
    if !sol.errores.is_empty() {
        return sol;
    }

    let mut fallidos: BTreeSet<(String, String)> = BTreeSet::new();
    let mut bloqueadas: BTreeSet<String> = BTreeSet::new();
    let mut con_aviso: BTreeSet<String> = BTreeSet::new();

    for _ in 0..64 {
        let vals = V(&sol.valores);
        // Elegir la ecuación con una sola incógnita y el despeje más sencillo
        let mut mejor: Option<(&crate::modelo::Ecuacion, &crate::modelo::FormaDespejada)> = None;
        for ec in &modelo.ecuaciones {
            if let Some(cond) = ec.cuando {
                if !cond(&vals) {
                    continue;
                }
            }
            let desconocidas: Vec<&str> = ec
                .vars
                .iter()
                .copied()
                .filter(|id| !vals.tiene(id))
                .collect();
            if desconocidas.len() != 1 {
                continue;
            }
            let var = desconocidas[0];
            if bloqueadas.contains(var) || fallidos.contains(&(ec.id.into(), var.into())) {
                continue;
            }
            if let Some(forma) = ec.despejes.iter().find(|d| d.var == var) {
                let es_mejor = match mejor {
                    None => true,
                    Some((_, f)) => forma.prioridad < f.prioridad,
                };
                if es_mejor {
                    mejor = Some((ec, forma));
                }
            }
        }
        let Some((ec, forma)) = mejor else { break };
        let var = modelo.variable(forma.var).expect("variable del modelo");

        match (forma.f)(&vals) {
            Despeje::NoAplica => {
                fallidos.insert((ec.id.into(), forma.var.into()));
            }
            Despeje::Imposible(msg) => {
                fallidos.insert((ec.id.into(), forma.var.into()));
                if con_aviso.insert(forma.var.into()) && !sol.avisos.contains(&msg) {
                    sol.avisos.push(msg);
                }
            }
            Despeje::Valor {
                valor,
                sustitucion,
                nota,
            } => {
                if !valor.is_finite() {
                    fallidos.insert((ec.id.into(), forma.var.into()));
                    continue;
                }
                if let Some(min) = var.min {
                    if valor < min - 1e-9 {
                        fallidos.insert((ec.id.into(), forma.var.into()));
                        let msg = format!(
                            "Al despejar {} de la ecuación sale un valor negativo ({} {}), que no tiene sentido físico. Revisá los datos.",
                            var.etiqueta.to_lowercase(), txt(valor), var.unidad
                        );
                        if !sol.avisos.contains(&msg) {
                            sol.avisos.push(msg);
                        }
                        // Un despeje lineal es definitivo: no se busca otro camino
                        if forma.prioridad == 1 {
                            bloqueadas.insert(forma.var.into());
                        }
                        continue;
                    }
                }
                let valor = if valor.abs() < 1e-12 { 0.0 } else { valor };
                sol.valores.insert(forma.var.into(), valor);
                let normal = |s: &str| s.replace(' ', "");
                sol.pasos.push(Paso {
                    variable: forma.var.into(),
                    simbolo: var.simbolo.into(),
                    etiqueta: var.etiqueta.into(),
                    unidad: var.unidad.into(),
                    ecuacion: ec.latex.into(),
                    despeje: (normal(forma.latex) != normal(ec.latex))
                        .then(|| forma.latex.to_string()),
                    sustitucion,
                    valor,
                    resultado: texto_resultado(var.simbolo, valor, var.unidad),
                    nota,
                    pedido: incognitas.iter().any(|i| i == forma.var),
                    necesario: true,
                });
            }
        }
    }

    // Pasos necesarios: se recorre hacia atrás desde las incógnitas pedidas
    if !incognitas.is_empty() {
        let mut necesita: BTreeSet<String> = incognitas.iter().cloned().collect();
        for i in (0..sol.pasos.len()).rev() {
            let p = &sol.pasos[i];
            let req = necesita.contains(&p.variable);
            if req {
                let ec = modelo
                    .ecuaciones
                    .iter()
                    .find(|e| e.latex == p.ecuacion)
                    .unwrap();
                for v in ec.vars {
                    necesita.insert(v.to_string());
                }
            }
            sol.pasos[i].necesario = req;
        }
    }

    sol.faltantes = modelo
        .variables
        .iter()
        .filter(|v| !sol.valores.contains_key(v.id))
        .map(|v| v.id.to_string())
        .collect();

    // Consistencia: toda ecuación con sus variables conocidas debe cumplirse
    let vals = V(&sol.valores);
    for ec in &modelo.ecuaciones {
        if let Some(cond) = ec.cuando {
            if !cond(&vals) {
                continue;
            }
        }
        if ec.vars.iter().any(|id| !vals.tiene(id)) {
            continue;
        }
        let (l, r) = (ec.residuo)(&vals);
        let escala = l.abs().max(r.abs()).max(1.0);
        if (l - r).abs() > TOLERANCIA * escala {
            sol.inconsistencias.push(ec.latex.into());
        }
    }
    sol
}
