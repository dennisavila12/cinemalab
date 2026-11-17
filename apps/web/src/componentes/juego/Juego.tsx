import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { Escenario, ModoJuego, ResultadoTiro, Sugerencia } from '@cinemalab/contratos';
import { api } from '../../api/cliente';
import { fmt } from '../../lib/formato';
import { puntoEn } from '../../lib/interpolar';
import { prepararLienzo } from '../../lib/lienzo';
import { useTamano } from '../../hooks/useTamano';
import { Pestanas } from '../comunes/Pestanas';
import { calcularVista, dibujarJuego, type Caida, type Vista } from './dibujoJuego';
import { PanelTiro } from './PanelTiro';

const MODOS: { id: ModoJuego; texto: string }[] = [
  { id: 'latas', texto: 'Botá las latas' },
  { id: 'mangos', texto: 'Bajá mangos' },
  { id: 'duelo', texto: 'Hondillazos entre amigos' },
];

interface Punteria { angulo: number; rapidez: number }
interface CaidaFisica extends Caida { vx: number; vy: number; vr: number; tipo: 'lata' | 'mango'; y0: number; T: number; inicio: number; listo: boolean }
interface Vuelo { res: ResultadoTiro; inicio: number; jugador: number; ultimo: number }

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** "La hondilla": juego de tiro parabólico con escenarios salvadoreños. Toda la física la calcula el motor en Rust. */
export function Juego() {
  const [escenarios, setEscenarios] = useState<Escenario[]>();
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<ModoJuego>('latas');
  const [escId, setEscId] = useState('latas-1');
  const [activos, setActivos] = useState<string[]>([]);
  const [turno, setTurno] = useState(0);
  const [tiros, setTiros] = useState([0, 0]);
  const [punteria, setPunteria] = useState<Punteria[]>([{ angulo: 45, rapidez: 18 }, { angulo: 45, rapidez: 18 }]);
  const [resultado, setResultado] = useState<{ res: ResultadoTiro; jugador: number } | null>(null);
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const [volando, setVolando] = useState(false);
  const [rayosX, setRayosX] = useState(false);

  const lienzo = useRef<HTMLCanvasElement>(null);
  const tam = useTamano(lienzo);
  const vista = useRef<Vista | null>(null);
  const vuelo = useRef<Vuelo | null>(null);
  const caidas = useRef(new Map<string, CaidaFisica>());
  const rastros = useRef<{ puntos: [number, number, number][]; jugador: number }[]>([]);
  const arrastre = useRef(false);

  const esc = escenarios?.find((e) => e.id === escId);
  const delModo = useMemo(() => escenarios?.filter((e) => e.modo === modo) ?? [], [escenarios, modo]);

  useEffect(() => {
    api.escenarios().then(setEscenarios).catch((e: Error) => setError(e.message));
  }, []);

  const reiniciar = useCallback((e: Escenario) => {
    setActivos(e.objetivos.map((o) => o.id));
    setTurno(0);
    setTiros([0, 0]);
    setResultado(null);
    caidas.current.clear();
    rastros.current = [];
    vuelo.current = null;
    setVolando(false);
  }, []);

  useEffect(() => {
    if (esc) reiniciar(esc);
  }, [esc, reiniciar]);

  // ¿Quién ganó? / ¿Se completó el nivel?
  const enPie = (j: number) => (esc ? esc.objetivos.filter((o) => activos.includes(o.id) && o.dueno === j).length : 0);
  const ganador = esc?.modo === 'duelo' ? (enPie(1) === 0 ? 0 : enPie(0) === 0 ? 1 : null) : null;
  const completo = !!esc && esc.modo !== 'duelo' && activos.length === 0 && esc.objetivos.length > 0 && tiros[0] > 0;
  const terminado = completo || ganador !== null;
  const minimo = esc?.modo === 'mangos' ? esc.objetivos.length : 1;
  const estrellas = tiros[0] <= minimo ? 3 : tiros[0] <= minimo + 1 ? 2 : 1;

  // Tiro perfecto para el jugador de turno (se recalcula al cambiar el ángulo)
  const anguloTurno = punteria[turno].angulo;
  useEffect(() => {
    if (!esc || volando || terminado || !activos.length) return setSugerencia(null);
    const id = setTimeout(() => {
      api.sugerencia({ escenario: esc.id, jugador: turno, angulo: anguloTurno, activos }).then(setSugerencia).catch(() => setSugerencia(null));
    }, 250);
    return () => clearTimeout(id);
  }, [esc, turno, anguloTurno, activos, volando, terminado]);

  // ------------------------------------------------------------ Dibujo
  const pintar = useCallback(
    (ahora = performance.now()) => {
      const c = lienzo.current;
      if (!c || !esc) return;
      const { ctx, w, h } = prepararLienzo(c);
      const v = calcularVista(esc, w, h);
      vista.current = v;
      const vu = vuelo.current;
      let piedra;
      if (vu) {
        const t = (ahora - vu.inicio) / 1000;
        const [x, y] = puntoEn(vu.res.trayectoria, Math.min(t, vu.res.fin.t));
        piedra = { x, y, vuelo: vu.res.trayectoria, t };
      }
      dibujarJuego(ctx, esc, v, {
        activos: new Set(activos),
        caidas: caidas.current,
        rastros: rastros.current,
        piedra,
        apuntar: !vu && !terminado ? { jugador: turno, ...punteria[turno] } : undefined,
        rayosX,
        turno,
        mensaje: completo ? `¡Nivel superado! ${'★'.repeat(estrellas)}${'☆'.repeat(3 - estrellas)}` : ganador !== null ? `¡Ganó el ${esc.lanzadores[ganador].nombre}!` : undefined,
      });
    },
    [esc, activos, turno, punteria, rayosX, completo, ganador, terminado, estrellas],
  );

  useEffect(() => {
    if (!vuelo.current) pintar();
  }, [pintar, tam]);

  // ------------------------------------------------------------ Lanzar y animar
  const terminarTiro = useCallback(() => {
    const vu = vuelo.current;
    if (!vu || !esc) return;
    vuelo.current = null;
    rastros.current = [...rastros.current.slice(-2), { puntos: vu.res.trayectoria, jugador: vu.jugador }];
    for (const c of caidas.current.values()) c.alfa = 0.4;
    const caen = new Set(vu.res.derribados);
    setActivos((a) => a.filter((id) => !caen.has(id)));
    setTiros((t) => t.map((n, j) => (j === vu.jugador ? n + 1 : n)));
    setResultado({ res: vu.res, jugador: vu.jugador });
    if (esc.modo === 'duelo') setTurno(1 - vu.jugador);
    setVolando(false);
  }, [esc]);

  const animar = useCallback(
    (ahora: number) => {
      const vu = vuelo.current;
      if (!vu || !esc) return;
      const t = (ahora - vu.inicio) / 1000;
      const dt = Math.min((ahora - vu.ultimo) / 1000, 0.05);
      vu.ultimo = ahora;
      // Empiezan a caer los objetivos golpeados (y las latas que estaban encima)
      const primero = vu.res.impactos[0]?.t ?? Infinity;
      for (const id of vu.res.derribados) {
        if (caidas.current.has(id)) continue;
        const imp = vu.res.impactos.find((i) => i.id === id);
        if (t < (imp?.t ?? primero)) continue;
        const o = esc.objetivos.find((x) => x.id === id)!;
        const lado = esc.lanzadores[vu.jugador].lado;
        caidas.current.set(id, {
          x: o.x + o.w / 2, y: o.y + o.h / 2, rot: 0, alfa: 1, tipo: o.tipo,
          vx: o.tipo === 'lata' ? lado * (2 + Math.random() * 2) : 0, vy: 2 + Math.random() * 2, vr: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3),
          y0: o.y + o.h / 2, T: imp?.caida?.tiempo ?? 1, inicio: t, listo: false,
        });
      }
      let moviendo = false;
      for (const c of caidas.current.values()) {
        if (c.listo) continue;
        if (c.tipo === 'mango') {
          // Caída libre: el tiempo total T lo calculó el motor (t = √(2h/g))
          const k = Math.min(1, (t - c.inicio) / c.T);
          c.y = c.y0 - (c.y0 - 0.35) * k * k;
          c.rot += dt * 2;
          if (k >= 1) c.listo = true;
        } else {
          c.vy -= 9.81 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.rot += c.vr * dt;
          if (c.y <= 0.45) { c.y = 0.45; c.listo = true; }
        }
        moviendo ||= !c.listo;
      }
      pintar(ahora);
      if (t > vu.res.fin.t + 0.35 && !moviendo) return terminarTiro();
      requestAnimationFrame(animar);
    },
    [esc, pintar, terminarTiro],
  );

  const lanzar = async () => {
    if (!esc || volando || terminado) return;
    const j = turno;
    setVolando(true);
    setError(undefined);
    try {
      const res = await api.tiro({ escenario: esc.id, jugador: j, ...punteria[j], activos, numero: tiros[j] + 1 });
      const ahora = performance.now();
      vuelo.current = { res, inicio: ahora, jugador: j, ultimo: ahora };
      requestAnimationFrame(animar);
    } catch (e) {
      setError((e as Error).message);
      setVolando(false);
    }
  };

  const apuntar = (p: Partial<Punteria>) =>
    setPunteria((ps) => ps.map((q, j) => (j === turno ? { angulo: limitar(p.angulo ?? q.angulo, 5, 85), rapidez: limitar(p.rapidez ?? q.rapidez, 5, 35) } : q)));

  // ------------------------------------------------------------ Apuntar arrastrando
  const posicion = (e: PointerEvent) => {
    const r = lienzo.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const alPresionar = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!esc || !vista.current || volando || terminado) return;
    const l = esc.lanzadores[turno];
    const p = posicion(e);
    if (Math.hypot(p.x - vista.current.X(l.x), p.y - vista.current.Y(l.y)) > 90) return;
    arrastre.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const alMover = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!arrastre.current || !esc || !vista.current) return;
    const l = esc.lanzadores[turno];
    const p = posicion(e);
    const dx = (vista.current.X(l.x) - p.x) * l.lado;
    const dy = p.y - vista.current.Y(l.y);
    const largo = Math.hypot(dx, dy);
    if (largo < 6) return;
    apuntar({ angulo: Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) * 2) / 2, rapidez: Math.round((5 + limitar((largo - 10) / 58, 0, 1) * 30) * 10) / 10 });
  };
  const alSoltar = () => {
    if (!arrastre.current) return;
    arrastre.current = false;
    void lanzar();
  };

  if (error && !escenarios) return <div className="aviso error">{error}</div>;
  if (!esc) return <div className="cargando">Cargando el juego…</div>;

  const p = punteria[turno];
  const quien = esc.modo === 'duelo' && resultado ? esc.lanzadores[resultado.jugador].nombre : undefined;
  const intro =
    esc.modo === 'duelo'
      ? 'Por turnos, cada jugador apunta a las latas del otro. Las latas azules son del Jugador 1 y las anaranjadas del Jugador 2. Gana quien bote primero todas las del rival.'
      : esc.modo === 'mangos'
        ? 'Tirale piedritas al palo para bajar los mangos. Cuando le das a uno, cae en caída libre: mirá cuánto tarda en llegar al suelo.'
        : 'Arrastrá la piedra hacia atrás y soltala, o usá los controles. La piedra sigue la parábola: MRU en x y MRUA en y.';

  return (
    <section className="tarjeta juego" aria-labelledby="titulo-juego">
      <header className="tarjeta-cabeza envolver">
        <div>
          <h2 id="titulo-juego">La hondilla</h2>
          <p className="subtitulo">{esc.nombre}: {esc.descripcion}</p>
        </div>
        <Pestanas etiqueta="Modo de juego" variante="segmento" valor={modo} onCambio={(m) => { setModo(m); setEscId(`${m}-1`); }} opciones={MODOS} />
      </header>

      <div className="niveles" role="group" aria-label="Niveles">
        {delModo.map((e) => (
          <button key={e.id} type="button" className="nivel" aria-pressed={e.id === esc.id} onClick={() => !volando && setEscId(e.id)} title={e.nombre}>
            {e.numero}. {e.nombre}
          </button>
        ))}
      </div>

      {esc.modo === 'duelo' && (
        <div className="marcador">
          {esc.lanzadores.map((l, j) => (
            <div key={j} className={`jugador j${j}${turno === j && !terminado ? ' turno' : ''}`}>
              <strong>{l.nombre}</strong> · latas en pie: {enPie(j)} · tiros: {tiros[j]}
              {turno === j && !terminado && <span className="insignia">Te toca</span>}
            </div>
          ))}
        </div>
      )}

      <canvas
        ref={lienzo}
        className="lienzo-juego"
        role="img"
        aria-label={`Juego de la hondilla: ${esc.nombre}`}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={() => (arrastre.current = false)}
      />

      <div className="controles-juego">
        <div className="deslizador">
          <label htmlFor="g-angulo">Ángulo θ</label>
          <input id="g-angulo" type="range" min={5} max={85} step={0.5} value={p.angulo} onChange={(e) => apuntar({ angulo: Number(e.target.value) })} disabled={volando || terminado} />
          <span className="numero">
            <input type="number" min={5} max={85} step={0.5} value={Number(p.angulo.toFixed(2))} onChange={(e) => apuntar({ angulo: Number(e.target.value) })} aria-label="Ángulo en grados" disabled={volando || terminado} />°
          </span>
        </div>
        <div className="deslizador">
          <label htmlFor="g-rapidez">Rapidez v₀</label>
          <input id="g-rapidez" type="range" min={5} max={35} step={0.1} value={p.rapidez} onChange={(e) => apuntar({ rapidez: Number(e.target.value) })} disabled={volando || terminado} />
          <span className="numero">
            <input type="number" min={5} max={35} step={0.1} value={Number(p.rapidez.toFixed(2))} onChange={(e) => apuntar({ rapidez: Number(e.target.value) })} aria-label="Rapidez en metros por segundo" disabled={volando || terminado} />m/s
          </span>
        </div>
        <div className="acciones-juego">
          <button type="button" className="boton primario" onClick={lanzar} disabled={volando || terminado}>
            {volando ? 'Volando…' : esc.modo === 'duelo' ? `Lanzar (${esc.lanzadores[turno].nombre})` : 'Lanzar piedra'}
          </button>
          <button type="button" className="boton fantasma" onClick={() => reiniciar(esc)} disabled={volando}>{ganador !== null ? 'Revancha' : 'Reiniciar nivel'}</button>
          {completo && delModo.some((e) => e.numero === esc.numero + 1) && (
            <button type="button" className="boton secundario" onClick={() => setEscId(`${modo}-${esc.numero + 1}`)}>Siguiente nivel →</button>
          )}
          <label className="casilla" title="Muestra la sombra de la piedra en cada eje">
            <input type="checkbox" checked={rayosX} onChange={(e) => setRayosX(e.target.checked)} /> Rayos X (sombras en x e y)
          </label>
        </div>
      </div>
      {error && <div className="aviso error">{error}</div>}
      <p className="pista">Tiros: {esc.modo === 'duelo' ? `${tiros[0]} + ${tiros[1]}` : tiros[0]} · Ángulo {fmt(p.angulo, 1)}° · Rapidez {fmt(p.rapidez, 1)} m/s</p>

      <PanelTiro resultado={resultado?.res ?? null} quien={quien} sugerencia={sugerencia} intro={intro} onProbar={(angulo, rapidez) => apuntar({ angulo, rapidez })} />
    </section>
  );
}
