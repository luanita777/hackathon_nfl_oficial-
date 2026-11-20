# Prompt: backend de "Qué tanto delata la defensa su cobertura antes del snap"

Pega este texto como primera instrucción de la sesión de construcción.

## Contexto y lectura previa
Antes de escribir código, lee `.kiro/steering/` completo (`rules.md`, `equipo.md`, `datos.md`) y `CLASIFICACION.md` (secciones 0, 1 y 6, propuesta N1). Consulta `EXPLORACION_COLUMNAS.md` solo con `grep` (por ejemplo `grep -n "pff_positionLinedUp" EXPLORACION_COLUMNAS.md`), sin leerlo completo. Si algo de este prompt choca con `rules.md`, manda `rules.md`.

**Spec:** backend de *Qué tanto delata la defensa su cobertura antes del snap*, punto de vista **Coach** (ofensivo; el broadcaster puede reutilizar la cifra por equipo).
**Pregunta:** ¿qué alineación al snap predice Man o Zone, y qué defensas la disfrazan?
**Decisión que habilita:** cuánto confiar en la lectura pre-snap del QB contra cada rival.

**Hallazgo (plantilla; cada cifra la calcula el backend):**
"Con los esquineros a [X] yardas o menos de la línea al snap, la defensa juega Man el [X]% de las veces (IC95% [X]–[X], n=[X]); con más de [X] yardas, el [X]% (n=[X]). [Equipo] juega la cobertura contraria a lo que muestra su alineación en [X]% de sus jugadas con lectura clara, [X] puntos [más/menos] que la liga (n=[X])."
Si el contraste no se sostiene en la mitad de confirmación, la frase se reemplaza por "no concluyente" con la razón.

## Datos (todo medido; lo marcado "sin confirmar" hay que verificarlo)
**Archivos:** `data/plays.csv` (8,557 jugadas), `data/pffScoutingData.csv` (188,254 filas), `data/games.csv` (122 juegos, solo para `week`), `data/tracking/tracking_<gameId>.csv` (122 archivos, 8,314,178 filas, solo se usa el frame del snap). `players.csv` no hace falta.

**Uniones (probadas al 100%, en los 122 juegos, 0 huérfanas):**
- plays ↔ games por `gameId`.
- plays ↔ pff por (`gameId`, `playId`).
- tracking ↔ plays por (`gameId`, `playId`): 8,557 de 8,557.
- tracking ↔ pff por (`gameId`, `playId`, `nflId`): 188,254 pares.
- `playId` solo no es único. El `nflId` vacío en tracking es el balón.

**Columnas verificadas:**
- plays: `gameId, playId, defensiveTeam, possessionTeam, down, yardsToGo, quarter, passResult, playResult, prePenaltyPlayResult, pff_passCoverageType (Man 2,481 / Zone 5,588 / Other 488), pff_passCoverage, defendersInBox (7 nulos), offenseFormation (7 nulos)`.
- pff: `gameId, playId, nflId, pff_role ('Coverage', 'Pass Rush', ...; con mayúscula), pff_positionLinedUp (LCB 8,159, RCB 8,224, FS, FSL, FSR, SS, SSL, SSR)`.
- tracking: `gameId, playId, nflId, frameId, x, y, playDirection ('right'/'left', no normalizada), event`. El texto 'None' en `event` pandas lo lee como NaN.
- games: `gameId, week`.

**Filtros base (cada descarte se cuenta y se explica en el loader):**
1. Jugadas con snap: `event` en `ball_snap` o `autoevent_ballsnap`; frame = el mínimo `frameId` con ese evento (99.7% de las jugadas, 24 sin snap).
2. `pff_passCoverageType` en {Man, Zone}. "Other" (488, 5.7%) se excluye del análisis Man/Zone y se informa aparte.
3. Jugadas con LCB y RCB alineados (si falta uno, se descarta con motivo "sin CB").

**Definiciones (fijadas aquí, antes de mirar resultados nuevos):**
- Profundidad de un defensor al snap = `x − x_balón` si `playDirection == 'right'`, y `x_balón − x` si es 'left'. Verificación previa: la ofensiva queda detrás del balón en 96 de 97 jugadas de la muestra.
- `cb_prof` = media de la profundidad de LCB y RCB. Tramos: ≤2, (2,4], (4,6], (6,8], >8 yardas.
- `safeties_prof` = número de defensores con `pff_role == 'Coverage'` en FS, FSL, FSR, SS, SSL, SSR con profundidad ≥ 8 yardas, recortado a 3.
- Alineación = (tramo de `cb_prof`, `safeties_prof`). Lectura esperada P(Man | alineación) se calcula con validación cruzada por paridad de semana: las jugadas de semanas pares se puntúan con la tabla de las impares y al revés.
- Lectura clara: P(Man) ≥ 0.50 ("parece Man") o ≤ 0.25 ("parece Zone"); el resto es ambigua.
- **Disfraz** = lectura clara y cobertura real contraria (parece Man y es Zone, o parece Zone y es Man). Tasa de disfraz = disfrazadas / jugadas con lectura clara.
- Aviso de honestidad: estos cortes (0.50, 0.25, ≥8 yd, tramos) salieron de una exploración previa con las mismas semanas. Por eso la confirmación se hace en la otra mitad por paridad y por mitades 1-4 contra 5-8, y se informa que los cortes no fueron fijados a ciegas.

