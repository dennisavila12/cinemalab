import { useState } from 'react';
import type { Capa, Modelo, RespuestaResolver } from '@cinemalab/contratos';
import { api } from '../../api/cliente';
import { leerNumero } from '../../lib/formato';
import { estadoEn } from '../../lib/interpolar';
import { useReloj } from '../../hooks/useReloj';
import { Formula } from '../comunes/Formula';
import { Significados } from '../comunes/Significados';
import { Graficas } from '../graficas/Graficas';
import { Controles } from '../simulacion/Controles';
import { EscenaMovimiento } from '../simulacion/EscenaMovimiento';
import { Lecturas } from '../simulacion/Lecturas';
import { Formulario } from './Formulario';
import { Solucion } from './Solucion';

interface EstadoForm {
  entradas: Record<string, string>;
  incognitas: string[];
  enunciado?: string;
  respuesta?: RespuestaResolver;
}

// Recordar lo escrito en cada modelo al cambiar de pestaña
const memoria = new Map<string, EstadoForm>();

function inicial(m: Modelo): EstadoForm {
  return { entradas: Object.fromEntries(m.variables.filter((v) => v.defecto !== undefined).map((v) => [v.id, String(v.defecto)])), incognitas: [] };
}

export interface PeticionClase {
  datos: Record<string, number>;
  incognitas: string[];
  enunciado?: string;
}

