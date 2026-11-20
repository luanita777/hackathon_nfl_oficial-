// Preguntas guía con respuesta concreta: cada una consulta la API y contesta con cifras reales.
// La IA es opcional: si responde, se añade debajo; el análisis nunca depende de ella.
import { useEffect, useState } from 'react'
import { getJSON } from '../api'
import { useFiltros } from '../FiltrosContext'
import { preguntas, rellenar, type PreguntaSugerida } from '../preguntas'
import { MIN_N, esNum, miles, pct, con } from '../theme'
import type { Efecto, Explicacion, FilaEquipo, FilaTell, Validacion, Filtros } from '../types'
import { TRAMO_TXT } from '../lib/lectura'

type Pestana = 'lectura' | 'equipos' | 'efecto'
interface Respuesta { titulo: string; detalle: string[]; aviso?: string }

const sinEq = (f: Filtros): Filtros => { const { equipo: _e, ...r } = f; return r }
const fila = (l: FilaEquipo[], eq?: string) => l.find((x) => x.equipo === eq)
const dec = (r: FilaEquipo | undefined) => (r && esNum(r.est) && r.n >= MIN_N ? r : null)
const tasa = (r: FilaEquipo) => `${pct(r.est as number, 0)} (entre ${pct(r.lo as number, 0)} y ${pct(r.hi as number, 0)}; ${miles(r.n)} jugadas)`

// Cada función contesta con datos reales de la API; todo texto sale de una cifra servida.
async function responder(id: string, f: Filtros): Promise<Respuesta> {
  const eq = f.equipo
  if (id === 'confiar-equipo') {
    const [t, a, b] = await Promise.all([
      getJSON<FilaEquipo[]>('equipos', f),
      getJSON<FilaEquipo[]>('equipos', { ...f, mitad: '1-4', semana: undefined }),
      getJSON<FilaEquipo[]>('equipos', { ...f, mitad: '5-8', semana: undefined }),
    ])
    const r = dec(fila(t, eq))
    if (!r) return { titulo: `Todavía no: hay muy pocas jugadas de ${eq} con estos filtros.`, detalle: [] }
    const ra = dec(fila(a, eq)), rb = dec(fila(b, eq))
    return {
      titulo: `Con ${eq}, la defensa te engaña ${Math.round((r.est as number) * 10)} de cada 10 veces que la alineación da una pista clara.`,
      detalle: [`Tasa de engaño: ${tasa(r)}.`,
        ra && rb ? `Semanas 1-4: ${pct(ra.est as number, 0)}; semanas 5-8: ${pct(rb.est as number, 0)}.` : 'Una de las dos mitades tiene muy pocas jugadas: no se puede comparar.'],
      aviso: 'Entre menos engaño, más puedes confiar en lo que ves antes del snap.',
    }
  }
  if (id === 'down-disfraz') {
    if (!eq) return { titulo: 'Elige un equipo (arriba, en "Defensa") para ver en qué down engaña más.', detalle: [] }
    const ls = await Promise.all([1, 2, 3, 4].map((d) => getJSON<FilaEquipo[]>('equipos', { ...f, down: d as 1 | 2 | 3 | 4 }).then((l) => [d, dec(fila(l, eq))] as const)))
    const ok = ls.filter((x): x is readonly [number, FilaEquipo] => x[1] !== null)
    if (!ok.length) return { titulo: `Ningún down de ${eq} tiene jugadas suficientes (mínimo ${MIN_N}).`, detalle: [] }
    const m = ok.reduce((x, y) => ((y[1].est as number) > (x[1].est as number) ? y : x))
    return {
      titulo: `${eq} engaña más en ${m[0]}.º down: ${pct(m[1].est as number, 0)} de las veces.`,
      detalle: ls.map(([d, r]) => `${d}.º down: ${r ? tasa(r) : `pocas jugadas (menos de ${MIN_N})`}`),
      aviso: 'Las diferencias entre downs pueden ser ruido si los márgenes de error se traslapan.',
    }
  }
  if (id === 'alineacion-enganosa') {
    const t = (await getJSON<FilaTell[]>('tell', f)).filter((x) => esNum(x.est) && x.n >= MIN_N && x.tramo_cb !== null)
    if (!t.length) return { titulo: 'No hay acomodos con jugadas suficientes con estos filtros.', detalle: [] }
    const m = t.reduce((x, y) => (Math.abs((y.est as number) - 0.5) < Math.abs((x.est as number) - 0.5) ? y : x))
    return {
      titulo: `El acomodo más difícil de leer: esquineros a ${TRAMO_TXT[m.tramo_cb as string]} y ${m.safeties_prof} safeties al fondo.`,
      detalle: [`Ahí la defensa juega Man ${pct(m.est as number, 0)} de las veces: casi una moneda al aire (${miles(m.n)} jugadas).`],
      aviso: 'Medimos "difícil de leer" como el acomodo más cercano a 50-50 Man/Zone; la API no da el engaño por acomodo.',
    }
  }
  if (id === 'sostiene-mitades') {
    const v = await getJSON<Validacion>('validacion', f)
    const c = v.confirmacion
    if (!c || !esNum(c.descubrimiento.est) || !esNum(c.confirmacion.est))
      return { titulo: 'No se puede saber: hay muy pocas jugadas en alguna mitad.', detalle: [] }
    return {
      titulo: v.se_sostiene ? 'Sí, se repite en las dos mitades de la temporada.' : 'No: el resultado cambia entre mitades.',
      detalle: [`Diferencia entre esquineros cerca y lejos: ${con((c.descubrimiento.est as number) * 100, 0)} puntos de Man en semanas 1-4 y ${con((c.confirmacion.est as number) * 100, 0)} en semanas 5-8.`],
    }
  }
  if (id === 'efecto-completos') {
    const e = await getJSON<Efecto>('efecto', f)
    const c = e.completos
    if (!esNum(c.est) || c.lo === null || c.hi === null) return { titulo: 'Muy pocas jugadas para medirlo.', detalle: [] }
    const claro = c.lo > 0 || c.hi < 0
    return {
      titulo: claro ? `Cuando la defensa disfraza, se completan ${Math.abs(c.est).toFixed(1)} puntos ${c.est < 0 ? 'menos' : 'más'} de pases.`
        : 'No se nota una diferencia clara en pases completos.',
      detalle: [`Con disfraz: ${(c.p_a as number).toFixed(1)}% completos; sin disfraz: ${(c.p_b as number).toFixed(1)}% (${miles(e.n_con_disfraz)} y ${miles(e.n_sin_disfraz)} jugadas).`,
        `Margen de error de la diferencia: de ${con(c.lo)} a ${con(c.hi)} puntos.`],
      aviso: 'Es una asociación observada, no prueba que el disfraz sea la causa.',
    }
  }
  // equipos-disfrazan
  const [l, v] = await Promise.all([getJSON<FilaEquipo[]>('equipos', sinEq(f)), getJSON<Validacion>('validacion', sinEq(f))])
  const top = l.filter((x) => x.equipo && dec(x)).sort((a, b) => (b.est as number) - (a.est as number)).slice(0, 3)
  if (!top.length) return { titulo: 'Ningún equipo tiene jugadas suficientes con estos filtros.', detalle: [] }
  const estable = v.criterios?.estabilidad_mitades.resultado === 'pasa'
  return {
    titulo: `${top[0].equipo} es quien más engaña: ${pct(top[0].est as number, 0)} de las veces.`,
    detalle: top.map((x, i) => `${i + 1}. ${x.equipo}: ${tasa(x)}`),
    aviso: estable ? undefined : 'Ojo: este orden NO se repite entre la primera y la segunda mitad de la temporada; no lo uses para decidir.',
  }
}

