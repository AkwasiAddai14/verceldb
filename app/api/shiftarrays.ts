import { MongoClient, ObjectId } from "mongodb";

// ----- Connection cache (belangrijk voor performance/cold starts) -----
let client: MongoClient | null = null;
let initialized = false;

async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_NL_URL!);
    await client.connect();
  }
  const db = client.db(process.env.DB_NAME);
  if (!initialized) {
    initialized = true;
    // Unieke index op hash (dedupe). 'sparse' zodat docs zonder hash niet falen.
    await db.collection("shiftarrays").createIndex({ hash: 1 }, { unique: true, sparse: true });
  }
  return db;
}

// ----- Helpers -----
function toDate(v: any) {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00Z");
  const d = new Date(v);
  return isNaN(+d) ? undefined : d;
}
function toOid(v: any) {
  return typeof v === "string" && /^[a-f0-9]{24}$/i.test(v) ? new ObjectId(v) : v;
}
import crypto from "crypto";
function makeHash(doc: any) {
  const dateStr =
    doc.startingDate instanceof Date
      ? doc.startingDate.toISOString().slice(0, 10)
      : (doc.startingDate || "");
  const key = [doc.title, doc.adres, dateStr, doc.starting].join("|").toLowerCase();
  return crypto.createHash("sha1").update(key).digest("hex");
}

// ----- Handler -----
export default async function handler(req: any, res: any) {
  // Eenvoudige header-auth
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const db = await getDb();
    const col = db.collection("shiftArrays");

    if (req.method === "GET") {
      // Healthcheck
      return res.json({ ok: true });
    }

    // Payload klonen en casten
    const doc = { ...(req.body || {}) };
    doc.employer = toOid(doc.employer);
    doc.startingDate = toDate(doc.startingDate);
    doc.endingDate = toDate(doc.endingDate);

    // Hash voor dedupe (title+adres+startdatum+starttijd)
    if (!doc.hash) doc.hash = makeHash(doc);

    if (req.method === "POST") {
      // Insert (faalt bij duplicaat hash)
      doc.createdAt = new Date();
      const r = await col.insertOne(doc);
      return res.status(201).json({ insertedId: r.insertedId });
    }

    if (req.method === "PUT") {
      // Upsert (aanrader): update of insert wanneer nieuw
      const r = await col.findOneAndUpdate(
        { hash: doc.hash },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: "after" }
      );
      return res.json(r!.value);
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e: any) {
    // Duplicate key error netjes teruggeven
    if (e?.code === 11000) {
      return res.status(409).json({ error: "Duplicate (hash already exists)" });
    }
    return res.status(400).json({ error: e?.message || String(e) });
  }
}
