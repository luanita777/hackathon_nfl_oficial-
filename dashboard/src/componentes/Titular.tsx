// Titular: la frase del hallazgo tal cual la arma el backend, con su insignia de validación.
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import type { Hallazgo, Validacion } from '../types'
import { Cargando, ErrorApi, Vacio } from './Estados'

export default function Titular() {
  const { filtros } = useFiltros()
  const h = useApi<Hallazgo>('hallazgo', filtros)
  const v = useApi<Validacion>('validacion', filtros)

  if (h.error) return <ErrorApi mensaje={h.error} onReintentar={h.recargar} />
  if (h.cargando && !h.datos) return <Cargando alto={72} texto="Cargando hallazgo…" />
  const d = h.datos
  if (!d || !d.frase) return <Vacio mensaje="Sin hallazgo para estos filtros" />

  const noConcluyente = d.estado === 'no_concluyente'
  // Con n = 0 no hay validación que mostrar.
  const val = v.datos && v.datos.n > 0 ? v.datos : null

  return (
    <section aria-label="Hallazgo principal"
      className={`rounded-lg border bg-slate-900/60 px-4 py-3 transition-opacity duration-200 ${h.cargando ? 'opacity-60' : 'opacity-100'} ${noConcluyente ? 'border-slate-600' : 'border-sky-500/40'}`}>
      <div className="flex flex-wrap items-center gap-2">
        {noConcluyente && (
          <span className="rounded-full border border-slate-500 px-2 py-0.5 text-[11px] font-medium text-slate-200">No concluyente</span>
        )}
        {val && (val.se_sostiene
          ? <span className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">✓ Se sostiene en ambas mitades</span>
          : <span className="rounded-full border border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">⚠ No se sostiene entre mitades</span>)}
        {v.error && <span className="text-[11px] text-red-300">No se pudo cargar la validación</span>}
      </div>
      <p className="mt-1 text-sm font-medium leading-snug text-slate-50">{d.frase}</p>
      {noConcluyente && d.razon && <p className="mt-1 text-sm text-slate-300">{d.razon}</p>}
      {d.aviso_cortes && (
        <details className="mt-1 text-xs text-slate-400">
          <summary className="cursor-pointer select-none transition-colors hover:text-slate-200">Aviso sobre los cortes</summary>
          <p className="mt-1 leading-snug">{d.aviso_cortes}</p>
        </details>
      )}
    </section>
  )
}
