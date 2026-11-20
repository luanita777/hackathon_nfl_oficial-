// Modo rival: "Cómo leer a [equipo]". Solo muestra lo que sirve la API.
import { useMemo } from 'react'
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import { colorAcento, paletaEquipo } from '../equipos'
import type { FilaEquipo, FilaTell } from '../types'
import { esNum, pct, miles, MIN_N } from '../theme'
import { TRAMO_TXT } from '../lib/lectura'
import { Insignia } from './Insignia'
import { Sello, nivelSello } from './Sello'
import { Tip } from './Tooltip'
import { Cargando, ErrorApi } from './Estados'

const NO_DISP = 'No disponible en la API'

/** Texto de una estimación servida: "40.3% (IC95% 29.7%–51.8%)" o "n insuficiente". */
function textoEst(e: { est: number | string; lo: number | null; hi: number | null } | undefined): string {
  if (!e || !esNum(e.est) || e.lo === null || e.hi === null) return 'n insuficiente'
  return `${pct(e.est)} (IC95% ${pct(e.lo)}–${pct(e.hi)})`
}

/** Los IC se traslapan si cada uno empieza antes de que termine el otro. */
function traslapan(a: FilaEquipo | undefined, b: FilaEquipo | undefined): boolean | null {
  if (!a || !b || a.lo === null || a.hi === null || b.lo === null || b.hi === null) return null
  return a.lo <= b.hi && b.lo <= a.hi
}

export function ModoRival({ equipo }: { equipo: string }) {
  const { filtros } = useFiltros()
  // Se quitan semana y mitad de la base: las mitades se piden aparte.
  const base = useMemo(() => { const { semana: _s, mitad: _m, ...r } = filtros; return { ...r, equipo } }, [filtros, equipo])
  const total = useApi<FilaEquipo[]>('equipos', { ...filtros, equipo })
  const h1 = useApi<FilaEquipo[]>('equipos', { ...base, mitad: '1-4' })
  const h2 = useApi<FilaEquipo[]>('equipos', { ...base, mitad: '5-8' })
  const tell = useApi<FilaTell[]>('tell', { ...filtros, equipo })

  const p = paletaEquipo(equipo)
  const acento = colorAcento(equipo)
  const fT = total.datos?.[0]
  const f1 = h1.datos?.[0], f2 = h2.datos?.[0]

  const top3 = useMemo(
    () => (tell.datos ?? []).filter((f) => f.tramo_cb !== null && f.safeties_prof !== null && f.n > 0).sort((a, b) => b.n - a.n).slice(0, 3),
    [tell.datos],
  )

  const cargando = total.cargando || h1.cargando || h2.cargando || tell.cargando
  const error = total.error ?? h1.error ?? h2.error ?? tell.error
  const reintentar = () => { total.recargar(); h1.recargar(); h2.recargar(); tell.recargar() }

  const traslape = traslapan(f1, f2)
  const pocoN = [fT, f1, f2].some((f) => !f || f.n < MIN_N)
  const fragil = pocoN || traslape === false
  const nivel = nivelSello({ n: fT?.n ?? 0, sostiene: !fragil })
  const motivo = pocoN ? `n < ${MIN_N} en el total o en una mitad` : traslape === false ? 'las mitades 1-4 y 5-8 no coinciden' : 'las dos mitades coinciden'

  return (
    <section aria-label={`Cómo leer a ${p.nombre}`} className="rounded-lg border bg-slate-900/50 p-4 text-sm text-slate-200 transition-colors duration-200"
      style={{ borderColor: acento }}>
      <header className="mb-3 flex items-center gap-3">
        <Insignia sigla={equipo} tam={44} />
        <div className="flex-1">
          <h3 className="text-base font-semibold" style={{ color: acento }}>Cómo leer a {p.nombre}</h3>
          <p className="text-xs text-slate-400">Defensa de {equipo}, semanas 1-8 de 2021</p>
        </div>
        {!cargando && !error && fT && fT.n > 0 && <Sello nivel={nivel} motivo={motivo} />}
      </header>

      {error ? <ErrorApi mensaje={error} onReintentar={reintentar} />
        : cargando ? <Cargando alto={160} />
        : !fT || fT.n === 0 ? <p className="text-slate-300">Sin jugadas de {equipo} con estos filtros.</p>
        : (
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400"><Tip t="tasa_disfraz">Tasa de disfraz</Tip></div>
              <div className="text-lg font-semibold">{textoEst(fT)}</div>
              <div className="text-xs text-slate-400"><Tip t="n">n</Tip> = {miles(fT.n)} jugadas con lectura clara · Contra la liga: {NO_DISP}</div>
              {fT.n < MIN_N && <p className="mt-1 text-xs text-amber-300">⚠ n &lt; {MIN_N}: la cifra no es confiable.</p>}
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400"><Tip t="mitades">¿Se sostiene entre mitades?</Tip></div>
              <ul className="text-xs text-slate-300">
                <li>Semanas 1-4: {textoEst(f1)} · n = {miles(f1?.n ?? 0)}</li>
                <li>Semanas 5-8: {textoEst(f2)} · n = {miles(f2?.n ?? 0)}</li>
              </ul>
              <p className="text-xs">
                {pocoN ? <span className="text-amber-300">⚠ Frágil: alguna cifra tiene n &lt; {MIN_N}, no se puede comparar bien.</span>
                  : traslape ? <span>Los IC95% de las dos mitades se traslapan: no hay evidencia de que el equipo cambiara.</span>
                  : <span className="text-amber-300">⚠ Los IC95% no se traslapan: el equipo se vio distinto entre mitades.</span>}
              </p>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Alineaciones con más jugadas: <Tip t="p_man">P(Man)</Tip></div>
              {top3.length === 0 ? <p className="text-xs text-slate-400">Sin alineaciones con datos.</p> : (
                <ol className="space-y-1 text-xs">
                  {top3.map((f) => (
                    <li key={`${f.tramo_cb}|${f.safeties_prof}`} className="rounded border border-slate-700 px-2 py-1">
                      CB {TRAMO_TXT[f.tramo_cb as string]} · {f.safeties_prof} safeties: <b>{textoEst(f)}</b>{' '}
                      <span className="text-slate-400">n = {miles(f.n)}</span>{f.n < MIN_N && <span className="text-amber-300"> ⚠ n &lt; {MIN_N}</span>}
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-1 text-xs text-slate-400">En qué alineaciones engaña más: {NO_DISP}.</p>
            </div>
          </div>
        )}
    </section>
  )
}
