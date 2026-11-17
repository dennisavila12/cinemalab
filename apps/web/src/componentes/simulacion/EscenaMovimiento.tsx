import { useEffect, useRef } from 'react';
import type { Capa, Simulacion } from '@cinemalab/contratos';
import { prepararLienzo } from '../../lib/lienzo';
import { useTamano } from '../../hooks/useTamano';
import { dibujarEscena } from './dibujarEscena';

interface Props {
  simulacion: Simulacion;
  plano: boolean;
  t: number;
  capas: Capa[];
  dtMarcas?: number;
  alto?: number;
}

/** Lienzo con la animación del movimiento. */
export function EscenaMovimiento({ simulacion, plano, t, capas, dtMarcas, alto = 360 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tam = useTamano(ref);
  useEffect(() => {
    const c = ref.current;
    if (!c || !tam.w) return;
    const { ctx, w, h } = prepararLienzo(c);
    dibujarEscena(ctx, w, h, {
      simulacion,
      plano,
      t,
      capas: new Set(capas),
      dtMarcas: dtMarcas ?? simulacion.movimiento.t_max / 10,
    });
  }, [simulacion, plano, t, capas, dtMarcas, tam]);
  return <canvas ref={ref} className="lienzo" style={{ height: alto }} role="img" aria-label="Animación del movimiento" />;
}
