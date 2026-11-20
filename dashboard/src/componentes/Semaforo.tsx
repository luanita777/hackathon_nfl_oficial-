// Semáforo de lectura: color + forma + texto (no depende solo del color).
import type { FilaTell } from '../types'
import { semaforoDe, type Color } from '../lib/lectura'
import { pct } from '../theme'
import { Tip } from './Tooltip'

const ESTILO: Record<Color, { nombre: string; relleno: string; clase: string }> = {
  verde: { nombre: 'Verde', relleno: '#34d399', clase: 'border-emerald-500/60' },
  ambar: { nombre: 'Ámbar', relleno: '#fbbf24', clase: 'border-amber-500/60' },
  rojo: { nombre: 'Rojo', relleno: '#f87171', clase: 'border-red-500/60' },
  gris: { nombre: 'Gris', relleno: '#64748b', clase: 'border-slate-500/60' },
}

/** Ícono: verde = círculo con ✓, ámbar = rombo con !, rojo = triángulo con ✕, gris = cuadrado con –. */
function Icono({ color }: { color: Color }) {
  const f = ESTILO[color].relleno
  return (
    <svg width={34} height={34} viewBox="0 0 34 34" aria-hidden className="shrink-0">
      {color === 'verde' && <circle cx={17} cy={17} r={15} fill={f} />}
      {color === 'ambar' && <polygon points="17,2 32,17 17,32 2,17" fill={f} />}
      {color === 'rojo' && <polygon points="17,3 32,30 2,30" fill={f} />}
      {color === 'gris' && <rect x={3} y={3} width={28} height={28} rx={3} fill={f} />}
      <text x={17} y={color === 'rojo' ? 26 : 22} textAnchor="middle" fontSize={16} fontWeight={800} fill="#0a0e17">
        {color === 'verde' ? '✓' : color === 'ambar' ? '!' : color === 'rojo' ? '✕' : '–'}
      </text>
    </svg>
  )
}

export function Semaforo({ fila }: { fila: FilaTell }) {
  const s = semaforoDe(fila)
  const e = ESTILO[s.color]
  const frase = s.color === 'gris' || s.lado === null || s.acierto === null || s.lo === null || s.hi === null
    ? 'Muy pocas jugadas: no hay lectura confiable'
    : `Si ves este acomodo, apuesta a ${s.lado}: acertarás en ${pct(s.acierto, 0)} de las veces (entre ${pct(s.lo, 0)} y ${pct(s.hi, 0)}; ${s.n} jugadas).`
  return (
    <div className={`rounded-lg border bg-slate-900/60 p-3 transition-colors duration-200 ${e.clase}`}>
      <div className="flex items-center gap-3" role="group" aria-label={`Semáforo ${e.nombre}: ${frase}`}>
        <Icono color={s.color} />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            <Tip t="semaforo">Semáforo: {e.nombre}</Tip>
          </div>
          <p className="text-sm text-slate-100">{frase}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-400">
        Regla: verde si el límite inferior del IC95% del acierto es ≥ 75%; ámbar si es ≥ 60%; rojo si es menor; gris si n &lt; 30.
      </p>
    </div>
  )
}
