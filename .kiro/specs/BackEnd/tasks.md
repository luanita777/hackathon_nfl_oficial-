# Implementation Plan: BackEnd

## Overview

Plan en Python 3.12 (`.venv`) con FastAPI, pandas y numpy, sin dependencias nuevas y sin escribir en disco en ejecución. Las fases siguen el Requirement 9: Fase 0 (verificación de riesgos, bloquea todo hasta que el usuario apruebe), Fase 1 (`loader.py`, `metrics.py`, `validacion.py`, `ia.py`), Fase 2 (`hallazgo.py`, `main.py`, `api.py`, pruebas de API) y revisión independiente. Las pruebas por propiedades usan solo numpy con semilla fija (`SEED = 2021`) y mínimo 100 casos; no se usa hypothesis. Cada archivo de prueba lleva el comentario `# Feature: BackEnd, Property N: <texto>`. Cada agente toca solo su archivo y sus pruebas, y reporta qué hizo, comandos, resultado de pytest y lo que dejó "sin confirmar".

## Tasks

- [x] 1. Fase 0: verificar los tres riesgos con scripts de solo lectura
  - Los scripts viven solo en `/tmp` (0 archivos nuevos en el repositorio) y leen `data/` en modo solo lectura
  - Cada script imprime sus cifras; todo lo no impreso se marca "sin confirmar"
  - Un script que falla se registra como "no concluyente" con el motivo y no detiene los demás
  - _Requirements: 0.1, 0.2, 0.12, 0.13_

  - [x] 1.1 Script del Riesgo 1: esquemas dentro de Man y Zone
    - Crear `/tmp/riesgo1_esquemas.py`: desglose por `pff_passCoverage` dentro de `pff_passCoverageType` Man y Zone, con el valor real de cada categoría y "sin confirmar" para valores esperados que no aparezcan
    - Reportar n por esquema, listar los de n < 30 y, para los de n ≥ 30, si el signo del contraste de cb_prof coincide con el global y si su IC95% excluye 0
    - Verificar con `grep` el nombre exacto de la columna de posición de alineación en `EXPLORACION_COLUMNAS.md`
    - _Requirements: 0.3, 0.4_

  - [x] 1.2 Script del Riesgo 2: profundidad, snap y supervivencia
    - Crear `/tmp/riesgo2_profundidad.py`: signo de la Profundidad por `playDirection` (left y right) sobre las 8,557 jugadas, balón ausente en el frame del snap, jugadas sin snap (24 esperado, sin confirmar) y jugadas sin LCB o sin RCB (enteros y % de 8,557)
    - Imprimir la tabla acumulativa de supervivencia: 8,557 totales, con snap, con Man o Zone, con LCB y RCB
    - Probar el cálculo de `ofensiva_detras` y medir tiempo y memoria de leer los 122 archivos de uno en uno
    - _Requirements: 0.5, 0.6, 0.7_

  - [x] 1.3 Script del Riesgo 3: anchura de los IC por equipo y estabilidad
    - Crear `/tmp/riesgo3_equipos.py`: por `defensiveTeam`, Tasa_Disfraz con IC95% Wilson, n con Lectura_Clara y ancho en puntos porcentuales; contar equipos con ancho > 20 pp
    - Correlación entre semanas 1-4 y 5-8 con IC95% bootstrap (≥ 1,000 remuestreos, semilla fija) y permutación de cobertura por semana (≥ 1,000, semilla fija) con p empírico
    - Listar como "datos parciales" a los equipos con n < 30 en cualquier mitad o en total y excluirlos de la correlación
    - _Requirements: 0.8, 0.9, 0.10_

  - [x] 1.4 Armar el Reporte_Fase0
    - Escribir `/tmp/reporte_fase0.md` (fuera del repositorio) con una tabla por riesgo: cifra, n, resultado ("se sostiene", "no se sostiene" o "no concluyente") y qué cambiaría del diseño
    - Incluir la ruta en `/tmp` de cada script que respalda una cifra y marcar "sin confirmar" lo no impreso
    - Incluir el nombre confirmado de la columna de posición, el número real de jugadas sin snap, y memoria y tiempo medidos
    - _Requirements: 0.11, 0.12_

