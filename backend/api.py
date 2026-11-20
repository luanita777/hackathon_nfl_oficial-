"""Router /api: endpoints GET con filtros comunes (tarea 10.2).

Todo sale de request.app.state (datos y jugadas ya marcadas al arrancar); no se lee
ningún CSV durante las solicitudes y no se escribe nada en disco. Lo único que se
guarda es un caché en memoria de la validación (cálculo pesado).
"""
from __future__ import annotations

import re
import threading
from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend import hallazgo as hz
from backend import ia, metrics
from backend.metrics import INSUFICIENTE, aplicar_filtros
from backend.validacion import validar

router = APIRouter()

MITADES = ("1-4", "5-8", "par", "impar")
COBERTURAS = ("Man", "Zone")
MAX_CACHE = 128            # tope de entradas del caché de validación (solo memoria)
_CACHE_VALIDACION: dict[tuple, dict] = {}
_CANDADO = threading.Lock()


# ---------- filtros ----------

@dataclass(frozen=True)
class Filtros:
    """Filtros ya validados; None significa 'sin filtro'."""

    semana: int | None = None
    mitad: str | None = None
    down: int | None = None
    equipo: str | None = None
    cobertura: str | None = None

    def como_dict(self) -> dict:
        """Solo los filtros presentes (misma forma que usa hallazgo e ia)."""
        return {k: v for k, v in self.__dict__.items() if v is not None}


def _rechazar(nombre: str, valor: str, regla: str):
    """422 en español con el filtro y el valor, sin cifras."""
    raise HTTPException(status_code=422,
                        detail=f"Filtro '{nombre}' inválido: {valor} ({regla})")


def _entero(nombre: str, valor: str, lo: int, hi: int) -> int:
    """Convierte a entero ASCII dentro de [lo, hi] o responde 422."""
    regla = f"debe ser un entero entre {lo} y {hi}"
    if not re.fullmatch(r"[0-9]+", valor):
        _rechazar(nombre, valor, regla)
    n = int(valor)
    if not lo <= n <= hi:
        _rechazar(nombre, valor, f"debe estar entre {lo} y {hi}")
    return n


def filtros_comunes(
    request: Request,
    semana: str | None = Query(None, description="Semana 1 a 8"),
    mitad: str | None = Query(None, description="1-4, 5-8, par o impar"),
    down: str | None = Query(None, description="Down 1 a 4"),
    equipo: str | None = Query(None, description="Equipo defensor presente en los datos"),
    cobertura: str | None = Query(None, description="Man o Zone"),
) -> Filtros:
    """Valida los cinco filtros; cualquier valor inválido responde 422 sin cifras."""
    f: dict = {}
    if semana is not None:
        f["semana"] = _entero("semana", semana, 1, 8)
    if mitad is not None:
        if mitad not in MITADES:
            _rechazar("mitad", mitad, "debe ser 1-4, 5-8, par o impar")
        f["mitad"] = mitad
    if down is not None:
        f["down"] = _entero("down", down, 1, 4)
    if equipo is not None:
        existentes = set(request.app.state.jugadas["defensiveTeam"].astype(str).unique())
        if equipo not in existentes:
            _rechazar("equipo", equipo, "no aparece en los datos")
        f["equipo"] = equipo
    if cobertura is not None:
        if cobertura not in COBERTURAS:
            _rechazar("cobertura", cobertura, "debe ser Man o Zone")
        f["cobertura"] = cobertura
    return Filtros(**f)


def _subconjunto(request: Request, f: Filtros):
    """Jugadas marcadas ya filtradas (todo en memoria)."""
    return aplicar_filtros(request.app.state.jugadas, **f.como_dict())


def _fila_vacia(**claves) -> dict:
    """Fila con n=0 y 'n insuficiente' para listas sin jugadas."""
    return {**claves, "n": 0, "est": INSUFICIENTE, "lo": None, "hi": None}


# ---------- endpoints ----------

@router.get("/tell")
def tell(request: Request, f: Filtros = Depends(filtros_comunes)) -> list[dict]:
    """P_Man por Alineación con n e IC95%."""
    sub = _subconjunto(request, f)
    filas = metrics.tell_por_alineacion(sub)
    return filas or [_fila_vacia(tramo_cb=None, safeties_prof=None)]


