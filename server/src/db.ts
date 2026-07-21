import pg from "pg";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { drizzle as sqliteDrizzle } from "drizzle-orm/node-sqlite";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./db/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const isPg = Boolean(process.env.DATABASE_URL);

let drizzleInstance: any;
let pgPool: pg.Pool | null = null;
let sqliteDbInstance: DatabaseSync | null = null;
const databaseUrl = process.env.DATABASE_URL;
if (isPg && databaseUrl) {
  pgPool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase.co") || databaseUrl.includes("neon.tech") || process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
  });
  drizzleInstance = pgDrizzle({ client: pgPool });
} else {
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(__dirname, "../../data");
  fs.mkdirSync(dataDir, { recursive: true });
  sqliteDbInstance = new DatabaseSync(path.join(dataDir, "wyd-homestay.sqlite"));
  drizzleInstance = sqliteDrizzle({ client: sqliteDbInstance });
}
export const db = drizzleInstance;

export async function checkDbReady() {
  if (isPg && pgPool) {
    await pgPool.query("SELECT 1");
    return;
  }
  if (sqliteDbInstance) {
    sqliteDbInstance.prepare("SELECT 1").get();
    return;
  }
  throw new Error("Database is not initialized.");
}

// Dynamic table export mapping to SQLite or PostgreSQL
export const tables = {
  applications: isPg ? schema.pgApplications : schema.sqliteApplications,
  familyMembers: isPg ? schema.pgFamilyMembers : schema.sqliteFamilyMembers,
  hostCapabilities: isPg ? schema.pgHostCapabilities : schema.sqliteHostCapabilities,
  volunteers: isPg ? schema.pgVolunteers : schema.sqliteVolunteers,
  verificationCodes: isPg ? schema.pgVerificationCodes : schema.sqliteVerificationCodes,
  sessions: isPg ? schema.pgSessions : schema.sqliteSessions,
  auditLogs: isPg ? schema.pgAuditLogs : schema.sqliteAuditLogs,
  admins: isPg ? schema.pgAdmins : schema.sqliteAdmins,
  volunteerShifts: isPg ? schema.pgVolunteerShifts : schema.sqliteVolunteerShifts,
  volunteerShiftSignups: isPg ? schema.pgVolunteerShiftSignups : schema.sqliteVolunteerShiftSignups,
  pilgrims: isPg ? schema.pgPilgrims : schema.sqlitePilgrims,
  pilgrimMealLogs: isPg ? schema.pgPilgrimMealLogs : schema.sqlitePilgrimMealLogs,
  faqs: isPg ? schema.pgFaqs : schema.sqliteFaqs,
  qnaPosts: isPg ? schema.pgQnaPosts : schema.sqliteQnaPosts,
};

