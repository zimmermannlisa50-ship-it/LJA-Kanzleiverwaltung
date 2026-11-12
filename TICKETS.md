# Ticketnamen und Schließen

Für Notfall / Strafverteidigung und Klage gegen Staat / Amtshaftung lautet der Kanalname beispielsweise `🔴-0002-lisa-kessingtan`. Jede Ticketkategorie hat einen eigenen lokal gespeicherten Zähler. Dieser setzt oberhalb der bisherigen Nummern dieser Kategorie fort; bestehende Nummern bleiben erhalten und werden nach einer Kanallöschung nicht erneut vergeben.

Status: 🔴 offen, 🟡 übernommen, 🟠 wartet auf Rückmeldung, 🟢 erledigt, ⚫ geschlossen. „Warten“ ist nun ein eigener Status; Übernehmen oder Freigeben beendet ihn. Umbenennungen laufen im Hintergrund, damit Discords Begrenzung für Kanalnamen die Interaktionsantwort nicht blockiert. Bei schnellen Wechseln wird der neueste gewünschte Name übernommen.

Schließen: „Ticket schließen“ → private Rückfrage → „JA, TICKET SCHLIESSEN“ oder „ABBRECHEN“. Eine Bestätigung ist fünf Minuten gültig, an Person und Kanal gebunden und wird bei Ausführung erneut auf Berechtigung geprüft. Bestätigungen überstehen keinen Prozessneustart; dann erneut „Ticket schließen“ drücken. Es dürfen der Ersteller, der zugewiesene Bearbeiter und die Kanzleileitung schließen.

Nach Bestätigung werden zunächst die Schreibrechte des Mandanten entzogen, das HTML-Transkript erstellt und im Transkriptkanal 1484218994608312553 hochgeladen. Im Ticket erhält die schließende Person eine Bestätigung mit Archivlink. Erst nach erfolgreichem Upload wird der Abschluss gespeichert. Scheitert die Transkripterstellung oder der Upload, werden die bisherigen Schreibrechte wiederhergestellt und das Ticket bleibt offen. Nach erfolgreichem Upload und Speicherung des Archivverweises wird der Ticketkanal endgültig gelöscht. Bei einem Löschfehler bleibt das Transkript erhalten; eine erneut bestätigte Schließung prüft die vorhandene HTML-Datei und wiederholt nur die Löschung. Das HTML enthält alle abrufbaren Nachrichten, Embed-Felder, Anhanglinks, Ticketdaten und Bearbeitungsschritte. Anhanglinks sind keine lokalen Dateikopien und können Discord-seitig ablaufen.

Die HTML-Dateien werden unter `data/ticket-logs/` gespeichert, mit Ticketnummer und Kanal-ID im Namen. Lokale Betriebsdaten werden nicht auf GitHub übertragen.

Gezielte Aktualisierung bestehender, lokal gespeicherter Tickets: `node update-ticket-ui.js`. Dieser Vorgang aktualisiert die Ticket-Bedienfelder und die beiden gewünschten Kanalnamen; er schließt keine Tickets.

Prüfungen: `node ticket-workflow.test.js`, `node ticket-close.test.js`, `node ticket-transcript.test.js`.


IC-Nutzerprofil: Bei jedem erfolgreich erstellten Ticket werden IC-Vorname, IC-Nachname und IC-Telefonnummer aus dem Formular im Profil der Discord-ID angelegt oder aktualisiert. Das Formular fragt die Felder weiterhin ab und füllt gespeicherte Angaben vor. Frühere Tickets und Transkripte behalten ihre damaligen Angaben. Bestehende Registrierungs- und Regelannahmedaten bleiben erhalten; bei Bestandsmitgliedern wird durch die Ticketangaben keine Regelannahme erfunden. Prüfung: node ticket-profile.test.js.

Bereits geschlossene Kanäle gezielt bereinigen: node cleanup-closed-tickets.js zeigt verifizierte Kandidaten; --apply löscht sie nach Prüfung der eigenen HTML-Datei im festgelegten Archivkanal. Nicht archivierte oder offene Tickets werden nicht gelöscht.

