// Mapa de calor: tramo de CB (filas) × safeties profundos (columnas). Datos de /api/tell.
import { useRef, useState, type KeyboardEvent } from 'react'
import type { FilaTell, TramoCb } from '../types'
import { SAFETIES, TRAMOS, TRAMO_TXT, claveCelda, lecturaDe, type Lectura } from '../lib/lectura'
import { MIN_N, colorPMan, esNum, pct } from '../theme'
import { Tip } from './Tooltip'

export interface Seleccion { tramo: TramoCb; safeties: number }

const TXT: Record<Lectura, string> = { man: 'Man', zone: 'Zone', ambigua: '≈', insuficiente: '' }
const ICO: Record<Lectura, string> = { man: '▲', zone: '▼', ambigua: '◆', insuficiente: '' }

interface Props {
  filas: FilaTell[]
  seleccion: Seleccion | null
  onSeleccion: (s: Seleccion) => void
}

export function MapaCalor({ filas, seleccion, onSeleccion }: Props) {
  const porClave = new Map<string, FilaTell>()
  filas.forEach((f) => porClave.set(claveCelda(f.tramo_cb, f.safeties_prof), f))
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [foco, setFoco] = useState<[number, number]>([0, 0])

  // Flechas mueven el foco entre celdas (foco itinerante).
  function teclado(e: KeyboardEvent) {
    let [r, c] = foco
    if (e.key === 'ArrowRight') c = Math.min(SAFETIES.length - 1, c + 1)
    else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1)
    else if (e.key === 'ArrowDown') r = Math.min(TRAMOS.length - 1, r + 1)
    else if (e.key === 'ArrowUp') r = Math.max(0, r - 1)
    else if (e.key === 'Home') c = 0
    else if (e.key === 'End') c = SAFETIES.length - 1
    else return
    e.preventDefault()
    setFoco([r, c])
    refs.current[`${r}|${c}`]?.focus()
  }

  const cols = 'grid grid-cols-[72px_repeat(4,minmax(0,1fr))] gap-1'
  return (
    <div>
      <div role="grid" aria-label="P(Man) por alineación: tramo de CB y safeties profundos" onKeyDown={teclado} className="space-y-1">
        <div role="row" className={cols}>
          <div role="columnheader" className="text-[10px] leading-tight text-slate-400"><Tip t="cb">CB</Tip> a la línea</div>
          {SAFETIES.map((s) => (
            <div key={s} role="columnheader" className="text-center text-[11px] text-slate-300">
              {s} <Tip t="safety" sinIcono>safeties</Tip>
            </div>
          ))}
        </div>
        {TRAMOS.map((t, r) => (
          <div key={t} role="row" className={cols}>
            <div role="rowheader" className="flex items-center text-xs text-slate-300">{TRAMO_TXT[t]}</div>
            {SAFETIES.map((s, c) => {
              const f = porClave.get(claveCelda(t, s))
              const n = f?.n ?? 0
              const est = f?.est
              const lect = f ? lecturaDe(f) : 'insuficiente'
              const frag = !f || !esNum(est) || n < MIN_N
              const sel = seleccion?.tramo === t && seleccion.safeties === s
              const fondo = frag ? 'rgba(100,116,139,0.15)' : colorPMan(est as number)
              const oscuro = !frag && ((est as number) <= 0.25 || (est as number) >= 0.7)
              const desc = frag
                ? `${TRAMO_TXT[t]}, ${s} safeties: n insuficiente, n ${n}`
                : `${TRAMO_TXT[t]}, ${s} safeties: P(Man) ${pct(est as number, 0)}, n ${n}, parece ${lect === 'man' ? 'Man' : lect === 'zone' ? 'Zone' : 'ambigua'}`
              return (
                <button key={s} type="button" role="gridcell" aria-label={desc} aria-selected={sel}
                  ref={(el) => { refs.current[`${r}|${c}`] = el }}
                  tabIndex={foco[0] === r && foco[1] === c ? 0 : -1}
                  onFocus={() => setFoco([r, c])}
                  onClick={() => onSeleccion({ tramo: t, safeties: s })}
                  style={{ background: fondo }}
                  className={`flex h-14 flex-col items-center justify-center rounded border text-center leading-tight transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${frag ? 'border-dashed border-slate-500 text-slate-400' : 'border-transparent'} ${oscuro ? 'text-slate-900' : !frag ? 'text-white' : ''} ${sel ? 'ring-2 ring-white' : ''}`}>
                  {frag ? (
                    <>
                      <span className="text-sm font-semibold">*</span>
                      <span className="text-[10px]">n={n}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-base font-bold">{pct(est as number, 0)}</span>
                      <span className="text-[10px]">n={n}</span>
                      <span className="text-[10px] font-semibold"><span aria-hidden>{ICO[lect]} </span>{TXT[lect]}</span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
        <span>parece Zone</span>
        <span aria-hidden className="h-2.5 w-32 rounded" style={{ background: `linear-gradient(90deg, ${colorPMan(0)}, ${colorPMan(0.5)}, ${colorPMan(1)})` }} />
        <span>parece Man</span>
        <span className="text-slate-500">· centro gris = ambigua · * borde punteado = n &lt; {MIN_N}, sin cifra</span>
      </div>
    </div>
  )
}
