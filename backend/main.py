"""API del hackathon NFL UNAM. Ejecuta: .venv/bin/uvicorn backend.main:app --reload"""
import os
from pathlib import Path


def cargar_env():
    f = Path(__file__).resolve().parent.parent / ".env"
    if f.exists():
        for linea in f.read_text(encoding="utf-8-sig").splitlines():
            linea = linea.strip()
            if linea and not linea.startswith("#") and "=" in linea:
                k, v = linea.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

cargar_env()  # antes de importar boto3 o ia.py (que lo usa); sin .env no hace nada

from contextlib import asynccontextmanager  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from backend import loader, metrics  # noqa: E402
from backend.api import router as api_router  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
DIST = RAIZ / "dashboard" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga los datos una vez y calcula lectura y disfraz; todo queda en memoria."""
    try:
        datos = loader.cargar()
        marcadas = metrics.marcar_lectura_y_disfraz(datos.jugadas)  # incluye p_man_oof
    except Exception as e:
        print(f"[backend] Falló la carga de datos: {type(e).__name__}: {e}", flush=True)
        raise
    app.state.datos = datos
    app.state.jugadas = marcadas
    yield


app = FastAPI(title="Hackathon NFL UNAM", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(api_router, prefix="/api")


def montar_estaticos(aplicacion: FastAPI, dist: Path) -> bool:
    """Monta el build del dashboard en "/" si existe; va al final para no tapar /api ni /health."""
    if dist.is_dir():
        aplicacion.mount("/", StaticFiles(directory=dist, html=True), name="dashboard")
        return True
    return False


montar_estaticos(app, DIST)
