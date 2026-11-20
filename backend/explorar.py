"""Inventario de data/ (solo lectura). Genera EXPLORACION.md y EXPLORACION_COLUMNAS.md.

Uso (desde la raíz del proyecto):
    .venv/bin/python backend/explorar.py                      # inventario
    .venv/bin/python backend/explorar.py --tracking-completo  # además mide cargar TODO el tracking

- Admite .csv y .csv.gz. Los archivos con el mismo patrón de nombre (tracking_#.csv) se tratan como
  particiones de una sola tabla: se analiza el primero a fondo y de los demás solo se cuenta MB.
- Archivos grandes (> LIMITE_BLOQUES_MB) se leen por bloques; el resto completos.
- No escribe nada en data/. Solo escribe los dos .md en la raíz del proyecto.
"""
from __future__ import annotations

import argparse
import json
import platform
import re
import resource
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
DATA = RAIZ / "data"
EXTENSIONES = (".csv", ".csv.gz")
LIMITE_BLOQUES_MB = 200
TOKENS_NULOS = ["NA", "None", "NaN", "null", "NULL", "N/A", ""]
LLAVES = {
    "juegos": ["gameId"],
    "jugadas": ["gameId", "playId"],
    "jugadores": ["nflId"],
    "scouting": ["gameId", "playId", "nflId"],
    "tracking": ["gameId", "playId", "nflId", "frameId"],
}
COLS_LIGERO = ["gameId", "playId", "nflId", "frameId", "team", "playDirection", "x", "y", "s", "a", "dis", "o", "dir", "event"]
DTYPES_LIGERO = {"gameId": "int32", "playId": "int32", "nflId": "float32", "frameId": "int16",
                 "x": "float32", "y": "float32", "s": "float32", "a": "float32", "dis": "float32",
                 "o": "float32", "dir": "float32"}
CAT_LIGERO = ["team", "playDirection", "event"]


# ------------------------------------------------------------------ utilidades
def mb(n_bytes: float) -> float:
    return n_bytes / 1e6


def rss_pico_mb() -> float:
    r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return mb(r if platform.system() == "Darwin" else r * 1024)


def leer(path: Path, **kw):
    """Lee un CSV (o .csv.gz, pandas lo infiere por extensión) y devuelve (df, segundos)."""
    t = time.perf_counter()
    df = pd.read_csv(path, **kw)
    return df, time.perf_counter() - t


def leer_por_bloques(path: Path, bloque: int = 500_000):
    """Archivos grandes: filas, columnas, % nulos y ejemplos sin tener todo en memoria. Llaves no se verifican."""
    t = time.perf_counter()
    filas, nulos, primero = 0, None, None
    for ch in pd.read_csv(path, chunksize=bloque):
        primero = ch.head(200) if primero is None else primero
        filas += len(ch)
        n = ch.isna().sum()
        nulos = n if nulos is None else nulos.add(n, fill_value=0)
    return primero, filas, nulos, time.perf_counter() - t


def clasificar(cols) -> str:
    c = set(cols)
    if {"frameId", "x", "y"} <= c:
        return "tracking"
    if "pff_role" in c:
        return "scouting"
    if {"gameId", "playId", "playDescription"} <= c:
        return "jugadas"
    if {"gameId", "season", "week"} <= c:
        return "juegos"
    if "nflId" in c and ({"displayName", "officialPosition"} & c):
        return "jugadores"
    return "externo/otro"


def a_int(df: pd.DataFrame) -> pd.DataFrame:
    return df.apply(lambda s: s.astype("int64") if pd.api.types.is_float_dtype(s) else s)


def pareja(a: pd.DataFrame, ka: list[str], b: pd.DataFrame, kb: list[str]) -> dict:
    """Prueba de unión a→b. Filas de a con pareja en b, y claves únicas de b con pareja en a."""
    A = a_int(a[ka].dropna())
    B = a_int(b[kb].dropna())
    ia = pd.MultiIndex.from_frame(A)
    ib = pd.MultiIndex.from_frame(B.drop_duplicates())
    iau = pd.MultiIndex.from_frame(A.drop_duplicates())
    ok_a = ia.isin(ib)
    ok_b = ib.isin(iau)
    return {"filas_a": len(A), "pct_a": 100 * ok_a.mean(), "huerf_a": int((~ok_a).sum()),
            "claves_b": len(ib), "pct_b": 100 * ok_b.mean(), "huerf_b": int((~ok_b).sum())}


def pct(x: float, nd: int = 1) -> str:
    return f"{x:.{nd}f}%"


