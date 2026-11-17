import { useEffect, useMemo, useState } from 'react';
import type { Leccion, Modelo } from '@cinemalab/contratos';
import { api } from '../../api/cliente';
import { useReloj } from '../../hooks/useReloj';
import { callar, narrar, vozDisponible } from '../../lib/voz';
import { Formula } from '../comunes/Formula';
import { IconoVoz } from '../comunes/Iconos';
import { Grafica } from '../graficas/Grafica';
import { cursorEn, definirGrafica } from '../graficas/defs';
import { Controles } from '../simulacion/Controles';
import { EscenaMovimiento } from '../simulacion/EscenaMovimiento';
import type { PeticionClase } from '../resolvedor/Resolvedor';

/**
 * Modo clase: reproduce el guion que genera el motor en Rust, escena por escena,
 * como una presentación. Cada escena anima un tramo del movimiento con sus capas visuales.
 */
export function ModoClase({ modelo, peticion }: { modelo: Modelo; peticion?: PeticionClase }) {
  const [leccion, setLeccion] = useState<Leccion>();
  const [error, setError] = useState<string>();
  const [i, setI] = useState(0);
  const [voz, setVoz] = useState(false);
  const [automatico, setAutomatico] = useState(false);
  const [narrando, setNarrando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setLeccion(undefined);
    setError(undefined);
    setI(0);
    api
      .leccion({ modelo: modelo.id, datos: peticion?.datos, incognitas: peticion?.incognitas ?? [], enunciado: peticion?.enunciado })
      .then((l) => vivo && setLeccion(l))
      .catch((e: Error) => vivo && setError(e.message));
    return () => {
      vivo = false;
      callar();
    };
  }, [modelo.id, peticion]);

  const escena = leccion?.escenas[i];
  const reloj = useReloj(escena?.desde ?? 0, escena?.hasta ?? 0, { segundos: 6 });
  const total = leccion?.escenas.length ?? 0;
  const ir = (n: number) => setI(Math.max(0, Math.min(total - 1, n)));

  // Narración por voz al entrar a cada escena
  useEffect(() => {
    if (!voz || !escena) return;
    setNarrando(true);
    let vivo = true;
    narrar(`${escena.titulo}. ${escena.narracion.join(' ')}`).then(() => vivo && setNarrando(false));
    return () => {
      vivo = false;
      callar();
    };
  }, [voz, escena]);

  // Presentación automática: avanza cuando terminan la animación y la voz
  useEffect(() => {
    if (!automatico || !escena || narrando || !reloj.terminado || i >= total - 1) return;
    const id = setTimeout(() => ir(i + 1), voz ? 900 : 4500);
    return () => clearTimeout(id);
  }, [automatico, narrando, reloj.terminado, i, total, voz, escena]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flechas del teclado para avanzar y retroceder
  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') ir(i + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') ir(i - 1);
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
  });

  const grafica = useMemo(
    () => (escena?.grafica && leccion ? definirGrafica(escena.grafica, leccion.simulacion.muestras) : null),
    [escena, leccion],
  );

  if (error) return <div className="aviso error">{error}</div>;
  if (!leccion || !escena) return <div className="cargando" aria-live="polite">Preparando la clase…</div>;

  const plano = modelo.dimension === 'plano';
  const conAnimacion = escena.hasta > escena.desde;

  return (
    <section className="clase" aria-labelledby="titulo-clase">
      <header className="clase-cabeza">
        <div>
          <h2 id="titulo-clase">{leccion.titulo}</h2>
          {leccion.enunciado && (
            <p className="clase-enunciado"><span className="rotulo">{leccion.propio ? 'Tu ejercicio:' : 'Ejemplo:'}</span> {leccion.enunciado}</p>
          )}
        </div>
        <div className="clase-opciones">
          {vozDisponible && (
            <button type="button" className={`boton fantasma chico${voz ? ' activo' : ''}`} aria-pressed={voz} onClick={() => setVoz((v) => !v)}>
              <IconoVoz activa={voz} /> {voz ? 'Narración activada' : 'Narrar en voz alta'}
            </button>
          )}
          <label className="casilla">
            <input type="checkbox" checked={automatico} onChange={(e) => setAutomatico(e.target.checked)} /> Avanzar solo
          </label>
        </div>
      </header>

      <nav className="progreso" aria-label="Escenas de la clase">
        {leccion.escenas.map((e, k) => (
          <button key={k} type="button" className={k === i ? 'actual' : k < i ? 'vista' : ''} onClick={() => ir(k)} title={e.titulo} aria-label={`Escena ${k + 1}: ${e.titulo}`} aria-current={k === i ? 'step' : undefined} />
        ))}
      </nav>

      <div className="clase-cuerpo">
        <div className="clase-visual">
          <EscenaMovimiento simulacion={leccion.simulacion} plano={plano} t={reloj.t} capas={escena.capas} dtMarcas={leccion.marcas} alto={grafica ? 300 : 380} />
          {conAnimacion && <Controles reloj={reloj} desde={escena.desde} hasta={escena.hasta} />}
          {grafica && (
            <Grafica series={grafica.series} ejeX={grafica.ejeX} ejeY={grafica.ejeY} mismaEscala={grafica.mismaEscala} area={grafica.area} cursor={cursorEn(grafica, leccion.simulacion.muestras, reloj.t)} alto={220} />
          )}
        </div>

        <article className="clase-texto hoja apuntes" key={i}>
          <p className="clase-contador">Escena {i + 1} de {total}</p>
          <h3>{escena.titulo}</h3>
          {escena.narracion.map((p) => <p key={p}>{p}</p>)}
          {escena.formulas.length > 0 && (
            <div className="clase-formulas">
              {escena.formulas.map((f, k) => (
                <div key={f} className="clase-formula" style={{ animationDelay: `${150 + k * 220}ms` }}>
                  <Formula tex={f} bloque />
                </div>
              ))}
            </div>
          )}
          {escena.datos.length > 0 && (
            <dl className="clase-datos">
              {escena.datos.map((d) => (
                <div key={d.etiqueta}><dt>{d.etiqueta}</dt><dd><Formula tex={d.valor} /></dd></div>
              ))}
            </dl>
          )}
        </article>
      </div>

      <footer className="clase-pie">
        <button type="button" className="boton fantasma" onClick={() => ir(i - 1)} disabled={i === 0}>← Anterior</button>
        <button type="button" className="boton fantasma" onClick={() => { reloj.ir(escena.desde); reloj.reproducir(); if (voz) narrar(`${escena.titulo}. ${escena.narracion.join(' ')}`); }}>Repetir escena</button>
        <button type="button" className="boton primario" onClick={() => ir(i + 1)} disabled={i === total - 1}>Siguiente →</button>
      </footer>
    </section>
  );
}
