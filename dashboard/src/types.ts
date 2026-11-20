// Formas reales del JSON del backend (medidas con curl el 2026-11-20).
// Única fuente de nombres de campos del dashboard. Si el backend cambia, se actualiza aquí.

/** Cuando n < 30 el backend devuelve este texto en lugar de la cifra. */
export const INSUFICIENTE = 'n insuficiente'

/** Estimación con intervalo de confianza al 95% (Wilson para proporciones). */
export interface Estimacion {
  n: number
  est: number | typeof INSUFICIENTE
  lo: number | null
  hi: number | null
}

export type Cobertura = 'Man' | 'Zone'
export type Mitad = '1-4' | '5-8' | 'par' | 'impar'

/** Filtros comunes de todos los endpoints (query string). Todos opcionales. */
export interface Filtros {
  semana?: number
  mitad?: Mitad
  down?: number
  equipo?: string
  cobertura?: Cobertura
}

/** GET /api/tell: P(Man) por alineación. Con filtros vacíos la lista trae una fila con nulos. */
export type TramoCb = '<=2' | '2-4' | '4-6' | '6-8' | '>8'
export interface FilaTell extends Estimacion {
  tramo_cb: TramoCb | null
  safeties_prof: 0 | 1 | 2 | 3 | null
}

/** GET /api/equipos: tasa de disfraz por equipo defensor (n = jugadas con lectura clara). */
export interface FilaEquipo extends Estimacion {
  equipo: string | null // sigla de la NFL ("KC"); null si no hay jugadas
}

/** Diferencia de dos proporciones (en fracción 0-1) o de porcentajes (en /api/efecto). */
export interface Contraste {
  n: number
  n_a?: number
  n_b?: number
  p_a?: number
  p_b?: number
  est: number | typeof INSUFICIENTE
  lo: number | null
  hi: number | null
}

/** GET /api/efecto: efecto del disfraz. Completos en puntos porcentuales; yardas en yardas. */
export interface EfectoMedida extends Contraste {
  media_a?: number
  media_b?: number
  citado?: boolean
  estado?: 'concluyente' | 'no concluyente'
}
export interface Efecto {
  completos: EfectoMedida
  yardas: EfectoMedida
  n_con_disfraz: number
  n_sin_disfraz: number
  n: number
  filtros: Filtros
}

/** GET /api/hallazgo. Si estado es no_concluyente, "razon" explica por qué. */
export interface Hallazgo {
  frase: string
  estado: 'publicado' | 'no_concluyente'
  razon: string | null
  contraste: {
    cerca: Estimacion | null
    lejos: Estimacion | null
    diferencia: Contraste | null
    mitades: { par: Contraste | null; impar: Contraste | null }
  }
  ranking: {
    publicado: boolean
    razon: string | null
    mayor: unknown
    menor: unknown
    correlacion: number | null
    p: number | null
    equipos_validos: number | null
  }
  efecto: { completos: EfectoMedida | null; yardas: EfectoMedida | null; citado: boolean }
  cifras_frase: Record<string, string>
  aviso_cortes: string
  filtros: Filtros
}

/** GET /api/validacion. Con n = 0 solo trae n, estado, se_sostiene y filtros. */
export type Resultado = 'pasa' | 'no pasa'
export interface Validacion {
  n: number
  estado?: string // "n insuficiente" cuando n = 0
  filtros: Filtros
  se_sostiene: boolean
  criterios?: {
    validacion_cruzada: {
      linea_base: string
      n_sin_lectura_oof: number
      total: { n: number; auc: number | null }
      // con n pequeño la mitad solo trae { n, est: 'n insuficiente' }
      mitades: Record<'par' | 'impar', {
        n: number; auc?: number | null; precision?: number; precision_base?: number; dif_precision?: number
        est?: typeof INSUFICIENTE
      }>
      resultado: Resultado
    }
    estabilidad_mitades: {
      n_equipos: number
      spearman: number | typeof INSUFICIENTE
      pearson: number | typeof INSUFICIENTE
      p_permutacion_pearson: number | null
      umbral: number
      resultado: Resultado
    }
    permutacion: {
      n: number; n_permutaciones: number; auc_observado: number
      auc_permutado_medio: number; p: number; resultado: Resultado
    }
    signo_profundidad: {
      n: number; n_sin_dato: number; proporcion: number; umbral: number; resultado: Resultado
    }
  }
  confirmacion?: {
    descubrimiento: Contraste & { parte: string }
    confirmacion: Contraste & { parte: string }
    paridad: { par: Contraste & { parte: string }; impar: Contraste & { parte: string } }
    decision_paridad: { publicado: boolean; razon: string | null }
    decision_mitades: { publicado: boolean; razon: string | null }
    se_sostiene: boolean
  }
}

/** GET /api/calidad (sin filtros). */
export interface Calidad {
  descartes: Record<string, number> // "sin snap", "cobertura Other", "sin CB", "tracking ilegible"
  segundos: number
  mb: number
  n_jugadas: number
}

/** GET /api/explicacion. Con IA caída: { disponible: false, texto: null }. */
export interface Explicacion {
  disponible: boolean
  texto: string | null
}
