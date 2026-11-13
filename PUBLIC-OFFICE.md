# Öffentliches Register und Kanzleikanäle

`public-office.js` richtet den Kanal `⚖️〣ᴀɴᴡᴀʟᴛꜱʀᴇɢɪꜱᴛᴇʀ` unter Allgemein ein. Bürger können lesen und nach der Registrierung über die Kontaktfunktion einen aktiven Anwalt auswählen. Namen und IC-Telefonnummer stammen aus den Registrierungs-/Stammdaten, Lizenzablauf und Prüfstatus aus der Personalakte. Fehlende Angaben heißen „Ausstehend“. Lizenzdateien, Seriennummern und andere Akteninhalte werden nicht veröffentlicht.

Das Register wird bei Personal-/Rollenänderungen und spätestens alle 60 Sekunden abgeglichen. Ehemalige Mitarbeiter und Personen ohne aktuellen Anwaltsrang verschwinden; alte Auswahlformulare werden beim Absenden nochmals geprüft. Die private Lizenzhistorie bleibt in der Personalakte bzw. ihrem Archiv erhalten.

Direkte Kontaktanfragen verwenden die normale Beratungsticketnummerierung und die bestehenden Bearbeitungs-/Archivfunktionen. Sie werden im vorhandenen Bereich des gewählten Anwalts angelegt und in dessen Mandatsübersicht eingetragen. Nur Mandant, zuständiger Anwalt und die bisherige Mandatsverwaltung erhalten Zugriff. Ein noch offenes direktes Ticket derselben Person beim selben Anwalt wird wiederverwendet.

Ankündigungen werden im vorhandenen Ankündigungskanal per Formular veröffentlicht. Die Rollen werden sowohl beim Öffnen als auch beim Absenden frisch geladen. Berechtigt sind die bestehenden Kanzleileitungs-/Partnerrollen und die eingerichtete Personalverwaltungsrolle. Andere Benutzer können den Button sehen, die Aktion aber nicht ausführen.

Die sieben benannten Informationskanäle sind schreibgeschützt. Nur Kanzleileitung/Partner und der Bot erhalten Schreibrechte; explizite alte Schreibfreigaben anderer Rollen/Personen werden neutralisiert. Sichtrechte bleiben erhalten, der Bürgerchat wird nicht verändert. Das Register ist nur für Bürger und Kanzleileitung/Partner sichtbar. Discord-Administratoren und der Serverinhaber umgehen kanalbezogene Einschränkungen grundsätzlich. Vor den Änderungen wird `data/public-permissions-before.json` gesichert.

## Statusüberwachung

Der interne Kanal `🟢〣ʙᴏᴛꜱᴛᴀᴛᴜꜱ` liegt in der Leitungsebene. `bot-status.js` schreibt alle 45 Sekunden ein Lebenszeichen. `data/bot-health.json` speichert Start, geordnete Stopps, letzte Verbindungsunterbrechung, Fehler und erfassbare Absturzursachen. Ein neues Railway-Deployment wird von einem unerwarteten Prozessende unterschieden. Für Speicher-/Betriebssystemabbrüche kann die genaue Ursache unbekannt bleiben; das Panel behauptet keine Ursache ohne Beleg.

Ein eigener kleiner Railway-Dienst startet `node status-monitor.js`. Er verwendet nur Discord REST, keine zweite Bot-Gatewayverbindung. `DISCORD_TOKEN` referenziert die bestehende Railway-Variable, `LJA_STATUS_CHANNEL_ID` benennt den angelegten Statuskanal. Der Dienst markiert ausbleibende Lebenszeichen nach drei Minuten beim nächsten 45-Sekunden-Check. Bei einem Discord-Ausfall kann auch dieser Dienst erst nach Erreichbarkeit von Discord schreiben. Die Überwachung beginnt mit ihrer Einrichtung und rekonstruiert keine früheren unbekannten Abstürze.

Das neue System läuft vollständig auf Railway. Im bestehenden Volume bleiben Register-IDs, Ankündigungsreferenzen, Fehlerhistorie und Tickets nach Deployments erhalten. Es wird kein Dokumentenforum angelegt.
