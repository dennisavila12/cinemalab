//! Puente WebAssembly del motor de física.
//!
//! Es el mismo contrato que el puente de Node (`fisica-node`): cada operación recibe y
//! devuelve JSON en texto. Como WebAssembly solo intercambia números, el texto viaja por la
//! memoria del módulo:
//!
//! 1. JavaScript pide un espacio con [`cl_reservar`] y copia ahí la entrada (UTF-8).
//! 2. Llama a [`cl_llamar`] con el número de operación; devuelve 0 si salió bien y 1 si hubo error.
//! 3. Lee la respuesta (o el mensaje de error) con [`cl_salida_ptr`] y [`cl_salida_len`].
//! 4. Libera la entrada con [`cl_liberar`].
//!
//! No usa dependencias extra: se compila con `cargo build --target wasm32-unknown-unknown`.

use std::cell::RefCell;

/// Operaciones disponibles (mismo orden que las rutas de la API).
pub mod op {
    pub const VERSION: u32 = 0;
    pub const MODELOS: u32 = 1;
    pub const RESOLVER: u32 = 2;
    pub const LECCION: u32 = 3;
    pub const ESCENARIOS: u32 = 4;
    pub const TIRO: u32 = 5;
    pub const SUGERENCIA: u32 = 6;
}

thread_local! {
    static SALIDA: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

/// Ejecuta una operación del motor. Separada del ABI para poder probarla sin WebAssembly.
pub fn ejecutar(operacion: u32, entrada: &str) -> Result<String, String> {
    match operacion {
        op::VERSION => Ok(fisica_core::version().to_string()),
        op::MODELOS => fisica_core::api::modelos(),
        op::RESOLVER => fisica_core::api::resolver(entrada),
        op::LECCION => fisica_core::api::leccion(entrada),
        op::ESCENARIOS => fisica_core::api::escenarios(),
        op::TIRO => fisica_core::api::tiro(entrada),
        op::SUGERENCIA => fisica_core::api::sugerencia(entrada),
        otra => Err(format!("Operación desconocida: {otra}")),
    }
}

/// Reserva `n` bytes en la memoria del módulo para que JavaScript escriba la entrada.
#[no_mangle]
pub extern "C" fn cl_reservar(n: usize) -> *mut u8 {
    let mut v = Vec::<u8>::with_capacity(n);
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

/// Libera un espacio pedido con [`cl_reservar`].
///
/// # Safety
/// `p` y `n` deben ser exactamente los de una llamada previa a [`cl_reservar`].
#[no_mangle]
pub unsafe extern "C" fn cl_liberar(p: *mut u8, n: usize) {
    if n > 0 && !p.is_null() {
        drop(Vec::from_raw_parts(p, 0, n));
    }
}

/// Ejecuta la operación con la entrada de `n` bytes en `p`. Devuelve 0 si salió bien, 1 si no.
///
/// # Safety
/// `p` debe apuntar a `n` bytes válidos (o `n` debe ser 0).
#[no_mangle]
pub unsafe extern "C" fn cl_llamar(operacion: u32, p: *const u8, n: usize) -> u32 {
    let bytes: &[u8] = if n == 0 || p.is_null() { &[] } else { std::slice::from_raw_parts(p, n) };
    let (codigo, texto) = match std::str::from_utf8(bytes) {
        Err(_) => (1, "La entrada no es texto UTF-8 válido.".to_string()),
        Ok(entrada) => match ejecutar(operacion, entrada) {
            Ok(s) => (0, s),
            Err(e) => (1, e),
        },
    };
    SALIDA.with(|s| *s.borrow_mut() = texto.into_bytes());
    codigo
}

/// Dirección de la última respuesta.
#[no_mangle]
pub extern "C" fn cl_salida_ptr() -> *const u8 {
    SALIDA.with(|s| s.borrow().as_ptr())
}

/// Largo en bytes de la última respuesta.
#[no_mangle]
pub extern "C" fn cl_salida_len() -> usize {
    SALIDA.with(|s| s.borrow().len())
}

#[cfg(test)]
mod pruebas {
    use super::*;

    fn llamar(operacion: u32, entrada: &str) -> (u32, String) {
        let b = entrada.as_bytes();
        let p = cl_reservar(b.len());
        unsafe {
            std::ptr::copy_nonoverlapping(b.as_ptr(), p, b.len());
            let codigo = cl_llamar(operacion, p, b.len());
            cl_liberar(p, b.len());
            let salida = std::slice::from_raw_parts(cl_salida_ptr(), cl_salida_len()).to_vec();
            (codigo, String::from_utf8(salida).unwrap())
        }
    }

    #[test]
    fn mismas_respuestas_que_la_api() {
        assert_eq!(llamar(op::MODELOS, ""), (0, fisica_core::api::modelos().unwrap()));
        assert_eq!(llamar(op::ESCENARIOS, ""), (0, fisica_core::api::escenarios().unwrap()));
        let e = r#"{"modelo":"mrua","datos":{"v0":25,"v":0,"dx":50},"incognitas":["a","t"]}"#;
        assert_eq!(llamar(op::RESOLVER, e), (0, fisica_core::api::resolver(e).unwrap()));
    }

    #[test]
    fn errores_y_entradas_raras() {
        let (codigo, msg) = llamar(op::RESOLVER, "esto no es json");
        assert_eq!(codigo, 1);
        assert!(!msg.is_empty());
        assert_eq!(llamar(99, "").0, 1);
        assert_eq!(llamar(op::VERSION, "").1, fisica_core::version());
        unsafe { assert_eq!(cl_llamar(op::MODELOS, std::ptr::null(), 0), 0) };
    }
}
