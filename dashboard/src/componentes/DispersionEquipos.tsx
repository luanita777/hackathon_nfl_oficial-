// Dispersión de equipos: x = n de jugadas con lectura clara, y = tasa de disfraz con barras IC95% (todo servido por la API).
import { CartesianGrid, ErrorBar, ResponsiveContainer, Scatter, ScatterChart, Tooltip as TT, XAxis, YAxis } from 'recharts'
import { colorAcento } from '../equipos'
import { esNum, MIN_N, pct, tema } from '../theme'
import type { FilaEquipo } from '../types'

interface Punto { equipo: string; n: number; est: number; lo: number; hi: number; poco: boolean }

/** Separa los equipos dibujables de los que no tienen cifra numérica. */
export function separar(filas: FilaEquipo[]): { puntos: Punto[]; sinCifra: FilaEquipo[] } {
  const puntos: Punto[] = []
  const sinCifra: FilaEquipo[] = []
  for (const f of filas) {
    if (!f.equipo) continue
    if (!esNum(f.est) || f.lo === null || f.hi === null) sinCifra.push(f)
    else puntos.push({ equipo: f.equipo, n: f.n, est: f.est, lo: f.lo, hi: f.hi, poco: f.n < MIN_N })
  }
  return { puntos, sinCifra }
}

// Punto del equipo con su color; atenuado y con asterisco si n < 30. Clic = elegir equipo.
function Marca(props: { cx?: number; cy?: number; payload?: Punto; sel?: string; onElegir: (s: string) => void }) {
  const { cx, cy, payload, sel, onElegir } = props
  if (cx === undefined || cy === undefined || !payload) return <g />
  const c = colorAcento(payload.equipo)
  const activo = sel === payload.equipo
  return (
    <g style={{ cursor: 'pointer' }} opacity={payload.poco ? 0.4 : sel && !activo ? 0.6 : 1} onClick={() => onElegir(payload.equipo)}>
      <circle cx={cx} cy={cy} r={activo ? 8 : 5.5} fill={c} stroke={activo ? '#fff' : '#0a0e17'} strokeWidth={activo ? 2 : 1} />
      <text x={cx + 8} y={cy - 6} fontSize={9} fill={tema.textoSuave}>{payload.equipo}{payload.poco ? '*' : ''}</text>
    </g>
  )
}

function Caja({ active, payload }: { active?: boolean; payload?: { payload: Punto }[] }) {
  const p = active && payload?.[0]?.payload
  if (!p) return null
  return (
    <div className="rounded-md border border-slate-600 bg-slate-900 p-2 text-xs text-slate-200 shadow-lg">
      <b style={{ color: colorAcento(p.equipo) }}>{p.equipo}</b>
      <div>n = {p.n} jugadas con lectura clara{p.poco ? ' *' : ''}</div>
      <div>Tasa de disfraz: {pct(p.est)}</div>
      <div>IC95%: {pct(p.lo)} a {pct(p.hi)}</div>
      {p.poco && <div className="text-amber-300">n &lt; {MIN_N}: poco confiable</div>}
    </div>
  )
}

export default function DispersionEquipos({ filas, seleccionado, onElegir }: {
  filas: FilaEquipo[]; seleccionado?: string; onElegir: (sigla: string) => void
}) {
  const { puntos, sinCifra } = separar(filas)
  // Solo el borde superior del eje: el máximo de los límites que sirve la API, redondeado hacia arriba.
  const tope = Math.min(1, Math.ceil(Math.max(0.05, ...puntos.map((p) => p.hi)) * 20) / 20)
  return (
    <div>
      <div className="h-[340px] w-full" role="img" aria-label="Dispersión de equipos: n de jugadas contra tasa de disfraz con IC95%">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 4 }}>
            <CartesianGrid stroke={tema.borde} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="n" name="n" stroke={tema.textoSuave} tick={{ fontSize: 11 }}
              label={{ value: 'n: jugadas con lectura clara', position: 'insideBottom', offset: -12, fill: tema.textoSuave, fontSize: 11 }} />
            <YAxis type="number" dataKey="est" name="Tasa de disfraz" domain={[0, tope]} stroke={tema.textoSuave} tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => pct(v, 0)} width={44} />
            <TT content={<Caja />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={puntos} isAnimationActive={false}
              shape={(p: object) => <Marca {...(p as { cx?: number; cy?: number; payload?: Punto })} sel={seleccionado} onElegir={onElegir} />}>
              {/* Distancias hacia abajo y arriba para dibujar las barras con lo/hi servidos. */}
              <ErrorBar dataKey={(p: Punto) => [p.est - p.lo, p.hi - p.est]} direction="y" width={4} stroke={tema.neutro} strokeWidth={1} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-slate-400">Línea de la liga: no disponible en la API. * = n &lt; {MIN_N}, punto atenuado. Clic en un punto para elegir equipo.</p>
      {sinCifra.length > 0 && (
        <p className="mt-1 text-xs text-amber-300">
          Sin cifra para dibujar: {sinCifra.map((f) => `${f.equipo} (n=${f.n}, ${String(f.est)})`).join('; ')}
        </p>
      )}
    </div>
  )
}
