/**
 * Re-Encrypt-Migration für field-level verschlüsselte Spalten.
 *
 * Verschlüsselt bisher als Klartext gespeicherte Werte, bzw. verschlüsselt mit
 * dem AKTIVEN Key neu, wenn ein Wert noch mit einem älteren Key (Rotation)
 * verschlüsselt ist. Idempotent — mehrfach ausführbar.
 *
 * Voraussetzung: FIELD_ENCRYPTION_KEYS + FIELD_ENCRYPTION_ACTIVE gesetzt.
 *
 * Anzeigen (ändert nichts):  node scripts/reencrypt-fields.cjs
 * Wirklich schreiben:        node scripts/reencrypt-fields.cjs --write
 */
import { PrismaClient } from "@prisma/client";
import {
  encryptionConfigured,
  needsReencrypt,
  decryptField,
  encryptField,
} from "../src/lib/privacy/field-encryption";

const prisma = new PrismaClient();

async function main() {
  const write = process.argv.includes("--write");

  if (!encryptionConfigured()) {
    console.error("✖ FIELD_ENCRYPTION_KEYS/ACTIVE nicht gesetzt — Abbruch.");
    process.exit(1);
  }

  let scanned = 0;
  let toChange = 0;
  let changed = 0;

  // ── User.twoFactorSecret ──────────────────────────────────
  const users = await prisma.user.findMany({
    where: { twoFactorSecret: { not: null } },
    select: { id: true, twoFactorSecret: true },
  });
  for (const u of users) {
    scanned++;
    if (!u.twoFactorSecret || !needsReencrypt(u.twoFactorSecret)) continue;
    toChange++;
    const plain = decryptField(u.twoFactorSecret, "User.twoFactorSecret")!;
    const enc = encryptField(plain, "User.twoFactorSecret");
    if (write) {
      await prisma.user.update({ where: { id: u.id }, data: { twoFactorSecret: enc } });
      changed++;
    }
  }

  // ── SsoConfig.clientSecret ────────────────────────────────
  const ssos = await prisma.ssoConfig.findMany({
    select: { id: true, clientSecret: true },
  });
  for (const s of ssos) {
    scanned++;
    if (!needsReencrypt(s.clientSecret)) continue;
    toChange++;
    const plain = decryptField(s.clientSecret, "SsoConfig.clientSecret")!;
    const enc = encryptField(plain, "SsoConfig.clientSecret");
    if (write) {
      await prisma.ssoConfig.update({ where: { id: s.id }, data: { clientSecret: enc } });
      changed++;
    }
  }

  console.log(`\nGeprüft: ${scanned} | zu ändern: ${toChange} | geschrieben: ${changed}`);
  if (!write && toChange > 0) {
    console.log("Nichts geschrieben. Zum Anwenden erneut mit --write ausführen.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
