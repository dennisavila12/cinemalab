/** Copia en TypeScript de crates/fisica-core/src/leccion.rs (solo para la demostración). */
import type { Capa, Escena, IdGrafica, Leccion, Movimiento, Paso, Solucion } from '@cinemalab/contratos';
import { num, numDec, par, rad, txt, txtDec } from './formato';
import { porId } from './modelos';
import { desdeModelo, eventos, simular } from './movimiento';
import { resolver } from './solver';
import type { ModeloInterno, Valores } from './tipos';

function escena(titulo: string, narracion: string[], formulas: string[], capas: Capa[], desde: number, hasta: number, grafica: IdGrafica | null): Escena {
  return { titulo, narracion, formulas, capas, desde, hasta, grafica, datos: [], paso: null };
}

const unidadHablada = (u: string) => ({ m: 'metros', 'm/s': 'metros por segundo', 'm/s²': 'metros por segundo al cuadrado', s: 'segundos', '°': 'grados' })[u] ?? u;

function escenasDePasos(sol: Solucion, mov: Movimiento, capas: Capa[]): Escena[] {
  const pasos = sol.pasos.filter((p) => p.necesario);
  return pasos.map((p: Paso, i) => {
    const narr = [
      `Paso ${i + 1} de ${pasos.length}: queremos ${p.etiqueta.toLowerCase()}.`,
      p.despeje
        ? 'Buscamos la ecuación que la relaciona con los datos que ya tenemos, la despejamos y sustituimos los números.'
        : 'Buscamos la ecuación que la relaciona con los datos que ya tenemos y sustituimos los números.',
      `Resultado: ${txtDec(p.valor, 3)} ${unidadHablada(p.unidad)}.`,
    ];
    if (p.nota) narr.push(p.nota);
    const f = [p.ecuacion];
    if (p.despeje) f.push(p.despeje);
    f.push(p.sustitucion, p.resultado);
    return { ...escena(`Tu ejercicio · ${p.etiqueta}`, narr, f, [...capas], 0, mov.t_max, null), paso: p };
  });
}

function leccionMru(v: Valores, mov: Movimiento, sol: Solucion): Escena[] {
  const { v: vel, t, dx } = v;
  const dt = mov.t_max / 10;
  const e: Escena[] = [
    escena('¿Qué es el MRU?', [
      'En el movimiento rectilíneo uniforme el móvil va en línea recta y su velocidad nunca cambia.',
      `En este ejemplo va a ${txt(vel)} metros por segundo durante ${txt(t)} segundos.`,
    ], [], ['vectores'], 0, mov.t_max, null),
    {
      ...escena('Distancias iguales en tiempos iguales', [
        `Cada marca se toma cada ${txt(dt)} segundos.`,
        `Como la velocidad no cambia, entre una marca y la siguiente siempre hay la misma distancia: ${txt(vel * dt)} metros.`,
        'Esa es la huella del MRU: distancias iguales en tiempos iguales.',
      ], [], ['estrobo', 'regla', 'vectores'], 0, mov.t_max, null),
      datos: [
        { etiqueta: 'Intervalo entre marcas', valor: `\\Delta t = ${num(dt)}\\ \\text{s}` },
        { etiqueta: 'Distancia entre marcas', valor: `v\\,\\Delta t = ${num(vel * dt)}\\ \\text{m}` },
      ],
    },
    escena('La ecuación del MRU', ['Si en cada segundo avanza lo mismo, la distancia total es la velocidad por el tiempo.'], [
      '\\Delta x = v\\,t', 'x(t) = x_0 + v\\,t', `\\Delta x = ${num(vel)}\\cdot ${num(t)} = ${num(dx)}\\ \\text{m}`,
    ], ['estrobo'], 0, mov.t_max, null),
    escena('La gráfica x–t es una recta', [
      'La posición crece al mismo ritmo todo el tiempo; por eso la gráfica posición contra tiempo es una línea recta.',
      `Su pendiente es la velocidad: ${txt(vel)} metros por segundo.`,
    ], ['\\text{pendiente} = \\dfrac{\\Delta x}{\\Delta t} = v'], ['estrobo'], 0, mov.t_max, 'x'),
    escena('La gráfica v–t es horizontal', [
      'La velocidad no cambia, así que su gráfica es una línea horizontal.',
      `El área del rectángulo bajo esa línea es el desplazamiento: ${txt(vel)} por ${txt(t)} da ${txt(dx)} metros.`,
    ], [`\\text{Área} = v\\,t = ${num(vel)}\\cdot ${num(t)} = ${num(dx)}\\ \\text{m} = \\Delta x`], ['vectores'], 0, mov.t_max, 'v_area'),
  ];
  e.push(...escenasDePasos(sol, mov, ['estrobo', 'vectores']));
  e.push(escena('Resumen', [
    'En el MRU la velocidad es constante y la aceleración es cero.',
    'Recorre distancias iguales en tiempos iguales.',
    'La gráfica posición–tiempo es una recta con pendiente v y la gráfica velocidad–tiempo es horizontal.',
  ], ['\\Delta x = v\\,t', 'a = 0'], ['estrobo', 'vectores'], 0, mov.t_max, 'x'));
  return e;
}

