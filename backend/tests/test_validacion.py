"""Pruebas de validacion.py con jugadas reales (pocos juegos para que sea rápido)."""
import pytest

from backend import loader, validacion
from backend.metrics import INSUFICIENTE

CRITERIOS = ["validacion_cruzada", "estabilidad_mitades", "permutacion", "signo_profundidad"]


@pytest.fixture(scope="module")
def jugadas():
    return loader.cargar(max_juegos=6).jugadas


@pytest.fixture(scope="module")
def resultado(jugadas):
    return validacion.validar(jugadas)


def test_validar_devuelve_los_cuatro_criterios(resultado):
    assert list(resultado) == CRITERIOS
    for nombre in CRITERIOS:
        assert resultado[nombre]["resultado"] in ("pasa", "no pasa")


def test_criterio_que_falla_no_detiene_a_los_demas(jugadas, monkeypatch):
    def roto(*args, **kwargs):
        raise RuntimeError("falla simulada")

    monkeypatch.setattr(validacion, "_permutacion", roto)
    r = validacion.validar(jugadas)
    assert r["permutacion"]["resultado"] == "no pasa"
    assert "falla simulada" in r["permutacion"]["motivo"]
    for nombre in ("validacion_cruzada", "estabilidad_mitades", "signo_profundidad"):
        assert "motivo" not in r[nombre]
        assert r[nombre]["resultado"] in ("pasa", "no pasa")


def test_estabilidad_con_pocos_equipos_es_n_insuficiente(jugadas):
    # Un solo juego: ningún equipo llega a MIN_N jugadas en ambas mitades de semanas.
    uno = jugadas[jugadas["gameId"] == jugadas["gameId"].iloc[0]]
    r = validacion.validar(uno)["estabilidad_mitades"]
    assert r["spearman"] == INSUFICIENTE
    assert r["n_equipos"] < validacion.MIN_EQUIPOS
    assert r["resultado"] == "no pasa"
