# Requirements Document

## Introduction

Backend de la app *Qué tanto delata la defensa su cobertura antes del snap*, con punto de vista Coach ofensivo. El broadcaster puede reutilizar la cifra por equipo.

Pregunta: ¿qué alineación al snap predice Man o Zone, y qué defensas la disfrazan?

Decisión que habilita: cuánto confiar en la lectura pre-snap del QB contra cada rival.

Plantilla del hallazgo (cada cifra la calcula el backend): "Con los esquineros a [X] yardas o menos de la línea al snap, la defensa juega Man el [X]% de las veces (IC95% [X]–[X], n=[X]); con más de [X] yardas, el [X]% (n=[X]). [Equipo] juega la cobertura contraria a lo que muestra su alineación en [X]% de sus jugadas con lectura clara, [X] puntos [más/menos] que la liga (n=[X])." Si el contraste no se sostiene en la mitad de confirmación, la frase se reemplaza por "no concluyente" con la razón.

Datos: `data/plays.csv` (8,557 jugadas), `data/pffScoutingData.csv` (188,254 filas), `data/games.csv` (122 juegos, solo para `week`) y `data/tracking/tracking_<gameId>.csv` (122 archivos, 8,314,178 filas, solo el frame del snap). `players.csv` no se usa. Las cifras de uniones, columnas y conteos son hechos medidos el 2026-11-20 (ver `.kiro/steering/datos.md`).

Aviso de honestidad: los cortes (0.50, 0.25, 8 yd y los tramos de profundidad) salieron de una exploración previa con las mismas semanas. La confirmación se hace en la otra mitad por paridad de semana y por mitades 1-4 vs 5-8, y la app informa que los cortes no fueron fijados a ciegas.

Referencia exploratoria (solo para detectar errores del código, no es cifra de la app): cb_prof ≤2 yd da 61% Man (n=1,275); >8 yd da 11% (n=928). Con 2 safeties profundos, 19% Man (n=3,811); con 0, 45% (n=538). La correlación de la tabla cruzada con Man es 0.43. Disfraz: 868 de 8,040 (10.8%). Cada equipo tiene 211-318 jugadas. La estabilidad entre mitades es 0.63 (otra métrica). Si el código se aleja mucho de estas cifras, se investiga antes de continuar.

Restricciones de trabajo:
- Se lee `.kiro/steering/` completo (`rules.md`, `equipo.md`, `datos.md`) y `CLASIFICACION.md` (secciones 0, 1 y 6, propuesta N1). `EXPLORACION_COLUMNAS.md` se consulta solo con `grep`. Si algo choca con `rules.md`, manda `rules.md`.
- Fase 0 (verificación de 3 riesgos) va primero. No se construye nada más hasta que el usuario apruebe el reporte.
- Tras la aprobación, el orquestador define en un solo mensaje los contratos (firma de `cargar()`, `Datos`, funciones de `metrics.py`, forma del JSON de `/api/hallazgo`).
- Fase 1 en paralelo, un agente por archivo sin tocar archivos ajenos: A `loader.py` con pruebas; B `metrics.py` con pruebas (filas reales con nrows hasta que A termine); C `validacion.py` (tras B); D `ia.py` con pruebas de cliente simulado (solo depende del contrato JSON).
- Fase 2 en paralelo cuando A, B y C estén listos: E `api.py` y `main.py`; F pruebas de API y de "nada en disco"; G armado del hallazgo con el criterio del Requirement 4.
- Revisión final por un agente independiente con contexto limpio, contra `rules.md` y `equipo.md`.
- Cada agente reporta qué hizo, comandos, resultado de pruebas y qué dejó "sin confirmar". El orquestador decide los conflictos de archivos.
- Al terminar se detiene y se reporta. No se inicia el dashboard ni refactors no pedidos.

## Glossary

