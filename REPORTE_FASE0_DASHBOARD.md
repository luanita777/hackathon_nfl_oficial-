# Reporte Fase 0 del dashboard (medido el 2026-11-20)

Backend: `.venv/bin/uvicorn backend.main:app` arranca y `/health` responde `{"status":"ok"}`. `pytest`: 122 pasan. Formas del JSON en `dashboard/src/types.ts`.

## Endpoints probados (con y sin filtros)
Existen y responden: `/api/tell`, `/api/equipos`, `/api/efecto`, `/api/hallazgo`, `/api/validacion`, `/api/calidad`, `/api/explicacion`. Ninguno falta.

- Filtros válidos: `semana` 1-8, `mitad` (1-4, 5-8, par, impar), `down` 1-4, `equipo` (sigla), `cobertura` (Man/Zone). Valor inválido: 422 con `{"detail": "..."}` en español.
- Con 0 jugadas: `/api/tell` y `/api/equipos` devuelven UNA fila con `n: 0`, `est: "n insuficiente"` y claves nulas. `/api/validacion` devuelve solo `{n:0, estado, se_sostiene:false}`. El front debe tratar `n == 0` como vacío.
- `/api/hallazgo` sin filtros: estado `publicado`; con `equipo=KC`, `down=4` o `cobertura=Man`: `no_concluyente` con `razon`. Es el caso normal, no un error.
- `/api/explicacion`: hoy `{"disponible":false,"texto":null}` (sin credenciales Bedrock). El front debe ocultar las respuestas.
- `/api/validacion` sin filtros: `se_sostiene: true` (contraste cerca/lejos). Pero `estabilidad_mitades` NO pasa (Pearson 0.529, p de permutación 0.48), y `hallazgo.ranking.publicado = false`. Por eso la pestaña Equipos debe llevar sello "Frágil / no se sostiene".

## Color y sigla por equipo
El backend NO manda colores ni nombres. Solo la sigla (`equipo`, 32 valores: ARI … WAS). La sigla se usa como insignia. Los colores tendrían que vivir en un mapa fijo en `theme.ts` (gris si falta). Esos colores no salen de los datos porque los datos no los traen: queda anotado en la metodología.

## Huecos (campos que pide el prompt y la API no sirve)
1. **% Man de la liga** (tarjeta): no hay campo. Solo se podría obtener dividiendo `n` de dos llamadas de `/api/efecto` (con y sin `cobertura=Man`), sin IC. Falta n e IC95%.
2. **Tasa de disfraz de la liga** (tarjeta y línea de referencia): `/api/equipos` solo da la tasa por equipo; no hay total de liga. Promediar equipos en el navegador sería calcular cifras ahí.
3. **Panel de celda** (alineación = tramo × safeties): `/api/tell` solo da P(Man) con IC. No hay por celda: tasa de disfraz con IC, efecto en completos/yardas, ni desglose por esquema (Cover-0 … Cover-6). Ningún filtro permite pedir una celda.
4. **P(Man) por equipo** (eje x opcional de la dispersión): no existe. Se usa x = n de jugadas con lectura clara, que sí existe.
5. **Barras apiladas Man / Zone / Otra por tramo de CB**: no hay `Zone` ni `Otra` por tramo (Other se descarta en el loader; solo está en `/api/calidad.descartes["cobertura Other"]`, 488). Se podría dibujar Man vs. 1-Man con IC, pero "Otra" no.
6. **Tendencia 1-4 vs 5-8 por equipo** (sparkline): sí se puede con dos llamadas a `/api/equipos?mitad=1-4` y `?mitad=5-8` (cifras servidas, sin cálculo). Esto NO es un hueco.
7. **"Jugadas analizadas"**: `/api/efecto.n` (filtrado) y `/api/calidad.n_jugadas` (sin filtros, 6,987). Sin hueco.
8. **Pizarra, semáforo y simulador**: usan P(Man) por celda de `/api/tell` (existe). La posición de los safeties se dibuja solo con el tramo y el conteo de la celda. Sin hueco.
9. **Preguntas de IA "¿En qué down disfrazan más?"** y "¿Qué alineación de CB es la más engañosa?": `/api/explicacion` solo explica el hallazgo filtrado; no hay cifras de disfraz por down ni por alineación para responderlas. Quedan como guía de navegación.

## Decisión que necesito
Los huecos 1, 2, 3 y 5 requieren campos nuevos en `backend/` (que no debo tocar). Opciones:
- A) Tú (o una sesión de backend) agregas: `liga` en `/api/equipos` (tasa de disfraz y % Man con n e IC), `disfraz` y `esquemas` por celda en `/api/tell`, y `zone`/`otra` por tramo. Luego construyo todo.
- B) Construyo ahora lo que sí existe (tarjetas con n e IC disponibles, mapa de P(Man), equipos, efecto, validación, pizarra, semáforo, simulador, sello) y el panel de celda muestra solo P(Man) con IC; lo demás aparece como "No disponible en la API".

Me detengo aquí hasta que elijas A o B.
