// Panel de una medida del efecto del disfraz: barras con vs sin disfraz + diferencia con IC95%.
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Tip } from './Tooltip'
import { Sello } from './Sello'
import { Vacio } from './Estados'
import { EfectoEscalaIC } from './EfectoEscalaIC'
import { con, esNum, miles, MIN_N, tema } from '../theme'
import type { EfectoMedida } from '../types'
import { IcoAlerta } from './Iconos'

interface Props {
  titulo: string
  tip: string
  m: EfectoMedida
  valA: number | undefined
  valB: number | undefined
  unidad: string // 'pp' o 'yd'
  dec: number
}

export function EfectoPanel({ titulo, tip, m, valA, valB, unidad, dec }: Props) {
  const nA = m.n_a ?? 0, nB = m.n_b ?? 0
  const insuf = m.n === 0 || !esNum(m.est) || m.lo === null || m.hi === null || !esNum(valA) || !esNum(valB)
  if (m.n === 0) return <Vacio mensaje="Sin jugadas con lectura clara para medir el efecto" />
  if (insuf) {
    return (
      <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
        <h3 className="text-sm font-semibold"><Tip t={tip}>{titulo}</Tip></h3>
        <p className="mt-2 text-sm text-amber-300">n insuficiente: con disfraz n = {miles(nA)}, sin disfraz n = {miles(nB)} (mínimo {MIN_N} por grupo).</p>
      </section>
    )
  }
  const est = m.est as number, lo = m.lo as number, hi = m.hi as number
  const cruza = lo <= 0 && 0 <= hi
  const chico = nA < MIN_N || nB < MIN_N
  const datos = [
    { g: 'Con disfraz', v: valA as number, n: nA, c: tema.man },
    { g: 'Sin disfraz', v: valB as number, n: nB, c: tema.zone },
  ]
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-3" aria-label={titulo}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold"><Tip t={tip}>{titulo}</Tip></h3>
        {cruza ? <Sello nivel="no_concluyente" motivo="El IC95% incluye 0" /> : <Sello nivel={chico ? 'fragil' : 'solido'} />}
      </header>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div className="h-40" role="img" aria-label={`${titulo}: con disfraz ${valA?.toFixed(dec)} ${unidad}, sin disfraz ${valB?.toFixed(dec)} ${unidad}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="g" tick={{ fill: tema.textoSuave, fontSize: 11 }} axisLine={{ stroke: tema.borde }} tickLine={false} />
              <YAxis hide domain={[0, 'auto']} />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {datos.map((d) => <Cell key={d.g} fill={d.c} fillOpacity={d.n < MIN_N ? 0.4 : 1} />)}
                <LabelList dataKey="v" position="top" fill={tema.texto} fontSize={12}
                  formatter={(v: unknown) => (typeof v === 'number' ? `${v.toFixed(dec)}${unidad === 'pp' ? '%' : ''}` : '')} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col justify-center gap-1 text-xs text-slate-300">
          <div><Tip t="n">n</Tip> con disfraz: <b>{miles(nA)}</b></div>
          <div><Tip t="n" sinIcono>n</Tip> sin disfraz: <b>{miles(nB)}</b></div>
          <div className="mt-1 text-slate-400">Diferencia (con − sin):</div>
          <div className="text-base font-semibold text-slate-100">
            {con(est, dec)} {unidad} <span className="text-xs font-normal text-slate-400"><Tip t="ic95">IC95%</Tip> {con(lo, dec)} a {con(hi, dec)}</span>
          </div>
        </div>
      </div>
      <div className="mt-1"><EfectoEscalaIC est={est} lo={lo} hi={hi} unidad={unidad} etiqueta={titulo} /></div>
      {cruza ? (
        <p className="mt-1 text-xs text-slate-300"><Tip t="hallazgo_no_concluyente">No concluyente</Tip>: el IC95% de la diferencia incluye 0, así que estos datos no permiten afirmar que el disfraz cambie esta medida.</p>
      ) : (
        <p className="mt-1 text-xs text-amber-200">El IC95% excluye 0, pero es un análisis observacional: no es causalidad.</p>
      )}
      {chico && <p className="mt-1 text-xs text-amber-300" role="alert"><IcoAlerta /> Un grupo tiene n &lt; {MIN_N}: tómalo con cautela.</p>}
    </section>
  )
}
