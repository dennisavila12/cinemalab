import { useEffect, useState } from 'react';
import type { IdModelo, Modelo } from '@cinemalab/contratos';
import { api, MODO_DEMO } from './api/cliente';
import icono from './recursos/icono.svg';
import { Pestanas } from './componentes/comunes/Pestanas';
import { ModoClase } from './componentes/clase/ModoClase';
import { Juego } from './componentes/juego/Juego';
import { Resolvedor, type PeticionClase } from './componentes/resolvedor/Resolvedor';

type Vista = 'resolver' | 'clase' | 'juego';

function leerHash(): { modelo: IdModelo; vista: Vista } {
  const [m, v] = location.hash.replace('#', '').split('-');
  const modelo = (['mru', 'mrua', 'parabolico'] as const).find((x) => x === m) ?? 'mru';
  const vista = (['resolver', 'clase', 'juego'] as const).find((x) => x === v) ?? (modelo === 'parabolico' ? 'juego' : 'resolver');
  return { modelo, vista };
}

export function App() {
  const [modelos, setModelos] = useState<Modelo[]>();
  const [error, setError] = useState<string>();
  const [{ modelo: idModelo, vista }, setRuta] = useState(leerHash);
  const [peticion, setPeticion] = useState<PeticionClase>();

  useEffect(() => {
    api.modelos().then(setModelos).catch((e: Error) => setError(e.message));
    const alCambiar = () => setRuta(leerHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  const ir = (modelo: IdModelo, v: Vista) => {
    setRuta({ modelo, vista: v });
    // Guardar la sección en la dirección (#parabolico-juego). Dentro de un marco o de una
    // vista previa (about:srcdoc) el navegador no lo permite: ahí simplemente se omite.
    try {
      history.replaceState(null, '', `#${modelo}-${v}`);
    } catch {
      /* sin dirección editable: la app sigue funcionando igual */
    }
  };

  const modelo = modelos?.find((m) => m.id === idModelo);
  const vistas: { id: Vista; texto: string }[] = [
    ...(idModelo === 'parabolico' ? [{ id: 'juego' as Vista, texto: 'La hondilla (juego)' }] : []),
    { id: 'resolver', texto: 'Resolver ejercicio' },
    { id: 'clase', texto: 'Modo clase' },
  ];

  return (
    <>
      <header className="barra">
        <div className="marca">
          <img src={icono} alt="" width={38} height={38} />
          <div>
            <h1>CinemaLab</h1>
            <p>Cinemática paso a paso: resolvé, entendé y jugá</p>
          </div>
        </div>
      </header>

      <nav className="navegacion" aria-label="Tipo de movimiento">
        <Pestanas
          etiqueta="Tipo de movimiento"
          valor={idModelo}
          onCambio={(m) => { setPeticion(undefined); ir(m, m === 'parabolico' ? 'juego' : 'resolver'); }}
          opciones={(modelos ?? []).map((m) => ({ id: m.id, texto: m.corto, titulo: m.nombre }))}
        />
        <Pestanas etiqueta="Sección" variante="segmento" valor={vista} onCambio={(v) => ir(idModelo, v)} opciones={vistas} />
      </nav>

      <main className="contenido">
        {error && <div className="aviso error">{error}</div>}
        {!modelo && !error && <div className="cargando">Cargando…</div>}
        {modelo && vista === 'resolver' && (
          <Resolvedor key={modelo.id} modelo={modelo} onExplicar={(p) => { setPeticion(p); ir(modelo.id, 'clase'); }} />
        )}
        {modelo && vista === 'clase' && <ModoClase key={modelo.id} modelo={modelo} peticion={peticion} />}
        {modelo && vista === 'juego' && modelo.id === 'parabolico' && <Juego />}
      </main>

      <footer className="pie">
        {MODO_DEMO && <p className="aviso-demo">Versión de demostración: todo corre en el navegador, sin servidor.</p>}
        Proyecto de Mecánica Clásica (MEC115) · Motor de física en Rust · API en Node.js · Interfaz en React · g = 9.81 m/s² · sin resistencia del aire
      </footer>
    </>
  );
}