**Referencia exploratoria (no usar como cifra de la app, solo para detectar errores del código):** `cb_prof` ≤2 yd → 61% Man (n=1,275); >8 yd → 11% (n=928). Con 2 safeties profundos → 19% Man (n=3,811); con 0 → 45% (n=538). Correlación de la tabla cruzada con Man: 0.43. Jugadas con disfraz: 868 de 8,040 (10.8%). Equipos: 211-318 jugadas cada uno; estabilidad entre mitades 0.63 (con otra métrica). Si el código nuevo se aleja mucho de esto, investigar antes de seguir.

## Fase 0: VERIFICAR con código y reportarme antes de seguir
No construyas nada más hasta que yo apruebe el reporte. Lanza estas verificaciones **en paralelo, un subagente por riesgo**, cada uno con contexto limpio, solo lectura y sin crear archivos en el repo (scripts en `/tmp`):

1. **Riesgo 1, la etiqueta Man/Zone de PFF mezcla esquemas.** Desglosar Man por `pff_passCoverage` (Cover-0, Cover-1, 2-Man) y Zone (Cover-2, Cover-3, Quarters, Cover-6). Comprobar si el contraste de `cb_prof` se mantiene dentro de cada esquema y no lo explica un solo valor. Reportar cuántas jugadas hay por esquema y si hay grupos con n < 30.
2. **Riesgo 2, profundidad respecto al balón en las 8,557 jugadas.** Probar el signo con `playDirection` en todas las jugadas (no solo 97), contar jugadas con balón ausente en el frame del snap, jugadas sin snap (24 esperadas) y jugadas sin LCB o RCB. Reportar el **porcentaje de jugadas que sobrevive a la unión y a cada filtro**, en una tabla: total 8,557 → con snap → Man o Zone → con LCB y RCB.
3. **Riesgo 3, intervalos por equipo demasiado anchos.** Calcular la tasa de disfraz por `defensiveTeam` con IC95% (Wilson), n de jugadas con lectura clara por equipo, la correlación entre semanas 1-4 y 5-8 con IC (bootstrap con semilla fija) y un control de permutación (barajar la cobertura dentro de cada semana, semilla fija) para ver si la dispersión entre equipos supera el azar. Reportar qué equipos tienen n < 30.

Entrega del reporte: una tabla por riesgo con la cifra, el n, el resultado ("se sostiene" / "no se sostiene" / "no concluyente") y qué cambiarías del diseño. Marca "sin confirmar" lo que no se pudo probar.

## Requisitos (máximo 8)
1. **`backend/loader.py`**: carga en memoria al arrancar solo las columnas necesarias (`usecols`, `float32`/`int32`, texto como `category`). Del tracking lee un archivo a la vez, conserva solo el frame del snap (22 jugadores + balón) y libera el resto: no concatena los 8.3 millones de filas. Expone `cargar() -> Datos` con: `jugadas` (una fila por jugada con `gameId, playId, week, defensiveTeam, possessionTeam, down, yardsToGo, passResult, playResult, cobertura, pff_passCoverage, cb_prof, safeties_prof, tramo_cb`), `descartes` (diccionario motivo → número de jugadas) e `info_carga` (segundos y MB, medidos con `time.perf_counter` y `resource`/`tracemalloc`). Registra con `logging`.
2. **`backend/metrics.py`**: con numpy calcula (a) P(Man) por alineación, (b) tasa de disfraz por `defensiveTeam`, (c) efecto del disfraz sobre porcentaje de pases completos y yardas por jugada, todo por las dimensiones semana/mitad, down y equipo. Cada resultado trae `n`, estimación e IC95%: Wilson para proporciones, diferencia de proporciones con error estándar para contrastes, bootstrap con semilla fija para medias. `MIN_N = 30`: por debajo devuelve `"n insuficiente"` en lugar de cifra.
3. **Validación con datos reales, sin inventar nada** (`backend/validacion.py`, solo cálculo, no escribe archivos):
   - Validación cruzada por paridad de semana: precisión y área bajo la curva (AUC, calculada con numpy) de la tabla frente a la línea base (siempre "Zone").
   - Estabilidad por mitades: tasa de disfraz por equipo semanas 1-4 contra 5-8, con correlación de rangos.
   - Control de permutación con semilla fija, para comprobar que la dispersión entre equipos desaparece al barajar la cobertura.
   - Comprobación de signo y de balón: ofensiva detrás del balón en la gran mayoría de jugadas.
   - Salida: un diccionario "criterio → resultado → pasa/no pasa".
