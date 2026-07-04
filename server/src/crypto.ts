import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const encryptedPrefix = "enc:v1:";
const rawKey = process.env.DATA_ENCRYPTION_KEY ?? "";

function keyFromEnv() {
  if (!rawKey) return null;
  if (/^[A-Za-z0-9+/=]{44}$/.test(rawKey)) {
    const decoded = Buffer.from(rawKey, "base64");
    if (decoded.length === 32) return decoded;
  }
  return createHash("sha256").update(rawKey).digest();
}

const key = keyFromEnv();

export function encryptionEnabled() {
  return Boolean(key);
}

export function requireEncryptionKeyInProduction() {
  if (process.env.NODE_ENV === "production" && !key) {
    throw new Error("DATA_ENCRYPTION_KEY must be set before running with NODE_ENV=production.");
  }
}

export function encryptText(value = "") {
  if (!value || !key || value.startsWith(encryptedPrefix)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${encryptedPrefix}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

export function decryptText(value = "") {
  if (!value || !value.startsWith(encryptedPrefix)) return value;
  if (!key) return "";
  const payload = Buffer.from(value.slice(encryptedPrefix.length), "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
