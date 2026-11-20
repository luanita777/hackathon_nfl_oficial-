# Prompt: dashboard de "Qué tanto delata la defensa su cobertura antes del snap"
Pega este texto como primera instrucción de la sesión del frontend.

## Contexto y lectura previa
Lee `.kiro/steering/` completo (`rules.md`, `equipo.md`, `datos.md`), `PROMPT_BACKEND_DELATA.md` (requisitos 2, 4 y 5) y `CLASIFICACION.md` (secciones 0, 1 y 6). Si algo de este prompt choca con `rules.md`, manda `rules.md`.
Los datos de este proyecto son BDB 2021 (tracking + PFF, semanas 1-8). No hay nflverse, EPA ni columnas `pass_length`. No uses esos conceptos.
No toques `backend/`. Si falta un campo en la API, repórtalo y espera; no lo inventes ni lo calcules en el navegador.

**Spec:** dashboard de *Qué tanto delata la defensa su cobertura antes del snap*, punto de vista **Coach** ofensivo, todo en español.
**Pregunta:** ¿qué alineación al snap predice Man o Zone, y qué defensas la disfrazan?
**Decisión que habilita:** cuánto confiar en la lectura pre-snap del QB contra cada rival.

## Fase 0 (antes de escribir UI, y reporta)
1. Con el backend corriendo (`.venv/bin/uvicorn backend.main:app`), haz `curl` a `/health`, `/api/tell`, `/api/equipos`, `/api/efecto`, `/api/hallazgo`, `/api/validacion`, `/api/calidad` y `/api/explicacion`, con y sin filtros (`semana` o `mitad`, `down`, `equipo`, `cobertura`).
2. Guarda las formas reales del JSON en `dashboard/src/types.ts`. Esa es la única fuente de nombres de campos.
3. Anota en un reporte corto: qué endpoints no existen todavía, qué campos faltan para lo pedido abajo y cómo llega el color o la sigla de cada equipo.
No avances sin reportar los huecos.

## Contratos (los define el orquestador en un solo mensaje, antes de paralelizar)
`types.ts`, `api.ts` (un `getJSON<T>(ruta, filtros)` que usa `fetch('api/...')` SIN diagonal inicial), `FiltrosContext` (estado global de filtros, cada cambio recarga todo), `theme.ts` (paleta y colores de equipo), `glosario.ts` (textos de tooltips), `Tooltip.tsx` (componente base), y los componentes de estado `Cargando`, `Vacio`, `ErrorApi`. Los subagentes solo importan de estos archivos y no los editan.

## Pestañas
**Encabezado fijo:** titular con el hallazgo tal como lo devuelve `/api/hallazgo` (el texto del backend, sin reescribirlo), con una insignia "Se sostiene en ambas mitades" o "No se sostiene entre mitades" según `/api/validacion`. Si el backend devuelve "no concluyente", se muestra así con su razón.

**Filtros arriba (barra pegajosa):** semana o mitad (1-4 / 5-8), down, equipo defensivo, cobertura (Man / Zone / todas). Cada cambio actualiza las tres pestañas y el titular. Chips con los filtros activos y botón "Limpiar".

### Pestaña 1 · La lectura (prioridad 1)
- Tarjetas (KPIs): jugadas analizadas, % Man, P(Man) con alineación de CB cerca, P(Man) con CB lejos, tasa de disfraz de la liga y precisión de la lectura frente a la línea base (de `/api/validacion`). Cada una con n e IC95%.
- Mapa de calor: tramo de profundidad de los esquineros (≤2, 2-4, 4-6, 6-8, >8 yd) × safeties profundos (0 a 3). Escala divergente: un extremo "parece Man", el otro "parece Zone", el centro "ambigua". En cada celda: P(Man) y n. Celda con n < 30: asterisco, borde punteado y color atenuado, sin cifra de recomendación.
- Clic en una celda abre un panel lateral: P(Man) con IC95%, cuántas veces la defensa jugó lo contrario (disfraz) con IC95%, efecto en % de completos y yardas por jugada si el IC excluye 0 (si no, "no concluyente"), y el desglose por esquema (Cover-0, Cover-1, 2-Man, Cover-2, Cover-3, Quarters, Cover-6) con sus n.
- Gráfica extra: barras apiladas Man / Zone / Otra por tramo de CB, con IC95% en las marcas.