- [x] 2. Checkpoint - Aprobación del Reporte_Fase0
  - Presentar al usuario la ruta de `/tmp/reporte_fase0.md` y un resumen corto
  - NO iniciar la Fase 1 hasta que el usuario apruebe explícitamente el reporte. Si el reporte cambia el diseño, volver a `design.md` y `requirements.md`
  - _Requirements: 0.14_

- [x] 3. Definir contratos y esqueleto de módulos (Fase 1, arranque)
  - [x] 3.1 Crear esqueletos con firmas y constantes
    - En `backend/loader.py`: `@dataclass Datos(jugadas, descartes, info_carga)` y firmas de `cargar`, `profundidad`, `motivo_descarte`
    - En `backend/metrics.py`: constantes (`MIN_N=30`, `Z=1.96`, `SEED=2021`, `N_BOOT=2000`, `N_PERM=1000`, `CORTE_MAN=0.50`, `CORTE_ZONE=0.25`, `CB_CERCA=2.0`, `CB_LEJOS=6.0`, `SAF_PROF_MIN=8.0`, `INSUFICIENTE`) y firmas de todas las funciones del diseño
    - En `backend/validacion.py`, `backend/ia.py` y `backend/hallazgo.py`: firmas con `NotImplementedError`
    - Crear `backend/tests/__init__.py` y `backend/tests/conftest.py` con una función auxiliar que lea filas reales con `nrows`
    - Dejar escrito el contrato del JSON de `/api/hallazgo` como docstring de `hallazgo.py`
    - _Requirements: 9.1, 6.2_

- [x] 4. Implementar `loader.py` (agente A)
  - [x] 4.1 Implementar `cargar()`, `profundidad()` y `motivo_descarte()`
    - Leer `plays`, `games` y `pffScoutingData` con `usecols` y tipos float32/int32/category; leer `tracking_<gameId>.csv` de uno en uno y conservar solo el frame del snap (`ball_snap` o `autoevent_ballsnap`, menor `frameId`, 23 filas)
    - Profundidad según `playDirection` (`right`: x − x_balón; `left`: x_balón − x); calcular `cb_prof`, `safeties_prof` (recortado a 3), `tramo_cb` con bordes `[-inf, 2, 4, 6, 8, inf]` y la columna auxiliar `ofensiva_detras`
    - Descartes con orden "tracking ilegible", "sin snap", "cobertura Other", "sin CB"; invariante `len(jugadas) + sum(descartes) == 8557`; archivo ilegible se omite y se continúa
    - Registrar con `logging` el avance sobre 122 archivos y los descartes; `info_carga` con `time.perf_counter` y `resource.getrusage`; parámetro `max_juegos` para pruebas
    - Nada se escribe en disco; si falla, imprimir archivo o causa en stdout y relanzar
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 7.2, 7.3_

  - [ ]* 4.2 Escribir prueba por propiedades de la Profundidad
    - **Property 1: Profundidad es coherente con la dirección**
    - Archivo `backend/tests/test_prop_profundidad.py`; numpy con semilla fija, ≥ 100 casos
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 4.3 Escribir prueba por propiedades de los descartes
    - **Property 2: Cada jugada descartada se cuenta una sola vez y se conserva el total**
    - Archivo `backend/tests/test_prop_descartes.py`
    - **Validates: Requirements 1.8, 1.9, 1.10, 1.11, 1.12, 1.15**

  - [x] 4.4 Escribir pruebas de ejemplo del loader con filas reales
    - Archivo `backend/tests/test_loader.py` con `nrows` entre 1 y 5,000: uniones plays↔pff y plays↔games sin huérfanos en la muestra, signo de la Profundidad con jugadas reales `left` y `right`, `cargar(max_juegos=2)` devuelve las columnas esperadas, llave sin duplicados y suma de descartes más retenidas igual al total de esos juegos
    - _Requirements: 1.5, 1.6, 1.7, 1.12, 6.2, 6.3, 6.4_

