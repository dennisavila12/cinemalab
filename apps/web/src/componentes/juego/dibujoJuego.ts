/**
 * Dibujo del juego "La hondilla" con ambiente salvadoreño: volcán humeando, cerros,
 * palos de mango, tapiales, la tienda de la esquina, latas y hondillas.
 * Solo dibuja: las posiciones de la piedra vienen del motor en Rust.
 */
import type { Escenario, Objetivo } from '@cinemalab/contratos';
import { etiqueta, flecha, fmt } from '../../lib/lienzo';

export interface Vista {
  w: number;
  h: number;
  s: number; // píxeles por metro
  X: (x: number) => number;
  Y: (y: number) => number;
  suelo: number;
}

export function calcularVista(esc: Escenario, w: number, h: number): Vista {
  const izq = Math.min(-3.5, ...esc.lanzadores.map((l) => l.x - 3));
  const der = Math.max(esc.ancho + 0.5, ...esc.lanzadores.map((l) => l.x + 3));
  const s = w / (der - izq);
  const sueloPx = Math.min(54, h * 0.13);
  return { w, h, s, X: (x) => (x - izq) * s, Y: (y) => h - sueloPx - y * s, suelo: h - sueloPx };
}

export interface Caida {
  /** posición actual y giro (solo visual) */
  x: number;
  y: number;
  rot: number;
  alfa: number;
}

export interface EstadoDibujo {
  activos: Set<string>;
  caidas: Map<string, Caida>;
  rastros: { puntos: [number, number, number][]; jugador: number }[];
  piedra?: { x: number; y: number; vuelo: [number, number, number][]; t: number };
  apuntar?: { jugador: number; angulo: number; rapidez: number };
  rayosX: boolean;
  turno: number;
  mensaje?: string;
}

const COLOR_JUGADOR = ['#2457d6', '#d9480f'];

function fondo(ctx: CanvasRenderingContext2D, v: Vista) {
  const { w, h, suelo } = v;
  const cielo = ctx.createLinearGradient(0, 0, 0, suelo);
  cielo.addColorStop(0, '#8ec5ef');
  cielo.addColorStop(1, '#e8f4fc');
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, w, h);
  // Sol
  ctx.fillStyle = 'rgba(255,214,102,0.9)';
  ctx.beginPath(); ctx.arc(w * 0.12, h * 0.16, Math.min(28, h * 0.06), 0, Math.PI * 2); ctx.fill();
  // Volcán con humo (como el de Izalco)
  const base = suelo;
  ctx.fillStyle = '#9aa9bd';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, base); ctx.lineTo(w * 0.69, base - h * 0.46); ctx.lineTo(w * 0.73, base - h * 0.47);
  ctx.lineTo(w * 0.77, base - h * 0.45); ctx.lineTo(w * 0.98, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [dx, dy, r] of [[0, 0.5, 13], [0.012, 0.545, 17], [0.03, 0.59, 21]] as const) {
    ctx.beginPath(); ctx.arc(w * (0.73 + dx), base - h * dy, r, 0, Math.PI * 2); ctx.fill();
  }
  // Cerros verdes
  ctx.fillStyle = '#9cc28a';
  ctx.beginPath(); ctx.moveTo(0, base); ctx.quadraticCurveTo(w * 0.2, base - h * 0.24, w * 0.45, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b5d3a3';
  ctx.beginPath(); ctx.moveTo(w * 0.35, base); ctx.quadraticCurveTo(w * 0.55, base - h * 0.14, w * 0.75, base); ctx.closePath(); ctx.fill();
  // Suelo
  ctx.fillStyle = '#c9a77c';
  ctx.fillRect(0, suelo, w, h - suelo);
  ctx.fillStyle = '#6aa84f';
  ctx.fillRect(0, suelo - 2, w, 7);
}

function regla(ctx: CanvasRenderingContext2D, v: Vista, ancho: number) {
  ctx.fillStyle = '#5b4630';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const paso = ancho > 36 ? 5 : 5;
  for (let x = 0; x <= ancho; x += paso) {
    ctx.fillRect(v.X(x) - 0.5, v.suelo + 6, 1, 6);
    ctx.fillText(`${x} m`, v.X(x), v.suelo + 14);
  }
}

function palo(ctx: CanvasRenderingContext2D, v: Vista, d: { x: number; tronco: number; copa_x: number; copa_y: number; copa_r: number }) {
  const { X, Y, s } = v;
  // Tronco
  ctx.fillStyle = '#7a5235';
  ctx.beginPath();
  ctx.moveTo(X(d.x - 0.45), Y(0)); ctx.lineTo(X(d.x - 0.3), Y(d.tronco + 0.6)); ctx.lineTo(X(d.x + 0.3), Y(d.tronco + 0.6)); ctx.lineTo(X(d.x + 0.45), Y(0));
  ctx.closePath(); ctx.fill();
  // Copa (no detiene la piedra)
  const hojas = [[0, 0, 1], [-0.55, -0.15, 0.7], [0.55, -0.1, 0.72], [-0.25, 0.45, 0.68], [0.3, 0.42, 0.66]] as const;
  for (const [dx, dy, r] of hojas) {
    ctx.fillStyle = r === 1 ? '#3f8f3a' : '#4fa046';
    ctx.beginPath(); ctx.arc(X(d.copa_x + dx * d.copa_r), Y(d.copa_y + dy * d.copa_r), r * d.copa_r * s * 0.75, 0, Math.PI * 2); ctx.fill();
  }
}

