// Panel lateral con el detalle de la celda seleccionada. Esc o el botón cierran.
import { useEffect } from 'react'
import type { FilaTell, TramoCb } from '../types'
import { TRAMO_TXT, lecturaDe } from '../lib/lectura'
import { MIN_N, esNum, pct } from '../theme'
import { Tip } from './Tooltip'
import { Pizarra } from './Pizarra'
import { Semaforo } from './Semaforo'

const ESQUEMAS = ['Cover-0', 'Cover-1', '2-Man', 'Cover-2', 'Cover-3', 'Quarters', 'Cover-6']
const NO_DISP = 'No disponible en la API por alineación'
const LECT = { man: 'Parece Man', zone: 'Parece Zone', ambigua: 'Ambigua', insuficiente: 'n insuficiente' } as const

interface Props { tramo: TramoCb; safeties: number; fila?: FilaTell; onCerrar: () => void }

export function PanelCelda({ tramo, safeties, fila, onCerrar }: Props) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [onCerrar])

  const n = fila?.n ?? 0
  const ok = !!fila && esNum(fila.est) && n >= MIN_N
  const lect = fila ? lecturaDe(fila) : 'insuficiente'
  return (
    <aside aria-label="Detalle de la celda" className="rounded-lg border border-slate-600 bg-slate-800/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold">
          <Tip t="alineacion">CB {TRAMO_TXT[tramo]} · {safeties} safeties</Tip>
        </h3>
        <button type="button" onClick={onCerrar} aria-label="Cerrar detalle"
          className="rounded border border-slate-500 px-2 text-xs text-slate-300 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">✕ Cerrar</button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-slate-400"><Tip t="p_man">P(Man)</Tip></div>
          {ok && fila && esNum(fila.est) ? (
            <div className="text-lg font-bold">{pct(fila.est)}
              <span className="block text-[11px] font-normal text-slate-300">
                <Tip t="wilson">IC95%</Tip> {fila.lo !== null && fila.hi !== null ? `${pct(fila.lo)} a ${pct(fila.hi)}` : 'no disponible'}
              </span>
            </div>
          ) : <div className="text-slate-300">n insuficiente (sin cifra)</div>}
        </div>
        <div>
          <div className="text-slate-400"><Tip t="n">n</Tip> y lectura</div>
          <div className="text-lg font-bold">{n}</div>
          <div className="text-[11px] text-slate-300">{LECT[lect]}</div>
        </div>
      </div>
      {n < MIN_N ? <p className="mt-1 text-[11px] text-amber-300">⚠ n &lt; {MIN_N}: no hay conclusión para esta alineación.</p> : null}

      <div className="mt-2 flex items-start gap-3">
        <div className="shrink-0"><Pizarra tramo={tramo} safeties={safeties} /></div>
        <div className="min-w-0 text-xs">
          <div className="mb-1 text-slate-400"><Tip t="semaforo">Semáforo</Tip></div>
          {fila ? <Semaforo fila={fila} /> : <span className="text-slate-300">Sin jugadas en esta alineación (n 0)</span>}
        </div>
      </div>

      <div className="mt-2 space-y-2 border-t border-slate-700 pt-2 text-xs">
        <section>
          <h4 className="font-semibold text-slate-200"><Tip t="disfraz">Veces que la defensa jugó lo contrario (disfraz)</Tip></h4>
          <p className="text-slate-400">{NO_DISP}</p>
        </section>
        <section>
          <h4 className="font-semibold text-slate-200">Efecto en <Tip t="completos">% de completos</Tip> y <Tip t="yardas_jugada">yardas por jugada</Tip></h4>
          <p className="text-slate-400">{NO_DISP}. El efecto global está en la pestaña 3 (Efecto).</p>
        </section>
        <section>
          <h4 className="font-semibold text-slate-200"><Tip t="esquema">Desglose por esquema</Tip> ({ESQUEMAS.join(', ')})</h4>
          <p className="text-slate-400">{NO_DISP}.</p>
        </section>
      </div>
    </aside>
  )
}