- [x] 5. Implementar `metrics.py` (agente B)
  - [x] 5.1 Implementar Wilson, contraste de proporciones y bootstrap
    - `wilson`, `contraste_proporciones` e `ic_bootstrap_media` solo con numpy (`default_rng(SEED)`, percentiles 2.5 y 97.5); n < `MIN_N` o n = 0 devuelve `{"n": n, "est": "n insuficiente", "lo": None, "hi": None}` sin dividir entre cero
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 5.2 Implementar tabla P_Man, lectura, Disfraz, efecto y filtros
    - `tabla_p_man`, `p_man_oof` (validación cruzada por paridad de semana, sin fuga), `marcar_lectura_y_disfraz`, `tell_por_alineacion`, `tasa_disfraz_por_equipo`, `efecto_disfraz` (diferencia en puntos porcentuales de completos y en yardas por jugada con bootstrap) y `aplicar_filtros` (semana, mitad `1-4`/`5-8`/`par`/`impar`, down, equipo, cobertura)
    - Alineación sin pareja en la otra paridad queda con lectura ambigua
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.8, 3.1, 5.2_

  - [ ]* 5.3 Escribir prueba por propiedades de Wilson
    - **Property 3: Wilson es un intervalo válido que contiene la estimación**
    - Archivo `backend/tests/test_prop_wilson.py`
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 5.4 Escribir prueba por propiedades del contraste
    - **Property 4: El contraste de proporciones es antisimétrico**
    - Archivo `backend/tests/test_prop_contraste.py`
    - **Validates: Requirements 2.4**

  - [ ]* 5.5 Escribir prueba por propiedades del bootstrap
    - **Property 5: El bootstrap es determinista y acota la media**
    - Archivo `backend/tests/test_prop_bootstrap.py`
    - **Validates: Requirements 2.5, 6.6**

  - [ ]* 5.6 Escribir prueba por propiedades de n insuficiente
    - **Property 6: Los grupos pequeños nunca devuelven estimación**
    - Archivo `backend/tests/test_prop_n_insuficiente.py`; n de 0 a 29 devuelve "n insuficiente" y n = 30 devuelve estimación
    - **Validates: Requirements 2.6, 2.8, 6.5**

  - [ ]* 5.7 Escribir prueba por propiedades de la validación cruzada sin fuga
    - **Property 7: La validación cruzada por paridad no tiene fuga**
    - Archivo `backend/tests/test_prop_oof.py`
    - **Validates: Requirements 3.1**

  - [ ]* 5.8 Escribir prueba por propiedades de los filtros
    - **Property 15: Los filtros devuelven un subconjunto que los cumple**
    - Archivo `backend/tests/test_prop_filtros.py`, sobre un DataFrame de jugadas reales (`cargar(max_juegos=...)`)
    - **Validates: Requirements 5.2, 5.12**

  - [x] 5.9 Escribir pruebas de ejemplo de metrics
    - Archivo `backend/tests/test_metrics.py`: Wilson k=61, n=100 contra la fórmula manual (tolerancia 1e-9 y 1e-6), contraste contra cálculo manual en un DataFrame chico de filas reales, bootstrap idéntico con la misma semilla y distinto con otra, n=29 vs n=30
    - _Requirements: 2.7, 6.5, 6.6, 6.7_

