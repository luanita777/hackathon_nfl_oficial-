"""Pruebas de ejemplo de metrics: wilson, contraste_proporciones, ic_bootstrap_media."""
import numpy as np

from backend import metrics
from backend.tests.conftest import leer_real


def _wilson_manual(k, n, z=1.96):
    """Fórmula de Wilson escrita aparte, paso a paso."""
    p = k / n
    centro = (p + z**2 / (2 * n)) / (1 + z**2 / n)
    mitad = (z / (1 + z**2 / n)) * np.sqrt(p * (1 - p) / n + z**2 / (4 * n**2))
    return centro - mitad, centro + mitad


def test_wilson_61_de_100_contra_formula_manual():
    r = metrics.wilson(61, 100)
    lo, hi = _wilson_manual(61, 100)
    assert r["n"] == 100
    assert abs(r["est"] - 0.61) < 1e-9
    assert abs(r["lo"] - lo) < 1e-9
    assert abs(r["hi"] - hi) < 1e-9
    # Valores de referencia conocidos (redondeados), tolerancia 1e-6 sobre la fórmula
    assert abs(r["lo"] - lo) < 1e-6 and abs(r["hi"] - hi) < 1e-6
    assert 0.0 <= r["lo"] < r["est"] < r["hi"] <= 1.0


def test_contraste_contra_calculo_manual_con_filas_reales():
    # Sacks (passResult == "S") en formación SHOTGUN vs el resto, filas reales de plays.csv
    df = leer_real("plays.csv", nrows=5000, usecols=["offenseFormation", "passResult"])
    df = df.dropna(subset=["offenseFormation", "passResult"])
    a = df[df["offenseFormation"] == "SHOTGUN"]
    b = df[df["offenseFormation"] != "SHOTGUN"]
    k_a, n_a = int((a["passResult"] == "S").sum()), len(a)
    k_b, n_b = int((b["passResult"] == "S").sum()), len(b)
    assert n_a >= 30 and n_b >= 30

    r = metrics.contraste_proporciones(k_a, n_a, k_b, n_b)

    p_a, p_b = k_a / n_a, k_b / n_b
    ee = (p_a * (1 - p_a) / n_a + p_b * (1 - p_b) / n_b) ** 0.5
    assert abs(r["est"] - (p_a - p_b)) < 1e-12
    assert abs(r["lo"] - (p_a - p_b - 1.96 * ee)) < 1e-12
    assert abs(r["hi"] - (p_a - p_b + 1.96 * ee)) < 1e-12
    assert r["n_a"] == n_a and r["n_b"] == n_b and r["n"] == n_a + n_b


def test_bootstrap_misma_semilla_identico_y_otra_semilla_distinto():
    x = leer_real("plays.csv", nrows=2000, usecols=["playResult"])["playResult"].to_numpy(float)
    r1 = metrics.ic_bootstrap_media(x, n_boot=500, seed=7)
    r2 = metrics.ic_bootstrap_media(x, n_boot=500, seed=7)
    r3 = metrics.ic_bootstrap_media(x, n_boot=500, seed=8)
    assert r1 == r2
    assert (r1["lo"], r1["hi"]) != (r3["lo"], r3["hi"])
    assert abs(r1["est"] - float(np.mean(x))) < 1e-12
    assert r1["lo"] <= r1["est"] <= r1["hi"]


def test_n29_insuficiente_y_n30_calcula():
    w29, w30 = metrics.wilson(15, 29), metrics.wilson(15, 30)
    assert w29["est"] == metrics.INSUFICIENTE and w29["lo"] is None
    assert isinstance(w30["est"], float) and w30["lo"] < w30["hi"]

    c29 = metrics.contraste_proporciones(10, 29, 10, 40)
    c30 = metrics.contraste_proporciones(10, 30, 10, 40)
    assert c29["est"] == metrics.INSUFICIENTE
    assert isinstance(c30["est"], float)

    x = np.arange(40, dtype=float)
    assert metrics.ic_bootstrap_media(x[:29])["est"] == metrics.INSUFICIENTE
    assert isinstance(metrics.ic_bootstrap_media(x[:30])["est"], float)
