"""Vercel-Funktion POST /api/rapport_excel: JSON-Modell rein, .xlsx raus.

Greift nicht auf die Datenbank zu, formatiert nur das empfangene Modell.
Lokal startbar mit `python api/rapport_excel.py --port 8001`.
"""

import hmac
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Vercel legt nicht garantiert den Funktionsordner in sys.path; ohne diesen
# Eintrag wäre der Import des Hilfspakets `_rapport` nicht verlässlich.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _rapport import ModellFehler, baue_arbeitsmappe  # noqa: E402

MAX_BYTES = 5 * 1024 * 1024
XLSX_TYP = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class handler(BaseHTTPRequestHandler):  # noqa: N801 – Name von Vercel vorgegeben
    def _fehler(self, status: int, meldung: str) -> None:
        # Fehlerantworten enthalten bewusst keine Teile der Eingabe.
        body = json.dumps({"fehler": meldung}).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _schluessel_ok(self) -> bool | None:
        erwartet = os.environ.get("RAPPORT_SCHLUESSEL", "")
        if not erwartet:
            return None
        erhalten = self.headers.get("x-rapport-schluessel", "")
        # compare_digest verhindert Timing-Angriffe auf den Schlüssel.
        return hmac.compare_digest(erhalten.encode("utf-8"), erwartet.encode("utf-8"))

    def do_POST(self) -> None:  # noqa: N802
        try:
            self._verarbeite()
        except Exception as e:  # noqa: BLE001
            # Letztes Netz: feste Antwort statt abgebrochener Verbindung.
            # Geloggt wird nur der Typ, damit keine Daten in die Logs gelangen.
            print(f"rapport_excel: interner Fehler {type(e).__name__}", file=sys.stderr)
            self._fehler(500, "Interner Fehler")

    def _verarbeite(self) -> None:
        ok = self._schluessel_ok()
        if ok is None:
            self._fehler(500, "Server nicht konfiguriert")
            return
        if not ok:
            self._fehler(401, "Nicht berechtigt")
            return

        roh_laenge = self.headers.get("Content-Length", "")
        # Nur ASCII-Ziffern; int() akzeptierte sonst auch "+5", " 5" oder "1_0".
        if not (roh_laenge.isascii() and roh_laenge.isdigit()):
            self._fehler(411, "Content-Length fehlt")
            return
        laenge = int(roh_laenge)
        # Grösse vor dem Lesen prüfen, damit nichts Übergrosses in den Speicher kommt.
        if laenge > MAX_BYTES:
            self._fehler(413, "Eingabe zu gross")
            return

        try:
            modell = json.loads(self.rfile.read(laenge).decode("utf-8"))
        except (ValueError, RecursionError):
            # ValueError deckt auch JSONDecodeError und UnicodeDecodeError ab.
            self._fehler(400, "Ungültiges JSON")
            return

        try:
            datei = baue_arbeitsmappe(modell)
        except ModellFehler as e:
            # Die Meldung nennt nur Feldpfade, keine Werte.
            self._fehler(400, f"Ungültiges Modell ({e})")
            return

        self.send_response(200)
        self.send_header("Content-Type", XLSX_TYP)
        self.send_header("Content-Disposition", 'attachment; filename="rapport.xlsx"')
        self.send_header("Content-Length", str(len(datei)))
        self.end_headers()
        self.wfile.write(datei)

    def _nicht_erlaubt(self) -> None:
        self._fehler(405, "Nur POST erlaubt")

    do_GET = do_PUT = do_PATCH = do_DELETE = _nicht_erlaubt  # noqa: N815


def _starte_lokal(argv: list[str]) -> None:
    port = 8001
    if "--port" in argv:
        port = int(argv[argv.index("--port") + 1])
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"Rapport-Excel lokal auf http://127.0.0.1:{port}/api/rapport_excel")
    server.serve_forever()


if __name__ == "__main__":
    _starte_lokal(sys.argv[1:])
