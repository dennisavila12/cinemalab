import type { Estado } from '@cinemalab/contratos';
import { fmt } from '../../lib/formato';

/** Valores instantáneos del móvil. */
export function Lecturas({ estado, plano }: { estado: Estado; plano: boolean }) {
  const items: [string, number, string][] = plano
    ? [['t', estado.t, 's'], ['x', estado.x, 'm'], ['y', estado.y, 'm'], ['vₓ', estado.vx, 'm/s'], ['vᵧ', estado.vy, 'm/s'], ['|v|', Math.hypot(estado.vx, estado.vy), 'm/s']]
    : [['t', estado.t, 's'], ['x', estado.x, 'm'], ['v', estado.vx, 'm/s'], ['a', estado.ax, 'm/s²']];
  return (
    <dl className="lecturas">
      {items.map(([k, v, u]) => (
        <div key={k}>
          <dt>{k} ({u})</dt>
          <dd>{fmt(v, 2)}</dd>
        </div>
      ))}
    </dl>
  );
}
