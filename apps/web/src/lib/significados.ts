/**
 * «¿Qué significa cada letra?»: encuentra los símbolos que aparecen en una fórmula LaTeX
 * y devuelve su significado, para mostrarlo debajo de la fórmula.
 */
export interface Significado { simbolo: string; texto: string }
interface VariableModelo { simbolo: string; etiqueta: string; unidad: string }

/** Significados generales (se usan si el modelo no trae su propia etiqueta). */
const GLOSARIO: Record<string, string> = {
  'v_{0x}': 'componente horizontal de la velocidad inicial (m/s)',
  'v_{0y}': 'componente vertical de la velocidad inicial (m/s)',
  'h_{\\max}': 'altura máxima (m)',
  'v_x': 'velocidad horizontal (m/s)',
  'v_y': 'velocidad vertical (m/s)',
  'v_0': 'velocidad inicial (m/s)',
  'x_0': 'posición inicial (m)',
  'y_0': 'altura desde donde se lanza (m)',
  'h_0': 'altura inicial (m)',
  't_s': 'tiempo de subida (s)',
  't_v': 'tiempo de vuelo (s)',
  '\\theta': 'ángulo de lanzamiento (°)',
  v: 'velocidad (m/s)',
  a: 'aceleración (m/s²)',
  t: 'tiempo (s)',
  d: 'distancia (m)',
  g: 'gravedad (9.81 m/s²)',
  R: 'alcance horizontal (m)',
  x: 'posición horizontal (m)',
  y: 'altura (m)',
};

const unidadLegible = (u: string) => (u === '°' ? '°' : u);

export function significados(tex: string | string[], variables: VariableModelo[] = []): Significado[] {
  const propios = new Map(variables.map((v) => [v.simbolo, `${v.etiqueta.charAt(0).toLowerCase()}${v.etiqueta.slice(1)} (${unidadLegible(v.unidad)})`]));
  const claves = [...new Set([...propios.keys(), ...Object.keys(GLOSARIO)])];
  const compuestas = claves.filter((k) => k.length > 1).sort((a, b) => b.length - a.length);
  const simples = claves.filter((k) => k.length === 1);
  const hallados = new Map<string, number>();
  const textos = Array.isArray(tex) ? tex : [tex];

  textos.forEach((original, n) => {
    let s = original;
    const base = n * 100000;
    const tapar = (i: number, largo: number) => { s = s.slice(0, i) + ' '.repeat(largo) + s.slice(i + largo); };
    for (const k of compuestas) {
      let i = s.indexOf(k);
      while (i >= 0) {
        if (!hallados.has(k)) hallados.set(k, base + i);
        tapar(i, k.length);
        i = s.indexOf(k);
      }
    }
    // Fuera comandos (\dfrac, \cos, \text{m/s}…) para que sus letras no cuenten
    s = s.replace(/\\text\{[^}]*\}|\\operatorname\{[^}]*\}|\\[a-zA-Z]+/g, (m) => ' '.repeat(m.length));
    for (const k of simples) {
      const re = new RegExp(`(^|[^A-Za-z])${k}(?![A-Za-z])`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(s))) {
        const i = m.index + m[1].length;
        if (!hallados.has(k) || hallados.get(k)! > base + i) hallados.set(k, Math.min(hallados.get(k) ?? Infinity, base + i));
      }
    }
  });

  return [...hallados.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => ({ simbolo: k, texto: propios.get(k) ?? GLOSARIO[k] }))
    .filter((x) => x.texto);
}
