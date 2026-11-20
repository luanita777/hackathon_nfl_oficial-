"""Pruebas del loader con filas reales de data/ (solo lectura, nrows <= 5000)."""
import numpy as np
import pandas as pd
import pytest

from backend import loader
from backend.tests.conftest import DATA_DIR, leer_real


def test_union_plays_pff_sin_huerfanos():
    """Cada fila de pff de la muestra tiene su jugada en plays (llave gameId+playId)."""
    pff = leer_real("pffScoutingData.csv", 5000)
    jugadas_pff = pff[["gameId", "playId"]].drop_duplicates()
    # Se leen todas las jugadas de los juegos tocados por la muestra
    plays = pd.read_csv(DATA_DIR / "plays.csv", usecols=["gameId", "playId"])
    m = jugadas_pff.merge(plays, on=["gameId", "playId"], how="left", indicator=True)
    assert (m["_merge"] == "both").all()


def test_union_plays_games_sin_huerfanos():
    """Cada jugada de la muestra tiene su juego en games."""
    plays = leer_real("plays.csv", 5000, usecols=["gameId", "playId"])
    games = pd.read_csv(DATA_DIR / "games.csv", usecols=["gameId"])
    assert plays["gameId"].isin(games["gameId"]).all()


def _muestra_tracking():
    """Primeras filas reales de los primeros archivos de tracking, hasta tener left y right."""
    partes = []
    for ruta in sorted((DATA_DIR / "tracking").glob("tracking_*.csv")):
        df = pd.read_csv(ruta, nrows=5000)
        partes.append(df)
        todo = pd.concat(partes, ignore_index=True)
        if {"left", "right"} <= set(todo["playDirection"].unique()):
            return todo
    return pd.concat(partes, ignore_index=True)


def test_profundidad_signo_left_y_right():
    """Con jugadas reales: el balón tiene profundidad 0 y el signo depende de la dirección."""
    t = _muestra_tracking()
    assert {"left", "right"} <= set(t["playDirection"].unique())
    balon = (t[t["team"] == "football"].groupby(["gameId", "playId"])
             .agg(xb=("x", "first"), d=("playDirection", "first")).reset_index())
    for direccion in ("left", "right"):
        b = balon[balon["d"] == direccion].iloc[0]
        j = t[(t["gameId"] == b["gameId"]) & (t["playId"] == b["playId"])
              & (t["team"] != "football")]
        prof = loader.profundidad(j["x"], b["xb"], direccion)
        esperado = (j["x"] - b["xb"]) if direccion == "right" else (b["xb"] - j["x"])
        np.testing.assert_allclose(prof, esperado.to_numpy())
        # Mismo punto mayor x: positivo en 'right', negativo en 'left'
        i = j["x"].to_numpy().argmax()
        assert (prof[i] > 0) == (direccion == "right")
    # El balón consigo mismo da 0
    assert loader.profundidad([10.0, 10.0], [10.0, 10.0], ["left", "right"]).tolist() == [0.0, 0.0]


@pytest.fixture(scope="module")
def datos2():
    return loader.cargar(max_juegos=2)


def test_cargar_devuelve_columnas_esperadas(datos2):
    esperadas = ["gameId", "playId", "week", "defensiveTeam", "possessionTeam", "down",
                 "yardsToGo", "passResult", "playResult", "cobertura", "pff_passCoverage",
                 "cb_prof", "safeties_prof", "tramo_cb", "ofensiva_detras"]
    assert list(datos2.jugadas.columns) == esperadas
    assert len(datos2.jugadas) > 0
    assert set(datos2.descartes) == set(loader.MOTIVOS)
    assert set(datos2.info_carga) == {"segundos", "mb"}
    assert not (datos2.jugadas["cobertura"].astype(str) == "Other").any()


def test_llave_sin_duplicados(datos2):
    assert not datos2.jugadas.duplicated(["gameId", "playId"]).any()


def test_descartes_mas_retenidas_igual_total(datos2):
    ids = sorted(pd.read_csv(DATA_DIR / "games.csv", usecols=["gameId"])["gameId"])[:2]
    plays = pd.read_csv(DATA_DIR / "plays.csv", usecols=["gameId", "playId"])
    total = int(plays["gameId"].isin(ids).sum())
    assert len(datos2.jugadas) + sum(datos2.descartes.values()) == total