// Initialize DB schema
export async function initDb() {
  console.log("[DB] Performing database readiness and schema validation check...");
  if (isPg && pgPool) {
    const client = await pgPool.connect();
    try {
      // 1. Connection check
      await client.query("SELECT 1");
      // 2. Schema check - verify if 'admins' table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admins'
        );
      `);
      const exists = tableCheck.rows[0].exists;
      if (!exists) {
        throw new Error("The 'admins' table does not exist in PostgreSQL. Please run 'npm run db:setup' first.");
      }
      await client.query("ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS email_hash TEXT");
      await client.query(`
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS approved_by TEXT;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS approved_at TEXT;
      `);
      await client.query(`
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
        CREATE INDEX IF NOT EXISTS idx_volunteers_district ON volunteers(district_no, district_ban);
      `);
      await client.query(`
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
        CREATE INDEX IF NOT EXISTS idx_homestay_applications_district ON homestay_applications(district_no, district_ban);
      `);
      await client.query("CREATE INDEX IF NOT EXISTS idx_verification_codes_email_hash ON verification_codes(email_hash)");
      await client.query(`
        CREATE TABLE IF NOT EXISTS volunteer_shifts (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
          start_at TEXT NOT NULL, end_at TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open',
          created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS volunteer_shift_signups (
          id TEXT PRIMARY KEY, shift_id TEXT NOT NULL REFERENCES volunteer_shifts(id) ON DELETE CASCADE,
          volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'registered', created_at TEXT NOT NULL,
          UNIQUE(shift_id, volunteer_id)
        );
        CREATE TABLE IF NOT EXISTS pilgrims (
          id TEXT PRIMARY KEY, pilgrim_no TEXT UNIQUE NOT NULL, name TEXT NOT NULL, baptismal_name TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '', preferred_language TEXT NOT NULL DEFAULT 'en', access_token TEXT, access_token_hash TEXT UNIQUE, access_token_expires_at TEXT, gender TEXT NOT NULL,
          diocese TEXT NOT NULL, region TEXT NOT NULL, grade TEXT NOT NULL, age INTEGER NOT NULL,
          diet_type TEXT NOT NULL DEFAULT '일반식', diet_notes TEXT NOT NULL DEFAULT '', allergies TEXT NOT NULL DEFAULT '',
          health_notes TEXT NOT NULL DEFAULT '', fever_status TEXT NOT NULL DEFAULT '정상',
          host_application_id TEXT REFERENCES homestay_applications(id) ON DELETE SET NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pilgrim_meal_logs (
          id TEXT PRIMARY KEY, pilgrim_id TEXT NOT NULL REFERENCES pilgrims(id) ON DELETE CASCADE,
          meal_type TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', recorded_by TEXT NOT NULL, recorded_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS faqs (
          id TEXT PRIMARY KEY, category TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0, published BOOLEAN NOT NULL DEFAULT TRUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS qna_posts (
          id TEXT PRIMARY KEY, author_name TEXT NOT NULL, password_hash TEXT NOT NULL, category TEXT NOT NULL,
          title TEXT NOT NULL, content TEXT NOT NULL, answer TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'waiting',
          created_at TEXT NOT NULL, answered_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_shift_start ON volunteer_shifts(start_at);
        CREATE INDEX IF NOT EXISTS idx_shift_signup_volunteer ON volunteer_shift_signups(volunteer_id);
        CREATE INDEX IF NOT EXISTS idx_pilgrims_host ON pilgrims(host_application_id);
        CREATE INDEX IF NOT EXISTS idx_meal_logs_pilgrim ON pilgrim_meal_logs(pilgrim_id, recorded_at);
        CREATE INDEX IF NOT EXISTS idx_qna_status ON qna_posts(status, created_at);
      `);
      await client.query(`
        ALTER TABLE pilgrims ADD COLUMN IF NOT EXISTS baptismal_name TEXT NOT NULL DEFAULT '';
        ALTER TABLE pilgrims ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
        ALTER TABLE pilgrims ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';
        ALTER TABLE pilgrims ADD COLUMN IF NOT EXISTS access_token TEXT;
        ALTER TABLE pilgrims ADD COLUMN IF NOT EXISTS access_token_hash TEXT;
        ALTER TABLE pilgrims ADD COLUMN IF NOT EXISTS access_token_expires_at TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_pilgrims_access_token_hash ON pilgrims(access_token_hash);
      `);
      console.log("[DB] PostgreSQL database is ready and schema validation passed.");
    } catch (err) {
      console.error("[DB] Database readiness check failed!");
      throw err;
    } finally {
      client.release();
    }
  } else if (sqliteDbInstance) {
    try {
      // 1. Connection check
      sqliteDbInstance.prepare("SELECT 1").get();
      // 2. Schema check - verify if 'admins' table exists
      const tableCheck = sqliteDbInstance.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='admins'"
      ).get() as { name: string } | undefined;
      
      if (!tableCheck) {
        throw new Error("The 'admins' table does not exist in SQLite. Please run 'npm run db:setup' first.");
      }
      const verificationColumns = sqliteDbInstance.prepare("PRAGMA table_info(verification_codes)").all() as Array<{ name: string }>;
      if (!verificationColumns.some((column) => column.name === "email_hash")) {
        sqliteDbInstance.exec("ALTER TABLE verification_codes ADD COLUMN email_hash TEXT");
      }
      const adminColumns = sqliteDbInstance.prepare("PRAGMA table_info(admins)").all() as Array<{ name: string }>;
      const adminMigrationColumns: Array<[string, string]> = [
        ["status", "TEXT NOT NULL DEFAULT 'approved'"],
        ["approved_by", "TEXT"],
        ["approved_at", "TEXT"]
      ];
      for (const [name, definition] of adminMigrationColumns) {
        if (!adminColumns.some((column) => column.name === name)) {
          sqliteDbInstance.exec(`ALTER TABLE admins ADD COLUMN ${name} ${definition}`);
        }
      }
      const applicationColumns = sqliteDbInstance.prepare("PRAGMA table_info(homestay_applications)").all() as Array<{ name: string }>;
      const districtColumns: Array<[string, string]> = [
        ["district_no", "TEXT NOT NULL DEFAULT '99'"],
        ["district_name", "TEXT NOT NULL DEFAULT '구역외'"],
        ["district_ban", "TEXT NOT NULL DEFAULT '99-1'"],
        ["district_label", "TEXT NOT NULL DEFAULT '구역외 (99구역)'"],
        ["district_confidence", "TEXT NOT NULL DEFAULT 'low'"],
        ["district_reason", "TEXT"]
      ];
      for (const [name, definition] of districtColumns) {
        if (!applicationColumns.some((column) => column.name === name)) {
          sqliteDbInstance.exec(`ALTER TABLE homestay_applications ADD COLUMN ${name} ${definition}`);
        }
      }
      sqliteDbInstance.exec(`
        UPDATE homestay_applications
        SET district_no = '99',
            district_ban = '99-1',
            district_label = '구역외 (99구역)'
        WHERE district_no = '13'
          AND (district_name = '구역외' OR district_label = '구역외 (13구역)')
      `);
      sqliteDbInstance.exec("CREATE INDEX IF NOT EXISTS idx_homestay_applications_district ON homestay_applications(district_no, district_ban)");
      const volunteerColumns = sqliteDbInstance.prepare("PRAGMA table_info(volunteers)").all() as Array<{ name: string }>;
      for (const [name, definition] of districtColumns) {
        if (!volunteerColumns.some((column) => column.name === name)) {
          sqliteDbInstance.exec(`ALTER TABLE volunteers ADD COLUMN ${name} ${definition}`);
        }
      }
      sqliteDbInstance.exec("CREATE INDEX IF NOT EXISTS idx_volunteers_district ON volunteers(district_no, district_ban)");
      sqliteDbInstance.exec("CREATE INDEX IF NOT EXISTS idx_verification_codes_email_hash ON verification_codes(email_hash)");
      sqliteDbInstance.exec(`
        CREATE TABLE IF NOT EXISTS volunteer_shifts (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
          start_at TEXT NOT NULL, end_at TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open',
          created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS volunteer_shift_signups (
          id TEXT PRIMARY KEY, shift_id TEXT NOT NULL REFERENCES volunteer_shifts(id) ON DELETE CASCADE,
          volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'registered', created_at TEXT NOT NULL,
          UNIQUE(shift_id, volunteer_id)
        );
        CREATE TABLE IF NOT EXISTS pilgrims (
          id TEXT PRIMARY KEY, pilgrim_no TEXT UNIQUE NOT NULL, name TEXT NOT NULL, baptismal_name TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '', preferred_language TEXT NOT NULL DEFAULT 'en', access_token TEXT, access_token_hash TEXT UNIQUE, access_token_expires_at TEXT, gender TEXT NOT NULL,
          diocese TEXT NOT NULL, region TEXT NOT NULL, grade TEXT NOT NULL, age INTEGER NOT NULL,
          diet_type TEXT NOT NULL DEFAULT '일반식', diet_notes TEXT NOT NULL DEFAULT '', allergies TEXT NOT NULL DEFAULT '',
          health_notes TEXT NOT NULL DEFAULT '', fever_status TEXT NOT NULL DEFAULT '정상', host_application_id TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pilgrim_meal_logs (
          id TEXT PRIMARY KEY, pilgrim_id TEXT NOT NULL REFERENCES pilgrims(id) ON DELETE CASCADE,
          meal_type TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', recorded_by TEXT NOT NULL, recorded_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS faqs (
          id TEXT PRIMARY KEY, category TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS qna_posts (
          id TEXT PRIMARY KEY, author_name TEXT NOT NULL, password_hash TEXT NOT NULL, category TEXT NOT NULL,
          title TEXT NOT NULL, content TEXT NOT NULL, answer TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'waiting',
          created_at TEXT NOT NULL, answered_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_shift_start ON volunteer_shifts(start_at);
        CREATE INDEX IF NOT EXISTS idx_shift_signup_volunteer ON volunteer_shift_signups(volunteer_id);
        CREATE INDEX IF NOT EXISTS idx_pilgrims_host ON pilgrims(host_application_id);
        CREATE INDEX IF NOT EXISTS idx_meal_logs_pilgrim ON pilgrim_meal_logs(pilgrim_id, recorded_at);
        CREATE INDEX IF NOT EXISTS idx_qna_status ON qna_posts(status, created_at);
      `);
      const pilgrimColumns = sqliteDbInstance.prepare("PRAGMA table_info(pilgrims)").all() as Array<{ name: string }>;
      const pilgrimMigrationColumns: Array<[string, string]> = [
        ["baptismal_name", "TEXT NOT NULL DEFAULT ''"], ["email", "TEXT NOT NULL DEFAULT ''"],
        ["preferred_language", "TEXT NOT NULL DEFAULT 'en'"], ["access_token", "TEXT"],
        ["access_token_hash", "TEXT"], ["access_token_expires_at", "TEXT"]
      ];
      for (const [name, definition] of pilgrimMigrationColumns) {
        if (!pilgrimColumns.some((column) => column.name === name)) sqliteDbInstance.exec(`ALTER TABLE pilgrims ADD COLUMN ${name} ${definition}`);
      }
      sqliteDbInstance.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_pilgrims_access_token_hash ON pilgrims(access_token_hash)");
      console.log("[DB] SQLite database is ready and schema validation passed.");
    } catch (err) {
      console.error("[DB] Database readiness check failed!");
      throw err;
    }
  }
}
