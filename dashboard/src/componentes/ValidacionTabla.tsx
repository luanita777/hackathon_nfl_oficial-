// Tabla criterio → resultado → pasa / no pasa, con las cifras tal como las sirve la API.
import type { ReactNode } from 'react'
import { Tip } from './Tooltip'
import { esNum, miles, num, pct } from '../theme'
import type { Resultado, Validacion } from '../types'
import { IcoCheck, IcoX } from './Iconos'

function PasaTxt({ r }: { r: Resultado | undefined }) {
  const ok = r === 'pasa'
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold ${ok ? 'text-emerald-300' : 'text-red-300'}`}>
      <span aria-hidden>{ok ? <IcoCheck /> : <IcoX />}</span>{ok ? 'Pasa' : 'No pasa'}
    </span>
  )
}
const fp = (x: unknown) => (esNum(x) ? pct(x) : 'n insuficiente')
const f3 = (x: unknown) => (esNum(x) ? num(x, 3) : 'n insuficiente')

export function ValidacionTabla({ c }: { c: NonNullable<Validacion['criterios']> }) {
  const vc = c.validacion_cruzada, em = c.estabilidad_mitades, pe = c.permutacion, sp = c.signo_profundidad
  const filas: { k: string; nombre: ReactNode; desc: string; res: ReactNode; r: Resultado | undefined }[] = [
    {
      k: 'vc', nombre: <Tip t="auc">Validación cruzada</Tip>,
      desc: 'Predecir Man o Zone con jugadas que el modelo no vio (mitades par / impar).',
      res: vc.total ? (
        <>AUC total {f3(vc.total.auc)} (n = {miles(vc.total.n)}). Línea base: siempre «{vc.linea_base}».
          {(['par', 'impar'] as const).map((h) => vc.mitades?.[h] && (
            <span key={h} className="block">Mitad {h}: AUC {f3(vc.mitades[h].auc)}; precisión {fp(vc.mitades[h].precision)} vs base {fp(vc.mitades[h].precision_base)}{esNum(vc.mitades[h].dif_precision) ? ` (${vc.mitades[h].dif_precision >= 0 ? '+' : ''}${num(vc.mitades[h].dif_precision * 100)} pp)` : ''}</span>
          ))}
        </>
      ) : 'Sin cifras', r: vc.resultado,
    },
    {
      k: 'em', nombre: <Tip t="mitades">Estabilidad entre mitades</Tip>,
      desc: 'Tasa de disfraz por equipo en semanas 1-4 vs 5-8.',
      res: <>Correlación (Pearson) {f3(em.pearson)}, Spearman {f3(em.spearman)}, p de permutación {f3(em.p_permutacion_pearson)} ({em.n_equipos} equipos). {esNum(em.umbral) ? `Umbral de correlación ${em.umbral}.` : null}</>,
      r: em.resultado,
    },
    {
      k: 'pe', nombre: <Tip t="permutacion">Permutación</Tip>,
      desc: 'Si se barajan las etiquetas, ¿el AUC cae al azar?',
      res: <>AUC observado {f3(pe.auc_observado)} vs AUC permutado medio {f3(pe.auc_permutado_medio)}; p = {f3(pe.p)} ({miles(pe.n_permutaciones)} permutaciones, n = {miles(pe.n)}).</>,
      r: pe.resultado,
    },
    {
      k: 'sp', nombre: <Tip t="profundidad">Signo de profundidad</Tip>,
      desc: 'Revisa que la ofensiva quede detrás del balón (coordenadas bien orientadas).',
      res: <>Proporción {pct(sp.proporcion)} vs umbral {pct(sp.umbral, 0)} (n = {miles(sp.n)}, sin dato {miles(sp.n_sin_dato)}).</>,
      r: sp.resultado,
    },
  ]
  return (
    <table className="w-full table-fixed border-collapse text-left text-xs">
      <thead>
        <tr className="border-b border-slate-600 text-slate-400">
          <th className="w-[24%] py-1 pr-2 font-medium">Criterio</th>
          <th className="py-1 pr-2 font-medium">Resultado (cifras de la API)</th>
          <th className="w-[84px] py-1 font-medium">¿Pasa?</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.k} className="border-b border-slate-800 align-top">
            <td className="py-1.5 pr-2"><div className="font-medium text-slate-100">{f.nombre}</div><div className="text-[11px] text-slate-400">{f.desc}</div></td>
            <td className="py-1.5 pr-2 text-slate-200">{f.res}</td>
            <td className="py-1.5"><PasaTxt r={f.r} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
