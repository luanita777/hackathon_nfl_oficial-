// Textos de tooltips (español sencillo). La clave se usa en <Tip t="clave">.
// Datos: Big Data Bowl 2021, semanas 1-8, tracking + PFF. No hay EPA ni datos de nflverse.
export interface Definicion { titulo: string; texto: string }
export const glosario: Record<string, Definicion> = {
  snap: {
    titulo: 'Snap',
    texto: 'El momento en que el centro pasa el balón al mariscal y empieza la jugada. "Antes del snap" es lo que la defensa muestra mientras la ofensiva se acomoda.',
  },
  man: {
    titulo: 'Cobertura Man (hombre a hombre)',
    texto: 'Cada defensor cuida a un receptor en específico y lo sigue por toda la cancha.',
  },
  zone: {
    titulo: 'Cobertura Zone (zona)',
    texto: 'Cada defensor cuida un área de la cancha y vigila a quien entre en ella, en vez de seguir a un receptor.',
  },
  cobertura: {
    titulo: 'Cobertura',
    texto: 'El plan de la defensa para cuidar a los receptores en un pase. Aquí la agrupamos en Man o Zone, según la anotación de PFF (una empresa que revisa video).',
  },
  cb: {
    titulo: 'CB (esquinero)',
    texto: 'Cornerback: defensor que se para por las orillas de la cancha, frente a los receptores abiertos.',
  },
  safety: {
    titulo: 'Safety',
    texto: 'Defensor que juega al fondo, detrás de los demás, como última línea contra los pases largos.',
  },
  profundidad: {
    titulo: 'Profundidad al snap',
    texto: 'Qué tan lejos de la línea de golpeo (donde está el balón) se para un defensor, medido hacia su propio lado de la cancha. Ejemplo: un safety a 12 yardas está bien al fondo.',
  },
  alineacion: {
    titulo: 'Alineación',
    texto: 'Cómo se acomoda la defensa al snap: el tramo de profundidad de los esquineros más cuántos safeties están al fondo (a 8 yardas o más de la línea de golpeo).',
  },
  lectura_clara: {
    titulo: 'Lectura clara',
    texto: 'La alineación da una pista fuerte: la probabilidad de Man es 50% o más ("parece Man") o 25% o menos ("parece Zone").',
  },
  lectura_ambigua: {
    titulo: 'Lectura ambigua',
    texto: 'Todo lo que no es lectura clara: la alineación no deja saber con confianza si será Man o Zone.',
  },
  disfraz: {
    titulo: 'Disfraz',
    texto: 'Jugada con lectura clara en la que la cobertura real fue la contraria. Ejemplo: parecía Man y resultó Zone.',
  },
  p_man: {
    titulo: 'P(Man)',
    texto: 'Probabilidad estimada de que la cobertura sea Man, según cómo se alinea la defensa antes del snap. 70% significa que en 7 de 10 jugadas parecidas fue Man.',
  },
  ic95: {
    titulo: 'IC95% (margen de error)',
    texto: 'Rango en el que, con 95% de confianza, está el valor real. Mientras más angosto, más confiable la cifra.',
  },
  n: {
    titulo: 'n',
    texto: 'Número de jugadas en las que se basa la cifra. Con más jugadas, la cifra es más estable.',
  },
  n_menor_30: {
    titulo: 'Pocas jugadas (n menor a 30)',
    texto: 'Con menos de 30 jugadas la cifra es frágil y puede cambiar mucho con una sola jugada. El sistema la marca como "n insuficiente".',
  },
  wilson: {
    titulo: 'Margen de error (Wilson)',
    texto: 'Método para calcular el margen de error de un porcentaje, que funciona bien aun con pocas jugadas. Es el rango que se muestra junto a cada porcentaje.',
  },
  validacion_paridad: {
    titulo: 'Validación por semanas pares e impares',
    texto: 'Se calcula la regla con las semanas pares y se prueba en las impares, y luego al revés. Si funciona en ambos casos, no depende de unas pocas semanas.',
  },
  mitades: {
    titulo: 'Semanas 1-4 vs 5-8',
    texto: 'Se compara el hallazgo en la primera mitad de los datos contra la segunda. Si se repite, es más creíble.',
  },
  permutacion: {
    titulo: 'Prueba de permutación',
    texto: 'Se baraja la cobertura al azar muchas veces para ver si el resultado se desvanece. Si con datos barajados ya no aparece, el hallazgo no es casualidad.',
  },
  auc: {
    titulo: 'AUC',
    texto: 'Qué tan bien la alineación separa Man de Zone. 0.5 es como tirar una moneda; 1 es separar perfecto.',
  },
  linea_base: {
    titulo: 'Línea base',
    texto: 'La referencia más simple para comparar: siempre predecir Zone, que es la cobertura más común. Una lectura útil debe superarla.',
  },
  down: {
    titulo: 'Down',
    texto: 'Cada uno de los 4 intentos que tiene la ofensiva para avanzar 10 yardas. 1.º down es el primer intento, 4.º el último.',
  },
  yardas_por_avanzar: {
    titulo: 'Yardas por avanzar',
    texto: 'Yardas que le faltan a la ofensiva para conseguir un nuevo primer down. "3.º y 8" quiere decir tercer intento con 8 yardas por recorrer.',
  },
  esquema: {
    titulo: 'Esquema de cobertura',
    texto: 'El tipo concreto de cobertura que usó la defensa (Cover-1, Cover-3, etc.). Aquí se muestra cuántas veces se usó cada uno desde una misma alineación.',
  },
  cover0: {
    titulo: 'Cover-0',
    texto: 'Man puro sin safeties al fondo, casi siempre con blitz (rush de más jugadores). Arriesgado: si el receptor gana, no hay ayuda detrás.',
  },
  cover1: {
    titulo: 'Cover-1',
    texto: 'Man con un solo safety al fondo que ayuda detrás de los demás.',
  },
  man2: {
    titulo: '2-Man',
    texto: 'Man por debajo con dos safeties al fondo que dividen la cancha a lo largo y ayudan a cubrir los pases largos.',
  },
  cover2: {
    titulo: 'Cover-2',
    texto: 'Zona con dos safeties al fondo, cada uno responsable de una mitad de la cancha.',
  },
  cover3: {
    titulo: 'Cover-3',
    texto: 'Zona con tres defensores al fondo, cada uno cuidando un tercio de la cancha a lo largo.',
  },
  quarters: {
    titulo: 'Quarters (Cover-4)',
    texto: 'Zona con cuatro defensores al fondo, cada uno responsable de un cuarto de la cancha a lo ancho.',
  },
  cover6: {
    titulo: 'Cover-6',
    texto: 'Mezcla: Quarters (Cover-4) hacia un lado de la cancha y Cover-2 hacia el otro.',
  },
  other: {
    titulo: 'Other (descartada)',
    texto: 'Coberturas que PFF no clasificó como Man ni Zone. Se dejan fuera del análisis porque no se pueden contar en ninguno de los dos grupos.',
  },
  completos: {
    titulo: 'Pases completos',
    texto: 'Porcentaje de pases que el receptor atrapó. Ejemplo: 60% quiere decir que 6 de cada 10 pases se completaron.',
  },
  yardas_jugada: {
    titulo: 'Yardas por jugada',
    texto: 'Yardas promedio que ganó la ofensiva en cada pase. Los pases incompletos cuentan como 0.',
  },
  hallazgo_no_concluyente: {
    titulo: 'Hallazgo no concluyente',
    texto: 'Los datos no alcanzan para afirmar nada con seguridad: hay pocas jugadas o el resultado no se repite en otra parte de los datos.',
  },
  sello_solido: {
    titulo: 'Sello: sólido',
    texto: 'El hallazgo se descubrió en una parte de los datos y se repitió en otra, con suficientes jugadas.',
  },
  sello_fragil: {
    titulo: 'Sello: frágil',
    texto: 'El hallazgo aparece, pero con pocas jugadas o con diferencias entre partes de los datos. Tómalo con cautela.',
  },
  sello_no_concluyente: {
    titulo: 'Sello: no concluyente',
    texto: 'El hallazgo no se sostuvo al probarlo en otra parte de los datos. No hay base para decidir con él.',
  },
  semaforo: {
    titulo: 'Semáforo',
    texto: 'Color que resume qué tanto confiar en la lectura: verde, clara y estable; amarillo, con reservas; rojo, no confiable.',
  },
  pizarra: {
    titulo: 'Pizarra',
    texto: 'Dibujo de la cancha con la posición de los defensores al snap, como el que usan los entrenadores para explicar una jugada.',
  },
  tasa_disfraz: {
    titulo: 'Tasa de disfraz',
    texto: 'De las jugadas con lectura clara, el porcentaje en que la cobertura real fue la contraria. Ejemplo: 30% quiere decir que 3 de cada 10 lecturas claras engañaron.',
  },
  liga: {
    titulo: 'Liga',
    texto: 'Todos los equipos juntos en las semanas 1-8 de 2021, sirve de referencia para comparar a un equipo.',
  },
}
