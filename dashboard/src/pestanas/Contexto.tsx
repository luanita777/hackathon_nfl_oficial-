// Pestaña "Qué es": conceptos explicados sin tecnicismos, con dibujos animados.
import { JugadaAnim } from '../componentes/JugadaAnim'
import { Pizarra } from '../componentes/Pizarra'
import { glosario } from '../glosario'

const CLAVES = ['snap', 'cb', 'safety', 'alineacion', 'down'] as const

export default function Contexto({ irA }: { irA?: (p: 'lectura' | 'equipos' | 'efecto') => void }) {
  return (
    <div className="aparece space-y-4">
      <section className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-amber-500/40 bg-slate-900/60 p-4">
          <h2 className="text-xl font-bold text-amber-300">Man: "tú te quedas con él"</h2>
          <p className="mt-1 text-sm text-slate-200">Cada defensor se pega a <b>un receptor</b> y lo sigue por toda la cancha. Si el receptor corre a la derecha, su defensor corre con él.</p>
          <div className="my-2"><JugadaAnim tipo="man" /></div>
          <p className="text-xs text-slate-400">Ventaja: marcaje pegado. Riesgo: si el receptor es más rápido o lo "bloquean" otros jugadores, queda libre.</p>
        </article>
        <article className="rounded-xl border border-sky-500/40 bg-slate-900/60 p-4">
          <h2 className="text-xl font-bold text-sky-300">Zone: "tú cuidas esta área"</h2>
          <p className="mt-1 text-sm text-slate-200">Cada defensor cuida <b>un pedazo del campo</b>. Cuando un receptor entra a su zona lo vigila; cuando sale, lo "entrega" al siguiente.</p>
          <div className="my-2"><JugadaAnim tipo="zone" /></div>
          <p className="text-xs text-slate-400">Ventaja: ven al quarterback y reaccionan al balón. Riesgo: quedan huecos entre zonas.</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-lg font-bold">¿Qué se puede ver ANTES de que empiece la jugada?</h2>
        <p className="mt-1 text-sm text-slate-300">El quarterback solo ve cómo se acomodan los defensores. Nos fijamos en dos pistas: <b>qué tan pegados a la línea están los esquineros</b> (los defensores de las orillas) y <b>cuántos safeties</b> (los defensores del fondo) se paran lejos.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 p-3">
            <div className="w-40 shrink-0"><Pizarra tramo="<=2" safeties={0} /></div>
            <p className="text-sm"><b className="text-amber-300">Esquineros pegados a la línea, nadie al fondo.</b> Pista de que vienen a marcar de cerca: suele ser <b>Man</b>.</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-sky-500/30 p-3">
            <div className="w-40 shrink-0"><Pizarra tramo=">8" safeties={2} /></div>
            <p className="text-sm"><b className="text-sky-300">Esquineros lejos y dos safeties al fondo.</b> Pista de que cuidan áreas: suele ser <b>Zone</b>.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-violet-500/40 bg-slate-900/60 p-4">
        <h2 className="text-lg font-bold text-violet-300">El "disfraz": cuando la defensa te engaña</h2>
        <p className="mt-1 text-sm text-slate-200">A veces la defensa se <b>acomoda como Man pero juega Zone</b> (o al revés) para confundir al quarterback. A eso le llamamos <b>disfraz</b>. Mientras más disfraza un equipo, menos conviene confiar en lo que se ve antes del snap.</p>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Palabras clave</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          {CLAVES.map((k) => (
            <div key={k}><dt className="inline font-semibold text-slate-100">{glosario[k]?.titulo}: </dt><dd className="inline text-slate-300">{glosario[k]?.texto}</dd></div>
          ))}
        </dl>
      </section>

      <div className="flex justify-center">
        <button type="button" onClick={() => irA?.('lectura')}
          className="rounded-lg border border-sky-400 bg-sky-500/10 px-6 py-2.5 text-base font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
          Ver la respuesta con los datos →
        </button>
      </div>
    </div>
  )
}
