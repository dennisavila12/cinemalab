/** Copia en TypeScript de crates/fisica-core/src/solver.rs (solo para la demostración). */
import type { Paso, Solucion } from '@cinemalab/contratos';
import { num, txt } from './formato';
import { V, type Ecuacion, type Forma, type ModeloInterno, type Valores } from './tipos';

const TOLERANCIA = 0.01;

/** Igual que un BTreeMap de Rust: claves ordenadas. */
export const ordenar = <T>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

export function validar(m: ModeloInterno, datos: Valores): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const [id, x] of Object.entries(datos)) {
    const v = m.variables.find((q) => q.id === id);
    if (!v) { errores[id] = `La variable «${id}» no existe en este modelo.`; continue; }
    if (!Number.isFinite(x)) { errores[id] = 'Escribí un número válido.'; continue; }
    if (v.min !== undefined && ((v.estricto && x <= v.min) || (!v.estricto && x < v.min))) {
      errores[id] = v.estricto ? `Tiene que ser mayor que ${num(v.min)}.` : 'No puede ser negativo.';
      continue;
    }
    if (v.max !== undefined && x > v.max) errores[id] = `Tiene que estar entre ${num(v.min ?? 0)} y ${num(v.max)}.`;
  }
  return ordenar(errores);
}

function textoResultado(simbolo: string, valor: number, unidad: string) {
  const u = unidad === '°' ? '^\\circ' : unidad === '' ? '' : `\\ \\text{${unidad.replace('²', '}^2\\text{')}}`;
  return `${simbolo} = ${num(valor)}${u}`;
}

export function resolver(m: ModeloInterno, entrada: { datos: Valores; incognitas: string[] }): Solucion {
  const datos: Valores = { ...entrada.datos };
  for (const v of m.variables) {
    if (v.defecto !== undefined && !entrada.incognitas.includes(v.id) && !(v.id in datos)) datos[v.id] = v.defecto;
  }
  const errores = validar(m, datos);
  const incognitas = entrada.incognitas.filter((id) => m.variables.some((v) => v.id === id) && !(id in datos));
  const valores: Valores = { ...datos };
  const sol: Solucion = {
    modelo: m.id, dados: ordenar(datos), valores, incognitas: [...incognitas], pasos: [], faltantes: [], inconsistencias: [], avisos: [], errores,
  };
  if (Object.keys(errores).length) {
    sol.valores = ordenar(valores);
    return sol;
  }

  const fallidos = new Set<string>();
  const bloqueadas = new Set<string>();
  const conAviso = new Set<string>();
  for (let it = 0; it < 64; it++) {
    const vals = new V(valores);
    let mejor: [Ecuacion, Forma] | null = null;
    for (const ec of m.ecuaciones) {
      if (ec.cuando && !ec.cuando(vals)) continue;
      const desconocidas = ec.vars.filter((id) => !vals.tiene(id));
      if (desconocidas.length !== 1) continue;
      const v = desconocidas[0];
      if (bloqueadas.has(v) || fallidos.has(`${ec.id}:${v}`)) continue;
      const forma = ec.despejes.find((d) => d.var === v);
      if (forma && (!mejor || forma.prioridad < mejor[1].prioridad)) mejor = [ec, forma];
    }
    if (!mejor) break;
    const [ec, forma] = mejor;
    const variable = m.variables.find((v) => v.id === forma.var)!;
    const r = forma.f(vals);
    if (r.tipo === 'noaplica') { fallidos.add(`${ec.id}:${forma.var}`); continue; }
    if (r.tipo === 'imposible') {
      fallidos.add(`${ec.id}:${forma.var}`);
      if (!conAviso.has(forma.var)) {
        conAviso.add(forma.var);
        if (!sol.avisos.includes(r.mensaje)) sol.avisos.push(r.mensaje);
      }
      continue;
    }
    if (!Number.isFinite(r.valor)) { fallidos.add(`${ec.id}:${forma.var}`); continue; }
    if (variable.min !== undefined && r.valor < variable.min - 1e-9) {
      fallidos.add(`${ec.id}:${forma.var}`);
      const msg = `Al despejar ${variable.etiqueta.toLowerCase()} de la ecuación sale un valor negativo (${txt(r.valor)} ${variable.unidad}), que no tiene sentido físico. Revisá los datos.`;
      if (!sol.avisos.includes(msg)) sol.avisos.push(msg);
      if (forma.prioridad === 1) bloqueadas.add(forma.var);
      continue;
    }
    const valor = Math.abs(r.valor) < 1e-12 ? 0 : r.valor;
    valores[forma.var] = valor;
    const normal = (s: string) => s.replace(/ /g, '');
    const paso: Paso = {
      variable: forma.var, simbolo: variable.simbolo, etiqueta: variable.etiqueta, unidad: variable.unidad,
      ecuacion: ec.latex, despeje: normal(forma.latex) !== normal(ec.latex) ? forma.latex : null,
      sustitucion: r.sustitucion, valor, resultado: textoResultado(variable.simbolo, valor, variable.unidad),
      nota: r.nota, pedido: incognitas.includes(forma.var), necesario: true,
    };
    sol.pasos.push(paso);
  }

  if (incognitas.length) {
    const necesita = new Set(incognitas);
    for (let i = sol.pasos.length - 1; i >= 0; i--) {
      const p = sol.pasos[i];
      const req = necesita.has(p.variable);
      if (req) m.ecuaciones.find((e) => e.latex === p.ecuacion)!.vars.forEach((v) => necesita.add(v));
      p.necesario = req;
    }
  }
  sol.faltantes = m.variables.filter((v) => !(v.id in valores)).map((v) => v.id);
  const vals = new V(valores);
  for (const ec of m.ecuaciones) {
    if (ec.cuando && !ec.cuando(vals)) continue;
    if (ec.vars.some((id) => !vals.tiene(id))) continue;
    const [l, rr] = ec.residuo(vals);
    const escala = Math.max(Math.abs(l), Math.abs(rr), 1);
    if (Math.abs(l - rr) > TOLERANCIA * escala) sol.inconsistencias.push(ec.latex);
  }
  sol.valores = ordenar(valores);
  return sol;
}
