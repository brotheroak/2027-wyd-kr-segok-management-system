import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const algorithm = "pbkdf2-sha512";
export const passwordIterations = 210_000;
const keyLength = 64;
const legacyIterations = 1_000;

function derive(password: string, salt: string, iterations: number) {
  return pbkdf2Sync(password, salt, iterations, keyLength, "sha512");
}

function safeEqualHex(actual: Buffer, expectedHex: string) {
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = derive(password, salt, passwordIterations).toString("hex");
  return `${algorithm}$${passwordIterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const modern = stored.split("$");
  if (modern.length === 4 && modern[0] === algorithm) {
    const iterations = Number(modern[1]);
    if (!Number.isInteger(iterations) || iterations < legacyIterations) return false;
    const actual = derive(password, modern[2], iterations);
    return safeEqualHex(actual, modern[3]);
  }

  const legacy = stored.split(":");
  if (legacy.length === 2) {
    const actual = derive(password, legacy[0], legacyIterations);
    return safeEqualHex(actual, legacy[1]);
  }

  return false;
}