- [x] 6. Implementar `validacion.py` (agente C)
  - [x] 6.1 Implementar `auc`, `spearman`, permutación y `validar`
    - `auc` por rangos con empates promediados y `spearman` con rangos promediados, solo numpy
    - `validar` devuelve cuatro entradas (`validacion_cruzada`, `estabilidad_mitades`, `permutacion`, `signo_profundidad`) con valores y `"resultado": "pasa" | "no pasa"`; línea base siempre "Zone"; permutación de 1,000 barajas dentro de cada semana con p = `(1 + #≥) / (1 + N_PERM)`
    - Cada criterio dentro de su propio `try/except` (motivo y "no pasa"); menos de 3 equipos con n ≥ 30 en ambas mitades devuelve "n insuficiente"; proporción de ofensiva detrás del balón < 0.95 es "no pasa"; nada en disco
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12_

  - [ ]* 6.2 Escribir prueba por propiedades del AUC
    - **Property 8: El AUC coincide con el cálculo ingenuo por pares**
    - Archivo `backend/tests/test_prop_auc.py`
    - **Validates: Requirements 3.2**

  - [ ]* 6.3 Escribir prueba por propiedades de Spearman
    - **Property 9: Spearman está acotado e invariante a transformaciones monótonas**
    - Archivo `backend/tests/test_prop_spearman.py`
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 6.4 Escribir prueba por propiedades de la permutación
    - **Property 10: La permutación preserva las coberturas de cada semana y es reproducible**
    - Archivo `backend/tests/test_prop_permutacion.py`
    - **Validates: Requirements 3.6, 3.7**

  - [x] 6.5 Escribir pruebas de ejemplo de validacion
    - Archivo `backend/tests/test_validacion.py` sobre jugadas reales (`cargar(max_juegos=...)`): `validar` devuelve las cuatro entradas con "pasa"/"no pasa", un criterio que falla no detiene a los demás, y con pocos equipos la estabilidad da "n insuficiente"
    - _Requirements: 3.5, 3.10, 3.11_

- [x] 7. Implementar `ia.py` (agente D)
  - [x] 7.1 Implementar `explicar`, `verificar_texto` y caché en memoria
    - Cliente `boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION","us-east-1"))` y modelo `os.environ.get("BEDROCK_MODEL_ID","us.amazon.nova-pro-v1:0")` con Strands Agents; sin leer ni pasar llaves; agente inyectable y creación perezosa para que importar `ia.py` no falle sin credenciales
    - Entregar al modelo solo el JSON del hallazgo y la instrucción de ≤ 120 palabras en español; timeout de 20 s con `ThreadPoolExecutor`; caché `_CACHE` por tupla ordenada de filtros, guardando solo textos verificados
    - Cualquier excepción, timeout o número ajeno devuelve `{"disponible": False, "texto": None}`; sin credenciales en código ni logs
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [ ]* 7.2 Escribir prueba por propiedades del verificador
    - **Property 17: El verificador de IA solo acepta textos con cifras del hallazgo y ≤ 120 palabras**
    - Archivo `backend/tests/test_prop_verificador_ia.py`
    - **Validates: Requirements 8.5, 8.6**

  - [x] 7.3 Escribir pruebas de IA con cliente simulado
    - Archivo `backend/tests/test_ia.py`, sin llamadas reales: éxito (`disponible` true), número inventado (false, no se cachea), caída de Bedrock (false), segunda llamada con los mismos filtros sin llamar al agente, e importación sin credenciales
    - _Requirements: 8.6, 8.7, 8.8, 8.9, 8.11_

- [x] 8. Checkpoint - Cierre de la Fase 1
  - Ensure all tests pass, ask the user if questions arise. Correr `.venv/bin/python -m pytest backend/tests` y `sh .hackathon/setup.sh --check`, y reportar resultado real, tiempo de arranque de `cargar()` y lo "sin confirmar"

