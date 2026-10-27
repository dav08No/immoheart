"""Tests für die strenge Modellprüfung (Vertrag R2)."""

from datetime import date
from typing import Any

import pytest

from _rapport import ModellFehler, pruefe_modell
from conftest import KI_TEXT, leeres_modell, modell


def _fehler(m: Any) -> str:
    with pytest.raises(ModellFehler) as e:
        pruefe_modell(m)
    return str(e.value)


def test_fixture_ist_gueltig_und_wird_umgeformt() -> None:
    sauber = pruefe_modell(modell())
    assert sauber["zeitraum"]["von"] == date(2025, 10, 27)
    treffer = sauber["tabellen"]["treffer"]
    assert treffer["zeilen"][0][4] == date(2025, 7, 1)  # Spalte "erstellt"
    assert sauber["zusammenfassung"] is None


@pytest.mark.parametrize("z", [None, KI_TEXT, {"fehler": "Tageslimit erreicht"}])
def test_zusammenfassung_varianten_gueltig(z: Any) -> None:
    m = modell()
    m["zusammenfassung"] = z
    assert pruefe_modell(m)["zusammenfassung"] == z


def test_leeres_modell_gueltig() -> None:
    assert pruefe_modell(leeres_modell())["tabellen"]["treffer"]["zeilen"] == []


def test_unbekannter_schluessel() -> None:
    m = modell()
    m["kennzahlen"][0]["email"] = "a@b.ch"
    meldung = _fehler(m)
    assert meldung.startswith("kennzahlen[0]") and "a@b.ch" not in meldung


def test_unbekannte_spalte_in_zeile() -> None:
    m = modell()
    m["tabellen"]["anfragen"]["zeilen"][0]["kontakt"] = "x"
    assert _fehler(m).startswith("tabellen.anfragen.zeilen[0]")


def test_fehlender_pflichtschluessel() -> None:
    m = modell()
    del m["medianwerte"]
    assert _fehler(m).startswith("modell")


@pytest.mark.parametrize(
    ("aendern", "pfad"),
    [
        (lambda m: m["kennzahlen"][0].update(wert="3"), "kennzahlen[0].wert"),
        (lambda m: m["kennzahlen"][0].update(format="euro"), "kennzahlen[0].format"),
        (lambda m: m["medianwerte"].update(tageBisAbschluss=True), "medianwerte.tageBisAbschluss"),
        (lambda m: m["tabellen"]["treffer"]["zeilen"][0].update(score="hoch"), "tabellen.treffer.zeilen[0].score"),
        (lambda m: m["tabellen"]["treffer"]["zeilen"][0].update(firma=7), "tabellen.treffer.zeilen[0].firma"),
        (lambda m: m["tabellen"]["treffer"]["spalten"][0].update(typ="formel"), "tabellen.treffer.spalten[0].typ"),
        (lambda m: m["hinweise"].append(3), "hinweise[13]"),
        (lambda m: m.update(zusammenfassung={"text": "frei"}), "zusammenfassung.text"),
        (lambda m: m.update(zusammenfassung={"fehler": "x", "text": {}}), "zusammenfassung"),
    ],
)
def test_falscher_typ(aendern: Any, pfad: str) -> None:
    m = modell()
    aendern(m)
    assert _fehler(m).startswith(pfad)


@pytest.mark.parametrize(
    ("aendern", "pfad"),
    [
        (lambda m: m["tabellen"]["objekte"]["zeilen"][0].update(titel="x" * 501), "tabellen.objekte.zeilen[0].titel"),
        (lambda m: m.update(zusammenfassung={"text": {**KI_TEXT["text"], "trends": "x" * 1501}}),
         "zusammenfassung.text.trends"),
        (lambda m: m["hinweise"].extend(["x"] * 50), "hinweise"),
        (lambda m: m["tabellen"]["treffer"].update(zeilen=[{}] * 20001), "tabellen.treffer.zeilen"),
        (lambda m: m["tabellen"]["treffer"].update(
            spalten=[{"schluessel": f"s{i}", "titel": f"S{i}", "typ": "text"} for i in range(21)]),
         "tabellen.treffer.spalten"),
    ],
)
def test_zu_lang_oder_zu_viele(aendern: Any, pfad: str) -> None:
    m = modell()
    aendern(m)
    assert _fehler(m).startswith(pfad)


@pytest.mark.parametrize("wert", ["a\x00b", "a\x1bb", "a\x7fb"])
def test_steuerzeichen(wert: str) -> None:
    m = modell()
    m["tabellen"]["angebote"]["zeilen"][0]["firma"] = wert
    assert _fehler(m).startswith("tabellen.angebote.zeilen[0].firma")


def test_zeilenumbruch_im_spaltentitel() -> None:
    m = modell()
    m["tabellen"]["angebote"]["spalten"][1]["titel"] = "Fir\nma"
    assert _fehler(m).startswith("tabellen.angebote.spalten[1].titel")


def test_zeilenumbruch_im_ki_text_erlaubt() -> None:
    m = modell()
    m["zusammenfassung"] = {"text": {**KI_TEXT["text"], "trends": "Absatz 1\n\nAbsatz 2"}}
    pruefe_modell(m)


@pytest.mark.parametrize("wert", ["27.10.2026", "2026-13-01", "2026-02-30", "2026-1-5", "20261027", 20261027])
def test_falsches_datum(wert: Any) -> None:
    m = modell()
    m["tabellen"]["vermittlungen"]["zeilen"][0]["datum"] = wert
    assert _fehler(m).startswith("tabellen.vermittlungen.zeilen[0].datum")


@pytest.mark.parametrize("wert", [float("nan"), float("inf"), 1e13])
def test_zahl_ausserhalb(wert: float) -> None:
    m = modell()
    m["tabellen"]["objekte"]["zeilen"][0]["flaeche"] = wert
    assert _fehler(m).startswith("tabellen.objekte.zeilen[0].flaeche")


def test_doppelte_spaltentitel() -> None:
    m = modell()
    m["tabellen"]["angebote"]["spalten"][2]["titel"] = "firma"
    assert _fehler(m).startswith("tabellen.angebote.spalten[2].titel")


def test_doppelte_kachel() -> None:
    m = modell()
    m["kennzahlen"][1]["schluessel"] = m["kennzahlen"][0]["schluessel"]
    assert _fehler(m).startswith("kennzahlen[1].schluessel")
