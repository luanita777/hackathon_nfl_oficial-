// Tarjeta KPI reutilizable, compacta, con estados de carga y error.
import type { ReactNode } from 'react'
import { Tip } from './Tooltip'

interface Props {
  titulo: string
  tip?: string // clave del glosario
  valor?: ReactNode
  detalle?: ReactNode // línea de n / IC95%
  nota?: ReactNode // línea tenue (avisos)
  cargando?: boolean
  error?: string | null
  className?: string
}

export function Kpi({ titulo, tip, valor, detalle, nota, cargando, error, className = '' }: Props) {
  return (
    <section aria-label={titulo} className={`min-w-0 rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 ${className}`}>
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {tip ? <Tip t={tip}>{titulo}</Tip> : titulo}
      </h3>
      {cargando ? (
        <div role="status" aria-label="Cargando" className="mt-1 animate-pulse space-y-1">
          <div className="h-6 w-2/3 rounded bg-slate-700/60" />
          <div className="h-3 w-full rounded bg-slate-700/40" />
        </div>
      ) : error ? (
        <p role="alert" className="mt-1 text-xs text-red-300">No se pudo cargar: {error}</p>
      ) : (
        <>
          <div className="mt-0.5 text-xl font-bold leading-tight text-slate-100">{valor}</div>
          {detalle ? <div className="text-[11px] leading-snug text-slate-300">{detalle}</div> : null}
          {nota ? <div className="text-[10px] leading-snug text-slate-500">{nota}</div> : null}
        </>
      )}
    </section>
  )
}