### Pestaña 2 · Equipos (prioridad 2)
- Dispersión: x = jugadas con lectura clara (n) o P(Man) del equipo, y = tasa de disfraz con barras de error IC95%. Un punto por equipo con su color. Tooltip con n, tasa e IC. Línea de referencia de la liga. Puntos con n < 30 atenuados y con asterisco.
- Tabla ordenable de los 32 equipos: tasa de disfraz, IC95%, n, diferencia contra la liga, y una mini barra (sparkline) semanas 1-4 contra 5-8 para ver si se sostiene. Clic en la fila fija ese equipo como filtro.
- **Identidad por equipo:** al elegir un equipo, la pestaña toma su paleta (primario y secundario como acento, nunca como fondo completo). Insignia propia generada en SVG local con la sigla del equipo (escudo con sus colores; sin logos oficiales, sin imágenes externas ni CDN). Colores y lista de equipos salen de los datos de `/api/equipos`; si falta un color en el mapa de `theme.ts`, gris.
- **Preguntas sugeridas para el coach:** bloque con 5 a 6 preguntas en chips ("¿Puedo confiar en la lectura pre-snap contra [equipo]?", "¿En qué down disfrazan más?", "¿Qué alineación de CB es la más engañosa?"). El nombre del equipo y el down se rellenan con el filtro activo. Al hacer clic, llama a `api/explicacion` con los filtros y muestra la respuesta de la IA con el aviso "Explicación generada por IA a partir de las cifras de arriba". Si el endpoint responde `{"disponible": false}`, oculta las respuestas y deja solo las preguntas como guía para navegar (cada una salta a la vista o filtro que la contesta). La IA nunca sostiene el análisis.

### Pestaña 3 · Efecto y validación (solo si hay tiempo)
- Efecto del disfraz sobre % de completos y yardas por jugada: dos barras comparativas con IC95% (de `/api/efecto`).
- Validación (de `/api/validacion`): tabla "criterio → resultado → pasa / no pasa" y gráfica de estabilidad por mitades (tasa por equipo 1-4 contra 5-8) con la correlación y el control de permutación.

## Ideas originales (hazlas si el contrato de la API lo permite; si no, repórtalo)
1. **Pizarra de defensa:** esquema SVG de campo que dibuja los dos esquineros y los safeties a la profundidad de la celda seleccionada (el tramo y el conteo vienen de la celda, no se inventan posiciones). Al lado, el "semáforo de confianza": verde, ámbar o rojo según P(Man) y su IC, con la frase "Si ves esto, lee Man con X% de acierto (IC95% a-b, n=N)".
2. **Modo rival:** al elegir equipo, un resumen de una pantalla "Cómo leer a [equipo]": su tasa de disfraz contra la liga, en qué alineaciones engaña más, y si esa conclusión se sostiene entre mitades.
3. **Simulador de lectura:** controles de profundidad de CB y número de safeties que se ajustan a la celda más cercana y muestran qué tan fiable es esa lectura. Solo muestra cifras ya servidas por la API.
4. **Sello de confianza** en cada gráfica: "Sólido" (n ≥ 30 y se sostiene en ambas mitades), "Frágil" (n < 30 o una mitad no coincide), "No concluyente" (IC cruza 0). Es el aviso visible que exige `equipo.md`.

## Diseño
- Oscuro tipo transmisión deportiva: fondo casi negro azulado, superficies en dos niveles, un solo acento por contexto. Paleta contenida, sin saturar: el color vivo solo en datos y estados, no en fondos grandes.
- Tipografía del sistema (sin fuentes externas). Números en tabulares. Jerarquía clara: titular grande, tarjetas sobrias, bordes finos, esquinas redondeadas medias, sombras sutiles.
- Animaciones cortas con CSS (transiciones de 150 a 250 ms). Sin librerías de animación.
- Legible a 1366x768: sin scroll horizontal, la pestaña 1 completa (titular, tarjetas y mapa) visible sin bajar más de una pantalla.
- Accesible: contraste suficiente, no depender solo del color (iconos o texto en las celdas), foco visible, teclado en celdas y tabs.

