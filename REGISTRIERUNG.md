# Pflichtregistrierung

Status: Vorbereitet; die native Discord-Regelbestätigung muss vor Aktivierung eingeschaltet werden.

Neue Mitglieder akzeptieren zuerst Discords Serverregeln. Beim Übergang von `pending: true` auf `false` sendet der Bot eine private Nachricht mit Registrierungsbutton. Bei gesperrten Privatnachrichten steht derselbe Button dauerhaft in der Willkommenshalle. Vor der Regelbestätigung öffnet er kein Formular. Ein Formular kann Discord nur als Antwort auf einen Klick öffnen.

Pflichtfelder: IC-Vorname, IC-Nachname, IC-Telefonnummer. Gespeichert unter der Discord-ID in `data/registration.json`, ausschließlich lokal und von GitHub ausgeschlossen. Neue Ticketformulare übernehmen diese Angaben. Nach Speicherung erhält das Mitglied „Bürger“ (1477932235842654299). Bestehende Mitglieder werden bei Aktivierung erfasst und müssen keine Angaben hinterlegen.

Rechteplan nur anzeigen: `node setup-registration.js`. Aktivieren: `node setup-registration.js --apply`. Der laufende Bot muss den aktuellen Registrierungs-Handler bereits geladen haben. Die Einrichtung bricht ab, wenn die native Regelbestätigung fehlt. Nach aktiver Einrichtung sind wiederholte Aufrufe wirkungslos.

Die Einrichtung sichert Kanalrechte und die Sichtbarkeit aller Bestandsmitglieder in `data/registration-rights-before.json`. Nur bisher öffentlich sichtbare Bereiche werden hinter die Bürgerrolle gelegt. Willkommen und Regelwerk bleiben öffentlich. Für Bestandsmitglieder ohne Bürgerrolle und ohne Administratorrecht erhält eine zusätzliche Bestandszugangsrolle nur die bislang öffentlichen Sichtrechte. Danach wird die Sichtbarkeit jedes bestehenden Mitglieds mit der Sicherung verglichen. Bei Abweichung oder Einrichtungsfehler werden die Änderungen zurückgesetzt. Interne Rollenrechte bleiben bestehen. Änderungen sind in `data/registration-rights-audit.json` und im Tageschangelog unter „RECHTE“ dokumentiert.

Die Bürgerrolle darf für neue Mitglieder nicht durch einen anderen Bot vorab vergeben werden; der Handler entfernt sie bei ausstehender Registrierung. Neue nichtöffentliche Kanäle müssen weiterhin bewusst berechtigt werden.

Native Regeln einschalten (Discord am PC): Servereinstellungen → Moderation → Sicherheits-Setup → DM- und Spam-Schutz → Bearbeiten → „Mitglieder müssen Regeln akzeptieren …“. Der Bot kann diesen Schritt über die verwendete öffentliche API nicht selbst konfigurieren.

Der Bot muss für die Erstaktivierung einmal mit dem neuen Handler geladen werden. `LJA_SKIP_PANEL_REFRESH=1` verhindert dabei das erneute Posten bestehender Panels. Spätere Änderungen an `registration.js` werden beim Buttonklick automatisch geladen. Es wird nur das neue Registrierungspanel veröffentlicht.

Prüfungen: `node registration.test.js`, `node panels.test.js`, `node changelog.test.js`, `node role-decisions.test.js`.
