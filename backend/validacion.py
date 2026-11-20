"""Validación del hallazgo (tarea 6.1). Solo numpy y pandas; nada se escribe en disco.

Cuatro criterios, cada uno con su resultado "pasa" / "no pasa":
validacion_cruzada, estabilidad_mitades, permutacion y signo_profundidad.

Ampliación documentada (la pide la tarea 9.1 del hallazgo): la entrada
"estabilidad_mitades" incluye además la correlación de Pearson entre mitades y el
valor p de una permutación a nivel equipo (se baraja la cobertura dentro de cada
semana, con las lecturas fijas, y se recalcula la correlación de Pearson).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from backend.metrics import (CORTE_MAN, MIN_N, N_PERM, SEED, INSUFICIENTE,
                             marcar_lectura_y_disfraz)

# Umbrales fijados antes de calcular
BASE = "Zone"            # línea base: siempre predice Zone
MIN_EQUIPOS = 3          # mínimo de equipos con n >= MIN_N en ambas mitades
CORR_MIN = 0.5           # umbral de estabilidad (el mismo que usa el hallazgo, req. 4.4)
ALFA = 0.05              # umbral del valor p
PROP_OFENSIVA_MIN = 0.95  # proporción mínima de ofensiva detrás del balón


# ---------- utilidades puras ----------

def _rangos(x: np.ndarray) -> np.ndarray:
    """Rangos 1..n con empates promediados."""
    x = np.asarray(x, dtype=float)
    _, inv, cuentas = np.unique(x, return_inverse=True, return_counts=True)
    fin = np.cumsum(cuentas)
    medio = (fin - cuentas + 1 + fin) / 2.0
    return medio[inv]


def _auc_de_rangos(rangos: np.ndarray, y: np.ndarray) -> float:
    """AUC (Mann-Whitney) a partir de los rangos de la puntuación."""
    y = np.asarray(y, dtype=bool)
    n1 = int(y.sum())
    n0 = int(y.size - n1)
    if n1 == 0 or n0 == 0:
        raise ValueError("auc necesita al menos una jugada de cada clase")
    return float((rangos[y].sum() - n1 * (n1 + 1) / 2.0) / (n1 * n0))


def auc(score: np.ndarray, y: np.ndarray) -> float:
    """AUC por rangos con empates promediados (y: 1/True = clase positiva)."""
    score = np.asarray(score, dtype=float)
    return _auc_de_rangos(_rangos(score), y)


def _pearson(a: np.ndarray, b: np.ndarray) -> float:
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    a, b = a - a.mean(), b - b.mean()
    den = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / den) if den > 0 else float("nan")


def spearman(a: np.ndarray, b: np.ndarray) -> float:
    """Correlación de Spearman: Pearson de los rangos (empates promediados)."""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    if a.size != b.size:
        raise ValueError("spearman: los vectores deben medir lo mismo")
    return _pearson(_rangos(a), _rangos(b))


def permutar_cobertura_por_semana(semana, cobertura, rng) -> np.ndarray:
    """Baraja la cobertura dentro de cada semana (conserva el conjunto de cada semana)."""
    semana = np.asarray(semana)
    cob = np.asarray(cobertura)
    salida = cob.copy()
    for s in np.unique(semana):
        idx = np.flatnonzero(semana == s)
        salida[idx] = cob[rng.permutation(idx)]
    return salida


# ---------- criterios ----------

def _validacion_cruzada(j: pd.DataFrame) -> dict:
    """AUC y precisión de p_man_oof frente a la línea base 'Zone', por paridad de semana."""
    d = j[j["p_man_oof"].notna()]
    y = (d["cobertura"].astype(str) == "Man").to_numpy()
    p = d["p_man_oof"].to_numpy(dtype=float)
    par = (d["week"].astype(int) % 2 == 0).to_numpy()
    mitades, pasa = {}, True
    for nombre, m in (("par", par), ("impar", ~par)):
        n = int(m.sum())
        if n < MIN_N or y[m].all() or (~y[m]).all():
            mitades[nombre] = {"n": n, "est": INSUFICIENTE}
            pasa = False
            continue
        a = auc(p[m], y[m])
        prec = float(((p[m] >= CORTE_MAN) == y[m]).mean())
        base = float((~y[m]).mean())  # acierto de predecir siempre Zone
        mitades[nombre] = {"n": n, "auc": a, "precision": prec,
                           "precision_base": base, "dif_precision": prec - base}
        pasa &= bool(a > 0.5 and prec > base)
    ok = len(y) >= MIN_N and not y.all() and not (~y).all()
    total = {"n": int(len(y)), "auc": auc(p, y)} if ok else {"n": int(len(y)), "auc": None}
    return {"linea_base": BASE, "n_sin_lectura_oof": int(len(j) - len(d)),
            "total": total, "mitades": mitades, "resultado": "pasa" if pasa else "no pasa"}


def _preparar_equipos(j: pd.DataFrame):
    """Arreglos de las jugadas con lectura clara y equipos con n >= MIN_N en ambas mitades."""
    c = j[j["lectura"].notna()]
    eq_cod, eq_nom = pd.factorize(c["defensiveTeam"].astype(str), sort=True)
    mitad = (c["week"].astype(int) >= 5).to_numpy().astype(int)  # 0: sem 1-4, 1: sem 5-8
    cuentas = np.bincount(eq_cod * 2 + mitad, minlength=len(eq_nom) * 2).reshape(-1, 2)
    validos = np.flatnonzero((cuentas >= MIN_N).all(axis=1))
    return c, eq_cod, eq_nom, mitad, validos


def _tasas(eq_cod, mitad, disfraz, n_eq):
    """Tasa_Disfraz por (equipo, mitad) como matriz n_eq x 2."""
    idx = eq_cod * 2 + mitad
    k = np.bincount(idx, weights=disfraz.astype(float), minlength=n_eq * 2)
    n = np.bincount(idx, minlength=n_eq * 2)
    return (k / np.maximum(n, 1)).reshape(n_eq, 2)


def _estabilidad(j: pd.DataFrame, seed: int) -> dict:
    """Spearman (y Pearson + p de permutación) de la Tasa_Disfraz por equipo, 1-4 vs 5-8."""
    c, eq_cod, eq_nom, mitad, validos = _preparar_equipos(j)
    if len(validos) < MIN_EQUIPOS:
        return {"n_equipos": int(len(validos)), "spearman": INSUFICIENTE,
                "pearson": INSUFICIENTE, "p_permutacion_pearson": None,
                "resultado": "no pasa"}
    tasa = _tasas(eq_cod, mitad, c["disfraz"].to_numpy(), len(eq_nom))[validos]
    rho = spearman(tasa[:, 0], tasa[:, 1])
    r = _pearson(tasa[:, 0], tasa[:, 1])

    # Permutación a nivel equipo: lecturas fijas, cobertura barajada por semana.
    # Se baraja sobre todas las jugadas y luego se toman las de lectura clara.
    rng = np.random.default_rng(seed)
    sem = j["week"].astype(int).to_numpy()
    cob_man = (j["cobertura"].astype(str) == "Man").to_numpy()
    clara = j["lectura"].notna().to_numpy()
    lect_man = (j.loc[clara, "lectura"].astype(str) == "Man").to_numpy()
    mayor = 0
    for _ in range(N_PERM):
        cp = permutar_cobertura_por_semana(sem, cob_man, rng)[clara]
        t = _tasas(eq_cod, mitad, lect_man != cp, len(eq_nom))[validos]
        rp = _pearson(t[:, 0], t[:, 1])
        mayor += bool(rp >= r)
    p = (1 + mayor) / (1 + N_PERM)
    return {"n_equipos": int(len(validos)), "spearman": rho, "pearson": r,
            "p_permutacion_pearson": float(p), "umbral": CORR_MIN,
            "resultado": "pasa" if rho >= CORR_MIN else "no pasa"}


def _permutacion(j: pd.DataFrame, seed: int) -> dict:
    """AUC observado frente a 1,000 AUC con la cobertura barajada dentro de cada semana."""
    d = j[j["p_man_oof"].notna()]
    y = (d["cobertura"].astype(str) == "Man").to_numpy()
    sem = d["week"].astype(int).to_numpy()
    rangos = _rangos(d["p_man_oof"].to_numpy(dtype=float))  # la puntuación no cambia
    obs = _auc_de_rangos(rangos, y)
    rng = np.random.default_rng(seed)
    aucs = np.array([_auc_de_rangos(rangos, permutar_cobertura_por_semana(sem, y, rng))
                     for _ in range(N_PERM)])
    p = (1 + int((aucs >= obs).sum())) / (1 + N_PERM)
    return {"n": int(len(y)), "n_permutaciones": N_PERM, "auc_observado": obs,
            "auc_permutado_medio": float(aucs.mean()), "p": float(p),
            "resultado": "pasa" if p < ALFA else "no pasa"}


def _signo_profundidad(j: pd.DataFrame) -> dict:
    """Proporción de jugadas con la ofensiva detrás del balón en el snap."""
    col = j["ofensiva_detras"]
    n_sin = int(col.isna().sum())
    v = col.dropna().astype(bool)
    n = int(len(v))
    if n == 0:
        raise ValueError("no hay jugadas con ofensiva_detras")
    prop = float(v.mean())
    return {"n": n, "n_sin_dato": n_sin, "proporcion": prop, "umbral": PROP_OFENSIVA_MIN,
            "resultado": "pasa" if prop >= PROP_OFENSIVA_MIN else "no pasa"}


def _correr(nombre: str, f, *args) -> dict:
    """Ejecuta un criterio; si falla devuelve motivo y 'no pasa' sin detener a los demás."""
    try:
        return f(*args)
    except Exception as e:
        return {"motivo": f"{nombre}: {type(e).__name__}: {e}", "resultado": "no pasa"}


def validar(jugadas: pd.DataFrame, seed: int = SEED) -> dict:
    """Cuatro criterios: validacion_cruzada, estabilidad_mitades, permutacion, signo_profundidad."""
    j = jugadas
    try:
        if "p_man_oof" not in j.columns or "lectura" not in j.columns:
            j = marcar_lectura_y_disfraz(j)
    except Exception as e:  # sin lecturas fallan los tres primeros, pero no el cuarto
        motivo = {"motivo": f"no se pudo calcular la lectura: {type(e).__name__}: {e}",
                  "resultado": "no pasa"}
        return {"validacion_cruzada": dict(motivo), "estabilidad_mitades": dict(motivo),
                "permutacion": dict(motivo),
                "signo_profundidad": _correr("signo_profundidad", _signo_profundidad, jugadas)}
    return {
        "validacion_cruzada": _correr("validacion_cruzada", _validacion_cruzada, j),
        "estabilidad_mitades": _correr("estabilidad_mitades", _estabilidad, j, seed),
        "permutacion": _correr("permutacion", _permutacion, j, seed),
        "signo_profundidad": _correr("signo_profundidad", _signo_profundidad, j),
    }
