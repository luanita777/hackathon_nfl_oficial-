// "N de cada 10": diez muñequitos, N pintados. Solo formato visual de una proporción servida por la API.
export function Pictograma({ p, color, etiqueta }: { p: number; color: string; etiqueta?: string }) {
  const k = Math.max(0, Math.min(10, Math.round(p * 10)))
  return (
    <div className="flex items-center gap-3" role="img" aria-label={`${k} de cada 10${etiqueta ? ': ' + etiqueta : ''}`}>
      <div className="flex items-end gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <svg key={i} viewBox="0 0 14 24" width={16} height={28} className="pop" style={{ animationDelay: `${i * 50}ms` }} aria-hidden>
            <circle cx={7} cy={5} r={4.2} fill={i < k ? color : '#334155'} />
            <rect x={2} y={11} width={10} height={12} rx={4} fill={i < k ? color : '#334155'} />
          </svg>
        ))}
      </div>
      <span className="whitespace-nowrap text-sm font-bold" style={{ color }}>{k} de cada 10</span>
    </div>
  )
}
