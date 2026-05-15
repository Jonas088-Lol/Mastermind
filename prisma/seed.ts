import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/passwords";

const prisma = new PrismaClient();

// Deterministic IDs so re-seeding is idempotent
const S = {
  school: "seed-school-1",
  subjects: { M: "seed-subj-M", E: "seed-subj-E", Bio: "seed-subj-Bio", D: "seed-subj-D", Ph: "seed-subj-Ph", Ge: "seed-subj-Ge" },
  classes: { "8c": "seed-cls-8c", "9b": "seed-cls-9b", "10a": "seed-cls-10a", "11a": "seed-cls-11a" },
};

const now = new Date("2026-05-05");
const d = (days: number) => new Date(now.getTime() + days * 86_400_000);

async function main() {
  console.log("Seeding MasterMind dev database…");

  // ── School ──────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { slug: "rs-muenchen" },
    update: {},
    create: {
      id: S.school,
      slug: "rs-muenchen",
      name: "Realschule München",
      city: "München",
      state: "BY",
      plan: "pro",
      seats: 1000,
    },
  });

  // ── Subjects ────────────────────────────────────────────────
  const subjectDefs = [
    { id: S.subjects.M, name: "Mathematik", shortName: "M", color: "#6366f1" },
    { id: S.subjects.E, name: "Englisch", shortName: "E", color: "#0ea5e9" },
    { id: S.subjects.Bio, name: "Biologie", shortName: "Bio", color: "#22c55e" },
    { id: S.subjects.D, name: "Deutsch", shortName: "D", color: "#f59e0b" },
    { id: S.subjects.Ph, name: "Physik", shortName: "Ph", color: "#a855f7" },
    { id: S.subjects.Ge, name: "Geschichte", shortName: "Ge", color: "#ef4444" },
  ];

  for (const s of subjectDefs) {
    await prisma.subject.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, schoolId: school.id },
    });
  }
  console.log(`  ✓ ${subjectDefs.length} Fächer`);

  // ── SchoolClasses ───────────────────────────────────────────
  const classDefs = [
    { id: S.classes["8c"], name: "8c", grade: 8 },
    { id: S.classes["9b"], name: "9b", grade: 9 },
    { id: S.classes["10a"], name: "10a", grade: 10 },
    { id: S.classes["11a"], name: "11a", grade: 11 },
  ];

  for (const c of classDefs) {
    await prisma.schoolClass.upsert({
      where: { schoolId_name: { schoolId: school.id, name: c.name } },
      update: {},
      create: { ...c, schoolId: school.id },
    });
  }
  console.log(`  ✓ ${classDefs.length} Klassen`);

  // ── Users ───────────────────────────────────────────────────
  const userDefs = [
    { email: "super@mastermind.app", name: "Plattform-Admin", password: "super", role: "super", schoolId: null, classId: null, klasse: null, twoFactor: false },
    { email: "admin@schule.de", name: "Andrea Hoffmann", password: "admin", role: "admin", schoolId: school.id, classId: null, klasse: null, twoFactor: true },
    { email: "becker@schule.de", name: "Markus Becker", password: "lehrer", role: "teacher", schoolId: school.id, classId: null, klasse: null, twoFactor: true },
    { email: "wagner@schule.de", name: "Lisa Wagner", password: "lehrer", role: "teacher", schoolId: school.id, classId: null, klasse: null, twoFactor: false },
    { email: "klein@schule.de", name: "Eva Klein", password: "lehrer", role: "teacher", schoolId: school.id, classId: null, klasse: null, twoFactor: false },
    { email: "heinrich@schule.de", name: "Thomas Heinrich", password: "lehrer", role: "teacher", schoolId: school.id, classId: null, klasse: null, twoFactor: false },
    { email: "lukas@schule.de", name: "Lukas Meier", password: "schueler", role: "student", schoolId: school.id, classId: S.classes["9b"], klasse: "9b", twoFactor: false },
    { email: "anna@schule.de", name: "Anna Bauer", password: "schueler", role: "student", schoolId: school.id, classId: S.classes["9b"], klasse: "9b", twoFactor: false },
    { email: "tim@schule.de", name: "Tim Schulz", password: "schueler", role: "student", schoolId: school.id, classId: S.classes["9b"], klasse: "9b", twoFactor: false },
    { email: "mia@schule.de", name: "Mia Fischer", password: "schueler", role: "student", schoolId: school.id, classId: S.classes["10a"], klasse: "10a", twoFactor: false },
    { email: "tom@schule.de", name: "Tom Weber", password: "schueler", role: "student", schoolId: school.id, classId: S.classes["10a"], klasse: "10a", twoFactor: false },
    { email: "sandra.meier@email.de", name: "Sandra Meier", password: "eltern", role: "parent", schoolId: school.id, classId: null, klasse: null, twoFactor: false },
    { email: "weber@email.de", name: "Klaus Weber", password: "eltern", role: "parent", schoolId: school.id, classId: null, klasse: null, twoFactor: false },
  ];

  const userIds: Record<string, string> = {};
  for (const u of userDefs) {
    const passwordHash = await hashPassword(u.password);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash, klasse: u.klasse, classId: u.classId, twoFactor: u.twoFactor, schoolId: u.schoolId, verifiedAt: new Date() },
      create: { email: u.email, name: u.name, passwordHash, role: u.role, klasse: u.klasse, classId: u.classId, twoFactor: u.twoFactor, schoolId: u.schoolId, verifiedAt: new Date() },
    });
    userIds[u.email] = user.id;
    console.log(`  ✓ ${u.email}  (${u.role})`);
  }

  // ── ParentStudentLinks ──────────────────────────────────────
  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: userIds["sandra.meier@email.de"], studentId: userIds["lukas@schule.de"] } },
    update: {},
    create: { parentId: userIds["sandra.meier@email.de"], studentId: userIds["lukas@schule.de"] },
  });
  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: userIds["weber@email.de"], studentId: userIds["tom@schule.de"] } },
    update: {},
    create: { parentId: userIds["weber@email.de"], studentId: userIds["tom@schule.de"] },
  });
  console.log("  ✓ ParentStudentLinks");

  // ── TeacherSubjectClasses ───────────────────────────────────
  const tscDefs = [
    { t: "becker@schule.de", s: S.subjects.M, c: S.classes["9b"] },
    { t: "becker@schule.de", s: S.subjects.Ph, c: S.classes["10a"] },
    { t: "becker@schule.de", s: S.subjects.M, c: S.classes["8c"] },
    { t: "becker@schule.de", s: S.subjects.Ph, c: S.classes["11a"] },
    { t: "becker@schule.de", s: S.subjects.Ge, c: S.classes["9b"] },
    { t: "wagner@schule.de", s: S.subjects.E, c: S.classes["9b"] },
    { t: "wagner@schule.de", s: S.subjects.E, c: S.classes["10a"] },
    { t: "klein@schule.de", s: S.subjects.D, c: S.classes["9b"] },
    { t: "klein@schule.de", s: S.subjects.D, c: S.classes["11a"] },
    { t: "heinrich@schule.de", s: S.subjects.Bio, c: S.classes["9b"] },
    { t: "heinrich@schule.de", s: S.subjects.Bio, c: S.classes["10a"] },
  ];
  for (const x of tscDefs) {
    await prisma.teacherSubjectClass.upsert({
      where: { teacherId_subjectId_classId: { teacherId: userIds[x.t], subjectId: x.s, classId: x.c } },
      update: {},
      create: { teacherId: userIds[x.t], subjectId: x.s, classId: x.c },
    });
  }
  console.log(`  ✓ ${tscDefs.length} TeacherSubjectClasses`);

  // ── Extra TSCs for 10a ───────────────────────────────────────
  const extraTscDefs = [
    { t: "becker@schule.de", s: S.subjects.M, c: S.classes["10a"] },
    { t: "klein@schule.de", s: S.subjects.D, c: S.classes["10a"] },
  ];
  for (const x of extraTscDefs) {
    await prisma.teacherSubjectClass.upsert({
      where: { teacherId_subjectId_classId: { teacherId: userIds[x.t], subjectId: x.s, classId: x.c } },
      update: {},
      create: { teacherId: userIds[x.t], subjectId: x.s, classId: x.c },
    });
  }

  // ── TimetableEntries (9b + 10a) ──────────────────────────────
  const ttDefs = [
    // 9b
    { day: 1, period: 1, s: S.subjects.D, t: "klein@schule.de", c: S.classes["9b"], room: "A210" },
    { day: 1, period: 2, s: S.subjects.D, t: "klein@schule.de", c: S.classes["9b"], room: "A210" },
    { day: 1, period: 3, s: S.subjects.M, t: "becker@schule.de", c: S.classes["9b"], room: "B204" },
    { day: 1, period: 4, s: S.subjects.M, t: "becker@schule.de", c: S.classes["9b"], room: "B204" },
    { day: 2, period: 1, s: S.subjects.E, t: "wagner@schule.de", c: S.classes["9b"], room: "A115" },
    { day: 2, period: 2, s: S.subjects.E, t: "wagner@schule.de", c: S.classes["9b"], room: "A115" },
    { day: 2, period: 3, s: S.subjects.Bio, t: "heinrich@schule.de", c: S.classes["9b"], room: "Lab 2" },
    { day: 2, period: 4, s: S.subjects.Bio, t: "heinrich@schule.de", c: S.classes["9b"], room: "Lab 2" },
    { day: 2, period: 5, s: S.subjects.Ge, t: "becker@schule.de", c: S.classes["9b"], room: "C302" },
    { day: 3, period: 1, s: S.subjects.M, t: "becker@schule.de", c: S.classes["9b"], room: "B204" },
    { day: 3, period: 2, s: S.subjects.M, t: "becker@schule.de", c: S.classes["9b"], room: "B204" },
    { day: 3, period: 5, s: S.subjects.D, t: "klein@schule.de", c: S.classes["9b"], room: "A210" },
    { day: 3, period: 6, s: S.subjects.D, t: "klein@schule.de", c: S.classes["9b"], room: "A210" },
    { day: 4, period: 1, s: S.subjects.E, t: "wagner@schule.de", c: S.classes["9b"], room: "A115" },
    { day: 4, period: 2, s: S.subjects.E, t: "wagner@schule.de", c: S.classes["9b"], room: "A115" },
    { day: 4, period: 3, s: S.subjects.Bio, t: "heinrich@schule.de", c: S.classes["9b"], room: "Lab 2" },
    { day: 4, period: 5, s: S.subjects.M, t: "becker@schule.de", c: S.classes["9b"], room: "B204" },
    { day: 5, period: 1, s: S.subjects.D, t: "klein@schule.de", c: S.classes["9b"], room: "A210" },
    { day: 5, period: 2, s: S.subjects.M, t: "becker@schule.de", c: S.classes["9b"], room: "B204" },
    { day: 5, period: 3, s: S.subjects.E, t: "wagner@schule.de", c: S.classes["9b"], room: "A115" },
    { day: 5, period: 4, s: S.subjects.Ge, t: "becker@schule.de", c: S.classes["9b"], room: "C302" },
    // 10a
    { day: 1, period: 1, s: S.subjects.M, t: "becker@schule.de", c: S.classes["10a"], room: "B205" },
    { day: 1, period: 2, s: S.subjects.M, t: "becker@schule.de", c: S.classes["10a"], room: "B205" },
    { day: 1, period: 3, s: S.subjects.E, t: "wagner@schule.de", c: S.classes["10a"], room: "A116" },
    { day: 1, period: 4, s: S.subjects.E, t: "wagner@schule.de", c: S.classes["10a"], room: "A116" },
    { day: 2, period: 1, s: S.subjects.D, t: "klein@schule.de", c: S.classes["10a"], room: "A211" },
    { day: 2, period: 2, s: S.subjects.D, t: "klein@schule.de", c: S.classes["10a"], room: "A211" },
    { day: 2, period: 3, s: S.subjects.Ph, t: "becker@schule.de", c: S.classes["10a"], room: "Lab 1" },
    { day: 2, period: 4, s: S.subjects.Ph, t: "becker@schule.de", c: S.classes["10a"], room: "Lab 1" },
    { day: 3, period: 1, s: S.subjects.Bio, t: "heinrich@schule.de", c: S.classes["10a"], room: "Lab 2" },
    { day: 3, period: 2, s: S.subjects.Bio, t: "heinrich@schule.de", c: S.classes["10a"], room: "Lab 2" },
    { day: 3, period: 3, s: S.subjects.M, t: "becker@schule.de", c: S.classes["10a"], room: "B205" },
    { day: 4, period: 1, s: S.subjects.E, t: "wagner@schule.de", c: S.classes["10a"], room: "A116" },
    { day: 4, period: 2, s: S.subjects.Ph, t: "becker@schule.de", c: S.classes["10a"], room: "Lab 1" },
    { day: 5, period: 1, s: S.subjects.D, t: "klein@schule.de", c: S.classes["10a"], room: "A211" },
    { day: 5, period: 2, s: S.subjects.Bio, t: "heinrich@schule.de", c: S.classes["10a"], room: "Lab 2" },
    { day: 5, period: 3, s: S.subjects.M, t: "becker@schule.de", c: S.classes["10a"], room: "B205" },
  ];
  for (const tt of ttDefs) {
    await prisma.timetableEntry.upsert({
      where: { classId_day_period: { classId: tt.c, day: tt.day, period: tt.period } },
      update: {},
      create: { schoolId: school.id, classId: tt.c, teacherId: userIds[tt.t], subjectId: tt.s, day: tt.day, period: tt.period, room: tt.room },
    });
  }
  console.log(`  ✓ ${ttDefs.length} Stundenplaneinträge`);

  // ── Assignments ──────────────────────────────────────────────
  const assignmentDefs = [
    // 9b
    { id: "seed-asgn-1", title: "Quadratische Gleichungen — Aufgabe 5", description: "Seite 47, Aufgaben a–f lösen", dueAt: d(0), type: "homework", teacherEmail: "becker@schule.de", classKey: "9b", subjectKey: S.subjects.M, maxPoints: 10 },
    { id: "seed-asgn-2", title: "Vokabeln Unit 7 lernen", description: "Alle Vokabeln aus Unit 7 (S. 82–85)", dueAt: d(0), type: "homework", teacherEmail: "wagner@schule.de", classKey: "9b", subjectKey: S.subjects.E, maxPoints: null },
    { id: "seed-asgn-3", title: "Erörterung — Argumentstruktur", description: "Mindestens 300 Wörter, drei Argumente", dueAt: d(1), type: "homework", teacherEmail: "klein@schule.de", classKey: "9b", subjectKey: S.subjects.D, maxPoints: 15 },
    { id: "seed-asgn-4", title: "Klassenarbeit KA 3 — Gleichungssysteme", description: "Kapitel 5 wiederholen, alle Aufgabentypen", dueAt: d(5), type: "test", teacherEmail: "becker@schule.de", classKey: "9b", subjectKey: S.subjects.M, maxPoints: 30 },
    { id: "seed-asgn-5", title: "Referat Photosynthese", description: "10-Minuten-Referat mit Folien erstellen", dueAt: d(-2), type: "project", teacherEmail: "heinrich@schule.de", classKey: "9b", subjectKey: S.subjects.Bio, maxPoints: 20 },
    { id: "seed-asgn-6", title: "Kurztest Zeiten", description: "Simple past & present perfect", dueAt: d(-7), type: "test", teacherEmail: "wagner@schule.de", classKey: "9b", subjectKey: S.subjects.E, maxPoints: 20 },
    { id: "seed-asgn-7", title: "Lektüre S. 1–50 — Der Vorleser", description: "Erstes Kapitel lesen und Notizen machen", dueAt: d(3), type: "homework", teacherEmail: "klein@schule.de", classKey: "9b", subjectKey: S.subjects.D, maxPoints: null },
    // 10a
    { id: "seed-asgn-8", title: "Funktionsscharen analysieren", description: "Seite 112, Aufgaben 3–7", dueAt: d(1), type: "homework", teacherEmail: "becker@schule.de", classKey: "10a", subjectKey: S.subjects.M, maxPoints: 12 },
    { id: "seed-asgn-9", title: "Essay: City Life vs. Rural Life", description: "Min. 250 Wörter, beide Seiten darstellen", dueAt: d(2), type: "homework", teacherEmail: "wagner@schule.de", classKey: "10a", subjectKey: S.subjects.E, maxPoints: 15 },
    { id: "seed-asgn-10", title: "Optik — Brechungsgesetz", description: "Experimente aus Kapitel 8 zusammenfassen", dueAt: d(4), type: "homework", teacherEmail: "becker@schule.de", classKey: "10a", subjectKey: S.subjects.Ph, maxPoints: 10 },
    { id: "seed-asgn-11", title: "Klassenarbeit KA 2 — Analysis", description: "Differenzialrechnung Kap. 3 wiederholen", dueAt: d(7), type: "test", teacherEmail: "becker@schule.de", classKey: "10a", subjectKey: S.subjects.M, maxPoints: 30 },
  ];

  const asgnIds: Record<string, string> = {};
  for (const a of assignmentDefs) {
    await prisma.assignment.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        title: a.title,
        description: a.description,
        dueAt: a.dueAt,
        type: a.type,
        maxPoints: a.maxPoints,
        teacherId: userIds[a.teacherEmail],
        classId: S.classes[a.classKey as keyof typeof S.classes],
        subjectId: a.subjectKey,
        updatedAt: now,
      },
    });
    asgnIds[a.id] = a.id;
  }
  console.log(`  ✓ ${assignmentDefs.length} Aufgaben`);

  // ── Submissions ──────────────────────────────────────────────
  const lukasId = userIds["lukas@schule.de"];

  const subDefs = [
    { asgnId: "seed-asgn-2", studentId: lukasId, status: "submitted", submittedAt: d(-1), content: "Alle Vokabeln gelernt und Karteikarten erstellt." },
    { asgnId: "seed-asgn-5", studentId: lukasId, status: "graded", submittedAt: d(-2), content: "Referat über Photosynthese gehalten." },
    { asgnId: "seed-asgn-6", studentId: lukasId, status: "graded", submittedAt: d(-7), content: "Test geschrieben." },
  ];

  const subIds: Record<string, string> = {};
  for (const s of subDefs) {
    const sub = await prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId: s.asgnId, studentId: s.studentId } },
      update: {},
      create: { assignmentId: s.asgnId, studentId: s.studentId, content: s.content, status: s.status, submittedAt: s.submittedAt, updatedAt: now },
    });
    subIds[s.asgnId] = sub.id;
  }

  // Open submissions for Anna and Tim (9b)
  for (const email of ["anna@schule.de", "tim@schule.de"]) {
    const uid = userIds[email];
    for (const id of ["seed-asgn-1", "seed-asgn-2", "seed-asgn-3", "seed-asgn-4"]) {
      await prisma.submission.upsert({
        where: { assignmentId_studentId: { assignmentId: id, studentId: uid } },
        update: {},
        create: { assignmentId: id, studentId: uid, status: "open", updatedAt: now },
      });
    }
  }
  // Open submissions for Mia and Tom (10a)
  for (const email of ["mia@schule.de", "tom@schule.de"]) {
    const uid = userIds[email];
    for (const id of ["seed-asgn-8", "seed-asgn-9", "seed-asgn-10", "seed-asgn-11"]) {
      await prisma.submission.upsert({
        where: { assignmentId_studentId: { assignmentId: id, studentId: uid } },
        update: {},
        create: { assignmentId: id, studentId: uid, status: "open", updatedAt: now },
      });
    }
  }
  console.log("  ✓ Abgaben");

  // ── Grades ───────────────────────────────────────────────────
  const annaId = userIds["anna@schule.de"];
  const timId = userIds["tim@schule.de"];
  const miaId = userIds["mia@schule.de"];
  const tomId = userIds["tom@schule.de"];

  const gradeDefs = [
    // Lukas (9b)
    { studentId: lukasId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.M, value: 2.3, weight: 3, type: "klausur", comment: "Gute Leistung, kleine Rechenfehler", date: d(-67), submissionId: null },
    { studentId: lukasId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.M, value: 1.7, weight: 1, type: "hausaufgabe", comment: null, date: d(-7), submissionId: null },
    { studentId: lukasId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.M, value: 2.0, weight: 2, type: "muendlich", comment: "Aktive Beteiligung", date: d(-30), submissionId: null },
    { studentId: lukasId, teacherId: userIds["wagner@schule.de"], subjectId: S.subjects.E, value: 1.7, weight: 3, type: "klausur", comment: "Sehr gutes Schreiben", date: d(-50), submissionId: null },
    { studentId: lukasId, teacherId: userIds["wagner@schule.de"], subjectId: S.subjects.E, value: 2.0, weight: 2, type: "muendlich", comment: null, date: d(-20), submissionId: null },
    { studentId: lukasId, teacherId: userIds["wagner@schule.de"], subjectId: S.subjects.E, value: 1.8, weight: 1, type: "test", comment: null, date: d(-7), submissionId: subIds["seed-asgn-6"] ?? null },
    { studentId: lukasId, teacherId: userIds["klein@schule.de"], subjectId: S.subjects.D, value: 2.7, weight: 3, type: "klausur", comment: "Argumentation könnte stärker sein", date: d(-40), submissionId: null },
    { studentId: lukasId, teacherId: userIds["klein@schule.de"], subjectId: S.subjects.D, value: 3.0, weight: 2, type: "muendlich", comment: null, date: d(-15), submissionId: null },
    { studentId: lukasId, teacherId: userIds["heinrich@schule.de"], subjectId: S.subjects.Bio, value: 2.0, weight: 2, type: "projekt", comment: "Sehr gutes Referat", date: d(-2), submissionId: subIds["seed-asgn-5"] ?? null },
    { studentId: lukasId, teacherId: userIds["heinrich@schule.de"], subjectId: S.subjects.Bio, value: 1.5, weight: 1, type: "muendlich", comment: "Sehr engagiert", date: d(-25), submissionId: null },
    // Anna (9b)
    { studentId: annaId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.M, value: 1.3, weight: 3, type: "klausur", comment: "Ausgezeichnete Arbeit", date: d(-65), submissionId: null },
    { studentId: annaId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.M, value: 1.7, weight: 2, type: "muendlich", comment: null, date: d(-28), submissionId: null },
    { studentId: annaId, teacherId: userIds["wagner@schule.de"], subjectId: S.subjects.E, value: 1.0, weight: 3, type: "klausur", comment: "Perfekte Grammatik", date: d(-48), submissionId: null },
    { studentId: annaId, teacherId: userIds["klein@schule.de"], subjectId: S.subjects.D, value: 2.3, weight: 3, type: "klausur", comment: null, date: d(-38), submissionId: null },
    { studentId: annaId, teacherId: userIds["heinrich@schule.de"], subjectId: S.subjects.Bio, value: 1.7, weight: 2, type: "muendlich", comment: "Sehr gut vorbereitet", date: d(-22), submissionId: null },
    // Tim (9b)
    { studentId: timId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.M, value: 3.7, weight: 3, type: "klausur", comment: "Bitte mehr üben", date: d(-63), submissionId: null },
    { studentId: timId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.M, value: 3.0, weight: 1, type: "hausaufgabe", comment: null, date: d(-9), submissionId: null },
    { studentId: timId, teacherId: userIds["wagner@schule.de"], subjectId: S.subjects.E, value: 2.7, weight: 3, type: "klausur", comment: null, date: d(-45), submissionId: null },
    { studentId: timId, teacherId: userIds["klein@schule.de"], subjectId: S.subjects.D, value: 4.0, weight: 3, type: "klausur", comment: "Aufsatz noch nicht strukturiert genug", date: d(-35), submissionId: null },
    { studentId: timId, teacherId: userIds["heinrich@schule.de"], subjectId: S.subjects.Bio, value: 2.3, weight: 2, type: "muendlich", comment: null, date: d(-18), submissionId: null },
    // Mia (10a)
    { studentId: miaId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.M, value: 2.0, weight: 3, type: "klausur", comment: "Solide Arbeit", date: d(-60), submissionId: null },
    { studentId: miaId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.Ph, value: 2.3, weight: 2, type: "klausur", comment: null, date: d(-42), submissionId: null },
    { studentId: miaId, teacherId: userIds["wagner@schule.de"], subjectId: S.subjects.E, value: 1.7, weight: 3, type: "klausur", comment: "Sehr ausdrucksstark", date: d(-55), submissionId: null },
    { studentId: miaId, teacherId: userIds["klein@schule.de"], subjectId: S.subjects.D, value: 2.7, weight: 3, type: "klausur", comment: null, date: d(-33), submissionId: null },
    { studentId: miaId, teacherId: userIds["heinrich@schule.de"], subjectId: S.subjects.Bio, value: 1.3, weight: 2, type: "muendlich", comment: "Begeisternd", date: d(-20), submissionId: null },
    // Tom (10a)
    { studentId: tomId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.M, value: 3.3, weight: 3, type: "klausur", comment: "Mehr Übung empfohlen", date: d(-58), submissionId: null },
    { studentId: tomId, teacherId: userIds["becker@schule.de"], subjectId: S.subjects.Ph, value: 2.7, weight: 2, type: "klausur", comment: null, date: d(-40), submissionId: null },
    { studentId: tomId, teacherId: userIds["wagner@schule.de"], subjectId: S.subjects.E, value: 3.0, weight: 3, type: "klausur", comment: null, date: d(-52), submissionId: null },
    { studentId: tomId, teacherId: userIds["klein@schule.de"], subjectId: S.subjects.D, value: 2.0, weight: 3, type: "klausur", comment: "Gute Entwicklung", date: d(-30), submissionId: null },
    { studentId: tomId, teacherId: userIds["heinrich@schule.de"], subjectId: S.subjects.Bio, value: 2.7, weight: 2, type: "muendlich", comment: null, date: d(-15), submissionId: null },
  ];

  for (const g of gradeDefs) {
    const exists = await prisma.grade.findFirst({
      where: { studentId: g.studentId, subjectId: g.subjectId, date: g.date, type: g.type },
    });
    if (!exists) {
      await prisma.grade.create({ data: g });
    }
  }
  console.log(`  ✓ ${gradeDefs.length} Noten`);

  // ── MessageThreads + Messages ────────────────────────────────
  const threadDefs = [
    { id: "seed-thread-1", subject: "Frage zu Lukas' Mathe-Note", updatedAt: d(-1) },
    { id: "seed-thread-2", subject: "Frage zu Aufgabe 5b — pq-Formel", updatedAt: d(0) },
    { id: "seed-thread-3", subject: "Konferenz heute 15 Uhr — Erinnerung", updatedAt: d(0) },
  ];
  for (const t of threadDefs) {
    await prisma.messageThread.upsert({
      where: { id: t.id },
      update: { updatedAt: t.updatedAt },
      create: { id: t.id, subject: t.subject, schoolId: school.id, updatedAt: t.updatedAt },
    });
  }

  const participantDefs = [
    { threadId: "seed-thread-1", userId: userIds["sandra.meier@email.de"] },
    { threadId: "seed-thread-1", userId: userIds["becker@schule.de"] },
    { threadId: "seed-thread-1", userId: lukasId },
    { threadId: "seed-thread-2", userId: userIds["anna@schule.de"] },
    { threadId: "seed-thread-2", userId: userIds["becker@schule.de"] },
    { threadId: "seed-thread-3", userId: userIds["admin@schule.de"] },
    { threadId: "seed-thread-3", userId: userIds["becker@schule.de"] },
    { threadId: "seed-thread-3", userId: userIds["wagner@schule.de"] },
    { threadId: "seed-thread-3", userId: userIds["klein@schule.de"] },
  ];
  for (const p of participantDefs) {
    await prisma.messageParticipant.upsert({
      where: { threadId_userId: { threadId: p.threadId, userId: p.userId } },
      update: {},
      create: p,
    });
  }

  const messageDefs = [
    { threadId: "seed-thread-1", senderEmail: "sandra.meier@email.de", content: "Guten Tag Hr. Becker, kann ich kurz mit Ihnen über Lukas' Mathe-Note sprechen? Die letzte Klassenarbeit hat ihn sehr beschäftigt.", sentAt: d(-2) },
    { threadId: "seed-thread-1", senderEmail: "becker@schule.de", content: "Guten Tag Frau Meier, gerne. Lukas hat eine 2,3 bekommen — das ist ein gutes Ergebnis. Er hat aber bei Aufgabe 4 einen Denkfehler. Ich empfehle, die Gleichungssysteme nochmal zu üben.", sentAt: d(-1) },
    { threadId: "seed-thread-1", senderEmail: "sandra.meier@email.de", content: "Vielen Dank! Haben Sie Übungsaufgaben, die Lukas zuhause machen kann?", sentAt: d(-1) },
    { threadId: "seed-thread-2", senderEmail: "anna@schule.de", content: "Hallo Hr. Becker, ich habe eine Frage zu Aufgabe 5b — wie genau wende ich die pq-Formel an, wenn p = 4 und q = -12?", sentAt: d(0) },
    { threadId: "seed-thread-2", senderEmail: "becker@schule.de", content: "Hi Anna, x = -(p/2) ± √((p/2)² - q) = -2 ± √(4+12) = -2 ± 4. Also x₁ = 2, x₂ = -6.", sentAt: d(0) },
    { threadId: "seed-thread-3", senderEmail: "admin@schule.de", content: "Erinnerung: Konferenz heute 15 Uhr — Themen: Notenkonferenz, Projektwoche. Bitte pünktlich erscheinen.", sentAt: d(0) },
  ];
  for (const m of messageDefs) {
    const exists = await prisma.message.findFirst({
      where: { threadId: m.threadId, senderId: userIds[m.senderEmail], sentAt: m.sentAt },
    });
    if (!exists) {
      await prisma.message.create({ data: { threadId: m.threadId, senderId: userIds[m.senderEmail], content: m.content, sentAt: m.sentAt } });
    }
  }
  console.log("  ✓ Nachrichten-Threads & Nachrichten");

  // ── FlashcardDecks + Flashcards ──────────────────────────────
  const deckDefs = [
    { id: "seed-deck-1", name: "Mathe — Quadratische Gleichungen", userId: lukasId, subjectId: S.subjects.M },
    { id: "seed-deck-2", name: "Englisch — Unit 7 Vokabeln", userId: lukasId, subjectId: S.subjects.E },
    { id: "seed-deck-3", name: "Bio — Photosynthese", userId: lukasId, subjectId: S.subjects.Bio },
  ];
  for (const deck of deckDefs) {
    await prisma.flashcardDeck.upsert({
      where: { id: deck.id },
      update: { updatedAt: now },
      create: { ...deck, updatedAt: now },
    });
  }

  const cardDefs = [
    { deckId: "seed-deck-1", front: "Was ist die pq-Formel?", back: "x = -(p/2) ± √((p/2)² - q)", nextReviewAt: d(1), interval: 2, easeFactor: 2.5, repetitions: 3 },
    { deckId: "seed-deck-1", front: "Was ist die Diskriminante?", back: "D = (p/2)² - q  →  D>0: 2 Lösungen, D=0: 1, D<0: keine", nextReviewAt: d(0), interval: 1, easeFactor: 2.1, repetitions: 1 },
    { deckId: "seed-deck-1", front: "Wie löst man x² - 5x + 6 = 0?", back: "p=-5, q=6  →  x = 2,5 ± 0,5  →  x₁=3, x₂=2", nextReviewAt: d(3), interval: 4, easeFactor: 2.6, repetitions: 5 },
    { deckId: "seed-deck-1", front: "Was ist der Scheitelpunkt einer Parabel?", back: "S = (-p/2 | -D)", nextReviewAt: d(-1), interval: 1, easeFactor: 2.0, repetitions: 0 },
    { deckId: "seed-deck-2", front: "ambitious", back: "ehrgeizig", nextReviewAt: d(2), interval: 3, easeFactor: 2.5, repetitions: 4 },
    { deckId: "seed-deck-2", front: "to negotiate", back: "verhandeln", nextReviewAt: d(0), interval: 1, easeFactor: 2.2, repetitions: 1 },
    { deckId: "seed-deck-2", front: "challenge", back: "Herausforderung", nextReviewAt: d(1), interval: 2, easeFactor: 2.4, repetitions: 3 },
    { deckId: "seed-deck-2", front: "sustainable", back: "nachhaltig", nextReviewAt: d(-1), interval: 1, easeFactor: 1.9, repetitions: 0 },
    { deckId: "seed-deck-2", front: "responsibility", back: "Verantwortung", nextReviewAt: d(4), interval: 5, easeFactor: 2.7, repetitions: 6 },
    { deckId: "seed-deck-3", front: "Was ist Photosynthese?", back: "6 CO₂ + 6 H₂O + Licht → C₆H₁₂O₆ + 6 O₂", nextReviewAt: d(1), interval: 2, easeFactor: 2.5, repetitions: 3 },
    { deckId: "seed-deck-3", front: "Wo findet Photosynthese statt?", back: "In den Chloroplasten der Pflanzenzelle", nextReviewAt: d(0), interval: 1, easeFactor: 2.3, repetitions: 2 },
    { deckId: "seed-deck-3", front: "Was ist Chlorophyll?", back: "Grüner Farbstoff in Chloroplasten, absorbiert Lichtenergie", nextReviewAt: d(2), interval: 3, easeFactor: 2.4, repetitions: 4 },
  ];
  for (const fc of cardDefs) {
    const exists = await prisma.flashcard.findFirst({ where: { deckId: fc.deckId, front: fc.front } });
    if (!exists) {
      await prisma.flashcard.create({ data: fc });
    }
  }
  console.log(`  ✓ ${cardDefs.length} Karteikarten in 3 Decks`);

  // ── AppNotifications ─────────────────────────────────────────
  const notifDefs = [
    { userId: lukasId, type: "assignment", title: "Neue Aufgabe: Erörterung", body: "Fr. Klein hat eine neue Aufgabe gestellt — fällig morgen.", linkUrl: "/app/aufgaben", readAt: null, createdAt: d(-1) },
    { userId: lukasId, type: "grade", title: "Neue Note: Biologie", body: "Hr. Heinrich hat dein Referat benotet: 2,0.", linkUrl: "/app/noten", readAt: null, createdAt: d(-2) },
    { userId: lukasId, type: "message", title: "Neue Nachricht", body: "Mutter hat auf deine Nachricht geantwortet.", linkUrl: "/app/nachrichten", readAt: null, createdAt: d(-1) },
    { userId: lukasId, type: "assignment", title: "Bald fällig: Quadratische Gleichungen", body: "Die Hausaufgabe ist heute fällig.", linkUrl: "/app/aufgaben", readAt: d(-1), createdAt: d(-2) },
    { userId: userIds["becker@schule.de"], type: "message", title: "Neue Nachricht von Sandra Meier", body: "Sandra Meier hat eine Frage zu Lukas' Note.", linkUrl: "/teach/nachrichten", readAt: null, createdAt: d(-1) },
    { userId: userIds["becker@schule.de"], type: "message", title: "Frage von Anna Bauer", body: "Anna Bauer hat eine Frage zur pq-Formel.", linkUrl: "/teach/nachrichten", readAt: null, createdAt: d(0) },
  ];
  for (const n of notifDefs) {
    const exists = await prisma.appNotification.findFirst({ where: { userId: n.userId, title: n.title } });
    if (!exists) {
      await prisma.appNotification.create({ data: n });
    }
  }
  console.log(`  ✓ ${notifDefs.length} Benachrichtigungen`);

  // ── LearningPaths ────────────────────────────────────────────
  const pathDefs = [
    {
      id: "seed-path-1",
      schoolId: school.id,
      subjectId: S.subjects.M,
      title: "Quadratische Funktionen",
      description: "Von der Normalparabel bis zur Lösungsformel — Schritt für Schritt.",
      createdById: userIds["becker@schule.de"],
      modules: [
        {
          id: "seed-mod-1a",
          title: "Grundlagen: Parabel und Scheitelpunkt",
          order: 1,
          questions: [
            { id: "seed-q-1a1", question: "Was beschreibt die Gleichung y = x²?", options: JSON.stringify(["Eine Gerade", "Eine Normalparabel", "Eine Hyperbel", "Einen Kreis"]), correct: "1", explanation: "y = x² ist die Grundform der Normalparabel.", order: 1 },
            { id: "seed-q-1a2", question: "Wo liegt der Scheitelpunkt der Parabel y = x²?", options: JSON.stringify(["(1, 1)", "(0, 0)", "(-1, 0)", "(0, 1)"]), correct: "1", explanation: "Bei y = x² liegt der Scheitelpunkt im Ursprung (0, 0).", order: 2 },
            { id: "seed-q-1a3", question: "Welche Parabel öffnet sich nach unten?", options: JSON.stringify(["y = x²", "y = 2x²", "y = -x²", "y = x² + 1"]), correct: "2", explanation: "Ist der Koeffizient vor x² negativ, öffnet die Parabel nach unten.", order: 3 },
          ],
        },
        {
          id: "seed-mod-1b",
          title: "Die pq-Formel",
          order: 2,
          questions: [
            { id: "seed-q-1b1", question: "Die pq-Formel lautet x = ?", options: JSON.stringify(["x = -p ± √(p² - q)", "x = -(p/2) ± √((p/2)² - q)", "x = p/2 ± √(q - p²)", "x = -p/2 ± √(p - q)"]), correct: "1", explanation: "Die pq-Formel: x = -(p/2) ± √((p/2)² - q)", order: 1 },
            { id: "seed-q-1b2", question: "Wann hat x² + px + q = 0 keine reellen Lösungen?", options: JSON.stringify(["Wenn p > 0", "Wenn (p/2)² - q > 0", "Wenn (p/2)² - q < 0", "Wenn q = 0"]), correct: "2", explanation: "Ist die Diskriminante D = (p/2)² - q negativ, gibt es keine reellen Lösungen.", order: 2 },
          ],
        },
      ],
    },
    {
      id: "seed-path-2",
      schoolId: school.id,
      subjectId: S.subjects.Bio,
      title: "Zellbiologie Grundlagen",
      description: "Aufbau und Funktion der Zelle — von der Zellmembran bis zum Zellkern.",
      createdById: userIds["heinrich@schule.de"],
      modules: [
        {
          id: "seed-mod-2a",
          title: "Zellbestandteile",
          order: 1,
          questions: [
            { id: "seed-q-2a1", question: "Welches Organell wird als Kraftwerk der Zelle bezeichnet?", options: JSON.stringify(["Ribosom", "Zellkern", "Mitochondrium", "Vakuole"]), correct: "2", explanation: "Das Mitochondrium produziert ATP durch Zellatmung.", order: 1 },
            { id: "seed-q-2a2", question: "Wo findet die Proteinbiosynthese statt?", options: JSON.stringify(["Im Zellkern", "An Ribosomen", "In der Vakuole", "Im Chloroplast"]), correct: "1", explanation: "Ribosomen sind der Ort der Proteinsynthese.", order: 2 },
            { id: "seed-q-2a3", question: "Was enthält der Zellkern?", options: JSON.stringify(["ATP", "Die DNA mit dem genetischen Material", "Chlorophyll", "Stärke"]), correct: "1", explanation: "Der Zellkern enthält die DNA und kontrolliert die Zellfunktionen.", order: 3 },
          ],
        },
        {
          id: "seed-mod-2b",
          title: "Fotosynthese",
          order: 2,
          questions: [
            { id: "seed-q-2b1", question: "Was sind die Edukte der Fotosynthese?", options: JSON.stringify(["O₂ + C₆H₁₂O₆", "CO₂ + H₂O + Licht", "ATP + ADP", "Glucose + O₂"]), correct: "1", explanation: "Fotosynthese: 6 CO₂ + 6 H₂O + Licht → C₆H₁₂O₆ + 6 O₂", order: 1 },
            { id: "seed-q-2b2", question: "In welchem Organell findet Fotosynthese statt?", options: JSON.stringify(["Mitochondrium", "Ribosom", "Chloroplast", "Zellkern"]), correct: "2", explanation: "Chloroplasten enthalten Chlorophyll und sind der Ort der Fotosynthese.", order: 2 },
          ],
        },
      ],
    },
  ];

  for (const path of pathDefs) {
    await prisma.learningPath.upsert({
      where: { id: path.id },
      update: {},
      create: { id: path.id, schoolId: path.schoolId, subjectId: path.subjectId, title: path.title, description: path.description, createdById: path.createdById },
    });
    for (const mod of path.modules) {
      await prisma.learningModule.upsert({
        where: { id: mod.id },
        update: {},
        create: { id: mod.id, pathId: path.id, title: mod.title, order: mod.order },
      });
      for (const q of mod.questions) {
        await prisma.quizQuestion.upsert({
          where: { id: q.id },
          update: {},
          create: { id: q.id, moduleId: mod.id, question: q.question, options: q.options, correct: q.correct, explanation: q.explanation, order: q.order },
        });
      }
    }
  }
  console.log(`  ✓ ${pathDefs.length} Lernpfade`);

  // ── ExerciseTopics + ExerciseLessons + ExerciseQuestions ──────
  const exerciseDefs = [
    // ── MATHEMATIK ────────────────────────────────────────────────
    {
      id: "seed-etopic-m5", subject: "mathematik", grade: 5, order: 1,
      title: "Brüche und Dezimalzahlen",
      description: "Brüche verstehen, kürzen, addieren und in Dezimalzahlen umwandeln.",
      lesson: "## Brüche\n\nEin **Bruch** besteht aus Zähler (oben) und Nenner (unten). `3/4` bedeutet: von 4 gleichen Teilen nimmst du 3.\n\n### Kürzen\nDividiere Zähler und Nenner durch denselben Wert: `6/8 = 3/4`\n\n### Umwandlung in Dezimalzahlen\nDivide Zähler durch Nenner: `3/4 = 0,75`",
      questions: [
        { type: "fill_blank", question: "6/8 gekürzt ergibt ___ / ___.", correct: JSON.stringify(["3", "4"]), options: null, explanation: "Zähler und Nenner durch 2 dividieren: 6÷2=3, 8÷2=4.", order: 1 },
        { type: "mc", question: "Welcher Bruch ist gleich 0,5?", options: JSON.stringify(["1/4", "1/2", "2/3", "3/5"]), correct: "1", explanation: "1/2 = 0,5 weil 1 ÷ 2 = 0,5.", order: 2 },
        { type: "true_false", question: "3/4 ist größer als 0,8.", correct: "false", options: null, explanation: "3/4 = 0,75 < 0,8.", order: 3 },
        { type: "mc", question: "Was ergibt 1/3 + 1/3?", options: JSON.stringify(["1/6", "2/6", "2/3", "1"]), correct: "2", explanation: "1/3 + 1/3 = 2/3 (Zähler addieren, Nenner bleibt).", order: 4 },
      ],
    },
    {
      id: "seed-etopic-m7", subject: "mathematik", grade: 7, order: 1,
      title: "Lineare Funktionen",
      description: "y = mx + b verstehen, Steigung und y-Achsenabschnitt bestimmen.",
      lesson: "## Lineare Funktionen\n\nEine lineare Funktion hat die Form `y = mx + b`.\n\n- **m** = Steigung (wie steil die Gerade ist)\n- **b** = y-Achsenabschnitt (wo die Gerade die y-Achse schneidet)\n\n### Beispiel: y = 2x + 1\n- Steigung m = 2 (pro 1 Schritt rechts → 2 Schritte hoch)\n- y-Achsenabschnitt b = 1",
      questions: [
        { type: "mc", question: "Was ist die Steigung von y = 3x − 5?", options: JSON.stringify(["−5", "3", "5", "x"]), correct: "1", explanation: "In y = mx + b ist m die Steigung. Hier m = 3.", order: 1 },
        { type: "fill_blank", question: "Bei y = 2x + 4 ist der y-Achsenabschnitt ___.", correct: JSON.stringify(["4"]), options: null, explanation: "b = 4, das ist der Wert wenn x = 0.", order: 2 },
        { type: "true_false", question: "Die Funktion y = −x + 2 hat eine negative Steigung.", correct: "true", options: null, explanation: "m = −1, also negative Steigung.", order: 3 },
        { type: "order", question: "Bringe die Schritte zum Zeichnen einer linearen Funktion in die richtige Reihenfolge:", options: JSON.stringify(["y-Achsenabschnitt b einzeichnen", "Steigung m anlegen (Δx=1, Δy=m)", "Koordinatensystem zeichnen", "Gerade durch die beiden Punkte ziehen"]), correct: JSON.stringify([2, 0, 1, 3]), explanation: "Erst Koordinatensystem, dann b, dann Steigung, dann Gerade.", order: 4 },
      ],
    },
    {
      id: "seed-etopic-m9", subject: "mathematik", grade: 9, order: 1,
      title: "Quadratische Gleichungen",
      description: "Die pq-Formel anwenden und quadratische Gleichungen lösen.",
      lesson: "## Quadratische Gleichungen\n\nStandardform: `x² + px + q = 0`\n\n### pq-Formel\n`x = -(p/2) ± √((p/2)² - q)`\n\n### Diskriminante\nD = (p/2)² - q\n- D > 0: zwei Lösungen\n- D = 0: eine Lösung\n- D < 0: keine reellen Lösungen\n\n### Beispiel: x² - 5x + 6 = 0\np = -5, q = 6 → x = 2,5 ± √(6,25-6) = 2,5 ± 0,5 → **x₁ = 3, x₂ = 2**",
      questions: [
        { type: "mc", question: "Was ist die pq-Formel?", options: JSON.stringify(["x = −p ± √(p²−q)", "x = −(p/2) ± √((p/2)²−q)", "x = p/2 ± √(q−p)", "x = −p ± √(q)"]), correct: "1", explanation: "x = −(p/2) ± √((p/2)²−q) ist die korrekte pq-Formel.", order: 1 },
        { type: "fill_blank", question: "Bei x² − 5x + 6 = 0 ist p = ___ und q = ___.", correct: JSON.stringify(["-5", "6"]), options: null, explanation: "In x² + px + q: p = −5, q = 6.", order: 2 },
        { type: "true_false", question: "x² + 2x + 5 = 0 hat zwei reelle Lösungen.", correct: "false", options: null, explanation: "D = (2/2)² − 5 = 1 − 5 = −4 < 0 → keine reellen Lösungen.", order: 3 },
        { type: "mc", question: "Wie viele Lösungen hat x² − 6x + 9 = 0?", options: JSON.stringify(["Keine", "Genau eine", "Zwei verschiedene", "Unendlich viele"]), correct: "1", explanation: "D = (−3)² − 9 = 9 − 9 = 0 → genau eine Lösung (Doppelwurzel).", order: 4 },
      ],
    },
    // ── DEUTSCH ───────────────────────────────────────────────────
    {
      id: "seed-etopic-d5", subject: "deutsch", grade: 5, order: 1,
      title: "Wortarten bestimmen",
      description: "Nomen, Verben, Adjektive, Pronomen und Artikel sicher erkennen.",
      lesson: "## Wortarten\n\n| Wortart | Frage | Beispiel |\n|---------|-------|----------|\n| **Nomen** | Wer/Was? | Hund, Schule |\n| **Verb** | Was tut es? | laufen, sein |\n| **Adjektiv** | Wie? | schnell, groß |\n| **Pronomen** | Ersetzt Nomen | er, sie, ich |\n| **Artikel** | Begleitet Nomen | der, die, das |",
      questions: [
        { type: "mc", question: "Welche Wortart ist das Wort Schule?", options: JSON.stringify(["Verb", "Adjektiv", "Nomen", "Pronomen"]), correct: "2", explanation: "Schule ist ein Nomen — erkennbar an dem Artikel die Schule.", order: 1 },
        { type: "mc", question: "Welche Wortart ist laufen?", options: JSON.stringify(["Nomen", "Verb", "Adjektiv", "Artikel"]), correct: "1", explanation: "Verben beschreiben Tätigkeiten oder Zustände.", order: 2 },
        { type: "true_false", question: "Das Wort schnell ist ein Adjektiv.", correct: "true", options: null, explanation: "Adjektive beschreiben Eigenschaften: wie? → schnell.", order: 3 },
        { type: "match", question: "Ordne die Wörter ihrer Wortart zu:", options: JSON.stringify({ left: ["Freude", "lachen", "herrlich", "sie"], right: ["Verb", "Pronomen", "Adjektiv", "Nomen"] }), correct: JSON.stringify([3, 0, 2, 1]), explanation: "Freude=Nomen, lachen=Verb, herrlich=Adjektiv, sie=Pronomen.", order: 4 },
      ],
    },
    {
      id: "seed-etopic-d9", subject: "deutsch", grade: 9, order: 1,
      title: "Die Erörterung",
      description: "Aufbau, Argumentation und Schreibstil einer Erörterung beherrschen.",
      lesson: "## Erörterung\n\nEine Erörterung untersucht ein Thema aus verschiedenen Perspektiven.\n\n### Aufbau\n1. **Einleitung** — Hinführung zum Thema, These\n2. **Hauptteil** — Argumente mit Belegen (Sanduhr-Prinzip: schwach → stark)\n3. **Schluss** — Zusammenfassung, eigene Meinung\n\n### Gutes Argument\n- **Behauptung** + **Begründung** + **Beispiel**",
      questions: [
        { type: "order", question: "Bringe die Teile einer Erörterung in die richtige Reihenfolge:", options: JSON.stringify(["Schluss mit eigener Meinung", "Einleitung mit Hinführung", "Hauptteil mit Gegenargumenten", "Hauptteil mit eigenen Argumenten"]), correct: JSON.stringify([1, 3, 2, 0]), explanation: "Einleitung → eigene Argumente → Gegenargumente → Schluss.", order: 1 },
        { type: "mc", question: "Was ist beim Sanduhr-Prinzip die Reihenfolge der Argumente?", options: JSON.stringify(["Stärkstes zuerst", "Beliebig", "Schwächste zuerst, stärkstes zuletzt", "Alphabetisch"]), correct: "2", explanation: "Im Sanduhr-Prinzip startet man mit schwachen Argumenten und endet mit dem stärksten.", order: 2 },
        { type: "true_false", question: "In der Einleitung nennt man bereits alle Argumente.", correct: "false", options: null, explanation: "Die Einleitung führt nur zum Thema hin und enthält die These — keine Argumente.", order: 3 },
      ],
    },
    // ── ENGLISCH ──────────────────────────────────────────────────
    {
      id: "seed-etopic-e5", subject: "englisch", grade: 5, order: 1,
      title: "Simple Present",
      description: "Das Simple Present bilden und für Gewohnheiten und allgemeine Wahrheiten verwenden.",
      lesson: "## Simple Present\n\nDas Simple Present beschreibt **Gewohnheiten**, **regelmäßige Handlungen** und **allgemeine Wahrheiten**.\n\n### Bildung\n- I/you/we/they: Grundform — *I play football*\n- he/she/it: + **s** oder **es** — *She plays football*\n\n### Signalwörter\nalways, usually, often, sometimes, never, every day",
      questions: [
        { type: "fill_blank", question: "She ___ (play) tennis every Saturday.", correct: JSON.stringify(["plays"]), options: null, explanation: "Bei he/she/it wird -s angehängt: play → plays.", order: 1 },
        { type: "true_false", question: "Im Simple Present fügt man bei 'I' ein -s an das Verb.", correct: "false", options: null, explanation: "Nur bei he/she/it wird -s angehängt.", order: 2 },
        { type: "mc", question: "Welches Signalwort zeigt Simple Present an?", options: JSON.stringify(["yesterday", "every day", "last week", "at the moment"]), correct: "1", explanation: "'every day' ist ein typisches Simple-Present-Signalwort.", order: 3 },
        { type: "fill_blank", question: "He ___ (go) to school by bike.", correct: JSON.stringify(["goes"]), options: null, explanation: "go + es bei he/she/it → goes.", order: 4 },
      ],
    },
    {
      id: "seed-etopic-e9", subject: "englisch", grade: 9, order: 1,
      title: "Present Perfect",
      description: "Present Perfect bilden und von Simple Past abgrenzen.",
      lesson: "## Present Perfect\n\nBildung: **have/has + past participle**\n\n### Verwendung\n- Erfahrungen: *I have been to Paris.*\n- Kürzliche Handlungen: *She has just finished her homework.*\n- Noch anhaltende Zustände: *I have lived here for 5 years.*\n\n### Signalwörter\never, never, already, yet, just, for, since\n\n### vs. Simple Past\nSimple Past = **abgeschlossene** Handlung mit Zeitangabe: *I went to Paris last year.*",
      questions: [
        { type: "mc", question: "Wie bildet man Present Perfect?", options: JSON.stringify(["did + Infinitiv", "have/has + past participle", "was/were + -ing", "will + Infinitiv"]), correct: "1", explanation: "Present Perfect = have/has + past participle.", order: 1 },
        { type: "true_false", question: "'I have seen that film yesterday' ist grammatikalisch korrekt.", correct: "false", options: null, explanation: "Mit einer genauen Zeitangabe wie 'yesterday' verwendet man Simple Past: 'I saw that film yesterday.'", order: 2 },
        { type: "fill_blank", question: "She ___ never ___ (eat) sushi.", correct: JSON.stringify(["has", "eaten"]), options: null, explanation: "has + past participle von eat = eaten.", order: 3 },
      ],
    },
    // ── PHYSIK ────────────────────────────────────────────────────
    {
      id: "seed-etopic-ph7", subject: "physik", grade: 7, order: 1,
      title: "Kraft und Masse",
      description: "Den Unterschied zwischen Masse und Gewichtskraft verstehen. F = m · g.",
      lesson: "## Kraft und Masse\n\n**Masse** (m) — gibt an, wie viel Materie ein Körper enthält. Einheit: kg\n\n**Gewichtskraft** (G) — die Kraft, mit der die Erde einen Körper anzieht. Einheit: N (Newton)\n\n### Formel\n`G = m · g`\n\nDabei ist g = 10 N/kg (Erdbeschleunigung)\n\n**Beispiel:** m = 5 kg → G = 5 · 10 = **50 N**",
      questions: [
        { type: "mc", question: "Was ist die Einheit der Kraft?", options: JSON.stringify(["kg", "N (Newton)", "m/s", "Pa"]), correct: "1", explanation: "Kräfte werden in Newton (N) gemessen.", order: 1 },
        { type: "fill_blank", question: "Ein Körper mit m = 3 kg hat eine Gewichtskraft von ___ N.", correct: JSON.stringify(["30"]), options: null, explanation: "G = m · g = 3 · 10 = 30 N.", order: 2 },
        { type: "true_false", question: "Masse und Gewichtskraft sind dasselbe.", correct: "false", options: null, explanation: "Masse (kg) ist die Materiemenge; Gewichtskraft (N) ist die Anziehungskraft der Erde.", order: 3 },
      ],
    },
    {
      id: "seed-etopic-ph9", subject: "physik", grade: 9, order: 1,
      title: "Elektrischer Strom",
      description: "Spannung, Stromstärke und Widerstand mit dem Ohmschen Gesetz berechnen.",
      lesson: "## Elektrischer Strom\n\n| Größe | Symbol | Einheit |\n|-------|--------|--------|\n| Spannung | U | Volt (V) |\n| Stromstärke | I | Ampere (A) |\n| Widerstand | R | Ohm (Ω) |\n\n### Ohmsches Gesetz\n`U = R · I` (Spannung = Widerstand · Stromstärke)\n\nUmformen: `R = U/I` und `I = U/R`",
      questions: [
        { type: "fill_blank", question: "Ohmsches Gesetz: U = ___ · ___.", correct: JSON.stringify(["R", "I"]), options: null, explanation: "U = R · I", order: 1 },
        { type: "mc", question: "Ein Widerstand von 4 Ω liegt an 12 V. Welcher Strom fließt?", options: JSON.stringify(["2 A", "3 A", "48 A", "0,3 A"]), correct: "1", explanation: "I = U/R = 12/4 = 3 A.", order: 2 },
        { type: "true_false", question: "Erhöht man bei gleichem Widerstand die Spannung, steigt die Stromstärke.", correct: "true", options: null, explanation: "I = U/R — höhere Spannung → höhere Stromstärke.", order: 3 },
      ],
    },
    // ── CHEMIE ────────────────────────────────────────────────────
    {
      id: "seed-etopic-ch7", subject: "chemie", grade: 7, order: 1,
      title: "Atombau",
      description: "Protonen, Neutronen und Elektronen kennen und Ordnungszahl verstehen.",
      lesson: "## Atombau\n\nJedes Atom besteht aus:\n- **Kern**: Protonen (+) + Neutronen (neutral)\n- **Hülle**: Elektronen (−)\n\n### Ordnungszahl\nDie **Ordnungszahl** (= Protonenzahl) bestimmt das Element.\n\n**Beispiel Kohlenstoff (C):** Ordnungszahl 6 → 6 Protonen, 6 Elektronen, 6 Neutronen",
      questions: [
        { type: "mc", question: "Wo befinden sich die Elektronen?", options: JSON.stringify(["Im Atomkern", "In der Atomhülle", "Überall im Atom", "Zwischen zwei Atomen"]), correct: "1", explanation: "Elektronen umkreisen den Kern in der Atomhülle.", order: 1 },
        { type: "fill_blank", question: "Die Ordnungszahl eines Elements entspricht der Anzahl seiner ___.", correct: JSON.stringify(["Protonen"]), options: null, explanation: "Die Ordnungszahl = Protonenzahl.", order: 2 },
        { type: "true_false", question: "Neutronen sind negativ geladen.", correct: "false", options: null, explanation: "Neutronen haben keine Ladung, sie sind elektrisch neutral.", order: 3 },
      ],
    },
    {
      id: "seed-etopic-ch9", subject: "chemie", grade: 9, order: 1,
      title: "Chemische Reaktionen",
      description: "Edukte, Produkte und Reaktionsgleichungen verstehen.",
      lesson: "## Chemische Reaktionen\n\nBei einer chemischen Reaktion entstehen aus **Edukten** (Ausgangsstoffe) neue **Produkte**.\n\n### Reaktionsgleichung\n`Edukte → Produkte`\n\n**Beispiel: Verbrennung von Wasserstoff:**\n`2 H₂ + O₂ → 2 H₂O`\n\n### Energetik\n- **Exotherm**: Energie wird frei (Verbrennung)\n- **Endotherm**: Energie wird aufgenommen (Photosynthese)",
      questions: [
        { type: "mc", question: "Was sind die Produkte bei der Verbrennung von Wasserstoff?", options: JSON.stringify(["CO₂ und H₂O", "H₂O", "O₂", "H₂"]), correct: "1", explanation: "2 H₂ + O₂ → 2 H₂O — einziges Produkt ist Wasser.", order: 1 },
        { type: "true_false", question: "Bei einer exothermen Reaktion wird Energie aufgenommen.", correct: "false", options: null, explanation: "Exotherm = Energie wird abgegeben (Wärme frei). Endotherm = Energie wird aufgenommen.", order: 2 },
        { type: "fill_blank", question: "Die Ausgangsstoffe einer chemischen Reaktion heißen ___.", correct: JSON.stringify(["Edukte"]), options: null, explanation: "Edukte → Produkte.", order: 3 },
      ],
    },
    // ── BIOLOGIE ──────────────────────────────────────────────────
    {
      id: "seed-etopic-bio5", subject: "biologie", grade: 5, order: 1,
      title: "Zellaufbau",
      description: "Zellkern, Zellmembran, Zellwand und Chloroplasten kennenlernen.",
      lesson: "## Die Zelle\n\nAlle Lebewesen bestehen aus Zellen.\n\n### Pflanzenzelle vs. Tierzelle\n| Bestandteil | Pflanzenzelle | Tierzelle |\n|------------|--------------|----------|\n| Zellkern | ✓ | ✓ |\n| Zellmembran | ✓ | ✓ |\n| Zellwand | ✓ | ✗ |\n| Chloroplasten | ✓ | ✗ |\n| Vakuole | groß | klein/keine |",
      questions: [
        { type: "mc", question: "Was haben Pflanzenzellen, das Tierzellen NICHT haben?", options: JSON.stringify(["Zellkern", "Zellmembran", "Zellwand und Chloroplasten", "Ribosomen"]), correct: "2", explanation: "Pflanzenzellen haben zusätzlich Zellwand und Chloroplasten.", order: 1 },
        { type: "true_false", question: "Alle Zellen haben einen Zellkern.", correct: "true", options: null, explanation: "Der Zellkern (mit DNA) ist in allen eukaryotischen Zellen vorhanden.", order: 2 },
        { type: "fill_blank", question: "Chloroplasten enthalten den grünen Farbstoff ___.", correct: JSON.stringify(["Chlorophyll"]), options: null, explanation: "Chlorophyll ist für die grüne Farbe und Photosynthese verantwortlich.", order: 3 },
      ],
    },
    {
      id: "seed-etopic-bio9", subject: "biologie", grade: 9, order: 1,
      title: "Genetik — DNA und Gene",
      description: "DNA-Aufbau, Gene, Chromosomen und Vererbungsregeln nach Mendel.",
      lesson: "## Genetik\n\n### DNA\n- Doppelhelix aus **Nucleotiden** (Zucker + Phosphat + Base)\n- Basenpaare: A-T und G-C\n\n### Chromosomen\n- Menschliche Koerperzellen haben **46 Chromosomen** (23 Paare)\n- **Gen** = Abschnitt der DNA, der ein Merkmal kodiert\n\n### Mendelsche Regeln\n1. Uniformitaetsregel: F1-Generation einheitlich\n2. Spaltungsregel: F2 im Verhaeltnis 3:1",
      questions: [
        { type: "mc", question: "Wie viele Chromosomen hat eine normale menschliche Körperzelle?", options: JSON.stringify(["23", "46", "92", "48"]), correct: "1", explanation: "23 Paare = 46 Chromosomen in jeder Körperzelle.", order: 1 },
        { type: "true_false", question: "A und G sind komplementäre Basenpaare in der DNA.", correct: "false", options: null, explanation: "Die Basenpaare sind A–T und G–C (nicht A–G).", order: 2 },
        { type: "fill_blank", question: "Ein ___ ist ein Abschnitt der DNA, der ein bestimmtes Merkmal kodiert.", correct: JSON.stringify(["Gen"]), options: null, explanation: "Gene sind die Informationseinheiten der DNA.", order: 3 },
      ],
    },
    // ── GESCHICHTE ────────────────────────────────────────────────
    {
      id: "seed-etopic-ge6", subject: "geschichte", grade: 6, order: 1,
      title: "Altes Ägypten",
      description: "Gesellschaft, Pharaonen, Pyramiden und Hieroglyphen im Alten Ägypten.",
      lesson: "## Altes Ägypten\n\n**Zeitraum:** ca. 3100–30 v. Chr.\n\n### Gesellschaft (Pyramide)\n1. Pharao (Herrscher + Gottheit)\n2. Adel, Priester\n3. Beamte, Schreiber\n4. Handwerker, Händler\n5. Bauern\n6. Sklaven\n\n### Bedeutende Errungenschaften\n- **Hieroglyphen** — Bilderschrift\n- **Pyramiden** — Grabmäler der Pharaonen\n- **Kalender** — 365 Tage",
      questions: [
        { type: "mc", question: "Wer stand an der Spitze der ägyptischen Gesellschaft?", options: JSON.stringify(["Priester", "Pharao", "Feldherr", "Schreiber"]), correct: "1", explanation: "Der Pharao war Herrscher und galt als Gottheit.", order: 1 },
        { type: "true_false", question: "Hieroglyphen wurden mit dem Alphabet geschrieben.", correct: "false", options: null, explanation: "Hieroglyphen sind eine Bilderschrift — jedes Zeichen kann ein Wort, einen Laut oder ein Konzept darstellen.", order: 2 },
        { type: "mc", question: "Wozu dienten die Pyramiden?", options: JSON.stringify(["Als Tempel für Gottesdienste", "Als Grabmäler für Pharaonen", "Als Kornspeicher", "Als Observatorien"]), correct: "1", explanation: "Pyramiden waren aufwendige Grabmäler für die Pharaonen.", order: 3 },
      ],
    },
    {
      id: "seed-etopic-ge9", subject: "geschichte", grade: 9, order: 1,
      title: "Weimarer Republik",
      description: "Entstehung, Krise und Scheitern der ersten deutschen Demokratie 1919–1933.",
      lesson: "## Weimarer Republik (1919–1933)\n\n### Gründung\n- Nach dem 1. Weltkrieg und dem Sturz des Kaisers\n- Nationalversammlung in **Weimar** → neue Verfassung 1919\n\n### Krisen\n- **1923**: Hyperinflation, Hitlerputsch\n- **1929**: Weltwirtschaftskrise → Massenarbeitslosigkeit\n\n### Ende\n- 30. Januar 1933: Hitler wird Reichskanzler\n- Ermächtigungsgesetz März 1933 → Ende der Demokratie",
      questions: [
        { type: "order", question: "Ordne die Ereignisse chronologisch:", options: JSON.stringify(["Hitler wird Reichskanzler", "Gründung der Weimarer Republik", "Weltwirtschaftskrise", "Hyperinflation"]), correct: JSON.stringify([1, 3, 2, 0]), explanation: "1919 Gründung → 1923 Hyperinflation → 1929 Weltwirtschaftskrise → 1933 Hitler.", order: 1 },
        { type: "true_false", question: "Die Weimarer Republik war Deutschlands erste demokratische Verfassung.", correct: "true", options: null, explanation: "Mit der Verfassung von 1919 entstand die erste parlamentarische Demokratie Deutschlands.", order: 2 },
        { type: "mc", question: "Was ermöglichte das Ermächtigungsgesetz von 1933?", options: JSON.stringify(["Freie Wahlen", "Hitler ohne Parlament zu regieren", "Die Rückkehr zur Monarchie", "Den Beitritt zum Völkerbund"]), correct: "1", explanation: "Das Ermächtigungsgesetz erlaubte Hitler, ohne Reichstag Gesetze zu erlassen.", order: 3 },
      ],
    },
    // ── INFORMATIK ────────────────────────────────────────────────
    {
      id: "seed-etopic-inf8", subject: "informatik", grade: 8, order: 1,
      title: "Algorithmen und Programme",
      description: "Was ist ein Algorithmus? Ablaufpläne, Schleifen und Verzweigungen.",
      lesson: "## Algorithmen\n\nEin **Algorithmus** ist eine endliche Folge von Schritten zur Lösung eines Problems.\n\n### Eigenschaften\n- **Eindeutig** — jeder Schritt ist klar\n- **Endlich** — endet nach endlich vielen Schritten\n- **Ausführbar** — jeder Schritt ist durchführbar\n\n### Grundstrukturen\n1. **Sequenz** — Schritte nacheinander\n2. **Verzweigung** (if/else) — bedingte Entscheidung\n3. **Schleife** (while/for) — Wiederholung",
      questions: [
        { type: "mc", question: "Was ist ein Algorithmus?", options: JSON.stringify(["Ein Computerprogramm", "Eine endliche Folge von Schritten zur Problemlösung", "Eine Programmiersprache", "Ein Betriebssystem"]), correct: "1", explanation: "Ein Algorithmus beschreibt die Lösungsschritte — unabhängig von einer Programmiersprache.", order: 1 },
        { type: "order", question: "Bringe die Schritte zum Brauen von Tee in die richtige Reihenfolge:", options: JSON.stringify(["Teebeutel einlegen", "Wasser kochen", "Wasser in Tasse gießen", "Nach 3 Minuten Teebeutel raus"]), correct: JSON.stringify([1, 2, 0, 3]), explanation: "Wasser kochen → Tasse → Beutel → Ziehzeit.", order: 2 },
        { type: "true_false", question: "Eine Schleife kann dazu führen, dass ein Algorithmus nie endet.", correct: "true", options: null, explanation: "Eine Endlosschleife (z. B. while true) endet nicht — das verletzt die Endlichkeitseigenschaft.", order: 3 },
      ],
    },
    {
      id: "seed-etopic-inf10", subject: "informatik", grade: 10, order: 1,
      title: "Variablen und Datentypen",
      description: "int, float, bool, String — Datentypen erkennen und verwenden.",
      lesson: "## Variablen und Datentypen\n\nEine **Variable** ist ein benannter Speicherplatz.\n\n| Typ | Beispiel | Wertebereich |\n|-----|---------|-------------|\n| int | 42, -5 | ganze Zahlen |\n| float | 3.14, -0.5 | Dezimalzahlen |\n| bool | true, false | Wahrheitswert |\n| String | \"Hallo\" | Text |\n\n```python\nalter = 15          # int\ngroesse = 1.73      # float\nistSchueler = True  # bool\nname = \"Lukas\"      # String\n```",
      questions: [
        { type: "mc", question: "Welchen Datentyp hat der Wert 3.14?", options: JSON.stringify(["int", "float", "bool", "String"]), correct: "1", explanation: "Dezimalzahlen werden als float gespeichert.", order: 1 },
        { type: "fill_blank", question: "Der Datentyp für ganze Zahlen heißt ___.", correct: JSON.stringify(["int"]), options: null, explanation: "int steht für Integer (ganze Zahl).", order: 2 },
        { type: "match", question: "Ordne die Werte ihren Datentypen zu:", options: JSON.stringify({ left: ["42", "\"Hallo\"", "true", "1.5"], right: ["String", "float", "bool", "int"] }), correct: JSON.stringify([3, 0, 2, 1]), explanation: "42=int, \"Hallo\"=String, true=bool, 1.5=float.", order: 3 },
      ],
    },
  ];

  let topicCount = 0;
  let questionCount = 0;
  for (const topic of exerciseDefs) {
    const { questions, lesson, ...topicData } = topic;
    await prisma.exerciseTopic.upsert({
      where: { id: topic.id },
      update: {},
      create: topicData,
    });
    if (lesson) {
      const lessonExists = await prisma.exerciseLesson.findFirst({ where: { topicId: topic.id } });
      if (!lessonExists) {
        await prisma.exerciseLesson.create({ data: { topicId: topic.id, content: lesson, order: 1 } });
      }
    }
    for (const q of questions) {
      const qId = `${topic.id}-q${q.order}`;
      await prisma.exerciseQuestion.upsert({
        where: { id: qId },
        update: {},
        create: { id: qId, topicId: topic.id, ...q },
      });
      questionCount++;
    }
    topicCount++;
  }
  console.log(`  ✓ ${topicCount} Übungsthemen, ${questionCount} Fragen`);

  // ── Schulmannschaften ────────────────────────────────────
  console.log("Seeding school teams...");
  const teamDefs = [
    {
      id: "team-fussball-herren",
      name: "Fußball Herren",
      sport: "fussball",
      season: "2025/26",
      coach: "Herr Müller",
      results: JSON.stringify([
        { date: "2026-03-15", opponent: "Gymnasium Westpark", scoreHome: 3, scoreAway: 1 },
        { date: "2026-02-28", opponent: "Realschule Nord", scoreHome: 2, scoreAway: 2 },
        { date: "2026-02-14", opponent: "Gesamtschule Mitte", scoreHome: 4, scoreAway: 0 },
      ]),
    },
    {
      id: "team-fussball-damen",
      name: "Fußball Damen",
      sport: "fussball",
      season: "2025/26",
      coach: "Frau Schmidt",
      results: JSON.stringify([
        { date: "2026-03-20", opponent: "Gymnasium Ost", scoreHome: 1, scoreAway: 2 },
        { date: "2026-03-05", opponent: "Gesamtschule Süd", scoreHome: 3, scoreAway: 0 },
      ]),
    },
    {
      id: "team-basketball-herren",
      name: "Basketball Herren",
      sport: "basketball",
      season: "2025/26",
      coach: "Herr Weber",
      results: JSON.stringify([
        { date: "2026-04-02", opponent: "Sportgymnasium", scoreHome: 68, scoreAway: 74 },
        { date: "2026-03-18", opponent: "Gymnasium West", scoreHome: 82, scoreAway: 65 },
        { date: "2026-03-04", opponent: "Realschule Süd", scoreHome: 91, scoreAway: 78 },
      ]),
    },
    {
      id: "team-volleyball-damen",
      name: "Volleyball Damen",
      sport: "volleyball",
      season: "2025/26",
      coach: "Frau Fischer",
      results: JSON.stringify([
        { date: "2026-04-10", opponent: "Gymnasium Nord", scoreHome: 3, scoreAway: 1 },
        { date: "2026-03-27", opponent: "Realschule Ost", scoreHome: 3, scoreAway: 2 },
      ]),
    },
    {
      id: "team-leichtathletik",
      name: "Leichtathletik",
      sport: "leichtathletik",
      season: "2025/26",
      coach: "Herr Braun",
      results: null,
    },
  ];

  for (const team of teamDefs) {
    await prisma.schoolTeam.upsert({
      where: { id: team.id },
      update: {},
      create: { schoolId: school.id, ...team },
    });
  }
  console.log(`  ✓ ${teamDefs.length} Schulmannschaften`);

  // ── XP-Logs ──────────────────────────────────────────────────
  const xpDefs = [
    // Lukas — 340 XP total (Level 3)
    { userId: lukasId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-30) },
    { userId: lukasId, amount: 15, reason: "karteikarte_session", createdAt: d(-28) },
    { userId: lukasId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-25) },
    { userId: lukasId, amount: 20, reason: "aufgabe_bewertet", createdAt: d(-22) },
    { userId: lukasId, amount: 15, reason: "karteikarte_session", createdAt: d(-20) },
    { userId: lukasId, amount: 25, reason: "tages_herausforderung", createdAt: d(-18) },
    { userId: lukasId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-15) },
    { userId: lukasId, amount: 15, reason: "karteikarte_session", createdAt: d(-14) },
    { userId: lukasId, amount: 5, reason: "note_geteilt", createdAt: d(-12) },
    { userId: lukasId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-10) },
    { userId: lukasId, amount: 25, reason: "tages_herausforderung", createdAt: d(-9) },
    { userId: lukasId, amount: 15, reason: "karteikarte_session", createdAt: d(-7) },
    { userId: lukasId, amount: 20, reason: "aufgabe_bewertet", createdAt: d(-6) },
    { userId: lukasId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-5) },
    { userId: lukasId, amount: 15, reason: "karteikarte_session", createdAt: d(-4) },
    { userId: lukasId, amount: 25, reason: "tages_herausforderung", createdAt: d(-3) },
    { userId: lukasId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-2) },
    { userId: lukasId, amount: 15, reason: "karteikarte_session", createdAt: d(-1) },
    { userId: lukasId, amount: 20, reason: "aufgabe_bewertet", createdAt: d(0) },
    { userId: lukasId, amount: 25, reason: "tages_herausforderung", createdAt: d(0) },
    // Anna — 520 XP (Level 5)
    { userId: annaId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-30) },
    { userId: annaId, amount: 25, reason: "tages_herausforderung", createdAt: d(-29) },
    { userId: annaId, amount: 15, reason: "karteikarte_session", createdAt: d(-28) },
    { userId: annaId, amount: 20, reason: "aufgabe_bewertet", createdAt: d(-25) },
    { userId: annaId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-23) },
    { userId: annaId, amount: 25, reason: "tages_herausforderung", createdAt: d(-21) },
    { userId: annaId, amount: 15, reason: "karteikarte_session", createdAt: d(-19) },
    { userId: annaId, amount: 5, reason: "note_geteilt", createdAt: d(-17) },
    { userId: annaId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-15) },
    { userId: annaId, amount: 20, reason: "aufgabe_bewertet", createdAt: d(-13) },
    { userId: annaId, amount: 25, reason: "tages_herausforderung", createdAt: d(-11) },
    { userId: annaId, amount: 15, reason: "karteikarte_session", createdAt: d(-9) },
    { userId: annaId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-7) },
    { userId: annaId, amount: 25, reason: "tages_herausforderung", createdAt: d(-5) },
    { userId: annaId, amount: 15, reason: "karteikarte_session", createdAt: d(-3) },
    { userId: annaId, amount: 20, reason: "aufgabe_bewertet", createdAt: d(-1) },
    // Tim — 120 XP (Level 1)
    { userId: timId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-20) },
    { userId: timId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-12) },
    { userId: timId, amount: 15, reason: "karteikarte_session", createdAt: d(-7) },
    { userId: timId, amount: 25, reason: "tages_herausforderung", createdAt: d(-3) },
    { userId: timId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-1) },
    // Mia — 280 XP (Level 2)
    { userId: miaId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-25) },
    { userId: miaId, amount: 15, reason: "karteikarte_session", createdAt: d(-22) },
    { userId: miaId, amount: 25, reason: "tages_herausforderung", createdAt: d(-19) },
    { userId: miaId, amount: 20, reason: "aufgabe_bewertet", createdAt: d(-16) },
    { userId: miaId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-13) },
    { userId: miaId, amount: 15, reason: "karteikarte_session", createdAt: d(-10) },
    { userId: miaId, amount: 5, reason: "note_geteilt", createdAt: d(-7) },
    { userId: miaId, amount: 10, reason: "aufgabe_abgabe", createdAt: d(-5) },
    { userId: miaId, amount: 25, reason: "tages_herausforderung", createdAt: d(-2) },
    { userId: miaId, amount: 20, reason: "aufgabe_bewertet", createdAt: d(-1) },
  ];

  for (const x of xpDefs) {
    const exists = await prisma.xpLog.findFirst({
      where: { userId: x.userId, reason: x.reason, createdAt: x.createdAt },
    });
    if (!exists) {
      await prisma.xpLog.create({ data: x });
    }
  }
  console.log(`  ✓ ${xpDefs.length} XP-Einträge`);

  // Sync user.xp with sum of their XP logs
  const xpByUser: Record<string, number> = {};
  for (const x of xpDefs) {
    xpByUser[x.userId] = (xpByUser[x.userId] ?? 0) + x.amount;
  }
  const streakByUser: Record<string, number> = {
    [lukasId]: 14,
    [annaId]: 22,
    [timId]: 3,
    [miaId]: 9,
  };
  for (const [uid, total] of Object.entries(xpByUser)) {
    await prisma.user.update({
      where: { id: uid },
      data: { xp: total, streak: streakByUser[uid] ?? 0, lastActiveDate: d(0) },
    });
  }
  console.log(`  ✓ user.xp + streak synced for ${Object.keys(xpByUser).length} Nutzer`);

  // ── Achievements ──────────────────────────────────────────────
  const achievementDefs = [
    { userId: lukasId, slug: "first_xp", unlockedAt: d(-30) },
    { userId: lukasId, slug: "streak_7", unlockedAt: d(-7) },
    { userId: annaId, slug: "first_xp", unlockedAt: d(-30) },
    { userId: annaId, slug: "streak_7", unlockedAt: d(-9) },
    { userId: annaId, slug: "level_5", unlockedAt: d(-5) },
    { userId: timId, slug: "first_xp", unlockedAt: d(-20) },
    { userId: miaId, slug: "first_xp", unlockedAt: d(-25) },
    { userId: miaId, slug: "streak_7", unlockedAt: d(-10) },
  ];

  for (const a of achievementDefs) {
    await prisma.userAchievement.upsert({
      where: { userId_slug: { userId: a.userId, slug: a.slug } },
      update: {},
      create: a,
    });
  }
  console.log(`  ✓ ${achievementDefs.length} Achievements`);

  console.log(`\n✅ Done. School: ${school.name}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