export default function PreguntasCoach({ acento }: { irA?: (p: Pestana) => void; acento: string }) {
  const { filtros } = useFiltros()
  const [abierta, setAbierta] = useState<string | null>(null)
  const [resp, setResp] = useState<Respuesta | null>(null)
  const [ia, setIa] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clave = JSON.stringify(filtros)
  useEffect(() => { setAbierta(null); setResp(null); setIa(null); setError(null) }, [clave]) // los filtros cambian: la respuesta vieja ya no aplica

  async function abrir(p: PreguntaSugerida) {
    setAbierta(p.id); setResp(null); setIa(null); setError(null); setCargando(true)
    try {
      setResp(await responder(p.id, filtros))
      getJSON<Explicacion>('explicacion', filtros).then((e) => { if (e.disponible && e.texto) setIa(e.texto) }).catch(() => undefined)
    } catch (e) { setError((e as Error).message) }
    setCargando(false)
  }

  return (
    <section aria-label="Preguntas guía" className="rounded-xl border bg-slate-900/60 p-4" style={{ borderColor: acento + '66' }}>
      <h3 className="text-base font-bold" style={{ color: acento }}>Preguntas para el coach</h3>
      <p className="text-xs text-slate-400">Toca una pregunta y te contestamos con los datos de los filtros activos.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {preguntas.map((p) => {
          const bloqueada = !!p.requiereEquipo && !filtros.equipo
          return (
            <button key={p.id} type="button" aria-disabled={bloqueada} title={bloqueada ? 'Elige un equipo' : undefined}
              onClick={() => { if (!bloqueada) void abrir(p) }}
              className={`rounded-full border px-3 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${bloqueada
                ? 'cursor-not-allowed border-slate-700 text-slate-500'
                : abierta === p.id ? 'border-sky-400 bg-sky-500/10 text-white' : 'border-slate-600 text-slate-200 hover:border-sky-400'}`}>
              {rellenar(p.plantilla.replace(' (ahora: [down])', ''), { equipo: filtros.equipo, down: filtros.down })}
            </button>
          )
        })}
      </div>
      <div aria-live="polite">
        {cargando && <p className="mt-3 text-xs text-slate-400">Consultando los datos…</p>}
        {error && <p className="mt-3 text-xs text-red-300">No se pudo responder: {error}</p>}
        {resp && (
          <div className="aparece mt-3 rounded-lg border border-slate-600 bg-slate-800/60 p-3">
            <p className="text-lg font-bold text-white">{resp.titulo}</p>
            {resp.detalle.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-200">{resp.detalle.map((d) => <li key={d}>{d}</li>)}</ul>}
            {resp.aviso && <p className="mt-2 text-xs text-amber-300">⚠ {resp.aviso}</p>}
            {ia && <p className="mt-2 border-t border-slate-700 pt-2 text-sm text-slate-300">{ia}<span className="block text-[11px] text-slate-500">Explicación generada por IA a partir de las cifras de arriba</span></p>}
          </div>
        )}
      </div>
    </section>
  )
}
