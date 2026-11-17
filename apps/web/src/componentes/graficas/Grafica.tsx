import { useEffect, useRef } from 'react';
import { colores as C, fmt, marcas, prepararLienzo } from '../../lib/lienzo';
import { useTamano } from '../../hooks/useTamano';

export interface Serie {
  clave: string;
  nombre: string;
  color: string;
  puntos: [number, number][];
}

interface Props {
  series: Serie[];
  ejeX: string;
  ejeY: string;
  /** Instante marcado (línea vertical) o punto de la trayectoria */
  cursor?: { x: number; puntos: Record<string, [number, number]>; linea?: boolean };
  mismaEscala?: boolean;
  /** Sombrear el área bajo la primera serie */
  area?: boolean;
  alto?: number;
}

/** Gráfica de líneas en Canvas, con escala automática y cursor sincronizado con la animación. */
export function Grafica({ series, ejeX, ejeY, cursor, mismaEscala, area, alto = 300 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tam = useTamano(ref);

  useEffect(() => {
    const c = ref.current;
    if (!c || !tam.w) return;
    const { ctx, w, h } = prepararLienzo(c);
    ctx.clearRect(0, 0, w, h);
    const todos = series.flatMap((s) => s.puntos);
    if (!todos.length) return;
    let xmin = Math.min(...todos.map((p) => p[0]));
    let xmax = Math.max(...todos.map((p) => p[0]));
    let ymin = Math.min(0, ...todos.map((p) => p[1]));
    let ymax = Math.max(0, ...todos.map((p) => p[1]));
    const pad = { l: 60, r: 16, t: series.length > 1 ? 30 : 14, b: 42 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;
    if (mismaEscala) {
      const s = Math.max((xmax - xmin) / pw, (ymax - ymin) / ph) || 1;
      xmax = xmin + s * pw;
      ymax = ymin + s * ph;
    }
    const mx = marcas(xmin, xmax, Math.max(3, Math.floor(pw / 80)));
    const my = marcas(ymin, ymax, Math.max(3, Math.floor(ph / 45)));
    const X = (v: number) => pad.l + ((v - mx.lo) / (mx.hi - mx.lo)) * pw;
    const Y = (v: number) => pad.t + ph - ((v - my.lo) / (my.hi - my.lo)) * ph;

    ctx.font = '12px system-ui, sans-serif';
    ctx.lineWidth = 1;
    ctx.fillStyle = C.suave;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const v of mx.lista) {
      const x = Math.round(X(v)) + 0.5;
      ctx.strokeStyle = C.rejilla;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
      ctx.fillText(fmt(v, 2), x, pad.t + ph + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of my.lista) {
      const y = Math.round(Y(v)) + 0.5;
      ctx.strokeStyle = C.rejilla;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      ctx.fillText(fmt(v, 2), pad.l - 8, y);
    }
    if (my.lo < 0 && my.hi > 0) {
      ctx.strokeStyle = C.suave;
      const y0 = Math.round(Y(0)) + 0.5;
      ctx.beginPath(); ctx.moveTo(pad.l, y0); ctx.lineTo(pad.l + pw, y0); ctx.stroke();
    }
    ctx.fillStyle = C.tinta;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(ejeX, pad.l + pw / 2, h - 2);
    ctx.save();
    ctx.translate(14, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.fillText(ejeY, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(pad.l, pad.t, pw, ph); ctx.clip();
    if (area && series[0]) {
      const p = series[0].puntos;
      const hasta = cursor ? p.filter((q) => q[0] <= cursor.x + 1e-9) : p;
      if (hasta.length > 1) {
        ctx.fillStyle = 'rgba(36,87,214,0.16)';
        ctx.beginPath();
        ctx.moveTo(X(hasta[0][0]), Y(0));
        hasta.forEach(([x, y]) => ctx.lineTo(X(x), Y(y)));
        ctx.lineTo(X(hasta[hasta.length - 1][0]), Y(0));
        ctx.closePath();
        ctx.fill();
      }
    }
    for (const s of series) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      s.puntos.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.stroke();
    }
    if (cursor) {
      if (cursor.linea !== false) {
        ctx.strokeStyle = C.suave;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(X(cursor.x), pad.t); ctx.lineTo(X(cursor.x), pad.t + ph); ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const s of series) {
        const p = cursor.puntos[s.clave];
        if (!p) continue;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    if (series.length > 1) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let lx = pad.l;
      for (const s of series) {
        ctx.fillStyle = s.color;
        ctx.fillRect(lx, 11, 14, 3);
        ctx.fillStyle = C.tinta;
        ctx.fillText(s.nombre, lx + 20, 13);
        lx += ctx.measureText(s.nombre).width + 44;
      }
    }
  }, [series, ejeX, ejeY, cursor, mismaEscala, area, tam]);

  return <canvas ref={ref} className="grafica" style={{ height: alto }} role="img" aria-label={`Gráfica: ${ejeY} contra ${ejeX}`} />;
}
