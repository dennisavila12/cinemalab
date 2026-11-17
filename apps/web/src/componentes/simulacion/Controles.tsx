import { fmt } from '../../lib/formato';
import { IconoInicio, IconoPausa, IconoPlay } from '../comunes/Iconos';
import type { useReloj } from '../../hooks/useReloj';

type Reloj = ReturnType<typeof useReloj>;

/** Reproducir/pausar, volver al inicio, línea de tiempo y velocidad. */
export function Controles({ reloj, desde, hasta, deshabilitado = false }: { reloj: Reloj; desde: number; hasta: number; deshabilitado?: boolean }) {
  const span = hasta - desde || 1;
  return (
    <div className="controles">
      <button
        type="button"
        className="boton-icono primario"
        onClick={() => (reloj.corriendo ? reloj.parar() : reloj.reproducir())}
        aria-label={reloj.corriendo ? 'Pausar' : 'Reproducir'}
        title={reloj.corriendo ? 'Pausar' : 'Reproducir'}
        disabled={deshabilitado}
      >
        {reloj.corriendo ? <IconoPausa /> : <IconoPlay />}
      </button>
      <button type="button" className="boton-icono" onClick={() => { reloj.parar(); reloj.ir(desde); }} aria-label="Volver al inicio" title="Volver al inicio" disabled={deshabilitado}>
        <IconoInicio />
      </button>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(((reloj.t - desde) / span) * 1000)}
        onChange={(e) => { reloj.parar(); reloj.ir(desde + (Number(e.target.value) / 1000) * span); }}
        aria-label="Instante de la animación"
        disabled={deshabilitado}
      />
      <output className="tiempo">t = {fmt(reloj.t, 2)} s</output>
      <label className="velocidad">
        <span>Velocidad</span>
        <select value={String(reloj.velocidad)} onChange={(e) => reloj.setVelocidad(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} disabled={deshabilitado}>
          <option value="auto">Ajustada (≈5 s)</option>
          <option value="0.25">0.25×</option>
          <option value="0.5">0.5×</option>
          <option value="1">1× (tiempo real)</option>
          <option value="2">2×</option>
        </select>
      </label>
    </div>
  );
}
