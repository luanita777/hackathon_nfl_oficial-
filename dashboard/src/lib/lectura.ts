// Reglas visuales compartidas (contrato). Los cortes 0.50 / 0.25 son los definidos por el backend
// (lectura clara). El semáforo es una regla de presentación fija; se documenta en la metodología.
import type { FilaTell } from '../types'
import { esNum, MIN_N } from '../theme'

export type Lectura = 'man' | 'zone' | 'ambigua' | 'insuficiente'
export const TRAMOS = ['<=2', '2-4', '4-6', '6-8', '>8'] as const
export const TRAMO_TXT: Record<string, string> = { '<=2': '≤ 2 yd', '2-4': '2-4 yd', '4-6': '4-6 yd', '6-8': '6-8 yd', '>8': '> 8 yd' }
export const SAFETIES = [0, 1, 2, 3] as const

/** Clasifica una fila de /api/tell en parece Man (≥0.50), parece Zone (≤0.25), ambigua o n insuficiente. */
export function lecturaDe(f: Pick<FilaTell, 'est' | 'n'>): Lectura {
  if (!esNum(f.est) || f.n < MIN_N) return 'insuficiente'
  if (f.est >= 0.5) return 'man'
  if (f.est <= 0.25) return 'zone'
  return 'ambigua'
}

export type Color = 'verde' | 'ambar' | 'rojo' | 'gris'
export interface Semaforo {
  color: Color
  lado: 'Man' | 'Zone' | null
  acierto: number | null // proporción de acierto de leer ese lado (viene de P(Man) servida por la API)
  lo: number | null
  hi: number | null
  n: number
}
/**
 * Semáforo: lado = Man si P(Man) ≥ 0.5, Zone si P(Man) ≤ 0.5. Acierto = P(Man) (o su complemento para Zone).
 * Verde: límite inferior del IC ≥ 0.75. Ámbar: ≥ 0.60. Rojo: menos. Gris: n < 30.
 */
export function semaforoDe(f: FilaTell): Semaforo {
  if (!esNum(f.est) || f.lo === null || f.hi === null || f.n < MIN_N)
    return { color: 'gris', lado: null, acierto: null, lo: null, hi: null, n: f.n }
  const man = f.est >= 0.5
  const acierto = man ? f.est : 1 - f.est
  const lo = man ? f.lo : 1 - f.hi
  const hi = man ? f.hi : 1 - f.lo
  const color: Color = lo >= 0.75 ? 'verde' : lo >= 0.6 ? 'ambar' : 'rojo'
  return { color, lado: man ? 'Man' : 'Zone', acierto, lo, hi, n: f.n }
}

export const claveCelda = (tramo: string | null, s: number | null) => `${tramo}|${s}`
