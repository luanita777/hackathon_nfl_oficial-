// Pestaña 3: efecto del disfraz y validación del hallazgo. Todas las cifras vienen de la API.
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import { Estado } from '../componentes/Estados'
import { EfectoSimple, PruebasSimples } from '../componentes/PruebasSimples'
import { EfectoPanel } from '../componentes/EfectoPanel'
import { ValidacionTabla } from '../componentes/ValidacionTabla'
import { ValidacionConfirmacion } from '../componentes/ValidacionConfirmacion'
import { ValidacionMitades } from '../componentes/ValidacionMitades'
import type { Efecto as EfectoT, Validacion } from '../types'
import { IcoAlerta } from '../componentes/Iconos'

export default function Efecto(_props: { irA?: unknown } = {}) {
  const { filtros } = useFiltros()
  const ef = useApi<EfectoT>('efecto', filtros)
  const va = useApi<Validacion>('validacion', filtros)
  const v = va.datos

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 text-xl font-bold">¿El disfraz le sirve a la defensa?</h2>
        <Estado cargando={ef.cargando} error={ef.error} reintentar={ef.recargar} vacio={ef.datos?.n === 0} alto={200}>
          {ef.datos && <EfectoSimple e={ef.datos} />}
        </Estado>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">¿Podemos creerle a este análisis? Cinco pruebas</h2>
        <Estado cargando={va.cargando} error={va.error} reintentar={va.recargar} vacio={v?.n === 0} alto={200}>
          {v && !v.se_sostiene && <p className="mb-2 rounded border border-amber-500/60 p-2 text-xs text-amber-300" role="alert"><IcoAlerta /> Con estos filtros el hallazgo no se sostiene entre mitades.</p>}
          {v && <PruebasSimples v={v} />}
        </Estado>
      </section>

      <details className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
        <summary className="cursor-pointer select-none text-sm font-semibold text-slate-200">Ver tablas y gráficas técnicas</summary>
        <div className="mt-3 space-y-4">
          <Estado cargando={ef.cargando} error={ef.error} reintentar={ef.recargar} vacio={ef.datos?.n === 0} alto={200}>
            {ef.datos && (
              <div className="grid grid-cols-2 gap-3">
                <EfectoPanel titulo="% de completos" tip="completos" m={ef.datos.completos} valA={ef.datos.completos.p_a} valB={ef.datos.completos.p_b} unidad="pp" dec={1} />
                <EfectoPanel titulo="Yardas por jugada" tip="yardas_jugada" m={ef.datos.yardas} valA={ef.datos.yardas.media_a} valB={ef.datos.yardas.media_b} unidad="yd" dec={2} />
              </div>
            )}
          </Estado>
          <Estado cargando={va.cargando} error={va.error} reintentar={va.recargar} vacio={v?.n === 0} alto={200}>
            {v?.criterios && <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3"><ValidacionTabla c={v.criterios} /></div>}
            {v?.confirmacion && <ValidacionConfirmacion c={v.confirmacion} />}
          </Estado>
          <ValidacionMitades val={v} />
        </div>
      </details>
    </div>
  )
}
