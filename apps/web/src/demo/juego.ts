/** Copia en TypeScript de crates/fisica-core/src/juego (solo para la demostración). */
import type { Bloque, Escenario, Impacto, Lanzador, Objetivo, ResultadoTiro, Sugerencia } from '@cinemalab/contratos';
import escenariosJson from './escenarios.json';
import { num, numDec, par, rad, txt, txtDec } from './formato';

export const ESCENARIOS = escenariosJson as Escenario[];
const G = 9.81;
const R_PIEDRA = 0.3;
const V_MIN = 5, V_MAX = 35, A_MIN = 5, A_MAX = 85;
const DT = 1 / 240;
const CADA = 4;

type Fin = ResultadoTiro['fin'];
interface Trazo { trayectoria: [number, number, number][]; fin: Fin; golpes: [number, number][] }

const redondear = (x: number) => Math.round(x * 1e5) / 1e5 + 0;
const centro = (o: Objetivo): [number, number] => [o.x + o.w / 2, o.y + o.h / 2];
const bloque = (titulo: string, texto: string, formulas: string[]): Bloque => ({ titulo, texto, formulas });
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function posicion(l: Lanzador, angulo: number, rapidez: number, t: number): [number, number] {
  const a = rad(angulo);
  return [l.x + l.lado * rapidez * Math.cos(a) * t, l.y + rapidez * Math.sin(a) * t - 0.5 * G * t * t];
}
function circuloCaja(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number) {
  const nx = clamp(cx, x, x + w);
  const ny = clamp(cy, y, y + h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}
function toca(o: Objetivo, px: number, py: number) {
  if (o.tipo === 'lata') return circuloCaja(px, py, R_PIEDRA, o.x, o.y, o.w, o.h);
  const [cx, cy] = centro(o);
  return Math.hypot(px - cx, py - cy) <= R_PIEDRA + o.w / 2;
}

function trazar(esc: Escenario, l: Lanzador, angulo: number, rapidez: number, activos: boolean[]): Trazo {
  const tray: [number, number, number][] = [];
  const golpes: [number, number][] = [];
  const vy0 = rapidez * Math.sin(rad(angulo));
  for (let i = 0; ; i++) {
    const t = i * DT;
    const [x, y] = posicion(l, angulo, rapidez, t);
    if (i % CADA === 0) tray.push([redondear(t), redondear(x), redondear(y)]);
    esc.objetivos.forEach((o, k) => {
      if (activos[k] && !golpes.some((g) => g[0] === k) && toca(o, x, y)) golpes.push([k, t]);
    });
    const ob = esc.obstaculos.find((b) => circuloCaja(x, y, R_PIEDRA, b.x, b.y, b.w, b.h));
    let fin: Fin | null = null;
    if (ob) fin = { tipo: 'obstaculo', t, x, y, obstaculo: ob.nombre };
    else if (y <= R_PIEDRA && vy0 - G * t < 0) fin = { tipo: 'suelo', t, x, y: R_PIEDRA, obstaculo: null };
    else if (x < -4 || x > esc.ancho + 4 || t > 30) fin = { tipo: 'fuera', t, x, y, obstaculo: null };
    if (fin) {
      if (tray[tray.length - 1]?.[0] !== t) tray.push([t, x, y]);
      return { trayectoria: tray, fin, golpes };
    }
  }
}

function sostenidas(esc: Escenario, k: number, activos: boolean[], caen: number[]) {
  if (caen.includes(k)) return;
  caen.push(k);
  const c = esc.objetivos[k];
  if (c.tipo !== 'lata') return;
  esc.objetivos.forEach((o, j) => {
    if (!activos[j] || o.tipo !== 'lata' || caen.includes(j)) return;
    const traslape = o.x < c.x + c.w - 0.05 && o.x + o.w > c.x + 0.05;
    if (traslape && Math.abs(o.y - (c.y + c.h)) < 0.05) sostenidas(esc, j, activos, caen);
  });
}

const activosDe = (esc: Escenario, activos?: string[]) => esc.objetivos.map((o) => (activos ? activos.includes(o.id) : true));
const objetivosDelJugador = (esc: Escenario, j: number, activos: boolean[]) =>
  esc.objetivos.map((o, k) => [o, k] as const).filter(([o, k]) => activos[k] && o.dueno !== j).map(([, k]) => k);

function buscar(id: string) {
  const esc = ESCENARIOS.find((e) => e.id === id);
  if (!esc) throw new Error(`No existe el escenario «${id}».`);
  return esc;
}

// ------------------------------------------------------------ Análisis
function elegir(opciones: string[], semilla: number) {
  return opciones[semilla % opciones.length];
}

function analizar(esc: Escenario, jugador: number, l: Lanzador, angulo: number, rapidez: number, activos: boolean[], trazo: Trazo, impactos: Impacto[], derribados: string[], numero: number): ResultadoTiro['analisis'] {
  const a = rad(angulo);
  const vx = rapidez * Math.cos(a), vy = rapidez * Math.sin(a);
  const ts = vy / G;
  const hmax = l.y + (vy * vy) / (2 * G);
  const k1 = Math.tan(a);
  const k2 = G / (2 * rapidez * rapidez * Math.cos(a) ** 2);
  const semilla = Math.floor(angulo * 10) + Math.floor(rapidez * 10) + numero;
  const pasos: Bloque[] = [
    bloque('1. Descomponemos la velocidad inicial',
      `En x la piedra va siempre a ${txtDec(vx, 2)} m/s: es un MRU. En y empieza subiendo a ${txtDec(vy, 2)} m/s y la gravedad la frena: es un MRUA con a = −g.`,
      [`v_{0x} = v_0\\cos\\theta = ${num(rapidez)}\\cos ${num(angulo)}^\\circ = ${numDec(vx, 2)}\\ \\text{m/s}`,
       `v_{0y} = v_0\\operatorname{sen}\\theta = ${num(rapidez)}\\operatorname{sen} ${num(angulo)}^\\circ = ${numDec(vy, 2)}\\ \\text{m/s}`]),
    bloque('2. El punto más alto', 'Arriba la velocidad vertical es cero, así que:',
      [`t_s = \\dfrac{v_{0y}}{g} = \\dfrac{${numDec(vy, 2)}}{${num(G)}} = ${num(ts)}\\ \\text{s}`,
       `h_{\\max} = y_0 + \\dfrac{v_{0y}^2}{2g} = ${num(l.y)} + \\dfrac{${numDec(vy, 2)}^2}{2\\cdot ${num(G)}} = ${numDec(hmax, 2)}\\ \\text{m}`]),
    bloque('3. Ecuación de la trayectoria de este tiro', 'd es la distancia horizontal desde la hondilla:',
      [`y(d) = ${num(l.y)} + ${num(k1)}\\,d - ${numDec(k2, 4)}\\,d^2`]),
  ];
  const cand = objetivosDelJugador(esc, jugador, activos);
  const alturaEn = (d: number) => l.y + k1 * d - k2 * d * d;
  const err = (k: number) => { const o = esc.objetivos[k]; return Math.abs(alturaEn(l.lado * (centro(o)[0] - l.x)) - centro(o)[1]); };
  const referencia = cand.filter((k) => l.lado * (centro(esc.objetivos[k])[0] - l.x) > 0).reduce<number | null>((m, k) => (m === null || err(k) < err(m) ? k : m), null);
  const dFin = l.lado * (trazo.fin.x - l.x);
  const propios = impactos.filter((i) => esc.objetivos.some((o) => o.id === i.id && o.dueno === jugador)).length;
  const ajenos = Math.max(0, derribados.length - propios);

  let resultado: ResultadoTiro['analisis']['resultado'];
  let frase: string;
  let veredicto: string;
  if (derribados.length) {
    const mangos = impactos.filter((i) => i.tipo === 'mango').length;
    resultado = 'acierto';
    if (propios > 0 && ajenos === 0) frase = '¡Te botaste tus propias latas, bicho!';
    else if (mangos > 0) frase = elegir(['¡Cayó el mango! A comerlo con sal y alguashte.', '¡Chivo! Ese mango ya es tuyo.', '¡Qué puntería, vos! Bajaste el mango.'], semilla);
    else frase = elegir(['¡Chivo, cipote! Le diste.', '¡Qué puntería, vos!', '¡Ese sí fue un hondillazo!', '¡Puro tiro de campeón!'], semilla);
    veredicto = mangos > 0 ? `Bajaste ${mangos} mango${mangos > 1 ? 's' : ''}.` : `Botaste ${derribados.length} lata${derribados.length > 1 ? 's' : ''}.`;
  } else if (trazo.fin.tipo === 'obstaculo') {
    resultado = 'obstaculo';
    const ob = trazo.fin.obstaculo ?? '';
    const al = ob.startsWith('el ') ? `al ${ob.slice(3)}` : `a ${ob}`;
    frase = elegir(['¡Pum! Directo {al}.', '¡Le diste {al}!', '¡Ay no! Se topó con {ob}.'], semilla).replace('{al}', al).replace('{ob}', ob);
    veredicto = `Chocó con ${ob} a ${txtDec(trazo.fin.y, 2)} m de altura, a ${txtDec(dFin, 2)} m de la hondilla.`;
  } else if (referencia !== null) {
    const o = esc.objetivos[referencia];
    const dObj = l.lado * (centro(o)[0] - l.x);
    if (dFin < dObj - o.w) {
      resultado = 'corto';
      frase = elegir(['Se quedó cortito, échele más fuerza.', 'Le faltó jugo a ese tiro.'], semilla);
      veredicto = `Cayó a ${txtDec(dFin, 2)} m de la hondilla: le faltaron ${txtDec(dObj - dFin, 2)} m para llegar.`;
    } else {
      const yEn = alturaEn(dObj);
      const [lo, hi] = [o.y, o.y + o.h];
      const falla = yEn > hi ? yEn - hi : lo - yEn;
      resultado = falla < 1 ? 'cerca' : yEn > hi ? 'arriba' : 'abajo';
      frase = falla < 1
        ? elegir(['¡Púchica, casi!', '¡Por un pelito!', '¡Uy, rozó!'], semilla)
        : yEn > hi ? elegir(['¡Va para San Miguel ese tiro!', 'Se fue volando, échele menos fuerza.'], semilla) : 'Pasó por debajo. Subile al ángulo o a la fuerza.';
      veredicto = yEn > hi ? `Pasó ${txtDec(yEn - hi, 2)} m por encima del objetivo.` : `Pasó ${txtDec(lo - yEn, 2)} m por debajo del objetivo.`;
    }
  } else {
    resultado = 'corto';
    frase = 'Ese tiro no iba para ningún lado, vos.';
    veredicto = `Cayó a ${txtDec(dFin, 2)} m de la hondilla.`;
  }

  if (referencia !== null) {
    const o = esc.objetivos[referencia];
    const dObj = l.lado * (centro(o)[0] - l.x);
    if (dFin >= dObj - o.w || derribados.length) {
      const tObj = dObj / vx;
      const nombre = o.tipo === 'mango' ? 'el mango' : 'las latas';
      pasos.push(bloque(`4. ¿A qué altura pasó por ${nombre}?`,
        `Llega a d = ${txtDec(dObj, 2)} m en t = d / v₀ₓ = ${txt(tObj)} s. El objetivo está entre y = ${txtDec(o.y, 2)} m y y = ${txtDec(o.y + o.h, 2)} m.`,
        [`y = ${num(l.y)} + ${num(k1)}\\cdot ${numDec(dObj, 2)} - ${numDec(k2, 4)}\\cdot ${numDec(dObj, 2)}^2 = ${numDec(alturaEn(dObj), 2)}\\ \\text{m}`]));
    }
  }
  if (trazo.fin.tipo === 'obstaculo' && !derribados.length) {
    const ob = esc.obstaculos.find((o) => o.nombre === trazo.fin.obstaculo);
    if (ob) {
      const dOb = l.lado > 0 ? ob.x - l.x : l.x - (ob.x + ob.w);
      const yOb = alturaEn(dOb);
      pasos.push(bloque(`4. ¿Por qué chocó con ${ob.nombre}?`,
        `Para pasar, la piedra tenía que ir por encima de ${txtDec(ob.y + ob.h, 2)} m al llegar a d = ${txtDec(dOb, 2)} m, pero ahí iba a ${txtDec(yOb, 2)} m de altura. Hace falta una trayectoria más alta: más ángulo o más rapidez.`,
        [`y(${numDec(dOb, 2)}) = ${num(l.y)} + ${num(k1)}\\cdot ${numDec(dOb, 2)} - ${numDec(k2, 4)}\\cdot ${numDec(dOb, 2)}^2 = ${numDec(yOb, 2)}\\ \\text{m} < ${numDec(ob.y + ob.h, 2)}\\ \\text{m}`]));
    }
  }
  const caida = impactos.find((i) => i.caida)?.caida;
  if (caida) {
    pasos.push(bloque('5. El mango cae: ¡caída libre!',
      `El mango se suelta desde el reposo a ${txtDec(caida.altura, 2)} m de altura. Solo actúa la gravedad, así que tarda ${txt(caida.tiempo)} s en llegar al suelo y llega a ${txtDec(caida.rapidez, 2)} m/s.`,
      [`t = \\sqrt{\\dfrac{2h}{g}} = \\sqrt{\\dfrac{2\\cdot ${numDec(caida.altura, 2)}}{${num(G)}}} = ${num(caida.tiempo)}\\ \\text{s}`,
       `v = \\sqrt{2\\,g\\,h} = \\sqrt{2\\cdot ${num(G)}\\cdot ${numDec(caida.altura, 2)}} = ${numDec(caida.rapidez, 2)}\\ \\text{m/s}`]));
  }
  return { resultado, frase, veredicto, pasos };
}

// ------------------------------------------------------------ Tiro
export function lanzar(e: { escenario: string; jugador: number; angulo: number; rapidez: number; activos?: string[]; numero: number }): ResultadoTiro {
  const esc = buscar(e.escenario);
  const l = esc.lanzadores[e.jugador];
  if (!l) throw new Error(`El escenario no tiene jugador ${e.jugador + 1}.`);
  if (e.angulo < A_MIN || e.angulo > A_MAX) throw new Error(`El ángulo tiene que estar entre ${A_MIN}° y ${A_MAX}°.`);
  if (e.rapidez < V_MIN || e.rapidez > V_MAX) throw new Error(`La rapidez tiene que estar entre ${V_MIN} y ${V_MAX} m/s.`);
  const activos = activosDe(esc, e.activos);
  const trazo = trazar(esc, l, e.angulo, e.rapidez, activos);
  const impactos: Impacto[] = [];
  const caen: number[] = [];
  for (const [k, t] of trazo.golpes) {
    const o = esc.objetivos[k];
    const [x, y] = posicion(l, e.angulo, e.rapidez, t);
    const h = Math.max(o.y, 0);
    impactos.push({ id: o.id, tipo: o.tipo, t, x, y, caida: o.tipo === 'mango' ? { altura: h, tiempo: Math.sqrt((2 * h) / G), rapidez: Math.sqrt(2 * G * h) } : null });
    sostenidas(esc, k, activos, caen);
  }
  const derribados = caen.map((k) => esc.objetivos[k].id);
  const analisis = analizar(esc, e.jugador, l, e.angulo, e.rapidez, activos, trazo, impactos, derribados, e.numero);
  return { angulo: e.angulo, rapidez: e.rapidez, trayectoria: trazo.trayectoria, fin: trazo.fin, impactos, derribados, analisis };
}

// ------------------------------------------------------------ Tiro perfecto
function rapidezPara(l: Lanzador, angulo: number, d: number, y: number): number | null {
  const a = rad(angulo);
  const den = 2 * (l.y + d * Math.tan(a) - y);
  return den > 0 && d > 0 ? (d / Math.cos(a)) * Math.sqrt(G / den) : null;
}
function acierta(esc: Escenario, l: Lanzador, angulo: number, rapidez: number, activos: boolean[], k: number) {
  return rapidez >= V_MIN && rapidez <= V_MAX && trazar(esc, l, angulo, rapidez, activos).golpes.some((g) => g[0] === k);
}
const numV = (v: number) => numDec(v, 2);
const txtV = (v: number) => txtDec(v, 2);

export function sugerir(e: { escenario: string; jugador: number; angulo: number; activos?: string[]; objetivo?: string }): Sugerencia {
  const esc = buscar(e.escenario);
  const l = esc.lanzadores[e.jugador];
  if (!l) throw new Error('Jugador inválido.');
  const activos = activosDe(esc, e.activos);
  const cand = objetivosDelJugador(esc, e.jugador, activos);
  const k = e.objetivo !== undefined
    ? cand.find((q) => esc.objetivos[q].id === e.objetivo)
    : cand.reduce<number | undefined>((m, q) => {
        if (m === undefined) return q;
        const [a, b] = [esc.objetivos[q], esc.objetivos[m]];
        const da = Math.abs(centro(a)[0] - l.x), db = Math.abs(centro(b)[0] - l.x);
        return a.y < b.y || (a.y === b.y && da < db) ? q : m;
      }, undefined);
  if (k === undefined) return { objetivo: null, posible: false, angulo: e.angulo, rapidez: 0, mismo_angulo: true, pasos: [], aviso: 'Ya no quedan objetivos.' };
  const o = esc.objetivos[k];
  const [cx, cy] = centro(o);
  const d = l.lado * (cx - l.x);
  const th = clamp(e.angulo, A_MIN, A_MAX);
  const que = o.tipo === 'mango' ? 'el mango' : 'la lata de abajo';
  const pasos: Bloque[] = [
    bloque('1. ¿Dónde está el objetivo?', `Apuntamos al centro de ${que}: está a ${txt(d)} m de la hondilla en horizontal y a ${txt(cy)} m del suelo. La hondilla está a ${txt(l.y)} m de altura.`,
      [`d = ${num(d)}\\ \\text{m},\\quad y = ${num(cy)}\\ \\text{m},\\quad y_0 = ${num(l.y)}\\ \\text{m}`]),
    bloque('2. Ecuación de la trayectoria', 'Se despeja el tiempo del movimiento horizontal, t = d / (v₀ cos θ), y se sustituye en la altura:',
      ['y(d) = y_0 + d\\tan\\theta - \\dfrac{g\\,d^2}{2\\,v_0^2\\cos^2\\theta}']),
    bloque('3. Despejamos la rapidez', 'Ponemos el punto del objetivo y despejamos v₀:', ['v_0 = \\dfrac{d}{\\cos\\theta}\\sqrt{\\dfrac{g}{2\\,(y_0 + d\\tan\\theta - y)}}']),
  ];
  const formula = (a: number, v: number) =>
    `v_0 = \\dfrac{${num(d)}}{\\cos ${num(a)}^\\circ}\\sqrt{\\dfrac{${num(G)}}{2\\,(${num(l.y)} + ${num(d)}\\tan ${num(a)}^\\circ - ${par(cy)})}} = \\mathbf{${numV(v)}\\ m/s}`;
  const vMismo = rapidezPara(l, th, d, cy);
  if (vMismo !== null) pasos.push(bloque(`4. Sustituimos con tu ángulo θ = ${txt(th)}°`, '', [formula(th, vMismo)]));
  else pasos.push(bloque(`4. Con θ = ${txt(th)}° no hay solución`, 'La recta de lanzamiento y₀ + d·tan θ queda por debajo del objetivo, así que lo de adentro de la raíz es negativo: ninguna rapidez sirve. Subí el ángulo.', []));
  if (vMismo !== null && acierta(esc, l, th, vMismo, activos, k)) {
    return { objetivo: o.id, posible: true, angulo: th, rapidez: vMismo, mismo_angulo: true, pasos, aviso: null };
  }
  for (let p = 1; p <= 80; p++) {
    for (const a of [th + p, th - p]) {
      if (a < A_MIN || a > A_MAX) continue;
      const v = rapidezPara(l, a, d, cy);
      if (v === null || !acierta(esc, l, a, v, activos, k)) continue;
      const razon = vMismo !== null && vMismo > V_MAX ? `necesitaría ${txtV(vMismo)} m/s y la hondilla da máximo ${V_MAX} m/s`
        : vMismo !== null && vMismo < V_MIN ? `necesitaría solo ${txtV(vMismo)} m/s y la hondilla da mínimo ${V_MIN} m/s`
        : vMismo !== null ? 'la piedra choca con algo antes de llegar' : 'no hay rapidez que funcione';
      pasos.push(bloque(`5. Probamos con θ = ${txt(a)}°`, 'Con ese ángulo la trayectoria sí pasa sin chocar y llega al objetivo:', [formula(a, v)]));
      return { objetivo: o.id, posible: true, angulo: a, rapidez: v, mismo_angulo: false, pasos, aviso: `Con θ = ${txt(th)}° ${razon}. Con θ = ${txt(a)}° la rapidez necesaria es ${txtV(v)} m/s y sí llega.` };
    }
  }
  return { objetivo: o.id, posible: false, angulo: th, rapidez: 0, mismo_angulo: true, pasos, aviso: `Ningún ángulo entre ${A_MIN}° y ${A_MAX}° llega a ese objetivo con la rapidez de la hondilla.` };
}