- **Backend**: aplicación FastAPI en `backend/` que calcula todo en memoria y expone la API bajo `/api/...`.
- **Orquestador**: agente principal que coordina fases, define contratos y decide conflictos de archivos.
- **Agente_Verificador**: agente de contexto limpio, solo lectura, que prueba un riesgo de la Fase 0 con scripts en `/tmp`.
- **Agente_Revisor**: agente independiente de contexto limpio que revisa el diff contra `rules.md` y `equipo.md`.
- **Reporte_Fase0**: documento con una tabla por riesgo (cifra, n, resultado y cambio de diseño) que el usuario aprueba.
- **Loader**: módulo `backend/loader.py` que carga y prepara los datos.
- **Datos**: objeto devuelto por `cargar()` con `jugadas`, `descartes` e `info_carga`.
- **Metrics**: módulo `backend/metrics.py` con los cálculos estadísticos.
- **Validacion**: módulo `backend/validacion.py` con las comprobaciones de robustez; solo calcula.
- **IA_Modulo**: módulo `backend/ia.py` que explica el hallazgo con Amazon Nova.
- **API**: conjunto de endpoints GET bajo `/api/...` más `GET /health`.
- **Jugada**: una fila de `plays.csv`, identificada por (gameId, playId).
- **Frame_Snap**: frame con el menor `frameId` cuyo `event` es `ball_snap` o `autoevent_ballsnap`.
- **Cobertura**: valor de `pff_passCoverageType`; se analizan solo Man y Zone. "Other" se excluye y se informa aparte.
- **Profundidad**: x − x_balón si `playDirection` es `right`; x_balón − x si es `left`, en yardas, en el Frame_Snap.
- **cb_prof**: media de la Profundidad de los defensores alineados como LCB y RCB.
- **tramo_cb**: tramo de cb_prof entre ≤2, (2,4], (4,6], (6,8] y >8 yardas.
- **safeties_prof**: número de defensores con `pff_role` igual a `Coverage` alineados en FS, FSL, FSR, SS, SSL o SSR con Profundidad ≥ 8 yd, recortado a 3.
- **Alineación**: par (tramo_cb, safeties_prof).
- **P_Man**: proporción de jugadas Man dada una Alineación, estimada con validación cruzada por paridad de semana.
- **Lectura_Clara**: jugada con P_Man ≥ 0.50 ("parece Man") o ≤ 0.25 ("parece Zone"); el resto es ambigua.
- **Disfraz**: jugada con Lectura_Clara cuya Cobertura real es la contraria.
- **Tasa_Disfraz**: jugadas con Disfraz entre jugadas con Lectura_Clara.
- **MIN_N**: constante igual a 30; por debajo de ese n se devuelve "n insuficiente".
- **Wilson**: intervalo de confianza de Wilson al 95% para proporciones.
- **Bootstrap**: remuestreo con semilla fija para IC95% de medias.
- **Filtros**: parámetros de query semana o mitad, down, equipo y cobertura, comunes a los endpoints de análisis.
- **Hallazgo**: frase y cifras de `/api/hallazgo`, armadas solo con números calculados.

## Requirements

### Requirement 0: Fase 0, verificación de riesgos antes de construir

**User Story:** Como Coach del equipo, quiero verificar con código los tres riesgos de datos antes de construir, para que el diseño no descanse en supuestos falsos.

#### Acceptance Criteria

