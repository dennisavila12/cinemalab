import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Leccion, Modelo, RespuestaResolver, ResultadoTiro, Sugerencia } from '@cinemalab/contratos';
import { crearApp } from '../src/app.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = await crearApp();
});
afterAll(() => app.close());

const post = (url: string, payload: unknown) => app.inject({ method: 'POST', url, payload: payload as object });

describe('API de CinemaLab', () => {
  it('responde la salud con la versión del motor Rust', async () => {
    const r = await app.inject('/api/salud');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ estado: 'ok', motor: '2.0.0' });
  });

  it('lista los tres modelos', async () => {
    const modelos = (await app.inject('/api/modelos')).json<Modelo[]>();
    expect(modelos.map((m) => m.id)).toEqual(['mru', 'mrua', 'parabolico']);
  });

  it('resuelve un MRUA paso a paso y lo simula', async () => {
    const r = await post('/api/resolver', { modelo: 'mrua', datos: { v0: 25, v: 0, dx: 50 }, incognitas: ['a', 't'] });
    expect(r.statusCode).toBe(200);
    const { solucion, simulacion } = r.json<RespuestaResolver>();
    expect(solucion.valores.a).toBeCloseTo(-6.25, 10);
    expect(solucion.valores.t).toBeCloseTo(4, 10);
    expect(solucion.pasos.map((p) => p.variable)).toEqual(['a', 't']);
    expect(simulacion?.muestras.at(-1)?.x).toBeCloseTo(50, 9);
  });

  it('rechaza datos mal formados con 400', async () => {
    const r = await post('/api/resolver', { modelo: 'xyz', datos: { v: 'rápido' } });
    expect(r.statusCode).toBe(400);
  });

  it('devuelve errores de rango del motor dentro de la solución', async () => {
    const r = await post('/api/resolver', { modelo: 'parabolico', datos: { v0: 10, theta: 120 } });
    expect(r.json<RespuestaResolver>().solucion.errores.theta).toBeDefined();
  });

  it('genera una lección del Modo clase', async () => {
    const l = (await post('/api/leccion', { modelo: 'parabolico' })).json<Leccion>();
    expect(l.escenas.length).toBeGreaterThan(6);
    expect(l.escenas[0].capas).toContain('sombra_x');
  });

  it('simula un tiro que choca con el muro', async () => {
    const r = (await post('/api/juego/tiro', { escenario: 'latas-3', angulo: 30, rapidez: 15 })).json<ResultadoTiro>();
    expect(r.fin.tipo).toBe('obstaculo');
    expect(r.analisis.frase).toMatch(/muro/);
  });

  it('el tiro perfecto sugerido sí acierta', async () => {
    const s = (await post('/api/juego/sugerencia', { escenario: 'mangos-2', angulo: 45 })).json<Sugerencia>();
    expect(s.posible).toBe(true);
    const r = (await post('/api/juego/tiro', { escenario: 'mangos-2', angulo: s.angulo, rapidez: s.rapidez })).json<ResultadoTiro>();
    expect(r.derribados).toContain(s.objetivo);
  });

  it('responde 422 si el escenario no existe', async () => {
    const r = await post('/api/juego/tiro', { escenario: 'nada', angulo: 45, rapidez: 20 });
    expect(r.statusCode).toBe(422);
  });

  it('rechaza un ángulo fuera de rango', async () => {
    const r = await post('/api/juego/tiro', { escenario: 'latas-1', angulo: 95, rapidez: 20 });
    expect(r.statusCode).toBe(400);
  });
});
