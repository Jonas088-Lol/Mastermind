/**
 * Tokens für Magic-Link, Password-Reset, E-Mail-Verifizierung, 2FA.
 *
 * Tokens werden gegen die `VerificationToken`-Tabelle ausgegeben und sind
 * single-use. Der Token-String selbst kommt nicht in die DB — gespeichert
 * wird ein SHA-256-Hash. Beim Konsumieren wird der Plaintext gegen den Hash
 * verglichen, sodass ein DB-Leak nicht gleich gültige Tokens preisgibt.
 */

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";

export type TokenType =
  | "magic_link"
  | "password_reset"
  | "email_verify"
  | "two_factor";

const DEFAULT_TTL_MIN: Record<TokenType, number> = {
  magic_link: 15,
  password_reset: 60,
  email_verify: 60 * 24,
  two_factor: 5,
};

const ROTATE_BYTES = 32;

function hashToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

function generatePlaintext(): string {
  return randomBytes(ROTATE_BYTES)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export interface CreateTokenInput {
  email: string;
  type: TokenType;
  userId?: string;
  ttlMinutes?: number;
}

export interface CreatedToken {
  /** Plaintext-Token — geht in die E-Mail/URL, niemals in die DB. */
  token: string;
  expiresAt: Date;
  expiresMinutes: number;
}

export async function createToken(
  input: CreateTokenInput
): Promise<CreatedToken> {
  const ttl = input.ttlMinutes ?? DEFAULT_TTL_MIN[input.type];
  const expiresAt = new Date(Date.now() + ttl * 60_000);
  const plaintext = generatePlaintext();
  const hashed = hashToken(plaintext);

  await prisma.verificationToken.create({
    data: {
      email: input.email.toLowerCase(),
      type: input.type,
      token: hashed,
      userId: input.userId ?? null,
      expiresAt,
    },
  });

  // Best-effort cleanup von alten/expired Tokens für die selbe E-Mail+Type
  await prisma.verificationToken
    .deleteMany({
      where: {
        email: input.email.toLowerCase(),
        type: input.type,
        OR: [
          { consumedAt: { not: null } },
          { expiresAt: { lt: new Date(Date.now() - 60 * 60_000) } },
        ],
      },
    })
    .catch(() => undefined);

  return { token: plaintext, expiresAt, expiresMinutes: ttl };
}

export interface ConsumedToken {
  email: string;
  userId: string | null;
}

export async function consumeToken(
  type: TokenType,
  plaintext: string
): Promise<ConsumedToken | null> {
  if (!plaintext) return null;
  const hashed = hashToken(plaintext);

  const found = await prisma.verificationToken.findUnique({
    where: { token: hashed },
  });
  if (!found) return null;
  if (found.type !== type) return null;
  if (found.consumedAt) return null;
  if (found.expiresAt < new Date()) return null;

  await prisma.verificationToken.update({
    where: { id: found.id },
    data: { consumedAt: new Date() },
  });

  return { email: found.email, userId: found.userId };
}