1. WHEN comienza la Fase 0, THE Orquestador SHALL lanzar tres Agente_Verificador, uno por riesgo (Riesgo 1, Riesgo 2 y Riesgo 3), en paralelo, cada uno con contexto limpio y en modo solo lectura sobre `data/`.
2. THE Agente_Verificador SHALL escribir sus scripts únicamente en `/tmp` y crear 0 archivos dentro del repositorio.
3. WHEN se verifica el Riesgo 1 (la etiqueta Man/Zone de PFF mezcla esquemas), THE Agente_Verificador SHALL desglosar las jugadas con `pff_passCoverageType` igual a Man por `pff_passCoverage` (Cover-0, Cover-1, 2-Man) y las de Zone por `pff_passCoverage` (Cover-2, Cover-3, Quarters, Cover-6), e imprimir el valor real de cada categoría encontrada en los datos, marcando "sin confirmar" cualquier valor esperado que no aparezca.
4. WHEN se verifica el Riesgo 1, THE Agente_Verificador SHALL reportar el número de jugadas por esquema, listar los esquemas con n menor que MIN_N (MIN_N = 30) y, para cada esquema con n igual o mayor que MIN_N, indicar si el signo del contraste de cb_prof entre Man y Zone coincide con el signo del contraste global y si su IC95% excluye 0.
5. WHEN se verifica el Riesgo 2 (profundidad respecto al balón en las 8,557 jugadas), THE Agente_Verificador SHALL probar el signo de la Profundidad usando `playDirection` en el 100% de las jugadas con balón en el Frame_Snap y reportar cuántas jugadas dan profundidad positiva y cuántas negativa para el defensor, por valor de `playDirection` (left y right).
6. WHEN se verifica el Riesgo 2, THE Agente_Verificador SHALL contar, como enteros y como porcentaje de 8,557, las jugadas con balón ausente en el Frame_Snap, las jugadas sin snap (se esperan 24, "sin confirmar" hasta que el script lo imprima) y las jugadas sin LCB o sin RCB.
7. WHEN se verifica el Riesgo 2, THE Agente_Verificador SHALL reportar la tabla de supervivencia con cuatro filas acumulativas: 8,557 jugadas totales, con snap, con Cobertura Man o Zone, y con LCB y RCB, indicando en cada fila el n y el porcentaje respecto a 8,557.
8. WHEN se verifica el Riesgo 3 (intervalos por equipo demasiado anchos), THE Agente_Verificador SHALL calcular, por cada `defensiveTeam`, la Tasa_Disfraz con IC95% Wilson, el n con Lectura_Clara y el ancho del intervalo en puntos porcentuales, e indicar cuántos equipos tienen un ancho mayor que 20 puntos porcentuales.
9. WHEN se verifica el Riesgo 3, THE Agente_Verificador SHALL calcular la correlación de la Tasa_Disfraz por equipo entre las semanas 1-4 y 5-8 con IC95% Bootstrap de al menos 1,000 remuestreos y semilla fija, y un control de permutación de al menos 1,000 repeticiones con semilla fija que baraje la Cobertura dentro de cada semana, reportando el p-valor empírico.
10. IF un `defensiveTeam` tiene n con Lectura_Clara menor que MIN_N en cualquiera de las dos mitades o en total, THEN THE Agente_Verificador SHALL listarlo con su n y marcarlo como "datos parciales" en el reporte, y excluirlo del cálculo de la correlación entre mitades.
11. THE Reporte_Fase0 SHALL incluir, por cada riesgo, una tabla con las columnas cifra, n, resultado (exactamente uno de "se sostiene", "no se sostiene" o "no concluyente") y qué cambiaría del diseño, donde "no concluyente" se asigna si el IC95% incluye el umbral de decisión o si n es menor que MIN_N.
12. THE Reporte_Fase0 SHALL marcar como "sin confirmar" toda afirmación que no haya sido impresa por un script ejecutado, e incluir la ruta en `/tmp` de cada script que respalda una cifra.
13. IF un Agente_Verificador falla o no termina su script, THEN THE Orquestador SHALL registrar en el Reporte_Fase0 el riesgo correspondiente como "no concluyente" con el motivo del fallo, y continuar con los otros riesgos.
14. WHILE el usuario no haya aprobado explícitamente el Reporte_Fase0, THE Orquestador SHALL no iniciar la Fase 1.

### Requirement 1: Carga de datos en memoria al arrancar

**User Story:** Como Coach, quiero que el backend cargue y prepare los datos una sola vez al arrancar, para que las consultas respondan desde memoria.

#### Acceptance Criteria

1. WHEN el Backend arranca, THE Loader SHALL cargar los datos una sola vez, leer solo las columnas necesarias con `usecols`, y usar float32 e int32 para los números y category para el texto.
2. WHEN el Loader procesa el tracking, THE Loader SHALL leer un archivo `tracking_<gameId>.csv` a la vez, conservar solo las filas del Frame_Snap (22 jugadores y el balón, 23 filas por jugada) y liberar el resto de cada archivo antes de leer el siguiente, sin concatenar los 8,314,178 registros de tracking completos.
3. WHEN el Loader calcula la Profundidad de un jugador defensivo y `playDirection` es `right`, THE Loader SHALL restar el x del balón al x del jugador.
4. WHEN el Loader calcula la Profundidad de un jugador defensivo y `playDirection` es `left`, THE Loader SHALL restar el x del jugador al x del balón.
5. WHEN el Loader termina de cargar, THE Loader SHALL devolver, mediante la función `cargar()`, un objeto Datos con los atributos `jugadas`, `descartes` e `info_carga`.
6. THE Datos.jugadas SHALL contener exactamente una fila por jugada retenida (llave gameId + playId sin duplicados) con las columnas gameId, playId, week, defensiveTeam, possessionTeam, down, yardsToGo, passResult, playResult, cobertura, pff_passCoverage, cb_prof, safeties_prof y tramo_cb.
7. THE Loader SHALL unir plays con games por gameId, plays con pffScoutingData por (gameId, playId) y tracking con pffScoutingData por (gameId, playId, nflId).
8. IF una jugada no tiene snap en el tracking (ni `ball_snap` ni `autoevent_ballsnap`), THEN THE Loader SHALL excluirla de Datos.jugadas y sumarla en `descartes` con el motivo "sin snap".
9. IF la Cobertura de una jugada no es Man ni Zone, THEN THE Loader SHALL excluirla de Datos.jugadas y sumarla en `descartes` con el motivo "cobertura Other", en una entrada separada de los demás motivos.
10. IF una jugada no tiene ningún jugador con rol LCB o RCB alineado en el Frame_Snap, THEN THE Loader SHALL excluirla de Datos.jugadas y sumarla en `descartes` con el motivo "sin CB".
11. IF una jugada cumple más de un motivo de descarte, THEN THE Loader SHALL contarla una sola vez, bajo el primer motivo en este orden: "sin snap", "cobertura Other", "sin CB".
12. THE Datos.descartes SHALL ser un diccionario de motivo (texto) a número de jugadas (entero), y la suma de sus valores más el número de filas de Datos.jugadas SHALL ser igual al número de jugadas de plays.csv (8,557).
13. THE Datos.info_carga SHALL registrar los segundos de carga medidos con `time.perf_counter` y los MB de memoria medidos con `resource` o `tracemalloc`.
14. WHILE el Loader carga datos, THE Loader SHALL registrar con el módulo `logging` el avance (archivos de tracking procesados sobre el total de 122) y, al terminar, el conteo de cada motivo de descarte.
15. IF un archivo `tracking_<gameId>.csv` no se puede leer, THEN THE Loader SHALL omitir ese juego, sumar sus jugadas en `descartes` con el motivo "tracking ilegible" y continuar con el siguiente archivo.

