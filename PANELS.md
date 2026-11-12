# Kanzlei-Panels

Start: `npm start`. Beim Start veröffentlicht/aktualisiert der Bot die festgelegten Panels. Alte eigene Panels werden vor der Veröffentlichung gelöscht und neu erstellt. Der Bot durchsucht dafür den Kanalverlauf, auch wenn die lokal gespeicherten Nachrichten-IDs fehlen. Andere Nachrichten bleiben bestehen.

`/bot-panel` veröffentlicht die Verwaltung im aktuellen Kanal. Nur die vorhandenen Adminrollen dürfen sie bedienen. `/ticket-panel` aktualisiert das Ticketpanel im festgelegten Ticketkanal. Die öffentlichen Panels sind eigenständige Botnachrichten, die Command-Antwort bleibt privat.

„BOT NEU STARTEN“ erneuert die Discord-Verbindung und aktualisiert die Panels. Für einen vollständigen Prozessneustart oder das Einlesen geänderter Quelldateien den Prozess über den Hostingdienst neu starten.

Benötigte Botrechte: Kanäle sehen/verwalten, Nachrichten senden und lesen, Embeds senden, Dateien anhängen und Rollen verwalten. Die Botrolle muss über allen anfragbaren Rollen stehen. Der Freigaberolle wird Zugang zu Rollenanfragekanälen erteilt.

Bewerbungen entstehen in 1478007585784201351 (letzte ausdrücklich genannte Zuordnung). 1570448935992954921 ist für eine spätere Phase reserviert. Zusätzliche Bewerbungsauswahlen sind noch nicht definiert.

Punkte und Freigaben werden in data/panels.json gespeichert. Abgelaufene Punkte werden beim Start und alle 15 Sekunden entfernt. Changelogs erscheinen automatisch einmal je VERSION in panels.js; bei künftigen Änderungen den Eintrag und die VERSION aktualisieren.

Prüfung: `node panels.test.js` und `node --check index.js`.

Rollenanfragen werden direkt als Nachricht mit Freigabe-Buttons im Textkanal 1570462925402021920 veröffentlicht. Es werden dafür keine Unterkanäle erstellt. Die Sichtbarkeit richtet sich nach den bestehenden Kanalberechtigungen.

