// api/vacancies.ts
import { MongoClient, ObjectId } from "mongodb";
import crypto from "crypto";
import { getDbByCountry, ensureIndexes, readCountry } from "./_db";

// ---------- Connection cache ----------
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
    // Unieke index op hash voor dedupe (sparse => niet verplicht)
    await db.collection("vacancies").createIndex({ hash: 1 }, { unique: true, sparse: true });
    // Handige zoekindexen (optioneel):
    await db.collection("vacancies").createIndex({ "adres.city": 1, startingDate: 1 }, { sparse: true });
    await db.collection("vacancies").createIndex({ title: "text", function: "text", description: "text" });
  }
  return db;
}

// ---------- Helpers ----------
const toOid = (v: any) =>
  typeof v === "string" && /^[a-f0-9]{24}$/i.test(v) ? new ObjectId(v) : v;

function toDate(v: any) {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00Z");
  const d = new Date(v);
  return isNaN(+d) ? undefined : d;
}

function normTime(t: any) {
  // verwacht "HH:MM"
  if (typeof t !== "string") return undefined;
  const m = t.trim().match(/^([01]\d|2[0-3]):[0-5]\d$/);
  return m ? m[0] : undefined;
}

function toInt(v: any) {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const n = parseInt(v.replace(/[^\d\-]/g, ""), 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function sanitizeAdres(adres: any) {
  const a = adres || {};
  return {
    street: String(a.street || "").trim(),
    housenumber: String(a.housenumber || "").trim(),
    postcode: String(a.postcode || "").trim(),
    city: String(a.city || "").trim(),
  };
}

function sanitizeTimes(times: any[]): Array<{ starting: string; ending: string; break?: number }> {
  if (!Array.isArray(times)) return [];
  return times.map((t) => {
    const starting = normTime(t?.starting);
    const ending = normTime(t?.ending);
    const brk = toInt(t?.break);
    const out: any = {};
    if (starting) out.starting = starting;
    if (ending) out.ending = ending;
    if (typeof brk === "number" && brk >= 0) out.break = brk;
    return out;
  }).filter(t => t.starting && t.ending);
}

function sanitizeSurcharges(s: any[]) {
  if (!Array.isArray(s)) return [];
  return s.map((x) => ({
    surcharge: !!x?.surcharge,
    surchargeType: toInt(x?.surchargeType),
    surchargePercentage: typeof x?.surchargePercentage === "number"
      ? x.surchargePercentage
      : Number.parseFloat(String(x?.surchargePercentage || "0")),
    surchargeVan: normTime(x?.surchargeVan),
    surchargeTot: normTime(x?.surchargeTot),
  }));
}

function makeHash(doc: any) {
  // Dedupe op: title + adres (samengevoegd) + startingDate (YYYY-MM-DD) + eerste times.starting
  const dateStr = doc.startingDate instanceof Date
    ? doc.startingDate.toISOString().slice(0, 10)
    : (doc.startingDate || "");
  const time0 = Array.isArray(doc.times) && doc.times[0]?.starting ? doc.times[0].starting : "";
  const adresKey = [doc.adres?.street, doc.adres?.housenumber, doc.adres?.postcode, doc.adres?.city]
    .filter(Boolean).join(" ").toLowerCase();
  const key = [doc.title, adresKey, dateStr, time0].join("|").toLowerCase();
  return crypto.createHash("sha1").update(key).digest("hex");
}

// ---------- Handler ----------
export default async function handler(req: any, res: any) {
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") return res.json({ ok: true });

  try {
    const country = readCountry(req);            // <<— lees land
    const db = await getDbByCountry(country);    // <<— kies db obv land
    const col = db.collection("vacancies");

     // indexes per db (eenmalig)
    await ensureIndexes(db.databaseName, "vacancies", async (c) => {
      await c.createIndex({ hash: 1 }, { unique: true, sparse: true });
      await c.createIndex({ "adres.city": 1, startingDate: 1 }, { sparse: true });
      await c.createIndex({ title: "text", function: "text", description: "text" });
    });

    // Payload kopiëren en casten
    const body = req.body || {};
    const doc: any = { ...body };

    // ObjectIds
    doc.employer = toOid(doc.employer);
    if (Array.isArray(doc.applications)) doc.applications = doc.applications.map(toOid).filter(Boolean);
    if (Array.isArray(doc.jobs))         doc.jobs         = doc.jobs.map(toOid).filter(Boolean);

    // Dates
    doc.startingDate = toDate(doc.startingDate);
    doc.endingDate   = toDate(doc.endingDate);

    // Structs
    doc.adres = sanitizeAdres(doc.adres);
    doc.times = sanitizeTimes(doc.times);
    doc.surcharges = sanitizeSurcharges(doc.surcharges);

    // Flags / defaults (laat validatie verder aan DB/app over)
    if (typeof doc.available !== "boolean") doc.available = true;

    // Hash voor dedupe
    if (!doc.hash) doc.hash = makeHash(doc);

    if (req.method === "POST") {
      // Insert, faalt bij duplicate hash
      doc.createdAt = new Date();
      const r = await col.insertOne(doc);
      return res.status(201).json({ insertedId: r.insertedId });
    }

    if (req.method === "PUT") {
      // Upsert (preferred)
      const r = await col.findOneAndUpdate(
        { hash: doc.hash },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: "after" }
      );
      return res.json(r!.value);
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ error: "Duplicate (hash already exists)" });
    }
    return res.status(400).json({ error: e?.message || String(e) });
  }
}
