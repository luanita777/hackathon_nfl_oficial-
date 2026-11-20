// Pestaña 1: La lectura. Mapa de P(Man) por alineación, tarjetas, panel de celda, gráfica y simulador.
import { useState } from 'react'
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import type { Efecto, Estimacion, FilaTell, Hallazgo, Validacion } from '../types'
import { claveCelda } from '../lib/lectura'
import { MIN_N, esNum, miles, num, pct } from '../theme'
const fp = (x: unknown) => (esNum(x) ? pct(x) : 'n insuficiente')
import { Estado } from '../componentes/Estados'
import { Kpi } from '../componentes/Kpi'
import { MapaCalor, type Seleccion } from '../componentes/MapaCalor'
import { PanelCelda } from '../componentes/PanelCelda'
import { GraficaTramos } from '../componentes/GraficaTramos'
import { Simulador } from '../componentes/Simulador'
import { Sello, nivelSello } from '../componentes/Sello'
import Titular from '../componentes/Titular'

const NO_DISP = 'No disponible'

// Texto de una estimación con IC: cifra, IC95% y n; respeta "n insuficiente".
function textoEst(e: Estimacion | null | undefined) {
  if (!e) return { valor: 'No disponible', detalle: null as string | null }
  if (!esNum(e.est)) return { valor: 'n insuficiente', detalle: `n=${miles(e.n)}` }
  const ic = e.lo !== null && e.hi !== null ? `IC95% ${pct(e.lo)} a ${pct(e.hi)}` : 'IC95% no disponible'
  return { valor: pct(e.est), detalle: `n=${miles(e.n)} · ${ic}` }
}

export default function Lectura() {
  const { filtros } = useFiltros()
  const tell = useApi<FilaTell[]>('tell', filtros)
  const efecto = useApi<Efecto>('efecto', filtros)
  const hallazgo = useApi<Hallazgo>('hallazgo', filtros)
  const validacion = useApi<Validacion>('validacion', filtros)
  const [sel, setSel] = useState<Seleccion | null>(null)

  const filas = (tell.datos ?? []).filter((f) => f.tramo_cb !== null && f.safeties_prof !== null)
  const sinDatos = !!tell.datos && filas.length === 0
  const val = validacion.datos
  const vc = val && val.n > 0 ? val.criterios?.validacion_cruzada : undefined
  const noSostiene = !!val && val.n > 0 && val.se_sostiene === false
  const celdasChicas = filas.filter((f) => f.n < MIN_N || !esNum(f.est)).length
  const faltantes = 20 - filas.length // celdas sin fila = n 0
  const filaSel = sel ? filas.find((f) => claveCelda(f.tramo_cb, f.safeties_prof) === claveCelda(sel.tramo, sel.safeties)) : undefined

  // Sello: con celda elegida usa su n; sin elección, el menor n del mapa (la peor celda).
  const nSello = sel ? (filaSel?.n ?? 0) : filas.length < 20 ? 0 : Math.min(...filas.map((f) => f.n))
  const nivel = nivelSello({ n: nSello, sostiene: val ? val.se_sostiene : undefined })
  const motivo = nSello < MIN_N ? `n < ${MIN_N} en ${sel ? 'la celda elegida' : 'alguna celda'}`
    : noSostiene ? 'no se sostiene entre mitades' : 'todas las celdas elegidas con n suficiente y se sostiene entre mitades'

  const cerca = textoEst(hallazgo.datos?.contraste.cerca)
  const lejos = textoEst(hallazgo.datos?.contraste.lejos)
  const efN = efecto.datos?.n

  return (
    <div className="space-y-3">
      <Titular />

      {(noSostiene || celdasChicas + Math.max(0, faltantes) > 0) && !tell.cargando && !sinDatos ? (
        <div role="alert" className="space-y-0.5 rounded-lg border border-amber-500/50 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-200">
          {noSostiene ? <div>⚠ Esta lectura no se repite entre semanas pares e impares con estos filtros.</div> : null}
          {celdasChicas + Math.max(0, faltantes) > 0 ? <div>⚠ En {celdasChicas + Math.max(0, faltantes)} de los 20 acomodos hay menos de {MIN_N} jugadas: se muestran sin cifra.</div> : null}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-700/70 bg-slate-800/40 p-3 lg:col-span-7" aria-label="Mapa de acomodos">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">¿Qué cobertura sugiere cada acomodo de la defensa?</h2>
              <p className="text-xs text-slate-400">Toca un cuadro para ver el dibujo y cuánto puedes confiar en esa pista.</p>
            </div>
            <Sello nivel={nivel} motivo={motivo} />
          </div>
          <Estado cargando={tell.cargando} error={tell.error} reintentar={tell.recargar} vacio={sinDatos} alto={330}>
            <MapaCalor filas={filas} seleccion={sel} onSeleccion={setSel} />
          </Estado>
        </section>
        <div className="lg:col-span-5">
          {sel ? (
            <PanelCelda tramo={sel.tramo} safeties={sel.safeties} fila={filaSel} onCerrar={() => setSel(null)} />
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-600 p-4 text-center text-sm text-slate-400">
              👈 Elige un cuadro del mapa para ver cómo se acomoda la defensa y qué tan seguro es leerla.
            </div>
          )}
        </div>
      </div>

      <details className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
        <summary className="cursor-pointer select-none text-sm font-semibold text-slate-200">Ver más detalle (tarjetas, gráfica y simulador)</summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
            <Kpi titulo="Jugadas analizadas" tip="n" cargando={efecto.cargando} error={efecto.error}
              valor={efN !== undefined ? miles(efN) : NO_DISP} detalle={efN === 0 ? 'Sin jugadas con estos filtros' : 'con los filtros activos'} />
            <Kpi titulo="Man con esquineros cerca" tip="p_man" cargando={hallazgo.cargando} error={hallazgo.error} valor={cerca.valor} detalle={cerca.detalle} />
            <Kpi titulo="Man con esquineros lejos" tip="p_man" cargando={hallazgo.cargando} error={hallazgo.error} valor={lejos.valor} detalle={lejos.detalle} />
            <Kpi titulo="Acierto de la lectura vs. adivinar Zone" tip="linea_base" className="col-span-2 lg:col-span-3"
              cargando={validacion.cargando} error={validacion.error}
              valor={vc ? <span className="text-base">pares {fp(vc.mitades.par.precision)} · impares {fp(vc.mitades.impar.precision)}</span> : <span className="text-sm font-semibold text-slate-400">No disponible</span>}
              detalle={vc ? <>adivinar Zone acertaría: pares {fp(vc.mitades.par.precision_base)} · impares {fp(vc.mitades.impar.precision_base)}</> : val && val.n === 0 ? 'Sin jugadas con estos filtros' : null}
              nota={vc ? 'La API no da margen de error para este dato' : undefined} />
          </div>
          <section aria-label="Gráfica por tramo">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">% de Man según qué tan lejos están los esquineros</h3>
              <Sello nivel={nivel} motivo={motivo} />
            </div>
            <Estado cargando={tell.cargando} error={tell.error} reintentar={tell.recargar} vacio={sinDatos} alto={230}>
              <GraficaTramos filas={filas} />
            </Estado>
          </section>
          {tell.datos && !sinDatos ? <Simulador filas={filas} /> : null}
        </div>
      </details>
    </div>
  )
}
