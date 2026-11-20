// Iconos SVG propios (trazo, heredan el color del texto). Sin emojis ni imágenes externas.
import type { ReactNode } from 'react'

function Base({ children, tam = 16, relleno = false }: { children: ReactNode; tam?: number; relleno?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} aria-hidden fill={relleno ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="inline-block shrink-0 align-[-0.15em]">{children}</svg>
  )
}
type P = { tam?: number }

export const IcoAlerta = (p: P) => <Base {...p}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4.5M12 17.5v.01" /></Base>
export const IcoCheck = (p: P) => <Base {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Base>
export const IcoX = (p: P) => <Base {...p}><path d="M6 6l12 12M18 6 6 18" /></Base>
export const IcoAprox = (p: P) => <Base {...p}><path d="M5 9c2-2 4-2 7 0s5 2 7 0M5 15c2-2 4-2 7 0s5 2 7 0" /></Base>
export const IcoLibro = (p: P) => <Base {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /></Base>
export const IcoDiana = (p: P) => <Base {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></Base>
export const IcoBalon = (p: P) => <Base {...p}><ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-35 12 12)" /><path d="m9 15 6-6M10.5 10.5l1 1M12.5 12.5l1 1" /></Base>
export const IcoEscudo = (p: P) => <Base {...p}><path d="M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6L12 3Z" /><path d="m8.8 12 2.4 2.4 4-4.4" /></Base>
export const IcoFlecha = (p: P) => <Base {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Base>
export const IcoToque = (p: P) => <Base {...p}><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-.5a5 5 0 0 1-4-2L4.5 14a1.5 1.5 0 0 1 2.3-1.8L9 14" /></Base>
