// Paleta y utilidades de formato. Colores de equipo: ver equipos.ts.
export const tema = {
  fondo: '#0a0e17',        // casi negro azulado
  superficie1: '#111827',
  superficie2: '#1a2233',
  borde: '#273247',
  texto: '#e6ebf5',
  textoSuave: '#93a0b8',
  acento: '#38bdf8',       // acento por defecto (cielo)
  man: '#f59e0b',          // "parece Man"
  zone: '#38bdf8',         // "parece Zone"
  neutro: '#64748b',
  bueno: '#34d399',
  alerta: '#fbbf24',
  malo: '#f87171',
} as const

/** Solo formato (redondeo): la cifra viene siempre de la API. */
export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`
export const num = (x: number, d = 1) => x.toFixed(d)
export const con = (x: number, d = 1) => `${x >= 0 ? '+' : ''}${x.toFixed(d)}`
export const miles = (x: number) => x.toLocaleString('es-MX')
export const esNum = (x: unknown): x is number => typeof x === 'number'

export const MIN_N = 30 // mismo umbral que el backend; solo para marcar avisos visuales

/** Escala divergente: p=0 → Zone (azul), 0.5 → ambigua (gris), 1 → Man (ámbar). */
export function colorPMan(p: number): string {
  const a = [56, 189, 248], m = [71, 85, 105], b = [245, 158, 11]
  const t = Math.max(0, Math.min(1, p))
  const [x, y, u] = t < 0.5 ? [a, m, t / 0.5] : [m, b, (t - 0.5) / 0.5]
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * (u as number)))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
