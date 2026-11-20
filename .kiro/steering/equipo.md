A. Reglas
Lee .kiro/steering/rules.md (es el oficial del evento, NO lo modifiques).

Crea .kiro/steering/equipo.md con este front matter:
---
inclusion: always
---
y EXACTAMENTE estas reglas, sin agregar otras:

# Reglas del equipo (complementan rules.md; si chocan, manda rules.md)

## Datos y cifras
- Antes de usar una columna, lee los encabezados y verifícala.
- Nunca inventes columnas, valores ni significados. Si no sabes qué significa
  algo, escribe "sin confirmar" y propón cómo verificarlo con código.
- "Confirmado" solo si un script lo imprimió. Que una columna exista no
  confirma su significado.
- Revisa duplicados y filas inválidas antes de calcular.
- Toda cifra mostrada en la app sale de código ejecutado sobre los datos.
- Muestra n e IC95%; marca datos parciales y n < 30.
- Un hallazgo se descubre en una parte de los datos y se confirma en otra
  (temporada o mitad). Si no se sostiene, la app lo dice.

## Código
- Simple, funciones pequeñas, comentarios en español. Interfaz en español.
- Pruebas con pytest y filas reales. No uses hypothesis ni otras librerías de
  pruebas: si propones pruebas por propiedades, hazlas con numpy y semilla fija.
- Python siempre con el de .venv.

## Forma de trabajo
- Antes de algo grande, dime qué vas a hacer. Lo demás, avanza y resume al final.
- Respuestas del chat cortas: no pegues tablas ni salidas largas; guárdalas en
  un archivo y dame la ruta.
- Al cerrar cada bloque corre pytest y sh .hackathon/setup.sh --check, y dime el
  resultado real. Si algo falla, dilo.

Al terminar, muestra ambos steering y dime si hay contradicciones.


B1 · Inventario del dataset real (chat, sesión nueva) [pegar el enunciado oficial en ENUNCIADO.md]

Objetivo: inventariar el dataset REAL de data/ (solo lectura). No contestes
preguntas ni construyas la app. Sigue .kiro/steering. Si existe ENUNCIADO.md,
léelo primero: manda sobre mis suposiciones.

1. Escribe backend/explorar.py (pandas y numpy, Python de .venv; usecols o por
   bloques; admite .csv y .csv.gz). Si hay muchos archivos con el mismo patrón
   (ej. tracking_*.csv), analiza UNO a fondo y de los demás solo cuenta archivos
   y MB.
2. Archivos con el mismo esquema (por temporada o semana) son particiones de una
   sola tabla: no compares sus llaves entre sí. Prueba uniones solo entre tablas
   de distinto tipo (juegos, jugadas, jugadores, tracking, externos). Reporta % de
   filas con pareja y huérfanos. Si hay datos de nflverse, las llaves esperadas
   son gameId = old_game_id y playId = play_id (sin confirmar).
3. Genera EXPLORACION.md de máximo 150 líneas: por archivo, MB, filas, columnas,
   tiempo de carga, cobertura, llave y duplicados; qué representa una fila;
   relaciones; distribución del tipo de jugada; qué SÍ y qué NO aporta. Cada
   afirmación lleva el número que la sustenta. Si solo se infiere de que existe
   una columna, es "sin confirmar".
4. El detalle de columnas (tipo, % nulos, 2-3 ejemplos) va en
   EXPLORACION_COLUMNAS.md. Es solo de consulta: no lo leas completo después.
5. Reporta peso total de data/, y tiempo y memoria para cargar lo necesario en una
   API que calcula al arrancar.
6. Crea .kiro/steering/datos.md (inclusion: always, máximo 60 líneas) solo con
   hechos confirmados: qué archivos usar o ignorar, qué es una fila, llaves,
   trampas, columnas clave con significado confirmado y qué NO trae el dataset.
   Cada hecho con "medido el [fecha]".
7. Usa como referencia Data.md como referencia de interpretación de datos.
En el chat dame un resumen de 10 líneas.


B2. Clasificar y elegir (chat, sesión nueva)
Copia Preguntas.txt a la raíz. Marca con ★ las favoritas.

Lee EXPLORACION.md, .kiro/steering/datos.md, ENUNCIADO.md (si existe) y
Preguntas.txt (★ = favoritas
). No contestes preguntas ni construyas nada.

