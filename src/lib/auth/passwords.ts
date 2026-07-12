/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Passwort-Hashing mit scrypt (OWASP-empfohlen, wie Argon2id/bcrypt).
 *
 * Parameter sind im Hash kodiert, damit der Cost später erhöht werden kann,
 * ohne bestehende Hashes zu brechen (schrittweises Re-Hashing beim Login via
 * `needsRehash()`). Format:
 *
 *   scrypt$N$r$p$<salt-hex>$<hash-hex>      (neu, versioniert)
 *   scrypt$<salt-hex>$<hash-hex>            (Legacy, N=16384/r=8/p=1)
 */

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const KEY_LEN = 64;
const SALT_LEN = 16;

// Aktuelle Kostenparameter (OWASP-Minimum: N=2^15). Erhöhbar; Legacy-Hashes
// mit N=2^14 werden weiter akzeptiert und beim nächsten Login re-gehasht.
const CURRENT = { N: 32768, r: 8, p: 1 };
const LEGACY = { N: 16384, r: 8, p: 1 };

// maxmem großzügig bemessen (scrypt braucht ~128*N*r Bytes).
function maxmem(N: number, r: number): number {
  return 256 * N * r + 1024 * 1024;
}

export async function hashPassword(plain: string): Promise<string> {
  const { N, r, p } = CURRENT;
  const salt = randomBytes(SALT_LEN);
  const derived = await scrypt(plain, salt, KEY_LEN, { N, r, p, maxmem: maxmem(N, r) });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function parseStored(stored: string): { N: number; r: number; p: number; salt: Buffer; hash: Buffer } | null {
  const parts = stored.split("$");
  if (parts[0] !== "scrypt") return null;

  // Neu: scrypt$N$r$p$salt$hash  (6 Teile)
  if (parts.length === 6) {
    const N = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3]);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return null;
    return { N, r, p, salt: Buffer.from(parts[4], "hex"), hash: Buffer.from(parts[5], "hex") };
  }
  // Legacy: scrypt$salt$hash  (3 Teile)
  if (parts.length === 3) {
    return { ...LEGACY, salt: Buffer.from(parts[1], "hex"), hash: Buffer.from(parts[2], "hex") };
  }
  return null;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parsed = parseStored(stored);
  if (!parsed) return false;
  const { N, r, p, salt, hash } = parsed;
  if (hash.length !== KEY_LEN) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(plain, salt, KEY_LEN, { N, r, p, maxmem: maxmem(N, r) });
  } catch {
    return false;
  }
  return derived.length === hash.length && timingSafeEqual(derived, hash);
}

/**
 * True, wenn der gespeicherte Hash schwächere Parameter als aktuell nutzt
 * (Legacy-Format oder kleineres N). Aufrufer sollten dann nach erfolgreichem
 * Login mit dem Klartext-Passwort neu hashen und speichern.
 */
export function needsRehash(stored: string): boolean {
  const parsed = parseStored(stored);
  if (!parsed) return true;
  return parsed.N < CURRENT.N || parsed.r !== CURRENT.r || parsed.p !== CURRENT.p;
}
