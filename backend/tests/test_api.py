"""Pruebas de los endpoints /api con TestClient sobre los datos reales (tarea 10.4).

El cliente es de módulo y usa el lifespan: los datos se cargan una sola vez.
La IA nunca llama a AWS: se simula con monkeypatch.
"""
import pytest
from fastapi.testclient import TestClient

from backend import ia
from backend.main import app

INSUF = "n insuficiente"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:  # with: ejecuta el lifespan (carga de datos)
        yield c


@pytest.fixture(scope="module")
def jugadas(client):
    return app.state.jugadas


@pytest.fixture(scope="module")
def valores(jugadas):
    """Valores reales presentes en los datos para armar filtros válidos."""
    return {"equipo": str(jugadas["defensiveTeam"].astype(str).value_counts().index[0]),
            "cobertura": str(jugadas["cobertura"].astype(str).value_counts().index[0])}


def n_esperado(jugadas, semana=None, down=None, equipo=None, cobertura=None, mitad=None):
    """Cuenta real de jugadas con pandas, sin usar el código bajo prueba."""
    m = jugadas
    sem = m["week"].astype(int)
    if semana is not None:
        m = m[sem == semana]
        sem = m["week"].astype(int)
    if mitad is not None:
        regla = {"1-4": sem <= 4, "5-8": sem >= 5, "par": sem % 2 == 0, "impar": sem % 2 == 1}[mitad]
        m = m[regla]
    if down is not None:
        m = m[m["down"].astype(int) == down]
    if equipo is not None:
        m = m[m["defensiveTeam"].astype(str) == equipo]
    if cobertura is not None:
        m = m[m["cobertura"].astype(str) == cobertura]
    return len(m)


RUTAS = ["/api/tell", "/api/equipos", "/api/efecto", "/api/hallazgo", "/api/validacion",
         "/api/explicacion"]


# ---------- /health y /calidad ----------

