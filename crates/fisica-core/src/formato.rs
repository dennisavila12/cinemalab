//! Formato de números y utilidades para escribir fórmulas en LaTeX.

/// Número con hasta 3 decimales, sin ceros sobrantes. Usa el signo menos tipográfico de LaTeX.
pub fn num(x: f64) -> String {
    num_dec(x, 3)
}

pub fn num_dec(x: f64, dec: usize) -> String {
    if x.is_nan() {
        return "—".into();
    }
    if x.is_infinite() {
        return "\\infty".into();
    }
    let x = if x.abs() < 1e-9 { 0.0 } else { x };
    let d = if x.abs() >= 1000.0 { dec.min(1) } else { dec };
    let mut s = format!("{:.*}", d, x);
    if s.contains('.') {
        while s.ends_with('0') {
            s.pop();
        }
        if s.ends_with('.') {
            s.pop();
        }
    }
    if s == "-0" {
        s = "0".into();
    }
    s
}

/// Número para sustituir dentro de una fórmula: los negativos van entre paréntesis.
pub fn par(x: f64) -> String {
    let s = num(x);
    if s.starts_with('-') {
        format!("({s})")
    } else {
        s
    }
}

/// Número en texto plano (para frases), con el signo menos tipográfico.
pub fn txt(x: f64) -> String {
    num(x).replace('-', "−")
}

pub fn txt_dec(x: f64, d: usize) -> String {
    num_dec(x, d).replace('-', "−")
}

/// Raíces reales positivas de a·t² + b·t + c = 0, de menor a mayor.
pub fn raices_positivas(a: f64, b: f64, c: f64) -> Vec<f64> {
    const EPS: f64 = 1e-12;
    if a.abs() < EPS {
        if b.abs() < EPS {
            return vec![];
        }
        let r = -c / b;
        return if r >= -EPS { vec![r.max(0.0)] } else { vec![] };
    }
    let disc = b * b - 4.0 * a * c;
    if disc < -EPS {
        return vec![];
    }
    let sq = disc.max(0.0).sqrt();
    let mut r: Vec<f64> = [(-b - sq) / (2.0 * a), (-b + sq) / (2.0 * a)]
        .into_iter()
        .filter(|r| *r > EPS)
        .collect();
    r.sort_by(|a, b| a.partial_cmp(b).unwrap());
    r.dedup_by(|a, b| (*a - *b).abs() < 1e-9);
    r
}

pub fn rad(grados: f64) -> f64 {
    grados.to_radians()
}

#[cfg(test)]
mod pruebas {
    use super::*;
    #[test]
    fn formato_basico() {
        assert_eq!(num(2.5), "2.5");
        assert_eq!(num(3.0), "3");
        assert_eq!(num(-6.25), "-6.25");
        assert_eq!(par(-6.25), "(-6.25)");
        assert_eq!(num(1.23456), "1.235");
        assert_eq!(num(-0.0000001), "0");
    }
    #[test]
    fn raices() {
        assert_eq!(raices_positivas(1.0, -3.0, 2.0), vec![1.0, 2.0]);
        assert!(raices_positivas(1.0, 0.0, 1.0).is_empty());
        assert_eq!(raices_positivas(0.0, 2.0, -4.0), vec![2.0]);
    }
}
