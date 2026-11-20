// Cliente de la API. Rutas SIN diagonal inicial (el sitio se publica en una subruta).
import { useCallback, useEffect, useState } from 'react'
import type { Filtros } from './types'

/** Arma la query solo con filtros presentes. */
export function queryDe(f: Filtros): string {
  const p = new URLSearchParams()
  Object.entries(f).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** GET api/<ruta> con los filtros. Lanza Error con el texto en español del backend si falla. */
export async function getJSON<T>(ruta: string, filtros: Filtros = {}, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`api/${ruta}${queryDe(filtros)}`, { signal })
  if (!r.ok) {
    let msg = `Error ${r.status}`
    try { const j = await r.json(); if (j?.detail) msg = String(j.detail) } catch { /* sin cuerpo */ }
    throw new Error(msg)
  }
  return r.json() as Promise<T>
}

export interface EstadoApi<T> { datos: T | null; cargando: boolean; error: string | null; recargar: () => void }

/** Hook: carga api/<ruta> cada vez que cambian los filtros. */
export function useApi<T>(ruta: string, filtros: Filtros): EstadoApi<T> {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const clave = queryDe(filtros)
  useEffect(() => {
    const ac = new AbortController()
    setCargando(true); setError(null)
    getJSON<T>(ruta, filtros, ac.signal)
      .then((d) => { setDatos(d); setCargando(false) })
      .catch((e) => { if (e.name !== 'AbortError') { setError(e.message || 'Error de red'); setCargando(false) } })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta, clave, tick])
  const recargar = useCallback(() => setTick((t) => t + 1), [])
  return { datos, cargando, error, recargar }
}
