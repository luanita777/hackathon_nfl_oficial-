"""Reglas de decisión y armado del hallazgo (tarea 9.1).

Contrato del JSON de GET /api/hallazgo (cada cifra la calcula el código):

    {
      "frase": "Con los esquineros a 2 yardas o menos ...",
      "estado": "publicado | no_concluyente",
      "razon": null,
      "contraste": {
        "cerca": {"n": 0, "est": 0.0, "lo": 0.0, "hi": 0.0},
        "lejos": {"n": 0, "est": 0.0, "lo": 0.0, "hi": 0.0},
        "diferencia": {"est": 0.0, "lo": 0.0, "hi": 0.0},
        "mitades": {"par": {}, "impar": {}}
      },
      "ranking": {"publicado": false, "razon": null, "mayor": {}, "menor": {},
                  "correlacion": 0.0, "p": 0.0},
      "efecto": {"completos": {}, "yardas": {}, "citado": false},
      "aviso_cortes": "Los cortes (0.50, 0.25, 8 yd y tramos) no fueron fijados a ciegas ...",
      "filtros": {}
    }

Campos añadidos al contrato: "cifras_frase" (los textos exactos de cada número de la
frase, para verificar que no hay cifras ajenas) y "ranking.equipos_validos".

Reglas:
- Contraste: publicar solo con n >= 30 en los cuatro grupos, IC de la diferencia
  que excluya 0 en ambas mitades de paridad y mismo signo; si no, "no_concluyente"
  con razón.
- Ranking de equipos: solo si el contraste se publicó, hay >= 2 equipos con n >= 30
  en ambas mitades, correlación >= 0.5 y p < 0.05; si no, "no concluyente".
- Efecto del Disfraz: citar solo si el IC95% excluye 0 y todos los n >= 30.
- "aviso_cortes" siempre presente.
- Con filtro de cobertura: "no_concluyente", razón "filtro de cobertura incompatible
  con el contraste".
"""
from __future__ import annotations

import re

import numpy as np
import pandas as pd

from backend.metrics import (CB_CERCA, CB_LEJOS, INSUFICIENTE, MIN_N, aplicar_filtros,
                             contraste_proporciones, efecto_disfraz,
                             marcar_lectura_y_disfraz, wilson)
from backend.validacion import validar

# ---- Umbrales fijados antes de calcular (Requirement 4.10); no se ajustan ----
CORR_MIN_RANKING = 0.5    # correlación de Pearson mínima entre mitades 1-4 y 5-8
ALFA_RANKING = 0.05       # el valor p de la permutación debe ser menor
MIN_EQUIPOS_RANKING = 2   # equipos con n >= MIN_N en ambas mitades
RAZON_COBERTURA = "filtro de cobertura incompatible con el contraste"
CLAVES_FILTRO = ("semana", "mitad", "down", "equipo", "cobertura")

AVISO_CORTES = ("Los cortes (0.50, 0.25, 8 yd y tramos) no fueron fijados a ciegas: salieron "
                "de una exploración con las mismas semanas. La confirmación se hizo por "
                "paridad de semana y por mitades de semanas 1-4 contra 5-8.")


# ---------- reglas de decisión (puras) ----------

def _sin_n(m: dict) -> bool:
    """True si la mitad no tiene n >= MIN_N en sus dos grupos."""
    if m.get("est") == INSUFICIENTE:
        return True
    return int(m.get("n_a", 0)) < MIN_N or int(m.get("n_b", 0)) < MIN_N


def decidir_contraste(mitad_a: dict, mitad_b: dict) -> dict:
    """Publica o devuelve la razón de no concluyente.

    Cada mitad es el resultado de contraste_proporciones (n_a, n_b, est, lo, hi).
    Publica solo con n suficiente en los cuatro grupos, IC que excluye 0 en ambas
    mitades y mismo signo.
    """
    if _sin_n(mitad_a) or _sin_n(mitad_b):
        return {"publicado": False, "razon": "n insuficiente en algún grupo de alguna mitad"}
    for m in (mitad_a, mitad_b):
        if not (m["lo"] > 0 or m["hi"] < 0):
            return {"publicado": False, "razon": "el IC95% de la diferencia cruza 0 en alguna mitad"}
    if np.sign(mitad_a["est"]) != np.sign(mitad_b["est"]):
        return {"publicado": False, "razon": "el signo de la diferencia es distinto entre mitades"}
    return {"publicado": True, "razon": None}


def _numero(x) -> bool:
    return isinstance(x, (int, float, np.integer, np.floating)) and bool(np.isfinite(x))


