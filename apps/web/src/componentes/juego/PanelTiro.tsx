import type { Bloque, ResultadoTiro, Sugerencia } from '@cinemalab/contratos';
import { fmt } from '../../lib/formato';
import { Formula } from '../comunes/Formula';

function Bloques({ bloques }: { bloques: Bloque[] }) {
  return (
    <ol className="bloques hoja apuntes">
      {bloques.map((b) => (
        <li key={b.titulo}>
          <h4>{b.titulo}</h4>
          {b.texto && <p>{b.texto}</p>}
          {b.formulas.map((f) => <div key={f} className="formula-juego"><Formula tex={f} bloque /></div>)}
        </li>
      ))}
    </ol>
  );
}

interface Props {
  resultado: ResultadoTiro | null;
  quien?: string;
  sugerencia: Sugerencia | null;
  intro: string;
  onProbar: (angulo: number, rapidez: number) => void;
}

/** Explicación del último tiro y cálculo del tiro perfecto. */
export function PanelTiro({ resultado, quien, sugerencia, intro, onProbar }: Props) {
  return (
    <div className="panel-tiro" aria-live="polite">
      {resultado ? (
        <>
          <div className="tiro-cabeza">
            <p className={`frase ${resultado.analisis.resultado === 'acierto' ? 'bien' : 'mal'}`}>{resultado.analisis.frase}</p>
            <p className="veredicto">
              {quien && <strong>{quien}: </strong>}
              {resultado.analisis.veredicto} <span className="suave">(θ = {fmt(resultado.angulo, 1)}°, v₀ = {fmt(resultado.rapidez, 1)} m/s)</span>
            </p>
          </div>
          <Bloques bloques={resultado.analisis.pasos} />
        </>
      ) : (
        <p className="intro-juego">{intro}</p>
      )}
      {sugerencia && sugerencia.pasos.length > 0 && (
        <details className="perfecto" open={!!resultado && resultado.analisis.resultado !== 'acierto'}>
          <summary>¿Cómo se calcula el tiro perfecto?</summary>
          <Bloques bloques={sugerencia.pasos} />
          {sugerencia.aviso && <p className="aviso alerta">{sugerencia.aviso}</p>}
          {sugerencia.posible && (
            <button type="button" className="boton secundario chico" onClick={() => onProbar(sugerencia.angulo, sugerencia.rapidez)}>
              Apuntar con θ = {fmt(sugerencia.angulo, 1)}° y v₀ = {fmt(sugerencia.rapidez, 2)} m/s
            </button>
          )}
        </details>
      )}
    </div>
  );
}
