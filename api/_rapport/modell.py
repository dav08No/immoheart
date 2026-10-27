"""Prüfung des eingehenden JSON-Modells (Vertrag R2, lib/rapport/typen.ts).

Gibt eine bereinigte Kopie zurück: Datumswerte als date, Tabellenzeilen als
Listen in Spaltenreihenfolge, damit das Schreiben keine Schlüssel mehr sucht.
"""

import re
from typing import Any

from . import pruefung as p
from .pruefung import ModellFehler

MAX_ZELLE = 500
MAX_KI_ABSCHNITT = 1500
MAX_TITEL = 100
MAX_ZEILEN = 20000
MAX_SPALTEN = 20
MAX_MONATE = 24
MAX_KATEGORIEN = 50
MAX_HINWEISE = 50

QUELLEN = ("mail", "website", "manuell")
KACHELN = {"neueAnfragen", "neueObjekte", "treffer", "angebote", "vermittlungen", "vermittlungsquote"}
TABELLEN = ("vermittlungen", "angebote", "treffer", "anfragen", "objekte")
SPALTEN_TYPEN = {"text", "zahl", "datum", "chf"}
KI_ABSCHNITTE = ("rueckblick", "trends", "auffaelligkeiten", "ausblick")
SPALTEN_SCHLUESSEL = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,63}$")

__all__ = ["ModellFehler", "QUELLEN", "TABELLEN", "KI_ABSCHNITTE", "pruefe_modell"]


def _zeitraum(roh: Any) -> dict[str, Any]:
    z = p.objekt(roh, "zeitraum")
    p.schluessel(z, {"label", "von", "bis"}, "zeitraum")
    return {
        "label": p.text(z["label"], "zeitraum.label", MAX_TITEL, einzeilig=True),
        "von": p.datum(z["von"], "zeitraum.von"),
        "bis": p.datum(z["bis"], "zeitraum.bis"),
    }


def _kennzahlen(roh: Any) -> list[dict[str, Any]]:
    kacheln: list[dict[str, Any]] = []
    gesehen: set[str] = set()
    for i, eintrag in enumerate(p.liste(roh, "kennzahlen", len(KACHELN))):
        pfad = f"kennzahlen[{i}]"
        k = p.objekt(eintrag, pfad)
        p.schluessel(k, {"schluessel", "titel", "format", "wert", "text"}, pfad)
        if k["schluessel"] not in KACHELN or k["schluessel"] in gesehen:
            raise ModellFehler(f"{pfad}.schluessel: unbekannt oder doppelt")
        gesehen.add(k["schluessel"])
        if k["format"] not in ("zahl", "prozent"):
            raise ModellFehler(f"{pfad}.format: unbekannt")
        kacheln.append({
            "schluessel": k["schluessel"],
            "titel": p.text(k["titel"], f"{pfad}.titel", MAX_TITEL, einzeilig=True),
            "format": k["format"],
            "wert": p.zahl_oder_null(k["wert"], f"{pfad}.wert"),
            "text": p.text(k["text"], f"{pfad}.text", MAX_ZELLE),
        })
    return kacheln


def _medianwerte(roh: Any) -> dict[str, Any]:
    m = p.objekt(roh, "medianwerte")
    felder = {"tageBisErstangebot", "tageBisAbschluss"}
    p.schluessel(m, felder, "medianwerte")
    return {f: p.zahl_oder_null(m[f], f"medianwerte.{f}") for f in felder}


def _reihe(roh: Any, pfad: str, max_laenge: int, label: str, zahlen: tuple[str, ...]) -> list[dict[str, Any]]:
    # Gemeinsame Form aller Diagrammreihen: eine Beschriftung plus Zählwerte.
    zeilen: list[dict[str, Any]] = []
    for i, eintrag in enumerate(p.liste(roh, pfad, max_laenge)):
        zp = f"{pfad}[{i}]"
        e = p.objekt(eintrag, zp)
        p.schluessel(e, {label, *zahlen}, zp)
        zeile: dict[str, Any] = {label: p.text(e[label], f"{zp}.{label}", MAX_TITEL, einzeilig=True)}
        for f in zahlen:
            zeile[f] = p.anzahl(e[f], f"{zp}.{f}")
        zeilen.append(zeile)
    return zeilen


def _diagramme(roh: Any) -> dict[str, Any]:
    d = p.objekt(roh, "diagramme")
    pfad = "diagramme"
    p.schluessel(d, {"anfragenProMonat", "angeboteUndVermittlungenProMonat", "trefferNachErgebnis", "nutzungen"}, pfad)
    return {
        "anfragenProMonat": _reihe(d["anfragenProMonat"], f"{pfad}.anfragenProMonat", MAX_MONATE, "label", QUELLEN),
        "angeboteUndVermittlungenProMonat": _reihe(
            d["angeboteUndVermittlungenProMonat"], f"{pfad}.angeboteUndVermittlungenProMonat",
            MAX_MONATE, "label", ("angebote", "vermittlungen"),
        ),
        "trefferNachErgebnis": _reihe(
            d["trefferNachErgebnis"], f"{pfad}.trefferNachErgebnis", MAX_KATEGORIEN, "ergebnis", ("anzahl",)
        ),
        "nutzungen": _reihe(d["nutzungen"], f"{pfad}.nutzungen", MAX_KATEGORIEN, "label", ("anzahl",)),
    }


