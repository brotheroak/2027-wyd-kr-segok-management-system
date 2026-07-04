import { pbkdf2Sync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const passwordIterations = 210_000;
const superAdminEmails = new Set(["brotheroak@gmail.com", "livelab21@nate.com"]);

// Simple base32 encoder for TOTP secret generation
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

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, passwordIterations, 64, "sha512").toString("hex");
  return `pbkdf2-sha512$${passwordIterations}$${salt}$${hash}`;
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const role = process.argv[4] || "admin"; // admin, privacy_admin, or super_admin

  if (!email || !password) {
    console.error("사용법: node scripts/create-admin.mjs <이메일> <비밀번호> [admin|privacy_admin]");
    process.exit(1);
  }

  if (!["admin", "privacy_admin", "super_admin"].includes(role)) {
    console.error("역할(role)은 admin, privacy_admin 또는 super_admin이어야 합니다.");
    process.exit(1);
  }

  if (role === "super_admin" && !superAdminEmails.has(email.toLowerCase())) {
    console.error("super_admin 역할은 brotheroak@gmail.com 또는 livelab21@nate.com 계정에만 부여할 수 있습니다.");
    process.exit(1);
  }

  const isPg = Boolean(process.env.DATABASE_URL);
  const passwordHash = hashPassword(password);
  const mfaSecret = generateTotpSecret();
  const id = randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  console.log(`데이터베이스 타입: ${isPg ? "PostgreSQL" : "SQLite"}`);
  console.log(`이메일: ${email}`);
  console.log(`역할: ${role}`);
  console.log(`임시 MFA Secret: ${mfaSecret} (로그인 후 OTP 등록 가능)`);

  if (isPg) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("supabase.co") || process.env.DATABASE_URL.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : undefined,
    });
    try {
      await pool.query(`
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS approved_by TEXT;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS approved_at TEXT;
      `);
      await pool.query(
        `INSERT INTO admins (id, email, password_hash, role, status, approved_at, mfa_secret, mfa_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'approved', $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, status = 'approved', approved_at = EXCLUDED.approved_at, updated_at = EXCLUDED.updated_at`,
        [id, email, passwordHash, role, now, mfaSecret, false, now, now]
      );
      console.log("PostgreSQL 어드민 계정이 성공적으로 등록/업데이트되었습니다.");
    } catch (error) {
      console.error("PostgreSQL 등록 실패:", error);
    } finally {
      await pool.end();
    }
  } else {
    const dataDir = process.env.DATA_DIR
      ? path.resolve(process.env.DATA_DIR)
      : path.resolve(__dirname, "../data");
    fs.mkdirSync(dataDir, { recursive: true });
    const sqlitePath = path.join(dataDir, "wyd-homestay.sqlite");
    const db = new DatabaseSync(sqlitePath);
    try {
      // Ensure admins table exists
      db.exec(`
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
        )
      `);
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
      
      const insert = db.prepare(`
        INSERT OR REPLACE INTO admins (id, email, password_hash, role, status, approved_at, mfa_secret, mfa_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'approved', ?, ?, 0, ?, ?)
      `);
      insert.run(id, email, passwordHash, role, now, mfaSecret, now, now);
      console.log("SQLite 어드민 계정이 성공적으로 등록/업데이트되었습니다.");
    } catch (error) {
      console.error("SQLite 등록 실패:", error);
    }
  }
}

main();
