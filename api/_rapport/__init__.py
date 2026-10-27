# Hilfspaket der Rapport-Funktion. Der führende Unterstrich verhindert,
# dass Vercel die Dateien hier als eigene Funktionen deployt.
from .arbeitsmappe import baue_arbeitsmappe
from .modell import ModellFehler, pruefe_modell
from .zellen import schreibe_text, schreibe_zahl

__all__ = ["ModellFehler", "baue_arbeitsmappe", "pruefe_modell", "schreibe_text", "schreibe_zahl"]