function obstaculo(ctx: CanvasRenderingContext2D, v: Vista, o: Escenario['obstaculos'][number]) {
  const { X, Y, s } = v;
  const x = X(o.x), y = Y(o.y + o.h), w = o.w * s, h = o.h * s;
  if (o.estilo === 'tronco') return; // lo dibuja el palo
  if (o.estilo === 'cerro') {
    ctx.fillStyle = '#7fae5f';
    ctx.beginPath(); ctx.roundRect(x, y, w, h + 4, [14, 14, 0, 0]); ctx.fill();
    return;
  }
  if (o.estilo === 'edificio') {
    ctx.fillStyle = '#f2c66d';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#d1495b';
    ctx.fillRect(x - 4, y - 6, w + 8, 8);
    ctx.fillStyle = '#7a4b2a';
    ctx.fillRect(x + w * 0.38, y + h - h * 0.32, w * 0.24, h * 0.32);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.max(10, s * 0.55)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TIENDA', x + w / 2, y + h * 0.25);
    return;
  }
  // Tapial de ladrillo
  ctx.fillStyle = '#b5654a';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(70,30,15,0.35)';
  ctx.lineWidth = 1;
  const fila = Math.max(6, 0.5 * s);
  for (let yy = y + fila, k = 0; yy < y + h; yy += fila, k++) {
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
  }
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(x - 2, y - 3, w + 4, 4);
  etiqueta(ctx, `${fmt(o.h)} m`, x + w / 2, y - 14, { color: '#5b3a29' });
}

function lata(ctx: CanvasRenderingContext2D, v: Vista, o: Objetivo, c: Caida | undefined, color: string) {
  const { X, Y, s } = v;
  const w = o.w * s, h = o.h * s;
  const cx = c ? c.x : o.x + o.w / 2;
  const cy = c ? c.y : o.y + o.h / 2;
  ctx.save();
  ctx.globalAlpha = c?.alfa ?? 1;
  ctx.translate(X(cx), Y(cy));
  ctx.rotate(c?.rot ?? 0);
  ctx.fillStyle = '#d6dbe2';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h * 0.3, w, h * 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(-w / 2, -h * 0.05, w, h * 0.1);
  ctx.strokeStyle = '#7b8494';
  ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
  ctx.restore();
}

