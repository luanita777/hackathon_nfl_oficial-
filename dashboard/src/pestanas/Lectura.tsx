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
import { Tip } from '../componentes/Tooltip'

const NO_DISP = 'No disponible en la API'

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
      {(noSostiene || celdasChicas + Math.max(0, faltantes) > 0) && !tell.cargando && !sinDatos ? (
        <div role="alert" className="space-y-0.5 rounded-lg border border-amber-500/50 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-200">
          {noSostiene ? <div>⚠ La lectura no se sostiene entre mitades (par/impar) con estos filtros.</div> : null}
          {celdasChicas + Math.max(0, faltantes) > 0 ? <div>⚠ {celdasChicas + Math.max(0, faltantes)} de 20 celdas tienen n &lt; {MIN_N}: se muestran sin cifra.</div> : null}
        </div>
      ) : null}

      {/* Tarjetas */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-7">
        <Kpi titulo="Jugadas analizadas" tip="n" cargando={efecto.cargando} error={efecto.error}
          valor={efN !== undefined ? miles(efN) : NO_DISP} detalle={efN === 0 ? 'Sin jugadas con estos filtros' : 'n con los filtros activos'} nota="Conteo, sin IC" />
        <Kpi titulo="P(Man) con CB cerca" tip="p_man" cargando={hallazgo.cargando} error={hallazgo.error} valor={cerca.valor} detalle={cerca.detalle} />
        <Kpi titulo="P(Man) con CB lejos" tip="p_man" cargando={hallazgo.cargando} error={hallazgo.error} valor={lejos.valor} detalle={lejos.detalle} />
        <Kpi titulo="% Man de la liga" tip="man" valor={<span className="text-sm font-semibold text-slate-400">{NO_DISP}</span>} nota="La API no sirve este total con n e IC" />
        <Kpi titulo="Tasa de disfraz de la liga" tip="tasa_disfraz" valor={<span className="text-sm font-semibold text-slate-400">{NO_DISP}</span>} nota="Solo hay tasa por equipo (pestaña Equipos)" />
        <Kpi titulo="Precisión de la lectura vs línea base" tip="linea_base" className="col-span-2"
          cargando={validacion.cargando} error={validacion.error}
          valor={vc ? <span className="text-base">par {fp(vc.mitades.par.precision)} · impar {fp(vc.mitades.impar.precision)}</span> : <span className="text-sm font-semibold text-slate-400">No disponible</span>}
          detalle={vc ? <>base ({vc.linea_base}): par {fp(vc.mitades.par.precision_base)} · impar {fp(vc.mitades.impar.precision_base)} · <Tip t="auc">AUC</Tip> {esNum(vc.total.auc) ? num(vc.total.auc, 3) : 'n insuficiente'} (n={miles(vc.total.n)})</> : val && val.n === 0 ? 'Sin jugadas con estos filtros' : null}
          nota={vc ? 'sin IC en la API' : undefined} />
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        {/* Mapa */}
        <section className="rounded-lg border border-slate-700/70 bg-slate-800/40 p-3 lg:col-span-7" aria-label="Mapa de calor">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold"><Tip t="p_man">P(Man)</Tip> por alineación al snap</h2>
            <Sello nivel={nivel} motivo={motivo} />
          </div>
          <Estado cargando={tell.cargando} error={tell.error} reintentar={tell.recargar} vacio={sinDatos} alto={330}>
            <MapaCalor filas={filas} seleccion={sel} onSeleccion={setSel} />
          </Estado>
        </section>

        {/* Panel y simulador */}
        <div className="space-y-3 lg:col-span-5">
          {sel ? (
            <PanelCelda tramo={sel.tramo} safeties={sel.safeties} fila={filaSel} onCerrar={() => setSel(null)} />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-600 p-3 text-xs text-slate-400">
              Elige una celda del mapa (clic, o flechas y Enter) para ver su detalle.
            </div>
          )}
          {tell.datos && !sinDatos ? <Simulador filas={filas} /> : null}
        </div>
      </div>

      {/* Gráfica */}
      <section className="rounded-lg border border-slate-700/70 bg-slate-800/40 p-3" aria-label="Gráfica por tramo">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold"><Tip t="p_man">P(Man)</Tip> por tramo de <Tip t="cb">CB</Tip>, según safeties profundos</h2>
          <Sello nivel={nivel} motivo={motivo} />
        </div>
        <Estado cargando={tell.cargando} error={tell.error} reintentar={tell.recargar} vacio={sinDatos} alto={230}>
          <GraficaTramos filas={filas} />
        </Estado>
      </section>
    </div>
  )
}