def esc(v, n: int = 38) -> str:
    s = str(v).replace("|", "/").replace("\n", " ")
    return s if len(s) <= n else s[: n - 1] + "…"


# ------------------------------------------------------------------ descubrimiento
def descubrir():
    todos = sorted(p for p in DATA.rglob("*") if p.is_file())
    csv = [p for p in todos if p.name.endswith(EXTENSIONES)]
    otros = [p for p in todos if not p.name.endswith(EXTENSIONES) and p.name != ".DS_Store"]
    grupos: dict[str, list[Path]] = {}
    for p in csv:
        patron = str(p.parent.relative_to(DATA) / re.sub(r"\d+", "#", p.name))
        grupos.setdefault(patron, []).append(p)
    return todos, csv, otros, grupos


# ------------------------------------------------------------------ perfil de una tabla
def perfilar(path: Path, n_archivos: int = 1) -> dict:
    tam = path.stat().st_size
    rel = str(path.relative_to(RAIZ))
    r: dict = {"ruta": rel, "mb": mb(tam), "n_archivos": n_archivos, "bloques": False}
    if mb(tam) > LIMITE_BLOQUES_MB:
        head, filas, nulos, seg = leer_por_bloques(path)
        r.update(df=head, filas=filas, cols=head.shape[1], t=seg, mem=np.nan, bloques=True,
                 pct_nulos=(100 * nulos / filas), crudo={})
    else:
        df, seg = leer(path)
        raw = pd.read_csv(path, dtype=str, keep_default_na=False)
        crudo = {c: {t: int((raw[c] == t).sum()) for t in TOKENS_NULOS if (raw[c] == t).any()} for c in raw.columns}
        r.update(df=df, filas=len(df), cols=df.shape[1], t=seg, mem=mb(df.memory_usage(deep=True).sum()),
                 pct_nulos=100 * df.isna().mean(), crudo={c: v for c, v in crudo.items() if v})
        del raw
    r["tipo"] = clasificar(r["df"].columns)
    llave = [c for c in LLAVES.get(r["tipo"], []) if c in r["df"].columns]
    if "old_game_id" in r["df"].columns and "play_id" in r["df"].columns:
        llave = ["old_game_id", "play_id"]
    r["llave"] = llave
    df = r["df"]
    if r["bloques"] or not llave:
        r["dups"] = None
    elif r["tipo"] == "tracking":
        bola = df["team"].eq("football") if "team" in df else df["nflId"].isna()
        r["dups"] = int(df[~bola].duplicated(llave).sum())
        r["dups_bola"] = int(df[bola].duplicated(["gameId", "playId", "frameId"]).sum())
    else:
        r["dups"] = int(df.duplicated(llave).sum())
    return r


def cobertura(r: dict) -> str:
    df, t = r["df"], r["tipo"]
    if r["bloques"]:
        return "leído por bloques; cobertura no calculada"
    if t == "juegos":
        return (f"{len(df)} juegos; temporada(s) {sorted(df.season.unique().tolist())}; semanas {df.week.min()}-{df.week.max()}; "
                f"fechas {df.gameDate.iloc[0]} a {df.gameDate.iloc[-1]} (orden del archivo)")
    if t == "jugadas":
        pj = df.groupby("gameId").size()
        return f"{df.gameId.nunique()} juegos; jugadas por juego mín/mediana/máx {pj.min()}/{int(pj.median())}/{pj.max()}"
    if t == "jugadores":
        return f"{len(df)} jugadores; {df.officialPosition.nunique()} posiciones; birthDate nulo {pct(100 * df.birthDate.isna().mean())}"
    if t == "scouting":
        pj = df.groupby(["gameId", "playId"]).size()
        return (f"{df.gameId.nunique()} juegos; {len(pj)} jugadas; filas por jugada mín/máx {pj.min()}/{pj.max()}")
    if t == "tracking":
        fr = df.groupby("playId").frameId.max()
        return (f"gameId {df.gameId.unique().tolist()}; {df.playId.nunique()} jugadas; frames por jugada mín/mediana/máx "
                f"{fr.min()}/{int(fr.median())}/{fr.max()}")
    return ""


