"""Carga de datos en memoria al arrancar (tarea 4.1).

Lee plays, games y pffScoutingData completos (solo las columnas necesarias) y
cada tracking_<gameId>.csv uno por uno, conservando solo el frame del snap.
Con eso calcula la Profundidad defensiva de cada jugada. Nada se escribe en disco.
"""
from __future__ import annotations

import logging
import resource
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

# Constantes de definición (fijadas antes de ver resultados)
EVENTOS_SNAP = ("ball_snap", "autoevent_ballsnap")
POS_SAFETY = ("FS", "FSL", "FSR", "SS", "SSL", "SSR")
SAF_PROF_MIN = 8.0
SAF_MAX = 3
BORDES_TRAMO = [-np.inf, 2, 4, 6, 8, np.inf]
ETIQUETAS_TRAMO = ["<=2", "2-4", "4-6", "6-8", ">8"]
# Orden fijo de motivos de descarte
MOTIVOS = ("tracking ilegible", "sin snap", "cobertura Other", "sin CB")

COLS_PLAYS = ["gameId", "playId", "down", "yardsToGo", "possessionTeam", "defensiveTeam",
              "passResult", "playResult", "pff_passCoverage", "pff_passCoverageType"]
COLS_PFF = ["gameId", "playId", "nflId", "pff_role", "pff_positionLinedUp"]
COLS_TRK = ["gameId", "playId", "nflId", "frameId", "team", "playDirection", "x", "event"]
TIPOS_TRK = {"gameId": "int32", "playId": "int32", "frameId": "int32", "x": "float32",
             "team": "category", "playDirection": "category", "event": "object"}


@dataclass
class Datos:
    """Resultado de cargar(): jugadas retenidas, descartes y métricas de carga."""

    jugadas: pd.DataFrame          # una fila por jugada retenida
    descartes: dict[str, int]      # motivo -> número de jugadas
    info_carga: dict[str, float]   # {"segundos": ..., "mb": ...}


def profundidad(x, x_balon, direccion) -> np.ndarray:
    """Profundidad: 'right' -> x - x_balon; 'left' -> x_balon - x."""
    x = np.asarray(x, dtype=np.float64)
    xb = np.asarray(x_balon, dtype=np.float64)
    derecha = np.asarray(direccion).astype(str) == "right"
    return np.where(derecha, x - xb, xb - x)


def motivo_descarte(sin_snap, cobertura_other, sin_cb) -> str | None:
    """Primer motivo de descarte (orden fijo) o None si la jugada se retiene.

    "tracking ilegible" se decide antes, por juego, y no entra aquí.
    """
    if sin_snap:
        return "sin snap"
    if cobertura_other:
        return "cobertura Other"
    if sin_cb:
        return "sin CB"
    return None


def _mb_pico() -> float:
    """Memoria pico del proceso en MB (macOS da bytes, Linux da KB)."""
    r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return r / 1e6 if sys.platform == "darwin" else r / 1e3


def _snap_de_juego(ruta: Path) -> pd.DataFrame:
    """Lee un tracking y devuelve solo las filas del frame del snap de cada jugada."""
    df = pd.read_csv(ruta, usecols=COLS_TRK, dtype=TIPOS_TRK)
    frame_snap = (df.loc[df["event"].isin(EVENTOS_SNAP)]
                  .groupby("playId")["frameId"].min())
    objetivo = df["playId"].map(frame_snap)
    return df[df["frameId"] == objetivo].drop(columns="event")