CONTEXTO: hackathon NFL. Entregamos un análisis y una app desde un punto de vista
(Coach, Scout o Broadcaster). Se evalúa Football Insight, Technical Execution,
Communication y Originality ("todos tienen Kiro: busquen qué ya existe y
diferéncense").

VOCABULARIO: Preguntas.txt lo escribió una fan. Términos como "perímetro" o
"centros" son ambiguos: interprétalos y marca "interpretación sin confirmar" en
CLASIFICACION.md. No adivines en silencio.

HIPÓTESIS A VERIFICAR (nada está confirmado): el material previo sugería un
dataset de jugadas de pase con tracking a 10 cuadros por segundo y datos PFF
(pff_hurry, pff_sack, pff_beatenByDefender, pff_passCoverageType, pff_playAction,
passResult, defendersInBox, offenseFormation, foulName1, penaltyYards, eventos
ball_snap y pass_forward). Comprueba con código cuáles existen.

PASO 1: crea CLASIFICACION.md, una línea por pregunta (conserva su número o
texto): tema, Viable/Parcial/No viable, archivos y columnas verificados con
código, n real (solo para Viables/Parciales), qué falta y riesgos de datos.
Hazlo por temas y avísame si va a tardar más de 20 minutos. No viables, al final,
con una línea de motivo.

PASO 2: agrupa las Viables/Parciales con n ≥ 30 por grupo en candidatos de
hallazgo (1 a 4 preguntas por candidato, una sola decisión o historia). Un
hallazgo es un contraste (esperado vs real, A vs B) con una decisión; descarta
los promedios sueltos. Puntúa 1-5: Football Insight, Technical Execution (stack
fijo, carga rápida en memoria, pruebas con datos reales), Communication,
Originality, Esfuerzo (2 personas) y # de ★ cubiertas. Muestra la tabla y
justifica empates. En Originality, lo que sepas de memoria va como "sin
confirmar" y dime qué buscar para comprobarlo.

PASO 3: top 3, cada uno con punto de vista y decisión que habilita; hallazgo como
frase de la app con "[X]" donde irán cifras; archivos, columnas y uniones;
pantalla principal en 3 líneas; 3 mayores riesgos y cómo verificarlos en 20
minutos; qué se deja fuera; y si el hallazgo se puede confirmar en otra
temporada, mitad o muestra. Cierra con UNA recomendación. Si nada sirve, propón
una pregunta nueva que salga de los datos.

Chat: resumen de 15 líneas y la ruta de CLASIFICACION.md.




C. Spec del backend (modo Spec, sesión nueva)
Lee .kiro/steering (incluye datos.md) y CLASIFICACION.md. Consulta
EXPLORACION_COLUMNAS.md solo con grep.

Spec: backend de Qué tanto delata la defensa su cobertura antes del snap, punto de vista [Coach].
Pregunta: ¿qué alineación al snap predice Man o Zone, y qué defensas la disfrazan?
Hallazgo (plantilla; cada cifra la calcula el backend): "[frase con Qué tanto delata la defensa su cobertura antes del snap]".

DATOS: archivos [...]; unión [llave]; columnas [las verificadas]; filtros base
[...]; definiciones [...].
VERIFICAR con código y reportarme antes de seguir: [los 3 riesgos de la propuesta]
y qué % de jugadas sobrevive a la unión.

REQUISITOS (máximo 8):
1. loader.py carga en memoria al arrancar solo las columnas necesarias, expone
   cuántas filas descartó y por qué, y registra tiempo de carga y memoria.
2. metrics.py calcula [métricas] por [dimensiones] con n, estimación e IC95%
   (numpy). MIN_N = 30; por debajo, "n insuficiente".
3. Propón una validacion con datos reales, sin inventar nada.
4. El hallazgo se arma con números reales. Criterio de elección fijado antes de
   mirar los resultados: [...].
5. Endpoints /api/... con los mismos filtros por query, GET /health y montaje de
   dashboard/dist como estáticos cuando exista.
6. Pruebas pytest con filas reales (nrows) y el IC contra un cálculo manual.
7. Nada escrito en disco en tiempo de ejecución, sin dependencias nuevas.
8. Considera la posibilidad e integrar IA a la aplicación web, para que tengas el backend en cuenta.

FUERA DE ALCANCE: [...].
Al final: pytest, sh .hackathon/setup.sh --check, tiempo de arranque, y una
explicación en español sencillo de cada archivo para el pitch.



D. Spec del dashboard (modo Spec, sesion nueva)
Lee .kiro/steering, backend/ (endpoints y JSON) y CLASIFICACION.md.
Spec: dashboard de [nombre], todo en español.

PESTAÑA 1 (prioridad 1): titular con el hallazgo (de la API); tarjetas [KPIs];
visual principal [...]; clic en un elemento abre el detalle [...].
PESTAÑA 2 (prioridad 2): [...].
PESTAÑA 3 (solo si hay tiempo): [...].

Filtros arriba; cada cambio actualiza todo. Estilo oscuro tipo transmisión
deportiva, colores de equipo tomados de los datos (gris si falta). Tooltips en
español sencillo (EPA, n, IC95% y los términos del hallazgo). Estados de carga,
vacío y error. Nota de metodología visible con n y descartes. Aviso visible
cuando una conclusión descansa en n < 30 o no se sostiene entre temporadas.

Técnico: fetch('api/...') SIN diagonal inicial, base './', proxy /api, y
npm run build genera dashboard/dist.
Al final: abre la app SERVIDA por uvicorn (no solo vite) y revisa a 1366x768 por
si proyectan.



E. IA-opcional (modo Spec, solo si el MVP ya está sólido)
Spec: consulta en lenguaje natural con Strands Agents y Bedrock (Nova), siguiendo
las reglas de IA de rules.md al pie de la letra.
- POST /api/consulta recibe la pregunta y los filtros activos. El backend calcula
  los agregados con metrics.py y SOLO eso se le pasa al modelo.
- Respuesta de máximo 120 palabras; si la pregunta no se puede responder con esas
  cifras, lo dice.
- La UI muestra: "Generado por Amazon Nova con las cifras del dataset y los
  filtros activos. Verifica las cifras clave."
- Si falla o no hay credenciales, un mensaje amable y la app sigue funcionando.
- Pruebas con un cliente simulado, sin llamadas reales.



F · Cierre y entrega (chat, últimos 40 min)
Cierre del proyecto:
1. README.md: primera línea = hallazgo; luego pregunta, punto de vista, método,
   limitaciones, cómo correrlo y uso de IA. Cifras tomadas de ejecución real.
2. .gitignore: .env, node_modules, .venv, dashboard/dist. Verifica que nada
   secreto esté versionado y que .env.example exista.
3. DECLARACION.md: el trabajo se hizo durante el evento y solo por los
   participantes.
4. Corre sh .hackathon/setup.sh --check y luego --entregar. Lista el contenido del
   zip: sin .env, sin .venv ni node_modules; reporta su tamaño.
5. Guion de pitch de 60 segundos: pregunta, hallazgo con cifras, decisión que
   habilita, limitación honesta.
   
   
   
   
   
   
   
   
 =================================================================================================
                             EJEMPLO PROMPT DE DISEÑO Y CONSTRUCCION
 =================================================================================================
Quiero construir un dashboard para el punto de vista de COACH con los play-by-play de nflverse que están en data/.

Pregunta: en una situación de pase (down y yardas por avanzar), ¿conviene lanzar corto o profundo? ¿Y en qué situaciones los equipos eligen lo contrario de lo que más rinde? El ángulo original no es un ranking de EPA por equipo: es un mapa de decisión con la brecha entre lo que se hace y lo que rinde.

DATOS (medidos en EXPLORACION.md; léelo primero):
- Usa solo data/play_by_play_2024.csv y data/play_by_play_2025.csv (≈49 mil filas y 372 columnas cada uno, ≈95 MB). Los de 2022 y 2023 están vacíos (0 bytes): ignóralos sin error.
- Una fila = una jugada. game_id + play_id no tiene duplicados.
- Pase = play_type == "pass" (≈20 mil por temporada). Las jugadas con play_type == "no_play" (≈10%) parecen ser jugadas anuladas por falta (sin confirmar); quedan fuera.
- season_type es REG o POST; week va de 1 a 22; ambas temporadas parecen completas.
- Lee solo estas columnas (existen todas) con usecols: game_id, play_id, season, season_type, week, posteam, down, ydstogo, score_differential, play_type, pass_length (short/deep), air_yards, yards_gained, epa, success, complete_pass, interception, sack, penalty.
- EPA = puntos esperados añadidos por la jugada: positivo es buena jugada para el ataque.
- POR VERIFICAR con código antes de usarlo (hoy están "sin confirmar"); repórtame los resultados:
  (a) el rango de air_yards de cada valor de pass_length;
  (b) cuántos play_type == "pass" tienen pass_length vacío y qué jugadas son (¿sacks?);
  (c) cuántos tienen penalty == 1 y cómo cambia el resultado si se excluyen (por defecto inclúyelas: una falta de pase es parte del valor de lanzar profundo);
  (d) cuántos nulos tiene epa entre los pases;
  (e) que score_differential sea positivo cuando el equipo que ataca va ganando.

PASO 1 — Backend (FastAPI, en backend/): loader.py y metrics.py.
- loader.py carga los dos CSV UNA vez al arrancar, los une en un DataFrame en memoria y deja solo pases con down de 1 a 4, ydstogo ≥ 1, pass_length no vacío y epa no nulo. Cuenta y expone cuántos pases se descartaron y por qué.
- No escribas archivos en disco ni JSON intermedios: todo se calcula en memoria.
- Bins de yardas por avanzar: 1-2, 3-5, 6-9, 10, 11+. Filas = down 1 a 4.
- Por cada celda (down × bin) y para corto vs profundo: n, EPA medio, tasa de éxito, % de completos, yardas por intento y % de intercepciones.
- Diferencia = EPA(profundo) − EPA(corto) con IC95% (aproximación normal de la diferencia de medias, solo numpy, sin scipy).
- Recomendación por celda: "Profundo" si el IC queda sobre 0, "Corto" si queda bajo 0, "Sin diferencia clara" si cruza 0, "n insuficiente" si algún grupo tiene n < 30 (constante MIN_N).
- Uso real = % de pases profundos en la celda. "Contra la evidencia" = pase que NO fue de la opción recomendada, en celdas con recomendación clara.
- Hallazgo principal: una frase que el backend arma con los números reales, con la forma "En [down y yardas], el pase [profundo/corto] rinde +X EPA sobre el otro (IC95% a–b), pero solo el Y% de los pases fueron de ese tipo". Elige la celda con diferencia significativa más grande y n suficiente. Ninguna cifra escrita a mano.
- Endpoints bajo /api/...: filtros disponibles, resumen (KPIs + hallazgo), mapa (celdas), umbral (EPA corto vs profundo por cada valor de yardas por avanzar para un down) y equipos. Todos aceptan los mismos filtros por query: temporada, tipo de temporada, semana desde/hasta, equipo que ataca, marcador (perdiendo ≤ -9, parejo -8 a 8, ganando ≥ 9) y excluir jugadas con falta. Más GET /health.
- Pruebas con pytest que lean filas reales de data/ con nrows (sin copiar archivos): pass_length solo trae short/deep, los bins (2→"1-2", 10→"10", 11→"11+"), el IC contra un cálculo manual en un DataFrame chico, y /health responde {"status":"ok"}.

PASO 2 — Dashboard (en dashboard/, con React + Vite + TypeScript + Tailwind + Recharts), todo en español, con tres pestañas:
1 · La decisión (prioridad 1):
  - titular con el hallazgo;
  - tarjetas: pases analizados, % profundos, EPA por jugada corto, EPA por jugada profundo, diferencia con IC95% y "% de pases contra la evidencia";
  - mapa de calor down × yardas por avanzar, coloreado por recomendación (Profundo / Corto / Sin diferencia / n insuficiente), con la diferencia y la n en cada celda, y asterisco con borde punteado si n < 30;
  - al hacer clic en una celda, un panel con la comparación corto vs profundo (n, EPA, éxito, % completos, yardas por intento, % intercepciones).
2 · Equipos (prioridad 2): dispersión con x = % de pases profundos y y = EPA profundo − EPA corto, un punto por equipo con su color y la n en el tooltip, más una tabla ordenable de los 32 equipos con su % de pases contra la evidencia de la liga.
3 · Umbral (prioridad 3, solo si hay tiempo): para el down elegido, líneas de EPA corto vs profundo por yardas por avanzar (1 a 15+) con banda de IC; atenúa los puntos con n < 30.
- Filtros arriba, como en la demo; cada cambio actualiza las tres pestañas.
- Estilo oscuro tipo transmisión deportiva, con los colores de cada equipo (saca la lista de equipos de los datos; si falta alguno en tu mapa de colores, gris).
- Tooltips en español sencillo para: EPA, down, yardas por avanzar, pase corto/profundo, n e IC95%.
- Estados de carga, de vacío (sin pases con esos filtros) y de error de la API.
- Nota visible de metodología con cuántos pases sin pass_length quedaron fuera de la comparación.

REGLAS (están en .kiro/steering; solo recuérdalas): carpetas backend/ y dashboard/, fetch('api/...') SIN diagonal inicial, sin dependencias nuevas, sin escribir en disco, cifras solo calculadas por código.

ORDEN: 1) loader + verificaciones (a-e); 2) metrics + endpoints + pruebas; 3) pestaña 1; 4) pestaña 2; 5) pestaña 3; 6) README.md con pregunta, hallazgo (cifras tomadas de la ejecución real), método, limitaciones y cómo correrlo. Limitaciones a incluir: sin tracking; sesgo de selección (se lanza profundo según la defensa y la jugada); correlación no es causalidad; solo 2 temporadas; tratamiento de las faltas y de los sacks. Después de cada bloque corre pytest, abre la app y dime qué verificaste.
Al final explícame en español sencillo qué hace cada archivo, para poder defenderlo en el pitch.
