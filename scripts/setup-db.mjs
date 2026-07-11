import { pbkdf2Sync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const passwordIterations = 210_000;

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, passwordIterations, 64, "sha512").toString("hex");
  return `pbkdf2-sha512$${passwordIterations}$${salt}$${hash}`;
}

function initialAdminConfig() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (email && password) return { email, password };
  return null;
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
        district_no TEXT NOT NULL DEFAULT '99',
        district_name TEXT NOT NULL DEFAULT '구역외',
        district_ban TEXT NOT NULL DEFAULT '99-1',
        district_label TEXT NOT NULL DEFAULT '구역외 (99구역)',
        district_confidence TEXT NOT NULL DEFAULT 'low',
        district_reason TEXT,
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
        parish_group TEXT,
        affiliation TEXT,
        postcode TEXT,
        address TEXT NOT NULL,
        address_detail TEXT,
        district_no TEXT NOT NULL DEFAULT '99',
        district_name TEXT NOT NULL DEFAULT '구역외',
        district_ban TEXT NOT NULL DEFAULT '99-1',
        district_label TEXT NOT NULL DEFAULT '구역외 (99구역)',
        district_confidence TEXT NOT NULL DEFAULT 'low',
        district_reason TEXT,
        support_fields TEXT NOT NULL,
        support_language TEXT,
        availability TEXT NOT NULL,
        experience TEXT NOT NULL,
        privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
        applied_date TEXT NOT NULL,
        signature_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        canceled_at TEXT,
        applicant_pin TEXT NOT NULL DEFAULT ''
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
        status TEXT NOT NULL DEFAULT 'approved',
        approved_by TEXT,
        approved_at TEXT,
        mfa_secret TEXT NOT NULL,
        mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS email_hash TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS approved_by TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS approved_at TEXT;
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS parish_group TEXT;
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS affiliation TEXT;
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_no TEXT NOT NULL DEFAULT '99';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_name TEXT NOT NULL DEFAULT '구역외';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_ban TEXT NOT NULL DEFAULT '99-1';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_label TEXT NOT NULL DEFAULT '구역외 (99구역)';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_confidence TEXT NOT NULL DEFAULT 'low';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_reason TEXT;
      ALTER TABLE volunteers ALTER COLUMN district_no SET DEFAULT '99';
      ALTER TABLE volunteers ALTER COLUMN district_name SET DEFAULT '구역외';
      ALTER TABLE volunteers ALTER COLUMN district_ban SET DEFAULT '99-1';
      ALTER TABLE volunteers ALTER COLUMN district_label SET DEFAULT '구역외 (99구역)';
      ALTER TABLE homestay_applications ADD COLUMN IF NOT EXISTS district_no TEXT NOT NULL DEFAULT '99';
      ALTER TABLE homestay_applications ADD COLUMN IF NOT EXISTS district_name TEXT NOT NULL DEFAULT '구역외';
      ALTER TABLE homestay_applications ADD COLUMN IF NOT EXISTS district_ban TEXT NOT NULL DEFAULT '99-1';
      ALTER TABLE homestay_applications ADD COLUMN IF NOT EXISTS district_label TEXT NOT NULL DEFAULT '구역외 (99구역)';
      ALTER TABLE homestay_applications ADD COLUMN IF NOT EXISTS district_confidence TEXT NOT NULL DEFAULT 'low';
      ALTER TABLE homestay_applications ADD COLUMN IF NOT EXISTS district_reason TEXT;
      ALTER TABLE homestay_applications ALTER COLUMN district_no SET DEFAULT '99';
      ALTER TABLE homestay_applications ALTER COLUMN district_name SET DEFAULT '구역외';
      ALTER TABLE homestay_applications ALTER COLUMN district_ban SET DEFAULT '99-1';
      ALTER TABLE homestay_applications ALTER COLUMN district_label SET DEFAULT '구역외 (99구역)';
      UPDATE homestay_applications
      SET district_no = '99',
          district_ban = '99-1',
          district_label = '구역외 (99구역)'
      WHERE district_no = '13'
        AND (district_name = '구역외' OR district_label = '구역외 (13구역)');

      CREATE INDEX IF NOT EXISTS idx_homestay_applications_email ON homestay_applications(email);
      CREATE INDEX IF NOT EXISTS idx_homestay_applications_lookup ON homestay_applications(rep_name, phone);
      CREATE INDEX IF NOT EXISTS idx_homestay_applications_status ON homestay_applications(status);
      CREATE INDEX IF NOT EXISTS idx_homestay_applications_district ON homestay_applications(district_no, district_ban);
      CREATE INDEX IF NOT EXISTS idx_capabilities_lookup ON host_capabilities(capability_key, capability_value);
      CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
      CREATE INDEX IF NOT EXISTS idx_volunteers_lookup ON volunteers(name, phone);
      CREATE INDEX IF NOT EXISTS idx_volunteers_district ON volunteers(district_no, district_ban);
      CREATE INDEX IF NOT EXISTS idx_verification_codes_email_hash ON verification_codes(email_hash);
    `);

    // Migration patch for PostgreSQL
    await client.query(`
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS applicant_pin TEXT NOT NULL DEFAULT '';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS parish_group TEXT;
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS affiliation TEXT;
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_no TEXT NOT NULL DEFAULT '99';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_name TEXT NOT NULL DEFAULT '구역외';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_ban TEXT NOT NULL DEFAULT '99-1';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_label TEXT NOT NULL DEFAULT '구역외 (99구역)';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_confidence TEXT NOT NULL DEFAULT 'low';
      ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS district_reason TEXT;
    `);

    // Check if initial admin exists
    const checkRes = await client.query("SELECT COUNT(*) FROM admins");
    const count = parseInt(checkRes.rows[0].count, 10);
    if (count === 0) {
      const initialAdmin = initialAdminConfig();
      if (!initialAdmin) {
        console.log("[SEED] No admin found, but INITIAL_ADMIN_EMAIL/PASSWORD are not set. Production admin seeding skipped.");
        return;
      }
      const passwordHash = hashPassword(initialAdmin.password);
      const mfaSecret = generateTotpSecret();
      const id = randomBytes(16).toString("hex");
      const now = new Date().toISOString();

      await client.query(
        "INSERT INTO admins (id, email, password_hash, role, status, approved_at, mfa_secret, mfa_enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [id, initialAdmin.email, passwordHash, "privacy_admin", "approved", now, mfaSecret, false, now, now]
      );
      console.log(`[SEED] Seeded initial administrator account:`);
      console.log(`[SEED] Email: ${initialAdmin.email}`);
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
        district_no TEXT NOT NULL DEFAULT '99',
        district_name TEXT NOT NULL DEFAULT '구역외',
        district_ban TEXT NOT NULL DEFAULT '99-1',
        district_label TEXT NOT NULL DEFAULT '구역외 (99구역)',
        district_confidence TEXT NOT NULL DEFAULT 'low',
        district_reason TEXT,
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
        parish_group TEXT,
        affiliation TEXT,
        postcode TEXT,
        address TEXT NOT NULL,
        address_detail TEXT,
        district_no TEXT NOT NULL DEFAULT '99',
        district_name TEXT NOT NULL DEFAULT '구역외',
        district_ban TEXT NOT NULL DEFAULT '99-1',
        district_label TEXT NOT NULL DEFAULT '구역외 (99구역)',
        district_confidence TEXT NOT NULL DEFAULT 'low',
        district_reason TEXT,
        support_fields TEXT NOT NULL,
        support_language TEXT,
        availability TEXT NOT NULL,
        experience TEXT NOT NULL,
        privacy_consent INTEGER NOT NULL,
        applied_date TEXT NOT NULL,
        signature_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        canceled_at TEXT,
        applicant_pin TEXT NOT NULL DEFAULT ''
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
        status TEXT NOT NULL DEFAULT 'approved',
        approved_by TEXT,
        approved_at TEXT,
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
    const districtColumns = [
      ["district_no", "TEXT NOT NULL DEFAULT '99'"],
      ["district_name", "TEXT NOT NULL DEFAULT '구역외'"],
      ["district_ban", "TEXT NOT NULL DEFAULT '99-1'"],
      ["district_label", "TEXT NOT NULL DEFAULT '구역외 (99구역)'"],
      ["district_confidence", "TEXT NOT NULL DEFAULT 'low'"],
      ["district_reason", "TEXT"]
    ];
    for (const [name, definition] of districtColumns) {
      if (!applicationColumns.some((column) => column.name === name)) {
        db.exec(`ALTER TABLE homestay_applications ADD COLUMN ${name} ${definition}`);
      }
    }
    db.exec(`
      UPDATE homestay_applications
      SET district_no = '99',
          district_ban = '99-1',
          district_label = '구역외 (99구역)'
      WHERE district_no = '13'
        AND (district_name = '구역외' OR district_label = '구역외 (13구역)')
    `);
    const volunteerColumns = db.prepare("PRAGMA table_info(volunteers)").all();
    if (!volunteerColumns.some((column) => column.name === "applicant_pin")) {
      db.exec("ALTER TABLE volunteers ADD COLUMN applicant_pin TEXT NOT NULL DEFAULT ''");
    }
    const volunteerMigrationColumns = [
      ["parish_group", "TEXT"],
      ["affiliation", "TEXT"],
      ["district_no", "TEXT NOT NULL DEFAULT '99'"],
      ["district_name", "TEXT NOT NULL DEFAULT '구역외'"],
      ["district_ban", "TEXT NOT NULL DEFAULT '99-1'"],
      ["district_label", "TEXT NOT NULL DEFAULT '구역외 (99구역)'"],
      ["district_confidence", "TEXT NOT NULL DEFAULT 'low'"],
      ["district_reason", "TEXT"]
    ];
    for (const [name, definition] of volunteerMigrationColumns) {
      if (!volunteerColumns.some((column) => column.name === name)) {
        db.exec(`ALTER TABLE volunteers ADD COLUMN ${name} ${definition}`);
      }
    }
    const verificationColumns = db.prepare("PRAGMA table_info(verification_codes)").all();
    if (!verificationColumns.some((column) => column.name === "email_hash")) {
      db.exec("ALTER TABLE verification_codes ADD COLUMN email_hash TEXT");
    }
    const adminColumns = db.prepare("PRAGMA table_info(admins)").all();
    const adminMigrationColumns = [
      ["status", "TEXT NOT NULL DEFAULT 'approved'"],
      ["approved_by", "TEXT"],
      ["approved_at", "TEXT"]
    ];
    for (const [name, definition] of adminMigrationColumns) {
      if (!adminColumns.some((column) => column.name === name)) {
        db.exec(`ALTER TABLE admins ADD COLUMN ${name} ${definition}`);
      }
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_homestay_applications_district ON homestay_applications(district_no, district_ban)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_volunteers_district ON volunteers(district_no, district_ban)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_verification_codes_email_hash ON verification_codes(email_hash)");

    // Check if initial admin exists
    const checkRes = db.prepare("SELECT COUNT(*) as count FROM admins").get();
    if (checkRes.count === 0) {
      const initialAdmin = initialAdminConfig();
      if (!initialAdmin) {
        console.log("[SEED] No admin found, but INITIAL_ADMIN_EMAIL/PASSWORD are not set. Production admin seeding skipped.");
        return;
      }
      const passwordHash = hashPassword(initialAdmin.password);
      const mfaSecret = generateTotpSecret();
      const id = randomBytes(16).toString("hex");
      const now = new Date().toISOString();

      db.prepare(
        "INSERT INTO admins (id, email, password_hash, role, status, approved_at, mfa_secret, mfa_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(id, initialAdmin.email, passwordHash, "privacy_admin", "approved", now, mfaSecret, 0, now, now);
      console.log(`[SEED] Seeded initial administrator account:`);
      console.log(`[SEED] Email: ${initialAdmin.email}`);
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