function leccionMrua(v: Valores, mov: Movimiento, sol: Solucion): Escena[] {
  const { v0, a, t, v: vf, dx } = v;
  const acelera = a !== 0 && (v0 === 0 || Math.sign(v0) === Math.sign(a));
  const e: Escena[] = [
    escena('¿Qué es el MRUA?', [
      'En el movimiento rectilíneo uniformemente acelerado el móvil va en línea recta y su velocidad cambia lo mismo cada segundo: la aceleración es constante.',
      `Aquí empieza a ${txt(v0)} metros por segundo y su velocidad cambia ${txt(a)} metros por segundo en cada segundo.`,
    ], [], ['vectores'], 0, mov.t_max, null),
    escena(acelera ? 'Las marcas se van separando' : 'Las marcas se van juntando', [
      'Las marcas se toman a intervalos de tiempo iguales.',
      acelera
        ? 'Como el móvil va cada vez más rápido, en cada intervalo recorre más distancia: las marcas se separan cada vez más.'
        : 'Como el móvil va frenando, en cada intervalo recorre menos distancia: las marcas quedan cada vez más juntas.',
      'Fijate que la flecha de la velocidad también cambia de tamaño.',
    ], [], ['estrobo', 'regla', 'vectores'], 0, mov.t_max, null),
    escena('La velocidad cambia parejo', [
      'La gráfica velocidad contra tiempo es una línea recta.',
      `Su pendiente es la aceleración: ${txt(a)} metros por segundo al cuadrado.`,
    ], ['v = v_0 + a\\,t', `v = ${num(v0)} + ${par(a)}\\,t`], ['vectores'], 0, mov.t_max, 'v'),
    escena('La posición forma una parábola', [
      'Como la velocidad cambia, la posición ya no crece al mismo ritmo: la gráfica posición contra tiempo es una curva, una parábola.',
    ], ['\\Delta x = v_0\\,t + \\tfrac{1}{2}\\,a\\,t^2'], ['estrobo'], 0, mov.t_max, 'x'),
    escena('El área bajo v–t es el desplazamiento', [
      'El área bajo la recta de la velocidad es un trapecio.',
      `Su área es el promedio de la velocidad inicial y la final, por el tiempo: da ${txt(dx)} metros, que es el desplazamiento.`,
    ], ['\\Delta x = \\tfrac{1}{2}\\,(v_0 + v)\\,t', `\\Delta x = \\tfrac{1}{2}\\,(${num(v0)} + ${num(vf)})\\cdot ${num(t)} = ${num(dx)}\\ \\text{m}`], ['vectores'], 0, mov.t_max, 'v_area'),
    escena('Las cuatro ecuaciones y cuál usar', [
      'Hay cinco variables: desplazamiento, velocidad inicial, velocidad final, aceleración y tiempo.',
      'Cada ecuación deja fuera una de ellas.',
      'El truco es buscar la variable que ni te dan ni te piden, y usar la ecuación que no la tiene.',
    ], [
      'v = v_0 + a\\,t \\qquad (\\text{no tiene } \\Delta x)',
      '\\Delta x = v_0\\,t + \\tfrac{1}{2}a\\,t^2 \\qquad (\\text{no tiene } v)',
      'v^2 = v_0^2 + 2\\,a\\,\\Delta x \\qquad (\\text{no tiene } t)',
      '\\Delta x = \\tfrac{1}{2}(v_0 + v)\\,t \\qquad (\\text{no tiene } a)',
    ], [], 0, 0, null),
  ];
  for (const ev of eventos(mov)) {
    e.push(escena('El momento en que se detiene', [
      `A los ${txt(ev.t)} segundos la velocidad llega a cero: el móvil se detiene.`,
      'En la gráfica velocidad–tiempo es el punto donde la recta cruza el eje.',
    ], [`v = 0 \\Rightarrow t = -\\dfrac{v_0}{a} = ${num(ev.t)}\\ \\text{s}`], ['estrobo', 'vectores'], 0, ev.t, 'v'));
  }
  e.push(...escenasDePasos(sol, mov, ['estrobo', 'vectores']));
  e.push(escena('Resumen', [
    'En el MRUA la aceleración es constante y la velocidad cambia lo mismo cada segundo.',
    'La gráfica velocidad–tiempo es una recta con pendiente a y la de posición es una parábola.',
    'Para resolver, elegí la ecuación que no tiene la variable que ni te dan ni te piden.',
  ], ['v = v_0 + a\\,t', '\\Delta x = v_0\\,t + \\tfrac{1}{2}a\\,t^2', 'v^2 = v_0^2 + 2a\\,\\Delta x'], ['estrobo', 'vectores'], 0, mov.t_max, 'v'));
  return e;
}

