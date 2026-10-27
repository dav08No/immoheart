"""Einfache Prüfbausteine für das Modell. Meldungen nennen nur Feldpfade, nie Werte."""

import math
import re
from datetime import date
from typing import Any

# Steuerzeichen sind in XLSX unzulässig (openpyxl wirft IllegalCharacterError).
STEUERZEICHEN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
# Einzeilige Texte (Titel, Beschriftungen) dürfen auch keine Umbrüche enthalten,
# sonst bricht z. B. der Spaltenname einer Excel-Tabelle.
ZEILENUMBRUCH = re.compile(r"[\t\n\r]")
# Excel kennt keine Datumswerte vor 1900; ältere Jahre wären Eingabefehler.
ISO_DATUM = re.compile(r"^(19|[2-9]\d)\d{2}-\d{2}-\d{2}$")
# Grösser braucht kein Rapport; schützt vor Überlauf und absurden Werten.
MAX_BETRAG = 1e12


class ModellFehler(ValueError):
    """Ungültiges Modell. Die Meldung nennt nur Feldpfade, nie Werte."""


def schluessel(obj: dict[str, Any], pflicht: set[str], pfad: str, optional: frozenset[str] = frozenset()) -> None:
    # Nur erwartete Felder, damit keine fremden Daten (z. B. E-Mails) mitreisen.
    vorhanden = set(obj.keys())
    if not pflicht <= vorhanden or not vorhanden <= pflicht | optional:
        raise ModellFehler(f"{pfad}: unerwartete oder fehlende Felder")


def objekt(wert: Any, pfad: str) -> dict[str, Any]:
    if not isinstance(wert, dict):
        raise ModellFehler(f"{pfad}: Objekt erwartet")
    return wert


def liste(wert: Any, pfad: str, max_laenge: int) -> list[Any]:
    if not isinstance(wert, list):
        raise ModellFehler(f"{pfad}: Liste erwartet")
    if len(wert) > max_laenge:
        raise ModellFehler(f"{pfad}: zu viele Einträge")
    return wert


def text(wert: Any, pfad: str, max_laenge: int, einzeilig: bool = False) -> str:
    if not isinstance(wert, str):
        raise ModellFehler(f"{pfad}: Text erwartet")
    if len(wert) > max_laenge:
        raise ModellFehler(f"{pfad}: Text zu lang")
    if STEUERZEICHEN.search(wert) or (einzeilig and ZEILENUMBRUCH.search(wert)):
        raise ModellFehler(f"{pfad}: unzulässige Steuerzeichen")
    return wert


def anzahl(wert: Any, pfad: str) -> int:
    # bool ist in Python ein int, deshalb ausdrücklich ausschliessen.
    if isinstance(wert, bool) or not isinstance(wert, int) or not 0 <= wert <= MAX_BETRAG:
        raise ModellFehler(f"{pfad}: nicht-negative Ganzzahl erwartet")
    return wert


def zahl(wert: Any, pfad: str) -> int | float:
    # NaN/Infinity liefert json.loads zwar, Excel kann sie aber nicht speichern.
    if isinstance(wert, bool) or not isinstance(wert, (int, float)):
        raise ModellFehler(f"{pfad}: Zahl erwartet")
    if not math.isfinite(wert) or abs(wert) > MAX_BETRAG:
        raise ModellFehler(f"{pfad}: Zahl ausserhalb des Bereichs")
    return wert


def zahl_oder_null(wert: Any, pfad: str) -> int | float | None:
    return None if wert is None else zahl(wert, pfad)


def datum(wert: Any, pfad: str) -> date:
    # Regex zuerst: fromisoformat akzeptiert seit 3.11 auch andere Schreibweisen.
    if not isinstance(wert, str) or not ISO_DATUM.match(wert):
        raise ModellFehler(f"{pfad}: Datum yyyy-mm-dd erwartet")
    try:
        return date.fromisoformat(wert)
    except ValueError:
        raise ModellFehler(f"{pfad}: Datum yyyy-mm-dd erwartet") from None
