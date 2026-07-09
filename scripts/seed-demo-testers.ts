/**
 * Legt für JEDE Rolle einen funktionierenden Demo-Account für Tester an —
 * inklusive der nötigen Verknüpfungen (Schule, Klasse, Eltern-Kind-Link),
 * damit jede Ansicht ohne "keine Klasse/kein Kind"-Fehler funktioniert.
 *
 * Anders als der alte Demo-Seed: EIN gemeinsames, starkes Passwort für alle
 * Tester-Konten (per --password oder ENV DEMO_PASSWORD). Idempotent.
 *
 * Nutzung im Container:
 *   docker compose exec app node scripts/seed-demo-testers.cjs --password 'DeinTestPasswort!'
 *
 * Danach loggen sich Tester mit den ausgegebenen E-Mails + diesem Passwort ein.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/passwords";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : process.env[name.toUpperCase()];
}

// Stabile IDs, damit das Skript idempotent ist
const SCHOOL_ID = "demo-school";
const CLASS_ID = "demo-class-9b";

const TESTERS: { role: string; email: string; name: string; needsClass?: boolean }[] = [
  { role: "super",          email: "demo.super@konvertis.de",       name: "Demo Plattform-Admin" },
  { role: "admin",          email: "demo.admin@konvertis.de",       name: "Demo Schul-Admin" },
  { role: "rector",         email: "demo.schulleiter@konvertis.de", name: "Demo Schulleiter" },
  { role: "vice_rector",    email: "demo.konrektor@konvertis.de",   name: "Demo Konrektor" },
  { role: "secretary",      email: "demo.sekretariat@konvertis.de", name: "Demo Sekretariat" },
  { role: "teacher",        email: "demo.lehrer@konvertis.de",      name: "Demo Lehrkraft" },
  { role: "student",        email: "demo.schueler@konvertis.de",    name: "Demo Schüler",  needsClass: true },
  { role: "parent",         email: "demo.eltern@konvertis.de",      name: "Demo Elternteil" },
  { role: "school_company", email: "demo.traeger@konvertis.de",     name: "Demo Schulträger" },
];

async function main() {
  const password = arg("password") ?? "";
  if (password.length < 12) {
    console.error("✖ --password (min. 12 Zeichen) erforderlich. Beispiel:");
    console.error("  node scripts/seed-demo-testers.cjs --password 'MeinTestPasswort2026'");
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);

  // ── Schule + Klasse ──────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: SCHOOL_ID },
    update: {},
    create: { id: SCHOOL_ID, slug: "demo-schule", name: "Demo-Schule" },
    select: { id: true },
  });

  const klasse = await prisma.schoolClass.upsert({
    where: { id: CLASS_ID },
    update: {},
    create: { id: CLASS_ID, name: "9b", grade: 9, schoolId: school.id },
    select: { id: true },
  });

  // ── Accounts ─────────────────────────────────────────────
  const ids: Record<string, string> = {};
  for (const t of TESTERS) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {
        passwordHash, role: t.role, name: t.name, verifiedAt: new Date(),
        schoolId: t.role === "super" ? null : school.id,
        classId: t.needsClass ? klasse.id : null,
        klasse: t.needsClass ? "9b" : null,
      },
      create: {
        email: t.email, name: t.name, passwordHash, role: t.role, verifiedAt: new Date(),
        schoolId: t.role === "super" ? null : school.id,
        classId: t.needsClass ? klasse.id : null,
        klasse: t.needsClass ? "9b" : null,
      },
      select: { id: true },
    });
    ids[t.role] = user.id;
  }

  // ── Eltern ↔ Schüler verknüpfen (sonst leere Eltern-Ansicht) ──
  if (ids.parent && ids.student) {
    await prisma.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId: ids.parent, studentId: ids.student } },
      update: {},
      create: { parentId: ids.parent, studentId: ids.student },
    });
  }

  console.log("\n✓ Demo-Tester-Accounts angelegt (Passwort für ALLE gleich):\n");
  for (const t of TESTERS) {
    console.log(`  ${t.role.padEnd(15)} ${t.email}`);
  }
  console.log(`\n  Passwort (alle): ${password}\n`);
  console.log("  Eltern-Konto ist mit dem Schüler-Konto verknüpft.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
