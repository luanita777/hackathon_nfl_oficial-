// Descubrimiento (semanas 1-4) vs confirmación (5-8) y decisiones de publicación.
import { Tip } from './Tooltip'
import { esNum, miles, pct } from '../theme'
import type { Contraste, Validacion } from '../types'

type Conf = NonNullable<Validacion['confirmacion']>

function Tarjeta({ c }: { c: Contraste & { parte: string } }) {
  const ok = esNum(c.est) && c.lo !== null && c.hi !== null
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/60 p-2 text-xs">
      <div className="font-semibold capitalize text-slate-100">{c.parte}</div>
      {ok ? (
        <div className="mt-1 text-sm text-slate-100">
          Diferencia {pct(c.est as number)} (puntos de P(Man)) <span className="text-xs text-slate-400"><Tip t="ic95">IC95%</Tip> {pct(c.lo as number)} a {pct(c.hi as number)}</span>
        </div>
      ) : <div className="mt-1 text-amber-300">n insuficiente</div>}
      <div className="mt-1 text-slate-300"><Tip t="n">n</Tip> {miles(c.n)}: grupo A {miles(c.n_a ?? 0)} ({esNum(c.p_a) ? pct(c.p_a) : '—'}), grupo B {miles(c.n_b ?? 0)} ({esNum(c.p_b) ? pct(c.p_b) : '—'})</div>
      {(c.n_a ?? 0) < 30 || (c.n_b ?? 0) < 30 ? <div className="text-amber-300" role="alert">⚠ n &lt; 30 en un grupo</div> : null}
    </div>
  )
}

function Decision({ titulo, d }: { titulo: string; d: { publicado: boolean; razon: string | null } }) {
  return (
    <div className={`rounded-md border p-2 text-xs ${d.publicado ? 'border-emerald-600/50' : 'border-amber-500/60'}`}>
      <b className={d.publicado ? 'text-emerald-300' : 'text-amber-300'}>{d.publicado ? '✓ Publicado' : '⚠ No publicado'}</b>
      <span className="text-slate-200"> · {titulo}</span>
      {d.razon && <div className="mt-0.5 text-slate-300">{d.razon}</div>}
    </div>
  )
}

export function ValidacionConfirmacion({ c }: { c: Conf }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Tarjeta c={c.descubrimiento} />
        <Tarjeta c={c.confirmacion} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Decision titulo="decisión por paridad (par / impar)" d={c.decision_paridad} />
        <Decision titulo="decisión por mitades (1-4 / 5-8)" d={c.decision_mitades} />
      </div>
      {!c.se_sostiene && <p className="text-xs text-amber-300" role="alert">⚠ El hallazgo no se sostiene entre mitades.</p>}
    </div>
  )
}
