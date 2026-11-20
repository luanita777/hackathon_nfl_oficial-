// Simulador: elige tramo de CB y safeties y muestra la celda servida por /api/tell.
import { useId, useMemo, useState } from 'react'
import type { FilaTell, TramoCb } from '../types'
import { TRAMOS, TRAMO_TXT, SAFETIES } from '../lib/lectura'
import { esNum, pct, miles, MIN_N } from '../theme'
import { Tip } from './Tooltip'
import { Pizarra } from './Pizarra'
import { Semaforo } from './Semaforo'
import { IcoAlerta } from './Iconos'

type Celda = FilaTell & { tramo_cb: TramoCb; safeties_prof: 0 | 1 | 2 | 3 }

/** Busca la fila exacta; si no existe, la más próxima (mismo safeties si hay; si no, menor distancia). */
function buscar(filas: Celda[], tramo: TramoCb, s: number): { fila: Celda | null; exacta: boolean } {
  const ex = filas.find((f) => f.tramo_cb === tramo && f.safeties_prof === s)
  if (ex) return { fila: ex, exacta: true }
  const it = TRAMOS.indexOf(tramo)
  const dist = (f: Celda) => Math.abs(TRAMOS.indexOf(f.tramo_cb) - it)
  const mismos = filas.filter((f) => f.safeties_prof === s)
  const pool = mismos.length ? mismos : filas
  let mejor: Celda | null = null, md = Infinity
  for (const f of pool) {
    const d = dist(f) + (mismos.length ? 0 : Math.abs(f.safeties_prof - s) * 10)
    if (d < md) { md = d; mejor = f }
  }
  return { fila: mejor, exacta: false }
}

export function Simulador({ filas }: { filas: FilaTell[] }) {
  const idT = useId(), idS = useId()
  const [tramo, setTramo] = useState<TramoCb>('4-6')
  const [saf, setSaf] = useState<number>(2)
  const celdas = useMemo(
    () => filas.filter((f): f is Celda => f.tramo_cb !== null && f.safeties_prof !== null && f.n > 0),
    [filas],
  )
  const { fila, exacta } = useMemo(() => buscar(celdas, tramo, saf), [celdas, tramo, saf])
  const campo = 'rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100 transition-colors duration-150 hover:border-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'

  if (!celdas.length) return <p className="text-sm text-slate-400">Sin celdas con datos para simular con estos filtros.</p>

  return (
    <section aria-label="Simulador de alineación" className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
      <div className="mb-3 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={idT} className="text-xs text-slate-300"><Tip t="cb">Profundidad de los CB</Tip></label>
          <select id={idT} className={campo} value={tramo} onChange={(e) => setTramo(e.target.value as TramoCb)}>
            {TRAMOS.map((t) => <option key={t} value={t}>{TRAMO_TXT[t]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={idS} className="text-xs text-slate-300">
            <Tip t="safety">Safeties profundos</Tip>: <b>{saf}</b>
          </label>
          <input id={idS} type="range" min={0} max={3} step={1} value={saf} onChange={(e) => setSaf(Number(e.target.value))}
            aria-valuetext={`${saf} safeties`} className="w-40 accent-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400" />
          <div className="flex w-40 justify-between text-[10px] text-slate-500" aria-hidden>{SAFETIES.map((s) => <span key={s}>{s}</span>)}</div>
        </div>
      </div>

      {fila ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Pizarra tramo={fila.tramo_cb} safeties={fila.safeties_prof} />
          <div className="space-y-3 transition-opacity duration-200">
            {!exacta && (
              <p role="status" className="rounded border border-amber-500/50 bg-amber-950/30 p-2 text-xs text-amber-200">
                Celda más cercana con datos: CB {TRAMO_TXT[fila.tramo_cb]}, {fila.safeties_prof} safeties (no hay fila para la combinación elegida).
              </p>
            )}
            <div className="text-sm text-slate-200">
              <Tip t="p_man">P(Man)</Tip>:{' '}
              {esNum(fila.est) && fila.lo !== null && fila.hi !== null
                ? <b>{pct(fila.est)} (IC95% {pct(fila.lo)}–{pct(fila.hi)})</b>
                : <b>n insuficiente</b>}
              <span className="text-slate-400"> · <Tip t="n">n</Tip> = {miles(fila.n)}</span>
            </div>
            {fila.n < MIN_N && <p className="text-xs text-amber-300"><IcoAlerta /> n &lt; {MIN_N}: no hay lectura confiable.</p>}
            <Semaforo fila={fila} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
