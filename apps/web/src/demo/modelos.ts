/**
 * Copia en TypeScript de crates/fisica-core/src/modelos (solo para el HTML de demostración).
 * El motor oficial es el de Rust; las pruebas de paridad comprueban que ambos coinciden.
 */
import { cosd, grados, num, par, raicesPositivas, sind, tand, txt } from './formato';
import { conNota, G, imposible, libre, noNegativa, NO, nz, ok, type ModeloInterno, type V } from './tipos';

const sgn = (x: number) => (x < 0 ? -1 : 1);
const NO_LLEGA = 'Con esos datos la ecuación no tiene solución real: el móvil nunca llega a esa posición.';

// ============================================================== MRU
const mru: ModeloInterno = {
  id: 'mru',
  corto: 'MRU',
  nombre: 'Movimiento Rectilíneo Uniforme',
  descripcion: 'Velocidad constante y aceleración nula.',
  dimension: 'recta',
  variables: [libre('dx', '\\Delta x', 'Desplazamiento', 'm'), libre('v', 'v', 'Velocidad', 'm/s'), noNegativa('t', 't', 'Tiempo', 's')],
  ecuaciones: [
    {
      id: 'mru1', latex: '\\Delta x = v\\,t', vars: ['dx', 'v', 't'],
      residuo: (v) => [v.g('dx'), v.g('v') * v.g('t')],
      despejes: [
        { var: 'dx', latex: '\\Delta x = v\\,t', prioridad: 1, f: (v) => ok(v.g('v') * v.g('t'), `\\Delta x = ${par(v.g('v'))}\\cdot ${par(v.g('t'))}`) },
        { var: 'v', latex: 'v = \\dfrac{\\Delta x}{t}', prioridad: 1, f: (v) => (!nz(v.g('t')) ? NO : ok(v.g('dx') / v.g('t'), `v = \\dfrac{${par(v.g('dx'))}}{${par(v.g('t'))}}`)) },
        { var: 't', latex: 't = \\dfrac{\\Delta x}{v}', prioridad: 1, f: (v) => (!nz(v.g('v')) ? NO : ok(v.g('dx') / v.g('v'), `t = \\dfrac{${par(v.g('dx'))}}{${par(v.g('v'))}}`)) },
      ],
    },
  ],
  ejemplos: [
    { titulo: 'El microbús de la ruta', enunciado: 'Un microbús viaja por la carretera con velocidad constante de 15 m/s. ¿Qué distancia recorre en 40 s?', datos: [['v', 15], ['t', 40]], pide: ['dx'] },
    { titulo: 'Ciclista en la Ruta Militar', enunciado: 'Un ciclista recorre 1 200 m en 150 s con velocidad constante. ¿Cuál es su velocidad?', datos: [['dx', 1200], ['t', 150]], pide: ['v'] },
    { titulo: 'Caminando al mercado', enunciado: 'Una señora camina a 1.25 m/s hacia el mercado, que está a 450 m. ¿Cuánto tarda en llegar?', datos: [['dx', 450], ['v', 1.25]], pide: ['t'] },
  ],
};