# ------------------------------------------------------------------ mediciones específicas
def medir_jugadas(p: pd.DataFrame) -> dict:
    m: dict = {"n": len(p)}
    if "passResult" in p:
        m["passResult"] = p.passResult.value_counts(dropna=False)
        m["passResult_nulos"] = int(p.passResult.isna().sum())
    for c in ["dropBackType", "pff_passCoverageType", "offenseFormation"]:
        if c in p:
            m[c] = p[c].value_counts(dropna=False)
    if "pff_playAction" in p:
        m["playAction_pct"] = 100 * p.pff_playAction.mean()
    if "down" in p:
        m["down0"] = int((p.down == 0).sum())
        m["down0_2pt"] = int(p[p.down == 0].playDescription.str.contains("TWO-POINT").sum())
    if "quarter" in p:
        m["q5"] = int((p.quarter == 5).sum())
    if "playDescription" in p:
        m["sin_pase_desc"] = int((~p.playDescription.str.contains("pass|sack|scramble", case=False, regex=True)).sum())
    if "penaltyYards" in p:
        m["pen_nn"] = int(p.penaltyYards.notna().sum())
        m["res_dist_pre"] = int((p.playResult != p.prePenaltyPlayResult).sum())
    if {"yardlineSide", "yardlineNumber"} <= set(p.columns):
        m["sin_side"] = int(p.yardlineSide.isna().sum())
        m["sin_side_50"] = int((p[p.yardlineSide.isna()].yardlineNumber == 50).sum())
    return m


def medir_cruzadas(t: dict) -> dict:
    """Coherencias que cruzan tablas de distinto tipo (juego de la muestra de tracking)."""
    m: dict = {}
    if "jugadas" in t and "scouting" in t:
        p, f = t["jugadas"]["df"], t["scouting"]["df"]
        if "pff_sack" in f and "passResult" in p:
            s = p[p.passResult == "S"][["gameId", "playId"]]
            con = f[f.pff_sack == 1][["gameId", "playId"]].drop_duplicates()
            m["sacks_S"] = len(s)
            m["sacks_S_con_pff"] = len(s.merge(con))
            m["pff_sack_fuera_S"] = len(con.merge(s, how="left", indicator=True).query("_merge=='left_only'"))
            m["pff_sack_suma"] = int(f.pff_sack.sum())
        if "pff_role" in f:
            m["qb_por_jugada"] = f.groupby(["gameId", "playId"]).pff_role.apply(lambda x: (x == "Pass").sum()).value_counts().to_dict()
            m["roles"] = f.pff_role.value_counts().to_dict()
            m["filas_por_jugada"] = f.groupby(["gameId", "playId"]).size().value_counts().to_dict()
        for c in ["pff_hit", "pff_sackAllowed", "pff_blockType"]:
            if c in f:
                m["nn_" + c] = f.groupby("pff_role")[c].apply(lambda x: x.notna().mean()).round(3).to_dict()
    if "tracking" in t and "jugadas" in t:
        tr, p = t["tracking"]["df"], t["jugadas"]["df"]
        gid = tr.gameId.unique()
        pg = p[p.gameId.isin(gid)]
        bola = tr.team.eq("football")
        m["bola_filas"] = int(bola.sum())
        m["bola_sin_nflId"] = int(tr[bola].nflId.isna().all())
        m["jug_sin_nflId"] = int(tr[~bola].nflId.isna().sum())
        m["jug_por_frame"] = tr[~bola].groupby(["playId", "frameId"]).size().value_counts().to_dict()
        m["x_rango"] = (tr.x.min(), tr.x.max())
        m["y_rango"] = (tr.y.min(), tr.y.max())
        m["x_fuera"] = int(((tr.x < 0) | (tr.x > 120)).sum())
        m["y_fuera"] = int(((tr.y < 0) | (tr.y > 53.3)).sum())
        m["dir_cuenta"] = tr.playDirection.value_counts().to_dict()
        m["o_dir_nulos_bola"] = bool(tr[tr.o.isna()].team.eq("football").all())
        v = tr[(tr.s > 2)]
        m["dis_sobre_s"] = float((v.dis / v.s).median())
        m["tiempos_distintos_por_jugada"] = float(tr.groupby("playId").time.nunique().median())
        m["frames_por_jugada"] = float(tr.groupby("playId").frameId.max().median())
        m["time_con_fraccion"] = int(tr.time.astype(str).str.contains(r"\.", regex=True).sum())
        run_ids = tr[tr.event == "run"].playId.unique()
        m["run_jugadas"] = len(run_ids)
        m["run_passResult"] = pg[pg.playId.isin(run_ids)].passResult.value_counts().to_dict()
        m["event_none_crudo"] = t["tracking"]["crudo"].get("event", {})
        m["event_nn"] = tr.event.value_counts().to_dict()
        snap = tr[tr.event.isin(["ball_snap", "autoevent_ballsnap"])].groupby("playId").frameId.min()
        m["jugadas_con_snap"] = int(len(snap))
        m["jugadas_tr"] = int(tr.playId.nunique())
        # dirección de ataque vs posición de la ofensiva en el snap
        s = tr.merge(snap.rename("sf"), on="playId")
        s = s[s.frameId == s.sf]
        b = s[s.team == "football"].set_index("playId").x.rename("bx")
        o = s[s.team != "football"].merge(pg[["playId", "possessionTeam", "absoluteYardlineNumber"]], on="playId")
        o = o[o.team == o.possessionTeam].groupby("playId").agg(ox=("x", "mean"), d=("playDirection", "first"),
                                                                 ab=("absoluteYardlineNumber", "first"))
        o = o.join(b)
        dx = o.ox - o.bx
        m["dir_coherente"] = int((((dx < 0) & (o.d == "right")) | ((dx > 0) & (o.d == "left"))).sum())
        m["dir_n"] = len(o)
        dif = (o.bx - o.ab).abs()
        m["abs_vs_x_med"] = float(dif.median())
        m["abs_vs_x_max"] = float(dif.max())
        m["abs_vs_x_n"] = len(dif)
        m["abs_vs_120_pct"] = float(100 * ((o.bx - (120 - o.ab)).abs() <= 2.5).mean())
    return m