export function Resolvedor({ modelo, onExplicar }: { modelo: Modelo; onExplicar: (p: PeticionClase) => void }) {
  const [estado, setEstadoLocal] = useState<EstadoForm>(() => memoria.get(modelo.id) ?? inicial(modelo));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const setEstado = (f: (e: EstadoForm) => EstadoForm) =>
    setEstadoLocal((e) => {
      const n = f(e);
      memoria.set(modelo.id, n);
      return n;
    });

  const plano = modelo.dimension === 'plano';
  const sim = estado.respuesta?.simulacion ?? null;
  const reloj = useReloj(0, sim?.movimiento.t_max ?? 0);
  const capas: Capa[] = plano ? ['trayectoria', 'estrobo', 'vectores', 'punto_alto'] : ['estrobo', 'vectores'];

  const leerDatos = () => {
    const datos: Record<string, number> = {};
    const errs: Record<string, string> = {};
    for (const v of modelo.variables) {
      const n = leerNumero(estado.entradas[v.id] ?? '');
      if (n === null) continue;
      if (Number.isNaN(n)) errs[v.id] = 'Escribí un número válido.';
      else datos[v.id] = n;
    }
    return { datos, errs };
  };

  const resolver = async (entradas = estado.entradas, incognitas = estado.incognitas, enunciado = estado.enunciado) => {
    const { datos, errs } = (() => {
      const d: Record<string, number> = {};
      const e: Record<string, string> = {};
      for (const v of modelo.variables) {
        const n = leerNumero(entradas[v.id] ?? '');
        if (n === null) continue;
        if (Number.isNaN(n)) e[v.id] = 'Escribí un número válido.';
        else d[v.id] = n;
      }
      return { datos: d, errs: e };
    })();
    setErrores(errs);
    if (Object.keys(errs).length) return setErrorGeneral('Revisá los datos marcados en rojo.');
    if (!Object.keys(datos).some((k) => k !== 'g' && k !== 'h0')) return setErrorGeneral('Escribí al menos un dato del problema.');
    setErrorGeneral(undefined);
    setCargando(true);
    try {
      const r = await api.resolver({ modelo: modelo.id, datos, incognitas });
      setErrores(r.solucion.errores);
      if (Object.keys(r.solucion.errores).length) setErrorGeneral('Revisá los datos marcados en rojo.');
      setEstado((e) => ({ ...e, entradas, incognitas, enunciado, respuesta: Object.keys(r.solucion.errores).length ? undefined : r }));
    } catch (e) {
      setErrorGeneral((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  const cargarEjemplo = (i: number) => {
    const ej = modelo.ejemplos[i];
    const base = inicial(modelo).entradas;
    const entradas = { ...base, ...Object.fromEntries(Object.entries(ej.datos).map(([k, v]) => [k, String(v)])) };
    setEstado(() => ({ entradas, incognitas: ej.pide, enunciado: ej.enunciado }));
    void resolver(entradas, ej.pide, ej.enunciado);
  };

  const alternarIncognita = (id: string) =>
    setEstado((e) => {
      const marcada = e.incognitas.includes(id);
      const entradas = { ...e.entradas };
      if (!marcada) delete entradas[id];
      return { ...e, entradas, incognitas: marcada ? e.incognitas.filter((x) => x !== id) : [...e.incognitas, id] };
    });

  const explicar = () => {
    const { datos } = leerDatos();
    onExplicar({ datos, incognitas: estado.incognitas, enunciado: estado.enunciado });
  };

  return (
    <div className="distribucion">
      <aside className="panel" aria-labelledby="titulo-datos">
        <h2 id="titulo-datos">Datos del problema</h2>
        <p className="descripcion">{modelo.descripcion}</p>
        <form onSubmit={(e) => { e.preventDefault(); void resolver(); }} noValidate>
          <Formulario
            modelo={modelo}
            entradas={estado.entradas}
            incognitas={new Set(estado.incognitas)}
            errores={errores}
            onEntrada={(id, v) => { setEstado((e) => ({ ...e, enunciado: undefined, entradas: { ...e.entradas, [id]: v } })); setErrores(({ [id]: _, ...resto }) => resto); }}
            onSalir={(id) => { const n = leerNumero(estado.entradas[id] ?? ''); if (Number.isNaN(n)) setErrores((x) => ({ ...x, [id]: 'Escribí un número válido.' })); }}
            onIncognita={alternarIncognita}
          />
          <p className="pista">Escribí solo los datos del enunciado y dejá en blanco lo demás. Con <span className="tecla-q">?</span> marcás lo que te piden.</p>
          {errorGeneral && <div className="aviso error" role="alert">{errorGeneral}</div>}
          <div className="acciones">
            <button type="submit" className="boton primario" disabled={cargando}>{cargando ? 'Resolviendo…' : 'Resolver y simular'}</button>
            <button type="button" className="boton fantasma" onClick={() => { setEstado(() => inicial(modelo)); setErrores({}); setErrorGeneral(undefined); }}>Limpiar datos</button>
          </div>
        </form>

        <section className="ejemplos" aria-labelledby="titulo-ejemplos">
          <h3 id="titulo-ejemplos">Ejercicios de ejemplo</h3>
          <ul>
            {modelo.ejemplos.map((ej, i) => (
              <li key={ej.titulo}>
                <button type="button" className="ejemplo" onClick={() => cargarEjemplo(i)}>
                  <strong>{ej.titulo}</strong>
                  <span>{ej.enunciado}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <details className="ecuaciones" open>
          <summary>Ecuaciones del modelo y qué significa cada letra</summary>
          <ul>{modelo.ecuaciones.map((e) => <li key={e}><Formula tex={e} /><Significados tex={e} variables={modelo.variables} /></li>)}</ul>
        </details>
      </aside>

      <div className="trabajo">
        <section className="tarjeta" aria-labelledby="titulo-solucion">
          <header className="tarjeta-cabeza">
            <h2 id="titulo-solucion">Solución paso a paso</h2>
            {estado.respuesta && (
              <button type="button" className="boton secundario chico" onClick={explicar}>Explicarlo en Modo clase</button>
            )}
          </header>
          {estado.respuesta ? (
            <Solucion modelo={modelo} solucion={estado.respuesta.solucion} enunciado={estado.enunciado} />
          ) : (
            <div className="vacio">
              <p><strong>Todavía no hay nada que resolver.</strong></p>
              <p>Cargá un ejercicio de ejemplo o escribí tus datos y presioná <em>Resolver y simular</em>.</p>
            </div>
          )}
        </section>

        <section className="tarjeta" aria-labelledby="titulo-sim">
          <header className="tarjeta-cabeza">
            <h2 id="titulo-sim">Simulación</h2>
            {sim && <span className="insignia">Duración: {sim.movimiento.t_max.toFixed(3).replace(/\.?0+$/, '')} s</span>}
          </header>
          {sim ? (
            <>
              <EscenaMovimiento simulacion={sim} plano={plano} t={reloj.t} capas={capas} />
              <Controles reloj={reloj} desde={0} hasta={sim.movimiento.t_max} />
              <Lecturas estado={estadoEn(sim.muestras, reloj.t)} plano={plano} />
            </>
          ) : (
            <div className="vacio">{estado.respuesta?.aviso_simulacion ?? 'La animación aparece cuando resolvés un ejercicio.'}</div>
          )}
        </section>

        {sim && <Graficas simulacion={sim} plano={plano} t={reloj.t} />}
      </div>
    </div>
  );
}
