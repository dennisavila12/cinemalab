import { significados } from '../../lib/significados';
import { Formula } from './Formula';

/** Lista «donde: v = velocidad (m/s) · t = tiempo (s)…» debajo de una fórmula. */
export function Significados({ tex, variables, className }: { tex: string | string[]; variables?: { simbolo: string; etiqueta: string; unidad: string }[]; className?: string }) {
  const lista = significados(tex, variables);
  if (!lista.length) return null;
  return (
    <p className={`significados${className ? ` ${className}` : ''}`}>
      <span className="donde">donde</span>
      {lista.map((s) => (
        <span key={s.simbolo} className="significado"><Formula tex={s.simbolo} /> = {s.texto}</span>
      ))}
    </p>
  );
}
