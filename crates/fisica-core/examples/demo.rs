//! Ejemplo: cargo run -p fisica-core --example demo
fn main() {
    let r =
        fisica_core::api::tiro(r#"{"escenario":"latas-3","angulo":30,"rapidez":15,"numero":1}"#)
            .unwrap();
    let v: serde_json::Value = serde_json::from_str(&r).unwrap();
    println!("{}", serde_json::to_string_pretty(&v["analisis"]).unwrap());
    let s = fisica_core::api::sugerencia(r#"{"escenario":"latas-3","angulo":30}"#).unwrap();
    let v: serde_json::Value = serde_json::from_str(&s).unwrap();
    println!("{}", serde_json::to_string_pretty(&v).unwrap());
    let l = fisica_core::api::leccion(r#"{"modelo":"mrua"}"#).unwrap();
    let v: serde_json::Value = serde_json::from_str(&l).unwrap();
    for e in v["escenas"].as_array().unwrap() {
        println!("- {} | {:?}", e["titulo"], e["capas"]);
    }
    let x = fisica_core::api::resolver(
        r#"{"modelo":"mrua","datos":{"v0":25,"v":0,"dx":50},"incognitas":["a","t"]}"#,
    )
    .unwrap();
    let v: serde_json::Value = serde_json::from_str(&x).unwrap();
    println!(
        "{}",
        serde_json::to_string_pretty(&v["solucion"]["pasos"]).unwrap()
    );
}
