/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Field-Level-Encryption für sensible DB-Spalten (Art. 32 DSGVO).
 *
 * - AES-256-GCM (authentifiziert), pro Feld ein zufälliger 12-Byte-IV.
 * - Feldspezifische Schlüssel werden per HKDF-SHA256 aus einem Master-Key
 *   abgeleitet (ein kompromittierter Feld-Kontext gibt nicht den Master preis).
 * - Key-Versionierung: der ciphertext trägt die Master-Key-Version, damit
 *   Rotation ohne Big-Bang-Migration möglich ist (alte Werte bleiben lesbar).
 *
 * Master-Keys aus ENV:
 *   FIELD_ENCRYPTION_KEYS = "v1:<base64-32-byte>,v2:<base64-32-byte>"
 *   FIELD_ENCRYPTION_ACTIVE = "v2"   (welche Version neu verschlüsselt)
 *
 * Wenn keine Keys gesetzt sind, wirft encrypt(); decrypt() gibt bereits
 * unverschlüsselte Alt-Werte unverändert zurück (Format-Erkennung), sodass die
 * Einführung schrittweise erfolgen kann.
 *
 * Format des gespeicherten Strings:
 *   enc:v<version>:<iv-b64>:<authTag-b64>:<ciphertext-b64>
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const PREFIX = "enc:";
const IV_LEN = 12;

type KeyMap = Map<string, Buffer>;

let cachedKeys: KeyMap | null = null;
let cachedActive: string | null = null;

function loadKeys(): { keys: KeyMap; active: string | null } {
  if (cachedKeys) return { keys: cachedKeys, active: cachedActive };

  const raw = process.env.FIELD_ENCRYPTION_KEYS ?? "";
  const keys: KeyMap = new Map();
  for (const entry of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [version, b64] = entry.split(":");
    if (!version || !b64) continue;
    const key = Buffer.from(b64, "base64");
    if (key.length !== 32) {
      throw new Error(`FIELD_ENCRYPTION_KEYS: Version ${version} ist kein 32-Byte-Key (base64).`);
    }
    keys.set(version, key);
  }

  const active = process.env.FIELD_ENCRYPTION_ACTIVE || (keys.size ? [...keys.keys()].pop()! : null);
  cachedKeys = keys;
  cachedActive = active;
  return { keys, active };
}

/** Feldspezifischen 32-Byte-Schlüssel aus dem Master-Key ableiten (HKDF). */
function deriveKey(master: Buffer, context: string): Buffer {
  // salt leer, info = Kontext (z.B. "User.twoFactorSecret")
  return Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), `mm-fle:${context}`, 32));
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptionConfigured(): boolean {
  return loadKeys().keys.size > 0;
}

/**
 * Verschlüsselt einen Klartext-Wert mit dem aktiven Master-Key.
 * @param context stabiler Feld-Kontext, z.B. "User.twoFactorSecret"
 */
export function encryptField(plain: string, context: string): string {
  const { keys, active } = loadKeys();
  if (!active || !keys.has(active)) {
    throw new Error("Field-Encryption nicht konfiguriert (FIELD_ENCRYPTION_KEYS/ACTIVE fehlen).");
  }
  const master = keys.get(active)!;
  const key = deriveKey(master, context);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${active}:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/**
 * Entschlüsselt einen Wert. Nicht verschlüsselte Alt-Werte (ohne Präfix) werden
 * unverändert zurückgegeben, damit die Migration schrittweise laufen kann.
 */
export function decryptField(value: string | null | undefined, context: string): string | null {
  if (value == null) return null;
  if (!value.startsWith(PREFIX)) return value; // Klartext-Altbestand

  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 4) throw new Error("Ungültiges FLE-Format.");
  const [version, ivB64, tagB64, ctB64] = parts;

  const { keys } = loadKeys();
  const master = keys.get(version);
  if (!master) throw new Error(`FLE: Key-Version ${version} nicht verfügbar.`);

  const key = deriveKey(master, context);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]);
  return pt.toString("utf8");
}

/** Version, mit der ein Wert verschlüsselt wurde (für Rotation). */
export function encryptedVersion(value: string): string | null {
  if (!value.startsWith(PREFIX)) return null;
  return value.slice(PREFIX.length).split(":")[0] ?? null;
}

/** Muss ein Wert neu verschlüsselt werden (nicht mit aktivem Key)? */
export function needsReencrypt(value: string | null | undefined): boolean {
  if (value == null || !isEncrypted(value)) return encryptionConfigured();
  const { active } = loadKeys();
  return active != null && encryptedVersion(value) !== active;
}

/** Nur für Tests — Key-Cache zurücksetzen. */
export function __resetKeyCache(): void {
  cachedKeys = null;
  cachedActive = null;
}

// ── Bequeme Feld-Helfer ──────────────────────────────────────
// Fester Kontext-String pro Feld. Verschlüsselung ist optional: solange keine
// Keys konfiguriert sind, wird Klartext gespeichert/gelesen (schrittweise
// Einführung). Sobald Keys da sind, werden neue Werte verschlüsselt.

function encMaybe(plain: string | null | undefined, context: string): string | null {
  if (plain == null) return null;
  return encryptionConfigured() ? encryptField(plain, context) : plain;
}

export const TwoFactorSecret = {
  encrypt: (v: string | null | undefined) => encMaybe(v, "User.twoFactorSecret"),
  decrypt: (v: string | null | undefined) => decryptField(v, "User.twoFactorSecret"),
};

export const SsoClientSecret = {
  encrypt: (v: string | null | undefined) => encMaybe(v, "SsoConfig.clientSecret"),
  decrypt: (v: string | null | undefined) => decryptField(v, "SsoConfig.clientSecret"),
};
