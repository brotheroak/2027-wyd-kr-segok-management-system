import { createHmac, randomBytes } from "node:crypto";

// Base32 Alphabet for Google Authenticator / TOTP
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generates a random Base32 encoded 16-character secret key.
 */
export function generateTotpSecret(): string {
  const bytes = randomBytes(10); // 80 bits, enough for TOTP
  let result = "";
  let value = 0;
  let bits = 0;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return result;
}

/**
 * Decodes a Base32 encoded string into a Buffer.
 */
function decodeBase32(base32: string): Buffer {
  const cleanBase32 = base32.toUpperCase().replace(/=+$/, "");
  const length = cleanBase32.length;
  let bits = 0;
  let value = 0;
  let index = 0;
  const buffer = Buffer.alloc(Math.floor((length * 5) / 8));
  for (let i = 0; i < length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleanBase32[i]);
    if (val === -1) {
      throw new Error("Invalid base32 character");
    }
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      buffer[index++] = (value >> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return buffer;
}

/**
 * Verifies a 6-digit TOTP token against a secret.
 * @param secret The Base32-encoded secret key
 * @param token The 6-digit code submitted by the user
 * @param window The time step window size (default: 1 step of 30 seconds before/after)
 */
export function verifyTotp(secret: string, token: string, window = 1): boolean {
  try {
    const key = decodeBase32(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / 30);

    for (let i = -window; i <= window; i++) {
      const currentCounter = counter + i;
      const counterBuffer = Buffer.alloc(8);
      
      // Write the 64-bit integer counter in big-endian format
      let temp = currentCounter;
      for (let j = 7; j >= 0; j--) {
        counterBuffer[j] = temp & 0xff;
        temp = temp >> 8;
      }

      const hmac = createHmac("sha1", key).update(counterBuffer).digest();
      const offset = hmac[hmac.length - 1] & 0xf;
      const code = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
      ) % 1000000;

      if (String(code).padStart(6, "0") === token.trim()) {
        return true;
      }
    }
  } catch (error) {
    return false;
  }
  return false;
}
