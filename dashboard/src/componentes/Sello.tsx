// Sello de confianza visible en cada gráfica (exigido por equipo.md).
export type NivelSello = 'solido' | 'fragil' | 'no_concluyente'
import { IcoAlerta, IcoAprox, IcoCheck } from './Iconos'
const E = {
  solido: { t: 'Sólido', i: <IcoCheck tam={12} />, c: 'border-emerald-500/60 text-emerald-300' },
  fragil: { t: 'Frágil', i: <IcoAlerta tam={12} />, c: 'border-amber-500/60 text-amber-300' },
  no_concluyente: { t: 'No concluyente', i: <IcoAprox tam={12} />, c: 'border-slate-500 text-slate-300' },
} as const
export function Sello({ nivel, motivo }: { nivel: NivelSello; motivo?: string }) {
  const e = E[nivel]
  return <span title={motivo} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${e.c}`}><span aria-hidden className="inline-flex">{e.i}</span>{e.t}{motivo ? <span className="sr-only"> ({motivo})</span> : null}</span>
}
/** Regla fija: IC cruza 0 → no concluyente; n < 30 o una mitad no coincide → frágil; si no, sólido. */
export function nivelSello(o: { n: number; sostiene?: boolean; cruzaCero?: boolean }): NivelSello {
  if (o.cruzaCero) return 'no_concluyente'
  if (o.n < 30 || o.sostiene === false) return 'fragil'
  return 'solido'
}