- [x] 9. Implementar `hallazgo.py` (Fase 2, agente G)
  - [x] 9.1 Implementar reglas de decisión y `armar_hallazgo`
    - `decidir_contraste` (publicar solo con n ≥ 30 en los cuatro grupos, IC de la diferencia excluye 0 en ambas mitades por paridad y mismo signo; si no, `no_concluyente` con razón), `decidir_ranking` (contraste publicado, ≥ 2 equipos, correlación ≥ 0.5, p < 0.05), `decidir_efecto` y `numeros_de_texto`
    - `armar_hallazgo` compone la frase con `str.format` sobre cifras ya calculadas, incluye siempre `aviso_cortes`, y con filtro `cobertura` devuelve `no_concluyente` con razón "filtro de cobertura incompatible con el contraste"
    - Umbrales como constantes definidas antes de calcular; ninguna cifra escrita a mano
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [ ]* 9.2 Escribir prueba por propiedades de la frase
    - **Property 11: La frase del hallazgo solo contiene cifras calculadas**
    - Archivo `backend/tests/test_prop_frase.py`
    - **Validates: Requirements 4.1**

  - [ ]* 9.3 Escribir prueba por propiedades del contraste publicado
    - **Property 12: El contraste solo se publica si se confirma en ambas mitades**
    - Archivo `backend/tests/test_prop_decidir_contraste.py`
    - **Validates: Requirements 4.2, 4.3, 4.8**

  - [ ]* 9.4 Escribir prueba por propiedades del ranking
    - **Property 13: El ranking de equipos solo se publica si cumple todas las condiciones**
    - Archivo `backend/tests/test_prop_decidir_ranking.py`
    - **Validates: Requirements 4.4, 4.5**

  - [ ]* 9.5 Escribir prueba por propiedades del efecto
    - **Property 14: El efecto del Disfraz solo se cita si es concluyente**
    - Archivo `backend/tests/test_prop_decidir_efecto.py`
    - **Validates: Requirements 4.6, 4.7**

- [x] 10. Implementar `main.py` y `api.py` (Fase 2, agente E)
  - [x] 10.1 Adaptar `backend/main.py`
    - Leer el `main.py` existente y conservar `cargar_env()` (fragmento literal de `rules.md`) ejecutado antes de importar boto3 o `ia.py`; no pisar nada que ya funcione
    - `app = FastAPI(lifespan=...)` que llama `loader.cargar()` una vez, calcula `p_man_oof`, `lectura` y `disfraz` y guarda todo en `app.state`; si falla, imprime archivo o causa en stdout y relanza; `GET /health` responde `{"status": "ok"}`
    - `include_router(api_router, prefix="/api")` y, solo si existe `dashboard/dist`, `StaticFiles(html=True)` en `/` registrado después de `/api` y `/health`; si falta `.env`, continuar sin error ni crearlo
    - _Requirements: 5.9, 5.10, 7.2, 7.3, 7.6, 7.7_

  - [x] 10.2 Implementar `backend/api.py`
    - Router con `GET /tell`, `/equipos`, `/efecto`, `/hallazgo`, `/validacion`, `/calidad` y `/explicacion`; dependencia `filtros_comunes` (semana 1-8, mitad `1-4`/`5-8`/`par`/`impar`, down 1-4, equipo existente, cobertura Man/Zone)
    - Valor inválido responde 422 con mensaje en español que nombra filtro y valor, sin cifras; filtro válido sin jugadas responde 200 con n = 0 y "n insuficiente"
    - `/api/validacion` incluye cifras de descubrimiento y confirmación y `se_sostiene`; `/api/calidad` devuelve descartes, segundos y MB; `/api/explicacion` usa `ia.explicar` sobre el hallazgo con los mismos filtros
    - Nada se recalcula desde CSV en las solicitudes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.11, 5.12, 7.2, 8.1_

  - [ ]* 10.3 Escribir prueba por propiedades de filtros inválidos
    - **Property 16: Los filtros inválidos siempre dan 422 sin cifras**
    - Archivo `backend/tests/test_prop_filtros_422.py` con `TestClient` (httpx) y valores inválidos generados con numpy
    - **Validates: Requirements 5.11, 6.9**

  - [x] 10.4 Escribir pruebas de endpoints con TestClient
    - Archivo `backend/tests/test_api.py`: cada filtro por separado y la combinación de todos, código exitoso, JSON que respeta el filtro, `GET /health` exactamente `{"status": "ok"}`, filtro válido sin jugadas con n = 0, y `/api/hallazgo` normal cuando `/api/explicacion` falla con IA simulada
    - _Requirements: 5.1, 5.2, 5.9, 5.12, 6.8, 6.9, 8.11_

  - [x] 10.5 Escribir pruebas de "nada en disco" y de estáticos
    - Archivo `backend/tests/test_sin_disco.py`: comparar listado y fechas de archivos del proyecto y de `tempfile.gettempdir()` antes y después de 100 solicitudes, `monkeypatch` de `pd.read_csv` que falla si se llama durante solicitudes, `cargar_env` con `.env` temporal sin sobrescribir variables existentes y sin `.env` sin error
    - Prueba de montaje de un `dist` temporal que no intercepta `/api` ni `/health`
    - _Requirements: 5.10, 7.1, 7.2, 7.6, 7.7_

  - [x] 10.6 Documentar la API en el README
    - Agregar al `README.md` una sección corta con los endpoints, los filtros y el ejemplo `fetch('api/tell')` sin diagonal inicial
    - _Requirements: 5.13_

