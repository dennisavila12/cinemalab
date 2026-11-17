import katex from 'katex';
import { memo, useMemo } from 'react';

/** Fórmula en LaTeX renderizada con KaTeX. */
export const Formula = memo(function Formula({ tex, bloque = false, className }: { tex: string; bloque?: boolean; className?: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: bloque, throwOnError: false, strict: false, output: 'html' }),
    [tex, bloque],
  );
  return <span className={className ?? (bloque ? 'formula-bloque' : 'formula')} dangerouslySetInnerHTML={{ __html: html }} />;
});

/** Texto con fórmulas en línea entre signos $…$ */
export function TextoConFormulas({ texto }: { texto: string }) {
  const partes = texto.split(/(\$[^$]+\$)/g);
  return (
    <>
      {partes.map((p, i) => (p.startsWith('$') && p.endsWith('$') ? <Formula key={i} tex={p.slice(1, -1)} /> : <span key={i}>{p}</span>))}
    </>
  );
}