function leccionParabolico(v: Valores, mov: Movimiento, sol: Solucion): Escena[] {
  const { v0, theta: th, h0, v0x: vx, v0y: vy, ts, hmax, tv, R: r, g } = v;
  const dt = mov.t_max / 10;
  const k2 = g / (2 * v0 * v0 * Math.cos(rad(th)) ** 2);
  const e: Escena[] = [
    escena('Dos movimientos en uno', [
      'El tiro parabólico no es un movimiento nuevo: son dos movimientos que ya conocés, ocurriendo al mismo tiempo.',
      'Mirá las sombras. La de abajo muestra solo el movimiento horizontal, y la de la izquierda solo el vertical. Es como ver la parábola con rayos X.',
    ], [], ['trayectoria', 'sombra_x', 'sombra_y'], 0, mov.t_max, null),
    {
      ...escena('Descomponemos la velocidad inicial', [
        `El proyectil sale a ${txt(v0)} metros por segundo con un ángulo de ${txt(th)} grados.`,
        `Con el coseno y el seno separamos esa velocidad en dos: ${txtDec(vx, 2)} metros por segundo hacia adelante y ${txtDec(vy, 2)} hacia arriba.`,
      ], [
        `v_{0x} = v_0\\cos\\theta = ${num(v0)}\\cos ${num(th)}^\\circ = ${numDec(vx, 2)}\\ \\text{m/s}`,
        `v_{0y} = v_0\\operatorname{sen}\\theta = ${num(v0)}\\operatorname{sen} ${num(th)}^\\circ = ${numDec(vy, 2)}\\ \\text{m/s}`,
      ], ['componentes'], 0, 0, null),
      datos: [
        { etiqueta: 'Hacia adelante', valor: `v_{0x} = ${numDec(vx, 2)}\\ \\text{m/s}` },
        { etiqueta: 'Hacia arriba', valor: `v_{0y} = ${numDec(vy, 2)}\\ \\text{m/s}` },
      ],
    },
    escena('En x: un MRU', [
      'Hacia adelante nada empuja ni frena al proyectil, porque no tomamos en cuenta el aire.',
      `Por eso la sombra de abajo avanza siempre lo mismo: ${txtDec(vx * dt, 2)} metros en cada intervalo de ${txt(dt)} segundos.`,
      'La velocidad horizontal es constante: su gráfica es una línea horizontal.',
    ], ['x(t) = v_{0x}\\,t', 'v_x = v_{0x} = \\text{constante}'], ['sombra_x', 'estrobo'], 0, mov.t_max, 'vx'),
    escena('En y: un MRUA', [
      `Hacia arriba, la gravedad frena al proyectil ${txt(g)} metros por segundo en cada segundo, hasta que se detiene.`,
      'Después la acelera hacia abajo. Fijate cómo la sombra de la izquierda sube cada vez más despacio y baja cada vez más rápido.',
      'La gráfica de la velocidad vertical es una recta que baja: su pendiente es menos g.',
    ], ['y(t) = h_0 + v_{0y}\\,t - \\tfrac{1}{2}\\,g\\,t^2', 'v_y = v_{0y} - g\\,t'], ['sombra_y', 'estrobo'], 0, mov.t_max, 'vy'),
    escena('El punto más alto', [
      'Arriba, la velocidad vertical vale cero: al proyectil solo le queda la velocidad horizontal.',
      `Llega ahí a los ${txt(ts)} segundos, a ${txtDec(hmax, 2)} metros del suelo.`,
    ], [
      `v_y = 0 \\Rightarrow t_s = \\dfrac{v_{0y}}{g} = \\dfrac{${numDec(vy, 2)}}{${num(g)}} = ${num(ts)}\\ \\text{s}`,
      `h_{\\max} = h_0 + \\dfrac{v_{0y}^2}{2g} = ${num(h0)} + \\dfrac{${numDec(vy, 2)}^2}{2\\cdot ${num(g)}} = ${numDec(hmax, 2)}\\ \\text{m}`,
    ], ['trayectoria', 'vectores', 'punto_alto', 'sombra_y'], 0, Math.min(ts, mov.t_max), null),
    escena('¿Cuánto vuela y hasta dónde llega?', [
      'El proyectil toca el suelo cuando su altura vuelve a ser cero.',
      `Eso pasa a los ${txt(tv)} segundos. En ese tiempo avanzó ${txtDec(r, 2)} metros hacia adelante: ese es el alcance.`,
    ], [
      Math.abs(h0) < 1e-9
        ? `t_v = \\dfrac{2\\,v_{0y}}{g} = ${num(tv)}\\ \\text{s}`
        : `t_v = \\dfrac{v_{0y} + \\sqrt{v_{0y}^2 + 2\\,g\\,h_0}}{g} = ${num(tv)}\\ \\text{s}`,
      `R = v_{0x}\\,t_v = ${numDec(vx, 2)}\\cdot ${num(tv)} = ${numDec(r, 2)}\\ \\text{m}`,
    ], ['trayectoria', 'vectores'], 0, mov.t_max, null),
  ];
  if (ts > 0 && ts < mov.t_max) {
    const bajada = Math.sqrt((2 * hmax) / g);
    e.push(escena('El mango que se cae del palo', [
      'Imaginá un mango que se suelta del palo justo a la altura máxima, en el instante en que el proyectil pasa por arriba.',
      '¡Los dos llegan al suelo al mismo tiempo! En el eje y los dos hacen exactamente lo mismo: caen libremente desde la altura máxima.',
      `Por eso la bajada dura ${txt(bajada)} segundos para los dos.`,
    ], [`t_{\\text{bajada}} = \\sqrt{\\dfrac{2\\,h_{\\max}}{g}} = ${num(bajada)}\\ \\text{s} = t_v - t_s`], ['trayectoria', 'gemelo'], ts, mov.t_max, null));
  }
  e.push(escena('La ecuación de la trayectoria', [
    'Si despejamos el tiempo del movimiento horizontal y lo metemos en el vertical, el tiempo desaparece.',
    'Queda la altura en función de la distancia: la ecuación de la parábola.',
  ], [
    'y(x) = h_0 + x\\tan\\theta - \\dfrac{g\\,x^2}{2\\,v_0^2\\cos^2\\theta}',
    `y(x) = ${num(h0)} + ${num(Math.tan(rad(th)))}\\,x - ${numDec(k2, 4)}\\,x^2`,
  ], ['trayectoria'], 0, mov.t_max, 'trayectoria'));
  if (Math.abs(h0) < 1e-9) {
    e.push(escena('¿Por qué 45° llega más lejos?', [
      'Si sale y cae al mismo nivel, el alcance depende del seno del doble del ángulo.',
      'Ese seno vale lo máximo, uno, cuando el doble del ángulo es noventa grados, o sea con cuarenta y cinco grados.',
      'Y dos ángulos que suman noventa grados, como treinta y sesenta, llegan igual de lejos.',
    ], ['R = \\dfrac{v_0^2\\operatorname{sen}(2\\theta)}{g}', `R_{\\max} = \\dfrac{v_0^2}{g} = ${numDec((v0 * v0) / g, 2)}\\ \\text{m}\\quad(\\theta = 45^\\circ)`], ['trayectoria'], 0, mov.t_max, null));
  }
  e.push(...escenasDePasos(sol, mov, ['trayectoria', 'vectores']));
  e.push(escena('Resumen', [
    'En x es un movimiento rectilíneo uniforme y en y un movimiento uniformemente acelerado con aceleración menos g.',
    'Arriba la velocidad vertical es cero.',
    'Con la ecuación de la trayectoria podés calcular un tiro antes de lanzarlo, como en el juego de la hondilla.',
  ], ['x = v_{0x}\\,t', 'y = h_0 + v_{0y}\\,t - \\tfrac{1}{2}g\\,t^2'], ['trayectoria', 'sombra_x', 'sombra_y', 'vectores'], 0, mov.t_max, 'trayectoria'));
  return e;
}

