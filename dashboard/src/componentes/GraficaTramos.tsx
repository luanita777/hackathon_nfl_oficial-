// Barras agrupadas de P(Man) por tramo de CB, una serie por número de safeties, con IC95%.
import { Bar, BarChart, CartesianGrid, ErrorBar, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import type { FilaTell } from '../types'
import { SAFETIES, TRAMOS, TRAMO_TXT, claveCelda } from '../lib/lectura'
import { MIN_N, esNum, pct, tema } from '../theme'

const COLORES = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6']

type Fila = Record<string, string | number | null | number[]>

// Arma los datos del gráfico; las celdas con n < 30 se omiten (valor null).
function datos(filas: FilaTell[]): Fila[] {
  const m = new Map(filas.map((f) => [claveCelda(f.tramo_cb, f.safeties_prof), f]))
  return TRAMOS.map((t) => {
    const d: Fila = { tramo: TRAMO_TXT[t] }
    SAFETIES.forEach((s) => {
      const f = m.get(claveCelda(t, s))
      const ok = !!f && esNum(f.est) && f.n >= MIN_N && f.lo !== null && f.hi !== null
      d[`p${s}`] = ok ? (f!.est as number) : null
      d[`e${s}`] = ok ? [(f!.est as number) - f!.lo!, f!.hi! - (f!.est as number)] : [0, 0]
      d[`n${s}`] = f?.n ?? 0
      d[`lo${s}`] = ok ? f!.lo! : null
      d[`hi${s}`] = ok ? f!.hi! : null
    })
    return d
  })
}

interface TipProps { active?: boolean; label?: string; payload?: { payload: Fila }[] }
function CajaTip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded border border-slate-600 bg-slate-900 p-2 text-xs text-slate-200">
      <b>CB {label}</b>
      {SAFETIES.map((s) => (
        <div key={s} style={{ color: COLORES[s] }}>
          {s} safeties: {esNum(d[`p${s}`]) ? `${pct(d[`p${s}`] as number)} (IC95% ${pct(d[`lo${s}`] as number)} a ${pct(d[`hi${s}`] as number)}, n=${d[`n${s}`]})` : `n insuficiente (n=${d[`n${s}`]})`}
        </div>
      ))}
    </div>
  )
}

export function GraficaTramos({ filas }: { filas: FilaTell[] }) {
  const d = datos(filas)
  return (
    <div>
      <div style={{ width: '100%', height: 230 }} role="img" aria-label="Barras de P(Man) por tramo de CB y número de safeties, con IC95%">
        <ResponsiveContainer>
          <BarChart data={d} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={tema.borde} strokeDasharray="3 3" />
            <XAxis dataKey="tramo" stroke={tema.textoSuave} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 1]} tickFormatter={(v: number) => pct(v, 0)} stroke={tema.textoSuave} tick={{ fontSize: 11 }} />
            <RTooltip content={<CajaTip />} cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {SAFETIES.map((s) => (
              <Bar key={s} dataKey={`p${s}`} name={`${s} safeties`} fill={COLORES[s]} isAnimationActive={false}>
                <ErrorBar dataKey={`e${s}`} width={4} strokeWidth={1.5} stroke="#e6ebf5" />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        Man/Zone/Otra apilado no disponible: la API solo sirve P(Man) por alineación. Barras con n &lt; {MIN_N} omitidas. Líneas = IC95%.
      </p>
    </div>
  )
}
