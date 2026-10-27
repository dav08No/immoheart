"""Sicheres Schreiben von Zellen: verhindert Formel-Injection."""

from typing import Any

from openpyxl.cell.cell import Cell

# Excel und andere Tabellenprogramme deuten Text mit diesen Anfängen
# als Formel (auch beim Weiterkopieren), deshalb Quote-Präfix setzen.
FORMEL_ANFAENGE = ("=", "+", "-", "@", "\t", "\r")


def schreibe_text(ws: Any, zeile: int, spalte: int, wert: str) -> Cell:
    """Schreibt Text immer als Text. openpyxl würde '=…' sonst als Formel speichern."""
    zelle = ws.cell(row=zeile, column=spalte)
    zelle.value = wert
    zelle.data_type = "s"
    if wert.startswith(FORMEL_ANFAENGE):
        zelle.quotePrefix = True
    return zelle


def schreibe_zahl(ws: Any, zeile: int, spalte: int, wert: int | float) -> Cell:
    """Zahlen getrennt halten, damit nur geprüfte Zahlen als Zahl landen."""
    zelle = ws.cell(row=zeile, column=spalte)
    zelle.value = wert
    return zelle
