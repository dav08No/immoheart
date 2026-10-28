"""Blätter "Zusammenfassung" (KI-Text und Medianwerte) und "Hinweise" (Definitionen)."""

import math
from typing import Any

from . import stil
from .modell import KI_ABSCHNITTE
from .zellen import schreibe_text, schreibe_zahl

TEXT_BREITE = 110  # Zeichen; eine breite Spalte A trägt den Fliesstext
ZEILEN_HOEHE = 15.0

KI_HINWEIS = "Von KI verfasst auf Basis der Kennzahlen – bitte prüfen."
NICHT_ERSTELLT = "KI-Zusammenfassung nicht erstellt."
UEBERSCHRIFTEN = {
    "rueckblick": "Jahresrückblick",
    "trends": "Trends",
    "auffaelligkeiten": "Auffälligkeiten",
    "ausblick": "Ausblick",
}
MEDIANE = (
    ("tageBisErstangebot", "Tage bis Erstangebot (Median)"),
    ("tageBisAbschluss", "Tage bis Abschluss (Median)"),
)


def _hoehe(text: str) -> float:
    # Excel passt die Zeilenhöhe beim Öffnen nicht verlässlich an; grob vorrechnen.
    zeilen = sum(max(1, math.ceil(len(absatz) / (TEXT_BREITE * 1.1))) for absatz in text.split("\n"))
    return min(409.0, zeilen * ZEILEN_HOEHE + 4)


def _absatz(ws: Any, zeile: int, text: str, **schrift: Any) -> None:
    zelle = schreibe_text(ws, zeile, 1, text)
    zelle.font = stil.schrift(**schrift)
    zelle.alignment = stil.LINKS_OBEN_UMBRUCH
    ws.row_dimensions[zeile].height = _hoehe(text)


def _ueberschrift(ws: Any, zeile: int, text: str) -> None:
    schreibe_text(ws, zeile, 1, text).font = stil.schrift(13, fett=True, farbe=stil.PETROL)
    ws.row_dimensions[zeile].height = 22


def _ki_teil(ws: Any, zeile: int, zusammenfassung: dict[str, Any] | None) -> int:
    if zusammenfassung is None:
        _absatz(ws, zeile, NICHT_ERSTELLT, kursiv=True, farbe=stil.TINTE_2)
        return zeile + 2
    if "fehler" in zusammenfassung:
        # Ein KI-Fehler bricht den Rapport nicht ab, er wird nur vermerkt.
        meldung = f"KI-Zusammenfassung nicht verfügbar ({zusammenfassung['fehler']})."
        _absatz(ws, zeile, meldung, kursiv=True, farbe=stil.TINTE_2)
        return zeile + 2
    _absatz(ws, zeile, KI_HINWEIS, kursiv=True, farbe=stil.KORALLE)
    zeile += 2
    for abschnitt in KI_ABSCHNITTE:
        _ueberschrift(ws, zeile, UEBERSCHRIFTEN[abschnitt])
        _absatz(ws, zeile + 1, zusammenfassung["text"][abschnitt])
        zeile += 3
    return zeile


def baue_zusammenfassung(wb: Any, modell: dict[str, Any]) -> Any:
    ws = wb.create_sheet("Zusammenfassung")
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = TEXT_BREITE
    ws.column_dimensions["B"].width = 12

    titel = f"Zusammenfassung · {modell['zeitraum']['label']}"
    schreibe_text(ws, 1, 1, titel).font = stil.schrift(18, fett=True, farbe=stil.NAVY)
    ws.row_dimensions[1].height = 30
    zeile = _ki_teil(ws, 3, modell["zusammenfassung"])

    _ueberschrift(ws, zeile, "Medianwerte")
    for i, (feld, beschriftung) in enumerate(MEDIANE, start=1):
        schreibe_text(ws, zeile + i, 1, beschriftung).font = stil.schrift()
        wert = modell["medianwerte"][feld]
        if wert is None:
            zelle = schreibe_text(ws, zeile + i, 2, "–")
        else:
            zelle = schreibe_zahl(ws, zeile + i, 2, wert)
            zelle.number_format = stil.FORMAT_TAGE
        zelle.font = stil.schrift(fett=True, farbe=stil.NAVY)

    stil.seite_quer(ws, eine_seite_hoch=False)
    return ws


def baue_hinweise(wb: Any, hinweise: list[str]) -> Any:
    ws = wb.create_sheet("Hinweise")
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = TEXT_BREITE
    schreibe_text(ws, 1, 1, "Hinweise und Definitionen").font = stil.schrift(18, fett=True, farbe=stil.NAVY)
    ws.row_dimensions[1].height = 30
    for i, hinweis in enumerate(hinweise, start=3):
        _absatz(ws, i, f"• {hinweis}")
    stil.seite_quer(ws, eine_seite_hoch=False)
    return ws
