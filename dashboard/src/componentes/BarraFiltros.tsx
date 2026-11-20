// Barra de filtros compacta: periodo (semana o mitad), down, equipo defensivo y cobertura.
import type { ReactNode } from 'react'
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import type { Cobertura, FilaEquipo, Hallazgo, Mitad } from '../types'
import { Tip } from './Tooltip'

const SEMANAS = [1, 2, 3, 4, 5, 6, 7, 8]
const DOWNS = [1, 2, 3, 4]
const COBERTURAS: Cobertura[] = ['Man', 'Zone']
const MITADES: Mitad[] = ['1-4', '5-8']

const claseSelect = 'rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100 transition-colors duration-150 hover:border-sky-500'

function Campo({ id, etiqueta, children }: { id: string; etiqueta: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="text-xs text-slate-400">{etiqueta}</label>
      {children}
    </div>
  )
}

export default function BarraFiltros() {
  const { filtros, setFiltro, limpiar } = useFiltros()
  // Lista de equipos sin filtros, para que las opciones no cambien al filtrar.
  const eq = useApi<FilaEquipo[]>('equipos', {})
  // Solo para la nota de cobertura: se muestra únicamente si el hallazgo lo dice.
  const h = useApi<Hallazgo>('hallazgo', filtros)

  const siglas = (eq.datos ?? []).map((f) => f.equipo).filter((s): s is string => !!s).sort()
  const periodo = filtros.semana !== undefined ? `s${filtros.semana}` : filtros.mitad ? `m${filtros.mitad}` : ''

  function cambiarPeriodo(v: string) {
    if (!v) { setFiltro('semana', undefined); setFiltro('mitad', undefined) }
    else if (v[0] === 's') setFiltro('semana', Number(v.slice(1)))
    else setFiltro('mitad', v.slice(1) as Mitad)
  }

  const chips: { clave: string; texto: string; quitar: () => void }[] = []
  if (filtros.semana !== undefined) chips.push({ clave: 'semana', texto: `Semana ${filtros.semana}`, quitar: () => setFiltro('semana', undefined) })
  if (filtros.mitad) chips.push({ clave: 'mitad', texto: `Semanas ${filtros.mitad}`, quitar: () => setFiltro('mitad', undefined) })
  if (filtros.down !== undefined) chips.push({ clave: 'down', texto: `Down ${filtros.down}`, quitar: () => setFiltro('down', undefined) })
  if (filtros.equipo) chips.push({ clave: 'equipo', texto: `Defensa ${filtros.equipo}`, quitar: () => setFiltro('equipo', undefined) })
  if (filtros.cobertura) chips.push({ clave: 'cobertura', texto: `Cobertura ${filtros.cobertura}`, quitar: () => setFiltro('cobertura', undefined) })

  const notaCobertura = !!filtros.cobertura && h.datos?.estado === 'no_concluyente'

  return (
    <div role="search" aria-label="Filtros" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Campo id="f-periodo" etiqueta={<Tip t="mitades">Periodo</Tip>}>
        <select id="f-periodo" className={claseSelect} value={periodo} onChange={(e) => cambiarPeriodo(e.target.value)}>
          <option value="">Semanas 1-8</option>
          {SEMANAS.map((s) => <option key={s} value={`s${s}`}>Semana {s}</option>)}
          {MITADES.map((m) => <option key={m} value={`m${m}`}>Mitad {m}</option>)}
        </select>
      </Campo>
      <Campo id="f-down" etiqueta={<Tip t="down">Down</Tip>}>
        <select id="f-down" className={claseSelect} value={filtros.down ?? ''} onChange={(e) => setFiltro('down', e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Todos</option>
          {DOWNS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Campo>
      <Campo id="f-equipo" etiqueta={<Tip t="zone">Defensa</Tip>}>
        <select id="f-equipo" className={claseSelect} value={filtros.equipo ?? ''} disabled={!siglas.length} onChange={(e) => setFiltro('equipo', e.target.value || undefined)}>
          <option value="">Todas</option>
          {siglas.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Campo>
      <Campo id="f-cobertura" etiqueta={<Tip t="cobertura">Cobertura</Tip>}>
        <select id="f-cobertura" className={claseSelect} value={filtros.cobertura ?? ''} onChange={(e) => setFiltro('cobertura', (e.target.value || undefined) as Cobertura | undefined)}>
          <option value="">Todas</option>
          {COBERTURAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Campo>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtros activos">
          {chips.map((c) => (
            <button key={c.clave} type="button" onClick={c.quitar} aria-label={`Quitar filtro: ${c.texto}`}
              className="rounded-full border border-sky-500/50 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-200 transition-colors duration-150 hover:bg-sky-500/25">
              {c.texto} <span aria-hidden>×</span>
            </button>
          ))}
          <button type="button" onClick={limpiar}
            className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-300 transition-colors duration-150 hover:border-slate-400 hover:text-white">
            Limpiar
          </button>
        </div>
      )}
      {notaCobertura && (
        <span role="note" className="text-xs text-amber-300">Con cobertura fija el hallazgo es no concluyente</span>
      )}
    </div>
  )
}
