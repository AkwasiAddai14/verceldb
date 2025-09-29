// api/employers.ts
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
    // Unieke indexen voor dedupe en snelle lookups
   
    await db.collection("employers").createIndex({ email: 1 }, { unique: false, sparse: true });
    await db.collection("employers").createIndex({ city: 1 }, { sparse: true });
    await db.collection("employers").createIndex({ name: "text", displayname: "text", bio: "text" });
  };
  return db;
}

// ---------- helpers ----------
const clean = (v: any) => (typeof v === "string" ? v.trim() : v);
const lower = (v: any) => (typeof v === "string" ? v.trim().toLowerCase() : v);
const toOid = (v: any) =>
  typeof v === "string" && /^[a-f0-9]{24}$/i.test(v) ? new ObjectId(v) : v;
const toOidArray = (arr: any) =>
  Array.isArray(arr) ? arr.map(toOid).filter(Boolean) : [];

function sanitizeEmployer(input: any) {
  const doc: any = { ...input };

  // basisvelden
  doc.clerkId = clean(doc.clerkId);
  doc.name = clean(doc.name);
  doc.displayname = clean(doc.displayname);
  doc.bio = typeof doc.bio === "string" ? doc.bio : (doc.bio ?? "");
  doc.country = clean(doc.country);
  doc.profilephoto = clean(doc.profilephoto);
  doc.CompanyRegistrationNumber = clean(doc.CompanyRegistrationNumber);
  doc.VATidnr = clean(doc.VATidnr);
  doc.postcode = clean(doc.postcode);
  doc.housenumber = clean(doc.housenumber);
  doc.city = clean(doc.city);
  doc.street = clean(doc.street);
  doc.phone = clean(doc.phone);
  doc.email = lower(doc.email);
  doc.iban = clean(doc.iban);

  // booleans & numbers met defaults
  if (typeof doc.onboarded !== "boolean") doc.onboarded = !!doc.onboarded;
  if (typeof doc.ratingCount !== "number") doc.ratingCount = Number.isFinite(+doc.ratingCount) ? +doc.ratingCount : 0;
  if (typeof doc.rating !== "number") doc.rating = Number.isFinite(+doc.rating) ? +doc.rating : 5;

  // refs
  doc.invoices   = toOidArray(doc.invoices);
  doc.filialen   = toOidArray(doc.filialen);
  doc.flexpools  = toOidArray(doc.flexpools);
  doc.shifts     = toOidArray(doc.shifts);
  doc.checkouts  = toOidArray(doc.checkouts);
  doc.vacancies  = toOidArray(doc.vacancies);
  doc.applications = toOidArray(doc.applications);
  doc.jobs       = toOidArray(doc.jobs);

  return doc;
}

// ---------- handler ----------
export default async function handler(req: any, res: any) {
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") return res.json({ ok: true });

  try {
    
   const country = readCountry(req);
   const db = await getDbByCountry(country);
   const col = db.collection("employers"); // of "employees"
   await ensureIndexes(db.databaseName, "employers", async (c) => {
   await c.createIndex({ clerkId: 1 }, { unique: true, sparse: false });
   await c.createIndex({ CompanyRegistrationNumber: 1 }, { unique: true, sparse: true }); // alleen employers
   })
    const body = req.body || {};
    const doc = sanitizeEmployer(body);

    // upsert-key (primair clerkId; CRN als fallback)
    const hasClerk = !!doc.clerkId;
    const hasCRN = !!doc.CompanyRegistrationNumber;

    if (req.method === "POST") {
      if (!hasClerk) return res.status(400).json({ error: "clerkId is required for insert" });
      doc.createdAt = new Date();
      const r = await col.insertOne(doc);
      return res.status(201).json({ insertedId: r.insertedId });
    }

    if (req.method === "PUT") {
      if (!hasClerk && !hasCRN) {
        return res.status(400).json({ error: "Provide clerkId or CompanyRegistrationNumber for upsert" });
      }
      const filter =
        (hasClerk ? { clerkId: doc.clerkId } : { CompanyRegistrationNumber: doc.CompanyRegistrationNumber });

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
      return res.status(409).json({ error: "Duplicate key (clerkId or CompanyRegistrationNumber)" });
    }
    return res.status(400).json({ error: e?.message || String(e) });
  }
}
