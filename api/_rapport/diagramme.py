"""Die 4 Diagramme der Übersicht. Ihre Daten liegen auf dem versteckten Blatt "_daten",
damit die Übersicht druckfertig bleibt und die Diagramme trotzdem echte Zellbezüge haben."""

from typing import Any

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart._chart import ChartBase
from openpyxl.chart.data_source import AxDataSource, StrRef
from openpyxl.chart.shapes import GraphicalProperties

from .modell import QUELLEN
from .stil import HELLBLAU, KORALLE, NAVY, PETROL
from .zellen import schreibe_text, schreibe_zahl

QUELLEN_TITEL = {"mail": "Mail", "website": "Website", "manuell": "Manuell"}
LEER = "Keine Daten"

# Breite und Höhe in cm; zwei Diagramme passen nebeneinander auf die quere A4-Seite.
BREITE = 12.4
HOEHE = 7.2


def _block(ws: Any, spalte: int, kopf: list[str], zeilen: list[dict[str, Any]], felder: list[str]) -> int:
    """Schreibt einen Datenblock ab Zeile 1 und gibt die letzte Datenzeile zurück."""
    for s, titel in enumerate(kopf):
        schreibe_text(ws, 1, spalte + s, titel)
    # Ohne Datenzeile hätte der Zellbezug keine Werte; ein Platzhalter hält das Diagramm gültig.
    if not zeilen:
        zeilen = [{felder[0]: LEER, **{f: 0 for f in felder[1:]}}]
    for z, eintrag in enumerate(zeilen, start=2):
        schreibe_text(ws, z, spalte, eintrag[felder[0]])
        for s, feld in enumerate(felder[1:], start=1):
            schreibe_zahl(ws, z, spalte + s, eintrag[feld])
    return len(zeilen) + 1


def _achsen_zeigen(d: ChartBase) -> None:
    # openpyxl 3.1 setzt delete=True als Vorgabe; dann fehlen in Excel die Achsen.
    d.x_axis.delete = False
    d.y_axis.delete = False


def _grundform(d: ChartBase, titel: str) -> None:
    d.title = titel
    d.legend.position = "b"
    d.width = BREITE
    d.height = HOEHE
    _achsen_zeigen(d)


def _faerbe(d: ChartBase, farben: list[str]) -> None:
    for serie, farbe in zip(d.series, farben):
        serie.graphicalProperties.solidFill = farbe
        serie.graphicalProperties.line.solidFill = farbe


def _kategorien(d: ChartBase, kategorien: Reference) -> None:
    # set_categories schreibt numRef; Textbeschriftungen erscheinen dann in
    # LibreOffice und manchen Betrachtern als 1, 2, 3. strRef ist korrekt.
    for serie in d.series:
        serie.cat = AxDataSource(strRef=StrRef(f=str(kategorien)))


def _daten_bezug(ws: Any, spalte: int, anzahl: int, letzte: int) -> tuple[Reference, Reference]:
    werte = Reference(ws, min_col=spalte + 1, max_col=spalte + anzahl, min_row=1, max_row=letzte)
    kategorien = Reference(ws, min_col=spalte, min_row=2, max_row=letzte)
    return werte, kategorien


def _anfragen(ws: Any, monate: list[dict[str, Any]]) -> BarChart:
    kopf = ["Monat", *(QUELLEN_TITEL[q] for q in QUELLEN)]
    letzte = _block(ws, 1, kopf, monate, ["label", *QUELLEN])
    d = BarChart()
    d.type = "col"
    d.grouping = "stacked"
    # Ohne overlap=100 zeichnet Excel gestapelte Säulen versetzt.
    d.overlap = 100
    werte, kategorien = _daten_bezug(ws, 1, len(QUELLEN), letzte)
    d.add_data(werte, titles_from_data=True)
    _kategorien(d, kategorien)
    _grundform(d, "Anfragen pro Monat nach Quelle")
    _faerbe(d, [PETROL, NAVY, HELLBLAU])
    return d


def _angebote(ws: Any, monate: list[dict[str, Any]]) -> BarChart:
    letzte = _block(ws, 6, ["Monat", "Angebote", "Vermittlungen"], monate, ["label", "angebote", "vermittlungen"])
    kategorien = Reference(ws, min_col=6, min_row=2, max_row=letzte)
    saeulen = BarChart()
    saeulen.type = "col"
    saeulen.add_data(Reference(ws, min_col=7, min_row=1, max_row=letzte), titles_from_data=True)
    _kategorien(saeulen, kategorien)
    _faerbe(saeulen, [PETROL])
    # Vermittlungen als Linie in Koralle: das Ergebnis soll auf einen Blick herausstechen.
    linie = LineChart()
    linie.add_data(Reference(ws, min_col=8, min_row=1, max_row=letzte), titles_from_data=True)
    _kategorien(linie, kategorien)
    serie = linie.series[0]
    serie.graphicalProperties.line.solidFill = KORALLE
    serie.graphicalProperties.line.width = 28575  # 2.25 pt in EMU
    serie.marker.symbol = "circle"
    serie.marker.graphicalProperties = GraphicalProperties(solidFill=KORALLE)
    serie.marker.graphicalProperties.line.solidFill = KORALLE
    serie.smooth = False
    saeulen += linie
    _grundform(saeulen, "Angebote und Vermittlungen pro Monat")
    return saeulen


def _horizontal(ws: Any, spalte: int, kopf: list[str], zeilen: list[dict[str, Any]],
                felder: list[str], titel: str, farbe: str) -> BarChart:
    letzte = _block(ws, spalte, kopf, zeilen, felder)
    d = BarChart()
    d.type = "bar"
    werte, kategorien = _daten_bezug(ws, spalte, 1, letzte)
    d.add_data(werte, titles_from_data=True)
    _kategorien(d, kategorien)
    # Excel zeichnet Balken sonst von unten nach oben, also in umgekehrter Reihenfolge.
    d.x_axis.scaling.orientation = "maxMin"
    # Sonst wandert die Werteachse durch die Umkehr nach oben.
    d.y_axis.crosses = "max"
    _grundform(d, titel)
    _faerbe(d, [farbe])
    return d


def baue_diagramme(wb: Workbook, diagramme: dict[str, Any]) -> list[ChartBase]:
    """Legt "_daten" an und gibt die 4 Diagramme in Anzeigereihenfolge zurück."""
    daten = wb.create_sheet("_daten")
    daten.sheet_state = "hidden"
    return [
        _anfragen(daten, diagramme["anfragenProMonat"]),
        _angebote(daten, diagramme["angeboteUndVermittlungenProMonat"]),
        _horizontal(daten, 10, ["Ergebnis", "Treffer"], diagramme["trefferNachErgebnis"],
                    ["ergebnis", "anzahl"], "Treffer nach Ergebnis", PETROL),
        _horizontal(daten, 13, ["Nutzung", "Anfragen"], diagramme["nutzungen"],
                    ["label", "anzahl"], "Gesuchte Nutzungen", NAVY),
    ]