### Requirement 2: Métricas con incertidumbre

**User Story:** Como Coach, quiero cada cifra con su n y su IC95%, para saber cuánto confiar en ella.

#### Acceptance Criteria

1. WHEN se solicita la P_Man por Alineación, THE Metrics SHALL calcular con numpy, para cada Alineación, n (número de jugadas), la estimación (proporción de jugadas con `pff_passCoverageType` igual a "Man" sobre jugadas con valor "Man" o "Zone") y el IC95% Wilson (z = 1.96), con estimación y límites en el rango de 0 a 1.
2. WHEN se solicita la Tasa_Disfraz por `defensiveTeam`, THE Metrics SHALL calcular con numpy, para cada `defensiveTeam`, n (número de jugadas), la estimación (proporción de jugadas con Disfraz sobre jugadas con Lectura_Clara) y el IC95% Wilson (z = 1.96), con estimación y límites en el rango de 0 a 1.
3. WHEN se solicita el efecto del Disfraz, THE Metrics SHALL calcular, para cada grupo definido por semana o mitad, down y equipo, la diferencia entre jugadas con Disfraz y sin Disfraz en el porcentaje de pases completos (puntos porcentuales) y en las yardas por jugada (yardas), cada una con n de ambos subgrupos e IC95%.
4. WHEN se solicita un contraste entre dos proporciones, THE Metrics SHALL devolver la diferencia (proporción A menos proporción B), su error estándar y su IC95% (z = 1.96) de la diferencia, junto con n de ambos grupos.
5. WHEN se solicita el IC95% de una media, THE Metrics SHALL calcularlo con Bootstrap de percentiles 2.5 y 97.5 usando 2,000 remuestreos y una semilla fija de numpy, de modo que dos ejecuciones con los mismos datos devuelvan intervalos idénticos.
6. IF un grupo tiene n menor que MIN_N (30), THEN THE Metrics SHALL devolver el texto "n insuficiente" en lugar de la estimación y del intervalo, conservando el valor de n en la respuesta. IF un contraste tiene algún grupo con n menor que MIN_N, THEN THE Metrics SHALL devolver "n insuficiente" para ese contraste.
7. WHEN se calcula un Wilson con k=61 y n=100, THE Metrics SHALL devolver el mismo intervalo que el cálculo manual de la fórmula de Wilson con tolerancia absoluta de 1e-9 en cada límite.
8. IF un grupo tiene n igual a 0, THEN THE Metrics SHALL devolver "n insuficiente" sin lanzar error de división entre cero.

### Requirement 3: Validación de robustez

**User Story:** Como Coach, quiero saber si la lectura pre-snap se sostiene fuera de la muestra donde se descubrió, para no apoyarme en una coincidencia.

#### Acceptance Criteria