# ------------------------------------------------------------------ carga completa del tracking (subproceso)
def cargar_tracking(modo: str) -> dict:
    archivos = sorted(p for p in DATA.rglob("*") if p.is_file() and re.fullmatch(r"tracking_\d+\.csv(\.gz)?", p.name))
    t0 = time.perf_counter()
    if modo == "completo":
        df = pd.concat([pd.read_csv(p) for p in archivos], ignore_index=True)
    else:
        from pandas.api.types import union_categoricals
        trozos = [pd.read_csv(p, usecols=COLS_LIGERO, dtype={**DTYPES_LIGERO, **{c: "category" for c in CAT_LIGERO}}) for p in archivos]
        cats = {c: union_categoricals([t[c] for t in trozos], ignore_order=True).categories for c in CAT_LIGERO}
        for t in trozos:
            for c in CAT_LIGERO:
                t[c] = t[c].cat.set_categories(cats[c])
        df = pd.concat(trozos, ignore_index=True)
        del trozos
    seg = time.perf_counter() - t0
    return {"modo": modo, "archivos": len(archivos), "filas": len(df), "cols": df.shape[1], "t": seg,
            "mem": mb(df.memory_usage(deep=True).sum()), "rss_pico": rss_pico_mb()}


def medir_tracking_completo() -> dict:
    out = {}
    for modo in ["completo", "ligero"]:
        r = subprocess.run([sys.executable, str(Path(__file__).resolve()), "--solo-tracking", modo],
                           capture_output=True, text=True, cwd=RAIZ)
        out[modo] = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 else {"error": r.stderr[-300:]}
    return out


# ------------------------------------------------------------------ columnas
def md_columnas(tablas: list[dict]) -> str:
    L = ["# Detalle de columnas (solo consulta)", "",
         f"Medido el {date.today().isoformat()}. Generado por `backend/explorar.py`. No leer completo: buscar la tabla o columna necesaria.",
         "`nulos` = % de NaN tras leer con pandas. `crudo` = textos nulos literales en el CSV (pandas los convierte en NaN).", ""]
    for r in tablas:
        df = r["df"]
        L += [f"## {r['ruta']} ({r['tipo']}; {r['filas']:,} filas)" + (" [una partición de varias]" if r["n_archivos"] > 1 else ""), "",
              "| columna | tipo | nulos | crudo | ejemplos |", "|---|---|---|---|---|"]
        for c in df.columns:
            ej = ", ".join(esc(v) for v in df[c].dropna().unique()[:3])
            cr = ", ".join(f"{k}:{v}" for k, v in r["crudo"].get(c, {}).items())
            L.append(f"| {c} | {df[c].dtype} | {pct(r['pct_nulos'][c])} | {cr} | {ej} |")
        L.append("")
    return "\n".join(L)


# ------------------------------------------------------------------ informe
def tabla_conteo(s: pd.Series, n: int | None = None) -> str:
    tot = s.sum()
    return "; ".join(f"{('NaN' if pd.isna(k) else k)}={v} ({100 * v / tot:.1f}%)" for k, v in s.head(n).items())


