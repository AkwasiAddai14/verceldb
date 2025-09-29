// api/_db.ts
import { MongoClient, Db } from "mongodb";

/**
 * Deze helper:
 * - Leest ALLE env-keys van vorm MONGODB_<CC>_URL (CC = 2-letter landcode)
 * - Leest optioneel MONGODB_<CC>_DB als db-naam per land
 * - Valt terug op DEFAULT_URI / MONGO_URI en DB_NAME
 * - Cachet per land 1 MongoClient
 * - Biedt readCountry(req), getDbByCountry(code) en ensureIndexes(...)
 */


// Houd bij welke clients al connected zijn (optioneel; scheelt no-ops)
const connected = new WeakSet<MongoClient>();
async function ensureConnected(client: MongoClient) {
  if (!connected.has(client)) {
    await client.connect();
    connected.add(client);
  }
}



// --------- ENV & helpers ---------
const DEFAULT_URI =
  process.env.DEFAULT_URI || process.env.MONGO_URI || null;
const DEFAULT_DB = process.env.DB_NAME || null;
const DEFAULT_COUNTRY = (process.env.DEFAULT_COUNTRY || "").toUpperCase() || null;

// Clients cache per landcode; aparte fallback client
const clients = new Map<string, MongoClient>();
let fallbackClient: MongoClient | null = null;

// Eenmalige index-initialisatie per db:collection
const initialized = new Set<string>();

// Build mapping dynamisch uit process.env
type CountryEntry = { uri: string; db?: string };
const COUNTRY_MAP: Record<string, CountryEntry> = (() => {
  const map: Record<string, CountryEntry> = {};
  for (const [k, v] of Object.entries(process.env)) {
    const m = /^MONGODB_([A-Z]{2})_URL$/.exec(k);
    if (!m || !v) continue;
    const cc = m[1]; // landcode
    const dbKey = `MONGODB_${cc}_DB`;
    const dbName = process.env[dbKey]; // optioneel
    map[cc] = { uri: v, db: dbName || undefined };
  }
  return map;
})();

function norm(v?: string) {
  return String(v || "").trim().toUpperCase();
}

/** Lees land uit header/query/body met prioriteit header > query > body */
export function readCountry(req: any): string | undefined {
  return (
    (req.headers?.["x-country"] as string) ??
    (req.query?.country as string) ??
    req.body?.country ??
    req.body?.adres?.country
  );
}

async function getClientFor(code?: string): Promise<MongoClient> {
  const cc = norm(code);

  const entry = COUNTRY_MAP[cc];
  if (entry?.uri) {
    let client = clients.get(cc);
    if (!client) {
      client = new MongoClient(entry.uri);
      clients.set(cc, client);
    }
    await ensureConnected(client);     // <— ipv client.topology-check
    return client;
  }

  // Fallback
  if (!DEFAULT_URI) {
    const known = Object.keys(COUNTRY_MAP).join(", ") || "(none)";
    throw new Error(
      `Unknown country "${cc}" and no DEFAULT_URI configured. Known countries: ${known}`
    );
  }
  if (!fallbackClient) {
    fallbackClient = new MongoClient(DEFAULT_URI);
  }
  await ensureConnected(fallbackClient);  // <— idem
  return fallbackClient;
}


/** Haal een Db instance obv landcode; met nette fallbacks */
export async function getDbByCountry(country?: string): Promise<Db> {
  // 1) expliciet meegegeven country
  // 2) DEFAULT_COUNTRY (optioneel)
  const cc = norm(country || DEFAULT_COUNTRY || undefined);

  const entry = COUNTRY_MAP[cc];
  const client = await getClientFor(cc);

  // Bepaal db-naam:
  // - per land via MONGODB_<CC>_DB
  // - anders globale DB_NAME
  // - als die ook ontbreekt -> error
  const dbName = entry?.db || DEFAULT_DB;
  if (!dbName) {
    throw new Error(
      `No DB name configured. Set MONGODB_${cc}_DB for country "${cc}" or fallback DB_NAME.`
    );
  }
  return client.db(dbName);
}

/**
 * Roep deze in je route één keer per collection aan:
 * await ensureIndexes(db.databaseName, "vacancies", async (col) => {
 *   await col.createIndex({ hash: 1 }, { unique: true });
 * });
 */
export async function ensureIndexes(
  dbName: string,
  collection: string,
  create: (col: any) => Promise<void>
) {
  const key = `${dbName}:${collection}`;
  if (initialized.has(key)) return;

  // Kies een bestaande client of maak (fallback) er één
  const client =
    [...clients.values()][0] ||
    fallbackClient ||
    (DEFAULT_URI ? new MongoClient(DEFAULT_URI) : null);

  if (!client) {
    throw new Error("No MongoClient available to create indexes.");
  }

  await ensureConnected(client);   // <— ipv client.topology-check

  const col = client.db(dbName).collection(collection);
  await create(col);
  initialized.add(key);
}


// (optioneel) kleine debug-helper
export function logDbChoice(db: Db, country?: string) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[db] ${db.databaseName} (country=${country || "-"})`);
  }
}
