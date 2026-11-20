// Estado global de filtros. Cada cambio hace que todos los useApi recarguen.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Filtros } from './types'

interface Ctx {
  filtros: Filtros
  /** Cambia un filtro; semana y mitad son excluyentes. undefined lo quita. */
  setFiltro: <K extends keyof Filtros>(k: K, v: Filtros[K] | undefined) => void
  limpiar: () => void
}
const C = createContext<Ctx | null>(null)

export function FiltrosProvider({ children }: { children: ReactNode }) {
  const [filtros, setF] = useState<Filtros>({})
  const setFiltro = useCallback<Ctx['setFiltro']>((k, v) => {
    setF((prev) => {
      const sig: Filtros = { ...prev }
      if (v === undefined) delete sig[k]; else (sig as Record<string, unknown>)[k] = v
      if (k === 'semana' && v !== undefined) delete sig.mitad
      if (k === 'mitad' && v !== undefined) delete sig.semana
      return sig
    })
  }, [])
  const limpiar = useCallback(() => setF({}), [])
  const valor = useMemo(() => ({ filtros, setFiltro, limpiar }), [filtros, setFiltro, limpiar])
  return <C.Provider value={valor}>{children}</C.Provider>
}

export function useFiltros(): Ctx {
  const c = useContext(C)
  if (!c) throw new Error('useFiltros fuera de FiltrosProvider')
  return c
}
