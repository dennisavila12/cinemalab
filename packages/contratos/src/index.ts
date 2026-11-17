/**
 * Contratos de CinemaLab: lo que viaja entre la web, la API (Node.js) y el motor (Rust).
 *
 * - Las ENTRADAS se validan con zod en la API antes de llegar al motor.
 * - Las SALIDAS son tipos que reflejan exactamente las estructuras `serde` de Rust.
 */
import { z } from 'zod';

// ============================================================ Entradas (validadas)

const numero = z.number().finite();

export const IdModelo = z.enum(['mru', 'mrua', 'parabolico']);
export type IdModelo = z.infer<typeof IdModelo>;

export const EntradaResolver = z.object({
  modelo: IdModelo,
  datos: z.record(z.string(), numero).default({}),
  incognitas: z.array(z.string()).default([]),
});
export type EntradaResolver = z.infer<typeof EntradaResolver>;

export const EntradaLeccion = z.object({
  modelo: IdModelo,
  datos: z.record(z.string(), numero).optional(),
  incognitas: z.array(z.string()).default([]),
  enunciado: z.string().max(600).optional(),
});
export type EntradaLeccion = z.infer<typeof EntradaLeccion>;

export const EntradaTiro = z.object({
  escenario: z.string().min(1),
  jugador: z.number().int().min(0).max(1).default(0),
  angulo: numero.min(5).max(85),
  rapidez: numero.min(5).max(35),
  activos: z.array(z.string()).optional(),
  numero: z.number().int().min(0).default(0),
});
export type EntradaTiro = z.infer<typeof EntradaTiro>;

export const EntradaSugerencia = z.object({
  escenario: z.string().min(1),
  jugador: z.number().int().min(0).max(1).default(0),
  angulo: numero.min(5).max(85),
  activos: z.array(z.string()).optional(),
  objetivo: z.string().optional(),
});
export type EntradaSugerencia = z.infer<typeof EntradaSugerencia>;

// ============================================================ Salidas (del motor Rust)

export type Valores = Record<string, number>;

export interface Variable {
  id: string;
  simbolo: string; // LaTeX
  etiqueta: string;
  unidad: string;
  min?: number;
  estricto: boolean;
  max?: number;
  defecto?: number;
}

export interface Ejemplo {
  titulo: string;
  enunciado: string;
  datos: Valores;
  pide: string[];
}

export interface Modelo {
  id: IdModelo;
  corto: string;
  nombre: string;
  descripcion: string;
  dimension: 'recta' | 'plano';
  variables: Variable[];
  ecuaciones: string[]; // LaTeX
  ejemplos: Ejemplo[];
}

export interface Paso {
  variable: string;
  simbolo: string;
  etiqueta: string;
  unidad: string;
  ecuacion: string;
  despeje: string | null;
  sustitucion: string;
  valor: number;
  resultado: string;
  nota: string | null;
  pedido: boolean;
  necesario: boolean;
}

export interface Solucion {
  modelo: IdModelo;
  dados: Valores;
  valores: Valores;
  incognitas: string[];
  pasos: Paso[];
  faltantes: string[];
  inconsistencias: string[];
  avisos: string[];
  errores: Record<string, string>;
}

export interface Movimiento {
  t_max: number;
  x0: number;
  y0: number;
  vx0: number;
  vy0: number;
  ax: number;
  ay: number;
}

export interface Estado {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
}

export interface Simulacion {
  movimiento: Movimiento;
  muestras: Estado[];
  eventos: { t: number; nombre: string }[];
}

export interface RespuestaResolver {
  solucion: Solucion;
  simulacion: Simulacion | null;
  aviso_simulacion: string | null;
}

export type Capa =
  | 'estrobo'
  | 'regla'
  | 'vectores'
  | 'trayectoria'
  | 'sombra_x'
  | 'sombra_y'
  | 'componentes'
  | 'punto_alto'
  | 'gemelo';

export type IdGrafica = 'x' | 'v' | 'a' | 'v_area' | 'vx' | 'vy' | 'trayectoria';

export interface Escena {
  titulo: string;
  narracion: string[];
  formulas: string[];
  capas: Capa[];
  desde: number;
  hasta: number;
  grafica: IdGrafica | null;
  datos: { etiqueta: string; valor: string }[];
  paso: Paso | null;
}

export interface Leccion {
  modelo: IdModelo;
  titulo: string;
  enunciado: string | null;
  propio: boolean;
  marcas: number;
  escenas: Escena[];
  simulacion: Simulacion;
  solucion: Solucion;
}

// ------------------------------------------------------------ Juego

export type ModoJuego = 'latas' | 'mangos' | 'duelo';

export interface Obstaculo {
  x: number;
  y: number;
  w: number;
  h: number;
  nombre: string;
  estilo: 'muro' | 'edificio' | 'tronco' | 'cerro';
}

export interface Objetivo {
  id: string;
  tipo: 'lata' | 'mango';
  x: number;
  y: number;
  w: number;
  h: number;
  dueno?: number;
}

export interface Lanzador {
  nombre: string;
  x: number;
  y: number;
  lado: 1 | -1;
}

export type Decoracion =
  | { tipo: 'palo'; x: number; tronco: number; copa_x: number; copa_y: number; copa_r: number }
  | { tipo: 'cerrito'; x: number; w: number; h: number };

export interface Escenario {
  id: string;
  modo: ModoJuego;
  numero: number;
  nombre: string;
  descripcion: string;
  ancho: number;
  lanzadores: Lanzador[];
  obstaculos: Obstaculo[];
  objetivos: Objetivo[];
  decoracion: Decoracion[];
}

export interface Bloque {
  titulo: string;
  texto: string;
  formulas: string[];
}

export interface Impacto {
  id: string;
  tipo: 'lata' | 'mango';
  t: number;
  x: number;
  y: number;
  caida: { altura: number; tiempo: number; rapidez: number } | null;
}

export interface ResultadoTiro {
  angulo: number;
  rapidez: number;
  trayectoria: [number, number, number][];
  fin: { tipo: 'suelo' | 'obstaculo' | 'fuera'; t: number; x: number; y: number; obstaculo: string | null };
  impactos: Impacto[];
  derribados: string[];
  analisis: {
    resultado: 'acierto' | 'cerca' | 'arriba' | 'abajo' | 'corto' | 'obstaculo';
    frase: string;
    veredicto: string;
    pasos: Bloque[];
  };
}

export interface Sugerencia {
  objetivo: string | null;
  posible: boolean;
  angulo: number;
  rapidez: number;
  mismo_angulo: boolean;
  pasos: Bloque[];
  aviso: string | null;
}

export interface ErrorApi {
  error: string;
  detalles?: unknown;
}
