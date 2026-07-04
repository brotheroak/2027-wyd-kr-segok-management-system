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
      await client.query("CREATE INDEX IF NOT EXISTS idx_verification_codes_email_hash ON verification_codes(email_hash)");
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
      sqliteDbInstance.exec("CREATE INDEX IF NOT EXISTS idx_verification_codes_email_hash ON verification_codes(email_hash)");
      console.log("[DB] SQLite database is ready and schema validation passed.");
    } catch (err) {
      console.error("[DB] Database readiness check failed!");
      throw err;
    }
  }
}