function mango(ctx: CanvasRenderingContext2D, v: Vista, o: Objetivo, c: Caida | undefined) {
  const { X, Y, s } = v;
  const r = (o.w / 2) * s;
  const cx = c ? c.x : o.x + o.w / 2;
  const cy = c ? c.y : o.y + o.h / 2;
  ctx.save();
  ctx.globalAlpha = c?.alfa ?? 1;
  ctx.translate(X(cx), Y(cy));
  ctx.rotate(c?.rot ?? 0.2);
  if (!c) {
    ctx.strokeStyle = '#3f6b2a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, -r * 1.7); ctx.stroke();
  }
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r * 1.25);
  g.addColorStop(0, '#ffe082');
  g.addColorStop(0.55, '#ffb300');
  g.addColorStop(1, '#e65100');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.88, r * 1.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(76,175,80,0.55)';
  ctx.beginPath(); ctx.ellipse(r * 0.25, -r * 0.55, r * 0.35, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function hondilla(ctx: CanvasRenderingContext2D, v: Vista, x: number, y: number, lado: number, nombre: string, activo: boolean, color: string) {
  const { X, Y, s } = v;
  const fx = X(x), fy = Y(y);
  const k = Math.max(8, s * 0.55);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6d4c33';
  ctx.lineWidth = Math.max(4, k * 0.38);
  ctx.beginPath();
  ctx.moveTo(fx, Y(Math.max(0, y - 1.2)) + 2); ctx.lineTo(fx, fy + k * 0.9);
  ctx.moveTo(fx, fy + k * 0.9); ctx.lineTo(fx - k * 0.7, fy - k * 0.2);
  ctx.moveTo(fx, fy + k * 0.9); ctx.lineTo(fx + k * 0.7, fy - k * 0.2);
  ctx.stroke();
  ctx.restore();
  if (nombre !== 'Vos') etiqueta(ctx, nombre, fx, fy - k * 1.6 - 12, { fondo: activo ? color : 'rgba(255,255,255,0.85)', color: activo ? '#fff' : '#1b2333' });
  void lado;
}

export function piedra(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  g.addColorStop(0, '#9ca3af');
  g.addColorStop(1, '#4b5563');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.9, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function dibujarJuego(ctx: CanvasRenderingContext2D, esc: Escenario, v: Vista, e: EstadoDibujo) {
  fondo(ctx, v);
  regla(ctx, v, esc.ancho);
  for (const d of esc.decoracion) {
    if (d.tipo === 'cerrito') {
      ctx.fillStyle = '#8d7356';
      ctx.beginPath();
      ctx.moveTo(v.X(d.x), v.suelo); ctx.lineTo(v.X(d.x), v.Y(d.h)); ctx.lineTo(v.X(d.x + d.w), v.Y(d.h)); ctx.lineTo(v.X(d.x + d.w + d.h * 0.5), v.suelo);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6aa84f';
      ctx.fillRect(v.X(d.x), v.Y(d.h) - 3, d.w * v.s, 5);
    } else {
      palo(ctx, v, d);
    }
  }
  for (const o of esc.obstaculos) obstaculo(ctx, v, o);

  // Rastros de tiros anteriores
  e.rastros.forEach((r, k) => {
    ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.15 * k})`;
    ctx.strokeStyle = r.jugador === 1 ? 'rgba(217,72,15,0.45)' : 'rgba(36,87,214,0.45)';
    ctx.lineWidth = 1;
    r.puntos.forEach(([, x, y], i) => {
      if (i % 3) return;
      ctx.beginPath(); ctx.arc(v.X(x), v.Y(y), 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  });

  // Objetivos
  for (const o of esc.objetivos) {
    const c = e.caidas.get(o.id);
    if (!e.activos.has(o.id) && !c) continue;
    const color = o.dueno === 1 ? '#ea580c' : o.dueno === 0 ? '#2563eb' : '#dc2626';
    if (o.tipo === 'lata') lata(ctx, v, o, c, color);
    else mango(ctx, v, o, c);
  }

  // Hondillas
  esc.lanzadores.forEach((l, j) => hondilla(ctx, v, l.x, l.y, l.lado, l.nombre, esc.modo === 'duelo' && e.turno === j, COLOR_JUGADOR[j]));

  // Piedra en vuelo (con rastro y, si se pide, rayos X)
  if (e.piedra) {
    const { x, y, vuelo, t } = e.piedra;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [tk, px, py] of vuelo) {
      if (tk > t) break;
      if (Math.round(tk * 60) % 3) continue;
      ctx.beginPath(); ctx.arc(v.X(px), v.Y(py), 2.4, 0, Math.PI * 2); ctx.fill();
    }
    if (e.rayosX) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(214,69,69,0.8)';
      ctx.beginPath(); ctx.moveTo(v.X(x), v.Y(y)); ctx.lineTo(v.X(x), v.suelo); ctx.stroke();
      ctx.strokeStyle = 'rgba(31,143,95,0.8)';
      ctx.beginPath(); ctx.moveTo(v.X(x), v.Y(y)); ctx.lineTo(6, v.Y(y)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#d64545';
      ctx.beginPath(); ctx.ellipse(v.X(x), v.suelo + 3, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1f8f5f';
      ctx.beginPath(); ctx.ellipse(8, v.Y(y), 3.5, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    piedra(ctx, v.X(x), Math.max(14, v.Y(y)), Math.max(5, 0.3 * v.s));
    if (v.Y(y) < 0) etiqueta(ctx, `▲ y = ${fmt(y, 1)} m`, v.X(x), 14, { fondo: '#1e3a8a', color: '#fff' });
  }

  // Puntería: la piedra en la hondilla y una flecha con θ y v₀
  if (e.apuntar) {
    const l = esc.lanzadores[e.apuntar.jugador];
    const fx = v.X(l.x), fy = v.Y(l.y);
    const a = (e.apuntar.angulo * Math.PI) / 180;
    const p = (e.apuntar.rapidez - 5) / 30;
    const largo = 10 + p * 58;
    const px = fx - l.lado * Math.cos(a) * largo;
    const py = fy + Math.sin(a) * largo;
    const k = Math.max(8, v.s * 0.55);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx - k * 0.7, fy - k * 0.2); ctx.lineTo(px, py); ctx.lineTo(fx + k * 0.7, fy - k * 0.2); ctx.stroke();
    piedra(ctx, px, py, Math.max(5, 0.3 * v.s));
    const lf = 40 + p * 70;
    flecha(ctx, fx, fy, fx + l.lado * Math.cos(a) * lf, fy - Math.sin(a) * lf, 'rgba(30,58,138,0.85)', 2.5);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (l.lado > 0) ctx.arc(fx, fy, 26, -a, 0);
    else ctx.arc(fx, fy, 26, Math.PI, Math.PI + a);
    ctx.stroke();
    etiqueta(ctx, `θ = ${fmt(e.apuntar.angulo, 1)}°  ·  v₀ = ${fmt(e.apuntar.rapidez, 1)} m/s`, fx + l.lado * 80, fy - lf * 0.9 - 16, { fondo: '#1e3a8a', color: '#fff' });
  }

  if (e.mensaje) {
    ctx.save();
    ctx.fillStyle = 'rgba(30,58,138,0.9)';
    ctx.font = '700 18px system-ui, sans-serif';
    const tw = ctx.measureText(e.mensaje).width + 40;
    ctx.beginPath(); ctx.roundRect(v.w / 2 - tw / 2, v.h * 0.22, tw, 48, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.mensaje, v.w / 2, v.h * 0.22 + 24);
    ctx.restore();
  }
}
