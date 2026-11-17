/** Narración por voz con la Web Speech API (si el navegador la tiene). */

export const vozDisponible = typeof window !== 'undefined' && 'speechSynthesis' in window;

function elegirVoz(): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices();
  const preferidas = ['es-SV', 'es-MX', 'es-US', 'es-419', 'es-ES'];
  for (const p of preferidas) {
    const v = voces.find((x) => x.lang.replace('_', '-').toLowerCase() === p.toLowerCase());
    if (v) return v;
  }
  return voces.find((x) => x.lang.toLowerCase().startsWith('es'));
}

/** Lee el texto en voz alta. Devuelve una promesa que se resuelve al terminar. */
export function narrar(texto: string): Promise<void> {
  if (!vozDisponible) return Promise.resolve();
  callar();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-MX';
    const v = elegirVoz();
    if (v) u.voice = v;
    u.rate = 1;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function callar() {
  if (vozDisponible) window.speechSynthesis.cancel();
}
