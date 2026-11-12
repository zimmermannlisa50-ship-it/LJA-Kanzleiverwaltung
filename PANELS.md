# Kanzlei-Panels

Start: `npm start`. Beim Start veröffentlicht/aktualisiert der Bot die festgelegten Panels. Alte eigene Panels werden vor der Veröffentlichung gelöscht und neu erstellt. Der Bot durchsucht dafür den Kanalverlauf, auch wenn die lokal gespeicherten Nachrichten-IDs fehlen. Andere Nachrichten bleiben bestehen.

`/bot-panel` veröffentlicht die Verwaltung im aktuellen Kanal. Nur die vorhandenen Adminrollen dürfen sie bedienen. `/ticket-panel` aktualisiert das Ticketpanel im festgelegten Ticketkanal. Die öffentlichen Panels sind eigenständige Botnachrichten, die Command-Antwort bleibt privat.

„BOT NEU STARTEN“ erneuert die Discord-Verbindung und aktualisiert die Panels. Für einen vollständigen Prozessneustart oder das Einlesen geänderter Quelldateien den Prozess über den Hostingdienst neu starten.

Benötigte Botrechte: Kanäle sehen/verwalten, Nachrichten senden und lesen, Embeds senden, Dateien anhängen und Rollen verwalten. Die Botrolle muss über allen anfragbaren Rollen stehen. Der Freigaberolle wird Zugang zu Rollenanfragekanälen erteilt.

Bewerbungen entstehen in 1478007585784201351 (letzte ausdrücklich genannte Zuordnung). 1570448935992954921 ist für eine spätere Phase reserviert. Zusätzliche Bewerbungsauswahlen sind noch nicht definiert.

Punkte und Freigaben werden in data/panels.json gespeichert. Abgelaufene Punkte werden beim Start und alle 15 Sekunden entfernt. Changelogs werden aus changelog.json automatisch veröffentlicht. Jede Änderung erhält eine neue eindeutige ID, Datum, Titel und passende Abschnitte added (Hinzugefügt), changed (Geändert), fixed (Behoben) und removed (Entfernt). Bestehende Einträge bleiben erhalten; Textkorrekturen aktualisieren die jeweilige Nachricht. Beim Start werden fehlende Einträge ergänzt; markierte vorhandene Einträge werden auch ohne lokale IDs erkannt. Künftige Änderungen müssen als neuer Eintrag dokumentiert werden.

Prüfung: `node panels.test.js` und `node --check index.js`.

Rollenanfragen werden direkt als Nachricht mit Freigabe-Buttons im Textkanal 1570462925402021920 veröffentlicht. Es werden dafür keine Unterkanäle erstellt. Die Sichtbarkeit richtet sich nach den bestehenden Kanalberechtigungen.



Changelogs kurz halten: je Abschnitt höchstens wenige kurze Stichpunkte. Nur betroffene Komponenten aktualisieren. Reine Changelogänderungen mit `node update-changelogs.js` veröffentlichen; der laufende Bot wird dabei nicht neu gestartet.


Rollenentscheidungen liegen in role-decisions.js und werden bei jedem Klick neu geladen. Änderungen daran benötigen künftig keinen Botneustart. LJA_SKIP_PANEL_REFRESH=1 überspringt die Panelveröffentlichung beim Start. Prüfung: node role-decisions.test.js.
