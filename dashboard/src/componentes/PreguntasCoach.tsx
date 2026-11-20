// Preguntas sugeridas. La IA nunca sostiene el análisis: si no hay explicación, los chips solo guían la navegación.
import { useEffect, useState } from 'react'
import { getJSON } from '../api'
import { useFiltros } from '../FiltrosContext'
import { preguntas, rellenar, type PreguntaSugerida } from '../preguntas'
import type { Explicacion } from '../types'

type Pestana = 'lectura' | 'equipos' | 'efecto'

export default function PreguntasCoach({ irA, acento }: { irA?: (p: Pestana) => void; acento: string }) {
  const { filtros, setFiltro } = useFiltros()
  const [ia, setIa] = useState<boolean | null>(null) // null = comprobando
  const [abierta, setAbierta] = useState<string | null>(null)
  const [texto, setTexto] = useState<string | null>(null)
  const [nota, setNota] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  // Una sola llamada al montar para saber si la IA responde.
  useEffect(() => {
    const ac = new AbortController()
    getJSON<Explicacion>('explicacion', filtros, ac.signal)
      .then((e) => setIa(!!(e.disponible && e.texto)))
      .catch((e) => { if (e.name !== 'AbortError') setIa(false) })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function abrir(p: PreguntaSugerida) {
    setAbierta(p.id); setTexto(null); setNota(null); setCargando(true)
    let explicacion: Explicacion | null = null
    try { explicacion = await getJSON<Explicacion>('explicacion', filtros) } catch { explicacion = null }
    setCargando(false)
    if (explicacion?.disponible && explicacion.texto) { setTexto(explicacion.texto); return }
    // Sin IA: solo guía de navegación.
    const f = p.destino.filtros
    if (f?.down !== undefined) setFiltro('down', f.down)
    setNota(p.destino.nota)
    irA?.(p.destino.pestana)
  }

  return (
    <section aria-label="Preguntas sugeridas" className="rounded-lg border bg-slate-900/60 p-3" style={{ borderColor: acento + '66' }}>
      <h3 className="text-sm font-semibold" style={{ color: acento }}>Preguntas sugeridas</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {preguntas.map((p) => {
          const bloqueada = !!p.requiereEquipo && !filtros.equipo
          return (
            <button key={p.id} type="button" aria-disabled={bloqueada} title={bloqueada ? 'Elige un equipo' : undefined}
              onClick={() => { if (!bloqueada) void abrir(p) }}
              className={`rounded-full border px-3 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${bloqueada
                ? 'cursor-not-allowed border-slate-700 text-slate-500'
                : abierta === p.id ? 'border-sky-400 bg-sky-500/10 text-white' : 'border-slate-600 text-slate-200 hover:border-sky-400'}`}>
              {rellenar(p.plantilla, { equipo: filtros.equipo, down: filtros.down })}
            </button>
          )
        })}
      </div>
      {ia === false && <p className="mt-2 text-[11px] text-slate-400">IA no disponible: las preguntas sirven de guía.</p>}
      <div aria-live="polite">
        {cargando && <p className="mt-2 text-xs text-slate-400">Consultando…</p>}
        {texto && (
          <div className="mt-2 rounded border border-slate-700 bg-slate-800/60 p-2 text-sm text-slate-200">
            <p>{texto}</p>
            <p className="mt-1 text-[11px] text-slate-400">Explicación generada por IA a partir de las cifras de arriba</p>
          </div>
        )}
        {nota && <p className="mt-2 rounded border border-slate-700 bg-slate-800/60 p-2 text-xs text-slate-300">Guía: {nota}</p>}
      </div>
    </section>
  )
}