1. WHEN se ejecuta la validación, THE Validacion SHALL calcular la validación cruzada por paridad de semana, puntuando las jugadas de semanas pares con la tabla construida solo con semanas impares y las jugadas de semanas impares con la tabla construida solo con semanas pares, sin que ninguna jugada contribuya a la tabla que la puntúa.
2. WHEN se completa la validación cruzada, THE Validacion SHALL reportar la precisión y el AUC (ambos calculados con numpy, con valores entre 0 y 1) y su diferencia frente a la línea base que siempre predice "Zone", además de n por mitad de la validación cruzada.
3. WHEN se completa la validación cruzada, THE Validacion SHALL marcar el criterio de desempeño como "pasa" solo si el AUC es mayor que 0.5 y la precisión supera a la de la línea base en ambas mitades, y como "no pasa" en cualquier otro caso.
4. WHEN se ejecuta la validación, THE Validacion SHALL calcular la estabilidad por mitades como la correlación de rangos de Spearman (implementada con numpy) de la Tasa_Disfraz por equipo entre las semanas 1-4 y las semanas 5-8, usando solo equipos con n ≥ 30 jugadas (MIN_N) en ambas mitades y reportando el número de equipos incluidos y la correlación en el rango -1 a 1.
5. IF menos de 3 equipos cumplen n ≥ 30 en ambas mitades, THEN THE Validacion SHALL reportar la estabilidad por mitades como "n insuficiente" y marcar ese criterio como "no pasa".
6. WHEN se ejecuta el control de permutación, THE Validacion SHALL barajar la Cobertura dentro de cada semana con una semilla fija de numpy, repetir el cálculo 1,000 veces y reportar el AUC observado, la media de los AUC permutados y el valor p como la proporción de permutaciones con AUC mayor o igual al observado.
7. WHEN se completa el control de permutación, THE Validacion SHALL marcar el criterio como "pasa" solo si el valor p es menor que 0.05, y como "no pasa" en cualquier otro caso.
8. WHEN se ejecuta la validación, THE Validacion SHALL comprobar el signo de la Profundidad y la presencia del balón, reportando la proporción de jugadas con la ofensiva detrás del balón en el snap, su n y el número de jugadas excluidas por no tener balón o snap.
9. IF la proporción de jugadas con la ofensiva detrás del balón es menor que 0.95, THEN THE Validacion SHALL marcar el criterio del signo de la Profundidad como "no pasa".
10. WHEN termina la validación, THE Validacion SHALL devolver un diccionario con una entrada por criterio (validación cruzada, estabilidad por mitades, permutación, signo de la Profundidad), cada una con su resultado numérico y el valor "pasa" o "no pasa".
11. IF un criterio no puede calcularse por datos insuficientes o inválidos, THEN THE Validacion SHALL devolver para ese criterio el motivo y el valor "no pasa", y continuar con los demás criterios.
12. THE Validacion SHALL operar solo en memoria y no escribir archivos en disco.

### Requirement 4: Armado del hallazgo con criterio fijado de antemano

**User Story:** Como Coach, quiero un hallazgo que solo diga lo que los datos sostienen, para tomar decisiones sin engaño.

#### Acceptance Criteria

1. THE Backend SHALL armar la frase del Hallazgo solo con números calculados por código sobre los datos, sin ninguna cifra escrita a mano.
2. WHEN las dos mitades por paridad de semana (semanas pares y semanas impares) tienen cada una n mayor o igual que MIN_N (30) en los grupos cb_prof ≤2 yd y cb_prof >6 yd, y el IC95% de la diferencia entre esos dos grupos excluye 0 en ambas mitades con el mismo signo, THE Backend SHALL publicar el contraste principal con n, estimación e IC95% de cada mitad.
3. IF algún grupo de alguna mitad tiene n menor que MIN_N, o el IC95% de la diferencia incluye 0 en alguna mitad, o el signo difiere entre mitades, THEN THE Backend SHALL devolver el Hallazgo "la alineación no basta para leer la cobertura" junto con la razón concreta (n insuficiente, IC que cruza 0 o signo distinto) y las n e IC95% calculados.
4. WHEN el contraste principal fue publicado, la correlación de Pearson de la Tasa_Disfraz por equipo entre las semanas 1-4 y las semanas 5-8 es mayor o igual que 0.5, y esa correlación supera el control de permutación (semilla fija, 1000 permutaciones, valor p menor que 0.05), THE Backend SHALL publicar el ranking de equipos citando el equipo de mayor y el de menor Tasa_Disfraz entre los equipos con n mayor o igual que MIN_N en ambas mitades, con su n y su IC95%.
5. IF la correlación entre mitades es menor que 0.5, o no supera el control de permutación, o menos de 2 equipos tienen n mayor o igual que MIN_N, THEN THE Backend SHALL omitir el ranking de equipos y devolver la razón (correlación observada, valor p o número de equipos con n suficiente).
6. WHEN el IC95% del efecto del Disfraz sobre la tasa de completos o sobre las yardas por jugada excluye 0, THE Backend SHALL mencionar ese efecto en el Hallazgo con su n, estimación e IC95%.
7. IF el IC95% del efecto del Disfraz sobre completos o yardas incluye 0, o algún grupo tiene n menor que MIN_N, THEN THE Backend SHALL reportar ese efecto como "no concluyente" con su n e IC95% y no citarlo como conclusión.
8. IF el contraste principal excluye 0 en la mitad de descubrimiento pero no se sostiene en la mitad de confirmación (IC que incluye 0 o signo distinto), THEN THE Backend SHALL reemplazar la frase del hallazgo por "no concluyente" con la razón y mostrar las cifras de ambas mitades.
9. THE Hallazgo SHALL incluir siempre el aviso de que los cortes (0.50, 0.25, 8 yd y tramos) no fueron fijados a ciegas y que la confirmación se hizo por paridad de semana y por mitades de semanas 1-4 contra 5-8.
10. THE Backend SHALL aplicar los criterios 2 a 8 de este requisito con umbrales constantes definidos en el código antes de calcular los resultados, y THE Backend SHALL usar los mismos umbrales en toda ejecución, sin ajustarlos según los resultados observados.

