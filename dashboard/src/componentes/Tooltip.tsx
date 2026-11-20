// Tooltip único. Se abre con mouse y con foco de teclado; se mantiene dentro de la pantalla.
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { glosario } from '../glosario'

/** <Tip t="p_man">P(Man)</Tip> muestra el texto con un "?" y la definición de glosario.p_man. */
export function Tip({ t, children, sinIcono }: { t: string; children?: ReactNode; sinIcono?: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [dx, setDx] = useState(0)
  const caja = useRef<HTMLSpanElement>(null)
  const id = useId()
  const def = glosario[t]

  useLayoutEffect(() => {
    if (!abierto || !caja.current) return
    const r = caja.current.getBoundingClientRect()
    const margen = 8
    let d = 0
    if (r.left < margen) d = margen - r.left
    else if (r.right > window.innerWidth - margen) d = window.innerWidth - margen - r.right
    setDx(d)
  }, [abierto])

  if (!def) return <>{children}</>
  return (
    <span className="relative inline-flex items-center gap-1"
      onMouseEnter={() => setAbierto(true)} onMouseLeave={() => setAbierto(false)}
      onFocus={() => setAbierto(true)} onBlur={() => setAbierto(false)}>
      {children}
      {!sinIcono && (
        <span tabIndex={0} role="img" aria-label={`Ayuda: ${def.titulo}`} aria-describedby={abierto ? id : undefined}
          className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-slate-500 text-[9px] leading-none text-slate-400 transition-colors hover:border-sky-400 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">?</span>
      )}
      {abierto && (
        <span ref={caja} id={id} role="tooltip" style={{ transform: `translateX(calc(-50% + ${dx}px))` }}
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-60 rounded-md border border-slate-600 bg-slate-900 p-2 text-left text-xs font-normal normal-case leading-snug text-slate-200 shadow-lg">
          <b className="block text-sky-300">{def.titulo}</b>{def.texto}
        </span>
      )}
    </span>
  )
}
