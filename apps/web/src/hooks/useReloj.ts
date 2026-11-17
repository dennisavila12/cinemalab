import { useCallback, useEffect, useRef, useState } from 'react';

const reducirMovimiento = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Reloj de animación: avanza t entre `desde` y `hasta` con requestAnimationFrame.
 * `velocidad` = segundos simulados por segundo real; 'auto' ajusta para que dure ~5 s.
 */
export function useReloj(desde: number, hasta: number, { auto = true, segundos = 5 } = {}) {
  const [t, setT] = useState(desde);
  const [corriendo, setCorriendo] = useState(false);
  const [velocidad, setVelocidad] = useState<'auto' | number>('auto');
  const ref = useRef({ t: desde, ultimo: 0, raf: 0 });

  const factor = velocidad === 'auto' ? Math.max(hasta - desde, 1e-6) / segundos : velocidad;

  const parar = useCallback(() => {
    cancelAnimationFrame(ref.current.raf);
    setCorriendo(false);
  }, []);

  const reproducir = useCallback(() => {
    if (hasta <= desde) return;
    if (ref.current.t >= hasta - 1e-9) ref.current.t = desde;
    ref.current.ultimo = performance.now();
    setCorriendo(true);
  }, [desde, hasta]);

  const ir = useCallback((nuevo: number) => {
    ref.current.t = Math.min(hasta, Math.max(desde, nuevo));
    setT(ref.current.t);
  }, [desde, hasta]);

  // Reiniciar cuando cambia el tramo
  useEffect(() => {
    ref.current.t = desde;
    setT(desde);
    if (auto && !reducirMovimiento && hasta > desde) {
      ref.current.ultimo = performance.now();
      setCorriendo(true);
    } else {
      setCorriendo(false);
      if (hasta <= desde) setT(hasta);
    }
  }, [desde, hasta, auto]);

  useEffect(() => {
    if (!corriendo) return;
    const paso = (ahora: number) => {
      const dt = Math.min((ahora - ref.current.ultimo) / 1000, 0.1);
      ref.current.ultimo = ahora;
      ref.current.t = Math.min(hasta, ref.current.t + dt * factor);
      setT(ref.current.t);
      if (ref.current.t >= hasta) {
        setCorriendo(false);
        return;
      }
      ref.current.raf = requestAnimationFrame(paso);
    };
    ref.current.raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(ref.current.raf);
  }, [corriendo, factor, hasta]);

  return { t, corriendo, reproducir, parar, ir, velocidad, setVelocidad, terminado: t >= hasta - 1e-9 };
}