### Requirement 5: Endpoints de la API y archivos estáticos

**User Story:** Como desarrollador del dashboard, quiero endpoints con filtros uniformes, para consumir las cifras con rutas relativas.

#### Acceptance Criteria

1. THE API SHALL exponer los endpoints GET `/api/tell`, `/api/equipos`, `/api/efecto`, `/api/hallazgo`, `/api/validacion` y `/api/calidad`.
2. WHEN un endpoint de análisis (`/api/tell`, `/api/equipos`, `/api/efecto`, `/api/hallazgo`, `/api/validacion`) recibe una petición, THE API SHALL aceptar los mismos Filtros por query: semana o mitad, down, equipo y cobertura, y SHALL tratar como "sin filtro" cada Filtro omitido.
3. WHEN `/api/tell` recibe una petición válida, THE API SHALL devolver para cada Alineación la P_Man, n e IC95% (límite inferior y superior), y SHALL marcar "n insuficiente" en las Alineaciones con n menor que MIN_N (30).
4. WHEN `/api/equipos` recibe una petición válida, THE API SHALL devolver para cada equipo la Tasa_Disfraz, n e IC95% (límite inferior y superior), y SHALL marcar "n insuficiente" en los equipos con n menor que MIN_N (30).
5. WHEN `/api/efecto` recibe una petición válida, THE API SHALL devolver el efecto del Disfraz con n por grupo e IC95% (límite inferior y superior), y SHALL marcar "n insuficiente" si algún grupo tiene n menor que MIN_N (30).
6. WHEN `/api/hallazgo` recibe una petición válida, THE API SHALL devolver en JSON la frase del hallazgo en español y las cifras (estimación, n e IC95%) con las que el backend la calculó, sin cifras escritas a mano.
7. WHEN `/api/validacion` recibe una petición válida, THE API SHALL devolver en JSON el resultado de la Validacion, incluyendo las cifras de la parte de descubrimiento y de la parte de confirmación, y si el hallazgo se sostiene o no.
8. WHEN `/api/calidad` recibe una petición, THE API SHALL devolver las filas descartadas con su motivo, el tiempo de carga en segundos y la memoria en MB medidos al arrancar.
9. WHEN se recibe `GET /health`, THE API SHALL responder con código 200 y el cuerpo `{"status": "ok"}`, definido en `backend/main.py`.
10. IF existe `dashboard/dist` al arrancar, THEN THE Backend SHALL montarlo como archivos estáticos en la misma URL y puerto que la API, sin interceptar las rutas `/api/...` ni `/health`.
11. IF un Filtro tiene un valor inválido (down fuera de 1 a 4, mitad o semana fuera de rango, cobertura distinta de Man o Zone, o equipo ausente de los datos), THEN THE API SHALL responder con código 422 y un mensaje en español que nombre el Filtro y el valor rechazado, sin devolver cifras parciales.
12. IF un Filtro válido deja cero jugadas, THEN THE API SHALL responder con código 200, n igual a 0 y "n insuficiente", sin devolver error.
13. THE API SHALL documentar para el dashboard, en el README, que las llamadas usan rutas relativas sin diagonal inicial, con el ejemplo `fetch('api/tell')`.

### Requirement 6: Pruebas con datos reales

**User Story:** Como Coach, quiero pruebas sobre filas reales, para confiar en que el código calcula lo que dice.

#### Acceptance Criteria

