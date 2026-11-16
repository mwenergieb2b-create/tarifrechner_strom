// api/preis.js

export default async function handler(req, res) {
  const { gruppe, sparte, plz, verbrauch } = req.query;

  try {
    if (sparte === "strom") {
      
      // --- PFAD 1: OHNE BONITÄTSPRÜFUNG (Fester Tarif) ---
      if (gruppe === "bonitaetsfrei") {
        // Feste Werte direkt im Code hinterlegt
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

        // Monatlichen Abschlag berechnen
        const monatlich = (tarif.grundpreisJahr + (Number(verbrauch) * tarif.arbeitspreis) / 100) / 12;

        return res.status(200).json({
          found: true,
          tarifName: tarif.tarifName,
          anzeigeName: tarif.anbieter,
          arbeitspreis: tarif.arbeitspreis,
          grundpreis: tarif.grundpreisJahr, // Wichtig: Jahreswert für den Hook
          monatlich: monatlich,
          badge: tarif.badge,
          tarifSub: tarif.beschreibung,
          laufzeit: tarif.laufzeit,
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