def decidir_ranking(corr: float, p: float, equipos_validos: int,
                    contraste_publicado: bool = True) -> dict:
    """Decide si el ranking de equipos se publica.

    Condiciones: contraste publicado, equipos_validos >= 2, corr >= 0.5 y p < 0.05.
    """
    if not contraste_publicado:
        return {"publicado": False, "razon": "el contraste principal no se publicó"}
    if equipos_validos is None or equipos_validos < MIN_EQUIPOS_RANKING:
        return {"publicado": False, "razon": "menos equipos con n suficiente en ambas mitades que el mínimo"}
    if not _numero(corr):
        return {"publicado": False, "razon": "correlación entre mitades no calculable (n insuficiente)"}
    if corr < CORR_MIN_RANKING:
        return {"publicado": False, "razon": "la correlación entre mitades es menor que el umbral"}
    if not _numero(p):
        return {"publicado": False, "razon": "valor p de la permutación no calculable"}
    if p >= ALFA_RANKING:
        return {"publicado": False, "razon": "la correlación no supera el control de permutación"}
    return {"publicado": True, "razon": None}


def _efecto_concluyente(e: dict) -> bool:
    """n suficiente en ambos grupos y IC95% que excluye 0."""
    if e.get("est") == INSUFICIENTE or e.get("lo") is None:
        return False
    if int(e.get("n_a", 0)) < MIN_N or int(e.get("n_b", 0)) < MIN_N:
        return False
    return bool(e["lo"] > 0 or e["hi"] < 0)


def decidir_efecto(efecto: dict) -> dict:
    """Decide si el efecto del Disfraz se cita (IC excluye 0 y n suficiente) o es no concluyente."""
    salida = {}
    for nombre in ("completos", "yardas"):
        e = dict(efecto[nombre])
        cita = _efecto_concluyente(e)
        e["citado"] = cita
        e["estado"] = "concluyente" if cita else "no concluyente"
        salida[nombre] = e
    salida["citado"] = bool(salida["completos"]["citado"] or salida["yardas"]["citado"])
    salida["n_con_disfraz"] = int(efecto.get("n_con_disfraz", 0))
    salida["n_sin_disfraz"] = int(efecto.get("n_sin_disfraz", 0))
    return salida


def numeros_de_texto(texto: str) -> list[str]:
    """Extrae los números de un texto (para verificar que no hay cifras ajenas).

    La etiqueta fija "IC95%" no cuenta como cifra del hallazgo.
    """
    limpio = texto.replace("IC95%", "IC")
    return re.findall(r"[-+]?\d+(?:[.,]\d+)?", limpio)


# ---------- cálculos del contraste ----------

def _contraste_de(j: pd.DataFrame) -> dict:
    """Diferencia P(Man) entre esquineros cerca (<= CB_CERCA) y lejos (> CB_LEJOS)."""
    cob = j["cobertura"].astype(str)
    valido = cob.isin(["Man", "Zone"]).to_numpy()
    cerca = (j["cb_prof"] <= CB_CERCA).to_numpy() & valido
    lejos = (j["cb_prof"] > CB_LEJOS).to_numpy() & valido
    man = (cob == "Man").to_numpy()
    return contraste_proporciones(int((man & cerca).sum()), int(cerca.sum()),
                                  int((man & lejos).sum()), int(lejos.sum()))


def _grupo_wilson(j: pd.DataFrame, cerca: bool) -> dict:
    """Proporción de Man con Wilson para el grupo cerca o lejos."""
    cob = j["cobertura"].astype(str)
    valido = cob.isin(["Man", "Zone"]).to_numpy()
    g = ((j["cb_prof"] <= CB_CERCA) if cerca else (j["cb_prof"] > CB_LEJOS)).to_numpy() & valido
    return wilson(int((g & (cob == "Man").to_numpy()).sum()), int(g.sum()))


def _equipos_validos(j: pd.DataFrame) -> list[dict]:
    """Tasa_Disfraz (Wilson) de equipos con n >= MIN_N de lectura clara en semanas 1-4 y 5-8."""
    c = j[j["lectura"].notna()]
    if c.empty:
        return []
    semana = c["week"].astype(int)
    out = []
    for eq, g in c.groupby(c["defensiveTeam"].astype(str), sort=True):
        s = semana.loc[g.index]
        if int((s <= 4).sum()) >= MIN_N and int((s >= 5).sum()) >= MIN_N:
            out.append({"equipo": eq, **wilson(int(g["disfraz"].sum()), len(g))})
    return out


# ---------- formato de la frase ----------

def _pct(x) -> str:
    return f"{x * 100:.1f}"


def _pp(x) -> str:
    return f"{x * 100:+.1f}"