def _rasgos_de_juego(snap: pd.DataFrame, plays_j: pd.DataFrame,
                     pos_j: pd.DataFrame, saf_j: pd.DataFrame) -> pd.DataFrame:
    """Calcula por jugada: balón, cb_prof, safeties_prof y ofensiva_detras."""
    balon = (snap[snap["team"] == "football"][["playId", "x", "playDirection"]]
             .rename(columns={"x": "xb"}).drop_duplicates("playId"))
    jug = snap[snap["team"] != "football"].dropna(subset=["nflId"]).copy()
    jug["nflId"] = jug["nflId"].astype("int64")
    jug = jug.drop(columns="playDirection").merge(balon, on="playId")
    jug["prof"] = profundidad(jug["x"], jug["xb"], jug["playDirection"])

    out = balon[["playId", "xb"]].copy()
    # CB: solo jugadas con exactamente un LCB y un RCB (pos_j ya viene filtrado)
    cb = pos_j.merge(jug[["playId", "nflId", "prof"]], on=["playId", "nflId"])
    cbm = cb.groupby("playId")["prof"].agg(["mean", "size"])
    out["cb_prof"] = out["playId"].map(cbm.loc[cbm["size"] == 2, "mean"])
    # Safeties: defensores Coverage en posiciones de safety con prof >= 8, tope 3
    sf = saf_j.merge(jug[["playId", "nflId", "prof"]], on=["playId", "nflId"])
    sfn = sf[sf["prof"] >= SAF_PROF_MIN].groupby("playId").size().clip(upper=SAF_MAX)
    out["safeties_prof"] = out["playId"].map(sfn).fillna(0)
    # Ofensiva detrás del balón: media de profundidad ofensiva < 0
    ofe = jug.merge(plays_j[["playId", "possessionTeam"]], on="playId")
    ofe = ofe[ofe["team"].astype(str) == ofe["possessionTeam"].astype(str)]
    out["ofensiva_detras"] = out["playId"].map(ofe.groupby("playId")["prof"].mean() < 0)
    out["con_snap"] = True
    return out


def cargar(data_dir: Path | None = None, max_juegos: int | None = None) -> Datos:
    """Carga y une los datos. `max_juegos` se usa solo en pruebas."""
    t0 = time.perf_counter()
    try:
        return _cargar(data_dir, max_juegos, t0)
    except Exception as e:  # imprimir causa y relanzar (Requirement 7.3)
        print(f"[loader] Falló la carga: {type(e).__name__}: {e}", file=sys.stdout)
        raise


