// Nota de metodología plegable (abierta por defecto) y banda de aviso.
import { useApi } from '../api'
import { useFiltros } from '../FiltrosContext'
import type { Calidad, Hallazgo, Validacion } from '../types'
import { miles, pct } from '../theme'
import { Tip } from './Tooltip'

export default function Metodologia() {
  const { filtros } = useFiltros()
  const cal = useApi<Calidad>('calidad', {})
  const h = useApi<Hallazgo>('hallazgo', filtros)
  const v = useApi<Validacion>('validacion', filtros)

  const c = cal.datos
  const descartes = c ? Object.entries(c.descartes) : []
  const totalDescartes = descartes.reduce((s, [, n]) => s + n, 0)
  // Excepción declarada: este % es aritmética simple sobre cifras de /api/calidad (no es una estimación); un campo del backend lo reemplazaría.
  // La cifra base (n_jugadas y descartes) viene de la API; total = n_jugadas + descartes.
  const sobrevive = c && c.n_jugadas + totalDescartes > 0 ? c.n_jugadas / (c.n_jugadas + totalDescartes) : null

  const noConcluyente = h.datos?.estado === 'no_concluyente'
  const noSostiene = !!v.datos && v.datos.n > 0 && v.datos.se_sostiene === false

  return (
    <footer className="mt-3 space-y-2">
      {(noConcluyente || noSostiene) && (
        <div role="alert" className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <b>Precaución: </b>
          {noConcluyente && <span>el hallazgo es no concluyente{h.datos?.razon ? `: ${h.datos.razon}` : '.'} </span>}
          {noSostiene && <span>El resultado no se sostiene entre mitades de las semanas. </span>}
          <span className="text-amber-300/80">Revisa <Tip t="n_menor_30">n</Tip> antes de sacar conclusiones.</span>
        </div>
      )}
      <details open className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
        <summary className="cursor-pointer select-none text-sm font-medium text-slate-100">Metodología y límites</summary>
        <div className="mt-2 grid gap-x-6 gap-y-1 md:grid-cols-2">
          <div>
            <p>
              <b>Datos:</b> semanas 1-8 de 2021, solo jugadas de pase.
              {cal.error && <span className="text-red-300"> No se pudo cargar la calidad de datos.</span>}
              {c && <> Jugadas usadas (<Tip t="n">n</Tip>): <b>{miles(c.n_jugadas)}</b>{sobrevive !== null && <> ({pct(sobrevive)} del total)</>}.</>}
            </p>
            {descartes.length > 0 && (
              <p>Descartes: {descartes.map(([motivo, n]) => `${motivo} ${miles(n)}`).join(' · ')}.</p>
            )}
            <p>Los cortes de las alineaciones se definieron en una exploración previa con las mismas semanas; por eso se avisa cuando algo no se sostiene entre mitades.</p>
          </div>
          <div>
            <p><b>Límites:</b> estudio observacional, no prueba causalidad; una sola temporada; <Tip t="ic95">IC95%</Tip> con n &lt; 30 se marca como insuficiente.</p>
            <p>Los colores de equipo no vienen de los datos: son un mapa fijo local.</p>
          </div>
        </div>
      </details>
    </footer>
  )
}
