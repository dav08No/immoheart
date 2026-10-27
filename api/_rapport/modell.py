"""Prüfung des eingehenden JSON-Modells (Spike-Umfang, Ruling R1)."""

import re
from typing import Any

# Obergrenzen schützen vor übergrossen Eingaben innerhalb der 5 MB.
MAX_LABEL = 200
MAX_MONATE = 24
QUELLEN = ("mail", "website", "manuell")
# Steuerzeichen sind in XLSX unzulässig (openpyxl wirft IllegalCharacterError).
STEUERZEICHEN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


class ModellFehler(ValueError):
    """Ungültiges Modell. Die Meldung nennt nur Feldpfade, nie Werte."""


def _pruefe_schluessel(obj: dict[str, Any], erlaubt: set[str], pfad: str) -> None:
    # Nur erwartete Felder, damit keine fremden Daten mitreisen.
    if set(obj.keys()) != erlaubt:
        raise ModellFehler(f"{pfad}: unerwartete oder fehlende Felder")


def _dict(wert: Any, pfad: str) -> dict[str, Any]:
    if not isinstance(wert, dict):
        raise ModellFehler(f"{pfad}: Objekt erwartet")
    return wert


def _text(wert: Any, pfad: str) -> str:
    if not isinstance(wert, str) or len(wert) > MAX_LABEL:
        raise ModellFehler(f"{pfad}: Text erwartet")
    if STEUERZEICHEN.search(wert):
        raise ModellFehler(f"{pfad}: unzulässige Steuerzeichen")
    return wert


def _anzahl(wert: Any, pfad: str) -> int:
    # bool ist in Python ein int, deshalb ausdrücklich ausschliessen.
    if isinstance(wert, bool) or not isinstance(wert, int) or wert < 0:
        raise ModellFehler(f"{pfad}: nicht-negative Ganzzahl erwartet")
    return wert


def pruefe_modell(roh: Any) -> dict[str, Any]:
    """Prüft das Modell und gibt eine bereinigte Kopie zurück."""
    modell = _dict(roh, "modell")
    _pruefe_schluessel(modell, {"zeitraum", "diagramme"}, "modell")

    zeitraum = _dict(modell["zeitraum"], "zeitraum")
    _pruefe_schluessel(zeitraum, {"label"}, "zeitraum")
    label = _text(zeitraum["label"], "zeitraum.label")

    diagramme = _dict(modell["diagramme"], "diagramme")
    _pruefe_schluessel(diagramme, {"anfragenProMonat"}, "diagramme")
    monate_roh = diagramme["anfragenProMonat"]
    if not isinstance(monate_roh, list) or len(monate_roh) > MAX_MONATE:
        raise ModellFehler("diagramme.anfragenProMonat: Liste erwartet")

    monate: list[dict[str, Any]] = []
    for i, eintrag in enumerate(monate_roh):
        pfad = f"diagramme.anfragenProMonat[{i}]"
        e = _dict(eintrag, pfad)
        _pruefe_schluessel(e, {"label", *QUELLEN}, pfad)
        monat: dict[str, Any] = {"label": _text(e["label"], f"{pfad}.label")}
        for q in QUELLEN:
            monat[q] = _anzahl(e[q], f"{pfad}.{q}")
        monate.append(monat)

    return {
        "zeitraum": {"label": label},
        "diagramme": {"anfragenProMonat": monate},
    }
