// Dispersión por equipo: tasa de disfraz semanas 1-4 (x) vs 5-8 (y). Los números salen de validacion.
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip as RTip, XAxis, YAxis } from 'recharts'
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import { Estado } from './Estados'
import { Sello } from './Sello'
import { Tip } from './Tooltip'
import { paletaEquipo } from '../equipos'
import { esNum, MIN_N, num, pct, tema } from '../theme'
import type { FilaEquipo, Filtros, Validacion } from '../types'

interface Punto { equipo: string; x: number; y: number; n1: number; n2: number; chico: boolean }

export function ValidacionMitades({ val }: { val: Validacion | null }) {
  const { filtros } = useFiltros()
  // La comparación de mitades ignora equipo, semana y mitad del filtro global.
  const base: Filtros = { ...filtros }
  delete base.equipo; delete base.semana; delete base.mitad
  const a = useApi<FilaEquipo[]>('equipos', { ...base, mitad: '1-4' })
  const b = useApi<FilaEquipo[]>('equipos', { ...base, mitad: '5-8' })

  const puntos: Punto[] = []
  if (a.datos && b.datos) {
    const m2 = new Map(b.datos.filter((f) => f.equipo).map((f) => [f.equipo as string, f]))
    for (const f of a.datos) {
      const g = f.equipo ? m2.get(f.equipo) : undefined
      if (f.equipo && g && esNum(f.est) && esNum(g.est))
        puntos.push({ equipo: f.equipo, x: f.est, y: g.est, n1: f.n, n2: g.n, chico: f.n < MIN_N || g.n < MIN_N })
    }
  }
  // Mismo tope en ambos ejes para que la diagonal y = x sea fiel (solo layout).
  const tope = Math.min(1, Math.ceil(Math.max(0.1, ...puntos.flatMap((p) => [p.x, p.y])) * 10) / 10)
  const em = val?.criterios?.estabilidad_mitades
  const fragil = em?.resultado === 'no pasa'

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-3" aria-label="Estabilidad por mitades">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold"><Tip t="mitades">Estabilidad por mitades: tasa de disfraz por equipo</Tip></h3>
        {em ? <Sello nivel={fragil ? 'fragil' : 'solido'} motivo={fragil ? 'No se sostiene entre mitades' : undefined} /> : null}
      </header>
      <Estado cargando={a.cargando || b.cargando} error={a.error || b.error} reintentar={() => { a.recargar(); b.recargar() }}
        vacio={puntos.length === 0} alto={220}>
        <div className="h-60" role="img" aria-label="Dispersión de tasa de disfraz por equipo, semanas 1-4 contra semanas 5-8">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, left: 4, bottom: 18 }}>
              <CartesianGrid stroke={tema.borde} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" domain={[0, tope]} tickFormatter={(v: number) => pct(v, 0)} tick={{ fill: tema.textoSuave, fontSize: 11 }}
                label={{ value: 'Tasa de disfraz, semanas 1-4', position: 'insideBottom', offset: -10, fill: tema.textoSuave, fontSize: 11 }} />
              <YAxis type="number" dataKey="y" domain={[0, tope]} tickFormatter={(v: number) => pct(v, 0)} tick={{ fill: tema.textoSuave, fontSize: 11 }}
                label={{ value: 'Semanas 5-8', angle: -90, position: 'insideLeft', fill: tema.textoSuave, fontSize: 11 }} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: tope, y: tope }]} stroke={tema.textoSuave} strokeDasharray="5 4"
                label={{ value: 'y = x (sin cambio)', position: 'insideTopLeft', fill: tema.textoSuave, fontSize: 10 }} />
              <RTip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                const p = active ? (payload?.[0]?.payload as Punto | undefined) : undefined
                if (!p) return null
                return (
                  <div className="rounded border border-slate-600 bg-slate-900 p-2 text-xs text-slate-100">
                    <b>{paletaEquipo(p.equipo).nombre}</b>
                    <div>Semanas 1-4: {pct(p.x)} (n = {p.n1})</div>
                    <div>Semanas 5-8: {pct(p.y)} (n = {p.n2})</div>
                    {p.chico && <div className="text-amber-300">⚠ n &lt; {MIN_N}</div>}
                  </div>
                )
              }} />
              <Scatter data={puntos} isAnimationActive={false}
                shape={(props: { cx?: number; cy?: number; payload?: Punto }) => {
                  const { cx = 0, cy = 0, payload: p } = props
                  if (!p) return <g />
                  const col = paletaEquipo(p.equipo).primario
                  return (
                    <g opacity={p.chico ? 0.35 : 1}>
                      <circle cx={cx} cy={cy} r={6} fill={col} stroke={tema.texto} strokeWidth={1} />
                      <text x={cx + 8} y={cy + 3} fontSize={9} fill={tema.textoSuave}>{p.equipo}</text>
                    </g>
                  )
                }} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {em && (
          <p className="text-xs text-slate-200">
            Correlación (Pearson) <b>{esNum(em.pearson) ? num(em.pearson, 3) : 'n insuficiente'}</b>, Spearman <b>{esNum(em.spearman) ? num(em.spearman, 3) : 'n insuficiente'}</b>,
            p de permutación <b>{esNum(em.p_permutacion_pearson) ? num(em.p_permutacion_pearson, 3) : 'n insuficiente'}</b> ({em.n_equipos} equipos).
          </p>
        )}
        {fragil && <p className="mt-1 text-xs text-amber-300" role="alert">⚠ Frágil: no se sostiene entre mitades. El orden de los equipos en semanas 1-4 no predice el de 5-8; no uses el ranking por equipo.</p>}
        {puntos.some((p) => p.chico) && <p className="text-xs text-amber-300">Puntos atenuados: n &lt; {MIN_N} en alguna mitad.</p>}
      </Estado>
    </section>
  )
}
