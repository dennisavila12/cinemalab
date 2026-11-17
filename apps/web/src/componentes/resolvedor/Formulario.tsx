import type { Modelo } from '@cinemalab/contratos';
import { Formula } from '../comunes/Formula';

interface Props {
  modelo: Modelo;
  entradas: Record<string, string>;
  incognitas: Set<string>;
  errores: Record<string, string>;
  onEntrada: (id: string, valor: string) => void;
  onIncognita: (id: string) => void;
  onSalir: (id: string) => void;
}

/** Un campo por variable: símbolo, nombre, unidad y el botón "?" para marcarla como incógnita. */
export function Formulario({ modelo, entradas, incognitas, errores, onEntrada, onIncognita, onSalir }: Props) {
  return (
    <div className="campos">
      {modelo.variables.map((v) => {
        const id = `campo-${v.id}`;
        const esIncognita = incognitas.has(v.id);
        const error = errores[v.id];
        return (
          <div key={v.id} className={`campo${esIncognita ? ' incognita' : ''}${error ? ' con-error' : ''}`}>
            <label htmlFor={id}>
              <span className="simbolo"><Formula tex={v.simbolo} /></span>
              {v.etiqueta}
            </label>
            <div className="campo-fila">
              <div className="entrada">
                <input
                  id={id}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={entradas[v.id] ?? ''}
                  placeholder={esIncognita ? 'incógnita' : 'sin dato'}
                  onChange={(e) => onEntrada(v.id, e.target.value)}
                  onBlur={() => onSalir(v.id)}
                  aria-invalid={!!error}
                  aria-describedby={`${id}-error`}
                />
                <span className="unidad">{v.unidad}</span>
              </div>
              <button
                type="button"
                className="boton-incognita"
                aria-pressed={esIncognita}
                aria-label={`Marcar ${v.etiqueta.toLowerCase()} como incógnita`}
                title="Marcar como incógnita"
                onClick={() => onIncognita(v.id)}
              >
                ?
              </button>
            </div>
            <div className="error" id={`${id}-error`}>{error}</div>
          </div>
        );
      })}
    </div>
  );
}
