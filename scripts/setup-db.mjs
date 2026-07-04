import { pbkdf2Sync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function generateTotpSecret() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = randomBytes(10);
  let result = "";
  let value = 0;
  let bits = 0;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  return result;
}

const isPg = Boolean(process.env.DATABASE_URL);
const databaseUrl = process.env.DATABASE_URL;

async function setupPg() {
  console.log("[SETUP] Connecting to PostgreSQL database...");
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase.co") || databaseUrl.includes("neon.tech") || process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const client = await pool.connect();
  try {
    console.log("[SETUP] Creating tables & indexes...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS homestay_applications (
        id TEXT PRIMARY KEY,
        application_no TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted',
        rep_name TEXT NOT NULL,
        baptismal_name TEXT,
        gender TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        applicant_pin TEXT NOT NULL DEFAULT '',
        postcode TEXT,
        address TEXT NOT NULL,
        address_detail TEXT,
        household_total INTEGER NOT NULL,
        housing_type TEXT NOT NULL,
        housing_type_other TEXT,
        has_pet BOOLEAN NOT NULL DEFAULT FALSE,
        pet_description TEXT,
        languages TEXT NOT NULL,
        preferred_gender TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        has_bed BOOLEAN NOT NULL DEFAULT FALSE,
        space_description TEXT NOT NULL,
        consent_checks TEXT NOT NULL,
        signature_name TEXT NOT NULL,
        applied_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        canceled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES homestay_applications(id) ON DELETE CASCADE,
        relationship TEXT NOT NULL,
        name TEXT NOT NULL,
        baptismal_name TEXT,
        birth_date TEXT NOT NULL,
        gender TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS host_capabilities (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES homestay_applications(id) ON DELETE CASCADE,
        capability_key TEXT NOT NULL,
        capability_value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS volunteers (
        id TEXT PRIMARY KEY,
        volunteer_no TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted',
        name TEXT NOT NULL,
        baptismal_name TEXT,
        gender TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        postcode TEXT,
        address TEXT NOT NULL,
        address_detail TEXT,
        support_fields TEXT NOT NULL,
        support_language TEXT,
        availability TEXT NOT NULL,
        experience TEXT NOT NULL,
        privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
        applied_date TEXT NOT NULL,
        signature_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        canceled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS verification_codes (
        email TEXT PRIMARY KEY,
        email_hash TEXT,
        code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        application_id TEXT,
        detail TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        mfa_secret TEXT NOT NULL,
        mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS email_hash TEXT;

      CREATE INDEX IF NOT EXISTS idx_homestay_applications_email ON homestay_applications(email);
      CREATE INDEX IF NOT EXISTS idx_homestay_applications_lookup ON homestay_applications(rep_name, phone);
      CREATE INDEX IF NOT EXISTS idx_homestay_applications_status ON homestay_applications(status);
      CREATE INDEX IF NOT EXISTS idx_capabilities_lookup ON host_capabilities(capability_key, capability_value);
      CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
      CREATE INDEX IF NOT EXISTS idx_volunteers_lookup ON volunteers(name, phone);
      CREATE INDEX IF NOT EXISTS idx_verification_codes_email_hash ON verification_codes(email_hash);
    `);

    // Check if initial admin exists
    const checkRes = await client.query("SELECT COUNT(*) FROM admins");
    const count = parseInt(checkRes.rows[0].count, 10);
    if (count === 0) {
      const email = "brotheroak@gmail.com";
      const defaultPassword = "admin2027!";
      const passwordHash = hashPassword(defaultPassword);
      const mfaSecret = generateTotpSecret();
      const id = randomBytes(16).toString("hex");
      const now = new Date().toISOString();

      await client.query(
        "INSERT INTO admins (id, email, password_hash, role, mfa_secret, mfa_enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [id, email, passwordHash, "privacy_admin", mfaSecret, false, now, now]
      );
      console.log(`[SEED] Seeded initial administrator account:`);
      console.log(`[SEED] Email: ${email}`);
      console.log(`[SEED] Temp Password: ${defaultPassword}`);
      console.log(`[SEED] MFA Secret (Scan in Authenticator on first login): ${mfaSecret}`);
    } else {
      console.log("[SEED] Administrator table is not empty. Seeding skipped.");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

function setupSqlite() {
  console.log("[SETUP] Connecting to SQLite database...");
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(__dirname, "../data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "wyd-homestay.sqlite");
  
  const db = new DatabaseSync(dbPath);
  try {
    console.log("[SETUP] Creating tables & indexes...");
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS homestay_applications (
        id TEXT PRIMARY KEY,
        application_no TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted',
        rep_name TEXT NOT NULL,
        baptismal_name TEXT,
        gender TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        applicant_pin TEXT NOT NULL DEFAULT '',
        postcode TEXT,
        address TEXT NOT NULL,
        address_detail TEXT,
        household_total INTEGER NOT NULL,
        housing_type TEXT NOT NULL,
        housing_type_other TEXT,
        has_pet INTEGER NOT NULL,
        pet_description TEXT,
        languages TEXT NOT NULL,
        preferred_gender TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        has_bed INTEGER NOT NULL,
        space_description TEXT NOT NULL,
        consent_checks TEXT NOT NULL,
        signature_name TEXT NOT NULL,
        applied_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        canceled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        relationship TEXT NOT NULL,
        name TEXT NOT NULL,
        baptismal_name TEXT,
        birth_date TEXT NOT NULL,
        gender TEXT NOT NULL,
        FOREIGN KEY (application_id) REFERENCES homestay_applications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS host_capabilities (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        capability_key TEXT NOT NULL,
        capability_value TEXT NOT NULL,
        FOREIGN KEY (application_id) REFERENCES homestay_applications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS volunteers (
        id TEXT PRIMARY KEY,
        volunteer_no TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted',
        name TEXT NOT NULL,
        baptismal_name TEXT,
        gender TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        postcode TEXT,
        address TEXT NOT NULL,
        address_detail TEXT,
        support_fields TEXT NOT NULL,
        support_language TEXT,
        availability TEXT NOT NULL,
        experience TEXT NOT NULL,
        privacy_consent INTEGER NOT NULL,
        applied_date TEXT NOT NULL,
        signature_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        canceled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS verification_codes (
        email TEXT PRIMARY KEY,
        email_hash TEXT,
        code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        application_id TEXT,
        detail TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        mfa_secret TEXT NOT NULL,
        mfa_enabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_homestay_applications_email ON homestay_applications(email);
      CREATE INDEX IF NOT EXISTS idx_homestay_applications_lookup ON homestay_applications(rep_name, phone);
      CREATE INDEX IF NOT EXISTS idx_homestay_applications_status ON homestay_applications(status);
      CREATE INDEX IF NOT EXISTS idx_capabilities_lookup ON host_capabilities(capability_key, capability_value);
      CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
      CREATE INDEX IF NOT EXISTS idx_volunteers_lookup ON volunteers(name, phone);
    `);

    // Migration patches for SQLite
    const applicationColumns = db.prepare("PRAGMA table_info(homestay_applications)").all();
    if (!applicationColumns.some((column) => column.name === "applicant_pin")) {
      db.exec("ALTER TABLE homestay_applications ADD COLUMN applicant_pin TEXT NOT NULL DEFAULT ''");
    }
    const verificationColumns = db.prepare("PRAGMA table_info(verification_codes)").all();
    if (!verificationColumns.some((column) => column.name === "email_hash")) {
      db.exec("ALTER TABLE verification_codes ADD COLUMN email_hash TEXT");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_verification_codes_email_hash ON verification_codes(email_hash)");

    // Check if initial admin exists
    const checkRes = db.prepare("SELECT COUNT(*) as count FROM admins").get();
    if (checkRes.count === 0) {
      const email = "brotheroak@gmail.com";
      const defaultPassword = "admin2027!";
      const passwordHash = hashPassword(defaultPassword);
      const mfaSecret = generateTotpSecret();
      const id = randomBytes(16).toString("hex");
      const now = new Date().toISOString();

      db.prepare(
        "INSERT INTO admins (id, email, password_hash, role, mfa_secret, mfa_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(id, email, passwordHash, "privacy_admin", mfaSecret, 0, now, now);
      console.log(`[SEED] Seeded initial administrator account:`);
      console.log(`[SEED] Email: ${email}`);
      console.log(`[SEED] Temp Password: ${defaultPassword}`);
      console.log(`[SEED] MFA Secret (Scan in Authenticator on first login): ${mfaSecret}`);
    } else {
      console.log("[SEED] Administrator table is not empty. Seeding skipped.");
    }
  } finally {
    db.close();
  }
}

async function main() {
  if (isPg) {
    await setupPg();
  } else {
    setupSqlite();
  }
  console.log("[SETUP] Database setup completed successfully!");
}

main().catch((err) => {
  console.error("[SETUP] Setup failed:", err);
  process.exit(1);
});