## Tooltips (español sencillo, componente único `Tooltip`)
Aparecen al pasar el mouse y al enfocar con teclado, en toda palabra técnica, con un ícono "?" discreto. Mínimos: snap, Man, Zone, cobertura, esquinero (CB), safety, profundidad al snap, alineación, lectura clara / ambigua, disfraz, P(Man), IC95%, n, "n < 30", Wilson (como "margen de error"), validación cruzada por paridad, mitades 1-4 / 5-8, control de permutación, AUC (como "qué tan bien separa Man de Zone"), línea base, down, yardas por avanzar, cobertura por esquema (Cover-0 a Cover-6, Quarters, 2-Man). Cada definición: una a dos frases, sin siglas sin explicar, con un ejemplo corto si ayuda. Todos los textos viven en `glosario.ts`.

## Estados y avisos
- Carga (esqueletos en tarjetas, mapa y tabla), vacío ("Sin jugadas con estos filtros", con botón para limpiar) y error de la API (mensaje claro y "Reintentar"). Los tres por componente, no solo globales.
- Nota de metodología siempre visible (pie o panel plegable abierto por defecto): jugadas usadas, descartes por motivo y porcentaje que sobrevive (de `/api/calidad`), semanas 1-8 de 2021, cortes definidos en una exploración previa con las mismas semanas, y las limitaciones (observacional, sin causalidad, una temporada).
- Aviso visible cuando una conclusión descansa en n < 30 o no se sostiene entre mitades.
- Toda cifra mostrada viene de la API. Nada escrito a mano ni calculado en el navegador, salvo formato (redondeo y porcentajes).

## Técnico (de `rules.md`, no negociable)
React 18.3.1, Vite 5.4.21, TypeScript 5.7.3, Tailwind 3.4 (sintaxis de 3, no de 4), Recharts 3.10.1. Sin dependencias nuevas. `fetch('api/...')` sin diagonal inicial, también en imágenes, CSS y enlaces. `base: './'`, proxy de `/api` a `http://localhost:8000` en `vite.config.ts`. Sin `localhost` ni URLs absolutas en el código. `npm run build` genera `dashboard/dist`. Nada escrito en disco en tiempo de ejecución.

## Forma de trabajo: paralelizar y subagentizar todo
- **Orquestador (tú):** haz la Fase 0, define los contratos en un solo mensaje y reparte. No escribes componentes de pestañas tú mismo. Ante un conflicto de archivos decides tú, no se resuelve en silencio.
- **Ronda 1 (en paralelo, un subagente por grupo, sin tocar archivos ajenos):**
  - A: base (`types.ts`, `api.ts`, `FiltrosContext`, `theme.ts`, `Tooltip.tsx`, estados, layout, filtros, tabs, titular, nota de metodología).
  - B: `glosario.ts` con todos los textos de tooltips y las preguntas sugeridas (plantillas).
  - C: insignias SVG de equipo y resolución de paleta por equipo (con gris de respaldo).
- **Ronda 2 (en paralelo, cuando A termine):**
  - D: Pestaña 1 (tarjetas, mapa de calor, panel de detalle, barras apiladas).
  - E: Pestaña 2 (dispersión, tabla ordenable, tema por equipo, preguntas sugeridas con IA).
  - F: Pestaña 3 (efecto y validación).
  - G: ideas originales (pizarra, semáforo, modo rival, simulador, sello de confianza).
- **Ronda 3:**
  - H: `npm run build` limpio y revisión de reglas (sin diagonal inicial con `grep`, sin dependencias nuevas, sin `localhost`).
  - I: revisión independiente con contexto limpio del diff contra `rules.md` y `equipo.md`: cifras con n e IC95%, avisos de n < 30 y de no sostenido, todo en español.
- Cada subagente reporta: qué hizo, comandos ejecutados, resultado y qué dejó "sin confirmar".

## Verificación final
1. `npm run build` sin errores y `pytest` en verde.
2. Abre la app SERVIDA por uvicorn (`.venv/bin/uvicorn backend.main:app`, no solo `vite`) y recorre las tres pestañas con filtros distintos, incluido uno que deje el resultado vacío y uno que provoque error.
3. Revisa a 1366x768: sin scroll horizontal, tooltips visibles dentro de pantalla, mapa legible.
4. Dime qué verificaste y qué quedó sin confirmar. Después, en español sencillo, explica qué hace cada archivo del dashboard para defenderlo en el pitch. Cuando todo pase, detente.
