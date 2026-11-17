import { useRef, type KeyboardEvent } from 'react';

interface Props<T extends string> {
  opciones: { id: T; texto: string; titulo?: string }[];
  valor: T;
  onCambio: (id: T) => void;
  etiqueta: string;
  variante?: 'pildora' | 'segmento' | 'suave';
}

/** Pestañas accesibles (flechas izquierda/derecha para moverse). */
export function Pestanas<T extends string>({ opciones, valor, onCambio, etiqueta, variante = 'pildora' }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const teclas = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = opciones.findIndex((o) => o.id === valor);
    const j = (i + (e.key === 'ArrowRight' ? 1 : opciones.length - 1)) % opciones.length;
    onCambio(opciones[j].id);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[j]?.focus();
  };
  return (
    <div className={`pestanas pestanas-${variante}`} role="tablist" aria-label={etiqueta} ref={ref} onKeyDown={teclas}>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === valor}
          tabIndex={o.id === valor ? 0 : -1}
          title={o.titulo}
          onClick={() => onCambio(o.id)}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
