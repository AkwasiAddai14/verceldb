// api/employees.ts
import { MongoClient, ObjectId } from "mongodb";
import { getDbByCountry, ensureIndexes, readCountry } from "./_db";

// ---------- connection cache ----------
let client: MongoClient | null = null;
let initialized = false;

async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
  }
  const db = client.db(process.env.DB_NAME);
  if (!initialized) {
    initialized = true;
    // Unieke index op clerkId (dedupe/upsert-key)
    await db.collection("employees").createIndex({ clerkId: 1 }, { unique: true, sparse: false });
    // Handige indexes (optioneel, lichtgewicht):
    await db.collection("employees").createIndex({ email: 1 }, { sparse: true });
    await db.collection("employees").createIndex({ city: 1 }, { sparse: true });
  }
  return db;
}

// ---------- helpers ----------
const toOid = (v: any) =>
  (typeof v === "string" && /^[a-f0-9]{24}$/i.test(v)) ? new ObjectId(v) : v;

const toDate = (v: any) => {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00Z");
  const d = new Date(v);
  return isNaN(+d) ? undefined : d;
};

const cleanStr = (v: any) => (typeof v === "string" ? v.trim() : v);
const lowerEmail = (v: any) => (typeof v === "string" ? v.trim().toLowerCase() : v);

// cast array van OIDs
const toOidArray = (arr: any) =>
  Array.isArray(arr) ? arr.map(toOid).filter(Boolean) : [];

// normaliseer subdocument arrays
function sanitizeExperience(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    bedrijf: cleanStr(x?.bedrijf) || "",
    functie: cleanStr(x?.functie) || "",
    duur: cleanStr(x?.duur) || "",
  })).filter(e => e.bedrijf || e.functie || e.duur);
}

function sanitizeSkills(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => ({ vaardigheid: cleanStr(x?.vaardigheid) || "" }))
    .filter(s => s.vaardigheid);
}

function sanitizeEducation(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    naam: cleanStr(x?.naam) || "",
    school: cleanStr(x?.school) || "",
    niveau: cleanStr(x?.niveau) || "",
  })).filter(e => e.naam || e.school || e.niveau);
}

// NB: jouw schema heeft in de interface een typefout "punctualiy",
// en in het schema "punctuality". We mappen beide naar "punctuality".
function pickPunctuality(doc: any) {
  if (typeof doc?.punctuality === "number") return doc.punctuality;
  if (typeof doc?.punctualiy === "number") return doc.punctualiy;
  return undefined;
}

// hoofd-sanitizer
function sanitizeEmployee(input: any) {
  const doc: any = { ...input };

  // basisstrings
  doc.clerkId   = cleanStr(doc.clerkId);
  doc.firstname = cleanStr(doc.firstname);
  doc.infix     = cleanStr(doc.infix);
  doc.lastname  = cleanStr(doc.lastname);
  doc.country   = cleanStr(doc.country);
  doc.phone     = cleanStr(doc.phone);
  doc.email     = lowerEmail(doc.email);
  doc.SocialSecurity = cleanStr(doc.SocialSecurity);
  doc.companyRegistrationNumber = cleanStr(doc.companyRegistrationNumber);
  doc.VATidnr   = cleanStr(doc.VATidnr);
  doc.iban      = cleanStr(doc.iban);
  doc.postcode  = cleanStr(doc.postcode);
  doc.housenumber = cleanStr(doc.housenumber);
  doc.street    = cleanStr(doc.street);
  doc.city      = cleanStr(doc.city);
  doc.profilephoto = cleanStr(doc.profilephoto);
  doc.bio       = typeof doc.bio === "string" ? doc.bio : (doc.bio ?? "");

  // booleans met defaults
  if (typeof doc.taxBenefits !== "boolean") doc.taxBenefits = !!doc.taxBenefits;
  if (typeof doc.SalaryTaxDiscount !== "boolean") doc.SalaryTaxDiscount = !!doc.SalaryTaxDiscount;
  if (typeof doc.onboarded !== "boolean") doc.onboarded = !!doc.onboarded;

  // numbers met defaults waar logisch
  if (typeof doc.ratingCount !== "number") doc.ratingCount = Number.isFinite(+doc.ratingCount) ? +doc.ratingCount : 0;
  if (typeof doc.rating !== "number") doc.rating = Number.isFinite(+doc.rating) ? +doc.rating : 5;
  if (typeof doc.attendance !== "number") doc.attendance = Number.isFinite(+doc.attendance) ? +doc.attendance : 100;
  const punc = pickPunctuality(doc);
  doc.punctuality = (typeof punc === "number") ? punc : 100;

  // datums
  doc.dateOfBirth = toDate(doc.dateOfBirth);

  // ObjectId-collections
  doc.flexpools   = toOidArray(doc.flexpools);
  doc.shifts      = toOidArray(doc.shifts);
  doc.checkouts   = toOidArray(doc.checkouts);
  doc.invoices    = toOidArray(doc.invoices);
  // jouw schema heeft "sollicitaties" & "jobs"
  doc.sollicitaties = toOidArray(doc.sollicitaties || doc.applications); // alias
  doc.jobs        = toOidArray(doc.jobs || doc.job);

  // samengestelde arrays
  doc.experience  = sanitizeExperience(doc.experience);
  doc.skills      = sanitizeSkills(doc.skills);
  doc.education   = sanitizeEducation(doc.education);

  return doc;
}

// ---------- handler ----------
export default async function handler(req: any, res: any) {
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") return res.json({ ok: true });

  try {
    const country = readCountry(req);            // <<— lees land
    const db = await getDbByCountry(country);    // <<— kies db obv land
    const col = db.collection("employees");
    
    // indexes per db (eenmalig)    
    await ensureIndexes(db.databaseName, "employers", async (c) => {
    await c.createIndex({ clerkId: 1 }, { unique: true, sparse: false });
    await c.createIndex({ SocialSecurity: 1 }, { unique: true, sparse: true }); // alleen employers
    });
    const body = req.body || {};
    const doc = sanitizeEmployee(body);

    if (!doc.clerkId) {
      return res.status(400).json({ error: "clerkId is required (upsert key)" });
    }

    if (req.method === "POST") {
      // Insert: faalt op duplicate clerkId
      doc.createdAt = new Date();
      const r = await col.insertOne(doc);
      return res.status(201).json({ insertedId: r.insertedId });
    }

    if (req.method === "PUT") {
      // Upsert: primair op clerkId; als _id is meegegeven en valide, kun je daarop upserten
      const filter =
        (body._id && typeof body._id === "string" && /^[a-f0-9]{24}$/i.test(body._id))
          ? { _id: new ObjectId(body._id) }
          : { clerkId: doc.clerkId };

      const r = await col.findOneAndUpdate(
        filter,
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: "after" }
      );
      return res.json(r!.value);
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ error: "Duplicate (clerkId already exists)" });
    }
    return res.status(400).json({ error: e?.message || String(e) });
  }
}
