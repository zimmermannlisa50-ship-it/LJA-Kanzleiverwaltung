# Pflichtregistrierung

Die Registrierung ist direkt unter dem Kanzleiregelwerk integriert: „REGELWERK AKZEPTIEREN“ öffnet das Pflichtformular. Neue Mitglieder erhalten per Privatnachricht nur einen Link zum Regelwerk, kein separates Registrierungspanel. Eine native Discord-Regelbestätigung ist nicht erforderlich.

Pflichtfelder: IC-Vorname, IC-Nachname, IC-Telefonnummer. Gespeichert unter der Discord-ID in `data/registration.json`, ausschließlich lokal und von GitHub ausgeschlossen. Ticketformulare übernehmen die Angaben. Die Annahme des Kanzleiregelwerks wird mit rulesAcceptedAt gespeichert. Nach Speicherung vergibt der Bot „Bürger“ (1477932235842654299). Bei Rollenfehlern kann derselbe Button erneut benutzt werden. Bestandsmitglieder werden bei Aktivierung erfasst und müssen keine Angaben hinterlegen.

Rechteplan nur anzeigen: `node setup-registration.js`. Aktivieren: `node setup-registration.js --apply`. Der laufende Bot muss den Registrierungs-Handler bereits geladen haben. Nach aktiver Einrichtung sind wiederholte Aufrufe wirkungslos.

Die Einrichtung sichert Kanalrechte und die Sichtbarkeit aller Bestandsmitglieder in `data/registration-rights-before.json`. Nur bislang öffentliche Bereiche werden hinter die Bürgerrolle gelegt. Willkommen und Regelwerk bleiben öffentlich. Bestandsmitglieder ohne Bürgerrolle und ohne Administratorrecht erhalten eine zusätzliche Bestandszugangsrolle mit den bislang öffentlichen Sichtrechten. Anschließend wird die Sichtbarkeit jedes bestehenden Mitglieds mit der Sicherung verglichen. Bei Abweichungen oder Fehlern während der Rechteumstellung werden die Änderungen zurückgesetzt. Interne Rollenrechte bleiben erhalten.

Die Änderungen sind lokal in `data/registration-rights-audit.json` und im Tageschangelog unter „RECHTE“ dokumentiert. Neue Kanäle müssen weiterhin bewusst berechtigt werden. Andere Bots sollten neuen Mitgliedern die Bürgerrolle nicht vorab vergeben; der Registrierungs-Handler entfernt sie bei noch ausstehender Registrierung.

Die Erstaktivierung benötigt einmal den neuen Bot-Handler. `LJA_SKIP_PANEL_REFRESH=1` verhindert dabei die erneute Veröffentlichung bestehender Panels. Spätere Änderungen an `registration.js` werden beim Buttonklick automatisch geladen. Nur das Kanzleiregelwerk wird neu veröffentlicht. Die separate Registrierung in der Willkommenshalle wird entfernt.

Prüfungen: `node registration.test.js`, `node panels.test.js`, `node changelog.test.js`, `node role-decisions.test.js`.

Registrierungsbuttons und Formulare tragen eine lokale Instanzkennung. Andere oder inaktive Instanzen ignorieren diese Interaktionen. Ein bereits gepostetes Panel mit node update-registration.js gezielt aktualisieren. Mehrfachbetrieb des Bots sollte unabhängig davon vermieden werden; Registrierungsdaten benötigen einen dauerhaften Datenspeicher am Hostingort.


Automatische Spitznamen: Nach erfolgreicher Registrierung und nach gespeicherten Ticketangaben wird der Server-Spitzname auf IC-Vorname IC-Nachname gesetzt. Die 16 vom Nutzer ausgewählten Mitarbeiterrollen stehen in nickname-config.json; bereits eine davon schließt eine Umbenennung aus. Bots bleiben ausgenommen. Rollen werden frisch geprüft. Fehlende Rechte, Rollenhierarchie und Namen über 32 Zeichen verhindern nur die Umbenennung, nicht die Profilspeicherung. Keine rückwirkende Sammelumbenennung. Prüfung: node nicknames.test.js.