// ============================================================= MRUA
const mrua: ModeloInterno = {
  id: 'mrua',
  corto: 'MRUA',
  nombre: 'Movimiento Rectilíneo Uniformemente Acelerado',
  descripcion: 'Aceleración constante en línea recta: la velocidad cambia lo mismo cada segundo.',
  dimension: 'recta',
  variables: [
    libre('dx', '\\Delta x', 'Desplazamiento', 'm'),
    libre('v0', 'v_0', 'Velocidad inicial', 'm/s'),
    libre('v', 'v', 'Velocidad final', 'm/s'),
    libre('a', 'a', 'Aceleración', 'm/s²'),
    noNegativa('t', 't', 'Tiempo', 's'),
  ],
  ecuaciones: [
    {
      id: 'mrua1', latex: 'v = v_0 + a\\,t', vars: ['v', 'v0', 'a', 't'],
      residuo: (v) => [v.g('v'), v.g('v0') + v.g('a') * v.g('t')],
      despejes: [
        { var: 'v', latex: 'v = v_0 + a\\,t', prioridad: 1, f: (v) => ok(v.g('v0') + v.g('a') * v.g('t'), `v = ${par(v.g('v0'))} + ${par(v.g('a'))}\\cdot ${par(v.g('t'))}`) },
        { var: 'v0', latex: 'v_0 = v - a\\,t', prioridad: 1, f: (v) => ok(v.g('v') - v.g('a') * v.g('t'), `v_0 = ${par(v.g('v'))} - ${par(v.g('a'))}\\cdot ${par(v.g('t'))}`) },
        { var: 'a', latex: 'a = \\dfrac{v - v_0}{t}', prioridad: 1, f: (v) => (!nz(v.g('t')) ? NO : ok((v.g('v') - v.g('v0')) / v.g('t'), `a = \\dfrac{${par(v.g('v'))} - ${par(v.g('v0'))}}{${par(v.g('t'))}}`)) },
        { var: 't', latex: 't = \\dfrac{v - v_0}{a}', prioridad: 1, f: (v) => (!nz(v.g('a')) ? NO : ok((v.g('v') - v.g('v0')) / v.g('a'), `t = \\dfrac{${par(v.g('v'))} - ${par(v.g('v0'))}}{${par(v.g('a'))}}`)) },
      ],
    },
    {
      id: 'mrua2', latex: '\\Delta x = v_0\\,t + \\tfrac{1}{2}\\,a\\,t^2', vars: ['dx', 'v0', 'a', 't'],
      residuo: (v) => [v.g('dx'), v.g('v0') * v.g('t') + 0.5 * v.g('a') * v.g('t') ** 2],
      despejes: [
        { var: 'dx', latex: '\\Delta x = v_0\\,t + \\tfrac{1}{2}\\,a\\,t^2', prioridad: 1, f: (v) => {
          const [v0, a, t] = [v.g('v0'), v.g('a'), v.g('t')];
          return ok(v0 * t + 0.5 * a * t * t, `\\Delta x = ${par(v0)}\\cdot ${par(t)} + \\tfrac{1}{2}\\cdot ${par(a)}\\cdot ${par(t)}^2`);
        } },
        { var: 'v0', latex: 'v_0 = \\dfrac{\\Delta x - \\tfrac{1}{2}\\,a\\,t^2}{t}', prioridad: 1, f: (v) => {
          const [dx, a, t] = [v.g('dx'), v.g('a'), v.g('t')];
          if (!nz(t)) return NO;
          return ok((dx - 0.5 * a * t * t) / t, `v_0 = \\dfrac{${par(dx)} - \\tfrac{1}{2}\\cdot ${par(a)}\\cdot ${par(t)}^2}{${par(t)}}`);
        } },
        { var: 'a', latex: 'a = \\dfrac{2\\,(\\Delta x - v_0\\,t)}{t^2}', prioridad: 1, f: (v) => {
          const [dx, v0, t] = [v.g('dx'), v.g('v0'), v.g('t')];
          if (!nz(t)) return NO;
          return ok((2 * (dx - v0 * t)) / (t * t), `a = \\dfrac{2\\,(${par(dx)} - ${par(v0)}\\cdot ${par(t)})}{${par(t)}^2}`);
        } },
        { var: 't', latex: '\\tfrac{1}{2}\\,a\\,t^2 + v_0\\,t - \\Delta x = 0 \\;\\Rightarrow\\; t = \\dfrac{-v_0 \\pm \\sqrt{v_0^2 + 2\\,a\\,\\Delta x}}{a}', prioridad: 2, f: (v) => {
          const [dx, v0, a] = [v.g('dx'), v.g('v0'), v.g('a')];
          const r = raicesPositivas(0.5 * a, v0, -dx);
          if (!r.length) return imposible(NO_LLEGA);
          const s = nz(a)
            ? `t = \\dfrac{-${par(v0)} \\pm \\sqrt{${par(v0)}^2 + 2\\cdot ${par(a)}\\cdot ${par(dx)}}}{${par(a)}}`
            : `t = \\dfrac{${par(dx)}}{${par(v0)}}\\quad (a = 0)`;
          return r.length > 1
            ? conNota(r[0], s, `La ecuación cuadrática tiene otra raíz positiva: t = ${txt(r[1])} s. Se usa la primera vez que el móvil llega a esa posición.`)
            : ok(r[0], s);
        } },
      ],
    },
    {
      id: 'mrua3', latex: 'v^2 = v_0^2 + 2\\,a\\,\\Delta x', vars: ['v', 'v0', 'a', 'dx'],
      residuo: (v) => [v.g('v') ** 2, v.g('v0') ** 2 + 2 * v.g('a') * v.g('dx')],
      despejes: [
        { var: 'v', latex: 'v = \\pm\\sqrt{v_0^2 + 2\\,a\\,\\Delta x}', prioridad: 3, f: (v) => {
          const [v0, a, dx] = [v.g('v0'), v.g('a'), v.g('dx')];
          const rr = v0 * v0 + 2 * a * dx;
          if (rr < -1e-9) return imposible(NO_LLEGA);
          const s = nz(v0) ? sgn(v0) : sgn(a);
          return conNota(s * Math.sqrt(Math.max(rr, 0)), `v = \\pm\\sqrt{${par(v0)}^2 + 2\\cdot ${par(a)}\\cdot ${par(dx)}}`, 'Se toma el signo del sentido del movimiento (se supone que el móvil no se devuelve).');
        } },
        { var: 'v0', latex: 'v_0 = \\pm\\sqrt{v^2 - 2\\,a\\,\\Delta x}', prioridad: 3, f: (v) => {
          const [vf, a, dx] = [v.g('v'), v.g('a'), v.g('dx')];
          const rr = vf * vf - 2 * a * dx;
          if (rr < -1e-9) return imposible(NO_LLEGA);
          const s = nz(vf) ? sgn(vf) : -sgn(a);
          return conNota(s * Math.sqrt(Math.max(rr, 0)), `v_0 = \\pm\\sqrt{${par(vf)}^2 - 2\\cdot ${par(a)}\\cdot ${par(dx)}}`, 'Se toma el signo del sentido del movimiento (se supone que el móvil no se devuelve).');
        } },
        { var: 'a', latex: 'a = \\dfrac{v^2 - v_0^2}{2\\,\\Delta x}', prioridad: 1, f: (v) => {
          const [vf, v0, dx] = [v.g('v'), v.g('v0'), v.g('dx')];
          if (!nz(dx)) return NO;
          return ok((vf * vf - v0 * v0) / (2 * dx), `a = \\dfrac{${par(vf)}^2 - ${par(v0)}^2}{2\\cdot ${par(dx)}}`);
        } },
        { var: 'dx', latex: '\\Delta x = \\dfrac{v^2 - v_0^2}{2\\,a}', prioridad: 1, f: (v) => {
          const [vf, v0, a] = [v.g('v'), v.g('v0'), v.g('a')];
          if (!nz(a)) return NO;
          return ok((vf * vf - v0 * v0) / (2 * a), `\\Delta x = \\dfrac{${par(vf)}^2 - ${par(v0)}^2}{2\\cdot ${par(a)}}`);
        } },
      ],
    },
    {
      id: 'mrua4', latex: '\\Delta x = \\tfrac{1}{2}\\,(v_0 + v)\\,t', vars: ['dx', 'v0', 'v', 't'],
      residuo: (v) => [v.g('dx'), 0.5 * (v.g('v0') + v.g('v')) * v.g('t')],
      despejes: [
        { var: 'dx', latex: '\\Delta x = \\tfrac{1}{2}\\,(v_0 + v)\\,t', prioridad: 1, f: (v) => {
          const [v0, vf, t] = [v.g('v0'), v.g('v'), v.g('t')];
          return ok(0.5 * (v0 + vf) * t, `\\Delta x = \\tfrac{1}{2}\\,(${par(v0)} + ${par(vf)})\\cdot ${par(t)}`);
        } },
        { var: 'v0', latex: 'v_0 = \\dfrac{2\\,\\Delta x}{t} - v', prioridad: 1, f: (v) => {
          const [dx, vf, t] = [v.g('dx'), v.g('v'), v.g('t')];
          if (!nz(t)) return NO;
          return ok((2 * dx) / t - vf, `v_0 = \\dfrac{2\\cdot ${par(dx)}}{${par(t)}} - ${par(vf)}`);
        } },
        { var: 'v', latex: 'v = \\dfrac{2\\,\\Delta x}{t} - v_0', prioridad: 1, f: (v) => {
          const [dx, v0, t] = [v.g('dx'), v.g('v0'), v.g('t')];
          if (!nz(t)) return NO;
          return ok((2 * dx) / t - v0, `v = \\dfrac{2\\cdot ${par(dx)}}{${par(t)}} - ${par(v0)}`);
        } },
        { var: 't', latex: 't = \\dfrac{2\\,\\Delta x}{v_0 + v}', prioridad: 1, f: (v) => {
          const [dx, v0, vf] = [v.g('dx'), v.g('v0'), v.g('v')];
          if (!nz(v0 + vf)) return NO;
          return ok((2 * dx) / (v0 + vf), `t = \\dfrac{2\\cdot ${par(dx)}}{${par(v0)} + ${par(vf)}}`);
        } },
      ],
    },
  ],
  ejemplos: [
    { titulo: 'Arranque en el semáforo', enunciado: 'Un carro parte del reposo en un semáforo de la Alameda Roosevelt y acelera a 3 m/s² durante 8 s. ¿Qué distancia recorre y cuál es su velocidad final?', datos: [['v0', 0], ['a', 3], ['t', 8]], pide: ['dx', 'v'] },
    { titulo: 'Frenado en la carretera', enunciado: 'Un pick-up va a 25 m/s y frena con aceleración constante hasta detenerse en 50 m. ¿Cuál fue su aceleración y cuánto tardó en detenerse?', datos: [['v0', 25], ['v', 0], ['dx', 50]], pide: ['a', 't'] },
    { titulo: 'Moto en la Panamericana', enunciado: 'Una moto que va a 10 m/s acelera a 2 m/s² hasta alcanzar 30 m/s. ¿Qué distancia recorrió y en cuánto tiempo?', datos: [['v0', 10], ['a', 2], ['v', 30]], pide: ['dx', 't'] },
  ],
};