- [x] 11. Checkpoint - Cierre de la Fase 2
  - Ensure all tests pass, ask the user if questions arise. Correr `.venv/bin/python -m pytest backend/tests` (≤ 120 s, sin importar hypothesis), `sh .hackathon/setup.sh --check`, medir el tiempo de arranque de la app, y reportar resultados reales
  - _Requirements: 6.1, 6.10, 7.4, 7.5_

- [x] 12. Revisión final independiente
  - [x] 12.1 Revisar el diff completo contra `rules.md` y `equipo.md`
    - Un agente de contexto limpio revisa el diff y entrega aprobado o no aprobado para: stack y versiones sin cambios, rutas sin diagonal inicial, nada escrito en disco, cifras con n e IC95%, y ausencia de números sin código que los calcule
    - Cualquier punto no aprobado se informa con archivo y línea y se corrige antes de cerrar; luego el flujo se detiene sin iniciar el dashboard ni refactors
    - _Requirements: 9.5, 9.6, 9.9_

## Notes

- Las tareas con `*` son opcionales (pruebas por propiedades) y se pueden omitir para un MVP más rápido. Las pruebas de ejemplo con datos reales no son opcionales porque `equipo.md` y el Requirement 6 las exigen.
- La tarea 2 bloquea todo lo posterior hasta la aprobación explícita del usuario.
- Cada tarea referencia requisitos granulares para trazabilidad; las propiedades referencian el número del `design.md`.
- Las propiedades usan numpy con `default_rng(2021)` y ≥ 100 casos; no se usa hypothesis ni otra librería de pruebas.
- Cada archivo de pruebas por propiedad es separado para que las tareas de la misma ola no escriban el mismo archivo.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4"] },
    { "id": 2, "tasks": ["2"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["4.1", "5.1", "7.1"] },
    { "id": 5, "tasks": ["5.2", "4.2", "4.3", "4.4", "5.3", "5.4", "5.5", "5.6", "5.9", "7.2", "7.3"] },
    { "id": 6, "tasks": ["6.1", "5.7", "5.8"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.4", "6.5"] },
    { "id": 8, "tasks": ["8"] },
    { "id": 9, "tasks": ["9.1", "10.1"] },
    { "id": 10, "tasks": ["10.2", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 11, "tasks": ["10.3", "10.4", "10.5", "10.6"] },
    { "id": 12, "tasks": ["11"] },
    { "id": 13, "tasks": ["12.1"] }
  ]
}
```