@router.get("/equipos")
def equipos(request: Request, f: Filtros = Depends(filtros_comunes)) -> list[dict]:
    """Tasa_Disfraz por equipo defensor con n e IC95%."""
    sub = _subconjunto(request, f)
    filas = metrics.tasa_disfraz_por_equipo(sub)
    return filas or [_fila_vacia(equipo=None)]


@router.get("/efecto")
def efecto(request: Request, f: Filtros = Depends(filtros_comunes)) -> dict:
    """Efecto del Disfraz sobre completos y yardas."""
    sub = _subconjunto(request, f)
    return {**metrics.efecto_disfraz(sub), "n": int(len(sub)), "filtros": f.como_dict()}


def _hallazgo(request: Request, f: Filtros) -> dict:
    return hz.armar_hallazgo(request.app.state.jugadas, f.como_dict())


@router.get("/hallazgo")
def hallazgo(request: Request, f: Filtros = Depends(filtros_comunes)) -> dict:
    """Frase del hallazgo y las cifras con las que se armó."""
    return _hallazgo(request, f)


def _contraste_mitad(sub, nombre: str, regla) -> dict:
    """Contraste cerca vs lejos en una parte de las semanas."""
    parte = sub[regla(sub["week"].astype(int))]
    return {"parte": nombre, **hz._contraste_de(parte)}


def _confirmacion(sub) -> dict:
    """Descubrimiento (semanas 1-4) y confirmación (5-8); también paridad par/impar.

    se_sostiene: el contraste se publica por paridad (regla del hallazgo) y también
    por mitades 1-4 vs 5-8 (IC que excluye 0, mismo signo, n suficiente).
    """
    par = _contraste_mitad(sub, "par", lambda s: s % 2 == 0)
    impar = _contraste_mitad(sub, "impar", lambda s: s % 2 == 1)
    desc = _contraste_mitad(sub, "semanas 1-4 (descubrimiento)", lambda s: s <= 4)
    conf = _contraste_mitad(sub, "semanas 5-8 (confirmación)", lambda s: s >= 5)
    por_paridad = hz.decidir_contraste(par, impar)
    por_mitades = hz.decidir_contraste(desc, conf)
    return {"descubrimiento": desc, "confirmacion": conf, "paridad": {"par": par, "impar": impar},
            "decision_paridad": por_paridad, "decision_mitades": por_mitades,
            "se_sostiene": bool(por_paridad["publicado"] and por_mitades["publicado"])}


def _validar_cacheado(sub, clave: tuple) -> dict:
    """validar() es pesado (permutaciones): se guarda en memoria por filtros."""
    with _CANDADO:
        if clave in _CACHE_VALIDACION:
            return _CACHE_VALIDACION[clave]
    resultado = validar(sub)
    with _CANDADO:
        if len(_CACHE_VALIDACION) < MAX_CACHE:
            _CACHE_VALIDACION[clave] = resultado
    return resultado


@router.get("/validacion")
def validacion(request: Request, f: Filtros = Depends(filtros_comunes)) -> dict:
    """Criterios de validación, cifras de descubrimiento y confirmación y se_sostiene."""
    sub = _subconjunto(request, f)
    n = int(len(sub))
    if n == 0:
        return {"n": 0, "estado": INSUFICIENTE, "se_sostiene": False, "filtros": f.como_dict()}
    clave = tuple(sorted(f.como_dict().items()))
    conf = _confirmacion(sub)
    return {"n": n, "filtros": f.como_dict(), "criterios": _validar_cacheado(sub, clave),
            "confirmacion": conf, "se_sostiene": conf["se_sostiene"]}


@router.get("/calidad")
def calidad(request: Request) -> dict:
    """Descartes con motivo, segundos y MB de la carga (sin filtros)."""
    datos = request.app.state.datos
    return {"descartes": dict(datos.descartes),
            "segundos": datos.info_carga["segundos"], "mb": datos.info_carga["mb"],
            "n_jugadas": int(len(request.app.state.jugadas))}


@router.get("/explicacion")
def explicacion(request: Request, f: Filtros = Depends(filtros_comunes)) -> dict:
    """Explicación opcional con IA del hallazgo filtrado; nunca lanza error."""
    try:
        return ia.explicar(_hallazgo(request, f), f.como_dict())
    except Exception:  # la IA es opcional: la API no se rompe
        return {"disponible": False, "texto": None}