// ======================================================= Parabólico
const h0Cero = (v: V) => v.tiene('h0') && Math.abs(v.g('h0')) < 1e-12;

const parabolico: ModeloInterno = {
  id: 'parabolico',
  corto: 'Parabólico',
  nombre: 'Lanzamiento parabólico',
  descripcion: 'Se lanza con rapidez v₀ y ángulo θ sobre la horizontal desde una altura h₀. En x es un MRU y en y un MRUA con a = −g.',
  dimension: 'plano',
  variables: [
    libre('v0', 'v_0', 'Rapidez inicial', 'm/s', { min: 0, estricto: true }),
    libre('theta', '\\theta', 'Ángulo de lanzamiento', '°', { min: 0, max: 90 }),
    noNegativa('h0', 'h_0', 'Altura inicial', 'm', { defecto: 0 }),
    noNegativa('v0x', 'v_{0x}', 'Componente horizontal', 'm/s'),
    noNegativa('v0y', 'v_{0y}', 'Componente vertical', 'm/s'),
    noNegativa('ts', 't_s', 'Tiempo de subida', 's'),
    noNegativa('hmax', 'h_{\\max}', 'Altura máxima (desde el suelo)', 'm'),
    noNegativa('tv', 't_v', 'Tiempo de vuelo', 's'),
    noNegativa('R', 'R', 'Alcance horizontal', 'm'),
    libre('g', 'g', 'Gravedad', 'm/s²', { min: 0, estricto: true, defecto: G }),
  ],
  ecuaciones: [
    {
      id: 'lp1', latex: 'v_{0x} = v_0\\cos\\theta', vars: ['v0x', 'v0', 'theta'],
      residuo: (v) => [v.g('v0x'), v.g('v0') * cosd(v.g('theta'))],
      despejes: [
        { var: 'v0x', latex: 'v_{0x} = v_0\\cos\\theta', prioridad: 1, f: (v) => ok(v.g('v0') * cosd(v.g('theta')), `v_{0x} = ${par(v.g('v0'))}\\cos ${num(v.g('theta'))}^\\circ`) },
        { var: 'v0', latex: 'v_0 = \\dfrac{v_{0x}}{\\cos\\theta}', prioridad: 1, f: (v) => (v.g('theta') >= 90 ? NO : ok(v.g('v0x') / cosd(v.g('theta')), `v_0 = \\dfrac{${par(v.g('v0x'))}}{\\cos ${num(v.g('theta'))}^\\circ}`)) },
        { var: 'theta', latex: '\\theta = \\arccos\\dfrac{v_{0x}}{v_0}', prioridad: 2, f: (v) => {
          const [vx, v0] = [v.g('v0x'), v.g('v0')];
          if (!nz(v0) || vx > v0) return NO;
          return ok(grados(Math.acos(vx / v0)), `\\theta = \\arccos\\dfrac{${par(vx)}}{${par(v0)}}`);
        } },
      ],
    },
    {
      id: 'lp2', latex: 'v_{0y} = v_0\\operatorname{sen}\\theta', vars: ['v0y', 'v0', 'theta'],
      residuo: (v) => [v.g('v0y'), v.g('v0') * sind(v.g('theta'))],
      despejes: [
        { var: 'v0y', latex: 'v_{0y} = v_0\\operatorname{sen}\\theta', prioridad: 1, f: (v) => ok(v.g('v0') * sind(v.g('theta')), `v_{0y} = ${par(v.g('v0'))}\\operatorname{sen} ${num(v.g('theta'))}^\\circ`) },
        { var: 'v0', latex: 'v_0 = \\dfrac{v_{0y}}{\\operatorname{sen}\\theta}', prioridad: 1, f: (v) => (v.g('theta') <= 0 ? NO : ok(v.g('v0y') / sind(v.g('theta')), `v_0 = \\dfrac{${par(v.g('v0y'))}}{\\operatorname{sen} ${num(v.g('theta'))}^\\circ}`)) },
        { var: 'theta', latex: '\\theta = \\arcsin\\dfrac{v_{0y}}{v_0}', prioridad: 2, f: (v) => {
          const [vy, v0] = [v.g('v0y'), v.g('v0')];
          if (!nz(v0) || vy > v0) return NO;
          return ok(grados(Math.asin(vy / v0)), `\\theta = \\arcsin\\dfrac{${par(vy)}}{${par(v0)}}`);
        } },
      ],
    },
    {
      id: 'lp3', latex: 'v_0 = \\sqrt{v_{0x}^2 + v_{0y}^2}', vars: ['v0', 'v0x', 'v0y'],
      residuo: (v) => [v.g('v0') ** 2, v.g('v0x') ** 2 + v.g('v0y') ** 2],
      despejes: [
        { var: 'v0', latex: 'v_0 = \\sqrt{v_{0x}^2 + v_{0y}^2}', prioridad: 2, f: (v) => ok(Math.hypot(v.g('v0x'), v.g('v0y')), `v_0 = \\sqrt{${par(v.g('v0x'))}^2 + ${par(v.g('v0y'))}^2}`) },
        { var: 'v0x', latex: 'v_{0x} = \\sqrt{v_0^2 - v_{0y}^2}', prioridad: 2, f: (v) => {
          const [v0, vy] = [v.g('v0'), v.g('v0y')];
          if (vy > v0) return NO;
          return ok(Math.sqrt(v0 * v0 - vy * vy), `v_{0x} = \\sqrt{${par(v0)}^2 - ${par(vy)}^2}`);
        } },
        { var: 'v0y', latex: 'v_{0y} = \\sqrt{v_0^2 - v_{0x}^2}', prioridad: 2, f: (v) => {
          const [v0, vx] = [v.g('v0'), v.g('v0x')];
          if (vx > v0) return NO;
          return ok(Math.sqrt(v0 * v0 - vx * vx), `v_{0y} = \\sqrt{${par(v0)}^2 - ${par(vx)}^2}`);
        } },
      ],
    },
    {
      id: 'lp4', latex: '\\tan\\theta = \\dfrac{v_{0y}}{v_{0x}}', vars: ['theta', 'v0y', 'v0x'],
      residuo: (v) => [v.g('v0x') * tand(v.g('theta')), v.g('v0y')],
      despejes: [
        { var: 'theta', latex: '\\theta = \\arctan\\dfrac{v_{0y}}{v_{0x}}', prioridad: 1, f: (v) => ok(grados(Math.atan2(v.g('v0y'), v.g('v0x'))), `\\theta = \\arctan\\dfrac{${par(v.g('v0y'))}}{${par(v.g('v0x'))}}`) },
        { var: 'v0y', latex: 'v_{0y} = v_{0x}\\tan\\theta', prioridad: 1, f: (v) => (v.g('theta') >= 90 ? NO : ok(v.g('v0x') * tand(v.g('theta')), `v_{0y} = ${par(v.g('v0x'))}\\tan ${num(v.g('theta'))}^\\circ`)) },
        { var: 'v0x', latex: 'v_{0x} = \\dfrac{v_{0y}}{\\tan\\theta}', prioridad: 1, f: (v) => (v.g('theta') <= 0 ? NO : ok(v.g('v0y') / tand(v.g('theta')), `v_{0x} = \\dfrac{${par(v.g('v0y'))}}{\\tan ${num(v.g('theta'))}^\\circ}`)) },
      ],
    },
    {
      id: 'lp5', latex: 't_s = \\dfrac{v_{0y}}{g}', vars: ['ts', 'v0y', 'g'],
      residuo: (v) => [v.g('ts'), v.g('v0y') / v.g('g')],
      despejes: [
        { var: 'ts', latex: 't_s = \\dfrac{v_{0y}}{g}', prioridad: 1, f: (v) => ok(v.g('v0y') / v.g('g'), `t_s = \\dfrac{${par(v.g('v0y'))}}{${par(v.g('g'))}}`) },
        { var: 'v0y', latex: 'v_{0y} = g\\,t_s', prioridad: 1, f: (v) => ok(v.g('g') * v.g('ts'), `v_{0y} = ${par(v.g('g'))}\\cdot ${par(v.g('ts'))}`) },
      ],
    },
    {
      id: 'lp6', latex: 'h_{\\max} = h_0 + \\dfrac{v_{0y}^2}{2g}', vars: ['hmax', 'h0', 'v0y', 'g'],
      residuo: (v) => [v.g('hmax'), v.g('h0') + v.g('v0y') ** 2 / (2 * v.g('g'))],
      despejes: [
        { var: 'hmax', latex: 'h_{\\max} = h_0 + \\dfrac{v_{0y}^2}{2g}', prioridad: 1, f: (v) => ok(v.g('h0') + v.g('v0y') ** 2 / (2 * v.g('g')), `h_{\\max} = ${par(v.g('h0'))} + \\dfrac{${par(v.g('v0y'))}^2}{2\\cdot ${par(v.g('g'))}}`) },
        { var: 'v0y', latex: 'v_{0y} = \\sqrt{2g\\,(h_{\\max} - h_0)}', prioridad: 2, f: (v) => {
          const [hm, h0, g] = [v.g('hmax'), v.g('h0'), v.g('g')];
          if (hm < h0) return imposible('La altura máxima no puede ser menor que la altura inicial.');
          return ok(Math.sqrt(2 * g * (hm - h0)), `v_{0y} = \\sqrt{2\\cdot ${par(g)}\\,(${par(hm)} - ${par(h0)})}`);
        } },
        { var: 'h0', latex: 'h_0 = h_{\\max} - \\dfrac{v_{0y}^2}{2g}', prioridad: 1, f: (v) => ok(v.g('hmax') - v.g('v0y') ** 2 / (2 * v.g('g')), `h_0 = ${par(v.g('hmax'))} - \\dfrac{${par(v.g('v0y'))}^2}{2\\cdot ${par(v.g('g'))}}`) },
      ],
    },
    {
      id: 'lp7', latex: 'h_0 + v_{0y}\\,t_v - \\tfrac{1}{2}\\,g\\,t_v^2 = 0', vars: ['tv', 'h0', 'v0y', 'g'],
      residuo: (v) => [v.g('h0') + v.g('v0y') * v.g('tv'), 0.5 * v.g('g') * v.g('tv') ** 2],
      despejes: [
        { var: 'tv', latex: 't_v = \\dfrac{v_{0y} + \\sqrt{v_{0y}^2 + 2\\,g\\,h_0}}{g}', prioridad: 1, f: (v) => {
          const [vy, h0, g] = [v.g('v0y'), v.g('h0'), v.g('g')];
          const r = raicesPositivas(0.5 * g, -vy, -h0);
          if (!r.length) return NO;
          return ok(r[r.length - 1], `t_v = \\dfrac{${par(vy)} + \\sqrt{${par(vy)}^2 + 2\\cdot ${par(g)}\\cdot ${par(h0)}}}{${par(g)}}`);
        } },
        { var: 'v0y', latex: 'v_{0y} = \\dfrac{\\tfrac{1}{2}\\,g\\,t_v^2 - h_0}{t_v}', prioridad: 1, f: (v) => {
          const [tv, h0, g] = [v.g('tv'), v.g('h0'), v.g('g')];
          if (!nz(tv)) return NO;
          return ok((0.5 * g * tv * tv - h0) / tv, `v_{0y} = \\dfrac{\\tfrac{1}{2}\\cdot ${par(g)}\\cdot ${par(tv)}^2 - ${par(h0)}}{${par(tv)}}`);
        } },
        { var: 'h0', latex: 'h_0 = \\tfrac{1}{2}\\,g\\,t_v^2 - v_{0y}\\,t_v', prioridad: 1, f: (v) => {
          const [tv, vy, g] = [v.g('tv'), v.g('v0y'), v.g('g')];
          return ok(0.5 * g * tv * tv - vy * tv, `h_0 = \\tfrac{1}{2}\\cdot ${par(g)}\\cdot ${par(tv)}^2 - ${par(vy)}\\cdot ${par(tv)}`);
        } },
      ],
    },
    {
      id: 'lp8', latex: 'R = v_{0x}\\,t_v', vars: ['R', 'v0x', 'tv'],
      residuo: (v) => [v.g('R'), v.g('v0x') * v.g('tv')],
      despejes: [
        { var: 'R', latex: 'R = v_{0x}\\,t_v', prioridad: 1, f: (v) => ok(v.g('v0x') * v.g('tv'), `R = ${par(v.g('v0x'))}\\cdot ${par(v.g('tv'))}`) },
        { var: 'v0x', latex: 'v_{0x} = \\dfrac{R}{t_v}', prioridad: 1, f: (v) => (!nz(v.g('tv')) ? NO : ok(v.g('R') / v.g('tv'), `v_{0x} = \\dfrac{${par(v.g('R'))}}{${par(v.g('tv'))}}`)) },
        { var: 'tv', latex: 't_v = \\dfrac{R}{v_{0x}}', prioridad: 1, f: (v) => (!nz(v.g('v0x')) ? NO : ok(v.g('R') / v.g('v0x'), `t_v = \\dfrac{${par(v.g('R'))}}{${par(v.g('v0x'))}}`)) },
      ],
    },
    {
      id: 'lp9', latex: 'R = \\dfrac{v_0^2\\operatorname{sen}(2\\theta)}{g}\\quad(h_0 = 0)', vars: ['R', 'v0', 'theta', 'g'], cuando: h0Cero,
      residuo: (v) => [v.g('R'), (v.g('v0') ** 2 * sind(2 * v.g('theta'))) / v.g('g')],
      despejes: [
        { var: 'R', latex: 'R = \\dfrac{v_0^2\\operatorname{sen}(2\\theta)}{g}', prioridad: 3, f: (v) => ok((v.g('v0') ** 2 * sind(2 * v.g('theta'))) / v.g('g'), `R = \\dfrac{${par(v.g('v0'))}^2\\operatorname{sen}(2\\cdot ${num(v.g('theta'))}^\\circ)}{${par(v.g('g'))}}`) },
        { var: 'v0', latex: 'v_0 = \\sqrt{\\dfrac{R\\,g}{\\operatorname{sen}(2\\theta)}}', prioridad: 2, f: (v) => {
          const s2 = sind(2 * v.g('theta'));
          if (s2 <= 1e-9) return NO;
          return ok(Math.sqrt((v.g('R') * v.g('g')) / s2), `v_0 = \\sqrt{\\dfrac{${par(v.g('R'))}\\cdot ${par(v.g('g'))}}{\\operatorname{sen}(2\\cdot ${num(v.g('theta'))}^\\circ)}}`);
        } },
        { var: 'theta', latex: '\\theta = \\tfrac{1}{2}\\arcsin\\dfrac{R\\,g}{v_0^2}', prioridad: 2, f: (v) => {
          const [r, g, v0] = [v.g('R'), v.g('g'), v.g('v0')];
          if (!nz(v0)) return NO;
          const k = (r * g) / (v0 * v0);
          if (k > 1 + 1e-12) return imposible(`Con v₀ = ${txt(v0)} m/s el alcance máximo posible (a 45°) es v₀²/g = ${txt((v0 * v0) / g)} m, menor que R = ${txt(r)} m.`);
          const th = grados(Math.asin(Math.min(k, 1))) / 2;
          const s = `\\theta = \\tfrac{1}{2}\\arcsin\\dfrac{${par(r)}\\cdot ${par(g)}}{${par(v0)}^2}`;
          return Math.abs(th - 45) > 1e-6 ? conNota(th, s, `Otro ángulo da el mismo alcance: θ = 90° − ${txt(th)}° = ${txt(90 - th)}°. Se usa el menor.`) : ok(th, s);
        } },
      ],
    },
  ],
  ejemplos: [
    { titulo: 'Penal en la cancha', enunciado: 'Un balón se patea con 20 m/s a 45° sobre el suelo. Calculá la altura máxima, el tiempo de vuelo y el alcance.', datos: [['v0', 20], ['theta', 45], ['h0', 0]], pide: ['hmax', 'tv', 'R'] },
    { titulo: 'Cohete de pólvora', enunciado: 'En diciembre, un cohete sale a 30° y cae a 80 m de distancia al mismo nivel. ¿Con qué rapidez salió? (Sin contar el empuje.)', datos: [['theta', 30], ['R', 80], ['h0', 0]], pide: ['v0'] },
    { titulo: 'Piedra desde el mirador', enunciado: 'Desde un mirador de 25 m de altura en el Cerro Verde se lanza una piedra a 15 m/s con un ángulo de 37°. ¿Cuánto tarda en caer y a qué distancia cae?', datos: [['v0', 15], ['theta', 37], ['h0', 25]], pide: ['tv', 'R'] },
  ],
};

export const MODELOS = [mru, mrua, parabolico];
export const porId = (id: string) => MODELOS.find((m) => m.id === id);
