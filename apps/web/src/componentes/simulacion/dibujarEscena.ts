/**
 * Dibujo de la escena del movimiento (MRU, MRUA y parabólico) con sus capas didácticas:
 *   estrobo     → posiciones a intervalos iguales de tiempo
 *   regla       → distancia entre marcas consecutivas (1D)
 *   vectores    → velocidad (y sus componentes en 2D)
 *   trayectoria → camino completo punteado
 *   sombra_x/y  → "rayos X": proyección del móvil sobre cada eje
 *   componentes → descomposición de v₀ con el ángulo θ
 *   punto_alto  → altura máxima
 *   gemelo      → mango que cae del palo desde la altura máxima
 */
import type { Capa, Estado, Simulacion } from '@cinemalab/contratos';
import { estadoEn } from '../../lib/interpolar';
import { colores as C, etiqueta, flecha, fmt, marcas } from '../../lib/lienzo';

export interface OpcionesEscena {
  simulacion: Simulacion;
  plano: boolean;
  t: number;
  capas: Set<Capa>;
  dtMarcas: number;
}

/** Texto con subíndice (por ejemplo v + 0x) dibujado a mano. */
function textoSub(ctx: CanvasRenderingContext2D, base: string, sub: string, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = 'italic 600 15px Georgia, serif';
  ctx.fillText(base, x, y);
  const w = ctx.measureText(base).width;
  ctx.font = '600 11px Georgia, serif';
  ctx.fillText(sub, x + w + 1, y + 4);
  ctx.restore();
}

