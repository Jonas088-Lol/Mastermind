/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";

/**
 * Vertretungsplanung — Verfügbarkeit und Konflikte.
 *
 * Kern jeder Vertretungssoftware: Wer ist in dieser Stunde tatsächlich frei?
 * Als belegt gilt eine Lehrkraft, wenn sie laut Stundenplan unterrichtet oder
 * bereits als Vertretung für diese Stunde eingeteilt ist.
 */

/** Wochentag im Stundenplan-Format: 1 = Montag … 5 = Freitag, 0 = Wochenende. */
export function timetableWeekday(date: Date): number {
  const d = date.getDay(); // 0 = Sonntag
  return d >= 1 && d <= 5 ? d : 0;
}

/** Tagesgrenzen (00:00:00 – 23:59:59) für Datumsvergleiche. */
export function dayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_399_999);
  return { start, end };
}

export interface TeacherAvailability {
  id: string;
  name: string;
  /** frei = unterrichtet nicht und vertritt nicht */
  free: boolean;
  /** Warum belegt (z. B. "unterrichtet 7a" / "vertritt bereits") */
  reason?: string;
}

/**
 * Verfügbarkeit aller Lehrkräfte einer Schule für eine bestimmte Stunde.
 * Freie Lehrkräfte stehen vorn — sie sind die sinnvollen Vertretungs-Vorschläge.
 */
export async function teacherAvailability(
  schoolId: string,
  date: Date,
  period: number,
): Promise<TeacherAvailability[]> {
  const weekday = timetableWeekday(date);
  const { start, end } = dayRange(date);

  const [teachers, lessons, subs] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId, role: "teacher" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Regulärer Unterricht in dieser Stunde
    weekday === 0
      ? Promise.resolve([])
      : prisma.timetableEntry.findMany({
          where: { schoolId, day: weekday, period },
          select: { teacherId: true, class: { select: { name: true } } },
        }),
    // Bereits eingeteilte Vertretungen in dieser Stunde
    prisma.substitutionEntry.findMany({
      where: {
        schoolId,
        period,
        date: { gte: start, lte: end },
        substituteTeacherId: { not: null },
      },
      select: { substituteTeacherId: true, class: { select: { name: true } } },
    }),
  ]);

  const busy = new Map<string, string>();
  for (const l of lessons) busy.set(l.teacherId, `unterrichtet ${l.class.name}`);
  for (const s of subs) {
    if (s.substituteTeacherId && !busy.has(s.substituteTeacherId)) {
      busy.set(s.substituteTeacherId, `vertritt bereits ${s.class.name}`);
    }
  }

  return teachers
    .map((t) => ({
      id: t.id,
      name: t.name,
      free: !busy.has(t.id),
      reason: busy.get(t.id),
    }))
    .sort((a, b) => Number(b.free) - Number(a.free) || a.name.localeCompare(b.name));
}

/**
 * Ist die Lehrkraft in dieser Stunde bereits verplant?
 * Verhindert Doppelbelegungen beim Eintragen einer Vertretung.
 */
export async function teacherIsBusy(
  schoolId: string,
  date: Date,
  period: number,
  teacherId: string,
): Promise<string | null> {
  const availability = await teacherAvailability(schoolId, date, period);
  const entry = availability.find((t) => t.id === teacherId);
  return entry && !entry.free ? (entry.reason ?? "bereits verplant") : null;
}

/**
 * Stunden einer Lehrkraft an einem Tag — Basis für „ganzen Tag vertreten".
 */
export async function lessonsOfTeacherOnDate(
  schoolId: string,
  teacherId: string,
  date: Date,
) {
  const weekday = timetableWeekday(date);
  if (weekday === 0) return [];
  return prisma.timetableEntry.findMany({
    where: { schoolId, teacherId, day: weekday },
    select: {
      period: true,
      room: true,
      class: { select: { id: true, name: true } },
      subject: { select: { name: true } },
    },
    orderBy: { period: "asc" },
  });
}