def _texto_mitad(nombre: str, m: dict, c: dict) -> str:
    """Frase de una mitad por paridad; guarda sus cifras en c."""
    c[f"n_cerca_{nombre}"] = str(int(m.get("n_a", 0)))
    c[f"n_lejos_{nombre}"] = str(int(m.get("n_b", 0)))
    if m.get("est") == INSUFICIENTE:
        return (f"semanas {nombre}es: n insuficiente (n cerca={{n_cerca_{nombre}}}, "
                f"n lejos={{n_lejos_{nombre}}}).")
    c[f"d_{nombre}"], c[f"lo_{nombre}"], c[f"hi_{nombre}"] = _pp(m["est"]), _pp(m["lo"]), _pp(m["hi"])
    return (f"semanas {nombre}es: {{d_{nombre}}} puntos (IC95% {{lo_{nombre}}} a {{hi_{nombre}}}, "
            f"n cerca={{n_cerca_{nombre}}}, n lejos={{n_lejos_{nombre}}}).")


def _frases_efecto(ef: dict, c: dict) -> list[str]:
    """Una frase por efecto: se cita si concluyente, si no se marca 'no concluyente'."""
    frases = []
    for nombre, etiqueta, fmt, unidad in (("completos", "la tasa de completos", _pp_directo, "puntos"),
                                          ("yardas", "las yardas por jugada", _yd, "yardas")):
        e = ef[nombre]
        c[f"na_{nombre}"], c[f"nb_{nombre}"] = str(int(e.get("n_a", 0))), str(int(e.get("n_b", 0)))
        if e["est"] == INSUFICIENTE:
            frases.append(f"El efecto del Disfraz sobre {etiqueta} es no concluyente: n insuficiente "
                          f"(con Disfraz n={{na_{nombre}}}, sin Disfraz n={{nb_{nombre}}}).")
            continue
        c[f"e_{nombre}"], c[f"elo_{nombre}"], c[f"ehi_{nombre}"] = fmt(e["est"]), fmt(e["lo"]), fmt(e["hi"])
        ic = f"IC95% {{elo_{nombre}}} a {{ehi_{nombre}}}, con Disfraz n={{na_{nombre}}}, sin Disfraz n={{nb_{nombre}}}"
        if e["citado"]:
            frases.append(f"Con Disfraz, {etiqueta} cambia {{e_{nombre}}} {unidad} ({ic}).")
        else:
            frases.append(f"El efecto del Disfraz sobre {etiqueta} es no concluyente "
                          f"(estimación {{e_{nombre}}} {unidad}, {ic}).")
    return frases


def _pp_directo(x) -> str:
    return f"{x:+.1f}"


def _yd(x) -> str:
    return f"{x:+.2f}"


def _frase_ranking(rk: dict, liga: float, c: dict) -> str:
    """Frase de los equipos de mayor y menor Tasa_Disfraz, comparados con la liga."""
    c["liga"] = _pct(liga)
    partes = []
    for clave in ("mayor", "menor"):
        t = rk[clave]
        dif = t["est"] - liga
        c[f"eq_{clave}"] = t["equipo"]
        c[f"p_{clave}"], c[f"lo_{clave}"], c[f"hi_{clave}"] = _pct(t["est"]), _pct(t["lo"]), _pct(t["hi"])
        c[f"n_{clave}"] = str(int(t["n"]))
        c[f"dif_{clave}"] = f"{abs(dif) * 100:.1f}"
        c[f"sig_{clave}"] = "más" if dif >= 0 else "menos"
        partes.append(f"{{eq_{clave}}} juega la cobertura contraria a lo que muestra su alineación "
                      f"en {{p_{clave}}}% de sus jugadas con lectura clara (IC95% {{lo_{clave}}}–"
                      f"{{hi_{clave}}}, n={{n_{clave}}}), {{dif_{clave}}} puntos {{sig_{clave}}} "
                      f"que la liga ({{liga}}%)")
    return "; ".join(partes) + "."


# ---------- armado ----------

def _vacio_por_cobertura(filtros: dict) -> dict:
    """Respuesta con el filtro de cobertura: el contraste Man-vs-Zone queda degenerado."""
    return {
        "frase": f"No concluyente: {RAZON_COBERTURA}.",
        "estado": "no_concluyente", "razon": RAZON_COBERTURA,
        "contraste": {"cerca": None, "lejos": None, "diferencia": None,
                      "mitades": {"par": None, "impar": None}},
        "ranking": {"publicado": False, "razon": RAZON_COBERTURA, "mayor": None, "menor": None,
                    "correlacion": None, "p": None, "equipos_validos": None},
        "efecto": {"completos": None, "yardas": None, "citado": False},
        "cifras_frase": {}, "aviso_cortes": AVISO_CORTES, "filtros": filtros,
    }


