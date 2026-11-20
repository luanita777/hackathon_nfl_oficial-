// Estructura de la app: encabezado, filtros pegajosos, pestañas accesibles y pie de metodología.
import { useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import BarraFiltros from './componentes/BarraFiltros'
import Metodologia from './componentes/Metodologia'
import Contexto from './pestanas/Contexto'
import Efecto from './pestanas/Efecto'
import Equipos from './pestanas/Equipos'
import Lectura from './pestanas/Lectura'

const PESTANAS = [
  { id: 'contexto', nombre: '1 · Qué es Man y Zone', Comp: Contexto },
  { id: 'lectura', nombre: '2 · La respuesta', Comp: Lectura },
  { id: 'equipos', nombre: '3 · Por equipo', Comp: Equipos },
  { id: 'efecto', nombre: '4 · Pruebas', Comp: Efecto },
] as const

export default function App() {
  const [activa, setActiva] = useState(0) // empieza en 'Qué es Man y Zone'
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  // Flechas, Inicio y Fin cambian de pestaña y mueven el foco.
  function teclado(e: KeyboardEvent) {
    const n = PESTANAS.length
    let sig = activa
    if (e.key === 'ArrowRight') sig = (activa + 1) % n
    else if (e.key === 'ArrowLeft') sig = (activa - 1 + n) % n
    else if (e.key === 'Home') sig = 0
    else if (e.key === 'End') sig = n - 1
    else return
    e.preventDefault()
    setActiva(sig)
    refs.current[sig]?.focus()
  }

  // Se desmontan las pestañas inactivas: cada una pide sus datos y así no se hacen llamadas de más.
  const Activa: ComponentType<{ irA?: (p: 'lectura' | 'equipos' | 'efecto') => void }> = PESTANAS[activa].Comp
  const irA = (p: 'lectura' | 'equipos' | 'efecto') => { setActiva(PESTANAS.findIndex((x) => x.id === p)); window.scrollTo({ top: 0 }) }

  return (
    <div className="min-h-full bg-[#0a0e17] text-slate-100">
      <header className="mx-auto max-w-[1366px] px-4 pb-1 pt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Vista de coach · NFL 2021, semanas 1-8</p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">¿Qué tanto delata la defensa su cobertura antes del snap?</h1>
        <p className="mt-1 text-sm text-slate-400">Si ves cómo se acomoda la defensa, ¿puedes adivinar si va a marcar hombre a hombre (Man) o por zonas (Zone)?</p>
      </header>
      <div className="sticky top-0 z-40 border-b border-slate-700/70 bg-[#0a0e17]/95 backdrop-blur">
        <div className="mx-auto max-w-[1366px] px-4">
          {activa > 0 && <div className="py-1.5"><BarraFiltros /></div>}
          <div role="tablist" aria-label="Secciones" className="-mb-px flex gap-1" onKeyDown={teclado}>
            {PESTANAS.map((p, i) => (
              <button key={p.id} ref={(el) => { refs.current[i] = el }} type="button" role="tab" id={`tab-${p.id}`}
                aria-selected={i === activa} aria-controls={`panel-${p.id}`} tabIndex={i === activa ? 0 : -1}
                onClick={() => setActiva(i)}
                className={`rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium transition-colors duration-150 ${i === activa
                  ? 'border-slate-600 bg-slate-800 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-100'}`}>
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1366px] space-y-3 px-4 py-3">
        <div role="tabpanel" id={`panel-${PESTANAS[activa].id}`} aria-labelledby={`tab-${PESTANAS[activa].id}`} tabIndex={0}>
          <Activa irA={irA} />
        </div>
        <Metodologia />
      </main>
    </div>
  )
}
