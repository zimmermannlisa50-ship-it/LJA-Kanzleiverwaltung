# Ticketnamen und Schließen

Für Notfall / Strafverteidigung und Klage gegen Staat / Amtshaftung lautet der Kanalname beispielsweise `🔴-0002-lisa-kessingtan`. Die beiden Ticketarten nutzen einen gemeinsamen, lokal gespeicherten Zähler `legal`; er setzt oberhalb bestehender Nummern und der bisherigen Kategorie-Zähler fort. Bestehende Ticketnummern bleiben erhalten. Andere Kategorien behalten ihre bisherige Nummerierung und Benennung.

Status: 🔴 offen, 🟡 übernommen, 🟠 wartet auf Rückmeldung, 🟢 erledigt, ⚫ geschlossen. „Warten“ ist nun ein eigener Status; Übernehmen oder Freigeben beendet ihn. Umbenennungen laufen im Hintergrund, damit Discords Begrenzung für Kanalnamen die Interaktionsantwort nicht blockiert. Bei schnellen Wechseln wird der neueste gewünschte Name übernommen.

Schließen: „Ticket schließen“ → private Rückfrage → „JA, TICKET SCHLIESSEN“ oder „ABBRECHEN“. Eine Bestätigung ist fünf Minuten gültig, an Person und Kanal gebunden und wird bei Ausführung erneut auf Berechtigung geprüft. Bestätigungen überstehen keinen Prozessneustart; dann erneut „Ticket schließen“ drücken. Es dürfen der Ersteller, der zugewiesene Bearbeiter und die Kanzleileitung schließen.

Nach Bestätigung werden die Schreibrechte des Mandanten entzogen, das HTML-Transkript erstellt und im Transkriptkanal 1484218994608312553 hochgeladen. Im Ticket erhält die schließende Person eine Bestätigung mit Archivlink. Erst nach erfolgreichem Upload wird der Abschluss gespeichert. Scheitert die Transkripterstellung oder der Upload, werden die bisherigen Schreibrechte wiederhergestellt und das Ticket bleibt offen. Der Kanal wird beibehalten. Das HTML enthält alle abrufbaren Nachrichten, Embed-Felder, Anhanglinks, Ticketdaten und Bearbeitungsschritte. Anhanglinks sind keine lokalen Dateikopien und können Discord-seitig ablaufen.

Die HTML-Dateien werden unter `data/ticket-logs/` gespeichert, mit Ticketnummer und Kanal-ID im Namen. Lokale Betriebsdaten werden nicht auf GitHub übertragen.

Gezielte Aktualisierung bestehender, lokal gespeicherter Tickets: `node update-ticket-ui.js`. Dieser Vorgang aktualisiert die Ticket-Bedienfelder und die beiden gewünschten Kanalnamen; er schließt keine Tickets.

Prüfungen: `node ticket-workflow.test.js`, `node ticket-close.test.js`, `node ticket-transcript.test.js`.

