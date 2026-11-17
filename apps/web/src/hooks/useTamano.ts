import { useEffect, useState, type RefObject } from 'react';

/** Se vuelve a renderizar cuando cambia el tamaño del elemento (para redibujar lienzos). */
export function useTamano(ref: RefObject<HTMLElement | null>) {
  const [tam, setTam] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTam({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return tam;
}
