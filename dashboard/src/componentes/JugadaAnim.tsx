// Dibujos animados (SVG + SMIL, sin librerías) de Man y Zone. Ilustrativos: no son datos.

// Rutas de los receptores (desplazamientos x y de la jugada).
const RUTAS = ['0 0; 10 -70; 55 -105; 55 -105; 0 0', '0 0; 0 -60; -35 -100; -35 -100; 0 0', '0 0; -10 -75; -55 -95; -55 -95; 0 0']
const XS = [60, 150, 240]
const T = '0;0.35;0.7;0.85;1'

function Jugador({ x, y, ruta, color, cuadrado, retraso = 0, escala = 1 }: { x: number; y: number; ruta: string; color: string; cuadrado?: boolean; retraso?: number; escala?: number }) {
  return (
    <g>
      {cuadrado ? <rect x={x - 7} y={y - 7} width={14} height={14} rx={2} fill={color} /> : <circle cx={x} cy={y} r={7} fill={color} />}
      <animateTransform attributeName="transform" type="translate" values={ruta.split(';').map((v) => v.trim().split(' ').map((n) => Number(n) * escala).join(' ')).join('; ')}
        keyTimes={T} dur="5s" begin={`${retraso}s`} repeatCount="indefinite" />
    </g>
  )
}

export function JugadaAnim({ tipo }: { tipo: 'man' | 'zone' }) {
  const man = tipo === 'man'
  return (
    <svg viewBox="0 0 300 170" role="img" className="mx-auto w-full max-w-[420px] rounded-lg border border-slate-700 bg-emerald-950/30"
      aria-label={man ? 'Animación: cada defensor persigue a un receptor' : 'Animación: cada defensor cuida una zona del campo'}>
      {/* línea de golpeo */}
      <line x1={0} y1={140} x2={300} y2={140} stroke="#94a3b8" strokeDasharray="4 4" />
      <text x={6} y={156} fontSize={9} fill="#94a3b8">línea de golpeo (snap)</text>
      {!man && [0, 1, 2].map((i) => (
        <rect key={i} x={8 + i * 98} y={14} width={92} height={96} rx={6} fill={['#38bdf8', '#a78bfa', '#34d399'][i]} opacity={0.14} stroke={['#38bdf8', '#a78bfa', '#34d399'][i]} strokeDasharray="3 3" />
      ))}
      {XS.map((x, i) => (
        <g key={i}>
          <Jugador x={x} y={man ? 118 : 70} ruta={man ? RUTAS[i] : '0 0; 0 -6; 0 4; 0 -6; 0 0'} color="#38bdf8" cuadrado retraso={man ? 0.3 : 0} />
          <Jugador x={x} y={135} ruta={RUTAS[i]} color="#f59e0b" />
        </g>
      ))}
      {man && XS.map((x, i) => <line key={i} x1={x} y1={118} x2={x} y2={135} stroke="#f59e0b" strokeOpacity={0.35} />)}
      <text x={294} y={12} textAnchor="end" fontSize={9} fill="#38bdf8">■ defensa</text>
      <text x={294} y={24} textAnchor="end" fontSize={9} fill="#f59e0b">● receptores</text>
    </svg>
  )
}
