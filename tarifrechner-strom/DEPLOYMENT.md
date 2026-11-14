# Strom-Tarifrechner – Deployment

## Prozess-Ablauf (Strom)

1. **Verbrauch (`basics`)**: Abfrage von Postleitzahl und Jahresverbrauch (inkl. Schnellwahl-Presets für Strom).
2. **Wechselweg & Abschlag (`wechselweg`)**: Auswahl zwischen „Ohne Bonitätsprüfung wechseln" und „Mit Bonitätsprüfung wechseln". Direkt innerhalb beider Auswahlfelder wird auf Grundlage der zuvor eingegebenen Postleitzahl und des Verbrauchs der jeweilige **monatliche Abschlag** angezeigt (z. B. `90 € monatlicher Abschlag`).
3. **Kontaktdaten (`kontakt`)**: Direkte Erfassung von Anrede, Vorname, Nachname, Handynummer und E-Mail-Adresse.
4. **Unterlagen (`dokumente`)**: Optionaler Upload von Rechnung/Vertrag oder manuelle Eingabe.
5. **Vertragsdaten (`vertrag`)**: Bestehender Anschluss vs. Neueinzug, Vorversorger, Kundennummer, Geburtsdatum und Lieferadresse.
6. **Zahlung (`bankdaten`)**: SEPA-Lastschrift (IBAN) oder Selbstzahler.
7. **Zähler (`zaehler`)**: Zählernummer, MaLo-ID, Zählerfoto oder Nachreichung per WhatsApp.
8. **Abschluss (`abschluss`)**: Nach Übermittlung der Daten an Pipedrive wird dem Kunden mitgeteilt, dass er das **konkrete Angebot per E-Mail** zugeschickt bekommt und es dann **final bestätigen** kann.
