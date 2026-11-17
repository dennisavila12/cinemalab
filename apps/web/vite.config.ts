import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Modo normal: la web llama a la API de Node.js (en desarrollo, Vite manda /api al puerto 3000).
// Modo demo (pnpm build:demo): un solo HTML con el motor dentro, que se abre con doble clic.
// En el HTML único solo se incrustan las fuentes .woff2 de KaTeX (todos los navegadores actuales las usan).
const soloWoff2: Plugin = {
  name: 'katex-solo-woff2',
  enforce: 'pre',
  transform(codigo, id) {
    if (!id.includes('katex') || !id.endsWith('.css')) return null;
    return codigo.replace(/,\s*url\([^)]+\.woff\)\s*format\("woff"\)/g, '').replace(/,\s*url\([^)]+\.ttf\)\s*format\("truetype"\)/g, '');
  },
};

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    plugins: [react(), ...(demo ? [soloWoff2, viteSingleFile()] : [])],
    server: {
      port: 5173,
      proxy: { '/api': 'http://localhost:3000' },
    },
    build: demo
      ? { outDir: 'dist-demo', assetsInlineLimit: 100_000_000, cssCodeSplit: false, sourcemap: false }
      : { outDir: 'dist', sourcemap: true },
  };
});
