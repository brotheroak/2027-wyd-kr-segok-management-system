import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { generateTotpSecret, verifyTotp } from "./totp.js";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(value: string) {
  let bits = 0;
  let current = 0;
  const bytes: number[] = [];
  for (const char of value.replace(/=+$/, "").toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("invalid base32");
    current = (current << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((current >> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function totp(secret: string, epochSeconds: number) {
  const counter = Math.floor(epochSeconds / 30);
  const counterBuffer = Buffer.alloc(8);
  let temp = counter;
  for (let index = 7; index >= 0; index--) {
    counterBuffer[index] = temp & 0xff;
    temp >>= 8;
  }
  const hmac = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1_000_000;
  return String(code).padStart(6, "0");
}

test("TOTP secret은 Google Authenticator 호환 base32 형식이다", () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]+$/);
  assert.equal(secret.length, 16);
});

test("TOTP 검증은 현재 시간대의 올바른 6자리 코드만 허용한다", () => {
  const originalNow = Date.now;
  const fixedEpoch = 1_772_630_400;
  const secret = "JBSWY3DPEHPK3PXP";
  Date.now = () => fixedEpoch * 1000;
  try {
    assert.equal(verifyTotp(secret, totp(secret, fixedEpoch), 0), true);
    assert.equal(verifyTotp(secret, "000000", 0), false);
  } finally {
    Date.now = originalNow;
  }
});

test("TOTP 검증은 잘못된 secret을 실패 처리한다", () => {
  assert.equal(verifyTotp("INVALID!", "123456"), false);
});