def _cargar(data_dir, max_juegos, t0) -> Datos:
    raiz = Path(data_dir) if data_dir else Path(__file__).resolve().parent.parent / "data"
    games = pd.read_csv(raiz / "games.csv", usecols=["gameId", "week"],
                        dtype={"gameId": "int32", "week": "int8"})
    plays = pd.read_csv(raiz / "plays.csv", usecols=COLS_PLAYS, dtype={
        "gameId": "int32", "playId": "int32", "down": "int8", "yardsToGo": "int8",
        "possessionTeam": "category", "defensiveTeam": "category", "passResult": "category",
        "playResult": "float32", "pff_passCoverage": "category",
        "pff_passCoverageType": "category"})
    pff = pd.read_csv(raiz / "pffScoutingData.csv", usecols=COLS_PFF, dtype={
        "gameId": "int32", "playId": "int32", "pff_role": "category",
        "pff_positionLinedUp": "category"})

    ids = sorted(games["gameId"].tolist())
    if max_juegos is not None:
        ids = ids[:max_juegos]
        games = games[games["gameId"].isin(ids)]
        plays = plays[plays["gameId"].isin(ids)]
        pff = pff[pff["gameId"].isin(ids)]
    plays = plays.reset_index(drop=True)
    total = len(plays)

    # CB: exactamente un LCB y exactamente un RCB por jugada
    # (solo rol Coverage: un CB que presiona no cuenta como esquinero en cobertura)
    cbs = pff[(pff["pff_role"] == "Coverage") & pff["pff_positionLinedUp"].isin(["LCB", "RCB"])].copy()
    cbs["pff_positionLinedUp"] = cbs["pff_positionLinedUp"].astype(str)
    cuenta = cbs.groupby(["gameId", "playId", "pff_positionLinedUp"]).size().unstack(fill_value=0)
    ok_cb = cuenta[(cuenta.get("LCB", 0) == 1) & (cuenta.get("RCB", 0) == 1)].index
    cbs = cbs.set_index(["gameId", "playId"]).loc[ok_cb].reset_index()[["gameId", "playId", "nflId"]]
    sfs = pff[(pff["pff_role"] == "Coverage") & pff["pff_positionLinedUp"].isin(POS_SAFETY)][
        ["gameId", "playId", "nflId"]]

    rasgos, ilegibles = [], set()
    for i, gid in enumerate(ids, 1):
        ruta = raiz / "tracking" / f"tracking_{gid}.csv"
        try:
            snap = _snap_de_juego(ruta)
        except Exception as e:  # archivo ausente o ilegible: se omite y se sigue
            log.warning("tracking ilegible %s: %s", ruta.name, e)
            ilegibles.add(gid)
            continue
        pj = plays[plays["gameId"] == gid]
        r = _rasgos_de_juego(
            snap, pj, cbs[cbs["gameId"] == gid].drop(columns="gameId"),
            sfs[sfs["gameId"] == gid].drop(columns="gameId"))
        r["gameId"] = gid
        rasgos.append(r)
        del snap
        if i % 10 == 0 or i == len(ids):
            log.info("tracking %d/%d", i, len(ids))

    if rasgos:
        rs = pd.concat(rasgos, ignore_index=True)
    else:
        rs = pd.DataFrame(columns=["playId", "xb", "cb_prof", "safeties_prof",
                                   "ofensiva_detras", "con_snap", "gameId"])
    rs["gameId"] = rs["gameId"].astype("int32")
    p = plays.merge(rs, on=["gameId", "playId"], how="left")
    p = p.merge(games, on="gameId", how="left")

    # Banderas y motivo de descarte (en orden fijo)
    ilegible = p["gameId"].isin(ilegibles).to_numpy()
    sin_snap = (p["con_snap"].isna() | p["xb"].isna()).to_numpy()
    other = (p["pff_passCoverageType"].astype(str) == "Other").to_numpy()
    sin_cb = p["cb_prof"].isna().to_numpy()
    motivos = np.array(["tracking ilegible" if il else motivo_descarte(a, b, c)
                        for il, a, b, c in zip(ilegible, sin_snap, other, sin_cb)], dtype=object)
    descartes = {m: int((motivos == m).sum()) for m in MOTIVOS}

    j = p[pd.isna(motivos)].copy()
    j["cobertura"] = j["pff_passCoverageType"].astype(str).astype("category")
    j["cb_prof"] = j["cb_prof"].astype("float32")
    j["safeties_prof"] = j["safeties_prof"].astype("int8")
    j["ofensiva_detras"] = j["ofensiva_detras"].astype(bool)
    j["tramo_cb"] = pd.cut(j["cb_prof"], bins=BORDES_TRAMO, labels=ETIQUETAS_TRAMO,
                           right=True).astype(pd.CategoricalDtype(ETIQUETAS_TRAMO, ordered=True))
    cols = ["gameId", "playId", "week", "defensiveTeam", "possessionTeam", "down",
            "yardsToGo", "passResult", "playResult", "cobertura", "pff_passCoverage",
            "cb_prof", "safeties_prof", "tramo_cb", "ofensiva_detras"]
    j = j[cols].reset_index(drop=True)
    j["defensiveTeam"] = j["defensiveTeam"].astype(str).astype("category")
    j["possessionTeam"] = j["possessionTeam"].astype(str).astype("category")
    j["week"] = j["week"].astype("int8")

    assert len(j) + sum(descartes.values()) == total, "invariante de descartes rota"
    info = {"segundos": round(time.perf_counter() - t0, 2), "mb": round(_mb_pico(), 1)}
    log.info("cargadas %d de %d jugadas; descartes %s; %s", len(j), total, descartes, info)
    return Datos(jugadas=j, descartes=descartes, info_carga=info)
