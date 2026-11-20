"""Métricas con n e IC95% (esqueleto, tarea 3.1). Solo numpy y pandas."""
from __future__ import annotations

import numpy as np
import pandas as pd

# Criterios fijados antes de mirar resultados
MIN_N = 30
Z = 1.96
SEED = 2021
N_BOOT = 2000
N_PERM = 1000
CORTE_MAN = 0.50      # P_Man >= 0.50 -> "parece Man"
CORTE_ZONE = 0.25     # P_Man <= 0.25 -> "parece Zone"
CB_CERCA = 2.0        # cb_prof <= 2 yd
CB_LEJOS = 6.0        # cb_prof > 6 yd
SAF_PROF_MIN = 8.0    # safety profundo: profundidad >= 8 yd
ETIQUETAS_TRAMO = ["<=2", "2-4", "4-6", "6-8", ">8"]  # igual que loader.ETIQUETAS_TRAMO
INSUFICIENTE = "n insuficiente"


def _insuficiente(n: int, **extra) -> dict:
    """Resultado estándar cuando no hay n suficiente (sin estimación ni IC)."""
    return {"n": n, "est": INSUFICIENTE, "lo": None, "hi": None, **extra}


def wilson(k: int, n: int, z: float = Z) -> dict:
    """IC de Wilson para una proporción; n < MIN_N devuelve 'n insuficiente'."""
    n = int(n)
    if n <= 0 or n < MIN_N:
        return _insuficiente(n)
    p = k / n
    z2 = z * z
    denom = 1.0 + z2 / n
    centro = (p + z2 / (2 * n)) / denom
    semi = z * np.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / denom
    return {"n": n, "est": float(p),
            "lo": float(max(0.0, centro - semi)),
            "hi": float(min(1.0, centro + semi))}


def contraste_proporciones(k_a, n_a, k_b, n_b, z: float = Z) -> dict:
    """Diferencia pA - pB con IC normal; n < MIN_N en algún grupo -> insuficiente."""
    n_a, n_b = int(n_a), int(n_b)
    if n_a <= 0 or n_b <= 0 or n_a < MIN_N or n_b < MIN_N:
        return _insuficiente(n_a + n_b, n_a=n_a, n_b=n_b)
    p_a, p_b = k_a / n_a, k_b / n_b
    diff = p_a - p_b
    ee = np.sqrt(p_a * (1 - p_a) / n_a + p_b * (1 - p_b) / n_b)
    return {"n": n_a + n_b, "n_a": n_a, "n_b": n_b,
            "p_a": float(p_a), "p_b": float(p_b), "est": float(diff),
            "lo": float(diff - z * ee), "hi": float(diff + z * ee)}


def ic_bootstrap_media(x: np.ndarray, n_boot: int = N_BOOT, seed: int = SEED) -> dict:
    """IC95% percentil bootstrap de la media."""
    x = np.asarray(x, dtype=float)
    x = x[~np.isnan(x)]
    n = int(x.size)
    if n == 0 or n < MIN_N:
        return _insuficiente(n)
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, n, size=(n_boot, n))
    medias = x[idx].mean(axis=1)
    lo, hi = np.percentile(medias, [2.5, 97.5])
    return {"n": n, "est": float(x.mean()), "lo": float(lo), "hi": float(hi)}


def _clave_alineacion(j: pd.DataFrame) -> pd.Series:
    """Llave de Alineación (tramo_cb, safeties_prof) como texto, para mapear tablas."""
    return j["tramo_cb"].astype(str) + "|" + j["safeties_prof"].astype(int).astype(str)


def tabla_p_man(jugadas: pd.DataFrame) -> pd.DataFrame:
    """P_Man por alineación (tramo_cb, safeties_prof).

    Solo cuentan jugadas con cobertura Man o Zone. Columnas: tramo_cb,
    safeties_prof, n, k_man, p_man (sin IC; el IC está en tell_por_alineacion).
    """
    cols = ["tramo_cb", "safeties_prof", "n", "k_man", "p_man"]
    j = jugadas[jugadas["cobertura"].astype(str).isin(["Man", "Zone"])]
    if j.empty:
        return pd.DataFrame(columns=cols)
    es_man = (j["cobertura"].astype(str) == "Man")
    t = (pd.DataFrame({"tramo_cb": j["tramo_cb"].astype(str).to_numpy(),
                       "safeties_prof": j["safeties_prof"].astype(int).to_numpy(),
                       "man": es_man.to_numpy()})
         .groupby(["tramo_cb", "safeties_prof"], sort=False)["man"]
         .agg(n="size", k_man="sum").reset_index())
    t["p_man"] = t["k_man"] / t["n"]
    orden = {e: i for i, e in enumerate(ETIQUETAS_TRAMO)}
    t["_o"] = t["tramo_cb"].map(orden)
    t = t.sort_values(["_o", "safeties_prof"]).drop(columns="_o").reset_index(drop=True)
    return t[cols]


def p_man_oof(jugadas: pd.DataFrame) -> pd.Series:
    """P_Man por validación cruzada por paridad de semana (sin fuga).

    Las jugadas de semana par se puntúan con la tabla de semanas impares y
    viceversa. Alineación sin pareja en la otra paridad -> NaN (lectura ambigua).
    La cobertura de la propia jugada nunca entra en su p_man_oof.
    """
    salida = pd.Series(np.nan, index=jugadas.index, dtype="float32")
    if jugadas.empty:
        return salida
    paridad = (jugadas["week"].astype(int) % 2).to_numpy()
    clave = _clave_alineacion(jugadas)
    for p in (0, 1):
        otra = jugadas[paridad == 1 - p]
        tabla = tabla_p_man(otra)
        mapa = dict(zip(tabla["tramo_cb"] + "|" + tabla["safeties_prof"].astype(int).astype(str),
                        tabla["p_man"]))
        mia = paridad == p
        salida[mia] = clave[mia].map(mapa).astype("float32").to_numpy()
    return salida


