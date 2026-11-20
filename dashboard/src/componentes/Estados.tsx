// Estados por componente: cargando, vacío y error de API.
import type { ReactNode } from 'react'
import { useFiltros } from '../FiltrosContext'

export function Cargando({ alto = 120, texto = 'Cargando…' }: { alto?: number; texto?: string }) {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: alto }}
      className="flex animate-pulse items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/40 text-sm text-slate-400">
      {texto}
    </div>
  )
}

export function Vacio({ mensaje = 'Sin jugadas con estos filtros' }: { mensaje?: string }) {
  const { limpiar } = useFiltros()
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 p-6 text-center text-sm text-slate-300">
      <span>{mensaje}</span>
      <button onClick={limpiar} className="rounded border border-sky-500 px-3 py-1 text-sky-300 transition-colors hover:bg-sky-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Limpiar filtros</button>
    </div>
  )
}

export function ErrorApi({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-950/30 p-6 text-center text-sm text-red-200">
      <span>No se pudo cargar: {mensaje}</span>
      <button onClick={onReintentar} className="rounded border border-red-400 px-3 py-1 transition-colors hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">Reintentar</button>
    </div>
  )
}

/** Envuelve una carga: muestra el estado correcto o los hijos. */
export function Estado({ cargando, error, reintentar, vacio, alto, children }: {
  cargando: boolean; error: string | null; reintentar: () => void; vacio?: boolean; alto?: number; children: ReactNode
}) {
  if (error) return <ErrorApi mensaje={error} onReintentar={reintentar} />
  if (cargando) return <Cargando alto={alto} />
  if (vacio) return <Vacio />
  return <>{children}</>
}