function mango(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r * 1.2);
  g.addColorStop(0, '#ffd54f');
  g.addColorStop(0.6, '#ffb300');
  g.addColorStop(1, '#ef6c00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.9, r * 1.1, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#43a047';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.5, y - r * 1.05, r * 0.55, r * 0.22, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function dibujarEscena(ctx: CanvasRenderingContext2D, w: number, h: number, o: OpcionesEscena) {
  const { simulacion: sim, plano, t, capas, dtMarcas } = o;
  const M = sim.muestras;
  const T = sim.movimiento.t_max;
  const st = estadoEn(M, t);
  const vmax = Math.max(1e-9, ...M.map((s) => Math.hypot(s.vx, s.vy)));
  ctx.clearRect(0, 0, w, h);
  ctx.font = '12px system-ui, sans-serif';

  const marcasT: number[] = [];
  for (let k = 0; k * dtMarcas <= t + 1e-9 && k <= 60; k++) marcasT.push(k * dtMarcas);

  if (!plano) {
    dibujarRecta(ctx, w, h, M, st, marcasT, capas, vmax);
    return;
  }

  // ------------------------------------------------------------- Plano x–y (misma escala)
  const pad = { l: 58, r: 26, t: 30, b: 46 };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;
  let xmin = Math.min(0, ...M.map((s) => s.x));
  let xmax = Math.max(...M.map((s) => s.x));
  const ymin = Math.min(0, ...M.map((s) => s.y));
  let ymax = Math.max(...M.map((s) => s.y));
  const y0 = M[0].y;
  const plataforma = y0 > 0 ? (xmax - xmin) * 0.1 : 0;
  xmin -= plataforma + (xmax - xmin) * 0.03;
  xmax += (xmax - xmin) * 0.05;
  ymax += (ymax - ymin) * 0.12;
  const s = Math.max((xmax - xmin) / pw, (ymax - ymin) / ph);
  const X = (x: number) => pad.l + (x - xmin) / s;
  const Y = (y: number) => pad.t + ph - (y - ymin) / s;
  const xEje = X(xmin);

  // Cuadrícula y escalas
  const mx = marcas(Math.max(xmin, 0), xmin + pw * s, Math.max(3, Math.floor(pw / 90)));
  const my = marcas(ymin, ymin + ph * s, Math.max(3, Math.floor(ph / 50)));
  ctx.lineWidth = 1;
  ctx.fillStyle = C.suave;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const v of mx.lista) {
    const x = Math.round(X(v)) + 0.5;
    if (x < pad.l || x > pad.l + pw) continue;
    ctx.strokeStyle = C.rejilla;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
    ctx.fillText(fmt(v, 2), x, pad.t + ph + 8);
  }
  ctx.fillText('x (m)', pad.l + pw / 2, pad.t + ph + 26);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of my.lista) {
    const y = Math.round(Y(v)) + 0.5;
    if (y < pad.t - 1 || y > pad.t + ph + 1) continue;
    ctx.strokeStyle = C.rejilla;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
    ctx.fillText(fmt(v, 2), pad.l - 8, y);
  }

  // Suelo y plataforma
  const yg = Y(0);
  ctx.fillStyle = '#d8c7a1';
  ctx.fillRect(pad.l, yg, pw, Math.max(4, pad.t + ph - yg));
  ctx.fillStyle = '#7cb342';
  ctx.fillRect(pad.l, yg - 2, pw, 4);
  if (y0 > 0) {
    ctx.fillStyle = '#c9b48a';
    ctx.fillRect(pad.l, Y(y0), X(0) - pad.l, yg - Y(y0));
    ctx.fillStyle = '#7cb342';
    ctx.fillRect(pad.l, Y(y0) - 2, X(0) - pad.l, 4);
  }

  // Altura máxima
  const iTop = M.reduce((b, m, i) => (m.y > M[b].y ? i : b), 0);
  const top = M[iTop];
  if (capas.has('punto_alto') && top.y > y0 + 1e-6) {
    const yt = Math.round(Y(top.y)) + 0.5;
    ctx.strokeStyle = C.resalte;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, yt); ctx.lineTo(pad.l + pw, yt); ctx.stroke();
    ctx.setLineDash([]);
    etiqueta(ctx, `h máx = ${fmt(top.y, 2)} m`, pad.l + pw - 70, yt - 14, { color: C.resalte });
    if (t >= top.t - 1e-6) etiqueta(ctx, 'aquí vᵧ = 0', X(top.x), yt - 16, { color: C.vy });
  }

  // Trayectoria completa y recorrida
  if (capas.has('trayectoria')) {
    ctx.strokeStyle = C.suave;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    M.forEach((m, i) => (i ? ctx.lineTo(X(m.x), Y(m.y)) : ctx.moveTo(X(m.x), Y(m.y))));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = C.acento;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (const m of M) {
    if (m.t > t) break;
    m === M[0] ? ctx.moveTo(X(m.x), Y(m.y)) : ctx.lineTo(X(m.x), Y(m.y));
  }
  ctx.lineTo(X(st.x), Y(st.y));
  ctx.stroke();

  // Rayos X: sombras sobre los ejes
  if (capas.has('sombra_x')) {
    for (const tk of marcasT) {
      const e = estadoEn(M, tk);
      ctx.fillStyle = 'rgba(214,69,69,0.35)';
      ctx.fillRect(X(e.x) - 1, yg + 4, 2, 9);
    }
    ctx.strokeStyle = 'rgba(214,69,69,0.6)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(st.x), Y(st.y)); ctx.lineTo(X(st.x), yg); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.vx;
    ctx.beginPath(); ctx.ellipse(X(st.x), yg + 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    etiqueta(ctx, 'sombra en x: MRU', X(st.x), yg + 26, { color: C.vx });
  }
  if (capas.has('sombra_y')) {
    for (const tk of marcasT) {
      const e = estadoEn(M, tk);
      ctx.fillStyle = 'rgba(31,143,95,0.35)';
      ctx.fillRect(xEje + 3, Y(e.y) - 1, 9, 2);
    }
    ctx.strokeStyle = 'rgba(31,143,95,0.6)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(st.x), Y(st.y)); ctx.lineTo(xEje, Y(st.y)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.vy;
    ctx.beginPath(); ctx.ellipse(xEje + 7, Y(st.y), 4, 9, 0, 0, Math.PI * 2); ctx.fill();
    etiqueta(ctx, 'sombra en y: MRUA', xEje + 70, Math.max(pad.t + 12, Y(st.y) - 18), { color: C.vy });
  }

  // Marcas estroboscópicas
  if (capas.has('estrobo')) {
    for (const tk of marcasT) {
      const e = estadoEn(M, tk);
      ctx.fillStyle = 'rgba(36,87,214,0.22)';
      ctx.beginPath(); ctx.arc(X(e.x), Y(e.y), 7, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Gemelo: un mango que cae del palo desde la altura máxima
  if (capas.has('gemelo') && top.t > 0) {
    const gx = X(top.x);
    ctx.strokeStyle = '#6d4c33';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pad.l + pw, Y(top.y) - 24); ctx.quadraticCurveTo(gx + 60, Y(top.y) - 30, gx + 4, Y(top.y) - 16); ctx.stroke();
    ctx.fillStyle = '#4c9a2a';
    for (const [dx, dy] of [[40, -34], [80, -26], [120, -38]]) {
      ctx.beginPath(); ctx.ellipse(gx + dx, Y(top.y) + dy, 16, 8, -0.3, 0, Math.PI * 2); ctx.fill();
    }
    const gy = t >= top.t ? st.y : top.y;
    mango(ctx, gx, Y(gy), 9);
    if (t >= top.t) etiqueta(ctx, `mango: y = ${fmt(gy, 2)} m`, gx + 70, Y(gy), { color: '#b45309' });
  }

  // Móvil (una piedra)
  const bx = X(st.x);
  const by = Y(st.y);
  ctx.fillStyle = '#6b7280';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Vectores
  const k = 70 / vmax;
  if (capas.has('vectores')) {
    flecha(ctx, bx, by, bx + st.vx * k, by, C.vx, 2);
    flecha(ctx, bx, by, bx, by - st.vy * k, C.vy, 2);
    flecha(ctx, bx, by, bx + st.vx * k, by - st.vy * k, C.tinta, 2.6);
  }

  // Descomposición de v₀
  if (capas.has('componentes')) {
    const m0 = M[0];
    const ox = X(m0.x);
    const oy = Y(m0.y);
    const kk = Math.min(pw, ph) * 0.45 / vmax;
    const ex = ox + m0.vx * kk;
    const ey = oy - m0.vy * kk;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = C.suave;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex, oy); ctx.lineTo(ex, ey); ctx.lineTo(ox, ey); ctx.stroke();
    ctx.setLineDash([]);
    flecha(ctx, ox, oy, ex, oy, C.vx, 3);
    flecha(ctx, ox, oy, ox, ey, C.vy, 3);
    flecha(ctx, ox, oy, ex, ey, C.tinta, 3.5);
    const ang = Math.atan2(m0.vy, m0.vx);
    ctx.strokeStyle = C.resalte;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox, oy, 34, -ang, 0); ctx.stroke();
    ctx.fillStyle = C.resalte;
    ctx.font = 'italic 600 16px Georgia, serif';
    ctx.fillText('θ', ox + 40 * Math.cos(ang / 2) + 4, oy - 40 * Math.sin(ang / 2) + 4);
    textoSub(ctx, 'v', '0', (ox + ex) / 2 - 22, (oy + ey) / 2 - 6, C.tinta);
    textoSub(ctx, 'v', '0x', (ox + ex) / 2 - 8, oy + 20, C.vx);
    textoSub(ctx, 'v', '0y', ox - 34, (oy + ey) / 2, C.vy);
  }

  // Leyenda
  const ley: [string, string][] = [];
  if (capas.has('vectores')) ley.push([C.tinta, 'v'], [C.vx, 'vx'], [C.vy, 'vy']);
  dibujarLeyenda(ctx, ley, pad.l + pw, pad.t - 22);
}

function dibujarLeyenda(ctx: CanvasRenderingContext2D, items: [string, string][], derecha: number, y: number) {
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  let x = derecha;
  for (const [c, l] of [...items].reverse()) {
    ctx.fillStyle = C.tinta;
    ctx.fillText(l, x, y);
    const tw = ctx.measureText(l).width;
    ctx.fillStyle = c;
    ctx.fillRect(x - tw - 22, y + 6, 16, 3);
    x -= tw + 34;
  }
}

function dibujarRecta(ctx: CanvasRenderingContext2D, w: number, h: number, M: Estado[], st: Estado, marcasT: number[], capas: Set<Capa>, vmax: number) {
  const pad = { l: 40, r: 40, t: 34 };
  const pw = w - pad.l - pad.r;
  const xmin0 = Math.min(0, ...M.map((m) => m.x));
  const xmax0 = Math.max(0, ...M.map((m) => m.x));
  const margen = (xmax0 - xmin0 || 1) * 0.06;
  const mx = marcas(xmin0 - margen, xmax0 + margen, Math.max(3, Math.floor(pw / 90)));
  const X = (x: number) => pad.l + ((x - mx.lo) / (mx.hi - mx.lo)) * pw;
  const yPista = h * 0.6;

  // Carretera
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(pad.l, yPista + 12, pw, 16);
  ctx.strokeStyle = '#fbbf24';
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad.l, yPista + 20); ctx.lineTo(pad.l + pw, yPista + 20); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.suave;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 1;
  for (const v of mx.lista) {
    const x = Math.round(X(v)) + 0.5;
    ctx.strokeStyle = C.suave;
    ctx.beginPath(); ctx.moveTo(x, yPista + 30); ctx.lineTo(x, yPista + 38); ctx.stroke();
    ctx.fillText(fmt(v, 2), x, yPista + 42);
  }
  ctx.fillText('x (m)', pad.l + pw / 2, yPista + 60);

  // Marcas estroboscópicas y regla
  if (capas.has('estrobo')) {
    const pos = marcasT.map((tk) => estadoEn(M, tk).x);
    pos.forEach((x) => {
      ctx.fillStyle = 'rgba(36,87,214,0.25)';
      ctx.beginPath(); ctx.arc(X(x), yPista, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(36,87,214,0.6)';
      ctx.fillRect(X(x) - 0.5, yPista + 10, 1, 10);
    });
    if (capas.has('regla')) {
      ctx.strokeStyle = C.resalte;
      ctx.fillStyle = C.resalte;
      ctx.lineWidth = 1.2;
      ctx.font = '600 11px system-ui, sans-serif';
      for (let i = 1; i < pos.length; i++) {
        const a = X(pos[i - 1]);
        const b = X(pos[i]);
        const yr = yPista - 34 - (i % 2) * 16;
        ctx.beginPath(); ctx.moveTo(a, yr + 5); ctx.lineTo(a, yr); ctx.lineTo(b, yr); ctx.lineTo(b, yr + 5); ctx.stroke();
        if (Math.abs(b - a) > 22) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(fmt(pos[i] - pos[i - 1], 2), (a + b) / 2, yr - 2);
        }
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = C.suave;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('Distancia entre marcas (m):', pad.l, pad.t - 24);
    }
  }

  // Carro
  const cx = X(st.x);
  const dir = st.vx < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(cx, yPista);
  ctx.scale(dir, 1);
  ctx.fillStyle = C.acento;
  ctx.beginPath(); ctx.roundRect(-20, -14, 40, 16, 5); ctx.fill();
  ctx.fillStyle = '#93c5fd';
  ctx.beginPath(); ctx.roundRect(-10, -24, 20, 11, 4); ctx.fill();
  ctx.fillStyle = '#111827';
  for (const rx of [-12, 12]) { ctx.beginPath(); ctx.arc(rx, 4, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();

  if (capas.has('vectores')) {
    const k = 80 / vmax;
    flecha(ctx, cx, yPista - 36, cx + st.vx * k, yPista - 36, C.vx, 2.6);
    if (Math.abs(st.vx) > 1e-6) etiqueta(ctx, `v = ${fmt(st.vx, 2)} m/s`, cx + st.vx * k / 2, yPista - 54, { color: C.vx });
  }
}
