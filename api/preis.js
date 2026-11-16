// api/preis.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { gruppe, sparte, plz, verbrauch } = req.query;

  try {
    if (sparte === "strom") {
      
      // --- PFAD 1: OHNE BONITÄTSPRÜFUNG (Fester Tarif) ---
      if (gruppe === "bonitaetsfrei") {
        // Feste Werte exakt nach deinen Vorgaben
        const tarif = {
          anbieter: "Bundesweiter Fix-Tarif",
          tarifName: "Fix 32",
          arbeitspreis: 32.00,       // 32 Cent pro kWh
          grundpreisJahr: 444.00,    // 37 € pro Monat * 12 = 444 € pro Jahr
          badge: "Garantiert ohne Schufa",
          beschreibung: "Bundesweit einheitlicher Tarif ohne Bonitätsprüfung.",
          laufzeit: "24 Monate",
          preisgarantie: "24 Monate"
        };

        // Monatlichen Abschlag berechnen
        const monatlich = (tarif.grundpreisJahr + (Number(verbrauch) * tarif.arbeitspreis) / 100) / 12;

        return res.status(200).json({
          found: true,
          tarifName: tarif.tarifName,
          anzeigeName: tarif.anbieter,
          arbeitspreis: Number(tarif.arbeitspreis),
          grundpreis: Number(tarif.grundpreisJahr), // Wichtig: Jahreswert als Zahl!
          monatlich: Number(monatlich),             // Wichtig: Berechneter Wert als Zahl!
          badge: tarif.badge,
          tarifSub: tarif.beschreibung,
          laufzeit: tarif.laufzeit,
          preisgarantie: tarif.preisgarantie
        });
      }

      // --- PFAD 2: MIT BONITÄTSPRÜFUNG (Eni aus JSON) ---
      if (gruppe === "normal") {
        const filePath = path.join(process.cwd(), 'api', 'data', 'enni_strom.json');
        
        if (!fs.existsSync(filePath)) {
          console.error("Datei nicht gefunden:", filePath);
          return res.status(500).json({ error: "Preisdatei fehlt" });
        }

        const fileData = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileData);

        const plzData = jsonData[plz]; 
        
        if (!plzData || !plzData[0]) {
          return res.status(200).json({ found: false, individuell: true });
        }

        const eniData = plzData[0]; 
        
        // Werte aus der JSON (Index 2 = Grundpreis Jahr, Index 3 = Arbeitspreis)
        const grundpreisJahr = eniData[2] || 187.7; 
        const arbeitspreis = eniData[3] || 36.94;
        
        const monatlich = (grundpreisJahr + (Number(verbrauch) * arbeitspreis) / 100) / 12;

        return res.status(200).json({
          found: true,
          tarifName: "Eni Strom",
          anzeigeName: "Eni",
          arbeitspreis: Number(arbeitspreis),
          grundpreis: Number(grundpreisJahr), 
          monatlich: Number(monatlich),       
          badge: "Mit Bonitätsprüfung",
          tarifSub: "Standardtarif mit Schufa-Prüfung.",
          laufzeit: "12 Monate",
          preisgarantie: "12 Monate"
        });
      }
    }

    if (sparte === "gas") {
       return res.status(200).json({ found: false, individuell: true });
    }

    return res.status(200).json({ found: false, individuell: true });

  } catch (error) {
    console.error("API Fehler:", error);
    return res.status(500).json({ error: "Fehler bei der Preisberechnung" });
  }
}
