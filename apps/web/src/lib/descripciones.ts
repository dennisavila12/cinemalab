/** «¿Qué es esta fórmula?»: nombre y para qué sirve cada ecuación de los modelos. */
export interface Descripcion { nombre: string; para: string }

const DESCRIPCIONES: Record<string, Descripcion> = {
  // MRU
  'd = v\\,t': { nombre: 'Ecuación del MRU', para: 'Como la velocidad no cambia, la distancia recorrida es la velocidad por el tiempo. Sirve para hallar d, v o t si conocés las otras dos.' },
  // MRUA
  'v = v_0 + a\\,t': { nombre: 'Velocidad en el MRUA', para: 'La velocidad cambia lo mismo cada segundo: a la velocidad inicial se le suma la aceleración por el tiempo. Se usa cuando no te dan la distancia.' },
  'd = v_0\\,t + \\tfrac{1}{2}\\,a\\,t^2': { nombre: 'Distancia en el MRUA', para: 'Distancia recorrida con aceleración constante. Se usa cuando no te dan la velocidad final.' },
  'v^2 = v_0^2 + 2\\,a\\,d': { nombre: 'Ecuación sin tiempo (MRUA)', para: 'Relaciona las velocidades con la distancia sin necesitar el tiempo. Se usa cuando no te dan t ni te lo piden.' },
  'd = \\tfrac{1}{2}\\,(v_0 + v)\\,t': { nombre: 'Distancia con la velocidad promedio (MRUA)', para: 'La distancia es el promedio de la velocidad inicial y la final, por el tiempo. Se usa cuando no te dan la aceleración.' },
  // Tiro parabólico
  'v_{0x} = v_0\\cos\\theta': { nombre: 'Componente horizontal de la velocidad', para: 'La parte de la velocidad inicial que va hacia adelante. En x no hay aceleración: esta velocidad no cambia en todo el vuelo (MRU).' },
  'v_{0y} = v_0\\operatorname{sen}\\theta': { nombre: 'Componente vertical de la velocidad', para: 'La parte de la velocidad inicial que va hacia arriba. En y la gravedad la va frenando (MRUA con a = −g).' },
  'v_0 = \\sqrt{v_{0x}^2 + v_{0y}^2}': { nombre: 'Rapidez inicial a partir de sus componentes', para: 'Teorema de Pitágoras: junta la componente horizontal y la vertical para obtener la rapidez del lanzamiento.' },
  '\\tan\\theta = \\dfrac{v_{0y}}{v_{0x}}': { nombre: 'Ángulo de lanzamiento', para: 'La tangente del ángulo es la componente vertical entre la horizontal. Sirve para hallar θ si conocés las componentes.' },
  't_s = \\dfrac{v_{0y}}{g}': { nombre: 'Tiempo de subida', para: 'En el punto más alto la velocidad vertical es cero; este es el tiempo que tarda la gravedad en frenar v₀ᵧ.' },
  'h_{\\max} = h_0 + \\dfrac{v_{0y}^2}{2g}': { nombre: 'Altura máxima', para: 'La altura del punto más alto de la parábola, medida desde el suelo: la altura inicial más lo que sube.' },
  'h_0 + v_{0y}\\,t_v - \\tfrac{1}{2}\\,g\\,t_v^2 = 0': { nombre: 'Tiempo de vuelo', para: 'El objeto cae al suelo cuando su altura vuelve a ser cero. Al resolver esta ecuación cuadrática sale el tiempo total en el aire.' },
  'R = v_{0x}\\,t_v': { nombre: 'Alcance horizontal', para: 'En x es un MRU: la distancia horizontal total es la velocidad horizontal por el tiempo de vuelo.' },
  'R = \\dfrac{v_0^2\\operatorname{sen}(2\\theta)}{g}\\quad(h_0 = 0)': { nombre: 'Alcance cuando se lanza desde el suelo', para: 'Atajo que solo vale si el lanzamiento y la caída están a la misma altura (h₀ = 0). El alcance más grande sale con 45°.' },
};

export const descripcionDe = (latex: string): Descripcion | undefined => DESCRIPCIONES[latex];
export const ecuacionesConDescripcion = () => Object.keys(DESCRIPCIONES);