1. THE pruebas SHALL ubicarse en `backend/tests/` y ejecutarse con pytest del `.venv`, y la suite completa SHALL terminar en 120 segundos o menos con 0 fallos.
2. THE pruebas SHALL leer filas reales con `pd.read_csv(..., nrows=...)` sobre `data/`, con `nrows` entre 1 y 5,000 por archivo, y SHALL NOT usar datos inventados ni copiar archivos de `data/`.
3. WHEN la prueba de Profundidad se ejecuta con jugadas reales cuyo `playDirection` es `left` y con jugadas reales cuyo `playDirection` es `right`, THE pruebas SHALL verificar que la Profundidad de un jugador detrás del balón en el snap es negativa o cero, y la de un jugador delante del balón es positiva, en ambas direcciones.
4. WHEN la muestra de plays se une con pffScoutingData y con games, THE pruebas SHALL verificar que el número de jugadas de la muestra sin pareja en pffScoutingData es 0 y sin pareja en games es 0.
5. IF un grupo tiene n menor que MIN_N (30), THEN THE pruebas SHALL verificar que `metrics.py` devuelve "n insuficiente" para ese grupo y no devuelve estimación ni IC95%, y SHALL verificar que un grupo con n igual a MIN_N sí devuelve estimación.
6. WHEN una función con aleatoriedad se ejecuta dos veces con la misma semilla, THE pruebas SHALL verificar que ambos resultados son idénticos valor por valor, y que con una semilla distinta el resultado difiere.
7. WHEN el IC Wilson se calcula con k=61 y n=100, THE pruebas SHALL verificar que el límite inferior y el superior coinciden con el cálculo manual (z=1.96) con una tolerancia absoluta de 1e-6.
8. WHEN las pruebas llaman a los endpoints de `/api` con httpx y TestClient usando cada Filtro por query (y una combinación de todos), THE pruebas SHALL verificar código de respuesta exitoso, que el JSON respeta el filtro aplicado, y que `GET /health` responde exactamente `{"status": "ok"}`.
9. IF un Filtro de `/api` recibe un valor inválido, THEN THE pruebas SHALL verificar que la API responde con un error de validación y no con un resultado numérico.
10. THE pruebas SHALL NOT importar hypothesis, y toda prueba por propiedades SHALL usar numpy con semilla fija y al menos 100 casos generados.

### Requirement 7: Sin escritura en disco ni dependencias nuevas

**User Story:** Como organizador del despliegue, quiero un backend efímero y sin dependencias añadidas, para que AWS lo hospede tal cual.

#### Acceptance Criteria

1. WHILE el Backend está en ejecución, THE Backend SHALL no crear ni modificar ningún archivo en el sistema de archivos bajo la raíz del proyecto ni en directorios temporales del sistema, incluidos cachés, logs en archivo, pickles y archivos intermedios, de modo que una comparación de la lista de archivos y sus fechas de modificación antes y después de atender 100 solicitudes a los endpoints de la API y a `/health` no muestre diferencias.
2. WHEN el Backend arranca, THE Backend SHALL cargar los datos y calcular los agregados pesados una sola vez y conservar los resultados en memoria, de modo que ninguna solicitud posterior lea los CSV de `data/` ni recalcule dichos agregados.
3. IF el Backend no puede cargar los datos al arrancar, THEN THE Backend SHALL terminar el arranque con un mensaje de error en la salida estándar que indique el archivo o la causa del fallo, sin escribir archivos en disco y sin responder `{"status": "ok"}` en `/health`.
4. THE Backend SHALL importar únicamente paquetes de la biblioteca estándar de Python y los paquetes listados en `.hackathon/requirements.txt`, y la verificación `sh .hackathon/setup.sh --check` SHALL terminar sin errores.
5. THE Backend SHALL ejecutarse con el intérprete Python 3.12.12 ubicado en `.venv`, y pytest SHALL ejecutarse con ese mismo intérprete.
6. WHEN `backend/main.py` se importa, THE Backend SHALL definir y ejecutar la función `cargar_env` del fragmento de `rules.md` antes de importar o usar boto3, de modo que las variables del `.env` ausentes en el entorno queden definidas y las ya presentes en el entorno no se sobrescriban.
7. IF el archivo `.env` no existe, THEN THE Backend SHALL continuar el arranque sin error y sin crear el archivo.

### Requirement 8: Explicación opcional con IA

**User Story:** Como Coach, quiero una explicación en lenguaje de entrenador de las cifras del hallazgo, para entenderlas rápido sin perder rigor.

#### Acceptance Criteria

