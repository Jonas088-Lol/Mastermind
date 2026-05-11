/**
 * RFC 6238 TOTP (Time-Based One-Time Password) Verifier.
 *
 * - HMAC-SHA1, 30-Sek-Step, 6 Stellen — kompatibel zu Google Authenticator,
 *   1Password, Authy, Bitwarden, Microsoft Authenticator.
 * - Verify mit ±1-Step-Toleranz (90-Sek-Fenster) gegen Clock-Drift.
 * - Secret-Generation: 20 zufällige Bytes, base32-encoded.
 * - QR-Code wird nicht inline erzeugt — wir geben nur die otpauth-URL aus,
 *   die der User in jede Authenticator-App scannen kann (oder via beliebiger
 *   QR-Lib client-seitig rendert).
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;
const ISSUER = "MasterMind";

/* ── Base32 ──────────────────────────────────────────────────── */

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

export function base32Decode(str: string): Buffer {
  const cleaned = str.replace(/[\s=]/g, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error(`Ungültiges Base32-Zeichen: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/* ── TOTP-Core ───────────────────────────────────────────────── */

function counterBuffer(counter: number): Buffer {
  const buf = Buffer.alloc(8);
  // JavaScript-Number kann keine 64 Bit halten — wir füllen die hohen Bytes
  // mit Math.floor und die niedrigen mit Bitwise. Counter passt bis 2^53.
  let n = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = n & 0xff;
    n = Math.floor(n / 256);
  }
  return buf;
}

function generateOtp(secret: Buffer, counter: number, digits = DIGITS): string {
  const hmac = createHmac("sha1", secret).update(counterBuffer(counter)).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = 10 ** digits;
  return (code % mod).toString().padStart(digits, "0");
}

function currentCounter(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

/* ── Public API ──────────────────────────────────────────────── */

export interface TotpSetup {
  /** Base32-Secret zum Speichern in der DB */
  secret: string;
  /** otpauth-URL für QR-Code-Generation */
  otpauthUrl: string;
}

export function generateTotpSecret(accountLabel: string): TotpSetup {
  const secret = base32Encode(randomBytes(20));
  const otpauthUrl =
    `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(accountLabel)}` +
    `?secret=${secret}` +
    `&issuer=${encodeURIComponent(ISSUER)}` +
    `&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
  return { secret, otpauthUrl };
}

/**
 * Verifiziert einen 6-stelligen Code gegen das gespeicherte Secret.
 * Toleranz: ±1 Step (90 Sek total). Konstantzeit-Vergleich.
 */
export function verifyTotp(secretBase32: string, code: string): boolean {
  const cleaned = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;

  let secret: Buffer;
  try {
    secret = base32Decode(secretBase32);
  } catch {
    return false;
  }

  const counter = currentCounter();
  const expected = Buffer.from(cleaned, "utf8");
  for (const offset of [-1, 0, 1] as const) {
    const candidate = generateOtp(secret, counter + offset);
    const candidateBuf = Buffer.from(candidate, "utf8");
    if (
      candidateBuf.length === expected.length &&
      timingSafeEqual(candidateBuf, expected)
    ) {
      return true;
    }
  }
  return false;
}
