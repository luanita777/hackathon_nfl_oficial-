// Respuesta principal en lenguaje sencillo, armada con las cifras de /api/hallazgo y /api/validacion.
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import type { Estimacion, Hallazgo, Validacion } from '../types'
import { esNum, miles, pct } from '../theme'
import { Cargando, ErrorApi, Vacio } from './Estados'
import { Pictograma } from './Pictograma'
import { Tip } from './Tooltip'

function Fila({ titulo, e, color }: { titulo: string; e: Estimacion | null | undefined; color: string }) {
  if (!e || !esNum(e.est)) return (
    <div><div className="text-sm font-semibold text-slate-200">{titulo}</div><div className="text-xs text-slate-400">Muy pocas jugadas para una cifra (n={e ? miles(e.n) : 0}).</div></div>
  )
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-slate-100">{titulo}</div>
      <Pictograma p={e.est} color={color} etiqueta="jugadas que fueron Man" />
      <div className="text-xs text-slate-300">
        En {pct(e.est, 0)} de las jugadas la defensa jugó <b>Man</b>
        {e.lo !== null && e.hi !== null ? <> (<Tip t="ic95" sinIcono>margen de error</Tip>: de {pct(e.lo, 0)} a {pct(e.hi, 0)})</> : null}. Basado en {miles(e.n)} jugadas.
      </div>
    </div>
  )
}

export default function Titular() {
  const { filtros } = useFiltros()
  const h = useApi<Hallazgo>('hallazgo', filtros)
  const v = useApi<Validacion>('validacion', filtros)

  if (h.error) return <ErrorApi mensaje={h.error} onReintentar={h.recargar} />
  if (h.cargando && !h.datos) return <Cargando alto={160} texto="Calculando la respuesta…" />
  const d = h.datos
  if (!d || !d.frase) return <Vacio mensaje="Sin respuesta para estos filtros" />
  const ok = d.estado === 'publicado'
  const val = v.datos && v.datos.n > 0 ? v.datos : null

  return (
    <section aria-label="Respuesta principal" className={`aparece rounded-xl border bg-slate-900/70 p-4 ${ok ? 'border-sky-500/50' : 'border-slate-600'}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Respuesta corta</span>
        {val && (val.se_sostiene
          ? <span className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">✓ Se repite en las dos mitades de la temporada</span>
          : <span className="rounded-full border border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-amber-300">⚠ No se repite entre mitades: tómalo con cuidado</span>)}
      </div>
      {ok ? (
        <>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight text-white">Sí: dónde se paran los esquineros delata si la defensa jugará Man o Zone.</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Fila titulo="Esquineros pegados a la línea (2 yardas o menos)" e={d.contraste.cerca} color="#f59e0b" />
            <Fila titulo="Esquineros lejos (más de 6 yardas)" e={d.contraste.lejos} color="#38bdf8" />
          </div>
          <p className="mt-3 text-sm text-slate-300">Para el quarterback: si ve a los esquineros pegados, prepárate para marcaje hombre a hombre; si los ve lejos, espera zona. (Interpretación; las cifras son las de arriba.)</p>
        </>
      ) : (
        <>
          <h2 className="mt-1 text-xl font-bold text-white">Con estos filtros todavía no podemos asegurarlo.</h2>
          <p className="mt-1 text-sm text-slate-300">{d.razon ?? 'No hay suficientes jugadas.'} Quita algún filtro (por ejemplo equipo o down) para ver la respuesta general.</p>
        </>
      )}
      <details className="mt-3 text-xs text-slate-400">
        <summary className="cursor-pointer select-none hover:text-slate-200">Ver la frase técnica del análisis</summary>
        <p className="mt-1 leading-snug text-slate-300">{d.frase}</p>
        {d.aviso_cortes && <p className="mt-1 leading-snug">{d.aviso_cortes}</p>}
      </details>
    </section>
  )
}