def _spalten(roh: Any, pfad: str) -> list[dict[str, str]]:
    spalten: list[dict[str, str]] = []
    namen: set[str] = set()
    titel: set[str] = set()
    for i, eintrag in enumerate(p.liste(roh, pfad, MAX_SPALTEN)):
        sp = f"{pfad}[{i}]"
        s = p.objekt(eintrag, sp)
        p.schluessel(s, {"schluessel", "titel", "typ"}, sp)
        name = s["schluessel"]
        if not isinstance(name, str) or not SPALTEN_SCHLUESSEL.match(name) or name in namen:
            raise ModellFehler(f"{sp}.schluessel: ungültig oder doppelt")
        t = p.text(s["titel"], f"{sp}.titel", MAX_TITEL, einzeilig=True)
        # Excel-Tabellen verlangen eindeutige, nicht leere Spaltennamen (ohne Gross/Klein).
        if not t.strip() or t.casefold() in titel:
            raise ModellFehler(f"{sp}.titel: leer oder doppelt")
        if s["typ"] not in SPALTEN_TYPEN:
            raise ModellFehler(f"{sp}.typ: unbekannt")
        namen.add(name)
        titel.add(t.casefold())
        spalten.append({"schluessel": name, "titel": t, "typ": s["typ"]})
    if not spalten:
        raise ModellFehler(f"{pfad}: mindestens eine Spalte erwartet")
    return spalten


def _zelle(wert: Any, typ: str, pfad: str) -> Any:
    if wert is None:
        return None
    if typ == "text":
        return p.text(wert, pfad, MAX_ZELLE)
    if typ == "datum":
        return p.datum(wert, pfad)
    return p.zahl(wert, pfad)


def _tabelle(roh: Any, pfad: str) -> dict[str, Any]:
    t = p.objekt(roh, pfad)
    p.schluessel(t, {"titel", "spalten", "zeilen"}, pfad)
    spalten = _spalten(t["spalten"], f"{pfad}.spalten")
    erwartet = {s["schluessel"] for s in spalten}
    zeilen: list[list[Any]] = []
    for i, eintrag in enumerate(p.liste(t["zeilen"], f"{pfad}.zeilen", MAX_ZEILEN)):
        zp = f"{pfad}.zeilen[{i}]"
        z = p.objekt(eintrag, zp)
        p.schluessel(z, erwartet, zp)
        zeilen.append([_zelle(z[s["schluessel"]], s["typ"], f"{zp}.{s['schluessel']}") for s in spalten])
    return {
        "titel": p.text(t["titel"], f"{pfad}.titel", MAX_TITEL, einzeilig=True),
        "spalten": spalten,
        "zeilen": zeilen,
    }


def _zusammenfassung(roh: Any) -> dict[str, Any] | None:
    if roh is None:
        return None
    z = p.objekt(roh, "zusammenfassung")
    if set(z.keys()) == {"fehler"}:
        return {"fehler": p.text(z["fehler"], "zusammenfassung.fehler", MAX_ZELLE)}
    p.schluessel(z, {"text"}, "zusammenfassung")
    texte = p.objekt(z["text"], "zusammenfassung.text")
    p.schluessel(texte, set(KI_ABSCHNITTE), "zusammenfassung.text")
    return {"text": {a: p.text(texte[a], f"zusammenfassung.text.{a}", MAX_KI_ABSCHNITT) for a in KI_ABSCHNITTE}}


def pruefe_modell(roh: Any) -> dict[str, Any]:
    """Prüft das Modell streng und gibt eine bereinigte Kopie zurück."""
    modell = p.objekt(roh, "modell")
    pflicht = {"zeitraum", "kennzahlen", "medianwerte", "diagramme", "tabellen", "hinweise"}
    p.schluessel(modell, pflicht, "modell", optional=frozenset({"zusammenfassung"}))

    tabellen = p.objekt(modell["tabellen"], "tabellen")
    p.schluessel(tabellen, set(TABELLEN), "tabellen")
    hinweise = p.liste(modell["hinweise"], "hinweise", MAX_HINWEISE)

    return {
        "zeitraum": _zeitraum(modell["zeitraum"]),
        "kennzahlen": _kennzahlen(modell["kennzahlen"]),
        "medianwerte": _medianwerte(modell["medianwerte"]),
        "diagramme": _diagramme(modell["diagramme"]),
        "tabellen": {n: _tabelle(tabellen[n], f"tabellen.{n}") for n in TABELLEN},
        "hinweise": [p.text(h, f"hinweise[{i}]", MAX_ZELLE) for i, h in enumerate(hinweise)],
        "zusammenfassung": _zusammenfassung(modell.get("zusammenfassung")),
    }
