/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Entfernt die Demo-Seed-Konten mit bekannten Passwörtern aus einer Datenbank.
 *
 * Hintergrund: Der Demo-Seed lief bis 09.07.2026 bei jedem Container-Start und
 * legte u.a. `super@mastermind.app` mit dem Passwort "super" an. Dieses Skript
 * findet und entfernt solche Konten.
 *
 * Ausführen (zeigt nur an, ändert nichts):
 *   docker compose exec app node scripts/purge-demo-accounts.cjs
 * Wirklich löschen:
 *   docker compose exec app node scripts/purge-demo-accounts.cjs --delete
 */
import { PrismaClient } from "@prisma/client";
import { verifyPassword } from "../src/lib/auth/passwords";

const prisma = new PrismaClient();

// E-Mail → bekanntes Seed-Passwort
const DEMO_ACCOUNTS: Record<string, string> = {
  "super@mastermind.app": "super",
  "admin@schule.de": "admin",
  "becker@schule.de": "lehrer",
  "wagner@schule.de": "lehrer",
  "klein@schule.de": "lehrer",
  "heinrich@schule.de": "lehrer",
  "lukas@schule.de": "schueler",
};

async function main() {
  const doDelete = process.argv.includes("--delete");

  const found: { email: string; id: string; role: string; passwordMatches: boolean }[] = [];

  for (const [email, knownPassword] of Object.entries(DEMO_ACCOUNTS)) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, passwordHash: true },
    });
    if (!user) continue;

    // Nur melden, ob das bekannte Seed-Passwort noch gilt
    let matches = false;
    try {
      matches = await verifyPassword(knownPassword, user.passwordHash);
    } catch { /* anderes Hash-Format — als "unklar" behandeln */ }

    found.push({ email: user.email, id: user.id, role: user.role, passwordMatches: matches });
  }

  if (found.length === 0) {
    console.log("✓ Keine Demo-Konten in dieser Datenbank gefunden.");
    return;
  }

  console.log(`\nGefundene Demo-Konten (${found.length}):\n`);
  for (const f of found) {
    const flag = f.passwordMatches ? "⚠ BEKANNTES PASSWORT AKTIV" : "  Passwort geändert";
    console.log(`  ${flag}  ${f.email.padEnd(28)} role=${f.role}`);
  }

  const compromised = found.filter((f) => f.passwordMatches);
  if (compromised.length > 0) {
    console.log(
      `\n⚠ ${compromised.length} Konto/Konten sind mit dem bekannten Seed-Passwort nutzbar.` +
        "\n  Falls die Instanz öffentlich erreichbar war, ist von einer möglichen" +
        "\n  Datenschutzverletzung auszugehen (Art. 33 DSGVO — rechtlich prüfen lassen)."
    );
  }

  if (!doDelete) {
    console.log("\nNichts gelöscht. Zum Entfernen erneut mit --delete ausführen.");
    return;
  }

  // Nur echte Seed-Konten löschen (deterministische seed-* IDs oder Demo-Mail)
  for (const f of found) {
    await prisma.user.delete({ where: { id: f.id } }).catch((e) => {
      console.error(`  ✖ ${f.email}: ${e.message}`);
    });
    console.log(`  ✓ gelöscht: ${f.email}`);
  }
  console.log("\n✓ Fertig. Prüfe, ob echte Nutzerkonten unberührt geblieben sind.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
