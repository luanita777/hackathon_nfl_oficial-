// Pestaña 3: efecto del disfraz y validación del hallazgo. Todas las cifras vienen de la API.
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import { Estado } from '../componentes/Estados'
import { Tip } from '../componentes/Tooltip'
import { EfectoPanel } from '../componentes/EfectoPanel'
import { ValidacionTabla } from '../componentes/ValidacionTabla'
import { ValidacionConfirmacion } from '../componentes/ValidacionConfirmacion'
import { ValidacionMitades } from '../componentes/ValidacionMitades'
import { miles } from '../theme'
import type { Efecto as EfectoT, Validacion } from '../types'

export default function Efecto(_props: { irA?: unknown } = {}) {
  const { filtros } = useFiltros()
  const ef = useApi<EfectoT>('efecto', filtros)
  const va = useApi<Validacion>('validacion', filtros)
  const v = va.datos

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-1 text-base font-semibold"><Tip t="disfraz">Efecto del disfraz</Tip> en el resultado del pase</h2>
        <p className="mb-2 text-xs text-slate-400">Compara jugadas con disfraz contra sin disfraz. Es observacional: no prueba que el disfraz cause la diferencia.</p>
        <Estado cargando={ef.cargando} error={ef.error} reintentar={ef.recargar} vacio={ef.datos?.n === 0} alto={200}>
          {ef.datos && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <EfectoPanel titulo="% de completos" tip="completos" m={ef.datos.completos}
                  valA={ef.datos.completos.p_a} valB={ef.datos.completos.p_b} unidad="pp" dec={1} />
                <EfectoPanel titulo="Yardas por jugada" tip="yardas_jugada" m={ef.datos.yardas}
                  valA={ef.datos.yardas.media_a} valB={ef.datos.yardas.media_b} unidad="yd" dec={2} />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Jugadas con lectura clara: {miles(ef.datos.n_con_disfraz + ef.datos.n_sin_disfraz)} ({miles(ef.datos.n_con_disfraz)} con disfraz, {miles(ef.datos.n_sin_disfraz)} sin disfraz) de {miles(ef.datos.n)} con estos filtros.</p>
            </>
          )}
        </Estado>
      </section>

      <section>
        <h2 className="mb-1 text-base font-semibold">Validación del hallazgo</h2>
        <Estado cargando={va.cargando} error={va.error} reintentar={va.recargar} vacio={v?.n === 0} alto={200}>
          {v && !v.se_sostiene && <p className="mb-2 rounded border border-amber-500/60 p-2 text-xs text-amber-300" role="alert">⚠ El hallazgo no se sostiene con estos filtros.</p>}
          {v?.criterios && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3"><ValidacionTabla c={v.criterios} /></div>
          )}
          {v?.confirmacion && (
            <div className="mt-3">
              <h3 className="mb-1 text-sm font-semibold">Descubrimiento (semanas 1-4) vs confirmación (semanas 5-8)</h3>
              <ValidacionConfirmacion c={v.confirmacion} />
            </div>
          )}
        </Estado>
      </section>

      <ValidacionMitades val={v} />
    </div>
  )
}
