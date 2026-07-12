/* Copyright 2026 Elian Schock, Jonas Schwenk */
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

const TESTERS: { role: string; email: string; name: string; needsClass?: boolean; key?: string }[] = [
  { role: "super",          email: "demo.super@konvertis.de",       name: "Demo Plattform-Admin" },
  { role: "admin",          email: "demo.admin@konvertis.de",       name: "Demo Schul-Admin" },
  { role: "rector",         email: "demo.schulleiter@konvertis.de", name: "Demo Schulleiter" },
  { role: "vice_rector",    email: "demo.konrektor@konvertis.de",   name: "Demo Konrektor" },
  { role: "secretary",      email: "demo.sekretariat@konvertis.de", name: "Demo Sekretariat" },
  { role: "teacher",        email: "demo.lehrer@konvertis.de",      name: "Demo Lehrkraft" },
  { role: "student",        email: "demo.schueler@konvertis.de",    name: "Demo Schüler",  needsClass: true },
  // Zweiter Schüler in derselben Klasse — zum Testen von Duellen & Co.
  { role: "student",        email: "demo.schueler2@konvertis.de",   name: "Demo Schüler 2", needsClass: true, key: "student2" },
  // Schüler mit allen Zusatzrollen: Klassensprecher + Schülersprecher + Schülerzeitung
  { role: "student",        email: "demo.sprecher@konvertis.de",    name: "Demo Sprecher & Redaktion", needsClass: true, key: "student3" },
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
  // Demo-Schule läuft auf "pro", damit Tester alle Features (KI, Heatmaps, …) sehen
  const school = await prisma.school.upsert({
    where: { id: SCHOOL_ID },
    update: { plan: "pro" },
    create: { id: SCHOOL_ID, slug: "demo-schule", name: "Demo-Schule", plan: "pro" },
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
    ids[t.key ?? t.role] = user.id;
  }

  // ── Zusatzrollen für den Sprecher-/Redaktions-Demo-Account ──
  if (ids.student3) {
    await prisma.user.update({
      where: { id: ids.student3 },
      data: { studentFeatures: JSON.stringify(["klassensprecher", "schuelersprecher", "schuelerzeitung"]) },
    });
  }

  // ── Eltern ↔ Schüler verknüpfen (sonst leere Eltern-Ansicht) ──
  if (ids.parent && ids.student) {
    await prisma.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId: ids.parent, studentId: ids.student } },
      update: {},
      create: { parentId: ids.parent, studentId: ids.student },
    });
  }

  // ── Mathe-Übungsfragen (Duell-/Übungs-Pool) ──────────────
  // Duelle laufen über ExerciseTopic + ExerciseQuestion (Typ "mc",
  // correct = 0-basierter Index als String).
  const MATHE_TOPIC_ID = "demo-topic-mathe-9";
  await prisma.exerciseTopic.upsert({
    where: { id: MATHE_TOPIC_ID },
    update: {},
    create: {
      id: MATHE_TOPIC_ID,
      subject: "mathematik",
      grade: 9,
      title: "Mathe-Grundlagen",
      description: "Einfache Rechenaufgaben zum Testen von Duellen und Übungen.",
    },
  });

  const MATHE_FRAGEN: { q: string; options: string[]; correct: number; explanation: string }[] = [
    { q: "Was ist 12 × 12?", options: ["124", "144", "142", "154"], correct: 1, explanation: "12 × 12 = 144." },
    { q: "Was ist 81 ÷ 9?", options: ["8", "7", "9", "11"], correct: 2, explanation: "9 × 9 = 81, also 81 ÷ 9 = 9." },
    { q: "Löse: 3x = 21. Was ist x?", options: ["6", "7", "8", "9"], correct: 1, explanation: "x = 21 ÷ 3 = 7." },
    { q: "Was ist 15 % von 200?", options: ["15", "20", "25", "30"], correct: 3, explanation: "10 % = 20, 5 % = 10 → 15 % = 30." },
    { q: "Was ist die Wurzel aus 64?", options: ["6", "7", "8", "9"], correct: 2, explanation: "8 × 8 = 64." },
    { q: "Was ist 2⁵ (2 hoch 5)?", options: ["16", "32", "64", "25"], correct: 1, explanation: "2·2·2·2·2 = 32." },
    { q: "Was ist −5 + 12?", options: ["−7", "7", "17", "−17"], correct: 1, explanation: "12 − 5 = 7." },
    { q: "Wie viel ist ¾ von 40?", options: ["25", "28", "30", "32"], correct: 2, explanation: "40 ÷ 4 = 10, 10 × 3 = 30." },
    { q: "Löse: 2x + 4 = 14. Was ist x?", options: ["4", "5", "6", "7"], correct: 1, explanation: "2x = 10 → x = 5." },
    { q: "Was ist 0,5 × 0,4?", options: ["0,9", "0,02", "0,2", "2"], correct: 2, explanation: "0,5 × 0,4 = 0,20." },
    { q: "Ein Dreieck hat die Winkel 90° und 45°. Wie groß ist der dritte Winkel?", options: ["35°", "40°", "45°", "55°"], correct: 2, explanation: "180° − 90° − 45° = 45°." },
    { q: "Was ist 7 + 8 × 2?", options: ["30", "23", "22", "15"], correct: 1, explanation: "Punkt vor Strich: 8 × 2 = 16, dann 7 + 16 = 23." },
  ];

  for (let i = 0; i < MATHE_FRAGEN.length; i++) {
    const f = MATHE_FRAGEN[i];
    await prisma.exerciseQuestion.upsert({
      where: { id: `demo-mathe-q${i + 1}` },
      update: {},
      create: {
        id: `demo-mathe-q${i + 1}`,
        topicId: MATHE_TOPIC_ID,
        type: "mc",
        question: f.q,
        options: JSON.stringify(f.options),
        correct: String(f.correct),
        explanation: f.explanation,
        order: i,
      },
    });
  }
  console.log(`\n✓ Mathe-Topic "Mathe-Grundlagen" mit ${MATHE_FRAGEN.length} Fragen angelegt (Duell-Pool).`);

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
