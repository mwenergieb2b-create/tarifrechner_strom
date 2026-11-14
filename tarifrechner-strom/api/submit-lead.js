const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_API_TOKEN || process.env.PIPEDRIVE_TOKEN;
const PIPEDRIVE_DOMAIN = process.env.PIPEDRIVE_DOMAIN || "api";

// Wenn in Vercel keine feste Pipeline/Stage hinterlegt ist, wählt Pipedrive automatisch die 1. Spalte deiner Standard-Pipeline
const PIPELINE_ID = process.env.PIPEDRIVE_PIPELINE_ID ? Number(process.env.PIPEDRIVE_PIPELINE_ID) : undefined;
const STAGE_ID = process.env.PIPEDRIVE_STAGE_ID ? Number(process.env.PIPEDRIVE_STAGE_ID) : undefined;

const FIXED_DEAL_FIELD_KEYS = {
  vorname: process.env.PD_FIELD_VORNAME || "",
  nachname: process.env.PD_FIELD_NACHNAME || "",
  anrede: process.env.PD_FIELD_ANREDE || "",
  telefon: process.env.PD_FIELD_TELEFON || "",
  email: process.env.PD_FIELD_EMAIL || "",
};

const PERSON_FIELD_CONFIG = [
  ["plz", "PLZ", "varchar"],
  ["ort", "Ort", "varchar"],
  ["strasse", "Straße", "varchar"],
  ["hausnummer", "Hausnummer", "varchar"],
  ["geburtsdatum", "Geburtsdatum", "varchar"],
];

const DEAL_FIELD_CONFIG = [
  ["sparte", "Sparte", "varchar"],
  ["verbrauch", "Jahresverbrauch (kWh)", "varchar"],
  ["plz", "PLZ", "varchar"],
  ["ort", "Ort", "varchar"],
  ["strasse", "Straße", "varchar"],
  ["hausnummer", "Hausnummer", "varchar"],
  ["wechselgrund", "Wechselweg / Situation", "varchar"],
  ["tarif_name", "Gewählter Tarif", "varchar"],
  ["abschlag_monat", "Monatlicher Abschlag", "varchar"],
  ["arbeitspreis", "Arbeitspreis (ct/kWh)", "varchar"],
  ["grundpreis", "Grundpreis (€/Monat)", "varchar"],
  ["zaehlernummer", "Zählernummer", "varchar"],
  ["marktlokations_id", "MaLo-ID", "varchar"],
  ["bisheriger_versorger", "Bisheriger Versorger", "varchar"],
  ["iban", "IBAN", "varchar"],
  ["unterschrift_datum", "Unterschrift Datum", "varchar"],
];

