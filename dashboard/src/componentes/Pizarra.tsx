// Pizarra: esquema de un trozo de campo con esquineros (CB) y safeties (S) al snap.
import type { TramoCb } from '../types'
import { TRAMO_TXT } from '../lib/lectura'
import { tema } from '../theme'

// Profundidad dibujada = CENTRO del tramo (no es un dato medido de una jugada).
const CENTRO_TRAMO: Record<TramoCb, number> = { '<=2': 1, '2-4': 3, '4-6': 5, '6-8': 7, '>8': 9.5 }
// 'Profundo' = a 8 yd o más de la línea de golpeo; se dibujan a ≈11 yd (ilustrativo).
const PROF_SAFETY = 11

const ANCHO = 300, LOS_Y = 190, ESC = 10 // 10 px por yarda
const yDe = (yd: number) => LOS_Y - yd * ESC

export function Pizarra({ tramo, safeties }: { tramo: TramoCb; safeties: number }) {
  const nS = Math.max(0, Math.min(3, Math.round(safeties)))
  const prof = CENTRO_TRAMO[tramo] ?? 5
  const txtTramo = TRAMO_TXT[tramo] ?? tramo
  const aria = `Pizarra ilustrativa: 2 esquineros a ${txtTramo} de la línea de golpeo y ${nS} safeties profundos (8 yd o más).`
  const xS = Array.from({ length: nS }, (_, i) => (ANCHO * (i + 1)) / (nS + 1))

  return (
    <figure className="m-0 w-full max-w-sm">
      <svg role="img" aria-label={aria} viewBox={`0 0 ${ANCHO} 210`} className="w-full rounded-lg border border-slate-700 bg-emerald-950/40">
        <title>{aria}</title>
        {/* Líneas de yardas cada 5 yd */}
        {[5, 10, 15].map((yd) => (
          <g key={yd}>
            <line x1={0} x2={ANCHO} y1={yDe(yd)} y2={yDe(yd)} stroke="#ffffff" strokeOpacity={0.18} strokeWidth={1} />
            <text x={4} y={yDe(yd) - 3} fontSize={9} fill={tema.textoSuave}>{yd} yd</text>
          </g>
        ))}
        {/* Línea de golpeo */}
        <line x1={0} x2={ANCHO} y1={LOS_Y} y2={LOS_Y} stroke={tema.acento} strokeWidth={2} />
        <text x={ANCHO - 4} y={LOS_Y + 14} fontSize={10} textAnchor="end" fill={tema.acento}>Línea de golpeo</text>
        {/* Esquineros: forma cuadrada con letra, a los lados */}
        {[40, ANCHO - 40].map((x) => (
          <g key={x} style={{ transition: 'transform 200ms ease' }}>
            <rect x={x - 11} y={yDe(prof) - 11} width={22} height={22} rx={3} fill={tema.man} stroke="#0a0e17" strokeWidth={1.5} />
            <text x={x} y={yDe(prof) + 4} fontSize={11} fontWeight={700} textAnchor="middle" fill="#0a0e17">CB</text>
          </g>
        ))}
        {/* Safeties: círculos a ≈11 yd */}
        {xS.map((x) => (
          <g key={x}>
            <circle cx={x} cy={yDe(PROF_SAFETY)} r={11} fill={tema.zone} stroke="#0a0e17" strokeWidth={1.5} />
            <text x={x} y={yDe(PROF_SAFETY) + 4} fontSize={11} fontWeight={700} textAnchor="middle" fill="#0a0e17">S</text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 space-y-0.5 text-[11px] leading-snug text-slate-400">
        <div className="flex flex-wrap gap-x-3">
          <span><span aria-hidden>■</span> CB: esquinero (2)</span>
          <span><span aria-hidden>●</span> S: safety profundo ({nS})</span>
        </div>
        <div>Esquema ilustrativo: la profundidad es la del tramo, no la posición real de una jugada</div>
      </figcaption>
    </figure>
  )
}
