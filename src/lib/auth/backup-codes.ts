/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * 2FA-Backup-Codes.
 *
 * Format: 10 Codes pro User, jeweils zwei Vier-Zeichen-Gruppen mit Bindestrich
 * (z. B. "X4F3-A7B2"), nur unmissverständliche Zeichen aus Crockford-Base32
 * minus 0/1/L/I/U.
 *
 * In der DB liegt der scrypt-Hash (langsamer Vergleich → kein Brute-Force).
 * Plaintext wird einmalig nach Setup angezeigt — danach nicht mehr lesbar.
 */

import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { prisma } from "@/lib/db/client";
import { sendEmail, backupCodeUsedEmail } from "@/lib/email";
import { rateLimit } from "@/lib/security/rate-limit";

const CHARSET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUP_LEN = 4;
const GROUPS = 2;
const CODE_COUNT = 10;

function generateCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let group = "";
    const bytes = randomBytes(GROUP_LEN * 2);
    for (let i = 0; i < GROUP_LEN; i++) {
      group += CHARSET[bytes[i] % CHARSET.length];
    }
    groups.push(group);
  }
  return groups.join("-");
}

export function isLikelyBackupCode(input: string): boolean {
  const cleaned = input.replace(/[\s-]/g, "").toUpperCase();
  if (cleaned.length !== GROUP_LEN * GROUPS) return false;
  return [...cleaned].every((c) => CHARSET.includes(c));
}

function normalizeCode(input: string): string {
  const cleaned = input.replace(/[\s-]/g, "").toUpperCase();
  return cleaned.replace(
    new RegExp(`(.{${GROUP_LEN}})`, "g"),
    "$1-"
  ).replace(/-$/, "");
}

/**
 * Generiert + persistiert frische Backup-Codes für einen User.
 * Bestehende, unbenutzte Codes werden gelöscht (Regenerate-Semantik).
 * Gibt die plaintext-Codes EINMALIG zurück.
 */
export async function regenerateBackupCodes(
  userId: string
): Promise<string[]> {
  const codes = Array.from({ length: CODE_COUNT }, generateCode);
  const hashes = await Promise.all(codes.map((c) => hashPassword(c)));

  await prisma.$transaction([
    prisma.backupCode.deleteMany({ where: { userId } }),
    prisma.backupCode.createMany({
      data: hashes.map((codeHash) => ({ userId, codeHash })),
    }),
  ]);

  return codes;
}

/**
 * Sucht einen unbenutzten BackupCode-Eintrag für den User, dessen Hash zum
 * Input passt, markiert ihn als verbraucht. Gibt true bei Erfolg zurück.
 *
 * Rate-limited: 5 Versuche pro 15 Minuten pro User.
 */
export async function consumeBackupCode(
  userId: string,
  input: string
): Promise<boolean> {
  if (!isLikelyBackupCode(input)) return false;

  const limit = await rateLimit({
    scope: "backup-code",
    key: userId,
    limit: 5,
    windowSec: 900,
  });
  if (!limit.ok) return false;

  const normalized = normalizeCode(input);

  const candidates = await prisma.backupCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  });

  for (const c of candidates) {
    if (await verifyPassword(normalized, c.codeHash)) {
      const updated = await prisma.backupCode.updateMany({
        where: { id: c.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (updated.count === 1) {
        // Notify user — fire-and-forget
        prisma.user
          .findUnique({ where: { id: userId }, select: { email: true } })
          .then((u) => {
            if (u?.email) sendEmail(backupCodeUsedEmail({ email: u.email }));
          })
          .catch(() => undefined);
        return true;
      }
    }
  }
  return false;
}

export async function countActiveBackupCodes(userId: string): Promise<number> {
  return prisma.backupCode.count({
    where: { userId, usedAt: null },
  });
}

export async function clearBackupCodes(userId: string): Promise<void> {
  await prisma.backupCode.deleteMany({ where: { userId } });
}
