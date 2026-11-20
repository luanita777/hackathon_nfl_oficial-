"""Explicación opcional del hallazgo con Amazon Nova vía Strands Agents.

- Importar este módulo no requiere credenciales: el agente real se crea de forma perezosa.
- No se leen ni se pasan llaves de AWS: el cliente se crea solo con la región y boto3
  toma las credenciales del rol (en AWS) o del entorno (en local).
- Al modelo solo se le entrega el JSON del hallazgo; la respuesta se verifica antes de usarla.
- Nada se escribe en disco: el caché es un diccionario en memoria.
"""
from __future__ import annotations

import json
import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturoTimeout

MAX_PALABRAS = 120
TIMEOUT_S = 20

logger = logging.getLogger(__name__)

# Caché en memoria por tupla ordenada de filtros; solo textos verificados.
_CACHE: dict[tuple, str] = {}

_NO_DISPONIBLE = {"disponible": False, "texto": None}

# Instrucción para el modelo (solo texto, sin cifras propias).
INSTRUCCION = (
    "Eres un analista de fútbol americano que explica a un entrenador ofensivo. "
    f"Explica en español, en máximo {MAX_PALABRAS} palabras, el siguiente hallazgo en formato JSON. "
    "Usa únicamente las cifras que aparecen en el JSON, tal como están. "
    "No agregues cifras, equipos, jugadores ni causas que no estén en el JSON. "
    "Si el estado es no_concluyente, dilo y explica la razón sin sacar conclusiones."
)

# Números: miles con coma (1,275), decimales con punto o coma, signo y % opcionales.
_RE_NUM = re.compile(r"[-+]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?)%?")


def _decimales(s: str) -> int:
    """Número de decimales escritos en un texto numérico normalizado (con punto)."""
    return len(s.split(".")[1]) if "." in s else 0


def _normalizar(token: str) -> tuple[float, int]:
    """Convierte un token numérico a (valor absoluto, decimales). El signo y el % se ignoran."""
    t = token.lstrip("+-").rstrip("%")
    if re.fullmatch(r"[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?", t):
        t = t.replace(",", "")          # coma como separador de miles
    else:
        t = t.replace(",", ".")         # coma como decimal
    return abs(float(t)), _decimales(t)


def numeros_de_texto(texto: str) -> list[tuple[float, int]]:
    """Extrae los números de un texto como (valor absoluto, decimales)."""
    texto = re.sub(r"IC\s?95\s?%?", " ", texto, flags=re.IGNORECASE)   # "IC95%" es una etiqueta, no una cifra
    return [_normalizar(m) for m in _RE_NUM.findall(texto)]


def _recorrer(obj, salida: list[float]) -> None:
    """Junta todos los números del JSON, también los que vienen dentro de textos."""
    if isinstance(obj, bool) or obj is None:
        return
    if isinstance(obj, (int, float)):
        salida.append(abs(float(obj)))
    elif isinstance(obj, str):
        salida.extend(v for v, _ in numeros_de_texto(obj))
    elif isinstance(obj, dict):
        for v in obj.values():
            _recorrer(v, salida)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            _recorrer(v, salida)


def _candidatos(hallazgo: dict) -> list[float]:
    """Valores permitidos: cada número del JSON y, si es proporción (<= 1), su forma en %."""
    base: list[float] = []
    _recorrer(hallazgo, base)
    extra = [v * 100 for v in base if v <= 1]
    return base + extra


def verificar_texto(texto: str, hallazgo: dict) -> bool:
    """True si el texto tiene <= 120 palabras y todos sus números están en el hallazgo."""
    if not isinstance(texto, str) or not texto.strip():
        return False
    if len(texto.split()) > MAX_PALABRAS:
        return False
    candidatos = _candidatos(hallazgo)
    for valor, dec in numeros_de_texto(texto):
        tol = 0.5 * 10 ** (-dec) + 1e-9      # tolerancia de redondeo al decimal escrito
        if not any(abs(valor - c) <= tol for c in candidatos):
            return False
    return True


def _clave(filtros: dict | None) -> tuple:
    """Clave de caché: tupla ordenada de filtros presentes."""
    return tuple(sorted((str(k), str(v)) for k, v in (filtros or {}).items() if v is not None))


_MODELO = None


def _crear_agente():
    """Crea de forma perezosa un invocable `prompt -> texto` con Strands y Bedrock (Nova)."""
    global _MODELO
    from strands import Agent                      # import tardío: no exige credenciales al importar
    from strands.models import BedrockModel

    if _MODELO is None:
        region = os.environ.get("AWS_REGION", "us-east-1")
        modelo = os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-pro-v1:0")
        # Solo región: boto3 resuelve las credenciales por su cuenta (rol o entorno).
        _MODELO = BedrockModel(model_id=modelo, region_name=region)

    def invocar(prompt: str) -> str:
        # Agente nuevo en cada llamada: sin historial entre consultas.
        agente = Agent(model=_MODELO, system_prompt=INSTRUCCION, callback_handler=None)
        return str(agente(prompt))

    return invocar


def _prompt(hallazgo: dict) -> str:
    """Único contenido que recibe el modelo: el JSON del hallazgo."""
    return json.dumps(hallazgo, ensure_ascii=False, default=str)


def _llamar(agente, hallazgo: dict) -> str:
    """Llama al agente con timeout. El hilo vencido se abandona sin esperarlo."""
    ejecutor = ThreadPoolExecutor(max_workers=1)
    try:
        futuro = ejecutor.submit(lambda: agente(_prompt(hallazgo)))
        return str(futuro.result(timeout=TIMEOUT_S)).strip()
    finally:
        ejecutor.shutdown(wait=False, cancel_futures=True)


def explicar(hallazgo: dict, filtros: dict, agente=None) -> dict:
    """Devuelve {"disponible": bool, "texto": str | None}; `agente` es inyectable.

    `agente` es un invocable que recibe el prompt (JSON del hallazgo) y devuelve texto.
    Cualquier error, timeout o número ajeno devuelve no disponible, sin lanzar excepción.
    """
    try:
        clave = _clave(filtros)
        if clave in _CACHE:
            return {"disponible": True, "texto": _CACHE[clave]}

        if agente is None:
            agente = _crear_agente()
        texto = _llamar(agente, hallazgo)

        if not verificar_texto(texto, hallazgo):
            logger.warning("Respuesta de IA descartada por la verificación")
            return dict(_NO_DISPONIBLE)

        _CACHE[clave] = texto
        return {"disponible": True, "texto": texto}
    except FuturoTimeout:
        logger.warning("IA sin respuesta en %s s", TIMEOUT_S)
    except Exception as exc:  # noqa: BLE001 - la IA es opcional; nunca rompe la API
        logger.warning("IA no disponible: %s", type(exc).__name__)   # solo el tipo, sin detalles
    return dict(_NO_DISPONIBLE)
