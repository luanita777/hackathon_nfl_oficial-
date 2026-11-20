// Preguntas sugeridas para la consulta en lenguaje natural.
// La IA solo explica el hallazgo filtrado (no hay cifras por down ni por alineación),
// por eso las preguntas no prometen más que eso y cada una lleva un destino de respaldo.
export interface PreguntaSugerida {
  id: string
  plantilla: string
  destino: { pestana: 'lectura' | 'equipos' | 'efecto'; filtros?: Partial<{ down: number }>; nota: string }
  requiereEquipo?: boolean
}

export const preguntas: PreguntaSugerida[] = [
  {
    id: 'confiar-equipo',
    plantilla: '¿Puedo confiar en la lectura pre-snap contra [equipo]?',
    destino: { pestana: 'lectura', nota: 'Abre la pestaña Lectura con el equipo elegido en el filtro y revisa el sello y la n.' },
    requiereEquipo: true,
  },
  {
    id: 'down-disfraz',
    plantilla: '¿En qué down disfrazan más? (ahora: [down])',
    destino: { pestana: 'lectura', filtros: {}, nota: 'Cambia el filtro de down en la pestaña Lectura y compara la tasa de disfraz de cada uno.' },
  },
  {
    id: 'alineacion-enganosa',
    plantilla: '¿Qué alineación de CB es la más engañosa?',
    destino: { pestana: 'lectura', nota: 'En la pestaña Lectura revisa la tabla de alineaciones y busca la de mayor tasa de disfraz con n suficiente.' },
  },
  {
    id: 'sostiene-mitades',
    plantilla: '¿Esto se sostiene entre las semanas 1-4 y 5-8?',
    destino: { pestana: 'lectura', nota: 'Revisa el sello y la validación por mitades en la pestaña Lectura.' },
  },
  {
    id: 'efecto-completos',
    plantilla: '¿Cuánto cambia el disfraz los pases completos?',
    destino: { pestana: 'efecto', nota: 'Abre la pestaña Efecto y compara el % de pases completos con y sin disfraz.' },
  },
  {
    id: 'equipos-disfrazan',
    plantilla: '¿Qué equipos disfrazan más?',
    destino: { pestana: 'equipos', nota: 'Abre la pestaña Equipos y ordena por tasa de disfraz, fijándote en la n de cada uno.' },
  },
]

/** Reemplaza [equipo] y [down] en la plantilla; si faltan, usa valores genéricos. */
export function rellenar(plantilla: string, { equipo, down }: { equipo?: string; down?: number } = {}): string {
  const e = equipo && equipo.trim() ? equipo : 'la defensa'
  const d = down !== undefined && down !== null && !Number.isNaN(down) ? `${down}.º down` : 'cualquier down'
  return plantilla.split('[equipo]').join(e).split('[down]').join(d)
}
