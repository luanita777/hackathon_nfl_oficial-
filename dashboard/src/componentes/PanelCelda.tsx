// Detalle de la celda elegida, en lenguaje sencillo. Esc o el botón cierran.
import { useEffect } from 'react'
import type { FilaTell, TramoCb } from '../types'
import { TRAMO_TXT, lecturaDe } from '../lib/lectura'
import { MIN_N, esNum, pct } from '../theme'
import { Pizarra } from './Pizarra'
import { Pictograma } from './Pictograma'
import { Semaforo } from './Semaforo'
import { IcoAlerta, IcoX } from './Iconos'

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
  const titulo = lect === 'man' ? 'Suele ser Man' : lect === 'zone' ? 'Suele ser Zone' : lect === 'ambigua' ? 'Mixto: difícil de leer' : 'Pocas jugadas'
  return (
    <aside aria-label="Detalle del acomodo elegido" className="aparece rounded-xl border border-slate-600 bg-slate-800/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Acomodo elegido</div>
          <h3 className="text-sm font-bold">Esquineros a {TRAMO_TXT[tramo]} · {safeties} safeties al fondo</h3>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar detalle"
          className="rounded border border-slate-500 px-2 text-xs text-slate-300 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"><IcoX /></button>
      </div>
      <div className="mt-2 text-lg font-extrabold">{titulo}</div>
      {ok && fila && esNum(fila.est) ? (
        <div className="mt-1 space-y-1">
          <Pictograma p={fila.est} color="#f59e0b" etiqueta="jugadas que fueron Man" />
          <p className="text-xs text-slate-300">Man en {pct(fila.est, 0)}{fila.lo !== null && fila.hi !== null ? ` (margen de error: ${pct(fila.lo, 0)} a ${pct(fila.hi, 0)})` : ''}; el resto fue Zone. Basado en {n} jugadas.</p>
        </div>
      ) : <p className="mt-1 text-xs text-amber-300"><IcoAlerta /> Solo {n} jugadas con este acomodo (menos de {MIN_N}): no hay conclusión.</p>}
      <div className="mt-2 flex items-start gap-3">
        <div className="w-40 shrink-0"><Pizarra tramo={tramo} safeties={safeties} /></div>
        <div className="min-w-0 flex-1 text-xs">{fila ? <Semaforo fila={fila} /> : <span className="text-slate-300">Sin jugadas con este acomodo.</span>}</div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">El disfraz y el desglose por tipo de cobertura por acomodo no están disponibles en la API.</p>
    </aside>
  )
}
