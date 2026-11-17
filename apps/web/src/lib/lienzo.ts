/** Utilidades de dibujo en Canvas: densidad de píxeles, marcas de ejes y flechas. */
import { fmt } from './formato';

export function prepararLienzo(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/** Marcas "bonitas" (1, 2, 5 × 10ⁿ) para un eje. */
export function marcas(min: number, max: number, cuantas = 6) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const crudo = (max - min) / cuantas;
  const mag = 10 ** Math.floor(Math.log10(crudo));
  const n = crudo / mag;
  const paso = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / paso) * paso;
  const hi = Math.ceil(max / paso) * paso;
  const lista: number[] = [];
  for (let v = lo; v <= hi + paso * 1e-6; v += paso) lista.push(Math.abs(v) < paso * 1e-9 ? 0 : v);
  return { lo, hi, paso, lista };
}

export function flecha(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, ancho = 2.5) {
  const largo = Math.hypot(x2 - x1, y2 - y1);
  if (largo < 3) return;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const punta = Math.min(10, largo * 0.45);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = ancho;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - Math.cos(a) * punta * 0.6, y2 - Math.sin(a) * punta * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - punta * Math.cos(a - 0.42), y2 - punta * Math.sin(a - 0.42));
  ctx.lineTo(x2 - punta * Math.cos(a + 0.42), y2 - punta * Math.sin(a + 0.42));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function etiqueta(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, opts: { fondo?: string; color?: string; alinear?: CanvasTextAlign } = {}) {
  ctx.save();
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = opts.alinear ?? 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(texto).width + 10;
  const x0 = opts.alinear === 'left' ? x - 5 : opts.alinear === 'right' ? x - w + 5 : x - w / 2;
  ctx.fillStyle = opts.fondo ?? 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.roundRect(x0, y - 10, w, 20, 5);
  ctx.fill();
  ctx.fillStyle = opts.color ?? '#1b2333';
  ctx.fillText(texto, x, y + 0.5);
  ctx.restore();
}

export const colores = {
  tinta: '#1b2333',
  suave: '#5d6779',
  rejilla: '#e6e9f0',
  acento: '#2457d6',
  vx: '#d64545',
  vy: '#1f8f5f',
  resalte: '#b45309',
  fondo: '#f8f9fb',
};

export { fmt };
