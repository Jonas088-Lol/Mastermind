/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";

/**
 * Jahresübersicht der Fehltage (Vorgabe des Kultusministeriums).
 *
 * Gezählt werden **Unterrichtstage**, also nur Montag–Freitag. Wochenenden
 * werden übersprungen; ein Fehlzeitraum wird auf das Schuljahr zugeschnitten,
 * damit Zeiträume über den Jahreswechsel korrekt aufgeteilt werden.
 */

/** Deutsches Schuljahr: 1. August – 31. Juli. */
export function schoolYearRange(startYear: number): { from: Date; to: Date } {
  return {
    from: new Date(startYear, 7, 1, 0, 0, 0, 0),
    to: new Date(startYear + 1, 6, 31, 23, 59, 59, 999),
  };
}

/** Schuljahr, in dem ein Datum liegt (Aug–Dez → dieses Jahr, sonst Vorjahr). */
export function schoolYearOf(date: Date): number {
  return date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
}

export function schoolYearLabel(startYear: number): string {
  return `${startYear}/${String(startYear + 1).slice(2)}`;
}

/** Unterrichtstage (Mo–Fr) zwischen zwei Daten, beide inklusive. */
export function countSchoolDays(from: Date, to: Date): number {
  if (to < from) return 0;
  let days = 0;
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export interface AbsenceRow {
  studentId: string;
  studentName: string;
  className: string;
  /** bestätigt = entschuldigt */
  excusedDays: number;
  /** abgelehnt = unentschuldigt */
  unexcusedDays: number;
  /** noch nicht bearbeitet */
  pendingDays: number;
  totalDays: number;
  entries: number;
}

/**
 * Aggregiert die Fehltage aller Schüler einer Schule für ein Schuljahr.
 * Optional auf eine Klasse eingegrenzt.
 */
export async function buildAbsenceReport(
  schoolId: string,
  startYear: number,
  classId?: string | null,
): Promise<AbsenceRow[]> {
  const { from, to } = schoolYearRange(startYear);

  const absences = await prisma.absence.findMany({
    where: {
      schoolId,
      // Überlappung mit dem Schuljahr — nicht nur vollständig enthaltene.
      fromDate: { lte: to },
      toDate: { gte: from },
      ...(classId ? { student: { classId } } : {}),
    },
    select: {
      studentId: true,
      fromDate: true,
      toDate: true,
      status: true,
      student: {
        select: { name: true, schoolClass: { select: { name: true } }, klasse: true },
      },
    },
  });

  const byStudent = new Map<string, AbsenceRow>();

  for (const a of absences) {
    // Zeitraum auf das Schuljahr zuschneiden.
    const start = a.fromDate < from ? from : a.fromDate;
    const end = a.toDate > to ? to : a.toDate;
    const days = countSchoolDays(start, end);
    if (days === 0) continue;

    let row = byStudent.get(a.studentId);
    if (!row) {
      row = {
        studentId: a.studentId,
        studentName: a.student.name,
        className: a.student.schoolClass?.name ?? a.student.klasse ?? "—",
        excusedDays: 0,
        unexcusedDays: 0,
        pendingDays: 0,
        totalDays: 0,
        entries: 0,
      };
      byStudent.set(a.studentId, row);
    }

    if (a.status === "confirmed") row.excusedDays += days;
    else if (a.status === "rejected") row.unexcusedDays += days;
    else row.pendingDays += days;

    row.totalDays += days;
    row.entries += 1;
  }

  return [...byStudent.values()].sort(
    (x, y) => y.totalDays - x.totalDays || x.studentName.localeCompare(y.studentName),
  );
}
