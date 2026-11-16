// api/preis.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { gruppe, sparte, plz, verbrauch } = req.query;

  try {
    if (sparte === "strom") {
      
      // --- PFAD 1: OHNE BONITÄTSPRÜFUNG (Fester Tarif) ---
      if (gruppe === "bonitaetsfrei") {
        const tarif = {
          anbieter: "Bundesweiter Fix-Tarif",
          tarifName: "Fix 32",
          arbeitspreis: 32.00,
          grundpreisJahr: 444.00, // 37 € * 12 Monate
          badge: "Garantiert ohne Schufa",
          beschreibung: "Bundesweit einheitlicher Tarif ohne Bonitätsprüfung.",
          laufzeit: "24 Monate",
          preisgarantie: "24 Monate"
        };

        const monatlich = (tarif.grundpreisJahr + (Number(verbrauch) * tarif.arbeitspreis) / 100) / 12;

        return res.status(200).json({
          found: true,
          tarifName: tarif.tarifName,
          anzeigeName: tarif.anbieter,
          arbeitspreis: tarif.arbeitspreis,
          grundpreis: tarif.grundpreisJahr,
          monatlich: monatlich,
          badge: tarif.badge,
          tarifSub: tarif.beschreibung,
          laufzeit: tarif.laufzeit,
          preisgarantie: tarif.preisgarantie
        });
      }

      // --- PFAD 2: MIT BONITÄTSPRÜFUNG (Eni aus JSON) ---
      if (gruppe === "normal") {
        // 1. JSON-Datei zur Laufzeit einlesen
        const filePath = path.join(process.cwd(), 'api', 'data', 'enni_strom.json');
        
        if (!fs.existsSync(filePath)) {
          console.error("Datei nicht gefunden:", filePath);
          return res.status(500).json({ error: "Preisdatei fehlt" });
        }

        const fileData = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileData);

        // 2. Daten für die eingegebene PLZ suchen
        const plzData = jsonData[plz]; 
        
        // Falls die PLZ nicht in der Eni-Datei existiert
        if (!plzData || !plzData[0]) {
          return res.status(200).json({ found: false, individuell: true });
        }

        // 3. Werte aus dem inneren Array extrahieren
        const eniData = plzData[0]; 
        
        // Werte zuweisen (Index 2 = Grundpreis Jahr, Index 3 = Arbeitspreis)
        // Falls deine JSON-Datei anders aufgebaut ist, passe die Indizes [2] und [3] an!
        const grundpreisJahr = eniData[2] || 187.7; 
        const arbeitspreis = eniData[3] || 36.94;
        
        // 4. Monatlichen Abschlag berechnen
        const monatlich = (grundpreisJahr + (Number(verbrauch) * arbeitspreis) / 100) / 12;

        // 5. Antwort an das Frontend senden
        return res.status(200).json({
          found: true,
          tarifName: "Eni Strom",
          anzeigeName: "Eni",
          arbeitspreis: arbeitspreis,
          grundpreis: grundpreisJahr, // Wichtig: Der Jahreswert für den Hook
          monatlich: monatlich,       // Der berechnete Monatswert
          badge: "Mit Bonitätsprüfung",
          tarifSub: "Standardtarif mit Schufa-Prüfung.",
          laufzeit: "12 Monate",
          preisgarantie: "12 Monate"
        });
      }
    }

    // Fallback für Gas (falls diese API auch für Gas genutzt wird)
    if (sparte === "gas") {
       return res.status(200).json({ found: false, individuell: true });
    }

    return res.status(200).json({ found: false, individuell: true });

  } catch (error) {
    console.error("API Fehler:", error);
    return res.status(500).json({ error: "Fehler bei der Preisberechnung" });
  }
}
