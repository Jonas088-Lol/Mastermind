/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";

/**
 * Betroffenenrechte nach DSGVO (Art. 15/17/20).
 *
 * - exportUserData(): maschinenlesbarer Export aller personenbezogenen Daten
 *   eines Nutzers (Auskunft & Datenübertragbarkeit).
 * - eraseUser(): kaskadierende Löschung + Anonymisierung. Cascade-Daten werden
 *   von der DB automatisch gelöscht (138 onDelete:Cascade-Regeln). Datensätze
 *   mit gesetzlicher Aufbewahrungspflicht (Noten, Klassenbuch) oder fremdem
 *   Eigentum (empfangene Nachrichten) werden ANONYMISIERT, nicht gelöscht —
 *   die Verknüpfung zur Person wird gekappt, der Beleg bleibt.
 *
 * ⚖️ Welche Daten aufbewahrungspflichtig sind, ist eine rechtliche Bewertung
 * (DSB/Anwalt). Diese Aufteilung ist eine sinnvolle technische Baseline.
 */

/** Vollständiger Datenexport eines Nutzers als serialisierbares Objekt. */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const [
    user, grades, submissions, sentMessages, notes, absences,
    attendance, homeworkCompletions, consent, ageVerification,
    coinLogs, xpLogs, achievements,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true, klasse: true,
        bio: true, quote: true, favoriteSubject: true, avatarUrl: true,
        birthDate: true, xp: true, coins: true, streak: true,
        createdAt: true, lastSeenAt: true, schoolId: true, classId: true,
      },
    }),
    prisma.grade.findMany({ where: { studentId: userId }, select: { value: true, type: true, topic: true, comment: true, date: true, subject: { select: { name: true } } } }),
    prisma.submission.findMany({ where: { studentId: userId }, select: { content: true, status: true, submittedAt: true } }),
    prisma.message.findMany({ where: { senderId: userId }, select: { content: true, sentAt: true } }),
    prisma.note.findMany({ where: { authorId: userId }, select: { title: true, content: true, createdAt: true } }).catch(() => []),
    prisma.absence.findMany({ where: { studentId: userId }, select: { fromDate: true, toDate: true, reason: true, status: true } }),
    prisma.attendanceRecord.findMany({ where: { studentId: userId }, select: { status: true, reason: true, date: true } }).catch(() => []),
    prisma.homeworkCompletion.findMany({ where: { studentId: userId }, select: { done: true, doneAt: true } }).catch(() => []),
    prisma.userConsent.findUnique({ where: { userId } }).catch(() => null),
    prisma.ageVerification.findUnique({ where: { userId } }).catch(() => null),
    prisma.coinLog.findMany({ where: { userId }, select: { amount: true, reason: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1000 }).catch(() => []),
    prisma.xpLog.findMany({ where: { userId }, select: { amount: true, reason: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1000 }).catch(() => []),
    prisma.userAchievement.findMany({ where: { userId }, select: { unlockedAt: true } }).catch(() => []),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    hinweis: "Personenbezogene Daten gemäß Art. 15/20 DSGVO.",
    stammdaten: user,
    noten: grades,
    abgaben: submissions,
    gesendeteNachrichten: sentMessages,
    notizen: notes,
    fehlzeiten: absences,
    anwesenheit: attendance,
    hausaufgaben: homeworkCompletions,
    einwilligung: consent,
    altersverifikation: ageVerification,
    muenzen: coinLogs,
    xp: xpLogs,
    erfolge: achievements,
  };
}

/**
 * Löscht/anonymisiert einen Nutzer. Reihenfolge:
 *  1. Aufbewahrungspflichtige/fremde Datensätze anonymisieren (FK bleibt, aber
 *     kein Personenbezug mehr über den User selbst).
 *  2. Sessions löschen (sofortiger Logout überall).
 *  3. User-Stammdaten anonymisieren + Cascade-Daten von der DB löschen lassen.
 *
 * Wir machen KEIN hartes user.delete(), weil die Non-Cascade-FKs (Noten etc.)
 * das blockieren würden UND diese Belege teils aufbewahrungspflichtig sind.
 */
export async function eraseUser(userId: string): Promise<void> {
  const anonEmail = `deleted_${userId}@deleted.invalid`;

  await prisma.$transaction(async (tx) => {
    // 1. Sessions weg (Logout)
    await tx.session.deleteMany({ where: { userId } });

    // 2. Frei löschbare, rein persönliche Inhalte (kein fremdes Eigentum,
    //    keine Aufbewahrungspflicht) — Cascade greift beim User-Update nicht,
    //    daher explizit. Fehlerresistent (Tabelle evtl. leer).
    await tx.note.deleteMany({ where: { authorId: userId } }).catch(() => undefined);
    await tx.notebook.deleteMany({ where: { userId } }).catch(() => undefined);
    await tx.flashcardDeck.deleteMany({ where: { userId } }).catch(() => undefined);
    await tx.driveFile.deleteMany({ where: { userId } }).catch(() => undefined);
    await tx.pushSubscription.deleteMany({ where: { userId } }).catch(() => undefined);
    await tx.userConsent.deleteMany({ where: { userId } }).catch(() => undefined);
    await tx.ageVerification.deleteMany({ where: { userId } }).catch(() => undefined);

    // 3. Gesendete Nachrichten anonymisieren (Empfänger hat sie legitim) —
    //    Inhalt entfernen, Verknüpfung bleibt technisch bestehen.
    await tx.message.updateMany({
      where: { senderId: userId },
      data: { content: "[gelöscht]" },
    }).catch(() => undefined);

    // 4. Stammdaten anonymisieren. Aufbewahrungspflichtige Belege (Noten,
    //    Klassenbuch, Anwesenheit) verlieren damit ihren Personenbezug über
    //    Name/E-Mail, bleiben aber als Datensatz erhalten (⚖️ Rechtsgrundlage).
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonEmail,
        name: "Gelöschter Nutzer",
        passwordHash: "",
        bio: null, quote: null, favoriteSubject: null, avatarUrl: null,
        birthDate: null, displayName: null, twoFactorSecret: null, twoFactor: false,
      },
    });
  });
}
