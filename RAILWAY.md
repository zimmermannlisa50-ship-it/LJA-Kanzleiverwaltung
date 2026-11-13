# Dauerbetrieb auf Railway

Der vorhandene Dienst wird als einzige Hauptinstanz betrieben. Nicht zusätzlich lokal starten.

Die Betriebsfreigabe liegt auf Railway unter `/app/data/runtime-authority.json`. Sie bindet die vorhandene Instanz-ID an Projekt, Dienst und Produktionsumgebung statt an einen wechselnden Containerhostname. Ein Volume muss genau unter `/app/data` eingehängt sein. Ohne Volume oder vollständige Registrierung startet der Bot nicht.

## Umzug

1. Lokalen Hauptbot stoppen. Die vorhandenen Daten nicht neu initialisieren.
2. `node prepare-railway.js` erstellt eine private Kopie des vollständigen Datenordners unter `.railway-migration/<Zeitstempel>` und ergänzt dort die Freigabe für den bestehenden Railway-Dienst. Der lokale Datenstand wird nicht verändert. Vor dem tatsächlichen Umzug einen frischen Snapshot erstellen.
3. Im bestehenden Railway-Projekt ein Volume mit Mountpfad `/app/data` an den Botdienst hängen. Genau eine Replik betreiben; Serverless/Schlafmodus deaktivieren.
4. Den Inhalt des privaten Snapshots vollständig auf das Volume übertragen. Vorhandene Cloud-Daten zunächst sichern und auf neuere Änderungen prüfen. Keine vertraulichen Betriebsdaten oder `.env` zu GitHub hinzufügen.
5. Den aktualisierten Quellcode deployen. `DISCORD_TOKEN` muss bereits als Railway-Variable gesetzt sein. Im Railway-Dienst `node index.js`, eine Replik, deaktivierten Schlafmodus und Neustarts nach Prozessfehlern einstellen.
6. Deploy-Logs auf erfolgreiche Discord-Anmeldung prüfen und einen vorhandenen Panelbutton testen. Erst nach verifiziertem Umzug den lokalen Start dauerhaft stilllegen.

Die lokalen Sperren bleiben bis zum tatsächlichen Umzug erhalten. Ein privater Snapshot allein aktiviert Railway noch nicht. Änderungen an Betriebsdaten nach der Snapshot-Erstellung müssen erneut übernommen werden.

Dokumentation: https://docs.railway.com/volumes und https://docs.railway.com/cli/volume
