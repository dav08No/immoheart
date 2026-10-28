"""Baut die Excel-Arbeitsmappe aus dem geprüften Modell."""

from datetime import date, datetime, timezone
from io import BytesIO
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from openpyxl import Workbook

from .diagramme import baue_diagramme
from .modell import TABELLEN, pruefe_modell
from .tabellen import baue_tabellenblatt
from .uebersicht import baue_uebersicht
from .zusammenfassung import baue_hinweise, baue_zusammenfassung


def _heute_zuerich() -> date:
    # Der Rapport nennt Schweizer Tage; fehlen die Zeitzonendaten, ist UTC nah genug.
    try:
        return datetime.now(ZoneInfo("Europe/Zurich")).date()
    except ZoneInfoNotFoundError:
        return datetime.now(timezone.utc).date()


def baue_arbeitsmappe(modell: dict[str, Any], heute: date | None = None) -> bytes:
    """Reine Funktion: Modell rein, .xlsx-Bytes raus. Prüft selbst nochmals."""
    sauber = pruefe_modell(modell)

    wb = Workbook()
    wb.properties.creator = "immoheart"
    wb.properties.title = f"immoheart Jahresrapport {sauber['zeitraum']['label']}"
    uebersicht = wb.active
    # Reihenfolge der Blätter = Reihenfolge des Anlegens; "_daten" kommt zuletzt.
    baue_zusammenfassung(wb, sauber)
    for name in TABELLEN:
        baue_tabellenblatt(wb, name, sauber["tabellen"][name])
    baue_hinweise(wb, sauber["hinweise"])
    diagramme = baue_diagramme(wb, sauber["diagramme"])
    baue_uebersicht(uebersicht, sauber, diagramme, heute or _heute_zuerich())
    wb.active = 0

    puffer = BytesIO()
    wb.save(puffer)
    return puffer.getvalue()
