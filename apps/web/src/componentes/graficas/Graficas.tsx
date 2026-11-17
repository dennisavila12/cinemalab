import { useMemo, useState } from 'react';
import type { Simulacion } from '@cinemalab/contratos';
import { estadoEn } from '../../lib/interpolar';
import { fmt } from '../../lib/formato';
import { Pestanas } from '../comunes/Pestanas';
import { Grafica } from './Grafica';
import { cursorEn, definirGrafica, type DefGrafica } from './defs';

type Vista = DefGrafica['id'] | 'tabla';

/** Tarjeta de gráficas con pestañas, tabla de valores y descarga en CSV. */
export function Graficas({ simulacion, plano, t }: { simulacion: Simulacion; plano: boolean; t: number }) {
  const ids: DefGrafica['id'][] = plano ? ['trayectoria', 'xy_t', 'vxy_t'] : ['x', 'v', 'a'];
  const [vista, setVista] = useState<Vista>(ids[0]);
  const actual = ids.includes(vista as DefGrafica['id']) || vista === 'tabla' ? vista : ids[0];
  const M = simulacion.muestras;
  const defs = useMemo(() => ids.map((id) => definirGrafica(id, M)), [M, plano]); // eslint-disable-line react-hooks/exhaustive-deps
  const def = defs.find((d) => d.id === actual);

  const filas = useMemo(() => Array.from({ length: 11 }, (_, i) => estadoEn(M, (simulacion.movimiento.t_max * i) / 10)), [M, simulacion]);
  const columnas: [string, (e: (typeof filas)[number]) => number][] = plano
    ? [['t (s)', (e) => e.t], ['x (m)', (e) => e.x], ['y (m)', (e) => e.y], ['vx (m/s)', (e) => e.vx], ['vy (m/s)', (e) => e.vy], ['|v| (m/s)', (e) => Math.hypot(e.vx, e.vy)]]
    : [['t (s)', (e) => e.t], ['x (m)', (e) => e.x], ['v (m/s)', (e) => e.vx], ['a (m/s²)', (e) => e.ax]];

  const descargar = () => {
    const lineas = [columnas.map((c) => c[0]).join(',')];
    M.forEach((e, i) => {
      if (i % 5 === 0 || i === M.length - 1) lineas.push(columnas.map(([, f]) => String(+f(e).toFixed(6))).join(','));
    });
    const url = URL.createObjectURL(new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cinemalab-datos.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="tarjeta" aria-labelledby="titulo-graficas">
      <header className="tarjeta-cabeza">
        <h2 id="titulo-graficas">Gráficas</h2>
        <button type="button" className="boton fantasma chico" onClick={descargar}>Descargar datos (CSV)</button>
      </header>
      <Pestanas
        etiqueta="Gráfica"
        variante="suave"
        valor={actual}
        onCambio={setVista}
        opciones={[...defs.map((d) => ({ id: d.id as Vista, texto: d.nombre })), { id: 'tabla' as Vista, texto: 'Tabla de valores' }]}
      />
      {def ? (
        <Grafica series={def.series} ejeX={def.ejeX} ejeY={def.ejeY} mismaEscala={def.mismaEscala} cursor={cursorEn(def, M, t)} />
      ) : (
        <div className="tabla-envoltura">
          <table>
            <thead><tr>{columnas.map(([c]) => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>{filas.map((e, i) => <tr key={i}>{columnas.map(([c, f]) => <td key={c}>{fmt(f(e), 3)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