def md_informe(info: dict) -> str:
    T, G, J = info["tablas"], info["grupos"], info["uniones"]
    jug = T.get("jugadas")
    L: list[str] = []
    A = L.append
    A("# Exploración de data/ (solo lectura)")
    A("")
    A(f"Medido el {info['fecha']} con Python {platform.python_version()}, pandas {pd.__version__}, numpy {np.__version__} "
      f"({platform.system()}). ENUNCIADO.md: {'existe' if info['enunciado'] else 'no existe'}; referencia de interpretación: Data.md. "
      "Detalle de columnas: EXPLORACION_COLUMNAS.md.")
    A("")
    A("## 1. Peso y archivos")
    A(f"- data/ pesa {mb(info['bytes_total']):.1f} MB en {info['n_archivos']} archivos ({info['n_csv']} CSV; otros no CSV: "
      f"{', '.join(info['otros']) or 'ninguno'}).")
    for patron, g in G.items():
        if g["n"] > 1:
            A(f"- `{patron}`: {g['n']} archivos, {g['mb']:.1f} MB en total, {g['mb_min']:.1f}-{g['mb_max']:.1f} MB por archivo. "
              f"Mismo esquema: son particiones de una tabla. Solo se analizó `{g['muestra']}`.")
    A("")
    A("## 2. Inventario por archivo")
    A("| Archivo | Tipo | MB | Filas | Cols | Carga s | Llave | Dups llave |")
    A("|---|---|---|---|---|---|---|---|")
    for r in T.values():
        nombre = Path(r["ruta"]).name + (" (muestra)" if r["n_archivos"] > 1 else "")
        dup = "no calculado" if r["dups"] is None else str(r["dups"])
        if r.get("dups_bola") is not None:
            dup += f" (+{r['dups_bola']} balón)"
        A(f"| {nombre} | {r['tipo']} | {r['mb']:.2f} | {r['filas']:,} | {r['cols']} | {r['t']:.3f} | "
          f"{'+'.join(r['llave']) or '-'} | {dup} |")
    A("")
    A("Cobertura:")
    for r in T.values():
        A(f"- {Path(r['ruta']).name}: {cobertura(r)}.")
    A("")
    A("## 3. Qué representa una fila")
    X = info["cruz"]
    if "juegos" in T:
        A(f"- games: un partido ({T['juegos']['filas']} filas, gameId único: {T['juegos']['dups'] == 0}).")
    if jug:
        A(f"- plays: una jugada de un juego ({jug['filas']:,} filas, llave gameId+playId con {jug['dups']} duplicados). "
          f"playId solo no es único: {jug['df'].playId.nunique():,} valores distintos en {jug['filas']:,} filas.")
    if "jugadores" in T:
        A(f"- players: un jugador ({T['jugadores']['filas']:,} filas, {T['jugadores']['dups']} nflId repetidos).")
    if "scouting" in T and "filas_por_jugada" in X:
        A(f"- pffScoutingData: un jugador en una jugada. Filas por jugada (filas: jugadas): {X['filas_por_jugada']}. "
          f"Roles por jugada: {X['roles']}; un 'Pass' por jugada: {X['qb_por_jugada']}.")
    if "tracking" in T and "jug_por_frame" in X:
        A(f"- tracking: un jugador o el balón en un frame de una jugada. Jugadores por frame (jugadores: frames): {X['jug_por_frame']}; "
          f"balón: {X['bola_filas']:,} filas con nflId vacío en todas ({bool(X['bola_sin_nflId'])}); jugadores sin nflId: {X['jug_sin_nflId']}.")
    A("")
    A("## 4. Relaciones entre tablas de distinto tipo (izq → der)")
    A("| Unión | Filas izq | % izq con pareja | Huérfanas izq | Claves der | % claves der con pareja | Huérfanas der |")
    A("|---|---|---|---|---|---|---|")
    for nom, u in J.items():
        A(f"| {nom} | {u['filas_a']:,} | {pct(u['pct_a'], 2)} | {u['huerf_a']:,} | {u['claves_b']:,} | {pct(u['pct_b'], 2)} | {u['huerf_b']:,} |")
    A(f"- Tracking: las uniones con jugadas y scouting se probaron solo en el juego de la muestra ({info['muestra_gid']}); "
      "los otros archivos de tracking no se abrieron.")
    A(f"- nflverse: {'hay archivos externos en data/' if info['externos'] else 'no hay archivos externos en data/'}. "
      "Llaves esperadas gameId=old_game_id, playId=play_id: sin confirmar (nada que probar).")
    A("")
    if jug:
        M = info["jugadas_m"]
        A("## 5. Tipo de jugada (plays.csv, {:,} jugadas)".format(M["n"]))
        A(f"- passResult nulo: {M['passResult_nulos']} de {M['n']:,}. Distribución: {tabla_conteo(M['passResult'])}.")
        A(f"- dropBackType: {tabla_conteo(M['dropBackType'])}.")
        A(f"- pff_passCoverageType: {tabla_conteo(M['pff_passCoverageType'])}; play action (pff_playAction=1): {pct(M['playAction_pct'])}.")
        A(f"- offenseFormation: {tabla_conteo(M['offenseFormation'])}.")
        A(f"- Descripciones sin 'pass', 'sack' ni 'scramble': {M['sin_pase_desc']}. down=0: {M['down0']} filas, de ellas {M['down0_2pt']} "
          f"con 'TWO-POINT' en la descripción. quarter=5 (tiempo extra): {M['q5']} jugadas.")
        A("")
    A("## 6. Coherencias medidas")
    if "sacks_S" in X:
        A(f"- passResult='S': {X['sacks_S']} jugadas; con algún pff_sack=1: {X['sacks_S_con_pff']}; jugadas con pff_sack=1 que no son 'S': "
          f"{X['pff_sack_fuera_S']}; suma de pff_sack: {X['pff_sack_suma']:.0f}.")
    if jug:
        M = info["jugadas_m"]
        A(f"- playResult distinto de prePenaltyPlayResult en {M['res_dist_pre']} jugadas; penaltyYards no nulo en {M['pen_nn']}.")
        A(f"- yardlineSide nulo en {M['sin_side']} jugadas; de ellas yardlineNumber=50 en {M['sin_side_50']} (línea de mitad de campo).")
    if "dir_n" in X:
        A(f"- Tracking x/y: x en {X['x_rango'][0]:.2f}..{X['x_rango'][1]:.2f} ({X['x_fuera']} filas fuera de 0-120); "
          f"y en {X['y_rango'][0]:.2f}..{X['y_rango'][1]:.2f} ({X['y_fuera']} filas fuera de 0-53.3).")
        A(f"- playDirection no está normalizada: {X['dir_cuenta']} filas. En el snap, la ofensiva está detrás del balón según la dirección en "
          f"{X['dir_coherente']} de {X['dir_n']} jugadas.")
        A(f"- absoluteYardlineNumber vs x del balón en el snap: diferencia mediana {X['abs_vs_x_med']:.2f} yd, máxima {X['abs_vs_x_max']:.2f} yd "
          f"({X['abs_vs_x_n']} jugadas); coincide con 120-abs (±2.5 yd) en {pct(X['abs_vs_120_pct'])}. Está en coordenadas x del tracking.")
        A(f"- Jugadas con evento de snap (ball_snap o autoevent_ballsnap): {X['jugadas_con_snap']} de {X['jugadas_tr']}. "
          f"Eventos (filas): {X['event_nn']}. Texto 'None' crudo en event: {X['event_none_crudo']} (pandas lo lee como NaN).")
        A(f"- o y dir nulos solo en filas del balón: {X['o_dir_nulos_bola']}. Mediana dis/s con s>2: {X['dis_sobre_s']:.3f} s por frame. "
          f"time: mediana de {X['tiempos_distintos_por_jugada']:.0f} valores distintos por jugada con {X['frames_por_jugada']:.0f} frames; "
          f"{X['time_con_fraccion']} filas con fracción de segundo.")
        A(f"- Evento 'run' en tracking: {X['run_jugadas']} jugadas; su passResult en plays: {X['run_passResult']} (el evento aparece aunque todas son dropbacks).")
    A("")
    A("## 7. Qué SÍ aporta")
    if jug:
        M = info["jugadas_m"]
        A(f"- Contexto de {M['n']:,} jugadas de pase (dropbacks) con down, distancia, formación, personal y marcador previo; "
          f"coverage PFF presente en {100 - jug['pct_nulos']['pff_passCoverage']:.1f}% de las jugadas.")
    if "scouting" in T:
        A(f"- Roles y resultados por jugador en cada jugada ({T['scouting']['filas']:,} filas): hits, hurries, sacks, bloqueos, tipo de bloqueo.")
    if "tracking" in T and "dis_sobre_s" in X:
        A(f"- Trayectorias de 22 jugadores y balón por frame con x, y, s, a, dis, o, dir; cadencia ≈{1 / X['dis_sobre_s']:.0f} frames/s (dis/s={X['dis_sobre_s']:.3f}).")
        A(f"- Eventos que marcan fases de la jugada: {', '.join(k for k in X['event_nn'])}.")
    A("")
    A("## 8. Qué NO aporta")
    if jug:
        M = info["jugadas_m"]
        A(f"- Jugadas de carrera, despejes y goles de campo: passResult nulo en {M['passResult_nulos']} jugadas y {M['sin_pase_desc']} descripciones sin pase/sack/scramble.")
        ausentes = [c for c in ["epa", "wp", "wpa", "targetNflId", "receiverId", "playType", "air_yards", "weather", "defensiveTeamScore"] if c not in jug["df"].columns]
        A(f"- Columnas inexistentes en plays.csv ({jug['cols']} columnas): {', '.join(ausentes)}. Receptor objetivo solo aparece como texto en playDescription.")
    if "juegos" in T:
        A(f"- Solo {T['juegos']['filas']} juegos, temporada {sorted(T['juegos']['df'].season.unique().tolist())}, semanas {T['juegos']['df'].week.min()}-{T['juegos']['df'].week.max()}; "
          f"games.csv tiene {T['juegos']['cols']} columnas (sin clima, estadio ni marcador final).")
    A("- Marcador final, EPA y probabilidad de victoria: ninguna columna con ese contenido (solo preSnapHomeScore y preSnapVisitorScore).")
    A("")
    A("## 9. Carga para una API que calcula al arrancar")
    C = info["carga"]
    A("- Tiempos con caché de disco caliente del sistema operativo (el primer arranque en frío puede tardar más). MB = 1e6 bytes.")
    A(f"- Tablas pequeñas (games+plays+players+pff, completas): {C['peq_t']:.2f} s, {C['peq_mem']:.1f} MB en DataFrames.")
    A(f"- Un archivo de tracking (muestra): {T['tracking']['t']:.3f} s, {T['tracking']['mem']:.1f} MB.")
    A(f"- RSS pico de este análisis: {C['rss']:.0f} MB.")
    if info["tracking_completo"]:
        for modo, r in info["tracking_completo"].items():
            if "error" in r:
                A(f"- Tracking completo ({modo}): error {r['error']}")
            else:
                etiqueta = "todas las columnas, tipos por defecto" if modo == "completo" else "ligero"
                A(f"- Tracking, todos los archivos, {etiqueta}: {r['archivos']} archivos, {r['filas']:,} filas x {r['cols']} cols, {r['t']:.1f} s, "
                  f"{r['mem']:.0f} MB en DataFrame, RSS pico {r['rss_pico']:.0f} MB (proceso aparte).")
        A("- 'ligero' = 14 columnas (sin time ni jerseyNumber), float32/int32 y texto como category. Es una medición, no una recomendación de diseño.")
    else:
        A("- Tracking completo: no medido (ejecutar con --tracking-completo).")
    A("")
    A("## 10. Sin confirmar")
    A("- Las llaves con nflverse (gameId=old_game_id, playId=play_id): no hay datos de nflverse en data/.")
    A("- Uniones tracking↔jugadas y tracking↔pff en los otros archivos de tracking: solo se midió el juego de la muestra.")
    A("- Significado de pff_role, pff_blockType y pff_passCoverage: se toma de Data.md; los conteos solo confirman que los valores existen.")
    return "\n".join(L) + "\n"


