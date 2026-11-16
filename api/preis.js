import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { gruppe, sparte, plz, verbrauch } = req.query;

  try {
    if (sparte === "strom") {
      
      // --- PFAD 1: OHNE BONITÄTSPRÜFUNG (Fester Tarif aus JSON) ---
      if (gruppe === "bonitaetsfrei") {
        // JSON-Datei zur Laufzeit aus dem Projekt-Root lesen
        const filePath = path.join(process.cwd(), 'tarife-strom.json');
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const tarif = jsonData.strom.bonitaetsfrei;

        // Monatlichen Abschlag berechnen: (Grundpreis Jahr + (Verbrauch * Arbeitspreis / 100)) / 12
        const monatlich = (tarif.grundpreisJahr + (Number(verbrauch) * tarif.arbeitspreis) / 100) / 12;

        return res.status(200).json({
          found: true,
          tarifName: tarif.tarifName,
          anzeigeName: tarif.anbieter,
          arbeitspreis: tarif.arbeitspreis,
          grundpreis: tarif.grundpreisJahr, // Wichtig: Hook erwartet Jahreswert
          monatlich: monatlich,
          badge: tarif.badge,
          tarifSub: tarif.beschreibung,
          laufzeit: tarif.laufzeit, // Sollte "24 Monate" sein
          preisgarantie: tarif.preisgarantie
        });
      }

      // --- PFAD 2: MIT BONITÄTSPRÜFUNG (Eni) ---
      if (gruppe === "normal") {
        // HIER KOMMT IHR BESTEHENDER CODE FÜR ENI REIN
        // (Die Logik, die aktuell die Eni-Preise aus Ihrer Datenbank/JSON lädt)
        
        // ... Ihr Eni-Abfrage-Code ...
        
        // return res.status(200).json({ ... Eni Daten ... });
      }
    }

    // Fallback für Gas (falls diese API auch für Gas genutzt wird)
    if (sparte === "gas") {
       // ... Ihre bestehende Gas-Logik ...
    }

  } catch (error) {
    console.error("API Fehler:", error);
    return res.status(500).json({ error: "Fehler bei der Preisberechnung" });
  }
}
