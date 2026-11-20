// Filtros: controles segmentados (un toque) en una tarjeta, con la defensa como selector con escudo.
import type { ReactNode } from 'react'
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import { paletaEquipo } from '../equipos'
import type { Cobertura, FilaEquipo, Hallazgo, Mitad } from '../types'
import { Insignia } from './Insignia'
import { Tip } from './Tooltip'
import { IcoX } from './Iconos'

interface Opcion { valor: string; texto: string; color?: string }

/** Control segmentado accesible (radiogroup): una opción activa, resaltada con su color. */
function Segmentado({ etiqueta, opciones, valor, onCambio }: { etiqueta: string; opciones: Opcion[]; valor: string; onCambio: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="inline-flex rounded-xl border border-slate-700 bg-slate-950/60 p-0.5">
      {opciones.map((o) => {
        const activo = o.valor === valor
        return (
          <button key={o.valor} type="button" role="radio" aria-checked={activo} onClick={() => onCambio(o.valor)}
            style={activo && o.color ? { background: o.color + '33', color: o.color, borderColor: o.color + '88' } : undefined}
            className={`min-w-[2.25rem] rounded-[10px] border px-3 py-1 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${activo
              ? (o.color ? '' : 'border-sky-400/60 bg-sky-500/20 text-sky-100 shadow-sm') : 'border-transparent text-slate-400 hover:text-slate-100'}`}>
            {o.texto}
          </button>
        )
      })}
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{titulo}</span>
      {children}
    </div>
  )
}

export default function BarraFiltros() {
  const { filtros, setFiltro, limpiar } = useFiltros()
  const eq = useApi<FilaEquipo[]>('equipos', {}) // sin filtros: las opciones no cambian al filtrar
  const h = useApi<Hallazgo>('hallazgo', filtros)
  const siglas = (eq.datos ?? []).map((f) => f.equipo).filter((s): s is string => !!s).sort()

  const periodo = filtros.mitad ?? (filtros.semana !== undefined ? `s${filtros.semana}` : '')
  const hayFiltros = Object.keys(filtros).length > 0
  const notaCobertura = !!filtros.cobertura && h.datos?.estado === 'no_concluyente'

  function cambiarPeriodo(v: string) {
    setFiltro('semana', undefined); setFiltro('mitad', undefined)
    if (v === '1-4' || v === '5-8') setFiltro('mitad', v as Mitad)
    else if (v.startsWith('s')) setFiltro('semana', Number(v.slice(1)))
  }

  return (
    <div role="search" aria-label="Filtros" className="flex flex-wrap items-end gap-x-6 gap-y-2 rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-2.5 shadow-lg">
      <Grupo titulo={<Tip t="mitades">Periodo</Tip>}>
        <div className="flex items-center gap-2">
          <Segmentado etiqueta="Periodo" valor={periodo.startsWith('s') ? '' : periodo}
            opciones={[{ valor: '', texto: 'Todo' }, { valor: '1-4', texto: 'Sem. 1-4' }, { valor: '5-8', texto: 'Sem. 5-8' }]} onCambio={cambiarPeriodo} />
          <select aria-label="Una sola semana" value={periodo.startsWith('s') ? periodo : ''} onChange={(e) => cambiarPeriodo(e.target.value)}
            className={`rounded-xl border bg-slate-950/60 px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${periodo.startsWith('s') ? 'border-sky-400/60 text-sky-100' : 'border-slate-700 text-slate-400'}`}>
            <option value="">Una semana…</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={`s${s}`}>Semana {s}</option>)}
          </select>
        </div>
      </Grupo>
      <Grupo titulo={<Tip t="down">Down</Tip>}>
        <Segmentado etiqueta="Down" valor={filtros.down?.toString() ?? ''} onCambio={(v) => setFiltro('down', v ? Number(v) : undefined)}
          opciones={[{ valor: '', texto: 'Todos' }, ...[1, 2, 3, 4].map((d) => ({ valor: String(d), texto: String(d) }))]} />
      </Grupo>
      <Grupo titulo={<Tip t="cobertura">Cobertura</Tip>}>
        <Segmentado etiqueta="Cobertura" valor={filtros.cobertura ?? ''} onCambio={(v) => setFiltro('cobertura', (v || undefined) as Cobertura | undefined)}
          opciones={[{ valor: '', texto: 'Todas' }, { valor: 'Man', texto: 'Man', color: '#f59e0b' }, { valor: 'Zone', texto: 'Zone', color: '#38bdf8' }]} />
      </Grupo>
      <Grupo titulo="Defensa">
        <div className="flex items-center gap-2">
          {filtros.equipo && <Insignia sigla={filtros.equipo} tam={30} />}
          <select aria-label="Equipo defensivo" value={filtros.equipo ?? ''} disabled={!siglas.length} onChange={(e) => setFiltro('equipo', e.target.value || undefined)}
            className={`rounded-xl border bg-slate-950/60 px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${filtros.equipo ? 'border-sky-400/60 text-sky-100' : 'border-slate-700 text-slate-300'}`}>
            <option value="">Las 32 defensas</option>
            {siglas.map((s) => <option key={s} value={s}>{paletaEquipo(s).nombre}</option>)}
          </select>
        </div>
      </Grupo>
      {hayFiltros && (
        <button type="button" onClick={limpiar}
          className="ml-auto rounded-xl border border-slate-600 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-sky-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
          <IcoX /> Limpiar filtros
        </button>
      )}
      {notaCobertura && <span role="note" className="basis-full text-xs text-amber-300">Con una cobertura fija el hallazgo no es concluyente: no hay contraste Man contra Zone.</span>}
    </div>
  )
}
