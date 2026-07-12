/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Legt einen einzelnen Admin-/Super-Account an — für den ersten Login nach
 * einem frischen DB-Setup (der Demo-Seed ist in Produktion blockiert).
 *
 * Anders als der Demo-Seed nutzt dieses Skript KEINE bekannten Passwörter:
 * E-Mail, Passwort und Rolle kommen als Argumente/ENV, das Passwort wird
 * korrekt gehasht. Idempotent (upsert auf die E-Mail).
 *
 * Nutzung im Container:
 *   docker compose exec app node scripts/create-admin.cjs \
 *     --email you@example.com --password 'StarkesPasswort!' --role super
 *
 * Rollen: super (Plattform-Admin) | admin (Schul-Admin)
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/passwords";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : process.env[name.toUpperCase()];
}

async function main() {
  const email = (arg("email") ?? "").trim().toLowerCase();
  const password = arg("password") ?? "";
  const role = (arg("role") ?? "super").trim();

  if (!email || !email.includes("@")) {
    console.error("✖ --email <gültige E-Mail> erforderlich");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("✖ --password muss mindestens 12 Zeichen haben");
    process.exit(1);
  }
  if (!["super", "admin"].includes(role)) {
    console.error("✖ --role muss 'super' oder 'admin' sein");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, verifiedAt: new Date() },
    create: {
      email,
      name: role === "super" ? "Plattform-Admin" : "Admin",
      passwordHash,
      role,
      verifiedAt: new Date(),
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`✓ Account bereit: ${user.email} (${user.role})`);
  console.log("  Passwort wurde gesetzt. Melde dich damit an und ändere es danach.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
