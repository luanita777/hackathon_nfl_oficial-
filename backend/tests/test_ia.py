"""Pruebas de backend/ia.py con un agente simulado: sin llamadas reales a AWS."""
import subprocess
import sys
from pathlib import Path

import pytest

from backend import ia

RAIZ = Path(__file__).resolve().parents[2]

# Hallazgo mínimo con cifras conocidas
HALLAZGO = {"estado": "concluyente", "n": 1275, "p_man": 0.62, "ic95": [0.58, 0.66]}
FILTROS = {"temporada": 2021, "semana_desde": 1}


class AgenteFalso:
    """Agente simulado: devuelve un texto fijo o lanza una excepción; cuenta llamadas."""

    def __init__(self, texto=None, error=None):
        self.texto, self.error, self.llamadas = texto, error, 0

    def __call__(self, prompt):
        self.llamadas += 1
        if self.error:
            raise self.error
        return self.texto


@pytest.fixture(autouse=True)
def limpiar_cache():
    ia._CACHE.clear()
    yield
    ia._CACHE.clear()


def test_exito_disponible_y_cacheado():
    agente = AgenteFalso("Con n=1275 jugadas, el 62% fue Man (intervalo de 58 a 66).")
    r = ia.explicar(HALLAZGO, FILTROS, agente=agente)
    assert r["disponible"] is True
    assert r["texto"] == agente.texto
    assert len(ia._CACHE) == 1


def test_etiqueta_ic95_no_cuenta_como_cifra():
    assert ia.verificar_texto("El IC95% va de 58 a 66 con n=1275.", HALLAZGO) is True
    assert ia.verificar_texto("El IC95% con n=999.", HALLAZGO) is False


def test_numero_inventado_no_disponible_y_sin_cache():
    agente = AgenteFalso("Hubo 999 jugadas y el 62% fue Man.")
    r = ia.explicar(HALLAZGO, FILTROS, agente=agente)
    assert r == {"disponible": False, "texto": None}
    assert ia._CACHE == {}


def test_caida_de_bedrock_no_disponible():
    agente = AgenteFalso(error=RuntimeError("Bedrock caído"))
    r = ia.explicar(HALLAZGO, FILTROS, agente=agente)
    assert r == {"disponible": False, "texto": None}
    assert ia._CACHE == {}


def test_segunda_llamada_mismos_filtros_usa_cache():
    agente = AgenteFalso("Con n=1275 jugadas, el 62% fue Man.")
    primera = ia.explicar(HALLAZGO, FILTROS, agente=agente)
    segunda = ia.explicar(HALLAZGO, dict(reversed(list(FILTROS.items()))), agente=agente)
    assert agente.llamadas == 1
    assert segunda == primera and segunda["disponible"] is True


def test_importar_sin_credenciales():
    """Importar backend.ia con el entorno sin variables AWS no falla ni crea el agente."""
    codigo = "import backend.ia as m; assert m._MODELO is None; print('ok')"
    entorno = {"PATH": "/usr/bin:/bin", "HOME": "/nonexistent"}  # sin AWS_*
    r = subprocess.run([sys.executable, "-c", codigo], cwd=RAIZ, env=entorno,
                       capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    assert "ok" in r.stdout
