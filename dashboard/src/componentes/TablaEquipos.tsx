// Tabla ordenable de equipos con tendencia semanas 1-4 vs 5-8 (cifras servidas por la API).
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { getJSON, queryDe } from '../api'
import { Insignia } from './Insignia'
import { Tip } from './Tooltip'
import { colorAcento, paletaEquipo } from '../equipos'
import { esNum, MIN_N, pct, tema } from '../theme'
import type { FilaEquipo, Filtros } from '../types'

type Col = 'equipo' | 'est' | 'ic' | 'n'
type Dir = 'ascending' | 'descending'

interface Mitades { a: Map<string, FilaEquipo>; b: Map<string, FilaEquipo> }

// Pide las dos mitades con los filtros activos, sin equipo, semana ni mitad.
function useMitades(filtros: Filtros) {
  const base: Filtros = { ...filtros }
  delete base.equipo; delete base.semana; delete base.mitad
  const clave = queryDe(base)
  const [m, setM] = useState<Mitades | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const ac = new AbortController()
    setM(null); setError(false)
    const mapa = (f: FilaEquipo[]) => new Map(f.filter((x) => x.equipo).map((x) => [x.equipo as string, x]))
    Promise.all([
      getJSON<FilaEquipo[]>('equipos', { ...base, mitad: '1-4' }, ac.signal),
      getJSON<FilaEquipo[]>('equipos', { ...base, mitad: '5-8' }, ac.signal),
    ]).then(([a, b]) => setM({ a: mapa(a), b: mapa(b) }))
      .catch((e) => { if (e.name !== 'AbortError') setError(true) })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])
  return { m, error }
}

/** Dos barras mini: semanas 1-4 y 5-8. Altura proporcional al máximo servido (solo escala visual). */
function Mini({ sigla, m, error, tope }: { sigla: string; m: Mitades | null; error: boolean; tope: number }) {
  if (error) return <span className="text-slate-500">No disponible</span>
  if (!m) return <span className="text-slate-500">…</span>
  const a = m.a.get(sigla), b = m.b.get(sigla)
  const barra = (f: FilaEquipo | undefined, etiqueta: string, color: string) => {
    if (!f || !esNum(f.est)) return <span title={`Semanas ${etiqueta}: n insuficiente`} className="w-3 text-center text-[9px] text-slate-500">–</span>
    const alto = Math.max(2, (f.est / tope) * 22)
    return <span title={`Semanas ${etiqueta}: ${pct(f.est)} (n=${f.n})${f.n < MIN_N ? ' *' : ''}`}
      style={{ height: alto, background: color, opacity: f.n < MIN_N ? 0.4 : 1 }} className="inline-block w-3 rounded-sm" />
  }
  return (
    <span className="inline-flex h-6 items-end gap-1" aria-label={`Semanas 1-4: ${a && esNum(a.est) ? pct(a.est) : 'n insuficiente'}; semanas 5-8: ${b && esNum(b.est) ? pct(b.est) : 'n insuficiente'}`}>
      {barra(a, '1-4', tema.neutro)}{barra(b, '5-8', colorAcento(sigla))}
    </span>
  )
}

export default function TablaEquipos({ filas, filtros, seleccionado, onElegir }: {
  filas: FilaEquipo[]; filtros: Filtros; seleccionado?: string; onElegir: (sigla: string) => void
}) {
  const [col, setCol] = useState<Col>('est')
  const [dir, setDir] = useState<Dir>('descending')
  const { m, error } = useMitades(filtros)

  const orden = useMemo(() => {
    const v = (f: FilaEquipo): number | string | null => {
      if (col === 'equipo') return f.equipo
      if (col === 'n') return f.n
      if (col === 'ic') return f.lo !== null && f.hi !== null && esNum(f.est) ? f.hi - f.lo : null
      return esNum(f.est) ? f.est : null
    }
    const k = dir === 'ascending' ? 1 : -1
    return filas.filter((f) => f.equipo).sort((x, y) => {
      const a = v(x), b = v(y)
      if (a === null && b === null) return 0
      if (a === null) return 1 // sin cifra siempre al final
      if (b === null) return -1
      return (typeof a === 'string' ? a.localeCompare(b as string) : a - (b as number)) * k
    })
  }, [filas, col, dir])

  // Escala de las barras: el mayor valor servido en las dos mitades.
  const tope = useMemo(() => {
    const vals: number[] = []
    m?.a.forEach((f) => esNum(f.est) && vals.push(f.est)); m?.b.forEach((f) => esNum(f.est) && vals.push(f.est))
    return Math.max(0.01, ...vals)
  }, [m])

  function pedir(c: Col) {
    if (c === col) setDir(dir === 'ascending' ? 'descending' : 'ascending')
    else { setCol(c); setDir(c === 'equipo' ? 'ascending' : 'descending') }
  }
  const aria = (c: Col) => (c === col ? dir : 'none')
  const flecha = (c: Col) => (c === col ? (dir === 'ascending' ? ' ▲' : ' ▼') : '')
  const Th = ({ c, children }: { c: Col; children: React.ReactNode }) => (
    <th scope="col" aria-sort={aria(c)} className="px-2 py-1.5 text-left font-medium">
      <button type="button" onClick={() => pedir(c)} className="rounded hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{children}{flecha(c)}</button>
    </th>
  )
  const teclas = (e: KeyboardEvent, s: string) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onElegir(s) } }

  return (
    <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-700/70">
      <table className="w-full text-xs">
        <caption className="sr-only">Equipos con tasa de disfraz, IC95%, n y tendencia por mitades</caption>
        <thead className="sticky top-0 z-10 bg-slate-800 text-slate-300">
          <tr>
            <Th c="equipo">Equipo</Th>
            <Th c="est"><Tip t="disfraz" sinIcono>Disfraz</Tip></Th>
            <Th c="ic"><Tip t="ic95" sinIcono>IC95%</Tip></Th>
            <Th c="n"><Tip t="n" sinIcono>n</Tip></Th>
            <th scope="col" className="px-2 py-1.5 text-left font-medium" title="Barra gris: semanas 1-4. Barra de color: semanas 5-8.">1-4 vs 5-8</th>
            <th scope="col" className="px-2 py-1.5 text-left font-medium">Dif. vs liga</th>
          </tr>
        </thead>
        <tbody>
          {orden.map((f) => {
            const s = f.equipo as string
            const sel = seleccionado === s
            const poco = f.n < MIN_N
            return (
              <tr key={s} tabIndex={0} aria-selected={sel} onClick={() => onElegir(s)} onKeyDown={(e) => teclas(e, s)}
                style={sel ? { boxShadow: `inset 3px 0 0 ${colorAcento(s)}` } : undefined}
                className={`cursor-pointer border-t border-slate-800 transition-colors hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${sel ? 'bg-slate-800/80' : ''} ${poco ? 'opacity-60' : ''}`}>
                <td className="px-2 py-1"><span className="inline-flex items-center gap-1.5"><Insignia sigla={s} tam={22} />{paletaEquipo(s).nombre}</span></td>
                <td className="px-2 py-1 tabular-nums">{esNum(f.est) ? pct(f.est) : 'n insuficiente'}{poco ? ' *' : ''}</td>
                <td className="px-2 py-1 tabular-nums text-slate-300">{f.lo !== null && f.hi !== null ? `${pct(f.lo)} a ${pct(f.hi)}` : '—'}</td>
                <td className="px-2 py-1 tabular-nums">{f.n}</td>
                <td className="px-2 py-1"><Mini sigla={s} m={m} error={error} tope={tope} /></td>
                <td className="px-2 py-1 text-slate-500">No disponible</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
