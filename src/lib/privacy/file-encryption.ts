/**
 * At-Rest-Verschlüsselung für hochgeladene Dateien (Art. 32 DSGVO).
 *
 * - AES-256-GCM (authentifiziert), pro Datei ein zufälliger 12-Byte-IV.
 * - Datei-Schlüssel wird per HKDF-SHA256 aus demselben Master-Key abgeleitet
 *   wie die Field-Encryption (Kontext "file:<version>") — keine neuen Secrets.
 * - Streaming über pipeline(): auch 500-MB-Uploads ohne RAM-Spitzen.
 * - Key-Versionierung wie bei der Field-Encryption (Rotation ohne Migration).
 *
 * Dateiformat auf der Platte:
 *   [6B Magic "MMENC1"] [1B Versions-Länge] [Version ascii] [12B IV]
 *   [Ciphertext …] [16B GCM-Auth-Tag]
 *
 * Ohne konfigurierte FIELD_ENCRYPTION_KEYS wird unverschlüsselt gespeichert
 * (graceful) — der Aufrufer prüft isFileEncryptionConfigured().
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";

const MAGIC = Buffer.from("MMENC1");
const IV_LEN = 12;
const TAG_LEN = 16;

function loadMasterKeys(): { keys: Map<string, Buffer>; active: string | null } {
  const raw = process.env.FIELD_ENCRYPTION_KEYS ?? "";
  const keys = new Map<string, Buffer>();
  for (const entry of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [version, b64] = entry.split(":");
    if (!version || !b64) continue;
    const key = Buffer.from(b64, "base64");
    if (key.length === 32) keys.set(version, key);
  }
  const active = process.env.FIELD_ENCRYPTION_ACTIVE || (keys.size ? [...keys.keys()].pop()! : null);
  return { keys, active };
}

function deriveFileKey(master: Buffer, version: string): Buffer {
  return Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), `file:${version}`, 32));
}

export function isFileEncryptionConfigured(): boolean {
  const { keys, active } = loadMasterKeys();
  return active !== null && keys.has(active);
}

/** Verschlüsselt src → dest (Streaming). Wirft, wenn keine Keys konfiguriert sind. */
export async function encryptFile(srcPath: string, destPath: string): Promise<void> {
  const { keys, active } = loadMasterKeys();
  if (!active || !keys.has(active)) throw new Error("FIELD_ENCRYPTION_KEYS nicht konfiguriert");

  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", deriveFileKey(keys.get(active)!, active), iv);

  const out = createWriteStream(destPath);
  const versionBuf = Buffer.from(active, "ascii");
  out.write(Buffer.concat([MAGIC, Buffer.from([versionBuf.length]), versionBuf, iv]));

  await pipeline(createReadStream(srcPath), cipher, out);
  // Auth-Tag ans Dateiende anhängen (nach pipeline ist der Cipher finalisiert)
  const fd = await open(destPath, "a");
  await fd.write(cipher.getAuthTag());
  await fd.close();
}

/** True, wenn die Datei mit unserem Format verschlüsselt ist. */
export async function isEncryptedFile(path: string): Promise<boolean> {
  const fd = await open(path, "r");
  try {
    const buf = Buffer.alloc(MAGIC.length);
    await fd.read(buf, 0, MAGIC.length, 0);
    return buf.equals(MAGIC);
  } finally {
    await fd.close();
  }
}

/**
 * Liefert einen entschlüsselnden Stream + die Klartext-Größe.
 * Der Auth-Tag wird vorab vom Dateiende gelesen und gesetzt — Manipulation
 * am Ciphertext lässt den Stream mit einem Fehler enden (kein stiller Müll).
 */
export async function createDecryptStream(path: string): Promise<{ stream: Readable; plainSize: number }> {
  const { keys } = loadMasterKeys();
  const { size } = await stat(path);

  const fd = await open(path, "r");
  try {
    // Header: Magic + Versions-Länge + Version + IV
    const head = Buffer.alloc(MAGIC.length + 1);
    await fd.read(head, 0, head.length, 0);
    if (!head.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Keine verschlüsselte Datei");
    const verLen = head[MAGIC.length];
    const verIv = Buffer.alloc(verLen + IV_LEN);
    await fd.read(verIv, 0, verIv.length, head.length);
    const version = verIv.subarray(0, verLen).toString("ascii");
    const iv = verIv.subarray(verLen);

    const master = keys.get(version);
    if (!master) throw new Error(`Unbekannte Key-Version "${version}" — FIELD_ENCRYPTION_KEYS prüfen`);

    // Auth-Tag vom Dateiende
    const tag = Buffer.alloc(TAG_LEN);
    await fd.read(tag, 0, TAG_LEN, size - TAG_LEN);

    const headerLen = head.length + verIv.length;
    const decipher = createDecipheriv("aes-256-gcm", deriveFileKey(master, version), iv);
    decipher.setAuthTag(tag);

    const cipherStream = createReadStream(path, { start: headerLen, end: size - TAG_LEN - 1 });
    return { stream: cipherStream.pipe(decipher), plainSize: size - headerLen - TAG_LEN };
  } finally {
    await fd.close();
  }
}
