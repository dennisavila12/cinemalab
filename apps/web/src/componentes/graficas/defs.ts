import type { Estado, IdGrafica } from '@cinemalab/contratos';
import { estadoEn } from '../../lib/interpolar';
import { colores as C } from '../../lib/lienzo';
import type { Serie } from './Grafica';

export interface DefGrafica {
  id: IdGrafica | 'xy_t' | 'vxy_t';
  nombre: string;
  ejeX: string;
  ejeY: string;
  series: Serie[];
  mismaEscala?: boolean;
  area?: boolean;
}

const tiempo = (M: Estado[], k: keyof Estado) => M.map((m) => [m.t, m[k]] as [number, number]);

export function definirGrafica(id: DefGrafica['id'], M: Estado[]): DefGrafica {
  switch (id) {
    case 'x':
      return { id, nombre: 'Posición x(t)', ejeX: 't (s)', ejeY: 'x (m)', series: [{ clave: 'x', nombre: 'x', color: C.acento, puntos: tiempo(M, 'x') }] };
    case 'v':
    case 'v_area':
      return { id, nombre: id === 'v' ? 'Velocidad v(t)' : 'Área bajo v(t)', ejeX: 't (s)', ejeY: 'v (m/s)', area: id === 'v_area', series: [{ clave: 'vx', nombre: 'v', color: C.vx, puntos: tiempo(M, 'vx') }] };
    case 'a':
      return { id, nombre: 'Aceleración a(t)', ejeX: 't (s)', ejeY: 'a (m/s²)', series: [{ clave: 'ax', nombre: 'a', color: C.tinta, puntos: tiempo(M, 'ax') }] };
    case 'vx':
      return { id, nombre: 'Velocidad horizontal vₓ(t)', ejeX: 't (s)', ejeY: 'vₓ (m/s)', series: [{ clave: 'vx', nombre: 'vₓ', color: C.vx, puntos: tiempo(M, 'vx') }] };
    case 'vy':
      return { id, nombre: 'Velocidad vertical vᵧ(t)', ejeX: 't (s)', ejeY: 'vᵧ (m/s)', series: [{ clave: 'vy', nombre: 'vᵧ', color: C.vy, puntos: tiempo(M, 'vy') }] };
    case 'trayectoria':
      return { id, nombre: 'Trayectoria y(x)', ejeX: 'x (m)', ejeY: 'y (m)', mismaEscala: true, series: [{ clave: 'xy', nombre: 'trayectoria', color: C.acento, puntos: M.map((m) => [m.x, m.y]) }] };
    case 'xy_t':
      return { id, nombre: 'Posición x(t), y(t)', ejeX: 't (s)', ejeY: 'posición (m)', series: [
        { clave: 'x', nombre: 'x(t)', color: C.vx, puntos: tiempo(M, 'x') },
        { clave: 'y', nombre: 'y(t)', color: C.vy, puntos: tiempo(M, 'y') },
      ] };
    case 'vxy_t':
      return { id, nombre: 'Velocidad vₓ(t), vᵧ(t)', ejeX: 't (s)', ejeY: 'velocidad (m/s)', series: [
        { clave: 'vx', nombre: 'vₓ(t)', color: C.vx, puntos: tiempo(M, 'vx') },
        { clave: 'vy', nombre: 'vᵧ(t)', color: C.vy, puntos: tiempo(M, 'vy') },
      ] };
  }
}

/** Punto del cursor de cada serie en el instante t. */
export function cursorEn(def: DefGrafica, M: Estado[], t: number) {
  const e = estadoEn(M, t);
  const puntos: Record<string, [number, number]> = {};
  for (const s of def.series) {
    puntos[s.clave] = s.clave === 'xy' ? [e.x, e.y] : [t, e[s.clave as keyof Estado] as number];
  }
  return { x: t, puntos, linea: def.id !== 'trayectoria' };
}
