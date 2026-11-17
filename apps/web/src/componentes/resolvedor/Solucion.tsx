import { useState } from 'react';
import type { Modelo, Solucion as TSolucion } from '@cinemalab/contratos';
import { fmt } from '../../lib/formato';
import { Formula } from '../comunes/Formula';
import { Significados } from '../comunes/Significados';
import { descripcionDe } from '../../lib/descripciones';

const unidadTex = (u: string) => (u === '°' ? '^\\circ' : `\\ \\text{${u.replace('²', '}^2\\text{')}}`);

/**
 * Solución paso a paso con formato de apuntes de clase:
 * hoja de cuaderno, Datos / Incógnita, fórmula, despeje, sustitución,
 * resultado en recuadro y la respuesta con "R/".
 */
export function Solucion({ modelo, solucion, enunciado }: { modelo: Modelo; solucion: TSolucion; enunciado?: string }) {
  const [todos, setTodos] = useState(false);
  const pedidos = new Set(solucion.incognitas);
  const visibles = solucion.pasos.filter((p) => todos || p.necesario);
  const ocultos = solucion.pasos.length - visibles.length;
  const varDe = (id: string) => modelo.variables.find((v) => v.id === id)!;
  const valorTex = (id: string, v: number) => `${varDe(id).simbolo} = ${fmt(v).replace('−', '-')}${unidadTex(varDe(id).unidad)}`;

  const respuesta = (pedidos.size ? solucion.incognitas : solucion.pasos.map((p) => p.variable))
    .filter((id) => solucion.valores[id] !== undefined)
    .map((id) => varDe(id));
  const faltanPedidos = solucion.incognitas.filter((id) => solucion.valores[id] === undefined);
  const incognitasVista = pedidos.size ? solucion.incognitas : solucion.pasos.map((p) => p.variable);

  return (
    <div className="solucion apuntes">
      <div className="hoja">
        <p className="hoja-tema">{modelo.nombre}</p>
        {enunciado && <p className="enunciado">{enunciado}</p>}

        <div className="apuntes-cabeza">
          <section className="apuntes-datos" aria-label="Datos del problema">
            <h4>Datos:</h4>
            <ul>
              {Object.entries(solucion.dados).map(([id, v]) => (
                <li key={id}>
                  <Formula tex={valorTex(id, v)} />
                  <span className="glosa">{varDe(id).etiqueta.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="apuntes-incognita" aria-label="Incógnitas">
            <h4>{incognitasVista.length > 1 ? 'Incógnitas:' : 'Incógnita:'}</h4>
            <ul>
              {incognitasVista.map((id) => (
                <li key={id}><Formula tex={`${varDe(id).simbolo} = \\,?`} /><span className="glosa">{varDe(id).etiqueta.toLowerCase()}</span></li>
              ))}
              {incognitasVista.length === 0 && <li className="glosa">—</li>}
            </ul>
          </section>
        </div>

        {solucion.pasos.length === 0 && solucion.avisos.length === 0 && (
          <div className="aviso error"><strong>Faltan datos.</strong> Con lo que escribiste no se puede despejar ninguna incógnita. Agregá al menos un dato más.</div>
        )}

        {visibles.length > 0 && <h4 className="apuntes-sol">Solución:</h4>}
        <ol className="pasos">
          {visibles.map((p, i) => (
            <li key={p.variable} className={`paso${p.pedido ? ' pedido' : ''}`}>
              <h5>
                <span className="num-paso" aria-hidden="true">{i + 1}</span>
                <span className="sr">Paso {i + 1}: </span>
                Calculamos {p.etiqueta.toLowerCase()} <Formula tex={`(${p.simbolo})`} />
              </h5>
              <div className="renglones">
                {descripcionDe(p.ecuacion) && (
                  <p className="que-es"><b>{descripcionDe(p.ecuacion)!.nombre}.</b> {descripcionDe(p.ecuacion)!.para}</p>
                )}
                <p className="renglon"><span className="lbl">Fórmula</span><Formula tex={p.ecuacion} /></p>
                <Significados tex={p.ecuacion} variables={modelo.variables} className="en-hoja" />
                {p.despeje && <p className="renglon"><span className="lbl">Despejando</span><Formula tex={p.despeje} /></p>}
                <p className="renglon"><span className="lbl">Sustituyendo</span><Formula tex={p.sustitucion} /></p>
                <p className="renglon"><span className="lbl" aria-hidden="true" /><span className="caja"><Formula tex={p.resultado} /></span></p>
              </div>
              {p.nota && <p className="nota"><strong>Ojo:</strong> {p.nota}</p>}
            </li>
          ))}
        </ol>
        {ocultos > 0 && (
          <button type="button" className="enlace" onClick={() => setTodos(true)}>
            Ver también {ocultos} cálculo{ocultos > 1 ? 's' : ''} extra que no te piden
          </button>
        )}
        {todos && pedidos.size > 0 && solucion.pasos.some((p) => !p.necesario) && (
          <button type="button" className="enlace" onClick={() => setTodos(false)}>Mostrar solo los pasos necesarios</button>
        )}

        {respuesta.length > 0 && (
          <div className="respuesta">
            <span className="r-barra" aria-label="Respuesta">R/</span>
            <ul>
              {respuesta.map((v) => (
                <li key={v.id} className={pedidos.has(v.id) ? 'pedido' : ''}>
                  <span className="glosa">{v.etiqueta}:</span> <Formula tex={valorTex(v.id, solucion.valores[v.id])} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {faltanPedidos.length > 0 && (
          <div className="aviso error">
            <strong>No se pudo calcular {faltanPedidos.map((id) => varDe(id).etiqueta.toLowerCase()).join(', ')}.</strong>{' '}
            {solucion.avisos.length ? 'Los datos no permiten una solución física:' : 'Hace falta otro dato del problema.'}
          </div>
        )}
        {solucion.avisos.map((a) => <div key={a} className="aviso error">{a}</div>)}
        {solucion.inconsistencias.length > 0 && (
          <div className="aviso alerta">
            <strong>Ojo: los datos no son consistentes entre sí.</strong> No cumplen{' '}
            {solucion.inconsistencias.map((e) => <span key={e} className="chip"><Formula tex={e} /></span>)}. Revisá si copiaste bien los datos o quitá el que sobra.
          </div>
        )}
      </div>
    </div>
  );
}