def marcar_lectura_y_disfraz(jugadas: pd.DataFrame) -> pd.DataFrame:
    """Agrega columnas p_man_oof, lectura ('Man'/'Zone'/NaN) y disfraz (bool)."""
    j = jugadas.copy()
    p = p_man_oof(j)
    j["p_man_oof"] = p
    lectura = np.where(p >= CORTE_MAN, "Man", np.where(p <= CORTE_ZONE, "Zone", None))
    lectura = np.where(p.isna().to_numpy(), None, lectura)  # NaN -> ambigua
    j["lectura"] = pd.Categorical(lectura, categories=["Man", "Zone"])
    cob = j["cobertura"].astype(str)
    j["disfraz"] = (((j["lectura"] == "Man") & (cob == "Zone")) |
                    ((j["lectura"] == "Zone") & (cob == "Man"))).astype(bool)
    return j


def tell_por_alineacion(jugadas: pd.DataFrame) -> list[dict]:
    """Proporción de Man por alineación con n e IC95% (Wilson)."""
    out = []
    for r in tabla_p_man(jugadas).itertuples(index=False):
        w = wilson(int(r.k_man), int(r.n))
        out.append({"tramo_cb": r.tramo_cb, "safeties_prof": int(r.safeties_prof), **w})
    return out


def tasa_disfraz_por_equipo(jugadas: pd.DataFrame) -> list[dict]:
    """Tasa_Disfraz por defensiveTeam (disfraz / jugadas con lectura clara), Wilson."""
    clara = jugadas[jugadas["lectura"].notna()]
    out = []
    for eq, g in clara.groupby(clara["defensiveTeam"].astype(str), sort=True):
        w = wilson(int(g["disfraz"].sum()), len(g))
        out.append({"equipo": eq, **w})
    return out


def _ic_dif_medias(a: np.ndarray, b: np.ndarray, n_boot: int = N_BOOT,
                   seed: int = SEED) -> dict:
    """IC95% bootstrap (percentiles) de mean(a) - mean(b), remuestreando cada grupo."""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    a, b = a[~np.isnan(a)], b[~np.isnan(b)]
    n_a, n_b = int(a.size), int(b.size)
    if n_a < MIN_N or n_b < MIN_N:
        return _insuficiente(n_a + n_b, n_a=n_a, n_b=n_b)
    rng = np.random.default_rng(seed)
    ma = a[rng.integers(0, n_a, size=(n_boot, n_a))].mean(axis=1)
    mb = b[rng.integers(0, n_b, size=(n_boot, n_b))].mean(axis=1)
    lo, hi = np.percentile(ma - mb, [2.5, 97.5])
    return {"n": n_a + n_b, "n_a": n_a, "n_b": n_b, "media_a": float(a.mean()),
            "media_b": float(b.mean()), "est": float(a.mean() - b.mean()),
            "lo": float(lo), "hi": float(hi)}


def efecto_disfraz(jugadas: pd.DataFrame) -> dict:
    """Efecto del Disfraz (con - sin) sobre jugadas con lectura clara.

    "completos": diferencia en puntos porcentuales (passResult == 'C' sobre todas
    las jugadas del grupo, incluye sacks y scrambles). "yardas": diferencia de
    medias de playResult con bootstrap. Con n < MIN_N en algún grupo, "n insuficiente".
    Los grupos (semana/mitad, down, equipo) se obtienen filtrando antes con aplicar_filtros.
    """
    clara = jugadas[jugadas["lectura"].notna()]
    con = clara[clara["disfraz"]]
    sin = clara[~clara["disfraz"]]
    k_con = int((con["passResult"].astype(str) == "C").sum())
    k_sin = int((sin["passResult"].astype(str) == "C").sum())
    c = contraste_proporciones(k_con, len(con), k_sin, len(sin))
    if c["est"] != INSUFICIENTE:  # a puntos porcentuales
        for k in ("est", "lo", "hi"):
            c[k] = c[k] * 100.0
        c["p_a"], c["p_b"] = c["p_a"] * 100.0, c["p_b"] * 100.0
    y = _ic_dif_medias(con["playResult"].to_numpy(), sin["playResult"].to_numpy())
    return {"completos": c, "yardas": y, "n_con_disfraz": len(con), "n_sin_disfraz": len(sin)}


def aplicar_filtros(jugadas: pd.DataFrame, semana=None, mitad=None, down=None,
                    equipo=None, cobertura=None) -> pd.DataFrame:
    """Filtra por semana, mitad ('1-4','5-8','par','impar'), down, equipo y cobertura.

    None = sin filtro. Una mitad desconocida lanza ValueError.
    """
    m = np.ones(len(jugadas), dtype=bool)
    sem = jugadas["week"].astype(int)
    if semana is not None:
        m &= (sem == int(semana)).to_numpy()
    if mitad is not None:
        reglas = {"1-4": sem <= 4, "5-8": sem >= 5, "par": sem % 2 == 0, "impar": sem % 2 == 1}
        if mitad not in reglas:
            raise ValueError(f"mitad inválida: {mitad!r}")
        m &= reglas[mitad].to_numpy()
    if down is not None:
        m &= (jugadas["down"].astype(int) == int(down)).to_numpy()
    if equipo is not None:
        m &= (jugadas["defensiveTeam"].astype(str) == str(equipo)).to_numpy()
    if cobertura is not None:
        m &= (jugadas["cobertura"].astype(str) == str(cobertura)).to_numpy()
    return jugadas[m]
