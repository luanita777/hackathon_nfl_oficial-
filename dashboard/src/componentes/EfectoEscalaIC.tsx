// Barra de error horizontal del IC95% de una diferencia, con línea en 0. Solo dibuja lo que da la API.
import { tema } from '../theme'

export function EfectoEscalaIC({ est, lo, hi, unidad, etiqueta }: {
  est: number; lo: number; hi: number; unidad: string; etiqueta: string
}) {
  // La escala es simétrica alrededor de 0 para que la línea de 0 quede al centro (solo layout).
  const m = Math.max(Math.abs(lo), Math.abs(hi), Math.abs(est)) * 1.25 || 1
  const x = (v: number) => 150 + (v / m) * 140
  const cruza = lo <= 0 && 0 <= hi
  const color = cruza ? tema.neutro : tema.alerta
  return (
    <svg viewBox="0 0 300 54" role="img" className="w-full max-w-[300px]"
      aria-label={`${etiqueta}: IC95% de ${lo.toFixed(1)} a ${hi.toFixed(1)} ${unidad}`}>
      <line x1={10} x2={290} y1={22} y2={22} stroke={tema.borde} strokeWidth={1} />
      <line x1={150} x2={150} y1={8} y2={36} stroke={tema.texto} strokeWidth={1.5} strokeDasharray="3 2" />
      <line x1={x(lo)} x2={x(hi)} y1={22} y2={22} stroke={color} strokeWidth={3} />
      <line x1={x(lo)} x2={x(lo)} y1={16} y2={28} stroke={color} strokeWidth={2} />
      <line x1={x(hi)} x2={x(hi)} y1={16} y2={28} stroke={color} strokeWidth={2} />
      <circle cx={x(est)} cy={22} r={4} fill={color} />
      <text x={150} y={50} textAnchor="middle" fontSize={10} fill={tema.textoSuave}>0 = sin diferencia ({unidad})</text>
      <text x={10} y={50} fontSize={10} fill={tema.textoSuave}>{(-m).toFixed(1)}</text>
      <text x={290} y={50} textAnchor="end" fontSize={10} fill={tema.textoSuave}>+{m.toFixed(1)}</text>
    </svg>
  )
}
