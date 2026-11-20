// Estructura de la app: encabezado, filtros pegajosos, pestañas accesibles y pie de metodología.
import { useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import BarraFiltros from './componentes/BarraFiltros'
import Metodologia from './componentes/Metodologia'
import Contexto from './pestanas/Contexto'
import Efecto from './pestanas/Efecto'
import Equipos from './pestanas/Equipos'
import Lectura from './pestanas/Lectura'
import { IcoLibro, IcoDiana, IcoEscudo, IcoCheck, IcoBalon } from './componentes/Iconos'

const PESTANAS = [
  { id: 'contexto', nombre: 'Qué es Man y Zone', Ico: IcoLibro, Comp: Contexto },
  { id: 'lectura', nombre: 'La respuesta', Ico: IcoDiana, Comp: Lectura },
  { id: 'equipos', nombre: 'Por equipo', Ico: IcoEscudo, Comp: Equipos },
  { id: 'efecto', nombre: 'Pruebas', Ico: IcoCheck, Comp: Efecto },
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
      <header className="hero">
        <div className="mx-auto max-w-[1366px] px-4 pb-3 pt-4">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-sky-300"><IcoBalon tam={14} /> Vista de coach · NFL 2021 · semanas 1-8</p>
          <h1 className="bg-gradient-to-r from-white via-sky-100 to-amber-200 bg-clip-text text-3xl font-black leading-[1.1] tracking-tight text-transparent md:text-4xl">¿Qué tanto delata la defensa su cobertura antes del snap?</h1>
          <p className="mt-1 text-sm text-slate-300">Si ves cómo se acomoda la defensa, ¿puedes adivinar si va a marcar <b className="text-amber-300">hombre a hombre (Man)</b> o <b className="text-sky-300">por zonas (Zone)</b>?</p>
        </div>
      </header>
      <div className="sticky top-0 z-40 border-b border-slate-800 bg-[#0a0e17]/90 backdrop-blur-md">
        <div className="mx-auto max-w-[1366px] px-4">
                    <div role="tablist" aria-label="Secciones" className="flex gap-1.5 py-2" onKeyDown={teclado}>
            {PESTANAS.map((p, i) => (
              <button key={p.id} ref={(el) => { refs.current[i] = el }} type="button" role="tab" id={`tab-${p.id}`}
                aria-selected={i === activa} aria-controls={`panel-${p.id}`} tabIndex={i === activa ? 0 : -1}
                onClick={() => setActiva(i)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${i === activa
                  ? 'border-sky-400/60 bg-gradient-to-b from-sky-500/30 to-sky-500/10 text-white shadow-[0_0_18px_-4px_rgba(56,189,248,.6)]'
                  : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-100'}`}>
                <p.Ico tam={16} /> {p.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1366px] space-y-3 px-4 py-3">
        {activa > 0 && <BarraFiltros />}
        <div role="tabpanel" id={`panel-${PESTANAS[activa].id}`} aria-labelledby={`tab-${PESTANAS[activa].id}`} tabIndex={0}>
          <Activa irA={irA} />
        </div>
        <Metodologia />
      </main>
    </div>
  )
}
