// Pruebas del hallazgo con veredicto corto y concreto. Cifras de /api/validacion y /api/efecto.
import type { Efecto, Validacion } from '../types'
import { con, esNum, miles, num, pct } from '../theme'
import { Pictograma } from './Pictograma'

function Prueba({ ok, pregunta, respuesta, detalle }: { ok: boolean | null; pregunta: string; respuesta: string; detalle?: string }) {
  const c = ok === null ? 'border-slate-600' : ok ? 'border-emerald-500/50' : 'border-amber-500/50'
  return (
    <li className={`aparece flex gap-3 rounded-lg border bg-slate-900/60 p-3 ${c}`}>
      <span aria-hidden className={`mt-0.5 text-xl ${ok === null ? 'text-slate-400' : ok ? 'text-emerald-400' : 'text-amber-400'}`}>{ok === null ? '≈' : ok ? '✓' : '✕'}</span>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">{pregunta}</div>
        <div className="text-base font-bold text-slate-50"><span className="sr-only">{ok ? 'Pasa. ' : ok === false ? 'No pasa. ' : ''}</span>{respuesta}</div>
        {detalle && <div className="text-xs text-slate-400">{detalle}</div>}
      </div>
    </li>
  )
}

export function PruebasSimples({ v }: { v: Validacion }) {
  const c = v.criterios
  if (!c) return null
  const vc = c.validacion_cruzada, em = c.estabilidad_mitades, pe = c.permutacion, sp = c.signo_profundidad, cf = v.confirmacion
  const par = vc.mitades.par, imp = vc.mitades.impar
  return (
    <ul className="space-y-2">
      <Prueba ok={vc.resultado === 'pasa'} pregunta="¿Acierta más que adivinar?"
        respuesta={esNum(par.precision) && esNum(imp.precision) && esNum(par.precision_base) && esNum(imp.precision_base)
          ? `${vc.resultado === 'pasa' ? 'Sí' : 'No'}: acierta ${pct(par.precision, 0)}-${pct(imp.precision, 0)} de las jugadas; decir siempre "Zone" acertaría ${pct(par.precision_base, 0)}-${pct(imp.precision_base, 0)}.`
          : 'Muy pocas jugadas para comparar.'}
        detalle="Se probó con jugadas que la lectura no había visto (semanas pares contra impares)." />
      <Prueba ok={pe.resultado === 'pasa'} pregunta="¿Podría ser casualidad?"
        respuesta={pe.resultado === 'pasa' ? 'No: al barajar las coberturas al azar, la lectura deja de funcionar.' : 'Sí: con coberturas al azar la lectura funciona igual de bien.'}
        detalle={`Real: ${num(pe.auc_observado, 2)} · al azar: ${num(pe.auc_permutado_medio, 2)} (0.5 = adivinar, 1 = perfecto) · ${miles(pe.n_permutaciones)} repeticiones.`} />
      <Prueba ok={cf ? cf.se_sostiene : null} pregunta="¿Se repite en las dos mitades de la temporada?"
        respuesta={cf && esNum(cf.descubrimiento.est) && esNum(cf.confirmacion.est)
          ? `${cf.se_sostiene ? 'Sí' : 'No'}: la diferencia es de ${con(cf.descubrimiento.est * 100, 0)} puntos en semanas 1-4 y ${con(cf.confirmacion.est * 100, 0)} en semanas 5-8.`
          : 'No se puede saber: muy pocas jugadas en alguna mitad.'}
        detalle="Diferencia en puntos porcentuales de Man entre esquineros cerca y lejos." />
      <Prueba ok={em.resultado === 'pasa'} pregunta="¿Los equipos que más engañan son siempre los mismos?"
        respuesta={em.resultado === 'pasa' ? 'Sí: el orden se mantiene entre mitades.' : 'No: el orden de equipos cambia de una mitad a la otra; no uses el ranking.'}
        detalle={esNum(em.pearson) ? `Parecido entre mitades: ${num(em.pearson, 2)} (se pedía al menos ${em.umbral ?? 0.5} y superar el azar${em.p_permutacion_pearson !== null ? `; p=${num(em.p_permutacion_pearson, 2)}` : ''}).` : 'Muy pocos equipos para medirlo.'} />
      <Prueba ok={sp.resultado === 'pasa'} pregunta="¿Las posiciones están bien medidas?"
        respuesta={`${sp.resultado === 'pasa' ? 'Sí' : 'No'}: en ${pct(sp.proporcion, 0)} de las jugadas la ofensiva queda detrás del balón, como debe ser.`}
        detalle={`Revisadas ${miles(sp.n)} jugadas.`} />
    </ul>
  )
}

export function EfectoSimple({ e }: { e: Efecto }) {
  const c = e.completos, y = e.yardas
  const claroC = esNum(c.est) && c.lo !== null && c.hi !== null && (c.lo > 0 || c.hi < 0)
  return (
    <div className="aparece space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <h3 className="text-lg font-bold">
        {esNum(c.est) ? (claroC ? `Cuando la defensa disfraza, se completan ${Math.abs(c.est).toFixed(1)} puntos ${c.est < 0 ? 'menos' : 'más'} de pases.` : 'No se nota una diferencia clara en pases completos.') : 'Muy pocas jugadas para medir el efecto.'}
      </h3>
      {esNum(c.p_a) && esNum(c.p_b) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div><div className="mb-1 text-xs text-slate-400">Con disfraz ({miles(e.n_con_disfraz)} jugadas)</div><Pictograma p={c.p_a / 100} color="#a78bfa" etiqueta="pases completos" /></div>
          <div><div className="mb-1 text-xs text-slate-400">Sin disfraz ({miles(e.n_sin_disfraz)} jugadas)</div><Pictograma p={c.p_b / 100} color="#38bdf8" etiqueta="pases completos" /></div>
        </div>
      )}
      <p className="text-sm text-slate-300">
        {esNum(y.est) && y.lo !== null && y.hi !== null
          ? ((y.lo > 0 || y.hi < 0) ? `En yardas por jugada sí hay diferencia: ${con(y.est, 2)} yardas.` : 'En yardas por jugada no se nota diferencia: el disfraz no cambia cuánto avanza el ataque.')
          : ''}
      </p>
      <p className="text-xs text-amber-300">⚠ Es una asociación observada, no prueba que el disfraz sea la causa.</p>
    </div>
  )
}