def test_health_exacto(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_calidad(client, jugadas):
    r = client.get("/api/calidad")
    assert r.status_code == 200
    j = r.json()
    assert j["n_jugadas"] == len(jugadas) > 0
    assert isinstance(j["descartes"], dict)


# ---------- cada filtro por separado ----------

@pytest.mark.parametrize("filtro", [
    {"semana": 2}, {"mitad": "5-8"}, {"mitad": "par"}, {"down": 3}, {"down": 1}])
def test_filtro_numerico_en_efecto(client, jugadas, filtro):
    r = client.get("/api/efecto", params=filtro)
    assert r.status_code == 200
    j = r.json()
    assert j["filtros"] == filtro
    assert j["n"] == n_esperado(jugadas, **filtro)


def test_filtro_equipo_en_efecto(client, jugadas, valores):
    r = client.get("/api/efecto", params={"equipo": valores["equipo"]})
    assert r.status_code == 200
    assert r.json()["filtros"] == {"equipo": valores["equipo"]}
    assert r.json()["n"] == n_esperado(jugadas, equipo=valores["equipo"])


def test_filtro_cobertura_en_efecto(client, jugadas, valores):
    r = client.get("/api/efecto", params={"cobertura": valores["cobertura"]})
    assert r.status_code == 200
    assert r.json()["n"] == n_esperado(jugadas, cobertura=valores["cobertura"])


def test_equipo_filtra_lista_de_equipos(client, valores):
    r = client.get("/api/equipos", params={"equipo": valores["equipo"]})
    assert r.status_code == 200
    assert {f["equipo"] for f in r.json()} == {valores["equipo"]}


def test_tell_con_filtro_suma_n_menor_o_igual(client):
    total = sum(f["n"] for f in client.get("/api/tell").json())
    sub = sum(f["n"] for f in client.get("/api/tell", params={"down": 3}).json())
    assert 0 < sub <= total


def test_hallazgo_repite_filtros(client):
    r = client.get("/api/hallazgo", params={"semana": 3})
    assert r.status_code == 200
    j = r.json()
    assert j["filtros"] == {"semana": 3}
    assert j["estado"] in ("publicado", "no_concluyente")
    assert isinstance(j["frase"], str) and j["frase"]


def test_validacion_con_filtro(client, jugadas):
    r = client.get("/api/validacion", params={"down": 3})
    assert r.status_code == 200
    j = r.json()
    assert j["n"] == n_esperado(jugadas, down=3)
    assert j["filtros"] == {"down": 3}
    assert isinstance(j["se_sostiene"], bool)


# ---------- combinación de todos los filtros ----------

def test_combinacion_de_todos_los_filtros(client, jugadas, valores):
    filtros = {"semana": 2, "mitad": "1-4", "down": 3, "equipo": valores["equipo"],
               "cobertura": valores["cobertura"]}
    esperado = n_esperado(jugadas, **filtros)
    for ruta in RUTAS[:5]:
        assert client.get(ruta, params=filtros).status_code == 200, ruta
    r = client.get("/api/efecto", params=filtros)
    assert r.json()["filtros"] == filtros
    assert r.json()["n"] == esperado
    # nunca más jugadas que con un solo filtro
    assert esperado <= n_esperado(jugadas, semana=2)


def test_combinacion_mas_estricta_no_aumenta_n(client):
    n1 = client.get("/api/efecto", params={"down": 3}).json()["n"]
    n2 = client.get("/api/efecto", params={"down": 3, "mitad": "par"}).json()["n"]
    assert n2 <= n1


# ---------- filtro válido sin jugadas ----------

VACIO = {"semana": 1, "mitad": "5-8"}  # la semana 1 no está en 5-8


@pytest.mark.parametrize("ruta", ["/api/tell", "/api/equipos"])
def test_lista_vacia_da_n_cero(client, ruta):
    r = client.get(ruta, params=VACIO)
    assert r.status_code == 200
    filas = r.json()
    assert len(filas) == 1
    assert filas[0]["n"] == 0
    assert filas[0]["est"] == INSUF
    assert filas[0]["lo"] is None and filas[0]["hi"] is None


def test_efecto_vacio(client):
    r = client.get("/api/efecto", params=VACIO)
    assert r.status_code == 200
    j = r.json()
    assert j["n"] == 0
    assert j["completos"]["est"] == INSUF
    assert j["yardas"]["est"] == INSUF


def test_validacion_vacia(client):
    r = client.get("/api/validacion", params=VACIO)
    assert r.status_code == 200
    j = r.json()
    assert j["n"] == 0
    assert j["estado"] == INSUF
    assert j["se_sostiene"] is False


def test_hallazgo_vacio_no_concluyente(client):
    r = client.get("/api/hallazgo", params=VACIO)
    assert r.status_code == 200
    assert r.json()["estado"] == "no_concluyente"


# ---------- filtros inválidos: 422 sin cifras ----------

INVALIDOS = [
    {"semana": 0}, {"semana": 9}, {"semana": "abc"}, {"semana": "-1"}, {"semana": "1.5"},
    {"mitad": "9-9"}, {"down": 5}, {"down": 0}, {"down": "x"},
    {"equipo": "NO_EXISTE"}, {"cobertura": "Otra"}, {"cobertura": "man"},
]


@pytest.mark.parametrize("ruta", RUTAS)
@pytest.mark.parametrize("filtro", INVALIDOS, ids=lambda f: "-".join(f"{k}={v}" for k, v in f.items()))
def test_filtro_invalido_422(client, ruta, filtro):
    r = client.get(ruta, params=filtro)
    assert r.status_code == 422
    j = r.json()
    assert set(j) == {"detail"}  # solo el mensaje: sin n, est, lo, hi ni frase
    assert isinstance(j["detail"], str)
    assert "inválido" in j["detail"]


def test_un_filtro_invalido_con_otros_validos(client):
    r = client.get("/api/efecto", params={"down": 3, "semana": 99})
    assert r.status_code == 422
    assert "n" not in r.json()


# ---------- IA simulada ----------

def test_hallazgo_normal_si_explicacion_falla(client, monkeypatch):
    normal = client.get("/api/hallazgo", params={"down": 3}).json()

    def rota(*a, **k):
        raise RuntimeError("IA simulada caída")

    monkeypatch.setattr(ia, "explicar", rota)
    e = client.get("/api/explicacion", params={"down": 3})
    assert e.status_code == 200
    assert e.json() == {"disponible": False, "texto": None}
    h = client.get("/api/hallazgo", params={"down": 3})
    assert h.status_code == 200
    assert h.json() == normal


def test_agente_simulado_que_falla_no_rompe(client, monkeypatch):
    """Sin AWS: el agente creado perezosamente se sustituye por uno que lanza error."""
    monkeypatch.setattr(ia, "_CACHE", {})

    def agente_roto(prompt):
        raise ConnectionError("sin red simulada")

    monkeypatch.setattr(ia, "_crear_agente", lambda: agente_roto)
    e = client.get("/api/explicacion", params={"semana": 4})
    assert e.status_code == 200
    assert e.json() == {"disponible": False, "texto": None}
    assert client.get("/api/hallazgo", params={"semana": 4}).status_code == 200


def test_agente_simulado_con_texto_valido(client, monkeypatch):
    monkeypatch.setattr(ia, "_CACHE", {})
    monkeypatch.setattr(ia, "_crear_agente", lambda: (lambda prompt: "Sin cifras nuevas."))
    e = client.get("/api/explicacion", params={"semana": 5})
    assert e.status_code == 200
    assert e.json() == {"disponible": True, "texto": "Sin cifras nuevas."}
