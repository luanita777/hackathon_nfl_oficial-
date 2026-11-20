"""Pruebas de "nada en disco en tiempo de ejecución", carga del .env y montaje de estáticos."""
import os
import tempfile
from pathlib import Path

import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import main

RAIZ = Path(main.__file__).resolve().parent.parent
EXCLUIDOS = {".venv", "node_modules", ".git", "__pycache__", ".pytest_cache"}
RUTAS = ["/health", "/api/tell", "/api/equipos", "/api/efecto", "/api/hallazgo",
         "/api/validacion", "/api/calidad"]


def instantanea_tmp(base: Path) -> set:
    """Nombres con prefijo 'tmp' (el de tempfile.mkstemp/mkdtemp) en el primer nivel del temporal.
    Ignora lo de macOS y otros procesos, que no usan ese prefijo de Python."""
    try:
        return {n for n in os.listdir(base) if n.startswith("tmp")}
    except OSError:
        return set()


def instantanea(base: Path, excluir=frozenset()) -> dict:
    """Devuelve {ruta relativa: (mtime_ns, tamaño)}; en carpetas solo cuenta que existan."""
    estado = {}
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in excluir]
        for nombre in dirnames + filenames:
            ruta = Path(dirpath) / nombre
            try:
                st = ruta.lstat()
            except OSError:
                continue  # archivo temporal de otro proceso que desapareció
            # mtime de carpetas lo cambian demonios del sistema (macOS): solo se comparan sus nombres
            es_dir = ruta.is_dir() and not ruta.is_symlink()
            estado[str(ruta.relative_to(base))] = (None if es_dir else st.st_mtime_ns, st.st_size if not es_dir else None)
    return estado


@pytest.fixture(scope="module")
def cliente():
    # `with` ejecuta el lifespan: la carga de datos queda fuera de la comparación
    with TestClient(main.app) as c:
        yield c


def test_100_solicitudes_no_escriben_en_disco_ni_leen_csv(cliente, monkeypatch):
    def prohibido(*a, **k):
        raise AssertionError("pd.read_csv llamado durante una solicitud")

    monkeypatch.setattr(pd, "read_csv", prohibido)
    tmp = Path(tempfile.gettempdir())
    proy_antes = instantanea(RAIZ, EXCLUIDOS)
    tmp_antes = instantanea_tmp(tmp)

    for i in range(100):
        r = cliente.get(RUTAS[i % len(RUTAS)])
        assert r.status_code == 200, (RUTAS[i % len(RUTAS)], r.status_code)

    assert instantanea(RAIZ, EXCLUIDOS) == proy_antes
    assert instantanea_tmp(tmp) == tmp_antes


def test_health_responde_ok(cliente):
    r = cliente.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_cargar_env_no_sobrescribe_variables_existentes(tmp_path, monkeypatch):
    (tmp_path / "backend").mkdir()
    (tmp_path / ".env").write_text(
        "# comentario\nSD_EXISTE=nuevo\nSD_NUEVA=\"valor\"\n\nSD_COMILLA='x y'\nlinea_sin_igual\n",
        encoding="utf-8-sig",
    )
    # cargar_env usa Path(__file__).parent.parent: se apunta a un módulo falso en tmp_path
    monkeypatch.setitem(main.cargar_env.__globals__, "__file__", str(tmp_path / "backend" / "main.py"))
    monkeypatch.setenv("SD_EXISTE", "original")
    monkeypatch.delenv("SD_NUEVA", raising=False)
    monkeypatch.delenv("SD_COMILLA", raising=False)
    try:
        main.cargar_env()
        assert os.environ["SD_EXISTE"] == "original"
        assert os.environ["SD_NUEVA"] == "valor"
        assert os.environ["SD_COMILLA"] == "x y"
    finally:
        os.environ.pop("SD_NUEVA", None)  # setdefault no pasa por monkeypatch
        os.environ.pop("SD_COMILLA", None)


def test_cargar_env_sin_archivo_no_falla(tmp_path, monkeypatch):
    (tmp_path / "backend").mkdir()
    monkeypatch.setitem(main.cargar_env.__globals__, "__file__", str(tmp_path / "backend" / "main.py"))
    antes = dict(os.environ)
    main.cargar_env()
    assert dict(os.environ) == antes


def _app_con_dist(dist: Path):
    app = FastAPI()

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/ping")
    def ping():
        return {"pong": True}

    montado = main.montar_estaticos(app, dist)
    return app, montado


def test_montar_estaticos_no_intercepta_api_ni_health(tmp_path):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<html>dashboard</html>", encoding="utf-8")
    app, montado = _app_con_dist(dist)
    assert montado is True
    c = TestClient(app)
    assert c.get("/health").json() == {"status": "ok"}
    assert c.get("/api/ping").json() == {"pong": True}
    r = c.get("/")
    assert r.status_code == 200 and "dashboard" in r.text
    assert c.get("/api/no_existe").status_code == 404


def test_montar_estaticos_sin_dist_no_monta(tmp_path):
    app, montado = _app_con_dist(tmp_path / "no_existe")
    assert montado is False
    assert TestClient(app).get("/").status_code == 404


def test_app_real_monta_estaticos_al_final():
    # si dist existe, el montaje en "/" debe ser la última ruta para no tapar /api ni /health
    rutas = [getattr(r, "path", None) for r in main.app.routes]
    assert "/health" in rutas
    if main.DIST.is_dir():
        assert main.app.routes[-1].name == "dashboard"