1. WHEN llega una solicitud `GET /api/explicacion`, THE IA_Modulo SHALL aceptar los mismos Filtros por query que `/api/hallazgo` y calcular el Hallazgo con esos Filtros antes de llamar al modelo.
2. THE IA_Modulo SHALL crear el cliente con `boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION","us-east-1"))` y leer el modelo con `os.environ.get("BEDROCK_MODEL_ID","us.amazon.nova-pro-v1:0")`, usando Strands Agents y Amazon Nova.
3. THE IA_Modulo SHALL no leer, verificar ni exigir AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY ni AWS_SESSION_TOKEN, ni pasarlas a boto3.
4. THE IA_Modulo SHALL entregar al modelo solo el JSON del Hallazgo y la instrucción de responder en español con un máximo de 120 palabras, sin agregar cifras, equipos ni causas que no estén en ese JSON.
5. WHEN el modelo responde dentro de 20 segundos, THE IA_Modulo SHALL extraer cada número del texto (enteros y decimales, con o sin signo y con o sin %) y verificar que cada uno aparezca en el JSON del Hallazgo.
6. IF algún número extraído del texto no aparece en el JSON del Hallazgo, o el texto supera 120 palabras, THEN THE IA_Modulo SHALL descartar la respuesta, no guardarla en memoria y devolver `{"disponible": false, "texto": null}`.
7. IF Bedrock devuelve un error, no responde en 20 segundos o no hay credenciales, THEN THE IA_Modulo SHALL devolver `{"disponible": false, "texto": null}` sin lanzar excepción al cliente, y THE Backend SHALL seguir respondiendo `/api/hallazgo` y `/health` con su contenido normal.
8. WHEN el texto pasa la verificación, THE IA_Modulo SHALL devolver `{"disponible": true, "texto": <texto>}` y guardarlo solo en un diccionario en memoria con clave por la combinación de Filtros, sin escribir en disco.
9. WHEN llega una solicitud con una combinación de Filtros ya guardada en el diccionario, THE IA_Modulo SHALL devolver el texto guardado sin llamar a Bedrock.
10. THE IA_Modulo SHALL no incluir llaves ni credenciales en el código, el README ni los logs.
11. THE pruebas del IA_Modulo SHALL usar un cliente simulado, sin llamadas reales a Bedrock, para tres casos: respuesta exitosa (`disponible` true), rechazo por número inventado (`disponible` false) y caída de Bedrock (`disponible` false con `/api/hallazgo` respondiendo normal).

### Requirement 9: Organización del trabajo y revisión

**User Story:** Como líder del equipo, quiero fases, contratos y una revisión independiente, para que el trabajo en paralelo no genere conflictos ni incumpla las reglas.

#### Acceptance Criteria

1. WHEN el usuario aprueba el Reporte_Fase0, THE Orquestador SHALL definir en un solo mensaje, antes de iniciar la Fase 1, la firma de `cargar()` (parámetros y tipo de retorno), la estructura de Datos (nombre y tipo de cada campo), la firma de cada función de `metrics.py` y la forma del JSON de `/api/hallazgo` (nombre y tipo de cada campo).
2. WHEN se ejecuta la Fase 1, THE Orquestador SHALL asignar exactamente un agente por archivo (A `loader.py`, B `metrics.py`, C `validacion.py`, D `ia.py`), y cada agente SHALL modificar únicamente el archivo asignado y sus propias pruebas.
3. WHILE `loader.py` no esté terminado, THE agente B SHALL probar `metrics.py` con filas reales de `data/` leídas con `nrows`, sin copiar ni modificar archivos de `data/`.
4. WHEN A, B y C reportan haber terminado y sus pruebas con pytest pasan, THE Orquestador SHALL iniciar la Fase 2 con E (`api.py` y `main.py`), F (pruebas de la API y de "nada en disco") y G (armado del Hallazgo), un agente por tarea.
5. WHEN termina la Fase 2, THE Agente_Revisor SHALL revisar el diff completo contra `rules.md` y `equipo.md` y entregar una lista con resultado aprobado o no aprobado para cada uno de estos puntos: stack y versiones sin cambios, rutas sin diagonal inicial, nada escrito en disco, cifras mostradas con n e IC95%, y ausencia de números sin código que los calcule.
6. IF el Agente_Revisor marca algún punto como no aprobado, THEN THE Orquestador SHALL informar al usuario el punto, el archivo y la línea afectados, y SHALL NOT dar la Fase 2 por cerrada hasta que el punto sea corregido y revisado de nuevo.
7. WHEN un agente termina su tarea, THE agente SHALL reportar qué hizo, los comandos ejecutados, el resultado de pytest (pruebas aprobadas y falladas) y la lista de lo que dejó "sin confirmar".
8. IF dos agentes entran en conflicto sobre un archivo, THEN THE Orquestador SHALL decidir la resolución, informar al usuario el archivo, los agentes involucrados y la decisión tomada, y SHALL conservar los cambios del agente que no es dueño del archivo sin aplicarlos hasta tener la decisión.
9. WHEN termina la revisión y el Orquestador entrega su reporte al usuario, THE Orquestador SHALL detenerse sin iniciar el dashboard ni refactors no pedidos, y SHALL esperar instrucciones del usuario.
