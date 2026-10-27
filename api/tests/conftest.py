"""Gemeinsame Helfer: das von lib/rapport/modell.test.ts erzeugte Fixture ist die Quelle der Wahrheit."""

import copy
import json
import os
import sys
from io import BytesIO
from typing import Any

from openpyxl import load_workbook
from openpyxl.workbook.workbook import Workbook

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from _rapport import baue_arbeitsmappe  # noqa: E402

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "modell.json")

with open(FIXTURE, encoding="utf-8") as datei:
    _MODELL: dict[str, Any] = json.load(datei)

KI_TEXT = {
    "text": {
        "rueckblick": "Im Zeitraum kamen 3 neue Anfragen herein.",
        "trends": "Die Nachfrage nach Büros steigt leicht.",
        "auffaelligkeiten": "Eine Vermittlung im Januar.",
        "ausblick": "Mehr Lagerflächen erfassen.",
    }
}


def modell() -> dict[str, Any]:
    """Frische Kopie des Fixtures, damit Tests es gefahrlos verändern können."""
    return copy.deepcopy(_MODELL)


def leeres_modell() -> dict[str, Any]:
    m = modell()
    m["kennzahlen"] = []
    m["medianwerte"] = {"tageBisErstangebot": None, "tageBisAbschluss": None}
    m["diagramme"] = {k: [] for k in m["diagramme"]}
    for t in m["tabellen"].values():
        t["zeilen"] = []
    m["hinweise"] = []
    return m


def mappe(m: dict[str, Any]) -> Workbook:
    return load_workbook(BytesIO(baue_arbeitsmappe(m)))