function baseUrl() {
  const cleanDomain = String(PIPEDRIVE_DOMAIN || "api")
    .replace(/^https?:\/\//, "")
    .replace(/\.pipedrive\.com.*$/, "")
    .trim();
  return `https://${cleanDomain || "api"}.pipedrive.com/v1`;
}

async function pd(path, options = {}) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${baseUrl()}${path}${sep}api_token=${PIPEDRIVE_TOKEN}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Pipedrive API Fehler (${res.status}) bei ${path}`);
  }
  return json.data;
}

const fieldCache = { person: null, deal: null };

async function getFieldMap(entity) {
  if (fieldCache[entity]) return fieldCache[entity];
  const endpoint = entity === "person" ? "/personFields" : "/dealFields";
  const fields = (await pd(endpoint)) || [];
  const map = new Map();
  for (const f of fields) {
    if (f && f.name && f.key) {
      map.set(f.name.trim().toLowerCase(), f.key);
    }
  }
  fieldCache[entity] = map;
  return map;
}

function normalizePhone(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
  else if (cleaned.startsWith("0")) cleaned = "+49" + cleaned.slice(1);
  return cleaned;
}

function phoneSearchTerm(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-8);
}

async function ensureField(entity, name, fieldType = "varchar") {
  const map = await getFieldMap(entity);
  const lookupKey = name.trim().toLowerCase();
  if (map.has(lookupKey)) return map.get(lookupKey);

  const created = await pd(entity === "person" ? "/personFields" : "/dealFields", {
    method: "POST",
    body: JSON.stringify({ name, field_type: fieldType }),
  });
  map.set(lookupKey, created.key);
  return created.key;
}

async function buildCustomFields(entity, config, values) {
  const out = {};
  for (const [payloadKey, fieldName, fieldType] of config) {
    const value = values[payloadKey];
    if (value === undefined || value === null || value === "") continue;
    const key = await ensureField(entity, fieldName, fieldType);
    out[key] = typeof value === "boolean" ? (value ? "ja" : "nein") : value;
  }
  return out;
}

/* ---------------------------------------------------------
   Feste Deal-Felder befüllen (Vorname, Nachname, Anrede,
   Telefon, Mail) — mit Existenz-Check, damit ein in Pipedrive
   gelöschtes Feld nicht die ganze /deals-Anfrage killt.
--------------------------------------------------------- */
async function applyFixedDealFields(customFields, payload) {
  const dealFieldMap = await getFieldMap("deal");
  const validKeys = new Set(dealFieldMap.values());

  const setFixed = (key, value) => {
    if (!key || !validKeys.has(key)) return;
    if (value === undefined || value === null || value === "") return;
    customFields[key] = value;
  };

  setFixed(FIXED_DEAL_FIELD_KEYS.vorname, payload.vorname || "");
  setFixed(FIXED_DEAL_FIELD_KEYS.nachname, payload.nachname || "");
  setFixed(
    FIXED_DEAL_FIELD_KEYS.anrede,
    payload.anrede === "herr" ? "Herr" : payload.anrede === "frau" ? "Frau" : payload.anrede || ""
  );

  const normalizedPhone = normalizePhone(payload.telefon);
  setFixed(FIXED_DEAL_FIELD_KEYS.telefon, normalizedPhone);
  setFixed(FIXED_DEAL_FIELD_KEYS.email, payload.email || "");
}

/* ---------------------------------------------------------
   Person + Deal finden/anlegen
--------------------------------------------------------- */
async function findPersonByPhone(telefon) {
  if (!telefon) return null;
  const target = normalizePhone(telefon);
  const searchTerm = phoneSearchTerm(telefon);
  if (searchTerm.length < 6) return null;

  const result = await pd(`/persons/search?term=${encodeURIComponent(searchTerm)}&fields=phone&exact_match=false`);
  const items = result?.items || [];

  for (const it of items) {
    const person = it.item;
    const phones = person.phones && person.phones.length
      ? person.phones
      : (person.phone ? [{ value: person.phone }] : []);
    if (phones.some((p) => normalizePhone(p.value) === target)) {
      return person.id;
    }
  }

  for (const it of items) {
    const personId = it.item?.id;
    if (!personId) continue;
    try {
      const full = await pd(`/persons/${personId}`);
      const phones = full.phones || (full.phone ? [{ value: full.phone }] : []);
      if (phones.some((p) => normalizePhone(p.value) === target)) {
        return personId;
      }
    } catch {
      // ignorieren, nächsten Treffer prüfen
    }
  }

  return null;
}

async function findOpenDealForPerson(personId) {
  if (!personId) return null;
  const deals = await pd(`/persons/${personId}/deals?status=open`);
  if (!deals || !deals.length) return null;
  const inPipeline = PIPELINE_ID ? deals.find((d) => d.pipeline_id === PIPELINE_ID) : deals[0];
  return inPipeline ? inPipeline.id : null;
}

async function upsertPerson(payload) {
  const name = [payload.vorname, payload.nachname].filter(Boolean).join(" ") || payload.telefon || "Rechner-Lead";
  const customFields = await buildCustomFields("person", PERSON_FIELD_CONFIG, payload);
  const normalizedPhone = normalizePhone(payload.telefon);

  const body = {
    name,
    ...(payload.email ? { email: [{ value: payload.email, primary: true, label: "work" }] } : {}),
    ...(normalizedPhone ? { phone: [{ value: normalizedPhone, primary: true, label: "mobile" }] } : {}),
    ...customFields,
  };

  const existingId = await findPersonByPhone(payload.telefon);
  if (existingId) {
    return pd(`/persons/${existingId}`, { method: "PUT", body: JSON.stringify(body) });
  }
  return pd("/persons", { method: "POST", body: JSON.stringify(body) });
}

async function upsertDeal(payload, personId) {
  const name = [payload.vorname, payload.nachname].filter(Boolean).join(" ") || payload.telefon || "Rechner-Lead";
  const sparteLabel = payload.sparte === "gas" ? "Gas" : "Strom";
  const title = `${name} – ${sparteLabel} – ${payload.plz || ""}`.trim();

  // Custom Fields aus DEAL_FIELD_CONFIG (nicht-fixe Felder)
  const customFields = await buildCustomFields("deal", DEAL_FIELD_CONFIG, payload);

  // Feste Deal-Felder (Vorname, Nachname, Anrede, Telefon, Mail)
  await applyFixedDealFields(customFields, payload);

  const body = {
    title,
    person_id: personId,
    ...(PIPELINE_ID ? { pipeline_id: PIPELINE_ID } : {}),
    ...(STAGE_ID ? { stage_id: STAGE_ID } : {}),
    ...customFields,
  };

  const existingDealId = await findOpenDealForPerson(personId);
  if (existingDealId) {
    return pd(`/deals/${existingDealId}`, { method: "PUT", body: JSON.stringify(body) });
  }
  return pd("/deals", { method: "POST", body: JSON.stringify(body) });
}

/* ---------------------------------------------------------
   Datei-Uploads (Dokumente + Zählerfoto)
--------------------------------------------------------- */
function base64ToBlob(dataUrl, fallbackMime) {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl || "");
  const mime = match ? match[1] : fallbackMime || "application/octet-stream";
  const base64 = match ? match[2] : dataUrl;
  const buffer = Buffer.from(base64, "base64");
  return new Blob([buffer], { type: mime });
}

async function uploadFileToDeal(dealId, dataUrl, filename, mime) {
  if (!dataUrl || !dealId) return;
  try {
    const blob = base64ToBlob(dataUrl, mime);
    const form = new FormData();
    form.append("file", blob, filename || "upload");
    form.append("deal_id", String(dealId));

    const url = `${baseUrl()}/files?api_token=${PIPEDRIVE_TOKEN}`;
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) {
      console.error("Datei-Upload fehlgeschlagen:", filename, res.status);
    }
  } catch (e) {
    console.error("Datei-Upload-Fehler:", filename, e);
  }
}

/* ---------------------------------------------------------
   Handler
--------------------------------------------------------- */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!PIPEDRIVE_TOKEN) {
    console.error("PIPEDRIVE_API_TOKEN fehlt in den Vercel Environment Variables");
    return res.status(500).json({ error: "Server nicht konfiguriert" });
  }

  try {
    const payload = req.body || {};

    const person = await upsertPerson(payload);
    const deal = await upsertDeal(payload, person.id);

    if (Array.isArray(payload.dokumente)) {
      for (const doc of payload.dokumente) {
        await uploadFileToDeal(deal.id, doc.base64, doc.dateiname, doc.mimetype);
      }
    }
    if (payload.zaehler_foto) {
      await uploadFileToDeal(deal.id, payload.zaehler_foto, payload.zaehler_foto_dateiname, payload.zaehler_foto_mimetype);
    }

    return res.status(200).json({ ok: true, personId: person.id, dealId: deal.id });
  } catch (err) {
    console.error("submit-lead Fehler:", err);
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
