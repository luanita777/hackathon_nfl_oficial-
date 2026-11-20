## API del backend

Todos los endpoints son GET y devuelven JSON. La API vive bajo `/api/...`, salvo `GET /health`, que responde `{"status": "ok"}`.

| Endpoint | Qué devuelve |
|---|---|
| `/api/tell` | Alineaciones al snap y su relación con Man o Zone |
| `/api/equipos` | Resultados por equipo defensor |
| `/api/efecto` | Efecto de la cobertura |
| `/api/hallazgo` | Frase del hallazgo, armada con cifras calculadas |
| `/api/validacion` | Validación del hallazgo entre partes de los datos |
| `/api/calidad` | Descartes y calidad de los datos |
| `/api/explicacion` | Explicación del método |
| `/health` | Estado del servidor |

### Filtros comunes (query)

Todos los endpoints de `/api/...` aceptan los mismos filtros, todos opcionales:

- `semana`: 1 a 8.
- `mitad`: `1-4`, `5-8`, `par` o `impar`.
- `down`: 1 a 4.
- `equipo`: equipo defensor presente en los datos.
- `cobertura`: `Man` o `Zone`.

### Ejemplo desde el dashboard

Usa la ruta relativa, sin diagonal inicial (la app se publica en una subruta):

```ts
const res = await fetch('api/tell?down=3&cobertura=Man');
const datos = await res.json();
```
