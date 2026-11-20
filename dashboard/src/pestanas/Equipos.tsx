// Pestaña 2 · Equipos: dispersión y tabla de los 32 equipos (se pide sin el filtro de equipo para no reducirlos a uno).
import { useApi } from '../api'
import DispersionEquipos, { separar } from '../componentes/DispersionEquipos'
import { Estado } from '../componentes/Estados'
import { Insignia } from '../componentes/Insignia'
import { ModoRival } from '../componentes/ModoRival'
import PreguntasCoach from '../componentes/PreguntasCoach'
import { Sello, type NivelSello } from '../componentes/Sello'
import TablaEquipos from '../componentes/TablaEquipos'
import { Tip } from '../componentes/Tooltip'
import { colorAcento, paletaEquipo } from '../equipos'
import { useFiltros } from '../FiltrosContext'
import { MIN_N, num, tema } from '../theme'
import type { FilaEquipo, Filtros, Validacion } from '../types'

type Pestana = 'lectura' | 'equipos' | 'efecto'

/** Sello de la comparación entre equipos según la estabilidad entre mitades que sirve la API. */
function selloDe(v: Validacion | null): { nivel: NivelSello; motivo: string } {
  const e = v?.criterios?.estabilidad_mitades
  if (!e) return { nivel: 'no_concluyente', motivo: 'la validación no está disponible con estos filtros' }
  const r = typeof e.pearson === 'number' ? num(e.pearson, 2) : 'n insuficiente'
  const p = e.p_permutacion_pearson !== null ? num(e.p_permutacion_pearson, 2) : 'sin dato'
  if (e.resultado === 'no pasa')
    return { nivel: 'fragil', motivo: `la diferencia entre equipos no se sostiene entre mitades (correlación ${r}, p de permutación ${p})` }
  return { nivel: 'solido', motivo: `la diferencia entre equipos se sostiene entre mitades (correlación ${r}, p de permutación ${p})` }
}

export default function Equipos({ irA }: { irA?: (p: Pestana) => void }) {
  const { filtros, setFiltro } = useFiltros()
  const sinEquipo: Filtros = { ...filtros }
  delete sinEquipo.equipo
  const eq = useApi<FilaEquipo[]>('equipos', sinEquipo)
  const val = useApi<Validacion>('validacion', sinEquipo)

  const acento = filtros.equipo ? colorAcento(filtros.equipo) : tema.acento
  const filas = (eq.datos ?? []).filter((f) => f.equipo)
  const vacio = !eq.cargando && !eq.error && filas.length === 0
  const sello = selloDe(val.datos)
  const pocos = filas.filter((f) => f.n < MIN_N).length
  // Clic en el seleccionado lo quita.
  const elegir = (s: string) => setFiltro('equipo', filtros.equipo === s ? undefined : s)

  return (
    <div className="space-y-3">
      {filtros.equipo && (
        <div className="flex items-center gap-3 rounded-lg border bg-slate-900/60 p-3" style={{ borderColor: acento }}>
          <Insignia sigla={filtros.equipo} tam={56} />
          <h2 className="text-lg font-bold" style={{ color: acento }}>{paletaEquipo(filtros.equipo).nombre}</h2>
          <button type="button" onClick={() => setFiltro('equipo', undefined)}
            className="ml-auto rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Quitar equipo</button>
        </div>
      )}
      {filtros.equipo && <ModoRival equipo={filtros.equipo} />}

      <section className="rounded-lg border bg-slate-900/60 p-3" style={{ borderColor: acento + '66' }}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: acento }}>¿Qué equipos disfrazan más? <Tip t="disfraz" /></h2>
          {!val.cargando && <Sello nivel={sello.nivel} motivo={sello.motivo} />}
        </div>
        {!val.cargando && sello.nivel !== 'solido' && (
          <p role="alert" className="mt-2 rounded border border-amber-500/60 bg-amber-950/30 p-2 text-xs text-amber-200">
            ⚠ Cuidado al comparar equipos: {sello.motivo}.
          </p>
        )}
        {pocos > 0 && <p className="mt-1 text-xs text-amber-300">{pocos} equipo(s) con n &lt; {MIN_N}: atenuados y marcados con *.</p>}
        <p className="mt-1 text-xs text-slate-400">Se muestran todos los equipos; el filtro de equipo solo resalta uno.</p>

        <div className="mt-2 grid gap-3 lg:grid-cols-2">
          <Estado cargando={eq.cargando} error={eq.error} reintentar={eq.recargar} vacio={vacio} alto={340}>
            <DispersionEquipos filas={eq.datos ?? []} seleccionado={filtros.equipo} onElegir={elegir} />
          </Estado>
          <Estado cargando={eq.cargando} error={eq.error} reintentar={eq.recargar} vacio={vacio} alto={340}>
            <TablaEquipos filas={eq.datos ?? []} filtros={filtros} seleccionado={filtros.equipo} onElegir={elegir} />
          </Estado>
        </div>
      </section>

      <PreguntasCoach irA={irA} acento={acento} />
    </div>
  )
}