function conDefectos(m: ModeloInterno, datos: Valores): Valores {
  const d = { ...datos };
  for (const v of m.variables) if (v.defecto !== undefined && !(v.id in d)) d[v.id] = v.defecto;
  return d;
}

export function generar(e: { modelo: string; datos?: Valores; incognitas: string[]; enunciado?: string }): Leccion {
  const m = porId(e.modelo);
  if (!m) throw new Error(`Modelo desconocido: ${e.modelo}`);
  const todas = m.variables.map((v) => v.id);
  let elegida: [Solucion, Movimiento, string | null, boolean] | null = null;
  if (e.datos) {
    const sol = resolver(m, { datos: conDefectos(m, e.datos), incognitas: e.incognitas });
    const completa = !Object.keys(sol.errores).length && !sol.inconsistencias.length && todas.every((id) => id in sol.valores);
    if (completa) {
      try {
        elegida = [sol, desdeModelo(m.id, sol.valores), e.enunciado ?? null, true];
      } catch { /* se usa el ejemplo */ }
    }
  }
  if (!elegida) {
    const ej = m.ejemplos[0];
    const sol = resolver(m, { datos: conDefectos(m, Object.fromEntries(ej.datos)), incognitas: ej.pide });
    elegida = [sol, desdeModelo(m.id, sol.valores), ej.enunciado, false];
  }
  const [sol, mov, enunciado, propio] = elegida;
  const v = sol.valores;
  const escenas = m.id === 'mru' ? leccionMru(v, mov, sol) : m.id === 'mrua' ? leccionMrua(v, mov, sol) : leccionParabolico(v, mov, sol);
  return { modelo: m.id, titulo: `Modo clase · ${m.nombre}`, enunciado, propio, marcas: mov.t_max / 10, escenas, simulacion: simular(mov, 600), solucion: sol };
}