4. **El hallazgo se arma solo con números reales.** Criterio de elección fijado antes de mirar los resultados nuevos: (a) el contraste principal es cb_prof ≤2 yd contra >6 yd; se publica solo si ambas mitades por paridad tienen n ≥ 30 por grupo y el IC95% de la diferencia excluye 0 en las dos; (b) el equipo citado en la frase es el de mayor y el de menor tasa de disfraz con n ≥ 30, y solo se publica el ranking si la correlación entre mitades (1-4 contra 5-8) es ≥ 0.5 y supera el control de permutación; (c) el efecto del disfraz sobre completos o yardas solo se menciona si el IC95% excluye 0; si no, la app dice "no concluyente". Si (a) falla, el hallazgo es "la alineación no basta para leer la cobertura".
5. **Endpoints `/api/...`** (GET, con los mismos filtros por query: `semana` o `mitad`, `down`, `equipo`, `cobertura`): `/api/tell` (tabla P(Man) por alineación), `/api/equipos` (disfraz por equipo), `/api/efecto` (efecto del disfraz), `/api/hallazgo` (frase y cifras), `/api/validacion`, `/api/calidad` (descartes, tiempo y memoria de carga). `GET /health` devuelve `{"status": "ok"}` (ya existe en `backend/main.py`, conservarlo). Monta `dashboard/dist` como estáticos solo si existe. Las rutas del dashboard sin diagonal inicial (`fetch('api/tell')`), según `rules.md`.
6. **Pruebas `pytest`** en `backend/tests/` con filas reales (`pd.read_csv(..., nrows=...)` sobre `data/`, sin datos inventados) y el IC contra un cálculo manual (por ejemplo Wilson para k=61, n=100 escrito a mano con la fórmula). Casos mínimos: signo de profundidad con `playDirection` 'left' y 'right', unión sin huérfanas, `MIN_N`, semilla fija reproducible, filtros de `/api` con `httpx` y `TestClient`, y que `/health` responda. Sin `hypothesis`. Si hay pruebas por propiedades, con numpy y semilla fija.
7. **Nada escrito en disco en tiempo de ejecución** (ni caché, ni logs en archivo, ni pickles) y **sin dependencias nuevas**: solo lo que está en `.hackathon/requirements.txt`. Los cálculos pesados se hacen al arrancar y se sirven desde memoria. Python siempre con `.venv`.
8. **IA opcional integrada al backend** (`backend/ia.py`, endpoint `GET /api/explicacion` con los mismos filtros): explica en lenguaje de coach las cifras ya calculadas de `/api/hallazgo`.
   - Usa Strands Agents + Amazon Nova por Bedrock: `boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))` y `os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-pro-v1:0")`. No leas, verifiques ni exijas `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` ni `AWS_SESSION_TOKEN`; carga el `.env` con el fragmento de `rules.md` al inicio de `main.py`.
   - La IA recibe **solo** el JSON del hallazgo (números reales) y la instrucción de no agregar cifras, equipos ni causas que no estén en él. El backend verifica que todo número del texto devuelto exista en ese JSON; si no, descarta la respuesta.
   - Si Bedrock falla, hay timeout o no hay credenciales, el endpoint responde `{"disponible": false, "texto": null}` y la app sigue mostrando el hallazgo. La IA no sostiene el análisis.
   - Respuestas en memoria (diccionario con clave por filtros), nunca en disco. Sin llaves en código, README ni logs.
   - Pruebas: con un cliente simulado (sin llamar a AWS) para la ruta de éxito, el rechazo por número inventado y la caída de Bedrock.

## Forma de trabajo: tareas en paralelo y con subagentes
- **Orquestador (tú):** primero ejecuta la Fase 0 y entrégame el reporte. No avances a la Fase 1 sin mi aprobación. Después define en un solo mensaje los contratos (nombres y firmas de `cargar()`, `Datos`, funciones de `metrics.py`, forma del JSON de `/api/hallazgo`) para que los subagentes no choquen.
- **Fase 1 (en paralelo, un subagente por archivo, sin tocar archivos ajenos):**
  - A: `loader.py` y sus pruebas (requisito 1).
  - B: `metrics.py` y sus pruebas, usando filas reales con `nrows` hasta que A termine (requisito 2).
  - C: `validacion.py` (requisito 3), después de que B exponga sus funciones.
  - D: `ia.py` y sus pruebas con cliente simulado (requisito 8), sin depender de A, B ni C (solo del contrato del JSON).
- **Fase 2 (en paralelo cuando A, B y C estén listos):**
  - E: `api.py` / `main.py` con endpoints y montaje de estáticos (requisito 5).
  - F: pruebas de API y de la regla "nada en disco" (requisitos 6 y 7).
  - G: armado del hallazgo con el criterio del requisito 4.
- **Revisión:** un subagente independiente (contexto limpio) revisa el diff contra `rules.md` y `equipo.md`: stack, rutas sin diagonal inicial, nada escrito en disco, cifras con n e IC95%, ningún número sin código detrás.
- Cada subagente reporta: qué hizo, comandos ejecutados, resultado de las pruebas y qué dejó "sin confirmar". Ante un conflicto de archivos, el orquestador decide; no se resuelve en silencio.
- Cuando todo pase, detente y repórtame. No empieces el dashboard ni refactors que no pedí.