# ------------------------------------------------------------------ principal
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tracking-completo", action="store_true", help="mide además cargar todos los tracking (2 subprocesos)")
    ap.add_argument("--solo-tracking", choices=["completo", "ligero"], help="uso interno")
    a = ap.parse_args()
    if a.solo_tracking:
        print(json.dumps(cargar_tracking(a.solo_tracking)))
        return

    todos, csv, otros, grupos = descubrir()
    info: dict = {"fecha": date.today().isoformat(), "enunciado": (RAIZ / "ENUNCIADO.md").exists(),
                  "bytes_total": sum(p.stat().st_size for p in todos), "n_archivos": len(todos), "n_csv": len(csv),
                  "otros": [str(p.relative_to(DATA)) for p in otros]}
    info["grupos"], tablas = {}, {}
    cargas = []
    for patron, ps in grupos.items():
        tam = [mb(p.stat().st_size) for p in ps]
        info["grupos"][patron] = {"n": len(ps), "mb": sum(tam), "mb_min": min(tam), "mb_max": max(tam),
                                  "muestra": str(ps[0].relative_to(RAIZ))}
        r = perfilar(ps[0], len(ps))
        base = r["tipo"]
        tablas[base if base not in tablas else f"{base}:{ps[0].name}"] = r
        cargas.append(r)
    info["tablas"] = tablas
    info["externos"] = [k for k in tablas if k.startswith("externo")]

    # uniones entre tablas de distinto tipo
    J: dict = {}
    t = tablas

    def u(nombre, ta, ka, tb, kb, a_df=None, b_df=None):
        if ta in t and tb in t:
            J[nombre] = pareja(a_df if a_df is not None else t[ta]["df"], ka, b_df if b_df is not None else t[tb]["df"], kb)

    u("plays → games (gameId)", "jugadas", ["gameId"], "juegos", ["gameId"])
    u("games → plays (gameId)", "juegos", ["gameId"], "jugadas", ["gameId"])
    u("pff → plays (gameId, playId)", "scouting", ["gameId", "playId"], "jugadas", ["gameId", "playId"])
    u("plays → pff (gameId, playId)", "jugadas", ["gameId", "playId"], "scouting", ["gameId", "playId"])
    u("pff → players (nflId)", "scouting", ["nflId"], "jugadores", ["nflId"])
    u("players → pff (nflId)", "jugadores", ["nflId"], "scouting", ["nflId"])
    u("pff → games (gameId)", "scouting", ["gameId"], "juegos", ["gameId"])
    if "jugadas" in t and "jugadores" in t:
        p = t["jugadas"]["df"]
        fouls = pd.concat([p[f"foulNFLId{i}"].rename("nflId") for i in (1, 2, 3) if f"foulNFLId{i}" in p]).to_frame()
        J["plays.foulNFLId1-3 → players (nflId)"] = pareja(fouls, ["nflId"], t["jugadores"]["df"], ["nflId"])
    if "scouting" in t and "jugadores" in t and "pff_nflIdBlockedPlayer" in t["scouting"]["df"]:
        J["pff.pff_nflIdBlockedPlayer → players"] = pareja(
            t["scouting"]["df"].rename(columns={"pff_nflIdBlockedPlayer": "nflId_b"}), ["nflId_b"],
            t["jugadores"]["df"].rename(columns={"nflId": "nflId_b"}), ["nflId_b"])
    if "tracking" in t:
        tr = t["tracking"]["df"]
        gid = tr.gameId.unique()
        info["muestra_gid"] = ", ".join(map(str, gid))
        if "jugadas" in t:
            pg = t["jugadas"]["df"]
            pg = pg[pg.gameId.isin(gid)]
            J["tracking(muestra) → plays, mismo juego"] = pareja(tr, ["gameId", "playId"], pg, ["gameId", "playId"])
            J["plays, mismo juego → tracking(muestra)"] = pareja(pg, ["gameId", "playId"], tr, ["gameId", "playId"])
        if "scouting" in t:
            fg = t["scouting"]["df"]
            fg = fg[fg.gameId.isin(gid)]
            trj = tr[tr.nflId.notna()]
            J["tracking(muestra) jugadores → pff, mismo juego"] = pareja(trj, ["gameId", "playId", "nflId"], fg, ["gameId", "playId", "nflId"])
            J["pff, mismo juego → tracking(muestra) jugadores"] = pareja(fg, ["gameId", "playId", "nflId"], trj, ["gameId", "playId", "nflId"])
        if "jugadores" in t:
            J["tracking(muestra) jugadores → players (nflId)"] = pareja(tr[tr.nflId.notna()], ["nflId"], t["jugadores"]["df"], ["nflId"])
        if "juegos" in t:
            nombres = [p for ps in grupos.values() if "tracking" in ps[0].name for p in ps]
            ids = pd.DataFrame({"gameId": [int(re.search(r"(\d+)", p.name).group(1)) for p in nombres]})
            J["tracking: gameId del nombre de archivo → games"] = pareja(ids, ["gameId"], t["juegos"]["df"], ["gameId"])
            J["games → tracking: gameId del nombre de archivo"] = pareja(t["juegos"]["df"], ["gameId"], ids, ["gameId"])
    info["muestra_gid"] = info.get("muestra_gid", "-")
    info["uniones"] = J
    info["cruz"] = medir_cruzadas(t)
    if "jugadas" in t:
        info["jugadas_m"] = medir_jugadas(t["jugadas"]["df"])

    peq = [r for r in cargas if r["tipo"] in ("juegos", "jugadas", "jugadores", "scouting")]
    info["carga"] = {"peq_t": sum(r["t"] for r in peq), "peq_mem": sum(r["mem"] for r in peq), "rss": rss_pico_mb()}
    info["tracking_completo"] = medir_tracking_completo() if a.tracking_completo else None

    informe = md_informe(info)
    n = informe.count("\n")
    (RAIZ / "EXPLORACION.md").write_text(informe, encoding="utf-8")
    (RAIZ / "EXPLORACION_COLUMNAS.md").write_text(md_columnas(list(tablas.values())), encoding="utf-8")
    print(f"EXPLORACION.md: {n} líneas {'(EXCEDE 150)' if n > 150 else ''}; EXPLORACION_COLUMNAS.md escrito.")


if __name__ == "__main__":
    main()
