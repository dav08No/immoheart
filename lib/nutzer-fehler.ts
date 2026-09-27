// Erwartete, für die Nutzerin verständliche Fehler (Validierung, Business-Regeln wie
// "Entwurf wird gerade gesendet"). Server Actions fangen NutzerFehler gezielt ab und geben
// ihn als { fehler } zurück statt einer geworfenen Exception (Task N3-Review, Fund 3) --
// so landet kein technischer Stacktrace/Digest-Text im UI. Unerwartete Fehler (DB-Fehler,
// Programmierfehler) bleiben normale Error-Objekte und werfen weiterhin durch.
export class NutzerFehler extends Error {}
