/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { gzipSync } from "zlib";
import { prisma } from "@/lib/db/client";

/**
 * MasterVault — Export der persönlichen Akte (v1: Export-/Backup-Format auf der
 * zentralen DB, siehe Roadmap-Entscheidung).
 *
 * Sammelt die eigenen Daten eines Nutzers in ein strukturiertes JSON und gibt
 * es gzip-komprimiert zurück (Node-eigenes `zlib`, keine Zusatz-Abhängigkeit).
 * Dient der DSGVO-Auskunft und dem Backup/Schulwechsel.
 *
 * Wichtig: Diese Funktion liefert ausschließlich die EIGENEN Daten des Nutzers
 * (Self-Service-Auskunft). Feldgenaue Fremdzugriffe (Sekretariat etc.) sind
 * bewusst NICHT hier — die kämen über eigene, permissions.ts-geprüfte Wege.
 *
 * Sensible Auth-Geheimnisse (Passwort-Hash, 2FA-Secret) werden nie exportiert.
 */

/** Fehlertolerant sammeln — eine leere Teilmenge darf den Export nicht kippen. */
async function safe<T>(fn: () => Promise<T>): Promise<T | []> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export interface VaultExport {
  meta: { format: string; version: number; exportedAt: string; userId: string };
  profil: unknown;
  masteroffice: { dokumente: unknown; tabellen: unknown; praesentationen: unknown; drive: unknown };
  lernen: { hefte: unknown; vokabellisten: unknown; karteikarten: unknown };
  schule: { noten: unknown; abgaben: unknown; hausaufgaben: unknown; einwilligungen: unknown };
  gamification: { xpVerlauf: unknown; muenzVerlauf: unknown; erfolge: unknown };
  sonstiges: { benachrichtigungen: unknown; termine: unknown };
}

/**
 * Alle eigenen Daten eines Nutzers einsammeln. `nowIso` wird übergeben, damit
 * die Funktion deterministisch bleibt (kein `new Date()` hier).
 */
export async function buildVaultExport(userId: string, nowIso: string): Promise<VaultExport> {
  const [
    profil,
    dokumente, tabellen, praesentationen, drive,
    hefte, vokabellisten, karteikarten,
    noten, abgaben, hausaufgaben, einwilligungen,
    xpVerlauf, muenzVerlauf, erfolge,
    benachrichtigungen, termine,
  ] = await Promise.all([
    safe(() => prisma.user.findUnique({
      where: { id: userId },
      // Auth-Geheimnisse bewusst ausgeschlossen.
      select: {
        id: true, email: true, name: true, displayName: true, role: true, klasse: true,
        avatarUrl: true, bio: true, quote: true, favoriteSubject: true,
        xp: true, streak: true, prestige: true, coins: true, premiumCoins: true,
        hintTokens: true, isPremium: true, prefs: true, notifPrefs: true,
        createdAt: true, verifiedAt: true, schoolId: true,
      },
    })),
    safe(() => prisma.document.findMany({ where: { userId } })),
    safe(() => prisma.spreadsheet.findMany({ where: { userId } })),
    safe(() => prisma.presentation.findMany({ where: { userId } })),
    // Drive: nur Metadaten, nicht die Binärdateien selbst.
    safe(() => prisma.driveFile.findMany({
      where: { userId },
      select: { id: true, name: true, mimeType: true, size: true, createdAt: true },
    })),
    safe(() => prisma.notebook.findMany({ where: { userId } })),
    safe(() => prisma.vocabList.findMany({ where: { userId }, include: { entries: true } })),
    safe(() => prisma.flashcardDeck.findMany({ where: { userId }, include: { cards: true } })),
    safe(() => prisma.grade.findMany({
      where: { studentId: userId },
      select: { id: true, value: true, weight: true, type: true, topic: true, comment: true, date: true,
        subject: { select: { name: true } } },
    })),
    safe(() => prisma.submission.findMany({
      where: { studentId: userId },
      select: { id: true, status: true, grade: true, submittedAt: true,
        assignment: { select: { title: true } } },
    })),
    safe(() => prisma.homeworkCompletion.findMany({ where: { studentId: userId } })),
    safe(() => prisma.consentResponse.findMany({
      where: { parentId: userId },
      select: { id: true, agreed: true, respondedAt: true, form: { select: { title: true } } },
    })),
    safe(() => prisma.xpLog.findMany({ where: { userId }, take: 5000, orderBy: { id: "desc" } })),
    safe(() => prisma.coinLog.findMany({ where: { userId }, take: 5000, orderBy: { id: "desc" } })),
    safe(() => prisma.userAchievement.findMany({ where: { userId } })),
    safe(() => prisma.appNotification.findMany({ where: { userId }, take: 2000, orderBy: { id: "desc" } })),
    safe(() => prisma.personalEvent.findMany({ where: { userId } })),
  ]);

  return {
    meta: { format: "mastervault", version: 1, exportedAt: nowIso, userId },
    profil,
    masteroffice: { dokumente, tabellen, praesentationen, drive },
    lernen: { hefte, vokabellisten, karteikarten },
    schule: { noten, abgaben, hausaufgaben, einwilligungen },
    gamification: { xpVerlauf, muenzVerlauf, erfolge },
    sonstiges: { benachrichtigungen, termine },
  };
}

/** Export als gzip-komprimiertes JSON (eine Datei — die „komprimierte Akte"). */
export function gzipVault(data: VaultExport): Buffer {
  const json = JSON.stringify(data, null, 2);
  return gzipSync(Buffer.from(json, "utf-8"), { level: 9 });
}