def _ranking(sub: dict | pd.DataFrame, publicado_contraste: bool) -> tuple[dict, float | None]:
    """Arma el bloque de ranking; devuelve (bloque, tasa de la liga o None)."""
    rk = {"publicado": False, "razon": None, "mayor": None, "menor": None,
          "correlacion": None, "p": None, "equipos_validos": None}
    if not publicado_contraste:
        rk["razon"] = decidir_ranking(0.0, 1.0, 0, contraste_publicado=False)["razon"]
        return rk, None
    est = validar(sub)["estabilidad_mitades"]
    corr, p = est.get("pearson"), est.get("p_permutacion_pearson")
    rk["correlacion"] = float(corr) if _numero(corr) else None
    rk["p"] = float(p) if _numero(p) else None
    rk["equipos_validos"] = int(est.get("n_equipos", 0))
    d = decidir_ranking(corr, p, rk["equipos_validos"], contraste_publicado=True)
    rk["publicado"], rk["razon"] = d["publicado"], d["razon"]
    if not d["publicado"]:
        return rk, None
    equipos = _equipos_validos(sub)
    rk["mayor"] = max(equipos, key=lambda t: t["est"])
    rk["menor"] = min(equipos, key=lambda t: t["est"])
    clara = sub[sub["lectura"].notna()]
    return rk, float(clara["disfraz"].mean())


def armar_hallazgo(jugadas: pd.DataFrame, filtros: dict) -> dict:
    """Arma el JSON del hallazgo con cifras calculadas (la frase usa str.format)."""
    filtros = {k: filtros[k] for k in CLAVES_FILTRO if filtros.get(k) is not None}
    if "cobertura" in filtros:
        return _vacio_por_cobertura(filtros)
    base = jugadas if {"lectura", "disfraz"} <= set(jugadas.columns) else marcar_lectura_y_disfraz(jugadas)
    sub = aplicar_filtros(base, **filtros)

    # Contraste: total filtrado y cada mitad por paridad de semana
    par = sub[sub["week"].astype(int) % 2 == 0]
    impar = sub[sub["week"].astype(int) % 2 == 1]
    m_par, m_impar = _contraste_de(par), _contraste_de(impar)
    dec = decidir_contraste(m_par, m_impar)
    contraste = {"cerca": _grupo_wilson(sub, True), "lejos": _grupo_wilson(sub, False),
                 "diferencia": _contraste_de(sub), "mitades": {"par": m_par, "impar": m_impar}}
    ranking, liga = _ranking(sub, dec["publicado"])
    efecto = decidir_efecto(efecto_disfraz(sub))

    # Frase: plantillas con str.format sobre las cifras calculadas (c)
    c: dict = {"cb_cerca": f"{CB_CERCA:g}", "cb_lejos": f"{CB_LEJOS:g}"}
    texto_mitades = (f"{_texto_mitad('par', m_par, c)[:-1]}; {_texto_mitad('impar', m_impar, c)}")
    if dec["publicado"]:
        cer, lej, dif = contraste["cerca"], contraste["lejos"], contraste["diferencia"]
        c.update(p_cerca=_pct(cer["est"]), lo_cerca=_pct(cer["lo"]), hi_cerca=_pct(cer["hi"]),
                 n_cerca=str(cer["n"]), p_lejos=_pct(lej["est"]), n_lejos=str(lej["n"]),
                 d_total=_pp(dif["est"]), lo_total=_pp(dif["lo"]), hi_total=_pp(dif["hi"]))
        plantillas = [
            "Con los esquineros a {cb_cerca} yardas o menos de la línea al snap, la defensa juega Man "
            "el {p_cerca}% de las veces (IC95% {lo_cerca}–{hi_cerca}, n={n_cerca}); con más de "
            "{cb_lejos} yardas, el {p_lejos}% (n={n_lejos}).",
            "La diferencia es de {d_total} puntos (IC95% {lo_total} a {hi_total}) y se sostiene en las "
            "dos mitades por paridad de semana, " + texto_mitades]
    else:
        c["razon"] = dec["razon"]
        plantillas = ["No concluyente: la alineación no basta para leer la cobertura. Razón: {razon}. "
                      "Diferencia entre esquineros cerca y lejos, por mitad de paridad: " + texto_mitades]
    if ranking["publicado"]:
        plantillas.append(_frase_ranking(ranking, liga, c))
    plantillas += _frases_efecto(efecto, c)
    frase = " ".join(p.format(**c) for p in plantillas)

    return {"frase": frase,
            "estado": "publicado" if dec["publicado"] else "no_concluyente",
            "razon": dec["razon"], "contraste": contraste, "ranking": ranking,
            "efecto": efecto, "cifras_frase": c, "aviso_cortes": AVISO_CORTES,
            "filtros": filtros}
