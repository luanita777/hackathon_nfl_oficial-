"""Auxiliares de pruebas: leen filas reales de data/ (solo lectura) con nrows."""
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


def leer_real(nombre: str, nrows: int = 1000, **kwargs) -> pd.DataFrame:
    """Lee las primeras `nrows` filas reales de data/<nombre> (1 <= nrows <= 5000)."""
    if not 1 <= nrows <= 5000:
        raise ValueError("nrows debe estar entre 1 y 5000")
    return pd.read_csv(DATA_DIR / nombre, nrows=nrows, **kwargs)
